import { useState, useRef, useCallback } from 'react';
import styles from './StagingArea.module.css';
import { uid } from '../utils/formatters.js';

export default function StagingArea({ onProcess }) {
  const [staged, setStaged] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const addFiles = useCallback((files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) return;
    const newItems = imageFiles.map(file => ({
      id: uid(),
      file,
      name: file.name,
      preview: URL.createObjectURL(file),
    }));
    setStaged(prev => [...prev, ...newItems]);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(staged.map(s => s.id)));
  const selectNone = () => setSelected(new Set());

  const removeItem = (id) => {
    setStaged(prev => prev.filter(s => s.id !== id));
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleProcess = () => {
    const toProcess = staged.filter(s => selected.has(s.id));
    if (!toProcess.length) return;
    // Remove processed items from staging
    setStaged(prev => prev.filter(s => !selected.has(s.id)));
    setSelected(new Set());
    onProcess(toProcess.map(s => s.file));
  };

  const selectedCount = selected.size;
  const totalCount = staged.length;

  return (
    <div className={styles.staging}>
      {/* Drop Zone */}
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        id="staging-drop-zone"
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
          <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <p className={styles.dropTitle}>Sleep foto's hier naartoe</p>
        <p className={styles.dropSub}>of klik om te kiezen · meerdere bestanden tegelijk</p>
      </div>

      {/* Gallery + Actions */}
      {staged.length > 0 && (
        <>
          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <span className={styles.countLabel}>{totalCount} foto{totalCount !== 1 ? "'s" : ''} klaar</span>
              <button className="btn btn-ghost btn-sm" onClick={selectAll}>Alles selecteren</button>
              {selectedCount > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={selectNone}>Selectie wissen</button>
              )}
            </div>
            <button
              className="btn btn-primary btn-sm"
              disabled={selectedCount === 0}
              onClick={handleProcess}
              id="process-selected-btn"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {selectedCount > 0 ? `${selectedCount} verwerken` : 'Selecteer foto\'s'}
            </button>
          </div>

          {/* Photo Grid */}
          <div className={styles.grid}>
            {staged.map(item => (
              <div
                key={item.id}
                className={`${styles.card} ${selected.has(item.id) ? styles.cardSelected : ''}`}
                onClick={() => toggleSelect(item.id)}
                id={`staged-item-${item.id}`}
              >
                <img src={item.preview} alt={item.name} className={styles.thumb} />

                {/* Checkbox overlay */}
                <div className={styles.checkOverlay}>
                  <div className={`${styles.check} ${selected.has(item.id) ? styles.checkOn : ''}`}>
                    {selected.has(item.id) && (
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Delete button */}
                <button
                  className={styles.deleteBtn}
                  onClick={e => { e.stopPropagation(); removeItem(item.id); }}
                  title="Verwijderen"
                >
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Filename */}
                <div className={styles.fileName}>{item.name}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
