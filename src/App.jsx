import { useState, useEffect } from 'react';
import UploadZone from './components/UploadZone.jsx';
import ReceiptCard from './components/ReceiptCard.jsx';
import Dashboard from './components/Dashboard.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import ManualEntryModal from './components/ManualEntryModal.jsx';
import { useReceipts } from './hooks/useReceipts.js';
import { useGemini } from './hooks/useGemini.js';
import { formatCurrency } from './utils/formatters.js';
import { initSupabase } from './utils/supabase.js';
import styles from './App.module.css';

const DEFAULT_API_KEY = 'AIzaSyAfRlwIhY2tx0hrNRpSrsmU2SUHhxc59_c';
const LS_KEY = 'bonnetje_apikey';
const LS_SB_URL = 'bonnetje_sb_url';
const LS_SB_KEY = 'bonnetje_sb_key';

const DEFAULT_SB_URL = 'https://joummsvaeprtzbpizdtl.supabase.co';
const DEFAULT_SB_KEY = 'sb_publishable_zKbYN3ekzmiBT_S-G-Dt3w_eOxDXq3x';

function loadApiKey() {
  try {
    return localStorage.getItem(LS_KEY) || DEFAULT_API_KEY;
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
  
  const { extractReceipt, loading } = useGemini(apiKey);

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleSaveSettings = (newKey, newUrl, newKeySb) => {
    setApiKey(newKey);
    saveApiKey(newKey);
    
    setSupabaseUrl(newUrl);
    setSupabaseKey(newKeySb);
    try {
      localStorage.setItem(LS_SB_URL, newUrl);
      localStorage.setItem(LS_SB_KEY, newKeySb);
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
      
      try {
        const receipt = await extractReceipt(file);
        
        // Duplicate check
        const existing = checkDuplicate(receipt);
        if (existing) {
          const proceed = confirm(
            `Potential Duplicate detected!\n\nA receipt from "${receipt.store}" on ${receipt.date} for ${receipt.total} ${receipt.currency} already exists.\n\nDo you want to add it anyway?`
          );
          if (!proceed) continue;
        }

        addReceipt(receipt);
        
        if (i < fileArray.length - 1) {
          await sleep(1500);
        }
      } catch (err) {
        setExtractError((prev) => prev ? `${prev} | ${file.name}: ${err.message}` : `${file.name}: ${err.message}`);
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
