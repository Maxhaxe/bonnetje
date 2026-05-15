import { useState, useEffect, useCallback } from 'react';
import { getAllFromStore, saveToStore } from '../utils/db.js';
import { fetchFromSupabase, syncToSupabase } from '../utils/supabase.js';

const STORAGE_KEY = 'bonnetje_receipts';
const PEOPLE_KEY = 'bonnetje_people';

const DEFAULT_PEOPLE = [
  { id: 'p1', name: 'Personal', avatar: '👤' }
];

export function useReceipts() {
  const [receipts, setReceipts] = useState([]);
  const [people, setPeople] = useState(DEFAULT_PEOPLE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initial load and migration
  useEffect(() => {
    async function initData() {
      try {
        // 1. Try cloud first
        const cloudData = await fetchFromSupabase();
        if (cloudData) {
          console.log('Syncing from Supabase...');
          const cleanedReceipts = (cloudData.receipts || []).map(r => r.status === 'processing' ? { ...r, status: 'error', store: 'Fout bij verwerken (gestopt)' } : r);
          setReceipts(cleanedReceipts);
          setPeople(cloudData.people || DEFAULT_PEOPLE);
          await saveToStore('receipts', cleanedReceipts);
          await saveToStore('people', cloudData.people || DEFAULT_PEOPLE);
          setIsLoaded(true);
          return;
        }

        // 2. Try IndexedDB
        const dbReceipts = await getAllFromStore('receipts');
        const dbPeople = await getAllFromStore('people');

        // Migration from localStorage if IndexedDB is empty
        if (dbReceipts.length === 0 && dbPeople.length <= 1) {
          const localReceiptsRaw = localStorage.getItem(STORAGE_KEY);
          const localPeopleRaw = localStorage.getItem(PEOPLE_KEY);
          
          let migratedReceipts = [];
          let migratedPeople = DEFAULT_PEOPLE;

          if (localReceiptsRaw) {
            try {
              migratedReceipts = JSON.parse(localReceiptsRaw);
            } catch {}
          }
          if (localPeopleRaw) {
            try {
              migratedPeople = JSON.parse(localPeopleRaw);
            } catch {}
          }

          if (migratedReceipts.length > 0 || migratedPeople.length > 1) {
            console.log('Migrating data to IndexedDB...');
            const cleanedMigrated = migratedReceipts.map(r => r.status === 'processing' ? { ...r, status: 'error', store: 'Fout bij verwerken (gestopt)' } : r);
            await saveToStore('receipts', cleanedMigrated);
            await saveToStore('people', migratedPeople);
            setReceipts(cleanedMigrated);
            setPeople(migratedPeople);
            setIsLoaded(true);
            return;
          }
        }

        const cleanedDbReceipts = dbReceipts.map(r => r.status === 'processing' ? { ...r, status: 'error', store: 'Fout bij verwerken (gestopt)' } : r);
        setReceipts(cleanedDbReceipts);
        if (dbPeople.length > 0) setPeople(dbPeople);
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load data from database:', error);
        setIsLoaded(true);
      }
    }

    initData();
  }, []);

  // Persistence effects (Local)
  useEffect(() => {
    if (isLoaded) {
      saveToStore('receipts', receipts);
    }
  }, [receipts, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      saveToStore('people', people);
    }
  }, [people, isLoaded]);

  // Persistence effect (Cloud)
  useEffect(() => {
    if (isLoaded) {
      const timer = setTimeout(() => {
        syncToSupabase(receipts, people);
      }, 2000); // Debounce sync to avoid spamming
      return () => clearTimeout(timer);
    }
  }, [receipts, people, isLoaded]);

  const addPerson = useCallback((name) => {
    const newPerson = { id: `p_${Date.now()}`, name, avatar: '👤' };
    setPeople(prev => [...prev, newPerson]);
    return newPerson;
  }, []);

  const deletePerson = useCallback((id) => {
    setPeople(prev => prev.filter(p => p.id !== id));
    setReceipts(prev => prev.map(r => r.personId === id ? { ...r, personId: null } : r));
  }, []);

  const addReceipt = useCallback((receipt) => {
    setReceipts(prev => [receipt, ...prev]);
  }, []);

  const assignPerson = useCallback((receiptId, personId) => {
    setReceipts(prev => prev.map(r => r.id === receiptId ? { ...r, personId } : r));
  }, []);

  const updateReceipt = useCallback((id, updates) => {
    setReceipts(prev =>
      prev.map(r => r.id === id ? { ...r, ...updates } : r),
    );
  }, []);

  const updateItem = useCallback((receiptId, itemId, updates) => {
    setReceipts(prev =>
      prev.map(r => {
        if (r.id !== receiptId) return r;
        return {
          ...r,
          items: r.items.map(item =>
            item.id === itemId ? { ...item, ...updates } : item,
          ),
        };
      }),
    );
  }, []);

  const deleteReceipt = useCallback((id) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setReceipts([]);
  }, []);

  const checkDuplicate = useCallback((newReceipt) => {
    return receipts.find(r => 
      r.store?.toLowerCase() === newReceipt.store?.toLowerCase() &&
      r.date === newReceipt.date &&
      Math.abs((r.total || 0) - (newReceipt.total || 0)) < 0.01
    );
  }, [receipts]);

  // Computed aggregates
  const totals = {
    grandTotal: receipts.reduce((sum, r) => sum + (r.total || 0), 0),
    receiptCount: receipts.length,
    itemCount: receipts.reduce((sum, r) => sum + (r.items?.length || 0), 0),
    byCard: receipts.reduce((acc, r) => {
      const key = r.payment_card || 'Unknown';
      acc[key] = (acc[key] || 0) + (r.total || 0);
      return acc;
    }, {}),
    byStore: receipts.reduce((acc, r) => {
      const key = r.store || 'Unknown';
      acc[key] = (acc[key] || 0) + (r.total || 0);
      return acc;
    }, {}),
    byPerson: receipts.reduce((acc, r) => {
      const key = r.personId || 'unassigned';
      acc[key] = (acc[key] || 0) + (r.total || 0);
      return acc;
    }, {}),
  };

  return { 
    receipts, 
    people, 
    isLoaded,
    setReceipts,
    setPeople,
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
  };
}
