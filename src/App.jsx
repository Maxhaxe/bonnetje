import { useState, useEffect } from 'react';
import UploadZone from './components/UploadZone.jsx';
import ReceiptCard from './components/ReceiptCard.jsx';
import Dashboard from './components/Dashboard.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import ManualEntryModal from './components/ManualEntryModal.jsx';
import { useReceipts } from './hooks/useReceipts.js';
import { useGemini } from './hooks/useGemini.js';
import { formatCurrency, uid } from './utils/formatters.js';
import { initSupabase, uploadReceiptImage } from './utils/supabase.js';
import styles from './App.module.css';

const DEFAULT_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const LS_KEY = 'bonnetje_apikey';
const LS_SB_URL = 'bonnetje_sb_url';
const LS_SB_KEY = 'bonnetje_sb_key';
const LS_SERVER_SCAN = 'bonnetje_server_scan';

const DEFAULT_SB_URL = import.meta.env.VITE_SUPABASE_URL || '';
const DEFAULT_SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

function loadServerScanPref() {
  try {
    return localStorage.getItem(LS_SERVER_SCAN) !== 'false';
  } catch {
    return true;
  }
}

function loadApiKey() {
  const OLD_KEYS = [
    'AIzaSyC5ocIg1-Ct4uLfnmp7FVR1MZIm2g-6F4U',
    'AIzaSyAfRlwIhY2tx0hrNRpSrsmU2SUHhxc59_c',
    'AIzaSyA4twX-b_eHM6nka7l-Iv6Bc4D5soYjh6M'
  ];
  
  try {
    const saved = localStorage.getItem(LS_KEY);
    // Als er geen opgeslagen sleutel is, of het is een oude standaard sleutel, gebruik de nieuwe default
    if (!saved || OLD_KEYS.includes(saved)) {
      return DEFAULT_API_KEY;
    }
    return saved;
  } catch {
    return DEFAULT_API_KEY;
  }
}

function loadSbConfig() {
  try {
    return {
      url: localStorage.getItem(LS_SB_URL) || DEFAULT_SB_URL,
      key: localStorage.getItem(LS_SB_KEY) || DEFAULT_SB_KEY
    };
  } catch {
    return { url: DEFAULT_SB_URL, key: DEFAULT_SB_KEY };
  }
}

function saveApiKey(key) {
  try {
    localStorage.setItem(LS_KEY, key);
  } catch {}
}

