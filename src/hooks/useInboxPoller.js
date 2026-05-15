import { useState, useEffect, useRef, useCallback } from 'react';
import { listInboxFiles, downloadInboxFile, deleteInboxFile } from '../utils/supabaseInbox.js';
import { getSupabase } from '../utils/supabase.js';

const POLL_INTERVAL_MS = 30000; // Check every 30 seconds

/**
 * Polls the Supabase Storage inbox/ folder every 30 seconds.
 * When new files are found, calls onNewFile(file, meta) for each.
 * 
 * @param {function} onNewFile - Called with (File, { name, publicUrl }) for each new inbox file
 * @param {boolean} enabled - Whether polling is active
 */
export function useInboxPoller({ onNewFile, enabled = true }) {
  const [isPolling, setIsPolling] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  const [inboxCount, setInboxCount] = useState(0);
  const processingRef = useRef(new Set()); // Track files currently being processed
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const checkInbox = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !enabledRef.current) return;

    try {
      const files = await listInboxFiles();
      // Filter out files already being processed
      const newFiles = files.filter(f => !processingRef.current.has(f.name));
      setInboxCount(newFiles.length);
      setLastCheck(new Date());

      for (const meta of newFiles) {
        processingRef.current.add(meta.name);
        try {
          const file = await downloadInboxFile(meta.path, meta.name);
          if (file) {
            await onNewFile(file, meta);
            // Remove from inbox after successful processing
            await deleteInboxFile(meta.path);
          }
        } catch (err) {
          console.error('[InboxPoller] Error processing file:', meta.name, err);
        } finally {
          processingRef.current.delete(meta.name);
        }
      }
    } catch (err) {
      console.error('[InboxPoller] Poll error:', err);
    }
  }, [onNewFile]);

  useEffect(() => {
    if (!enabled) return;

    // Run immediately on mount
    setIsPolling(true);
    checkInbox().finally(() => setIsPolling(false));

    const interval = setInterval(async () => {
      setIsPolling(true);
      await checkInbox();
      setIsPolling(false);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [enabled, checkInbox]);

  const triggerNow = useCallback(async () => {
    setIsPolling(true);
    await checkInbox();
    setIsPolling(false);
  }, [checkInbox]);

  return { isPolling, lastCheck, inboxCount, triggerNow };
}
