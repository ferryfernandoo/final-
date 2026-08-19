/**
 * Safe Storage Utility
 * Handles localStorage quota exceeded errors gracefully by:
 * 1. Attempting normal localStorage write
 * 2. On quota exceeded, clearing non-critical bloated cache keys (RAG index, image gallery base64, temp brainstorms)
 * 3. Retrying write
 * 4. Falling back to sessionStorage if localStorage is completely exhausted
 */

const NON_CRITICAL_KEYS = [
  'rag_index',
  'deepernova_saved_images_gallery',
  'brainstorm_messages_word',
  'brainstorm_messages_excel',
  'brainstorm_messages_ppt',
  'guest_global_memory_updated',
  'pending_chat_context',
  'pending_agent_topic',
  'research_anonymous_id'
];

export const safeSetItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`[SafeStorage] localStorage quota error on '${key}':`, err.message);

    // Step 1: Try clearing non-critical caches first
    try {
      for (const nonCriticalKey of NON_CRITICAL_KEYS) {
        if (nonCriticalKey !== key) {
          localStorage.removeItem(nonCriticalKey);
        }
      }
      localStorage.setItem(key, value);
      console.log(`[SafeStorage] Successfully saved '${key}' after cleaning non-critical caches.`);
      return true;
    } catch (_retryErr) {
      // Step 2: Try clearing old conversation caches or largest items
      try {
        const keys = Object.keys(localStorage);
        const sizedKeys = keys.map(k => ({
          key: k,
          size: (localStorage.getItem(k) || '').length
        })).sort((a, b) => b.size - a.size);

        // Remove largest keys that aren't critical auth keys
        for (const item of sizedKeys) {
          if (item.key !== key && item.key !== 'authUser' && item.key !== 'guestSession') {
            localStorage.removeItem(item.key);
            try {
              localStorage.setItem(key, value);
              console.log(`[SafeStorage] Successfully saved '${key}' after removing large item '${item.key}'.`);
              return true;
            } catch {}
          }
        }
      } catch (_cleanupErr) {}

      // Step 3: Fallback to sessionStorage
      try {
        sessionStorage.setItem(key, value);
        console.warn(`[SafeStorage] Stored '${key}' in sessionStorage as fallback.`);
        return true;
      } catch (sessionErr) {
        console.error(`[SafeStorage] Both localStorage and sessionStorage failed for '${key}':`, sessionErr);
        return false;
      }
    }
  }
};

export const safeGetItem = (key) => {
  try {
    const val = localStorage.getItem(key);
    if (val !== null) return val;
  } catch (err) {
    console.warn(`[SafeStorage] Error reading localStorage key '${key}':`, err);
  }

  try {
    return sessionStorage.getItem(key);
  } catch (err) {
    console.warn(`[SafeStorage] Error reading sessionStorage key '${key}':`, err);
    return null;
  }
};

export const safeRemoveItem = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {}
  try {
    sessionStorage.removeItem(key);
  } catch {}
};
