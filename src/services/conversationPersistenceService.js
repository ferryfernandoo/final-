/**
 * Conversation Persistence Service
 * Handles saving/loading conversation history based on auth status
 * - Guests: Save to localStorage
 * - Authenticated users: Save to backend server
 */

import { API_BASE_URL } from '../apiConfig';
import { getDeviceId } from './realtimeSyncService';

const STORAGE_KEY = 'chatbot_conversations';

let _memoryCache = null;
let _lastSavedBackendHash = '';
let _lastSavedBackendAt = 0;

class ConversationPersistenceService {
  /**
   * Determine if should use backend storage
   */
  static shouldUseBackendStorage(isAuthenticated, isGuest) {
    // Use backend if authenticated (not guest)
    const shouldUse = isAuthenticated === true && isGuest === false;
    return shouldUse;
  }

  /**
   * Get cached conversations immediately for 0ms optimistic render
   */
  static getCachedConversations(isAuthenticated, isGuest) {
    if (_memoryCache && Array.isArray(_memoryCache) && _memoryCache.length > 0) {
      return _memoryCache;
    }
    // If logged into account, do NOT return stale unauthenticated guest localStorage
    if (this.shouldUseBackendStorage(isAuthenticated, isGuest)) {
      return [];
    }
    return this.loadFromLocalStorage() || [];
  }

  /**
   * Load conversations from appropriate storage:
   * - Authenticated users: Load strictly from backend database (no localStorage merge/pollution)
   * - Guests: Load from localStorage
   */
  static async loadConversations(isAuthenticated, isGuest) {
    const isAuth = this.shouldUseBackendStorage(isAuthenticated, isGuest);

    if (isAuth) {
      try {
        const backendConvs = await this.loadFromBackend();
        if (Array.isArray(backendConvs)) {
          _memoryCache = backendConvs;
          // Clear any stale unauthenticated guest conversation key from localStorage
          try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem('cached_conversations');
          } catch (_e) { }
          return backendConvs.length > 0 ? backendConvs : null;
        }
      } catch (err) {
        console.warn('[ConversationPersistence] Backend load error:', err);
      }
      return _memoryCache && _memoryCache.length > 0 ? _memoryCache : null;
    }

