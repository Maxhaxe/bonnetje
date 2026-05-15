import { getSupabase } from './supabase.js';

const INBOX_PREFIX = 'inbox/';
const PROCESSED_PREFIX = ''; // Moves to root of receipts bucket

/**
 * List all image files currently in the inbox/ folder of Supabase Storage.
 * Returns array of { name, path, publicUrl }.
 */
export async function listInboxFiles() {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase.storage
      .from('receipts')
      .list(INBOX_PREFIX, { limit: 100, offset: 0 });

    if (error) {
      console.error('[Inbox] Error listing files:', error.message);
      return [];
    }

    const imageFiles = (data || []).filter(
      f => f.id !== null && f.name !== '.emptyFolderPlaceholder'
    );

    return imageFiles.map(f => {
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(`${INBOX_PREFIX}${f.name}`);
      return {
        name: f.name,
        path: `${INBOX_PREFIX}${f.name}`,
        publicUrl: urlData.publicUrl,
        createdAt: f.created_at,
      };
    });
  } catch (err) {
    console.error('[Inbox] Unexpected error:', err);
    return [];
  }
}

/**
 * Download a file from Supabase Storage inbox as a Blob/File.
 */
export async function downloadInboxFile(filePath, fileName) {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.storage
      .from('receipts')
      .download(filePath);

    if (error) {
      console.error('[Inbox] Download error:', error.message);
      return null;
    }

    // Convert blob to File object so it can be used in the scan function
    return new File([data], fileName, { type: data.type || 'image/jpeg' });
  } catch (err) {
    console.error('[Inbox] Unexpected download error:', err);
    return null;
  }
}

/**
 * Move a file from inbox/ to root of the receipts bucket (mark as processed).
 */
export async function moveInboxFileToProcessed(filePath, fileName) {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase.storage
      .from('receipts')
      .move(filePath, `${PROCESSED_PREFIX}${Date.now()}_${fileName}`);

    if (error) {
      console.error('[Inbox] Move error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Inbox] Unexpected move error:', err);
    return false;
  }
}

/**
 * Delete a file from the inbox (e.g. after successful processing).
 */
export async function deleteInboxFile(filePath) {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase.storage.from('receipts').remove([filePath]);
    if (error) {
      console.error('[Inbox] Delete error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Inbox] Unexpected delete error:', err);
    return false;
  }
}
