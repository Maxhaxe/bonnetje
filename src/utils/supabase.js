import { createClient } from '@supabase/supabase-js';

let supabase = null;

export function initSupabase(url, key) {
  if (!url || !key) {
    supabase = null;
    return null;
  }
  supabase = createClient(url, key);
  return supabase;
}

export function getSupabase() {
  return supabase;
}

export async function syncToSupabase(receipts, people) {
  if (!supabase) return;

  try {
    // We'll use a simple 'settings' table or similar to store the whole JSON for now
    // to keep it simple and avoid complex schema setup for the user.
    // However, a better way is to have 'receipts' and 'people' tables.
    // For this app, let's try to use a 'bonnetje_data' table.
    
    // Check if table exists is hard, so we just try to upsert.
    // User needs to create a table: CREATE TABLE bonnetje_data (id text primary key, data jsonb);
    
    const { error } = await supabase
      .from('bonnetje_data')
      .upsert({ id: 'latest', data: { receipts, people } });
      
    if (error) throw error;
  } catch (err) {
    console.error('Supabase sync error:', err);
  }
}

export async function fetchFromSupabase() {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('bonnetje_data')
      .select('data')
      .eq('id', 'latest')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data?.data;
  } catch (err) {
    console.error('Supabase fetch error:', err);
    return null;
  }
}

export async function uploadReceiptImage(file) {
  if (!supabase) {
    console.warn('Supabase not initialized — foto wordt niet permanent opgeslagen. Voeg Supabase-instellingen toe.');
    return null;
  }

  try {
    const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error } = await supabase.storage
      .from('receipts')
      .upload(filePath, file, { upsert: false, cacheControl: '3600' });

    if (error) {
      console.error('[Supabase Storage] Upload fout:', error.message, '— Controleer of de bucket "receipts" bestaat en Public is.');
      return null;
    }

    const { data } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath);

    console.log('[Supabase Storage] Upload gelukt:', data.publicUrl);
    return data.publicUrl;
  } catch (err) {
    console.error('[Supabase Storage] Onverwachte fout:', err);
    return null;
  }
}
