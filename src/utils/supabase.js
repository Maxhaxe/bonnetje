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
