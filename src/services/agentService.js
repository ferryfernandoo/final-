// ============================================================================
// ⚡ DEEPERNOVA AI AGENT SERVICE
// Client service for autonomous sandbox, files, execution & live chain-of-work
// ============================================================================

import { API_BASE_URL } from '../apiConfig';
import { getDeviceId } from './realtimeSyncService';

class AgentService {
  /**
   * List all agent sessions
   */
  static async getSessions() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/sessions`, {
        credentials: 'include',
        headers: {
          'x-device-id': getDeviceId()
        }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.sessions || [];
    } catch (e) {
      console.warn('[AgentService] Error fetching sessions:', e);
      return [];
    }
  }

  /**
   * Create new agent session
   */
  static async createSession(title = 'Tugas Otonom AI') {
    try {
      const id = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const res = await fetch(`${API_BASE_URL}/api/agent/sessions`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': getDeviceId()
        },
        body: JSON.stringify({ id, title })
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.session;
    } catch (e) {
      console.warn('[AgentService] Error creating session:', e);
      return null;
    }
  }

  /**
   * Delete agent session
   */
  static async deleteSession(sessionId) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'x-device-id': getDeviceId()
        }
      });
      return res.ok;
    } catch (e) {
      console.warn('[AgentService] Error deleting session:', e);
      return false;
    }
  }

  /**
   * Get messages for a session (with chain of work)
   */
  static async getMessages(sessionId) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/messages?sessionId=${encodeURIComponent(sessionId)}`, {
        credentials: 'include'
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.messages || [];
    } catch (e) {
      console.warn('[AgentService] Error fetching messages:', e);
      return [];
    }
  }

  /**
   * List files in the sandbox workspace
   */
  static async getFiles(sessionId) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/files?sessionId=${encodeURIComponent(sessionId)}`, {
        credentials: 'include'
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.files || [];
    } catch (e) {
      console.warn('[AgentService] Error listing files:', e);
      return [];
    }
  }

  /**
   * Write/update a file in the sandbox
   */
  static async writeFile(sessionId, path, content) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/file/write`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, path, content })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('[AgentService] Error writing file:', e);
      return null;
    }
  }

  /**
   * Read file content from the sandbox
   */
  static async readFile(sessionId, path) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/file/read?sessionId=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(path)}`, {
        credentials: 'include'
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.content || '';
    } catch (e) {
      console.warn('[AgentService] Error reading file:', e);
      return null;
    }
  }

  /**
   * Delete file from sandbox
   */
  static async deleteFile(sessionId, path) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/file`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, path })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('[AgentService] Error deleting file:', e);
      return null;
    }
  }

  /**
   * Execute code or terminal command in the sandbox
   */
  static async executeCode(sessionId, { language = 'node', code = '', command = '', timeoutMs = 15000 }) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/execute`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, language, code, command, timeoutMs })
      });
      if (!res.ok) return { success: false, stderr: 'Request failed' };
      const data = await res.json();
      return data.result || { success: false, stderr: 'No result returned' };
    } catch (e) {
      return { success: false, stderr: e.message };
    }
  }

  /**
   * Get direct download URL for a file
   */
  static getDownloadUrl(sessionId, filePath) {
    return `${API_BASE_URL}/api/agent/file/download?sessionId=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(filePath)}`;
  }

  /**
   * Get full ZIP download URL for the entire project in sandbox
   */
  static getZipDownloadUrl(sessionId) {
    return `${API_BASE_URL}/api/agent/download-zip?sessionId=${encodeURIComponent(sessionId)}`;
  }

  /**
   * Get direct screenshot URL for session
   */
  static getScreenshotUrl(sessionId) {
    return `${API_BASE_URL}/api/agent/screenshot/${encodeURIComponent(sessionId)}`;
  }

  /**
   * Get raw file URL for previewing image/chart inline
   */
  static getRawFileUrl(sessionId, filePath) {
    return `${API_BASE_URL}/api/agent/file/raw?sessionId=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(filePath)}`;
  }

  /**
   * Upload user file directly to sandbox session
   */
  static async uploadFile(sessionId, file) {
    try {
      const filename = file.name;
      const isText = file.type.startsWith('text/') || /\.(html|css|js|jsx|ts|tsx|py|json|md|txt|sql|env|csv|xml|yaml|yml)$/i.test(filename);

      let payload = { sessionId, filename };

      if (isText) {
        const text = await file.text();
        payload.content = text;
      } else {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        payload.base64 = btoa(binary);
      }

      const res = await fetch(`${API_BASE_URL}/api/agent/upload`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Upload failed');
      return await res.json();
    } catch (e) {
      console.warn('[AgentService] Upload error:', e);
      return null;
    }
  }

  /**
   * Run autonomous agent task with real-time SSE streaming for Chain-of-Work
   */
  static async runTask({
    sessionId,
    prompt,
    model = 'deepernova-gold-1.5',
    history = [],
    effort = 'high',
    signal,
    onDelta,
    onReasoning,
    onFilesUpdate,
    onSkillActive,
    onStep,
    onStepUpdate,
    onDone,
    onError
  }) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/run`, {
        method: 'POST',
        credentials: 'include',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': getDeviceId()
        },
        body: JSON.stringify({
          sessionId,
          prompt,
          model,
          history,
          effort
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server returned ${res.status}: ${errText}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // Keep incomplete chunk in buffer

        for (const block of lines) {
          const trimmed = block.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          let eventType = 'message';
          let eventData = '';

          const blockLines = trimmed.split('\n');
          for (const line of blockLines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              eventData = line.slice(6).trim();
            }
          }

          if (eventData) {
            try {
              const parsed = JSON.parse(eventData);
              if (eventType === 'delta' && onDelta) {
                onDelta(parsed.content || '');
              } else if (eventType === 'reasoning' && onReasoning) {
                onReasoning(parsed.text || parsed.content || parsed.full || '');
              } else if (eventType === 'files_update' && onFilesUpdate) {
                onFilesUpdate(parsed.files || []);
              } else if (eventType === 'skill_active' && onSkillActive) {
                onSkillActive(parsed);
              } else if (eventType === 'step' && onStep) {
                onStep(parsed);
              } else if (eventType === 'step_update' && onStepUpdate) {
                onStepUpdate(parsed);
              } else if (eventType === 'done' && onDone) {
                onDone(parsed);
              } else if (eventType === 'error' && onError) {
                onError(parsed);
              }
            } catch (_jsonErr) {}
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (onError) onError({ error: err.message });
    }
  }
}

export default AgentService;
