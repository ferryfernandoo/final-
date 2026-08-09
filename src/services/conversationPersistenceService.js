/**
 * Conversation Persistence Service
 * Handles saving/loading conversation history based on auth status
 * - Guests: Save to localStorage
 * - Authenticated users: Save to backend server
 */

import { API_BASE_URL } from '../apiConfig';

const STORAGE_KEY = 'chatbot_conversations';

class ConversationPersistenceService {
  /**
   * Determine if should use backend storage
   */
  static shouldUseBackendStorage(isAuthenticated, isGuest) {
    // Use backend if authenticated (not guest)
    const shouldUse = isAuthenticated === true && isGuest === false;
    console.log(`[ConversationPersistence] Auth check: isAuthenticated=${isAuthenticated}, isGuest=${isGuest}, useBackend=${shouldUse}`);
    return shouldUse;
  }

  /**
   * Load conversations from appropriate storage (merging backend + local storage)
   */
  static async loadConversations(isAuthenticated, isGuest) {
    let backendConvs = [];
    if (this.shouldUseBackendStorage(isAuthenticated, isGuest)) {
      try {
        const loaded = await this.loadFromBackend();
        if (Array.isArray(loaded)) {
          backendConvs = loaded;
        }
      } catch (err) {
        console.warn('[ConversationPersistence] Backend load error, fallback to local:', err);
      }
    }

    const localConvs = this.loadFromLocalStorage() || [];

    // Merge backend & local conversations by ID without duplication
    const convMap = new Map();
    [...backendConvs, ...localConvs].forEach(conv => {
      if (conv && conv.id && Array.isArray(conv.messages) && conv.messages.length > 0) {
        if (!convMap.has(conv.id)) {
          convMap.set(conv.id, conv);
        }
      }
    });

    const merged = Array.from(convMap.values());
    console.log(`[ConversationPersistence] Merged ${merged.length} conversations (Backend: ${backendConvs.length}, Local: ${localConvs.length})`);
    return merged.length > 0 ? merged : null;
  }

  /**
   * Save conversations to appropriate storage (always saves to localStorage + backend)
   */
  static async saveConversations(conversations, isAuthenticated, isGuest) {
    if (!Array.isArray(conversations) || conversations.length === 0) return true;

    // Always save to localStorage first as instant backup
    this.saveToLocalStorage(conversations);

    // Save to backend database if authenticated
    if (this.shouldUseBackendStorage(isAuthenticated, isGuest)) {
      try {
        await this.saveToBackend(conversations);
      } catch (err) {
        console.warn('[ConversationPersistence] Backend save error:', err);
      }
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
      if (conversations.length > 0) {
        const publicConversations = conversations.filter(c => !c.isPrivate);
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
                      const { dataUrl, ...rest } = img;
                      return {
                        ...rest,
                        dataUrl: (dataUrl && dataUrl.length < 50000) ? dataUrl : null
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

          if (validConversations.length > 0) {
            const jsonString = JSON.stringify(validConversations);
            const sizeInMB = (jsonString.length / 1024 / 1024).toFixed(2);
            console.log(`[ConversationPersistence] Total save size: ${sizeInMB}MB`);
            
            try {
              if (jsonString.length > 5000000) {
                console.warn(`Conversations too large (${sizeInMB}MB), keeping only last 20`);
                const trimmed = validConversations.slice(-20);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
              } else {
                localStorage.setItem(STORAGE_KEY, jsonString);
              }
              console.log(`[ConversationPersistence] ✅ Saved ${validConversations.length} conversations to localStorage`);
            } catch (storageErr) {
              console.warn('[ConversationPersistence] QuotaExceeded error handled when setting item:', storageErr.message);
            }
          }
        }
      }
      return true;
    } catch (err) {
      console.error('Error saving to localStorage:', err);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.error('Could not clear localStorage:', e);
      }
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
  static async saveToBackend(conversations) {
    try {
      if (conversations.length === 0) return true;

      const publicConversations = conversations.filter(c => !c.isPrivate);
      if (publicConversations.length === 0) return true;

      console.log(`[ConversationPersistence] Saving ${publicConversations.length} conversations to backend...`);
      const response = await fetch(`${API_BASE_URL}/api/conversations`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversations: publicConversations }),
      });

      if (!response.ok) {
        console.error(`Failed to save conversations: ${response.status}`);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error saving to backend:', err);
      return false;
    }
  }

  /**
   * Clear all conversations
   */
  static async clearAll(isAuthenticated, isGuest) {
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
