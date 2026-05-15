import { useState } from 'react';
import ItemRow from './ItemRow.jsx';
import CardBadge from './CardBadge.jsx';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import styles from './ReceiptCard.module.css';

export default function ReceiptCard({ receipt, person, onDelete, onUpdateItem, animationDelay = 0, draggable = false }) {
  const [expanded, setExpanded] = useState(true);
  const [showImage, setShowImage] = useState(false);

  const currency = receipt.currency || 'EUR';

  const handleDragStart = (e) => {
    e.dataTransfer.setData('receiptId', receipt.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <article
      className={`${styles.card} glass animate-fade-up`}
      style={{ animationDelay: `${animationDelay}ms` }}
      id={`receipt-${receipt.id}`}
      draggable={draggable}
      onDragStart={handleDragStart}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.storeIcon}>
            {receipt.store_domain ? (
              <img
                src={`https://www.google.com/s2/favicons?sz=32&domain=${receipt.store_domain}`}
                alt={receipt.store}
                className={styles.favicon}
                onError={e => { e.target.style.display = 'none'; }}
              />
            ) : (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
              </svg>
            )}
          </div>
          <div>
            <div className={styles.titleRow}>
              <h3 className={styles.storeName}>{receipt.store}</h3>
              {person && (
                <span className={styles.personBadge} title={`Attached to ${person.name}`}>
                  {person.avatar} {person.name}
                </span>
              )}
            </div>
            <p className={styles.date}>{formatDate(receipt.date)}</p>
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.totalPill}>
            <span className={styles.totalLabel}>Totaal</span>
            <span className={styles.totalAmount}>{formatCurrency(receipt.total, currency)}</span>
          </div>
          <CardBadge cardString={receipt.payment_card} small />

          {receipt.imageUrl && (
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => setShowImage(v => !v)}
              data-tooltip="Bekijk bon foto"
              id={`toggle-image-${receipt.id}`}
            >
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </button>
          )}

          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => setExpanded(v => !v)}
            id={`toggle-receipt-${receipt.id}`}
            data-tooltip={expanded ? 'Inklappen' : 'Uitklappen'}
          >
            <svg
              width="15" height="15" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}
              style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => onDelete(receipt.id)}
            id={`delete-receipt-${receipt.id}`}
            data-tooltip="Verwijder bonnetje"
            style={{ color: 'var(--accent-danger)' }}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Receipt image */}
      {showImage && receipt.imageUrl && (
        <div className={styles.imageWrapper}>
          <img src={receipt.imageUrl} alt="Bonnetje" className={styles.receiptImage} />
        </div>
      )}

      {/* Items table */}
      {expanded && receipt.status !== 'processing' && (
        <div className={styles.body}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.tableHead}>
                  <th>Product</th>
                  <th style={{ textAlign: 'center' }}>Aantal</th>
                  <th style={{ textAlign: 'right' }}>Prijs p/s</th>
                  <th style={{ textAlign: 'right' }}>Totaal</th>
                  <th style={{ textAlign: 'center' }}>Product Link</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {receipt.items?.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    currency={currency}
                    onUpdate={(updates) => onUpdateItem(receipt.id, item.id, updates)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer totals */}
          <div className={styles.footer}>
            <div className={styles.footerLeft}>
              <span className={styles.itemCount}>{receipt.items?.length || 0} producten</span>
              {receipt.store_domain && (
                <a
                  href={`https://${receipt.store_domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.storeLink}
                  id={`store-link-${receipt.id}`}
                >
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                  {receipt.store_domain}
                </a>
              )}
            </div>
            <div className={styles.totalsGrid}>
              {receipt.discount > 0 && (
                <div className={styles.totalsRow}>
                  <span>Korting</span>
                  <span className="text-success">−{formatCurrency(receipt.discount, currency)}</span>
                </div>
              )}
              {receipt.tax > 0 && (
                <div className={styles.totalsRow}>
                  <span>BTW</span>
                  <span>{formatCurrency(receipt.tax, currency)}</span>
                </div>
              )}
              <div className={`${styles.totalsRow} ${styles.grandTotal}`}>
                <span>Totaalbedrag</span>
                <span>{formatCurrency(receipt.total, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processing State */}
      {expanded && receipt.status === 'processing' && (
        <div className={styles.body} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', gap: '1rem', color: 'var(--text-secondary)' }}>
          <svg className="animate-spin" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Bonnetje wordt gescand met AI...</span>
        </div>
      )}
    </article>
  );
}