export default function App() {
  const [apiKey, setApiKey] = useState(loadApiKey);
  const [{ url: initialSbUrl, key: initialSbKey }] = useState(loadSbConfig);
  const [supabaseUrl, setSupabaseUrl] = useState(initialSbUrl);
  const [supabaseKey, setSupabaseKey] = useState(initialSbKey);
  const [useServerSideScanning, setUseServerSideScanning] = useState(loadServerScanPref);
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('receipts');
  const [extractError, setExtractError] = useState(null);
  const [batchProgress, setBatchProgress] = useState(null);
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState(null);

  useEffect(() => {
    if (supabaseUrl && supabaseKey) {
      initSupabase(supabaseUrl, supabaseKey);
    }
  }, [supabaseUrl, supabaseKey]);

  const { 
    receipts, 
    people, 
    addPerson, 
    deletePerson,
    assignPerson, 
    addReceipt, 
    updateReceipt, 
    updateItem, 
    deleteReceipt, 
    clearAll, 
    checkDuplicate,
    totals 
  } = useReceipts();
  
  const { extractReceipt, loading } = useGemini(apiKey, useServerSideScanning);

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleSaveSettings = (newKey, newUrl, newKeySb, newServerScan) => {
    setApiKey(newKey);
    saveApiKey(newKey);
    
    setSupabaseUrl(newUrl);
    setSupabaseKey(newKeySb);
    setUseServerSideScanning(newServerScan);
    
    try {
      localStorage.setItem(LS_SB_URL, newUrl);
      localStorage.setItem(LS_SB_KEY, newKeySb);
      localStorage.setItem(LS_SERVER_SCAN, newServerScan ? 'true' : 'false');
    } catch {}

    if (newUrl && newKeySb) {
      initSupabase(newUrl, newKeySb);
    }
  };

  const handleSubmitPerson = (e) => {
    e.preventDefault();
    if (newPersonName.trim()) {
      addPerson(newPersonName.trim());
      setNewPersonName('');
      setIsAddingPerson(false);
    }
  };

  const handleDropOnPerson = (e, personId) => {
    e.preventDefault();
    const receiptId = e.dataTransfer.getData('receiptId');
    if (receiptId) {
      assignPerson(receiptId, personId);
    }
  };

  const handleUpload = async (files) => {
    setExtractError(null);
    const fileArray = Array.isArray(files) ? files : [files];
    if (fileArray.length === 0) return;

    setActiveTab('receipts');
    setBatchProgress({ current: 0, total: fileArray.length });
    
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setBatchProgress({ current: i + 1, total: fileArray.length });
      
      let placeholderId = null;
      try {
        // 1. Upload to Supabase first (only permanent URLs allowed, never blob: URLs)
        const publicUrl = await uploadReceiptImage(file);
        // For local display in THIS session only, create a blob URL (not stored)
        const localBlobUrl = URL.createObjectURL(file);

        // 2. Create Placeholder
        placeholderId = uid();
        const placeholderReceipt = {
          id: placeholderId,
          store: 'Verwerken...',
          status: 'processing',
          // Only use permanent URL for storage; blob URL is shown locally and discarded on refresh
          imageUrl: publicUrl || localBlobUrl,
          date: new Date().toISOString().split('T')[0],
          items: [],
          subtotal: 0,
          discount: 0,
          tax: 0,
          total: 0,
          payment_card: null,
          payment_method: 'unknown',
          currency: 'EUR',
          store_domain: null,
          personId: selectedPersonId || 'p1',
          processedAt: new Date().toISOString()
        };

        // Add to state & sync immediately so other devices see "processing"
        addReceipt(placeholderReceipt);

        // 3. Scan the image on the background
        const scannedData = await extractReceipt(file);
        
        // Duplicate check (optional, but let's keep it simple and just warn, we don't delete the placeholder yet unless they cancel)
        const existing = checkDuplicate(scannedData);
        if (existing) {
          const proceed = confirm(
            `Potential Duplicate detected!\n\nA receipt from "${scannedData.store}" on ${scannedData.date} for ${scannedData.total} ${scannedData.currency} already exists.\n\nDo you want to update it anyway?`
          );
          if (!proceed) {
            deleteReceipt(placeholderId);
            continue;
          }
        }

        // 4. Update the placeholder with real data
        updateReceipt(placeholderId, { ...scannedData, status: 'completed' });
        
        if (i < fileArray.length - 1) {
          await sleep(1500);
        }
      } catch (err) {
        setExtractError((prev) => prev ? `${prev} | ${file.name}: ${err.message}` : `${file.name}: ${err.message}`);
        if (placeholderId) {
          updateReceipt(placeholderId, { store: 'Fout bij scannen', status: 'error' });
        }
      }
    }
    
    setBatchProgress(null);
  };

  // Filtered receipts for display
  const displayReceipts = selectedPersonId 
    ? receipts.filter(r => r.personId === selectedPersonId)
    : receipts;

  return (
    <div className={styles.app}>
      {/* ... (header remains) */}
      <header className={styles.navbar}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <div className={styles.logoIcon} style={{ overflow: 'hidden', padding: 0 }}>
              <img 
                src="/assets/logo.jpg" 
                alt="Logo" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} 
              />
            </div>
            <span className={styles.logoText}>Bonnetje</span>
          </div>

          <nav className={styles.tabs} aria-label="Hoofdnavigatie">
            <button
              className={`${styles.tab} ${activeTab === 'receipts' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('receipts')}
            >
              Bonnetjes
              {receipts.length > 0 && (
                <span className={styles.badge}>{receipts.length}</span>
              )}
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'dashboard' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
          </nav>

          <button
            className={`btn btn-ghost btn-sm ${styles.settingsBtn}`}
            onClick={() => setSettingsOpen(true)}
          >
            Instellingen
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.mainLayout}>
            <div className={styles.contentArea}>
              {receipts.length === 0 && activeTab === 'receipts' && (
                <div className={styles.hero}>
                  <div className={styles.heroBadge}>
                    <span>✨</span> Aangedreven door Gemini 2.5 Pro
                  </div>
                  <h1 className={styles.heroTitle}>
                    Zet bonnetjes om in<br />
                    <span className={styles.heroGradient}>gestructureerde data</span>
                  </h1>
                  <p className={styles.heroSub}>
                    Upload een foto van elk bonnetje. Bonnetje haalt automatisch elk item,
                    de prijs en de betaalpas informatie eruit.
                  </p>
                </div>
              )}

              {activeTab === 'receipts' && (
                <div className={styles.uploadSection}>
                  {batchProgress && (
                    <div className={styles.batchBanner}>
                      <div className={styles.batchSpinner} />
                      <div className={styles.batchInfo}>
                        <p className={styles.batchText}>Batch verwerken: {batchProgress.current} van {batchProgress.total} bonnetjes...</p>
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progressFill} 
                            style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <UploadZone onUpload={handleUpload} loading={loading} />

                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-md)' }}>
                    <button 
                      className="btn btn-ghost btn-sm"
                      onClick={() => setManualModalOpen(true)}
                    >
                      ➕ Handmatig toevoegen
                    </button>
                  </div>

                  {extractError && (
                    <div className={styles.errorBanner} role="alert">
                      <span className={styles.errorMsg}>{extractError}</span>
                      <button className={styles.errorClose} onClick={() => setExtractError(null)}>✕</button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'dashboard' && (
                receipts.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyIcon}>📊</p>
                    <p className={styles.emptyTitle}>Nog geen gegevens</p>
                    <button className="btn btn-primary" onClick={() => setActiveTab('receipts')}>
                      Upload een bonnetje
                    </button>
                  </div>
                ) : (
                  <Dashboard totals={totals} receipts={receipts} />
                )
              )}

              {activeTab === 'receipts' && receipts.length > 0 && (
                <div className={styles.receiptsList}>
                  <div className={styles.listHeader}>
                    <h2 className={styles.listTitle}>
                      {selectedPersonId ? (
                        <>
                          Bonnetjes voor <span className={styles.filterPersonName}>{people.find(p => p.id === selectedPersonId)?.name}</span>
                        </>
                      ) : 'Verwerkte Bonnetjes'}
                      <span className={styles.listCount}>{displayReceipts.length}</span>
                    </h2>
                    {selectedPersonId && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelectedPersonId(null)}>
                        Filter wissen
                      </button>
                    )}
                  </div>

                  <div className={styles.cards}>
                    {displayReceipts.map((receipt) => (
                      <ReceiptCard
                        key={receipt.id}
                        receipt={receipt}
                        person={people.find(p => p.id === receipt.personId)}
                        onUpdate={(updates) => updateReceipt(receipt.id, updates)}
                        onUpdateItem={(itemId, updates) => updateItem(receipt.id, itemId, updates)}
                        onDelete={() => deleteReceipt(receipt.id)}
                        draggable
                      />
                    ))}
                    {displayReceipts.length === 0 && (
                      <div className={styles.emptyFilter}>
                        <p>Nog geen bonnetjes gekoppeld aan deze persoon.</p>
                        <p className={styles.emptyFilterTip}>Sleep een bonnetje hierheen of drop het op de naam om te koppelen.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <aside className={styles.sidebar}>
              <div className={styles.sidebarHeader}>
                <h3 className={styles.sidebarTitle}>People</h3>
                <button 
                  className={styles.sidebarAdd} 
                  onClick={() => setIsAddingPerson(!isAddingPerson)}
                  title="Add new person"
                >
                  {isAddingPerson ? '✕' : '+'}
                </button>
              </div>

              {isAddingPerson && (
                <form className={styles.addPersonForm} onSubmit={handleSubmitPerson}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Person's name..."
                    className={styles.addPersonInput}
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                  />
                  <button type="submit" className={styles.addPersonSubmit}>Add</button>
                </form>
              )}

              <div className={styles.peopleList}>
                <div 
                  className={`${styles.personSlot} ${!selectedPersonId ? styles.personSlotActive : ''}`}
                  onClick={() => setSelectedPersonId(null)}
                >
                  <div className={styles.personAvatar}>📋</div>
                  <div className={styles.personInfo}>
                    <span className={styles.personName}>Alle Bonnetjes</span>
                    <span className={styles.personCount}>
                      {receipts.length} in totaal · <strong>{formatCurrency(totals.grandTotal)}</strong>
                    </span>
                  </div>
                </div>

                {people.map(person => (
                  <div 
                    key={person.id} 
                    className={`${styles.personSlot} ${selectedPersonId === person.id ? styles.personSlotActive : ''}`}
                    onClick={() => setSelectedPersonId(person.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnPerson(e, person.id)}
                  >
                    <div className={styles.personAvatar}>{person.avatar}</div>
                    <div className={styles.personInfo}>
                      <span className={styles.personName}>{person.name}</span>
                      <span className={styles.personCount}>
                        {receipts.filter(r => r.personId === person.id).length} bonnetjes · <strong>{formatCurrency(totals.byPerson[person.id] || 0)}</strong>
                      </span>
                    </div>
                    {person.id !== 'p1' && (
                      <button 
                        className={styles.personDelete} 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Weet je zeker dat je ${person.name} wilt verwijderen?`)) {
                            deletePerson(person.id);
                            if (selectedPersonId === person.id) setSelectedPersonId(null);
                          }
                        }}
                        title="Persoon verwijderen"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className={styles.sidebarTip}>
                💡 Click a person to filter their receipts.
              </div>
            </aside>
          </div>
        </div>
      </main>

      {settingsOpen && (
        <SettingsModal
          apiKey={apiKey}
          supabaseUrl={supabaseUrl}
          supabaseKey={supabaseKey}
          useServerSideScanning={useServerSideScanning}
          receipts={receipts}
          people={people}
          onSave={handleSaveSettings}
          onImport={(importedReceipts, importedPeople) => {
            setReceipts(importedReceipts);
            setPeople(importedPeople);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {manualModalOpen && (
        <ManualEntryModal
          onAdd={(receipt) => addReceipt(receipt)}
          onClose={() => setManualModalOpen(false)}
        />
      )}
    </div>
  );
}
