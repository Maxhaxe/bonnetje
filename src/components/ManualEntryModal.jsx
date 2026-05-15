import { useState } from 'react';
import styles from './ManualEntryModal.module.css';

export default function ManualEntryModal({ onAdd, onClose }) {
  const [store, setStore] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [total, setTotal] = useState('');
  const [paymentCard, setPaymentCard] = useState('');
  const [items, setItems] = useState([{ id: 1, name: '', price: '' }]);

  const addItem = () => {
    setItems([...items, { id: Date.now(), name: '', price: '' }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!store || !total) {
      alert('Vul a.u.b. tenminste de winkel en het totaalbedrag in.');
      return;
    }

    const newReceipt = {
      id: `manual_${Date.now()}`,
      store: store.trim(),
      date,
      total: parseFloat(total) || 0,
      currency: 'EUR',
      payment_card: paymentCard.trim() || 'Contant',
      items: items
        .filter(i => i.name.trim())
        .map(i => ({
          id: `item_${Math.random()}`,
          name: i.name.trim(),
          price: parseFloat(i.price) || 0,
          quantity: 1
        })),
      manual: true,
      personId: null
    };

    onAdd(newReceipt);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} glass`} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Handmatig Bonnetjes Toevoegen</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.body}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>Winkel</label>
              <input 
                className="input" 
                value={store} 
                onChange={e => setStore(e.target.value)} 
                placeholder="bijv. Albert Heijn" 
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Datum</label>
              <input 
                className="input" 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Totaalbedrag (€)</label>
              <input 
                className="input" 
                type="number" 
                step="0.01" 
                value={total} 
                onChange={e => setTotal(e.target.value)} 
                placeholder="0.00" 
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Betaalmethode</label>
              <input 
                className="input" 
                value={paymentCard} 
                onChange={e => setPaymentCard(e.target.value)} 
                placeholder="bijv. ING" 
              />
            </div>
          </div>

          <div className={styles.itemsSection}>
            <div className={styles.sectionHeader}>
              <label className={styles.label}>Producten (Optioneel)</label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>
                + Product Toevoegen
              </button>
            </div>
            
            <div className={styles.itemsList}>
              {items.map((item) => (
                <div key={item.id} className={styles.itemRow}>
                  <input 
                    className="input" 
                    value={item.name} 
                    onChange={e => updateItem(item.id, 'name', e.target.value)} 
                    placeholder="Productnaam"
                  />
                  <input 
                    className="input" 
                    type="number" 
                    step="0.01" 
                    value={item.price} 
                    onChange={e => updateItem(item.id, 'price', e.target.value)} 
                    placeholder="€"
                    style={{ width: '80px' }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-ghost btn-icon btn-sm" 
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Annuleren</button>
            <button type="submit" className="btn btn-primary">Bonnetje Opslaan</button>
          </div>
        </form>
      </div>
    </div>
  );
}
