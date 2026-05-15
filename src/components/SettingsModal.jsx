import { useState } from 'react';
import styles from './SettingsModal.module.css';

export default function SettingsModal({ apiKey, supabaseUrl, supabaseKey, useServerSideScanning, receipts, people, onSave, onImport, onClose }) {
  const [key, setKey] = useState(apiKey || '');
  const [sbUrl, setSbUrl] = useState(supabaseUrl || '');
  const [sbKey, setSbKey] = useState(supabaseKey || '');
  const [serverScan, setServerScan] = useState(useServerSideScanning);
  const [visible, setVisible] = useState(false);
  const [sbVisible, setSbVisible] = useState(false);

  const handleSave = () => {
    onSave(key.trim(), sbUrl.trim(), sbKey.trim(), serverScan);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose} id="settings-overlay">
      <div
        className={`${styles.modal} glass`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Settings"
      >
        <div className={styles.header}>
          <h2 className={styles.title}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
            Instellingen
          </h2>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            id="close-settings-btn"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <hr className="divider" />

        <div className={styles.body}>
          {/* Gemini API Key Section */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="api-key-input">
              Gemini API Sleutel
            </label>
            <p className={styles.desc}>
              Gebruikt voor het scannen van bonnen en het genereren van productlinks. Wordt alleen lokaal in je browser opgeslagen.
            </p>
            <div className={styles.keyRow}>
              <input
                id="api-key-input"
                className="input"
                type={visible ? 'text' : 'password'}
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="AIzaSy..."
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setVisible(v => !v)}
                id="toggle-key-visibility-btn"
                data-tooltip={visible ? 'Sleutel verbergen' : 'Sleutel tonen'}
                type="button"
              >
                {visible ? (
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Server-side Scanning Option */}
          <div className={styles.field}>
            <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={serverScan}
                onChange={(e) => setServerScan(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              Via de server scannen (Aanbevolen)
            </label>
            <p className={styles.desc}>
              Indien ingeschakeld, worden bonnen naar onze server gestuurd voor veilig scannen. Hiermee blijft je API sleutel geheim en voorkom je netwerkfouten in de browser.
            </p>
          </div>

          <div className={styles.infoBox}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <span>
              Vraag een gratis sleutel aan op{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
                aistudio.google.com
              </a>
            </span>
          </div>

          <hr className="divider" style={{ margin: 'var(--space-lg) 0' }} />

          {/* Cloud Sync Section */}
          <div className={styles.field}>
            <label className={styles.label}>Cloud Synchronisatie (Supabase)</label>
            <p className={styles.desc}>
              Koppel een Supabase project om je bonnetjes automatisch te synchroniseren tussen je computer en telefoon.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
              <div>
                <label className={styles.labelSmall} htmlFor="sb-url-input">Project URL</label>
                <input
                  id="sb-url-input"
                  className="input"
                  type="text"
                  value={sbUrl}
                  onChange={e => setSbUrl(e.target.value)}
                  placeholder="https://xyz.supabase.co"
                  autoComplete="off"
                />
              </div>
              
              <div>
                <label className={styles.labelSmall} htmlFor="sb-key-input">API Key (anon/public)</label>
                <div className={styles.keyRow}>
                  <input
                    id="sb-key-input"
                    className="input"
                    type={sbVisible ? 'text' : 'password'}
                    value={sbKey}
                    onChange={e => setSbKey(e.target.value)}
                    placeholder="eyJhbG..."
                    autoComplete="off"
                  />
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => setSbVisible(v => !v)}
                    type="button"
                  >
                    {sbVisible ? (
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.infoBox} style={{ marginTop: 'var(--space-md)' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              <span>
                Setup: Maak een tabel genaamd <code>bonnetje_data</code> met kolommen: <code>id</code> (text pk) en <code>data</code> (jsonb).
              </span>
            </div>
          </div>

          <hr className="divider" style={{ margin: 'var(--space-lg) 0' }} />

          {/* Data Management Section */}
          <div className={styles.field}>
            <label className={styles.label}>Gegevens Beheer</label>
            <p className={styles.desc}>
              Omdat gegevens alleen in je browser worden opgeslagen, kun je ze hier exporteren om ze op een ander apparaat (zoals je telefoon) te importeren.
            </p>
            <div className={styles.dataActions}>
              <button 
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  const data = JSON.stringify({ receipts, people }, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `bonnetje-backup-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                📥 Export Gegevens
              </button>
              <button 
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = (e) => {
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    reader.onload = (re) => {
                      try {
                        const { receipts: r, people: p } = JSON.parse(re.target.result);
                        if (confirm('Weet je zeker dat je deze gegevens wilt importeren? Dit overschrijft je huidige gegevens.')) {
                          onImport(r, p);
                          alert('Gegevens succesvol geïmporteerd!');
                        }
                      } catch (err) {
                        alert('Fout bij importeren: Ongeldig bestand.');
                      }
                    };
                    reader.readAsText(file);
                  };
                  input.click();
                }}
              >
                📤 Importeer Gegevens
              </button>
              <button 
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--accent-danger)' }}
                onClick={() => {
                  if (confirm('Weet je zeker dat je ALLE gegevens wilt wissen? Dit kan niet ongedaan worden gemaakt.')) {
                    onImport([], [{ id: 'p1', name: 'Personal', avatar: '👤' }]);
                  }
                }}
              >
                🗑️ Alles Wissen
              </button>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className="btn btn-ghost" onClick={onClose} id="cancel-settings-btn">Annuleren</button>
          <button className="btn btn-primary" onClick={handleSave} id="save-settings-btn">
            Instellingen Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}
