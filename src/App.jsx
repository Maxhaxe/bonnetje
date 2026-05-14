import { useState, useEffect } from 'react';
import UploadZone from './components/UploadZone.jsx';
import ReceiptCard from './components/ReceiptCard.jsx';
import Dashboard from './components/Dashboard.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import { useReceipts } from './hooks/useReceipts.js';
import { useGemini } from './hooks/useGemini.js';
import styles from './App.module.css';

const DEFAULT_API_KEY = 'AIzaSyC5ocIg1-Ct4uLfnmp7FVR1MZIm2g-6F4U';
const LS_KEY = 'bonnetje_apikey';

function loadApiKey() {
  try {
    return localStorage.getItem(LS_KEY) || DEFAULT_API_KEY;
  } catch {
    return DEFAULT_API_KEY;
  }
}

function saveApiKey(key) {
  try {
    localStorage.setItem(LS_KEY, key);
  } catch {}
}

export default function App() {
  const [apiKey, setApiKey] = useState(loadApiKey);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('receipts');
  const [extractError, setExtractError] = useState(null);
  const [batchProgress, setBatchProgress] = useState(null);
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState(null);

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

  const handleApiKeySave = (key) => {
    setApiKey(key);
    saveApiKey(key);
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
            <div className={styles.logoIcon}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            </div>
            <span className={styles.logoText}>Bonnetje</span>
          </div>

          <nav className={styles.tabs} aria-label="Main navigation">
            <button
              className={`${styles.tab} ${activeTab === 'receipts' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('receipts')}
            >
              Receipts
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
            Settings
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
                    <span>✨</span> Powered by Gemini 2.5 Pro
                  </div>
                  <h1 className={styles.heroTitle}>
                    Turn receipts into<br />
                    <span className={styles.heroGradient}>structured data</span>
                  </h1>
                  <p className={styles.heroSub}>
                    Upload a photo of any receipt. Bonnetje automatically extracts every item,
                    price, and payment card.
                  </p>
                </div>
              )}

              {activeTab === 'receipts' && (
                <div className={styles.uploadSection}>
                  {batchProgress && (
                    <div className={styles.batchBanner}>
                      <div className={styles.batchSpinner} />
                      <div className={styles.batchInfo}>
                        <p className={styles.batchText}>Processing batch: {batchProgress.current} of {batchProgress.total} receipts...</p>
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
                    <p className={styles.emptyTitle}>No data yet</p>
                    <button className="btn btn-primary" onClick={() => setActiveTab('receipts')}>
                      Upload a Receipt
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
                          Receipts for <span className={styles.filterPersonName}>{people.find(p => p.id === selectedPersonId)?.name}</span>
                        </>
                      ) : 'Processed Receipts'}
                      <span className={styles.listCount}>{displayReceipts.length}</span>
                    </h2>
                    {selectedPersonId && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelectedPersonId(null)}>
                        Clear Filter
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
                        <p>No receipts attached to this person yet.</p>
                        <p className={styles.emptyFilterTip}>Drag a receipt here or drop it on their name to link it.</p>
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
                    <span className={styles.personName}>All Receipts</span>
                    <span className={styles.personCount}>{receipts.length} total</span>
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
                        {receipts.filter(r => r.personId === person.id).length} receipts
                      </span>
                    </div>
                    {person.id !== 'p1' && (
                      <button 
                        className={styles.personDelete} 
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePerson(person.id);
                          if (selectedPersonId === person.id) setSelectedPersonId(null);
                        }}
                        title="Remove person"
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
          onSave={handleApiKeySave}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
