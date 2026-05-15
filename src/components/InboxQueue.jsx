import { useState, useCallback, useRef } from 'react';
import styles from './InboxQueue.module.css';
import { uploadReceiptImage } from '../utils/supabase.js';
import { uid } from '../utils/formatters.js';

const STATUS = {
  WAITING: 'waiting',
  UPLOADING: 'uploading',
  SCANNING: 'scanning',
  DONE: 'done',
  ERROR: 'error',
};

const statusLabel = {
  waiting: 'Wachten...',
  uploading: 'Uploaden...',
  scanning: 'Scannen met AI...',
  done: 'Verwerkt ✓',
  error: 'Fout',
};

const statusColor = {
  waiting: 'var(--text-secondary)',
  uploading: 'var(--accent-blue, #6c63ff)',
  scanning: 'var(--accent-primary)',
  done: 'var(--accent-success, #10b981)',
  error: 'var(--accent-danger)',
};

export default function InboxQueue({ onProcessed, extractReceipt, addReceipt, updateReceipt }) {
  const [queue, setQueue] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const processingRef = useRef(false);
  const fileInputRef = useRef(null);

  const updateItem = (id, updates) =>
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));

  const processQueue = useCallback(async (queueItems) => {
    if (processingRef.current) return;
    processingRef.current = true;

    for (const item of queueItems) {
      updateItem(item.id, { status: STATUS.UPLOADING });

      let publicUrl = null;
      let localBlobUrl = URL.createObjectURL(item.file);

      try {
        publicUrl = await uploadReceiptImage(item.file);
      } catch (_) {}

      const placeholderId = uid();
      const placeholder = {
        id: placeholderId,
        store: 'Inbox: Verwerken...',
        status: 'processing',
        imageUrl: publicUrl || localBlobUrl,
        date: new Date().toISOString().split('T')[0],
        items: [],
        subtotal: 0, discount: 0, tax: 0, total: 0,
        payment_card: null, payment_method: 'unknown', currency: 'EUR',
        store_domain: null,
        processedAt: new Date().toISOString(),
      };
      addReceipt(placeholder);

      updateItem(item.id, { status: STATUS.SCANNING });

      try {
        const scannedData = await extractReceipt(item.file);
        updateReceipt(placeholderId, { ...scannedData, status: 'completed', imageUrl: publicUrl || localBlobUrl });
        updateItem(item.id, { status: STATUS.DONE });
        onProcessed && onProcessed(placeholderId);
      } catch (err) {
        updateReceipt(placeholderId, { store: 'Fout bij scannen', status: 'error' });
        updateItem(item.id, { status: STATUS.ERROR, error: err.message });
      }
    }

    processingRef.current = false;
  }, [extractReceipt, addReceipt, updateReceipt, onProcessed]);

  const addFiles = useCallback((files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) return;

    const newItems = imageFiles.map(file => ({
      id: uid(),
      file,
      name: file.name,
      status: STATUS.WAITING,
      error: null,
      preview: URL.createObjectURL(file),
    }));

    setQueue(prev => {
      const updated = [...prev, ...newItems];
      // Start processing immediately
      setTimeout(() => processQueue(newItems), 100);
      return updated;
    });
  }, [processQueue]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const clearDone = () =>
    setQueue(prev => prev.filter(i => i.status !== STATUS.DONE && i.status !== STATUS.ERROR));

  const doneCount = queue.filter(i => i.status === STATUS.DONE).length;
  const errorCount = queue.filter(i => i.status === STATUS.ERROR).length;
  const activeCount = queue.filter(i => i.status === STATUS.SCANNING || i.status === STATUS.UPLOADING).length;
  const waitingCount = queue.filter(i => i.status === STATUS.WAITING).length;

  return (
    <div className={styles.inbox}>
      {/* Drop Zone */}
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        id="inbox-drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => addFiles(e.target.files)}
        />
        <div className={styles.dropIcon}>
          <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <p className={styles.dropTitle}>Sleep foto's hier naartoe</p>
        <p className={styles.dropSub}>of klik om bestanden te kiezen · Meerdere bestanden tegelijk mogelijk</p>

        {/* Stats */}
        {queue.length > 0 && (
          <div className={styles.stats} onClick={e => e.stopPropagation()}>
            {activeCount > 0 && <span className={styles.statBadge} style={{ background: 'rgba(108,99,255,0.15)', color: '#6c63ff' }}>⚡ {activeCount} actief</span>}
            {waitingCount > 0 && <span className={styles.statBadge} style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--text-secondary)' }}>⏳ {waitingCount} wachtend</span>}
            {doneCount > 0 && <span className={styles.statBadge} style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>✓ {doneCount} klaar</span>}
            {errorCount > 0 && <span className={styles.statBadge} style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>✕ {errorCount} fout</span>}
          </div>
        )}
      </div>

      {/* Queue List */}
      {queue.length > 0 && (
        <div className={styles.queueList}>
          <div className={styles.queueHeader}>
            <span className={styles.queueTitle}>Wachtrij ({queue.length})</span>
            {(doneCount > 0 || errorCount > 0) && (
              <button className="btn btn-ghost btn-sm" onClick={clearDone}>
                Verwerkte verwijderen
              </button>
            )}
          </div>
          {queue.map(item => (
            <div key={item.id} className={`${styles.queueItem} ${styles[item.status]}`}>
              {/* Thumbnail */}
              <div className={styles.thumb}>
                <img src={item.preview} alt={item.name} />
              </div>

              {/* Info */}
              <div className={styles.itemInfo}>
                <span className={styles.fileName}>{item.name}</span>
                <span className={styles.itemStatus} style={{ color: statusColor[item.status] }}>
                  {item.status === STATUS.SCANNING || item.status === STATUS.UPLOADING ? (
                    <span className={styles.spinner} />
                  ) : null}
                  {item.error || statusLabel[item.status]}
                </span>
              </div>

              {/* Progress bar */}
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: item.status === STATUS.WAITING ? '0%'
                      : item.status === STATUS.UPLOADING ? '33%'
                      : item.status === STATUS.SCANNING ? '66%'
                      : item.status === STATUS.DONE ? '100%'
                      : '100%',
                    background: item.status === STATUS.ERROR ? 'var(--accent-danger)' : item.status === STATUS.DONE ? '#10b981' : undefined,
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
