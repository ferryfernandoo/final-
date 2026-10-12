/**
 * Agent Cross-Session Memory Service
 * Implements Claude AI Agent persistent memory architecture:
 * 1. Semantic Memory: Persistent user profile, preferences, and facts.
 * 2. Episodic Memory: Cross-session history, past conversation summaries, and generated deliverables.
 * 3. Continuous Learning / Dreaming: Auto-extracts memory facts and project outcomes after every turn.
 */

import { v4 as uuidv4 } from 'uuid';
import { db, memoryDb, globalMemoryDb, userDb, agentSessionDb, agentMessageDb } from '../database.js';
import agentSandboxService from './agentSandboxService.js';

class AgentMemoryService {
  /**
   * Build the complete cross-session memory context to inject into the system prompt.
   * @param {string} userId - User identifier (authenticated ID or guest)
   * @param {string} currentSessionId - Current active session ID (to avoid duplicating current turn)
   * @returns {string} Formatted cross-session memory markdown block
   */
  static buildCrossSessionContext(userId, currentSessionId = '') {
    try {
      if (!userId) return '';

      // 1. Fetch User Identity
      let userName = '';
      let userEmail = '';
      try {
        const user = userDb.findById(userId);
        if (user) {
          userName = user.name || '';
          userEmail = user.email || '';
        }
      } catch (_) {}

      // 2. Fetch User Global Memory (synthesized profile)
      let globalMemText = '';
      try {
        const gMem = globalMemoryDb.get(userId);
        if (gMem && gMem.globalMemory) {
          globalMemText = gMem.globalMemory.trim();
        }
      } catch (_) {}

      // 3. Fetch Long-Term Memory entries
      let discreteMemories = [];
      try {
        discreteMemories = memoryDb.findByUser(userId, 15) || [];
      } catch (_) {}

      // 4. Fetch Cross-Session History (All previous agent sessions for this user)
      let pastSessions = [];
      try {
        const allSessions = agentSessionDb.findByUser(userId) || [];
        pastSessions = allSessions.filter(s => s.id !== currentSessionId).slice(0, 8);
      } catch (_) {}

      const sessionSummaries = [];
      for (const session of pastSessions) {
        try {
          const msgs = agentMessageDb.findBySession(session.id) || [];
          if (msgs.length === 0) continue;

          const firstUserMsg = msgs.find(m => m.role === 'user');
          const lastBotMsg = [...msgs].reverse().find(m => m.role === 'assistant');

          // Extract files produced in this session
          let sessionFiles = [];
          for (const m of msgs) {
            if (m.sandboxFiles && Array.isArray(m.sandboxFiles)) {
              for (const f of m.sandboxFiles) {
                if (f.name && f.name !== 'SKILL.md' && !f.name.startsWith('_runner_temp')) {
                  if (!sessionFiles.some(sf => sf.name === f.name)) {
                    sessionFiles.push(f);
                  }
                }
              }
            }
          }

          // If no files recorded in messages, check disk
          if (sessionFiles.length === 0) {
            try {
              const diskFiles = agentSandboxService.listFiles(session.id);
              sessionFiles = (diskFiles || []).filter(f => 
                f.name !== 'SKILL.md' && !f.name.startsWith('_runner_temp') && !f.ext.endsWith('pyc')
              );
            } catch (_) {}
          }

          const fileSummary = sessionFiles.map(f => `${f.name} (${f.ext.toUpperCase()})`).join(', ') || 'Diskusi / Konsultasi';
          const promptExcerpt = firstUserMsg ? firstUserMsg.content.slice(0, 90).replace(/[\r\n]+/g, ' ') : '';
          const lastAnswerExcerpt = lastBotMsg 
            ? lastBotMsg.content
                .replace(/<action_pill[\s\S]*?<\/action_pill>/gi, '')
                .replace(/<[^>]+>/g, '')
                .slice(0, 120)
                .replace(/[\r\n]+/g, ' ')
                .trim()
            : '';

          const dateStr = session.updatedAt ? new Date(session.updatedAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }) : '';

          sessionSummaries.push(
            `• Sesi "${session.title || promptExcerpt || 'Tugas AI'}" (${dateStr}):\n` +
            `  - Topik Permintaan: "${promptExcerpt || session.title}"\n` +
            `  - Berkas Dihasilkan: ${fileSummary}\n` +
            (lastAnswerExcerpt ? `  - Hasil Akhir: ${lastAnswerExcerpt}\n` : '')
          );
        } catch (_) {}
      }

      // Check if we have anything to report
      if (!userName && !globalMemText && discreteMemories.length === 0 && sessionSummaries.length === 0) {
        return '';
      }

      // Build formatted section
      let md = `\n=== MEMORI PERSISTEN LINTAS SESI (CLAUDE AGENT PERSISTENT MEMORY) ===\n`;
      md += `Anda memiliki kesadaran memori persisten lintas sesi (seperti Claude AI). Anda dapat mengingat preferensi pengguna, obrolan sebelumnya, dan berkas/proyek yang pernah dibuat di SEMUA sesi lain pengguna ini.\n\n`;

      if (userName || userEmail) {
        md += `[PROFIL & IDENTITAS PENGGUNA]:\n`;
        if (userName) md += `- Nama Pengguna: ${userName}\n`;
        if (userEmail) md += `- Email Pengguna: ${userEmail}\n`;
      }

      if (globalMemText) {
        md += `\n[RINGKASAN GLOBAL MEMORI]:\n${globalMemText}\n`;
      }

      if (discreteMemories.length > 0) {
        md += `\n[FAKTA & PREFERENSI TERSIMPAN]:\n`;
        for (const mem of discreteMemories.slice(0, 10)) {
          md += `- [${mem.category || 'Umum'}]: ${mem.summary}\n`;
        }
      }

      if (sessionSummaries.length > 0) {
        md += `\n[RIWAYAT OBROLAN & PROYEK LINTAS SESI SEBELUMNYA]:\n`;
        md += sessionSummaries.join('\n') + '\n';
      }

      md += `\nPANDUAN PENGGUNAAN MEMORI:\n`;
      md += `1. Jika pengguna menanyakan tentang diri mereka ("siapa nama saya?", "kamu ingat saya?"), gunakan data profil di atas.\n`;
      md += `2. Jika pengguna menanyakan obrolan sebelumnya atau berkas dari sesi lain ("kamu ingat kemarin saya minta file apa?", "apa saja yang sudah kita buat?", "lanjutkan proyek sebelumnya"), jawablah secara akurat dan ramah berdasarkan riwayat lintas sesi di atas.\n`;
      md += `3. JANGAN mengulang atau membaca seluruh memori jika tidak ditanyakan; gunakan memori ini secara alami untuk memberikan pengalaman yang konsisten dan cerdas bagi pengguna.\n`;

      return md;
    } catch (err) {
      console.warn('[AgentMemoryService] Error building cross-session context:', err.message);
      return '';
    }
  }

  /**
   * Automatically extracts and saves memory facts after an agent turn finishes.
   * Runs non-blockingly.
   */
  static async rememberTurn(userId, sessionId, userPrompt = '', assistantContent = '', filesCreated = [], reasoning = '') {
    try {
      if (!userId || !userPrompt) return;

      const pLower = userPrompt.toLowerCase();
      const existingMemories = memoryDb.findByUser(userId, 50) || [];
      const existingTexts = new Set(existingMemories.map(m => m.summary.toLowerCase()));

      // 1. Record newly created files in this session
      if (filesCreated && filesCreated.length > 0) {
        for (const file of filesCreated) {
          const fileSummary = `Membuat berkas ${file.name} (${file.ext.toUpperCase()}) untuk permintaan: "${userPrompt.slice(0, 80)}"`;
          if (!existingTexts.has(fileSummary.toLowerCase())) {
            memoryDb.create(
              uuidv4(),
              userId,
              fileSummary,
              'Berkas & Proyek',
              sessionId
            );
            existingTexts.add(fileSummary.toLowerCase());
          }
        }
      }

      // 2. Extract User Identity (Indonesian & English)
      const namePatterns = [
        /(?:nama saya|panggil saya|nama ku|namaku|i am|my name is)\s+([a-zA-Z\s]{2,30})/i,
        /(?:saya|aku)\s+(?:bernama|dipanggil)\s+([a-zA-Z\s]{2,30})/i
      ];
      for (const pat of namePatterns) {
        const match = userPrompt.match(pat);
        if (match && match[1]) {
          const rawName = match[1].trim().replace(/[.,!?].*$/, '');
          if (rawName.length >= 2 && rawName.length <= 30 && !['bukan', 'tidak', 'mau', 'ingin', 'bisa'].includes(rawName.toLowerCase())) {
            const summary = `Nama pengguna adalah ${rawName}`;
            if (!existingTexts.has(summary.toLowerCase())) {
              memoryDb.create(uuidv4(), userId, summary, 'Identitas', sessionId);
              existingTexts.add(summary.toLowerCase());
            }
          }
        }
      }

      // 3. Extract Preferences (Indonesian & English)
      const prefPatterns = [
        /(?:saya suka|saya lebih suka|preferensi saya|saya menyukai|i like|i prefer)\s+([^.,!?\n]{3,80})/i,
        /(?:jangan gunakan|saya tidak suka|hindari|i dislike|avoid)\s+([^.,!?\n]{3,80})/i
      ];
      for (const pat of prefPatterns) {
        const match = userPrompt.match(pat);
        if (match && match[1]) {
          const pref = match[1].trim();
          const summary = `Preferensi pengguna: ${pref}`;
          if (!existingTexts.has(summary.toLowerCase())) {
            memoryDb.create(uuidv4(), userId, summary, 'Preferensi', sessionId);
            existingTexts.add(summary.toLowerCase());
          }
        }
      }

      // 4. Extract Profession / Role
      const rolePatterns = [
        /(?:saya seorang|pekerjaan saya|profesi saya|saya kerja sebagai|i work as|i am a)\s+([a-zA-Z0-9\s]{3,50})/i
      ];
      for (const pat of rolePatterns) {
        const match = userPrompt.match(pat);
        if (match && match[1]) {
          const role = match[1].trim();
          const summary = `Profesi/peran pengguna: ${role}`;
          if (!existingTexts.has(summary.toLowerCase())) {
            memoryDb.create(uuidv4(), userId, summary, 'Peran & Profesi', sessionId);
            existingTexts.add(summary.toLowerCase());
          }
        }
      }

      // 5. Update Global Memory Profile
      const recentMemories = memoryDb.findByUser(userId, 8) || [];
      if (recentMemories.length > 0) {
        const memoryLines = recentMemories.map(m => `- ${m.summary}`).join('\n');
        globalMemoryDb.update(userId, memoryLines);
      }

      // 6. Smart Session Title Auto-Update if currently generic
      try {
        const session = agentSessionDb.findById(sessionId);
        if (session && (!session.title || session.title.includes('Tugas Otonom') || session.title.startsWith('user_'))) {
          const cleanTitle = userPrompt
            .replace(/[^\w\s-]/gi, '')
            .slice(0, 35)
            .trim();
          if (cleanTitle) {
            agentSessionDb.update(sessionId, cleanTitle);
          }
        }
      } catch (_) {}

    } catch (err) {
      console.warn('[AgentMemoryService] Error in rememberTurn:', err.message);
    }
  }
}

export default AgentMemoryService;
