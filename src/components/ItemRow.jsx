import { useState } from 'react';
import { formatCurrency, categoryEmoji, truncate } from '../utils/formatters.js';
import styles from './ItemRow.module.css';

export default function ItemRow({ item, currency, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: item.name,
    qty: item.qty,
    unit_price: item.unit_price,
    total_price: item.total_price,
  });

  const link = item.link;
  const isDirect = link?.type === 'direct';

  const handleSave = () => {
    onUpdate({
      ...editData,
      qty: Number(editData.qty),
      unit_price: Number(editData.unit_price),
      total_price: Number(editData.total_price),
    });
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setEditing(false);
  };

  return (
    <tr className={styles.row}>
      <td className={styles.cellName}>
        <div className={styles.nameWrapper}>
          <span className={styles.emoji}>{categoryEmoji(item.category)}</span>
          {editing ? (
            <input
              className={`input ${styles.editInput}`}
              value={editData.name}
              onChange={e => setEditData(p => ({ ...p, name: e.target.value }))}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          ) : (
            <span className={styles.name} title={item.name}>{truncate(item.name, 35)}</span>
          )}
        </div>
      </td>

      <td className={styles.cellQty}>
        {editing ? (
          <input
            className={`input ${styles.editInput} ${styles.editQty}`}
            type="number"
            value={editData.qty}
            onChange={e => setEditData(p => ({ ...p, qty: e.target.value }))}
            onKeyDown={handleKeyDown}
            min={1}
          />
        ) : (
          <span className={styles.qty}>{item.qty}×</span>
        )}
      </td>

      <td className={styles.cellPrice}>
        {editing ? (
          <input
            className={`input ${styles.editInput} ${styles.editPrice}`}
            type="number"
            step="0.01"
            value={editData.unit_price}
            onChange={e => setEditData(p => ({ ...p, unit_price: e.target.value }))}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <span className={styles.price}>{formatCurrency(item.unit_price, currency)}</span>
        )}
      </td>

      <td className={styles.cellTotal}>
        {editing ? (
          <input
            className={`input ${styles.editInput} ${styles.editPrice}`}
            type="number"
            step="0.01"
            value={editData.total_price}
            onChange={e => setEditData(p => ({ ...p, total_price: e.target.value }))}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <span className={styles.total}>{formatCurrency(item.total_price, currency)}</span>
        )}
      </td>

      <td className={styles.cellLink}>
        {link?.url ? (
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.linkBtn} ${isDirect ? styles.direct : styles.search}`}
            data-tooltip={isDirect ? 'Direct product page' : 'Search for product on store website'}
          >
            {isDirect ? (
              <>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                Product
              </>
            ) : (
              <>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
                </svg>
                Search
              </>
            )}
          </a>
        ) : (
          <span className={styles.noLink}>—</span>
        )}
      </td>

      <td className={styles.cellActions}>
        {editing ? (
          <div className={styles.editActions}>
            <button
              className={`btn btn-primary btn-sm ${styles.saveBtn}`}
              onClick={handleSave}
              id={`save-item-${item.id}`}
            >✓</button>
            <button
              className={`btn btn-ghost btn-sm`}
              onClick={() => setEditing(false)}
            >✕</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '2px' }}>
            <button
              className={`btn btn-ghost btn-sm btn-icon ${styles.editBtn}`}
              onClick={() => setEditing(true)}
              id={`edit-item-${item.id}`}
              data-tooltip="Bewerk product"
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L18 8.625" />
              </svg>
            </button>
            {onDelete && (
              <button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={onDelete}
                id={`delete-item-${item.id}`}
                data-tooltip="Verwijder product"
                style={{ color: 'var(--accent-danger)' }}
              >
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
