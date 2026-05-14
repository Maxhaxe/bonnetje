import { useRef, useState } from 'react';
import styles from './UploadZone.module.css';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif'];

export default function UploadZone({ onUpload, loading }) {
  const [dragging, setDragging] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    
    const validFiles = Array.from(fileList).filter(f => {
      if (ACCEPTED.includes(f.type)) return true;
      // Fallback for files with missing MIME types (common on some mobile browsers)
      const ext = f.name.split('.').pop().toLowerCase();
      return ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext);
    });

    if (validFiles.length === 0) {
      alert('Upload a.u.b. een geldige afbeelding (JPEG, PNG, WebP of HEIC).');
      return;
    }
    const newPreviews = validFiles.map(f => URL.createObjectURL(f));
    setPreviews(newPreviews);
    setPendingFiles(validFiles);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleProcess = () => {
    if (pendingFiles.length > 0) {
      onUpload(pendingFiles);
      setPreviews([]);
      setPendingFiles([]);
    }
  };

  const handleCancel = () => {
    setPreviews([]);
    setPendingFiles([]);
  };

  return (
    <div className={styles.wrapper}>
      {previews.length === 0 ? (
        <div
          className={`${styles.zone} ${dragging ? styles.dragging : ''} ${loading ? styles.processing : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !loading && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          aria-label="Upload receipt image"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED.join(',')}
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
            id="receipt-file-input"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
            id="receipt-camera-input"
          />

          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p className={styles.loadingText}>Bongegevens extraheren…</p>
              <p className={styles.loadingSubtext}>Gemini Vision analyseert je afbeelding</p>
            </div>
          ) : (
            <div className={styles.idleState}>
              <div className={styles.iconRing}>
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className={styles.mainText}>Sleep bonnetje hierheen</p>
              <p className={styles.subText}>of klik om te bladeren · JPEG, PNG, WebP</p>
              <div className={styles.orRow}>
                <span />
                <span>of</span>
                <span />
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                id="camera-capture-btn"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
                Gebruik Camera
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.previewWrapper}>
          <div className={styles.previewGrid}>
            {previews.map((url, i) => (
              <img key={i} src={url} alt={`Preview ${i+1}`} className={styles.previewImg} />
            ))}
          </div>
          <div className={styles.previewActions}>
            <button className="btn btn-primary" onClick={handleProcess} id="process-receipt-btn">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {pendingFiles.length} {pendingFiles.length === 1 ? 'bonnetje' : 'bonnetjes'} verwerken
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleCancel} id="cancel-preview-btn">
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