    // Guest mode only: load from localStorage
    const localConvs = this.loadFromLocalStorage() || [];
    _memoryCache = localConvs;
    return localConvs.length > 0 ? localConvs : null;
  }

  static isPrivateConversation(conv) {
    return Boolean(conv?.isPrivate || String(conv?.id || '').startsWith('private_'));
  }

  static filterPublicConversations(conversations) {
    if (!Array.isArray(conversations)) return [];
    return conversations.filter((c) => c && !this.isPrivateConversation(c));
  }

  /**
   * Save conversations to appropriate storage:
   * - Authenticated users: Save strictly to backend cloud database (NOT in shared localStorage)
   * - Guests: Save to browser localStorage
   */
  static async saveConversations(conversations, isAuthenticated, isGuest) {
    const publicConversations = this.filterPublicConversations(conversations);
    if (publicConversations.length === 0) return true;

    _memoryCache = publicConversations;

    if (this.shouldUseBackendStorage(isAuthenticated, isGuest)) {
      // Authenticated users: Save strictly to backend cloud database
      try {
        await this.saveToBackend(publicConversations);
      } catch (err) {
        console.warn('[ConversationPersistence] Backend save error:', err);
      }
    } else {
      // Guest mode only: save to browser localStorage
      this.saveToLocalStorage(publicConversations);
    }
    return true;
  }

  /**
   * Repair and guarantee user-first message sequence ('user' prompt ALWAYS before 'bot' response)
   */
  static normalizeMessageOrder(messages) {
    if (!Array.isArray(messages) || messages.length <= 1) return messages || [];

    // Sort messages chronologically by timestamp if available, ensuring user prompt comes before bot response
    const sorted = [...messages].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      if (timeA && timeB && !isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
        return timeA - timeB;
      }
      // If timestamps match or are missing, user prompt (0) comes before bot response (1)
      const isUserA = (a.sender === 'user' || a.role === 'user') ? 0 : 1;
      const isUserB = (b.sender === 'user' || b.role === 'user') ? 0 : 1;
      return isUserA - isUserB;
    });

    return sorted;
  }

  /**
   * Load from localStorage (Guest mode)
   */
  static loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved.trim()) {
        try {
          const convs = JSON.parse(saved);
          const sizeInMB = (saved.length / 1024 / 1024).toFixed(2);
          console.log(`[ConversationPersistence] 📦 Loaded ${sizeInMB}MB from localStorage`);

          if (Array.isArray(convs) && convs.length > 0) {
            const validConvs = convs.filter(c => c && c.id && c.messages !== undefined);
            if (validConvs.length > 0) {
              const result = validConvs.map((conv) => {
                const rawMsgs = Array.isArray(conv.messages) ? conv.messages : [];
                const processedMsgs = rawMsgs.map((msg) => {
                  const processedMsg = {
                    ...msg,
                    timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
                  };
                  if (msg.images && Array.isArray(msg.images)) {
                    processedMsg.images = msg.images;
                  }
                  return processedMsg;
                });

                // Guarantee user ask comes before bot response
                const normalizedMsgs = this.normalizeMessageOrder(processedMsgs);

                const processedConv = {
                  ...conv,
                  messages: normalizedMsgs,
                };
                const totalImages = processedConv.messages.reduce((sum, m) => sum + (m.images?.length || 0), 0);
                console.log(`[ConversationPersistence] Loaded conv "${processedConv.title}": ${processedConv.messages.length} messages, ${totalImages} total images`);
                return processedConv;
              });
              console.log(`[ConversationPersistence] ✅ Successfully loaded ${result.length} conversations with images intact`);
              return result;
            }
          }
        } catch (parseErr) {
          console.error('JSON parse error:', parseErr);
          return null;
        }
      }
      return null;
    } catch (err) {
      console.error('Error loading from localStorage:', err);
      return null;
    }
  }

  /**
   * Save to localStorage (Guest mode)
   */
  static saveToLocalStorage(conversations) {
    try {
      const publicConversations = this.filterPublicConversations(conversations);
      if (publicConversations.length > 0) {
        const validConversations = publicConversations
          .map(conv => {
            if (!conv.id || !conv.title || !Array.isArray(conv.messages)) {
              console.warn('Invalid conversation structure:', conv);
              return null;
            }
            // Preserve message structure safely for localStorage
            const processedMessages = conv.messages.map(msg => {
              const processedMsg = {
                ...msg,
              };
              if (msg.images && Array.isArray(msg.images)) {
                processedMsg.images = msg.images.map(img => {
                  if (img && typeof img === 'object') {
                    return {
                      ...img,
                      dataUrl: img.dataUrl || null,
                      publicUrl: img.publicUrl || null,
                      url: img.publicUrl || img.dataUrl || img.url || null
                    };
                  }
                  return img;
                });
              }
              // Preserve message structure safely for localStorage (strip empty unstarted bot placeholders)
              const processedMessages = conv.messages
                .filter(msg => {
                  if (!msg || typeof msg !== 'object') return false;
                  if (msg.sender === 'user') return true;
                  const txt = typeof msg.text === 'string' ? msg.text.trim() : (typeof msg.content === 'string' ? msg.content.trim() : '');
                  const hasMedia = Boolean(msg.imageUrl || (Array.isArray(msg.imageUrls) && msg.imageUrls.length > 0) || msg.downloadUrl || msg.subAgentData);
                  const hasSearch = Array.isArray(msg.searchSources) && msg.searchSources.length > 0;
                  return Boolean(txt || hasMedia || hasSearch);
                })
                .map(msg => {
                  const processedMsg = {
                    ...msg,
                    isStreaming: false,
                    isThinking: false,
                    isSearching: false,
                  };
                  if (msg.images && Array.isArray(msg.images)) {
                    processedMsg.images = msg.images.map(img => {
                      if (img && typeof img === 'object') {
                        return {
                          ...img,
                          dataUrl: img.dataUrl || null,
                          publicUrl: img.publicUrl || null,
                          url: img.publicUrl || img.dataUrl || img.url || null
                        };
                      }
                      return img;
                    });
                  }
                  return processedMsg;
                });

              const totalImageCount = processedMessages.reduce((sum, msg) => sum + (msg.images?.length || 0), 0);
              console.log(`[ConversationPersistence] Saving conversation "${conv.title}" (${processedMessages.length} messages, ${totalImageCount} images)`);

              return {
                id: conv.id,
                title: conv.title,
                messages: processedMessages,
                createdAt: conv.createdAt || new Date().toISOString(),
                updatedAt: conv.updatedAt || new Date().toISOString(),
                isPrivate: conv.isPrivate || false,
              };
            })
              .filter(c => c !== null);

            const totalImageCount = processedMessages.reduce((sum, msg) => sum + (msg.images?.length || 0), 0);
            console.log(`[ConversationPersistence] Saving conversation "${conv.title}" (${processedMessages.length} messages, ${totalImageCount} images)`);

            return {
              id: conv.id,
              title: conv.title,
              messages: processedMessages,
              createdAt: conv.createdAt || new Date().toISOString(),
              updatedAt: conv.updatedAt || new Date().toISOString(),
              isPrivate: conv.isPrivate || false,
            };
          })
          .filter(c => c !== null);

        if (validConversations.length > 0) {
          let toSave = validConversations;
          let saved = false;

          // Try saving, if QuotaExceededError occurs, progressively trim older conversations
          while (!saved && toSave.length > 0) {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
              saved = true;
              console.log(`[ConversationPersistence] ✅ Saved ${toSave.length} conversations to localStorage`);
            } catch (storageErr) {
              if (toSave.length > 1) {
                // Keep the most recent conversations
                const newLen = Math.max(1, Math.floor(toSave.length * 0.75));
                console.warn(`[ConversationPersistence] QuotaExceeded, trimming to ${newLen} recent conversations`);
                toSave = toSave.slice(-newLen);
              } else {
                console.warn('[ConversationPersistence] Could not fit single conversation into localStorage:', storageErr.message);
                break;
              }
            }
          }
        }
      }
      return true;
    } catch (err) {
      console.error('Error saving to localStorage:', err);
      return false;
    }
  }

  /**
   * Load from backend (Authenticated users)
   */
  static async loadFromBackend() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/conversations`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Not authenticated, fallback to localStorage');
          return null;
        }
        console.error(`Backend error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (data.conversations && Array.isArray(data.conversations)) {
        console.log(`[ConversationPersistence] Loaded ${data.conversations.length} conversations from backend`);

        return data.conversations.map((conv) => {
          // Process messages and restore image URLs from images array if available
          const messages = Array.isArray(conv.messages)
            ? conv.messages.map((msg) => {
              const processedMsg = {
                ...msg,
                sender: msg.sender === 'assistant' ? 'bot' : msg.sender,
                timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
              };

              // If message has imageUrl from server or embedded in text, keep it
              let imgUrl = msg.imageUrl;
              if (!imgUrl && msg.text) {
                const match = msg.text.match(/!\[.*?\]\((https?:\/\/[^\s\)]+|data:image\/[^\s\)]+)\)/i) ||
                  msg.text.match(/\[IMAGE_URL:\s*(https?:\/\/[^\s\]]+|data:image\/[^\s\]]+)\]/i);
                if (match) imgUrl = match[1];
              }

              if (imgUrl) {
                processedMsg.imageUrl = imgUrl;
                processedMsg.imageId = msg.imageId;
                processedMsg.isImage = true;
                console.log(`[ConversationPersistence] Message has image URL: ${imgUrl.substring(0, 80)}...`);
              }

              return processedMsg;
            })
            : [];

          // Guarantee user ask comes before bot response
          const normalizedMsgs = this.normalizeMessageOrder(messages);

          const imageCount = normalizedMsgs.filter(m => m.imageUrl).length;
          console.log(`[ConversationPersistence] Conversation ${conv.id}: ${normalizedMsgs.length} messages, ${imageCount} with images`);

          // Include images array for reference
          const result = {
            ...conv,
            messages: normalizedMsgs,
          };

          // Preserve images array if it exists
          if (conv.images && Array.isArray(conv.images)) {
            result.images = conv.images;
          }

          console.log(`[ConversationPersistence] Loaded conversation ${conv.id}: ${messages.length} messages, ${conv.images ? conv.images.length : 0} images`);

          return result;
        });
      }
      return null;
    } catch (err) {
      console.error('Error loading from backend:', err);
      return null;
    }
  }

  /**
   * Save to backend (Authenticated users)
   */
  static sanitizeMessagesForBackend(messages = []) {
    if (!Array.isArray(messages)) return [];
    const cleaned = [];
    for (const m of messages) {
      if (!m || typeof m !== 'object') continue;
      const text = typeof m.text === 'string' ? m.text : (typeof m.content === 'string' ? m.content : '');
      const hasMedia = Boolean(m.imageUrl || (Array.isArray(m.imageUrls) && m.imageUrls.length > 0) || m.downloadUrl || m.subAgentData);
      const hasSearch = Array.isArray(m.searchSources) && m.searchSources.length > 0;

      // Drop unstarted / empty streaming bot placeholders so blank rows never pollute DB
      if (m.sender !== 'user' && !text.trim() && !hasMedia && !hasSearch) {
        continue;
      }

      const compactMsg = {
        id: m.id,
        sender: m.sender === 'user' ? 'user' : 'bot',
        text: text.length > 80000 ? text.slice(0, 80000) : text,
        timestamp: m.timestamp,
        ...(m.personality ? { personality: m.personality } : {}),
        ...(m.searchQuery ? { searchQuery: m.searchQuery } : {}),
        ...(hasSearch
          ? {
            searchSources: m.searchSources.slice(0, 12).map((s) => ({
              title: s.title,
              link: s.link || s.url,
              url: s.url || s.link,
              domain: s.domain,
              snippet: typeof s.snippet === 'string' ? s.snippet.slice(0, 400) : '',
              thumbnail: s.thumbnail,
              accuracyScore: s.accuracyScore,
              date: s.date,
              sourceEngine: s.sourceEngine,
            })),
          }
          : {}),
        ...(Array.isArray(m.searchImages) && m.searchImages.length > 0
          ? { searchImages: m.searchImages.slice(0, 8) }
          : {}),
        ...(m.subAgentData ? { subAgentData: m.subAgentData } : {}),
        ...(m.downloadUrl ? { downloadUrl: m.downloadUrl } : {}),
        ...(m.fileName ? { fileName: m.fileName } : {}),
        ...(m.downloadSummary ? { downloadSummary: m.downloadSummary } : {}),
        ...(m.imageUrl && !String(m.imageUrl).startsWith('data:image/') ? { imageUrl: m.imageUrl } : {}),
      };
      cleaned.push(compactMsg);
    }
    return cleaned;
  }

  static async saveToBackend(conversations) {
    try {
      const sanitizedConvs = this.filterPublicConversations(conversations)
        .map((c) => {
          const msgs = this.sanitizeMessagesForBackend(c.messages || []);
          const firstUser = msgs.find((m) => m.sender === 'user' && m.text?.trim());
          const title = (c.title && String(c.title).trim()) || (firstUser ? firstUser.text.trim().slice(0, 45) : 'Obrolan AI');
          return {
            ...c,
            title,
            messages: msgs,
          };
        })
        .filter((c) => c.id && c.messages.length > 0);

      if (sanitizedConvs.length === 0) return true;

      // Stay well below Vercel's 4.5MB serverless request body limit
      const cappedConvs = [];
      let runningBytes = 0;
      const MAX_PAYLOAD_BYTES = 3.2 * 1024 * 1024;
      for (const conv of sanitizedConvs) {
        const chunkBytes = JSON.stringify(conv).length;
        if (cappedConvs.length > 0 && runningBytes + chunkBytes > MAX_PAYLOAD_BYTES) {
          break;
        }
        cappedConvs.push(conv);
        runningBytes += chunkBytes;
      }

      const deviceId = getDeviceId();
      const bodyStr = JSON.stringify({ conversations: cappedConvs, deviceId });
      const now = Date.now();
      if (bodyStr === _lastSavedBackendHash && now - _lastSavedBackendAt < 15000) {
        return true;
      }
      _lastSavedBackendHash = bodyStr;
      _lastSavedBackendAt = now;

      console.log(`[ConversationPersistence] Saving ${cappedConvs.length} conversations to backend (device: ${deviceId})...`);
      const response = await fetch(`${API_BASE_URL}/api/conversations`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        body: bodyStr,
      });

      if (!response.ok) {
        _lastSavedBackendHash = '';
        console.error(`Failed to save conversations: ${response.status}`);
        return false;
      }

      return true;
    } catch (err) {
      _lastSavedBackendHash = '';
      console.error('Error saving to backend:', err);
      return false;
    }
  }

  /**
   * Clear in-memory cache (used on logout / session switch)
   */
  static clearMemoryCache() {
    _memoryCache = null;
    _lastSavedBackendHash = '';
    _lastSavedBackendAt = 0;
  }

  /**
   * Clear all conversations
   */
  static async clearAll(isAuthenticated, isGuest) {
    _memoryCache = null;
    try {
      if (this.shouldUseBackendStorage(isAuthenticated, isGuest)) {
        // For backend, just make a delete request
        const response = await fetch(`${API_BASE_URL}/api/conversations`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        return response.ok;
      } else {
        // For localStorage
        localStorage.removeItem(STORAGE_KEY);
        return true;
      }
    } catch (err) {
      console.error('Error clearing conversations:', err);
      return false;
    }
  }

  /**
   * Delete specific conversation
   */
  static async deleteConversation(conversationId, isAuthenticated, isGuest) {
    try {
      if (this.shouldUseBackendStorage(isAuthenticated, isGuest)) {
        const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        return response.ok;
      } else {
        // For localStorage, it will be handled by setConversations in component
        return true;
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
      return false;
    }
  }
}

export { ConversationPersistenceService };
