import express from 'express';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import JSZip from 'jszip';
import agentSandboxService, { DEFAULT_SKILL_MD, extractSequentialActions, getRelevantDeliverables } from '../services/agentSandboxService.js';
import agentScreenshotService from '../services/agentScreenshotService.js';
import agentMemoryService from '../services/agentMemoryService.js';
import { agentSessionDb, agentMessageDb } from '../database.js';
import { TOKENMIX_API_KEYS, TOKENMIX_CHAT_API_URL, getEffectiveTokenMixKeys, apiProxyService } from '../apiProxyService.js';
import webSearchService from '../webSearchService.js';
import agentSkillService from '../services/agentSkillService.js';

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const router = express.Router();

function getUserId(req) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return req.user.id;
  }
  return req.user?.id || req.session?.userId || req.headers['x-device-id'] || 'guest_agent_user';
}

// ============================================================================
// 1. SESSIONS MANAGEMENT
// ============================================================================

// GET /api/agent/sessions - List all agent sessions for user
router.get('/sessions', (req, res) => {
  try {
    const userId = getUserId(req);
    const sessions = agentSessionDb.findByUser(userId);
    res.json({ success: true, sessions });
  } catch (err) {
    console.error('[AGENT_ROUTES] Error listing sessions:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/agent/sessions - Create new agent session
router.post('/sessions', (req, res) => {
  try {
    const userId = getUserId(req);
    const id = req.body.id || `agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const title = req.body.title || 'Tugas Otonom AI';

    const session = agentSessionDb.create(id, userId, title);
    // Initialize sandbox folder & SKILL.md
    agentSandboxService.getSandboxDir(id);

    res.json({ success: true, session });
  } catch (err) {
    console.error('[AGENT_ROUTES] Error creating session:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/agent/sessions/:sessionId - Delete agent session
router.delete('/sessions/:sessionId', (req, res) => {
  try {
    const userId = getUserId(req);
    const { sessionId } = req.params;

    agentSessionDb.delete(sessionId, userId);
    // Clean up sandbox files
    try {
      const dir = agentSandboxService.getSandboxDir(sessionId);
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch (_cleanupErr) {}

    res.json({ success: true });
  } catch (err) {
    console.error('[AGENT_ROUTES] Error deleting session:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 2. MESSAGES & CHAIN-OF-WORK
// ============================================================================

// GET /api/agent/messages - Get messages with chain of work for a session
router.get('/messages', (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId diperlukan' });
    }
    const messages = agentMessageDb.findBySession(sessionId);
    res.json({ success: true, messages });
  } catch (err) {
    console.error('[AGENT_ROUTES] Error fetching messages:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 3. SANDBOX FILES & PREVIEW
// ============================================================================

// GET /api/agent/files - List files in sandbox
router.get('/files', (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId diperlukan' });
    }
    const files = agentSandboxService.listFiles(sessionId);
    res.json({ success: true, files });
  } catch (err) {
    console.error('[AGENT_ROUTES] Error listing files:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/agent/file/write - Write/edit a file in sandbox
router.post('/file/write', (req, res) => {
  try {
    const { sessionId, path: filePath, content } = req.body;
    if (!sessionId || !filePath) {
      return res.status(400).json({ success: false, error: 'sessionId dan path diperlukan' });
    }
    const file = agentSandboxService.writeFile(sessionId, filePath, content);
    const files = agentSandboxService.listFiles(sessionId);
    res.json({ success: true, file, files });
  } catch (err) {
    console.error('[AGENT_ROUTES] Error writing file:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/agent/file/read - Read file content
router.get('/file/read', (req, res) => {
  try {
    const { sessionId, path: filePath } = req.query;
    if (!sessionId || !filePath) {
      return res.status(400).json({ success: false, error: 'sessionId dan path diperlukan' });
    }
    const content = agentSandboxService.readFile(sessionId, filePath);
    res.json({ success: true, content });
  } catch (err) {
    console.error('[AGENT_ROUTES] Error reading file:', err);
    res.status(404).json({ success: false, error: err.message });
  }
});

// DELETE /api/agent/file - Delete file from sandbox
router.delete('/file', (req, res) => {
  try {
    const { sessionId, path: filePath } = req.body;
    if (!sessionId || !filePath) {
      return res.status(400).json({ success: false, error: 'sessionId dan path diperlukan' });
    }
    agentSandboxService.deleteFile(sessionId, filePath);
    const files = agentSandboxService.listFiles(sessionId);
    res.json({ success: true, files });
  } catch (err) {
    console.error('[AGENT_ROUTES] Error deleting file:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/agent/file/download - Direct file download for individual created files
router.get('/file/download', (req, res) => {
  try {
    const { sessionId, path: relativePath } = req.query;
    if (!sessionId || !relativePath) {
      return res.status(400).send('sessionId dan path diperlukan');
    }
    const fullPath = agentSandboxService.safeResolvePath(sessionId, relativePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).send('File tidak ditemukan di sandbox');
    }
    const filename = path.basename(fullPath);
    res.download(fullPath, filename);
  } catch (err) {
    console.error('[AGENT_ROUTES] Download error:', err);
    res.status(500).send(err.message);
  }
});

// GET /api/agent/file/raw - Inline raw file display (for images, charts, and preview)
router.get('/file/raw', (req, res) => {
  try {
    const { sessionId, path: relativePath } = req.query;
    if (!sessionId || !relativePath) {
      return res.status(400).send('sessionId dan path diperlukan');
    }
    const fullPath = agentSandboxService.safeResolvePath(sessionId, relativePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).send('File tidak ditemukan di sandbox');
    }
    res.sendFile(fullPath);
  } catch (err) {
    console.error('[AGENT_ROUTES] Raw file error:', err);
    res.status(500).send(err.message);
  }
});

// GET /api/agent/download-zip - Bundle all files in sandbox into a ZIP
router.get('/download-zip', async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).send('sessionId diperlukan');
    }
    const sandboxDir = agentSandboxService.getSandboxDir(sessionId);
    const files = agentSandboxService.listFiles(sessionId);

    const zip = new JSZip();
    for (const f of files) {
      if (f.name.startsWith('_runner_temp')) continue;
      const fullPath = path.join(sandboxDir, f.path);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath);
        zip.file(f.path, content);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="deepernova-project-${sessionId.slice(-6)}.zip"`);
    res.send(zipBuffer);
  } catch (err) {
    console.error('[AGENT_ROUTES] Download zip error:', err);
    res.status(500).send(err.message);
  }
});

// POST /api/agent/upload - Upload user file directly to sandbox session
router.post('/upload', (req, res) => {
  try {
    const { sessionId, filename, content, base64 } = req.body;
    if (!sessionId || !filename) {
      return res.status(400).json({ success: false, error: 'sessionId dan filename diperlukan' });
    }
    let fileBuffer;
    if (base64) {
      fileBuffer = Buffer.from(base64, 'base64');
    } else {
      fileBuffer = Buffer.from(content || '', 'utf8');
    }
    const targetPath = agentSandboxService.safeResolvePath(sessionId, filename);
    fs.writeFileSync(targetPath, fileBuffer);
    const files = agentSandboxService.listFiles(sessionId);
    res.json({ success: true, files, filename });
  } catch (err) {
    console.error('[AGENT_ROUTES] Upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/agent/execute - Run code or terminal command in sandbox
router.post('/execute', async (req, res) => {
  try {
    const { sessionId, language, code, command, timeoutMs, task, userId } = req.body;
    
    // Support high-level async task execution (from ChatBot.jsx or background workers)
    if (task && !code && !command) {
      const actualSessionId = sessionId || `agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const actualUserId = userId || getUserId(req);
      agentSessionDb.create(actualSessionId, actualUserId, task.slice(0, 45));
      
      // Initialize sandbox with kits and evaluated skill
      agentSandboxService.getSandboxDir(actualSessionId);
      const skillEval = agentSkillService.evaluateSkillRequirement(task);
      const targetSkill = skillEval.requiresSkill ? skillEval.selectedSkill : null;
      if (targetSkill) {
        agentSandboxService.writeFile(actualSessionId, 'SKILL.md', targetSkill.content || '');
      }

      // Check existing/target deliverables in sandbox
      const files = agentSandboxService.listFiles(actualSessionId);
      const docFile = files.find(f => ['docx', 'pptx', 'xlsx', 'pdf'].includes(f.ext));
      
      return res.json({
        success: true,
        sessionId: actualSessionId,
        fileName: docFile ? docFile.name : null,
        downloadUrl: docFile ? `/api/agent/download/${actualSessionId}/${encodeURIComponent(docFile.name)}` : null,
        files: files
      });
    }

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId diperlukan' });
    }
    const result = await agentSandboxService.executeInSandbox(sessionId, {
      language: language || 'node',
      code: code || '',
      command: command || '',
      timeoutMs: timeoutMs || 15000
    });
    res.json({ success: true, result });
  } catch (err) {
    console.error('[AGENT_ROUTES] Error executing code:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/agent/download/:sessionId/:fileName - Direct download generated deliverable from sandbox
router.get('/download/:sessionId/:fileName', (req, res) => {
  try {
    const { sessionId, fileName } = req.params;
    const filePath = agentSandboxService.safeResolvePath(sessionId, fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File tidak ditemukan di sandbox' });
    }
    const ext = path.extname(fileName).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext === '.xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (ext === '.pptx') contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    else if (ext === '.pdf') contentType = 'application/pdf';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.sendFile(filePath);
  } catch (err) {
    console.error('[AGENT_ROUTES] Download error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agent/preview/:sessionId/* - Live render HTML/CSS/JS web project from sandbox
router.get('/preview/:sessionId/*', (req, res) => {
  try {
    const { sessionId } = req.params;
    const requestedFile = req.params[0] || 'index.html';
    const filePath = agentSandboxService.safeResolvePath(sessionId, requestedFile);

    if (!fs.existsSync(filePath)) {
      // If index.html requested but not found, try to find any .html file
      if (requestedFile === 'index.html' || requestedFile === '') {
        const files = agentSandboxService.listFiles(sessionId);
        const anyHtml = files.find(f => f.ext === 'html');
        if (anyHtml) {
          const altPath = agentSandboxService.safeResolvePath(sessionId, anyHtml.path);
          return res.sendFile(altPath);
        }
      }
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <body style="font-family: system-ui, sans-serif; background: #0f172a; color: #94a3b8; display: flex; align-items: center; justify-content: center; height: 90vh; text-align: center; margin: 0;">
            <div>
              <div style="font-size: 40px; margin-bottom: 12px;">🌐</div>
              <h3 style="color: #f8fafc; margin-bottom: 8px;">Belum Ada Berkas Web</h3>
              <p style="max-width: 400px; font-size: 14px; line-height: 1.5;">Mintalah Deepernova AI Agent untuk membuat berkas <code>index.html</code> atau aplikasi web untuk melihat live preview di sini.</p>
            </div>
          </body>
        </html>
      `);
    }

    res.sendFile(filePath);
  } catch (err) {
    res.status(500).send(`Error loading preview: ${err.message}`);
  }
});

// GET /api/agent/screenshot/:sessionId - Direct live rendered screenshot PNG
router.get('/screenshot/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const visual = await agentScreenshotService.getSessionVisualPreview(sessionId);
    if (!visual) {
      return res.status(404).send('Belum ada tangkapan layar untuk sesi ini.');
    }
    const fullPath = agentSandboxService.safeResolvePath(sessionId, visual.filename);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).send('Berkas tangkapan layar tidak ditemukan di disk.');
    }
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.sendFile(fullPath);
  } catch (err) {
    res.status(500).send(`Error loading screenshot: ${err.message}`);
  }
});

// ============================================================================
// 4. AUTONOMOUS AGENT RUN PIPELINE (LIVE STREAMING CHAIN-OF-WORK)
// ============================================================================

// Helper to execute single sandbox action item and generate action_pill XML
async function executeActionItem(action, sessionId, addStep, updateLastStep, emitEvent = null) {
  const actionId = `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  let pillXml = '';
  let observation = '';

  if (action.type === 'thought') {
    addStep('thought', 'Catatan Berpikir Agent', action.content, 'completed');
    pillXml = `<action_pill id="${actionId}" type="thought" title="Catatan Berpikir AI" status="completed">${escapeXml(action.content)}</action_pill>`;
    observation = action.content || '';
  } else if (action.type === 'read_file' || action.type === 'read') {
    const targetPath = action.path || 'SKILL.md';
    addStep('read', `Membaca: ${targetPath}`, `Membaca berkas '${targetPath}' dari workspace...`, 'running');
    try {
      const content = agentSandboxService.readFile(sessionId, targetPath);
      const previewContent = content.length > 2500 ? content.slice(0, 2500) + '\n... (konten dipotong)' : content;
      updateLastStep('completed', `Berhasil membaca '${targetPath}' (${content.length} karakter).`, { content: previewContent });
      pillXml = `<action_pill id="${actionId}" type="read" title="Membaca ${targetPath}" meta="${targetPath}" status="completed">${escapeXml(previewContent)}</action_pill>`;
      observation = `Isi berkas '${targetPath}':\n${content.length > 3500 ? content.slice(0, 3500) + '\n... [dipotong]' : content}`;
    } catch (readErr) {
      updateLastStep('failed', `Gagal membaca berkas: ${readErr.message}`);
      pillXml = `<action_pill id="${actionId}" type="read" title="Gagal Membaca ${targetPath}" meta="${targetPath}" status="failed">${escapeXml(readErr.message)}</action_pill>`;
      observation = `Gagal membaca berkas '${targetPath}': ${readErr.message}`;
    }
  } else if (action.type === 'read_skill') {
    const skillName = action.name || '00-MASTER-AGENTIC-STEPPING-OS';
    addStep('skill', `Membaca Buku Skill: ${skillName}`, `Membuka buku panduan spesialis '${skillName}' dari perpustakaan skill...`, 'running');
    try {
      const skill = agentSkillService.readSkill(skillName);
      if (skill.found) {
        updateLastStep('completed', `Buku panduan '${skill.title}' (${skill.file}) berhasil dibaca & dipelajari.`, {
          skillId: skill.id,
          skillFile: skill.file,
          skillTitle: skill.title,
          category: skill.category
        });
        if (typeof emitEvent === 'function') {
          emitEvent('skill_active', {
            id: skill.id,
            file: skill.file,
            title: skill.title,
            category: skill.category,
            summary: skill.summary || ''
          });
        }
        try {
          agentSandboxService.writeFile(sessionId, 'SKILL.md', skill.content || '');
        } catch (_wErr) {}
        const preview = (skill.summary || skill.content.slice(0, 300)) + '...';
        pillXml = `<action_pill id="${actionId}" type="skill" title="${escapeXml(skill.title)}" meta="${escapeXml(skill.file || skill.id)}" status="completed">${escapeXml(preview)}</action_pill>`;
        observation = `[BUKU PANDUAN SKILL WAJIB DIIKUTI: ${skill.file} - "${skill.title}"]:\n${skill.content}\n\n[INSTRUKSI MUTLAK]: Anda WAJIB berpegang teguh pada seluruh pedoman, rumus, palet warna, dan aturan anti-error di atas. DILARANG mengarang sendiri!`;
      } else {
        updateLastStep('failed', skill.error);
        pillXml = `<action_pill id="${actionId}" type="skill" title="Skill Tidak Ditemukan" meta="${skillName}" status="failed">${escapeXml(skill.error)}</action_pill>`;
        observation = skill.error;
      }
    } catch (err) {
      updateLastStep('failed', err.message);
      pillXml = `<action_pill id="${actionId}" type="skill" title="Gagal Membaca Skill" meta="${skillName}" status="failed">${escapeXml(err.message)}</action_pill>`;
      observation = `Gagal membaca skill '${skillName}': ${err.message}`;
    }
  } else if (action.type === 'search_skill') {
    const query = action.query || '';
    addStep('skill', `Pencarian Skill: ${query}`, `Mencari katalog skill profesional untuk '${query}'...`, 'running');
    try {
      const matches = agentSkillService.searchSkills(query);
      const matchSummary = matches.map(m => `- \`${m.id}\`: ${m.title} (${m.category}) - Kata Kunci: ${m.keywords.join(', ')}`).join('\n');
      updateLastStep('completed', `Ditemukan ${matches.length} skill relevan.`);
      pillXml = `<action_pill id="${actionId}" type="skill" title="Pencarian Skill: ${query}" meta="${query}" status="completed">${escapeXml(matchSummary)}</action_pill>`;
      observation = `Hasil pencarian skill untuk "${query}":\n${matchSummary}\n\nGunakan <read_skill name="id-skill" /> untuk membaca panduan lengkapnya.`;
    } catch (err) {
      updateLastStep('failed', err.message);
      pillXml = `<action_pill id="${actionId}" type="skill" title="Pencarian Skill Gagal" meta="${query}" status="failed">${escapeXml(err.message)}</action_pill>`;
      observation = `Gagal mencari skill: ${err.message}`;
    }
  } else if (action.type === 'search_web' || action.type === 'search') {
    const query = action.query || 'referensi';
    addStep('search', `Deepernova Search: ${query}`, `Melakukan penelusuran live di Deepernova Search Engine untuk '${query}'...`, 'running');
    try {
      const searchRes = await webSearchService.searchGoogle(query, 5);
      let summary = '';
      if (searchRes.success && searchRes.results && searchRes.results.length > 0) {
        summary = searchRes.results.map((r, rIdx) => `${rIdx + 1}. ${r.title}\n   ${r.snippet}\n   URL: ${r.url}`).join('\n\n');
        observation = searchRes.ai_context || webSearchService.formatSearchResultsForPrompt(searchRes.results);
        updateLastStep('completed', `Ditemukan ${searchRes.results.length} referensi data terverifikasi dari Deepernova Search Engine.`, { results: searchRes.results });
      } else {
        summary = 'Pencarian Deepernova Search selesai.';
        observation = `Pencarian Deepernova Search untuk query "${query}" tidak menemukan hasil spesifik.`;
        updateLastStep('completed', summary);
      }
      pillXml = `<action_pill id="${actionId}" type="search" title="Deepernova Search: ${query}" meta="${query}" status="completed">${escapeXml(summary)}</action_pill>`;
    } catch (searchErr) {
      updateLastStep('failed', `Pencarian Deepernova Search terhambat: ${searchErr.message}`);
      pillXml = `<action_pill id="${actionId}" type="search" title="Deepernova Search: ${query}" meta="${query}" status="completed">${escapeXml('Pencarian selesai.')}</action_pill>`;
      observation = `Gagal melakukan pencarian Deepernova Search: ${searchErr.message}`;
    }
  } else if (action.type === 'write_file' || action.type === 'file') {
    const targetPath = action.path || 'script.js';
    addStep('file_write', `Menulis Berkas: ${targetPath}`, `Menulis isi berkas (${action.content ? action.content.length : 0} karakter)...`, 'running');
    try {
      const written = agentSandboxService.writeFile(sessionId, targetPath, action.content || '');
      updateLastStep('completed', `Berkas '${written.path}' berhasil dibuat/diperbarui (${(written.size / 1024).toFixed(2)} KB).`, { filePath: written.path });
      pillXml = `<action_pill id="${actionId}" type="write" title="Menulis Berkas: ${targetPath}" meta="${targetPath}" status="completed">${escapeXml(action.content || '')}</action_pill>`;
      observation = `Berkas '${targetPath}' berhasil ditulis (${(written.size / 1024).toFixed(2)} KB).`;
    } catch (writeErr) {
      updateLastStep('failed', `Gagal menulis berkas: ${writeErr.message}`);
      pillXml = `<action_pill id="${actionId}" type="write" title="Gagal Menulis ${targetPath}" meta="${targetPath}" status="failed">${escapeXml(writeErr.message)}</action_pill>`;
      observation = `Gagal menulis berkas '${targetPath}': ${writeErr.message}`;
    }
  } else if (action.type === 'execute_code' || action.type === 'run_code') {
    const lang = action.language || 'python';
    addStep('execute', `Mengeksekusi Kode (${lang})`, 'Menjalankan kode di dalam jailed sandbox...', 'running');
    try {
      const execRes = await agentSandboxService.executeInSandbox(sessionId, {
        language: lang,
        code: action.code
      });
      const detail = execRes.stdout ? `Output:\n${execRes.stdout}` : (execRes.stderr ? `Error:\n${execRes.stderr}` : 'Eksekusi selesai tanpa output.');
      updateLastStep(execRes.success ? 'completed' : 'failed', detail, {
        stdout: execRes.stdout,
        stderr: execRes.stderr,
        executionTimeMs: execRes.executionTimeMs
      });
      pillXml = `<action_pill id="${actionId}" type="execute" title="Mengeksekusi Kode (${lang})" meta="${lang}" status="${execRes.success ? 'completed' : 'failed'}">${escapeXml(detail)}</action_pill>`;
      observation = `Hasil eksekusi kode (${lang}):\n${execRes.stdout ? 'STDOUT:\n' + execRes.stdout : ''}${execRes.stderr ? '\nSTDERR:\n' + execRes.stderr : ''}`;
    } catch (execErr) {
      updateLastStep('failed', `Gagal eksekusi: ${execErr.message}`);
      pillXml = `<action_pill id="${actionId}" type="execute" title="Eksekusi Gagal" meta="${lang}" status="failed">${escapeXml(execErr.message)}</action_pill>`;
      observation = `Gagal eksekusi kode (${lang}): ${execErr.message}`;
    }
  } else if (action.type === 'run_command' || action.type === 'command' || action.type === 'terminal') {
    let cmd = (action.command || '').trim();
    cmd = cmd.replace(/^```[a-zA-Z0-9_-]*\r?\n?/, '').replace(/\r?\n?```$/, '').trim();
    cmd = cmd.split(/\r?\n/).filter(line => !/^\s*```/.test(line)).join('\n').trim();
    addStep('command', `Perintah Terminal: ${cmd}`, 'Mengeksekusi command di sandbox...', 'running');
    try {
      const cmdRes = await agentSandboxService.executeInSandbox(sessionId, { command: cmd });
      const detail = cmdRes.stdout ? `Output:\n${cmdRes.stdout}` : (cmdRes.stderr ? `Error:\n${cmdRes.stderr}` : 'Selesai.');
      updateLastStep(cmdRes.success ? 'completed' : 'failed', detail, {
        stdout: cmdRes.stdout,
        stderr: cmdRes.stderr,
        executionTimeMs: cmdRes.executionTimeMs
      });
      pillXml = `<action_pill id="${actionId}" type="command" title="Perintah Terminal" meta="${cmd}" status="${cmdRes.success ? 'completed' : 'failed'}">${escapeXml(detail)}</action_pill>`;
      observation = `Output perintah terminal '${cmd}':\n${cmdRes.stdout ? 'STDOUT:\n' + cmdRes.stdout : ''}${cmdRes.stderr ? '\nSTDERR:\n' + cmdRes.stderr : ''}`;
    } catch (cmdErr) {
      updateLastStep('failed', `Gagal command: ${cmdErr.message}`);
      pillXml = `<action_pill id="${actionId}" type="command" title="Perintah Terminal Gagal" meta="${cmd}" status="failed">${escapeXml(cmdErr.message)}</action_pill>`;
      observation = `Gagal perintah terminal '${cmd}': ${cmdErr.message}`;
    }
  } else if (action.type === 'check_file' || action.type === 'verify_file') {
    const targetPath = action.path || '';
    addStep('check', `Memeriksa Berkas: ${targetPath}`, `Memverifikasi keberadaan '${targetPath}' di workspace...`, 'running');
    try {
      const fullPath = agentSandboxService.safeResolvePath(sessionId, targetPath);
      const exists = fs.existsSync(fullPath);
      let checkDetail = '';
      if (exists) {
        const stat = fs.statSync(fullPath);
        checkDetail = `Berkas '${targetPath}' ditemukan (${(stat.size / 1024).toFixed(1)} KB). Terverifikasi aman dan siap diunduh.`;
        updateLastStep('completed', checkDetail);
        pillXml = `<action_pill id="${actionId}" type="check" title="Memeriksa Berkas: ${targetPath}" meta="${targetPath}" status="completed">${escapeXml(checkDetail)}</action_pill>`;
      } else {
        checkDetail = `Berkas '${targetPath}' belum terdeteksi di workspace.`;
        updateLastStep('failed', checkDetail);
        pillXml = `<action_pill id="${actionId}" type="check" title="Berkas Belum Ada: ${targetPath}" meta="${targetPath}" status="failed">${escapeXml(checkDetail)}</action_pill>`;
      }
      observation = checkDetail;
    } catch (checkErr) {
      updateLastStep('failed', checkErr.message);
      pillXml = `<action_pill id="${actionId}" type="check" title="Pemeriksaan Berkas: ${targetPath}" meta="${targetPath}" status="failed">${escapeXml(checkErr.message)}</action_pill>`;
      observation = `Gagal memeriksa berkas '${targetPath}': ${checkErr.message}`;
    }
  } else if (action.type === 'delete_file' || action.type === 'remove_file' || action.type === 'delete') {
    const targetPath = action.path || '';
    addStep('file_delete', `Menghapus Berkas: ${targetPath}`, `Menghapus '${targetPath}' dari workspace sandbox...`, 'running');
    try {
      const deleted = agentSandboxService.deleteFile(sessionId, targetPath);
      if (deleted) {
        updateLastStep('completed', `Berkas '${targetPath}' berhasil dihapus.`);
        pillXml = `<action_pill id="${actionId}" type="delete" title="Menghapus Berkas: ${targetPath}" meta="${targetPath}" status="completed">Berkas '${targetPath}' berhasil dihapus dari workspace.</action_pill>`;
        observation = `Berkas '${targetPath}' telah berhasil dihapus dari sandbox.`;
      } else {
        updateLastStep('completed', `Berkas '${targetPath}' tidak ditemukan untuk dihapus.`);
        pillXml = `<action_pill id="${actionId}" type="delete" title="Berkas Tidak Ada: ${targetPath}" meta="${targetPath}" status="completed">Berkas tidak ditemukan.</action_pill>`;
        observation = `Berkas '${targetPath}' tidak ditemukan di sandbox.`;
      }
    } catch (delErr) {
      updateLastStep('failed', `Gagal menghapus berkas: ${delErr.message}`);
      pillXml = `<action_pill id="${actionId}" type="delete" title="Gagal Menghapus: ${targetPath}" meta="${targetPath}" status="failed">${escapeXml(delErr.message)}</action_pill>`;
      observation = `Gagal menghapus berkas '${targetPath}': ${delErr.message}`;
    }
  } else if (action.type === 'edit_file' || action.type === 'patch_file') {
    const targetPath = action.path || '';
    addStep('file_write', `Mengedit Berkas: ${targetPath}`, `Menerapkan perubahan isi berkas '${targetPath}'...`, 'running');
    try {
      const editRes = agentSandboxService.editFile(sessionId, targetPath, {
        target: action.target,
        replacement: action.replacement,
        content: action.content
      });
      updateLastStep('completed', `Berkas '${targetPath}' berhasil diedit (${(editRes.size / 1024).toFixed(1)} KB).`);
      pillXml = `<action_pill id="${actionId}" type="write" title="Mengedit Berkas: ${targetPath}" meta="${targetPath}" status="completed">${escapeXml(editRes.summary)}</action_pill>`;
      observation = `Berkas '${targetPath}' berhasil diedit (${(editRes.size / 1024).toFixed(1)} KB). ${editRes.summary}`;
    } catch (editErr) {
      updateLastStep('failed', `Gagal mengedit berkas: ${editErr.message}`);
      pillXml = `<action_pill id="${actionId}" type="write" title="Gagal Mengedit: ${targetPath}" meta="${targetPath}" status="failed">${escapeXml(editErr.message)}</action_pill>`;
      observation = `Gagal mengedit berkas '${targetPath}': ${editErr.message}`;
    }
  } else if (action.type === 'test_file' || action.type === 'validate_file') {
    const targetPath = action.path || '';
    addStep('check', `Menguji Berkas: ${targetPath}`, `Menjalankan uji sintaks dan integritas '${targetPath}'...`, 'running');
    try {
      const testRes = await agentSandboxService.testFile(sessionId, targetPath);
      updateLastStep(testRes.success ? 'completed' : 'failed', testRes.message, { detail: testRes.detail });
      pillXml = `<action_pill id="${actionId}" type="check" title="Uji Berkas: ${targetPath}" meta="${targetPath}" status="${testRes.success ? 'completed' : 'failed'}">${escapeXml(testRes.message + (testRes.detail ? '\n' + testRes.detail : ''))}</action_pill>`;
      observation = `Hasil uji berkas '${targetPath}':\n${testRes.success ? '✓ LULUS: ' + testRes.message : '✗ GAGAL: ' + testRes.message}\n${testRes.detail ? testRes.detail : ''}`;
    } catch (testErr) {
      updateLastStep('failed', `Gagal menguji berkas: ${testErr.message}`);
      pillXml = `<action_pill id="${actionId}" type="check" title="Uji Gagal: ${targetPath}" meta="${targetPath}" status="failed">${escapeXml(testErr.message)}</action_pill>`;
      observation = `Gagal menjalankan pengujian pada '${targetPath}': ${testErr.message}`;
    }
  } else if (action.type === 'send_file' || action.type === 'deliver_file' || action.type === 'resend_file') {
    const targetPath = action.path || '';
    addStep('file_write', `Kirim Ulang Berkas: ${targetPath}`, `Menyiapkan berkas '${targetPath}' sebagai deliverable utama...`, 'running');
    try {
      const fullPath = agentSandboxService.safeResolvePath(sessionId, targetPath);
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        const checkDetail = `Berkas '${targetPath}' (${(stat.size / 1024).toFixed(1)} KB) berhasil dikirim ulang ke kartu berkas pengguna.`;
        updateLastStep('completed', checkDetail);
        pillXml = `<action_pill id="${actionId}" type="write" title="Kirim Berkas: ${targetPath}" meta="${targetPath}" status="completed">${escapeXml(checkDetail)}</action_pill>`;
        observation = `Berkas '${targetPath}' berhasil ditandai dan dikirimkan sebagai deliverable utama.`;
      } else {
        throw new Error(`Berkas '${targetPath}' tidak ditemukan di sandbox.`);
      }
    } catch (sendErr) {
      updateLastStep('failed', `Gagal mengirim berkas: ${sendErr.message}`);
      pillXml = `<action_pill id="${actionId}" type="write" title="Gagal Kirim: ${targetPath}" meta="${targetPath}" status="failed">${escapeXml(sendErr.message)}</action_pill>`;
      observation = `Gagal mengirim berkas '${targetPath}': ${sendErr.message}`;
    }
  } else if (action.type === 'list_files' || action.type === 'dir') {
    addStep('read', 'Daftar Berkas Sandbox', 'Membaca seluruh berkas yang ada di workspace...', 'running');
    try {
      const files = agentSandboxService.listFiles(sessionId);
      const listSummary = files.map(f => `- ${f.path} (${(f.size / 1024).toFixed(1)} KB)`).join('\n') || 'Workspace sandbox masih kosong.';
      updateLastStep('completed', `Ditemukan ${files.length} berkas di sandbox.`);
      pillXml = `<action_pill id="${actionId}" type="read" title="Daftar Berkas Sandbox" meta="${files.length} berkas" status="completed">${escapeXml(listSummary)}</action_pill>`;
      observation = `Daftar berkas di sandbox saat ini:\n${listSummary}`;
    } catch (listErr) {
      updateLastStep('failed', `Gagal membaca berkas: ${listErr.message}`);
      pillXml = `<action_pill id="${actionId}" type="read" title="Gagal Daftar Berkas" meta="sandbox" status="failed">${escapeXml(listErr.message)}</action_pill>`;
      observation = `Gagal membaca daftar berkas: ${listErr.message}`;
    }
  } else if (action.type === 'screenshot' || action.type === 'take_screenshot') {
    let targetFile = (action.target || action.path || 'index.html').trim();
    if (!targetFile.endsWith('.html') && !targetFile.endsWith('.htm')) {
      const currentFiles = agentSandboxService.listFiles(sessionId);
      const htmlFile = currentFiles.find(f => f.ext === 'html');
      if (htmlFile) {
        targetFile = htmlFile.path;
      } else {
        return { pillXml: null, observation: '' };
      }
    }
    addStep('screenshot', `Mengambil Tangkapan Layar: ${targetFile}`, `Mengambil screenshot visual menggunakan browser engine...`, 'running');
    try {
      const ssRes = await agentScreenshotService.captureWebScreenshot(sessionId, targetFile, 'screenshot.png');
      if (ssRes.success) {
        updateLastStep('completed', `Tangkapan layar visual berhasil disimpan (${(ssRes.size / 1024).toFixed(1)} KB).`, {
          screenshotUrl: ssRes.url
        });
        pillXml = `<action_pill id="${actionId}" type="screenshot" title="Tangkapan Layar: ${targetFile}" meta="screenshot.png" status="completed">Tangkapan layar berhasil disimpan ke screenshot.png (${(ssRes.size / 1024).toFixed(1)} KB)</action_pill>`;
        observation = `Tangkapan layar ${targetFile} berhasil disimpan ke screenshot.png.`;
      } else {
        updateLastStep('failed', `Gagal mengambil tangkapan layar: ${ssRes.error}`);
        pillXml = `<action_pill id="${actionId}" type="screenshot" title="Screenshot Gagal" meta="${targetFile}" status="failed">${escapeXml(ssRes.error)}</action_pill>`;
        observation = `Gagal mengambil screenshot: ${ssRes.error}`;
      }
    } catch (ssErr) {
      updateLastStep('failed', ssErr.message);
      pillXml = `<action_pill id="${actionId}" type="screenshot" title="Screenshot Gagal" meta="${targetFile}" status="failed">${escapeXml(ssErr.message)}</action_pill>`;
      observation = `Gagal mengambil screenshot: ${ssErr.message}`;
    }
  } else if (action.type === 'preview') {
    const previewFile = action.entryFile || 'index.html';
    addStep('preview', 'Live Web Preview', `Entry point: ${previewFile}`, 'completed');
    pillXml = `<action_pill id="${actionId}" type="preview" title="Web Preview Siap" meta="${previewFile}" status="completed">Entry point: ${escapeXml(previewFile)}</action_pill>`;
    observation = `Web preview disiapkan untuk ${previewFile}.`;
  }

  return { pillXml, observation };
}

// Stream Action Parser to separate narrative text chunks from XML action tags
// Stream Action Parser to separate narrative text chunks from XML action tags & reasoning tags
function createStreamActionParser(callbacks) {
  let buffer = '';
  let activeThinkingTag = null;
  const KNOWN_TAGS = [
    'thinking', 'plan', 'thought', 'think', 'reasoning',
    'read_skill', 'search_skill', 'read_file', 'read',
    'edit_file', 'patch_file', 'delete_file', 'remove_file', 'delete',
    'test_file', 'validate_file', 'send_file', 'deliver_file', 'resend_file',
    'list_files', 'dir',
    'search_web', 'search', 'run_command', 'command', 'terminal',
    'write_file', 'file', 'execute_code', 'run_code', 'check_file', 'verify_file',
    'preview', 'screenshot', 'take_screenshot'
  ];
  let queue = Promise.resolve();

  async function processChunk(chunk) {
    buffer += chunk;

    while (buffer.length > 0) {
      // 1. If currently inside a thinking/reasoning tag, stream inner tokens progressively!
      if (activeThinkingTag) {
        const closeTag = `</${activeThinkingTag}>`;
        const closeIdx = buffer.indexOf(closeTag);
        if (closeIdx !== -1) {
          const thinkText = buffer.slice(0, closeIdx);
          if (thinkText && callbacks.onThinking) await callbacks.onThinking(thinkText);
          buffer = buffer.slice(closeIdx + closeTag.length);
          activeThinkingTag = null;
          continue;
        } else {
          // Stream safe chunk while retaining enough chars for a potential partial closing tag
          const safeLen = Math.max(0, buffer.length - (closeTag.length + 2));
          if (safeLen > 0) {
            const safeChunk = buffer.slice(0, safeLen);
            if (callbacks.onThinking) await callbacks.onThinking(safeChunk);
            buffer = buffer.slice(safeLen);
          }
          break; // Wait for more tokens from stream
        }
      }

      const openIndex = buffer.indexOf('<');
      if (openIndex === -1) {
        await callbacks.onText(buffer);
        buffer = '';
        break;
      }

      if (openIndex > 0) {
        const textBefore = buffer.slice(0, openIndex);
        await callbacks.onText(textBefore);
        buffer = buffer.slice(openIndex);
      }

      // Check if tag name is delimited by whitespace, '>', or '/>'
      const tagMatch = buffer.match(/^<([a-zA-Z0-9_-]+)([\s>\/])/);
      if (!tagMatch) {
        const isPotentiallyIncomplete = /^<[a-zA-Z0-9_-]*$/.test(buffer);
        if (isPotentiallyIncomplete && buffer.length < 30) {
          break; // Wait for next streaming chunk!
        }
        await callbacks.onText(buffer[0]);
        buffer = buffer.slice(1);
        continue;
      }

      const tagName = tagMatch[1].toLowerCase();
      if (!KNOWN_TAGS.includes(tagName)) {
        await callbacks.onText(buffer[0]);
        buffer = buffer.slice(1);
        continue;
      }

      const closeGtIndex = buffer.indexOf('>');
      if (closeGtIndex === -1) {
        break; // Wait for complete opening tag
      }

      // Check for thinking / reasoning tags -> enter progressive streaming mode!
      if (['thinking', 'thought', 'think', 'reasoning'].includes(tagName)) {
        activeThinkingTag = tagName;
        buffer = buffer.slice(closeGtIndex + 1);
        continue;
      }

      const openTagSubstr = buffer.slice(0, closeGtIndex + 1);
      const isSelfClosing = openTagSubstr.endsWith('/>') || 
                            openTagSubstr.includes('/>') ||
                            tagName === 'check_file' || 
                            tagName === 'verify_file' || 
                            tagName === 'delete_file' ||
                            tagName === 'remove_file' ||
                            tagName === 'delete' ||
                            tagName === 'test_file' ||
                            tagName === 'validate_file' ||
                            tagName === 'send_file' ||
                            tagName === 'deliver_file' ||
                            tagName === 'resend_file' ||
                            tagName === 'list_files' ||
                            tagName === 'dir' ||
                            (tagName === 'read_skill' && !buffer.includes(`</${tagName}>`)) ||
                            (tagName === 'search_skill' && !buffer.includes(`</${tagName}>`)) ||
                            (tagName === 'search_web' && !buffer.includes(`</${tagName}>`)) || 
                            (tagName === 'read_file' && !buffer.includes(`</${tagName}>`));

      if (isSelfClosing) {
        const fullTag = openTagSubstr;
        buffer = buffer.slice(closeGtIndex + 1);
        await callbacks.onAction(tagName, fullTag);
        continue;
      }

      const closeTagStr = `</${tagName}>`;
      const closeTagIndex = buffer.indexOf(closeTagStr);
      if (closeTagIndex === -1) {
        // While waiting for closing tag for action, wait for complete tag
        break;
      }

      const fullTag = buffer.slice(0, closeTagIndex + closeTagStr.length);
      buffer = buffer.slice(closeTagIndex + closeTagStr.length);

      if (tagName === 'plan') {
        const inner = fullTag.slice(closeGtIndex + 1, fullTag.length - closeTagStr.length);
        if (callbacks.onPlan) await callbacks.onPlan(inner.trim());
        continue;
      }
      await callbacks.onAction(tagName, fullTag);
    }
  }

  function feed(chunk) {
    queue = queue.then(() => processChunk(chunk)).catch((err) => {
      console.error('[STREAM_PARSER] Error processing chunk:', err);
    });
    return queue;
  }

  async function flush() {
    await queue;
    if (activeThinkingTag && buffer.length > 0) {
      if (callbacks.onThinking) await callbacks.onThinking(buffer);
      buffer = '';
      activeThinkingTag = null;
      return;
    }
    // Unclosed reasoning/plan tag at end of stream: never leak it as visible text!
    const unclosed = buffer.match(/^<(thinking|thought|think|reasoning|plan)[^>]*>([\s\S]*)$/i);
    if (unclosed) {
      const kind = unclosed[1].toLowerCase();
      const inner = unclosed[2].trim();
      buffer = '';
      if (kind === 'plan') {
        if (callbacks.onPlan) await callbacks.onPlan(inner);
      } else if (callbacks.onThinking) {
        await callbacks.onThinking(inner);
      }
      return;
    }
    if (buffer.length > 0) {
      const actions = extractSequentialActions(buffer);
      if (actions.length > 0) {
        for (const act of actions) {
          if (act.rawMatch) {
            await callbacks.onAction(act.type, act.rawMatch);
          }
        }
      } else {
        await callbacks.onText(buffer);
      }
      buffer = '';
    }
  }

  return { feed, flush };
}

router.post('/run', async (req, res) => {
  const { sessionId, prompt, model = 'deepernova-gold-1.5', history = [], effort = 'high' } = req.body;
  const userId = getUserId(req);

  if (!sessionId || !prompt) {
    return res.status(400).json({ success: false, error: 'sessionId dan prompt diperlukan' });
  }

  // Set SSE streaming headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  res.write(': connected\n\n');

  let isAborted = false;
  const upstreamAbortController = new AbortController();

  res.on('close', () => {
    if (!res.writableEnded) {
      isAborted = true;
      try {
        upstreamAbortController.abort();
      } catch (_) {}
      console.log(`[AGENT_STREAM] Client disconnected prematurely for session ${sessionId}, upstream aborted.`);
    }
  });

  const emitEvent = (eventType, data) => {
    if (isAborted) return;
    try {
      res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    } catch (_e) {}
  };

  const chainOfWork = [];

  const addStep = (type, title, detail = '', status = 'running', extra = {}) => {
    const step = {
      id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      title,
      detail,
      status,
      timestamp: new Date().toISOString(),
      ...extra
    };
    chainOfWork.push(step);
    emitEvent('step', step);
    return step;
  };

  const updateLastStep = (status, detail = '', extra = {}) => {
    if (chainOfWork.length > 0) {
      const last = chainOfWork[chainOfWork.length - 1];
      last.status = status;
      if (detail) last.detail = detail;
      Object.assign(last, extra);
      emitEvent('step_update', last);
    }
  };

  try {
    // Ensure session exists in DB
    agentSessionDb.create(sessionId, userId, prompt.slice(0, 45));

    // Save user message to database
    agentMessageDb.create(
      `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sessionId,
      userId,
      'user',
      prompt
    );

    // Initial plan step
    addStep('plan', 'Menganalisis Permintaan Pengguna', `Memproses instruksi: "${prompt.slice(0, 80)}" dan memeriksa workspace sandbox...`, 'running');

    const turnStartTime = Date.now();
    let fileActionExecuted = false;

    agentSandboxService.getSandboxDir(sessionId);
    const existingFiles = agentSandboxService.listFiles(sessionId);
    const existingFileMap = new Map(existingFiles.map(f => [f.path, f]));
    const fileListText = existingFiles.map(f => `- ${f.path} (${(f.size / 1024).toFixed(1)} KB)`).join('\n') || '(Belum ada berkas)';

    // Retrieve Cross-Session Persistent Memory for this user
    const crossSessionMemoryText = agentMemoryService.buildCrossSessionContext(userId, sessionId);

    updateLastStep('completed', `Workspace sandbox siap (${existingFiles.length} berkas terdeteksi).`);

    const promptLower = (prompt || '').toLowerCase();
    const isSearchIntent = /\b(cari|search|googling|berita|news|hari ini|terbaru|terkini|siapa|apa itu|apakah|harga|saham|kurs|presiden|pemilu|update|cuaca|jadwal|skor|hasil|peringkat|info|informasi|peristiwa|kejadian|gemini|claude|deepseek|ai agent|investasi|ekonomi|politik)\b/i.test(promptLower);

    let upfrontSearchContext = '';
    if (isSearchIntent) {
      addStep('search', `Deepernova Search: ${prompt.slice(0, 48)}`, 'Menelusuri informasi live dan terindeks via Deepernova Search Engine (BM25 + PageRank)...', 'running');
      try {
        const upfrontRes = await webSearchService.searchGoogle(prompt, 5);
        if (upfrontRes && upfrontRes.success && upfrontRes.results && upfrontRes.results.length > 0) {
          upfrontSearchContext = upfrontRes.ai_context || webSearchService.formatSearchResultsForPrompt(upfrontRes.results);
          updateLastStep('completed', `Ditemukan ${upfrontRes.results.length} sumber data terverifikasi dari Deepernova Search Engine.`, { results: upfrontRes.results });
        } else {
          updateLastStep('completed', 'Pencarian Deepernova Search selesai.');
        }
      } catch (err) {
        updateLastStep('completed', 'Pencarian Deepernova Search selesai.');
      }
    }

    // Step 2: Intelligent Skill Suggestion & Dynamic On-Demand Catalog Matching
    const wantsDocx = /\b(docx|word|dokumen|laporan|surat|makalah|paper|proposal)\b/i.test(promptLower);
    const wantsPptx = /\b(ppt|pptx|powerpoint|slide|slides|presentasi|deck|pitch)\b/i.test(promptLower);
    const wantsXlsx = /\b(xlsx|excel|spreadsheet|tabel\s*excel|keuangan|financial|budget|cashflow|laba|rugi)\b/i.test(promptLower);

    let documentQualityBlueprint = '';
    if (wantsDocx) {
      documentQualityBlueprint += `
===============================================================================
📄 STANDAR MUTLAK DOKUMEN WORD (.DOCX) EKSEKUTIF KELAS DUNIA (MCKINSEY / BCG STANDARD):
Dokumen .docx TIDAK BOLEH tampil polos atau standar!
JALUR PALING CEPAT & TERBAIK (MESIN OTOMASI KITS):
Workspace Anda memiliki 'kits/word_kit.py'. Cukup buat file 'spec.json' lalu jalankan:
<write_file path="spec.json">{
  "theme": "navy",
  "style": "modern",
  "cover": {
    "label": "LAPORAN EKSEKUTIF",
    "title": "Judul Laporan Lengkap",
    "subtitle": "Subjudul dan Ruang Lingkup",
    "lines": ["Penyusun: Deepernova AI Agent", "Tanggal: 2026", "Status: Final"]
  },
  "blocks": [
    { "t": "h1", "text": "1. Ringkasan Eksekutif & KPI Kunci" },
    { "t": "p", "text": "Penjelasan komprehensif mendalam..." },
    { "t": "kpi_row", "cards": [{ "label": "Metrik 1", "value": "100%", "sub": "+5% Growth" }, { "label": "Metrik 2", "value": "Rp 50M", "sub": "Target Tercapai" }] },
    { "t": "callout", "title": "Poin Strategis Utama", "text": "Keputusan penting..." },
    { "t": "table", "header": ["Kategori", "Target", "Realisasi", "Status"], "rows": [["Item A", "100", "120", "Selesai"]], "align": ["left", "right", "right", "center"] }
  ]
}</write_file>
<run_command>python kits/word_kit.py spec.json nama_dokumen.docx</run_command>
<check_file path="nama_dokumen.docx" />

JIKA MEMBUAT SKRIP PYTHON MANUAL (generate.py):
1. MARGIN HALAMAN: 1.0 inch (top, bottom, left, right).
2. TIPOGRAFI & WARNA: Font 'Calibri'/'Segoe UI', Judul 22pt Bold RGBColor(15, 23, 42).
3. CALLOUT BOX (WAJIB): Tabel 1x1 background '#F8FAFC' dengan border kiri oranye tebal '#EA580C'.
4. TABEL ZEBRA-STRIPED: Header '#0F172A' teks putih, baris data bergantian '#FFFFFF' dan '#F8FAFC'.
================================================================================
`;
    }

    if (wantsPptx) {
      documentQualityBlueprint += `
================================================================================
📊 STANDAR MUTLAK PRESENTASI POWERPOINT (.PPTX) 16:9 MODERN KELAS DUNIA:
Slide .pptx DILARANG KERAS TAMPIL TELANJANG!
DILARANG format 4:3 kuno, DILARANG latar putih polos tanpa kontainer kartu, DILARANG prs.slide_layouts[1] mentah, dan DILARANG KERAS grafik placeholder sembarang seperti np.sin(x)!

JALUR PALING CEPAT, KREATIF & TERBAIK (MESIN OTOMASI PPTX DESIGNER):
Workspace Anda memiliki 'kits/pptx_designer.py' yang menghasilkan slide 16:9 modern dengan kartu Bento Box, badge pills, ornamen aksen, dan visual hierarchy bertaraf internasional. Cukup buat 'spec.json' lalu jalankan:

<write_file path="spec.json">{
  "theme": "emerald",
  "title": "Smart Cattle Farming & Modern Agribusiness 2026",
  "slides": [
    {
      "type": "cover",
      "kicker": "SMART LIVESTOCK 4.0",
      "title": "Transformasi Peternakan Modern Berbasis IoT & AI",
      "subtitle": "Integrasi Bio-Telemetri, Nutrisi Presisi TMR, dan Biosekuriti Ramah Lingkungan",
      "meta": "DEEPERNOVA AGRI-TECH • 2026"
    },
    {
      "type": "comparison",
      "kicker": "PARADIGMA INDUSTRI",
      "title": "Perbandingan: Sistem Konvensional vs Smart Farm 4.0",
      "col_a": {
        "tag": "SISTEM TRADISIONAL",
        "title": "Pengelolaan Manual",
        "desc": "Pemantauan visual kasat mata dengan pemberian pakan tanpa takaran terukur.",
        "stat": "14-16 L",
        "stat_label": "Produksi harian rata-rata per ekor",
        "bullets": ["Deteksi birahi & penyakit terlambat", "Pemborosan pakan hingga 25%"]
      },
      "col_b": {
        "tag": "SMART CATTLE 4.0",
        "title": "Ekosistem Presisi Berbasis Sensor",
        "desc": "Ear-tag bio-telemetri mendeteksi aktivitas ruminasi dan suhu tubuh 24/7.",
        "stat": "28.5 L",
        "stat_label": "Produksi susu Grade A (+85%)",
        "bullets": ["Pemberian pakan robotik otomatis", "Konversi kotoran menjadi biogas"]
      }
    },
    {
      "type": "kpi",
      "kicker": "METRIK UTAMA",
      "title": "Indikator Kinerja Utama & Efisiensi Terverifikasi",
      "kpis": [
        { "label": "PRODUKSI HARIAN", "value": "28.5 L", "sub": "+78% di atas baseline" },
        { "label": "FEED CONVERSION (FCR)", "value": "1.28", "sub": "Optimalisasi ransum pakan" },
        { "label": "TINGKAT KEBUNTINGAN", "value": "72.4%", "sub": "Akurasi inseminasi buatan" },
        { "label": "MORTALITAS PEDET", "value": "< 1.5%", "sub": "Sistem pencegahan dini" }
      ],
      "bullets": [
        "Ventilasi tunnel otomatis menjaga iklim kandang nyaman dan menekan heat stress.",
        "Formulasi pakan silase jagung meningkatkan kadar protein dan lemak susu secara stabil."
      ]
    },
    {
      "type": "split",
      "kicker": "ARTIKEL MENDALAM",
      "left_card": {
        "tag": "BIO-TELEMETRI SAPI",
        "title": "Arsitektur Sensor Pintar & Pemantauan Kesehatan Sapi",
        "paragraphs": [
          "Setiap ternak dilengkapi ear-tag pintar bersertifikasi IP68 dengan sensor akselerometer 3-sumbu dan termometer inframerah yang mentransmisikan data setiap 15 menit melalui jaringan LoRaWAN.",
          "Algoritma AI menganalisis pola ruminasi. Penurunan waktu mengunyah di bawah 400 menit per hari langsung memicu peringatan potensi gangguan pencernaan sebelum gejala klinis muncul."
        ],
        "bullets": [
          "Deteksi siklus estrus dengan akurasi 96%",
          "Pemetaan padang gembala anti-kehilangan",
          "Rekam medis digital per ekor sapi terintegrasi QR code"
        ]
      },
      "right_card": {
        "stat_label": "EFISIENSI BIAYA KESEHATAN",
        "stat": "-64%",
        "highlight_title": "Pencegahan Penyakit Proaktif",
        "highlight_desc": "Intervensi dini menekan biaya obat dan mencegah penurunan yield mendadak.",
        "meta_tag": "BIOSEKURITI GRADE A"
      }
    },
    {
      "type": "bento",
      "kicker": "SARANA OTOMASI",
      "title": "Tiga Komponen Fasilitas Kandang Otomatis Berkelanjutan",
      "cards": [
        { "tag": "ROBOTIK", "title": "Rotary Milking Parlour", "stat": "300 Ekor/Jam", "stat_label": "Kapasitas Pemerahan", "desc": "Pemerahan higienis otomatis dengan pendinginan seketika 4°C.", "bullets": ["Zero human touch", "Audit mutu real-time"] },
        { "tag": "PAKAN", "title": "Automatic Feeding TMR", "stat": "±10 gram", "stat_label": "Presisi Takaran", "desc": "Mixer pakan digital mendistribusikan ransum secara teratur.", "bullets": ["Zero pakan tercecer", "Formulasi adaptif"] },
        { "tag": "SIRKULASI", "title": "Smart Climate Control", "stat": "22°C", "stat_label": "Suhu Kandang Terjaga", "desc": "Kipas heksagonal dan misting beroperasi otomatis sesuai indeks THI.", "bullets": ["Bebas bau menyengat", "Matras karet empuk"] }
      ]
    },
    {
      "type": "timeline",
      "kicker": "SIKLUS KEBERLANJUTAN",
      "title": "Penerapan Sirkular Ekonomi: Zero Waste Farm",
      "steps": [
        { "phase": "TAHAP 1", "title": "Pembersihan Otomatis", "desc": "Pengumpulan feses dengan scraper mekanik setiap 2 jam." },
        { "phase": "TAHAP 2", "title": "Reaktor Biodigester", "desc": "Fermentasi menghasilkan gas metana untuk listrik mandiri." },
        { "phase": "TAHAP 3", "title": "Separasi Kompos", "desc": "Pemisahan padatan untuk pupuk organik perkebunan." },
        { "phase": "TAHAP 4", "title": "Pupuk Cair Nutrisi", "desc": "Nutrisi cair menyuburkan lahan rumput gajah odot." }
      ]
    },
    {
      "type": "outro",
      "title": "Membangun Masa Depan Agribisnis Berkelanjutan",
      "subtitle": "Kedaulatan Pangan Mandiri • Hubungi: info@smartfarm.id"
    }
  ]
}</write_file>
<run_command>python kits/pptx_designer.py spec.json nama_file.pptx</run_command>
<check_file path="nama_file.pptx" />

PILIHAN TEMA WARNA ('theme'):
- "emerald" : Peternakan, Sapi, Agribisnis, Alam, GreenTech, Sustainability
- "cyber"   : Dark Mode Obsidian, AI, Cyber Security, Cloud, DeepTech
- "navy"    : Eksekutif, McKinsey, Perbankan, Keuangan, Corporate
- "purple"  : Startup Unicorn, SaaS, Sequoia Pitch Deck, AI Produk
- "luxury"  : Gold & Charcoal, Desain Kreatif, Portofolio, Brand, Hospitality
- "sunset"  : Warm Crimson, F&B, Retail, Energi Terbarukan
- "slate"   : Minimalist Blue, Akademik, Konferensi Ilmiah, Tesis

TIPE SLIDE YANG DIDUKUNG:
- "cover"      : Slide sampul berlatar gelap elegan dengan pita vertikal & badge kategori
- "comparison" : 2 kartu perbandingan sisi-ke-sisi (Konvensional vs Modern / Sebelum vs Sesudah)
- "kpi"        : 4 kartu metrik besar (36-40pt bold) + kotak analisis strategis di bawah
- "split"      : Artikel naratif mendalam di kiri (bebas overflow) + kartu spotlight KPI di kanan
- "bento"      : 2-4 kartu Bento Box rounded-corner dengan tag badges, stat highlight, dan bullet points
- "matrix"     : Kuadran 2x2 kartu strategi (SWOT / 4 Pilar Inisiatif)
- "timeline"   : Alur proses horizontal bertahap dengan lingkaran nomor aksen
- "outro"      : Slide penutup kontras tinggi untuk tanya jawab

JIKA MENULIS SKRIP PYTHON MANUAL:
Gunakan import dari pptx_designer agar bebas dari error koordinat:
from pptx_designer import ModernDeck
deck = ModernDeck(theme="emerald", title="Judul Presentasi")
deck.add_cover("Judul", "Subjudul", "KICKER", "2026")
deck.add_comparison("Judul Perbandingan", "KICKER", col_a={...}, col_b={...})
deck.add_kpi_showcase("Metrik Utama", "KICKER", kpis=[...], bullets=[...])
deck.add_split_hero("Artikel Lengkap", "KICKER", left_card={...}, right_card={...})
deck.add_bento_cards("Tiga Komponen", "KICKER", cards=[...])
deck.add_process_steps("Alur Kerja", "KICKER", steps=[...])
deck.add_outro("Penutup", "Kontak")
deck.save("output.pptx")
================================================================================
`;
    }

    if (wantsXlsx) {
      documentQualityBlueprint += `
================================================================================
📈 STANDAR MUTLAK SPREADSHEET EXCEL (.XLSX) INSTITUSI CFO & INVESTMENT BANKING:
File .xlsx DILARANG angka polos mentah tanpa format dan DILARANG kolom terpotong (###)!

JALUR PALING CEPAT & TERBAIK (MESIN OTOMASI KITS):
Workspace Anda memiliki 'kits/excel_kit.py'. Cukup buat file 'spec.json' lalu jalankan:
<write_file path="spec.json">{
  "theme": "navy",
  "sheets": [
    {
      "name": "Dashboard_Eksekutif",
      "title": "DASHBOARD KINERJA & ANALISIS FINANSIAL 2026",
      "master_cols": 6,
      "freeze_panes": "A7",
      "kpis": [
        { "label": "TOTAL TARGET", "value": 15000, "format": "#,##0\" Unit\"", "sub": "Target Tahunan" },
        { "label": "REALISASI", "value": 16200, "format": "#,##0\" Unit\"", "sub": "+8% Capaian" },
        { "label": "EFISIENSI BIAYA", "value": 45000000, "format": "\"Rp \"#,##0", "sub": "Penghematan Bersih" }
      ],
      "tables": [
        {
          "id": "tbl_data",
          "headers": ["Item / Komponen", "Target", "Realisasi", "Varians", "Capaian (%)", "Status"],
          "formats": ["@", "#,##0", "#,##0", "+#,##0;-#,##0;0", "0.0%", "@"],
          "align": ["left", "right", "right", "right", "right", "center"],
          "rows": [
            ["Operasional A", 5000, 5400, "=C{row}-B{row}", "=C{row}/B{row}", "TERCAPAI"],
            ["Operasional B", 5000, 5200, "=C{row}-B{row}", "=C{row}/B{row}", "TERCAPAI"],
            ["Operasional C", 5000, 5600, "=C{row}-B{row}", "=C{row}/B{row}", "MELAMPAUI"]
          ],
          "totals": ["Total", "SUM", "SUM", "SUM", "=C{row}/B{row}", "-"]
        }
      ]
    }
  ]
}</write_file>
<run_command>python kits/excel_kit.py spec.json nama_file.xlsx</run_command>
<check_file path="nama_file.xlsx" />

JIKA MEMBUAT SKRIP OPENPYXL MANUAL:
1. Header Baris Gelap '#0F172A', teks Putih Tebal.
2. 3-4 Kartu KPI di atas tabel (B3:D4).
3. Format Rupiah: ws.cell().number_format = '"Rp " #,##0' dan Formula Dinamis '=SUM(...)'.
4. Loop auto-fit lebar kolom di akhir skrip agar tidak terpotong (###).
================================================================================
`;
    }

    // Configure Effort & Max Steps
    let MAX_AGENT_STEPS = 6;
    let effortInstruction = '';
    if (effort === 'low') {
      MAX_AGENT_STEPS = 3;
      effortInstruction = `\n[TINGKAT USAHA AI AGENT: RENDAH / QUICK MODE (MAKSIMAL 3 ITERASI)]\nFokus pada eksekusi cepat, langsung to the point, dan hemat token.\n`;
    } else if (effort === 'high') {
      MAX_AGENT_STEPS = 10;
      effortInstruction = `\n[TINGKAT USAHA AI AGENT: TINGGI / PERSISTENT EXECUTIVE EFFORT (PANTANG MENYERAH - MAKSIMAL 10+ ITERASI)]
Target Anda adalah keberhasilan 100% tuntas!
JIKA TERJADI KENDALA TEKNIS APAPUN (syntax error, missing module/library, runtime exception, stderr, exit code != 0, atau target berkas belum terbentuk):
1. ANDA DILARANG MENYERAH, BERHENTI, ATAU HANYA MEMINTA MAAF!
2. Lakukan Root Cause Analysis secara mendalam pada tag <thought>...</thought>.
3. Jika modul Python kurang (misal python-docx, python-pptx, openpyxl, matplotlib, reportlab), install langsung via <run_command>pip install nama_modul</run_command>.
4. Tulis ulang skrip perbaikan secara utuh dengan <write_file path="generate.py">...</write_file> (tanpa tanda triple backtick di dalam tag!).
5. Jalankan kembali dengan <run_command>python generate.py</run_command>.
6. Verifikasi keberadaan dan integritas berkas di disk dengan <check_file path="..." />.
7. Terus pantang menyerah sampai hasil terbukti sempurna dan tanpa error!\n`;
    } else {
      MAX_AGENT_STEPS = 6;
      effortInstruction = `\n[TINGKAT USAHA AI AGENT: SEDANG / BALANCED MODE (MAKSIMAL 6 ITERASI)]\nSelesaikan tugas dengan terukur, teliti, dan pastikan hasil akhir terverifikasi.\n`;
    }

    // Step 2: Intelligent Skill Requirement Evaluation & Mapping Index
    const skillEvaluation = agentSkillService.evaluateSkillRequirement(prompt);
    let activeSkill = null;
    let strictSkillAdherencePrompt = '';

    if (skillEvaluation.requiresSkill && skillEvaluation.selectedSkill) {
      activeSkill = skillEvaluation.selectedSkill;
      addStep(
        'skill',
        `Membaca Buku Skill: ${activeSkill.title}`,
        `Membuka dan menelaah buku panduan '${activeSkill.file}' (${activeSkill.category}) agar eksekusi berpegang teguh pada standar baku profesional...`,
        'completed',
        {
          skillId: activeSkill.id,
          skillFile: activeSkill.file,
          skillTitle: activeSkill.title,
          category: activeSkill.category
        }
      );

      // Emit real-time skill event to frontend before stream generation
      emitEvent('skill_active', {
        id: activeSkill.id,
        file: activeSkill.file,
        title: activeSkill.title,
        category: activeSkill.category,
        summary: activeSkill.summary || ''
      });

      // Synchronize to sandbox's SKILL.md so the session drawer always displays this active skill
      try {
        agentSandboxService.writeFile(sessionId, 'SKILL.md', activeSkill.content || '');
      } catch (_wErr) {}

      // Generate ultra-strict prompt injection
      strictSkillAdherencePrompt = agentSkillService.getStrictAdherencePrompt(activeSkill);
    } else {
      addStep(
        'skill',
        'Mode Percakapan Langsung',
        'Tidak memerlukan buku panduan khusus. Memproses respons secara langsung...',
        'completed'
      );
    }

    // Build system prompt with Dynamic Skill Catalog & Sandbox context (Autonomous Agent Orchestrator Standard)
    const compactCatalog = agentSkillService.getCompactCatalog();
    const skillSuggestionNote = activeSkill
      ? `\n📖 BUKU SKILL AKTIF: Tugas ini dieksekusi dengan standar buku skill \`${activeSkill.file}\` (${activeSkill.title}). Anda WAJIB berpegang teguh pada aturan dan template di dalamnya!\n`
      : '';

    const systemPrompt = `Anda adalah Deepernova AI Agent — asisten koding dan eksekusi sandbox otonom tercanggih dengan standar Autonomous Agent Orchestrator, Workspace Artifacts & Dynamic Skill Architecture.
Anda bertugas mengeksekusi instruksi pengguna secara nyata di dalam sandbox hingga menghasilkan berkas jadi berkualitas tinggi tanpa error.

PRINSIP UTAMA: ACTION-FIRST & KESIMPULAN PADAT (ZERO-RAMBLE & ANTI-BOROS TOKEN):
1. LANGSUNG KERJAKAN TUGAS DENGAN AKSI AGENTIC NYATA (ACTION-FIRST):
   - Jika pengguna meminta membuat berkas, mengedit kode, merancang slide/dokumen/tabel, atau menjalankan perintah: LANGSUNG MULAI DENGAN AKSI NYATA (<write_file>, <run_command>, <check_file>, <search_web>).
   - DILARANG KERAS membuang-buang token dengan pembukaan panjang, basa-basi, atau narasi bertele-tele sebelum bertindak!
   - Anda boleh menyertakan penalaran internal Anda di dalam tag <thought>...</thought>.
   - Di luar tag <thought>, jika diperlukan Anda cukup memberikan MAKSIMAL 1 kalimat pengantar singkat (misal: "Mengeksekusi pembuatan berkas sesuai spesifikasi..."), lalu LANGSUNG jalankan tag aksi sandbox.

2. DILARANG KERAS NGEDUMEL, MENGELUH, ATAU BERTELE-TELE (ANTI-NGEDUMEL):
   - DILARANG curhat teknis, mengeluh soal error, meminta maaf berlebihan, menceritakan kesulitan pengerjaan, atau mengulang-ulang instruksi pengguna!
   - DILARANG menulis ulang seluruh kode atau isi dokumen secara mentah di teks obrolan jika sudah dituliskan ke dalam berkas via <write_file>.
   - Bekerjalah secara otonom, senyap, efisien, dan presisi!

3. KESIMPULAN EKSEKUTIF SAAT TUGAS SELESAI (CRISP EXECUTIVE SUMMARY):
   - Ketika seluruh aksi agentic selesai dan berkas terverifikasi terbentuk di disk sandbox (<check_file>):
   - Berikan HANYA KESIMPULAN PADAT, RAPI, DAN HEMAT TOKEN yang mencakup:
     * ✅ Status Pengerjaan: Konfirmasi tuntas 100%.
     * 📁 Berkas Deliverables: Nama file fisik yang tersimpan di sandbox.
     * 📌 Ringkasan Intisari: 3-4 butir poin pokok konten/fitur utama.
     * 🚀 Panduan Akses: Petunjuk singkat untuk mengunduh berkas atau melihat pratinjau di panel Berkas/Preview.
   - DILARANG menambahkan ceramah, monolog, atau dongeng penutup yang menghabiskan token!

SIKLUS ORKESTRASI MULTI-STEP RE-ACT & AUTONOMOUS RETRY LOOP:
- Analisis di <thought> -> Tag Aksi Sandbox/Web/Skill -> Pembacaan Observasi Hasil Tindakan -> Eksekusi Lanjutan Hingga Tuntas -> Kesimpulan Eksekutif Singkat.
- PENCARIAN BERITA & INFORMASI AKTUAL (DEEPERNOVA SEARCH ENGINE):
  a. Anda terintegrasi langsung dengan Deepernova Search Engine — mesin pencari berkecepatan tinggi dengan BM25 indexer dan PageRank yang akurat dan terindeks terkini.
  b. Jika membutuhkan informasi tambahan, panggil <search_web query="kata kunci pencarian spesifik" />.
  c. Sistem akan mengeksekusi pencarian dan mengembalikan observasi berisi judul, ringkasan, domain, dan tanggal.
  d. Gunakan data tersebut langsung untuk menyelesaikan tugas tanpa membuang token untuk basa-basi!
- AUTONOMOUS SELF-HEALING (PERBAIKAN MANDIRI):
  Jika terjadi error eksekusi (stderr, syntax error, missing module, atau target berkas belum terbentuk): JANGAN mengeluh atau curhat kepada pengguna! Analisis akar masalah di <thought>, tulis ulang skrip perbaikan via <write_file>, pasang modul jika perlu dengan <run_command>pip install ...</run_command>, jalankan kembali dengan <run_command>, dan verifikasi dengan <check_file>.

${effortInstruction}
${documentQualityBlueprint}
${strictSkillAdherencePrompt}
${compactCatalog}
${skillSuggestionNote}

TAG AKSI SANDBOX & SKILL YANG TERSEDIA:
- <read_skill name="nama_skill" />
  Membaca dokumen standar keahlian secara on-demand (misal: frontend-modern-web, docx-executive-report, pptx-c-level-deck, xlsx-financial-model, cybersecurity-pentest-defense, data-science-matplotlib, fullstack-rest-api, web-scraping-crawler, pdf-pro-generator, algorithmic-financial-analysis).
- <search_skill query="kata kunci" />
  Menelusuri pustaka keahlian jika Anda membutuhkan panduan spesifik.
- <thought>analisis nalar internal mendalam</thought>
- <plan>rencana milestone eksekusi</plan>
- <read_file path="nama_file.ext" />
  Membaca isi berkas dari sandbox atau SKILL.md.
- <list_files />
  Melihat daftar seluruh berkas yang ada di workspace sandbox beserta ukuran fisiknya.
- <write_file path="nama_file.ext">isi berkas lengkap</write_file>
  Membuat berkas baru atau menimpa berkas kode/skrip secara utuh ke sandbox (DILARANG tanda triple backtick di dalam tag ini!).
- <edit_file path="nama_file.ext"><target>teks lama</target><replacement>teks baru</replacement></edit_file>
  Mengedit bagian tertentu dari berkas yang ada tanpa menulis ulang seluruh berkas.
- <delete_file path="nama_file.ext" />
  Menghapus berkas yang tidak terpakai atau usang dari workspace sandbox.
- <test_file path="nama_file.ext" />
  Menguji keabsahan sintaks dan integritas berkas (.py, .js, .json, .pptx, .docx, .xlsx, .html) untuk memastikan tidak rusak atau corrupt.
- <send_file path="nama_file.ext" />
  Mengirim ulang berkas yang baru dibuat/diedit ke daftar kartu deliverable pengguna di obrolan.
- <search_web query="kata kunci pencarian" />
  Melakukan pencarian di Deepernova Search Engine untuk referensi atau data aktual.
- <run_command>perintah terminal</run_command>
  Menjalankan perintah terminal di sandbox dengan AKSES INTERNET LANGSUNG & PENUH (misal: curl, pip install, python requests, fetch API, web scraping, git, node, dir, dsb — SANDBOX TIDAK TERISOLASI!).
- <execute_code language="python|node">kode</execute_code>
  Mengeksekusi kode langsung di sandbox.
- <check_file path="nama_file.ext" />
  Memeriksa keberadaan dan ukuran berkas hasil eksekusi di sandbox.
- <screenshot target="index.html" />
  Mengambil tangkapan layar browser visual preview dari aplikasi web / berkas HTML dan langsung menampilkannya di obrolan pengguna.
- <preview>index.html</preview>
  Menetapkan file visual preview untuk aplikasi web.

ATURAN KECERDASAN RELEVANSI BERKAS & PENGALAMAN PENGGUNA:
1. Pengguna hanya ingin menerima berkas akhir yang relevan dan diminta (seperti berkas .docx, .pptx, .xlsx, .pdf, atau aplikasi web). Jangan jadikan skrip python pembantu sementara sebagai file unduhan utama.
2. Setiap kali Anda membuat aplikasi web (HTML/CSS/JS), selalu panggil <screenshot target="index.html" /> agar tangkapan layarnya langsung tampil di obrolan pengguna!
3. DILARANG KERAS tanda backtick (\`\`\`python atau \`\`\`) di dalam <write_file path="...">! Baris pertama harus langsung kode sumber murni.
4. KETIKA MEMBUAT DOKUMEN (.docx, .pptx, .xlsx, .pdf): Tulis <write_file path="spec.json">...</write_file> lalu jalankan mesin kits (misal: python kits/pptx_designer.py spec.json nama_file.pptx atau python kits/word_kit.py spec.json nama_file.docx) atau tulis generator <write_file path="generate.py"> lalu SEGERA MENJALANKANNYA dengan <run_command>python generate.py</run_command>!
5. Setelah mengeksekusi skrip, selalu panggil <check_file path="nama_berkas.ext" /> untuk memverifikasi berkas sudah terbentuk dengan sempurna di disk sandbox.

ATURAN PERTANYAAN SEDERHANA, PERCAKAPAN, & MEMORI LINTAS SESI:
1. Jika pengguna hanya bertanya hal sederhana, meminta penjelasan, berkonsultasi, berterima kasih, atau menanyakan obrolan/berkas terdahulu:
   - Anda TIDAK PERLU menuliskan tag aksi apapun (<write_file>, <run_command>, dll).
   - Jawablah pertanyaan pengguna secara ramah, cerdas, dan to the point dengan memanfaatkan memori lintas sesi yang tersedia.
2. Tag aksi (<write_file>, <run_command>) HANYA digunakan jika pengguna secara spesifik meminta membuat file baru, mengubah berkas yang ada, atau mengeksekusi perintah terminal.

${crossSessionMemoryText}

BERKAS SAAT INI DI SANDBOX:
${fileListText}
${upfrontSearchContext ? `\n\n${upfrontSearchContext}\n\nCATATAN KHUSUS PENCARIAN DEEPERNOVA: Data pencarian di atas adalah data terverifikasi dari Deepernova Search Engine. Anda WAJIB menggunakannya sebagai acuan fakta utama dalam jawaban Anda!` : ''}`;

    // Messages payload for LLM
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(h => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content || h.text || ''
      })),
      { role: 'user', content: prompt }
    ];

    let accumulatedAnswer = '';
    let accumulatedReasoning = '';
    let hasPreview = false;
    let previewFile = 'index.html';

    // Call Native DeeperNova GPU Model with Autonomous Multi-Step ReAct Loop
    const upstreamUrls = [
      process.env.DEEPERNOVA_API_URL || 'http://127.0.0.1:8000/v1/chat/completions',
      process.env.DEEPERNOVA_PUBLIC_API_URL || 'https://dip-pushing-whereas-darwin.trycloudflare.com/v1/chat/completions'
    ].filter(Boolean);

    let stepIteration = 0;
    let continueAutonomousLoop = true;
    let isSelfHealingActive = false;
    const sentFilePaths = new Set();

    while (continueAutonomousLoop && stepIteration < MAX_AGENT_STEPS && !isAborted) {
      stepIteration++;
      let turnActionExecuted = false;
      let turnObservations = [];
      let turnRawContent = '';

      let upstreamRes = null;
      let lastErr = null;

      // 1. High-Speed Cloud AI with key rotation
      const activeKeys = getEffectiveTokenMixKeys();
      if (activeKeys && activeKeys.length > 0) {
        const agentModel = process.env.TOKENMIX_AGENT_MODEL || 'llama-3.3-70b';
        for (let i = 0; i < activeKeys.length; i++) {
          const key = activeKeys[i];
          try {
            const fetchTimeout = new AbortController();
            const tid = setTimeout(() => fetchTimeout.abort(), 15000);
            const combinedSignal = upstreamAbortController.signal;

            const res = await fetch(TOKENMIX_CHAT_API_URL, {
              method: 'POST',
              signal: combinedSignal,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
              },
              body: JSON.stringify({
                model: agentModel,
                messages: apiMessages,
                temperature: 0.5,
                max_tokens: 4096,
                stream: true
              })
            });
            clearTimeout(tid);
            if (res.ok) {
              upstreamRes = res;
              lastErr = null;
              break;
            } else {
              const errText = await res.text().catch(() => '');
              lastErr = new Error(`Key ${i} status ${res.status}: ${errText.slice(0, 100)}`);
            }
          } catch (fetchErr) {
            lastErr = fetchErr;
          }
        }
      }

      // 2. Seamless Fallback: Native GPU Engine
      if (!upstreamRes || !upstreamRes.ok) {
        for (const uUrl of upstreamUrls) {
          try {
            const gpuTimeout = new AbortController();
            const gtid = setTimeout(() => gpuTimeout.abort(), 8000);
            const res = await fetch(uUrl, {
              method: 'POST',
              signal: gpuTimeout.signal,
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'deepernova v1 flash 1',
                messages: apiMessages,
                temperature: 0.6,
                max_tokens: 4500,
                stream: true
              })
            });
            clearTimeout(gtid);
            if (res.ok) {
              upstreamRes = res;
              lastErr = null;
              break;
            } else {
              const errText = await res.text().catch(() => '');
              lastErr = new Error(`GPU Engine Error (${res.status}): ${errText.slice(0, 100)}`);
            }
          } catch (fetchErr) {
            lastErr = fetchErr;
          }
        }
      }

      // 3. Ultra-Resilient Standby Fallback: Synthetic Stream if all upstreams temporarily unreachable
      if (!upstreamRes || !upstreamRes.ok) {
        console.warn('[AGENT_ROUTES] Upstream AI offline, creating synthetic standby completion stream:', lastErr?.message);
        const fallbackText = apiProxyService.generateStandbyCompletion(apiMessages, 'deepernova-gold-1.5', lastErr);
        const syntheticStream = apiProxyService.createSyntheticSSEStream(fallbackText, 'deepernova-gold-1.5');
        upstreamRes = {
          ok: true,
          status: 200,
          body: syntheticStream
        };
      }

      const streamParser = createStreamActionParser({
        onText: async (plainText) => {
          if (isAborted) return;
          // Clean any accidental (do) notation
          const clean = plainText.replace(/\((?:do|do_search)\)\s*/gi, '');
          if (clean) {
            accumulatedAnswer += clean;
            emitEvent('delta', { content: clean });
          }
        },
        onThinking: async (thinkingChunk) => {
          if (isAborted) return;
          accumulatedReasoning += thinkingChunk;
          emitEvent('reasoning', { text: thinkingChunk, full: accumulatedReasoning });
        },
        onPlan: async (planText) => {
          if (isAborted) return;
          addStep('plan', 'Rencana Kerja Otonom', planText, 'completed');
        },
        onAction: async (tagName, fullTag) => {
          if (isAborted) return;
          const parsedAction = extractSequentialActions(fullTag)[0];
          if (parsedAction) {
            // Action executed directly without artificial verbose intro

            const { pillXml, observation } = await executeActionItem(parsedAction, sessionId, addStep, updateLastStep, emitEvent);
            if (pillXml) {
              accumulatedAnswer += `\n\n${pillXml}\n\n`;
              emitEvent('delta', { content: `\n\n${pillXml}\n\n` });
            }

            if (observation) {
              turnObservations.push({ type: parsedAction.type, observation });
              turnActionExecuted = true;
            }

            if (parsedAction.type === 'preview') {
              hasPreview = true;
              previewFile = parsedAction.entryFile || 'index.html';
            }

            if (['send_file', 'deliver_file', 'resend_file'].includes(parsedAction.type) && parsedAction.path) {
              sentFilePaths.add(parsedAction.path);
            }

            // Emit live sandbox files update if file modified or manipulated
            if (['write_file', 'file', 'edit_file', 'patch_file', 'delete_file', 'remove_file', 'delete', 'send_file', 'deliver_file', 'resend_file', 'execute_code', 'run_code', 'run_command', 'command'].includes(parsedAction.type)) {
              fileActionExecuted = true;
              const currentFiles = agentSandboxService.listFiles(sessionId);
              emitEvent('files_update', { files: currentFiles });
            }
          }
        }
      });

      // Read upstream SSE stream
      let sseBuffer = '';
      for await (const chunk of upstreamRes.body) {
        if (isAborted) break;
        sseBuffer += chunk.toString();
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop(); // keep last incomplete line

        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const json = JSON.parse(line.slice(6));
              const deltaContent = json.choices?.[0]?.delta?.content || '';
              const deltaReasoning = json.choices?.[0]?.delta?.reasoning_content || json.choices?.[0]?.delta?.reasoning || '';
              
              if (deltaReasoning) {
                accumulatedReasoning += deltaReasoning;
                emitEvent('reasoning', { text: deltaReasoning, full: accumulatedReasoning });
              }
              if (deltaContent) {
                turnRawContent += deltaContent;
                await streamParser.feed(deltaContent);
              }
            } catch (_e) {}
          }
        }
      }

      await streamParser.flush();

      if (isAborted) break;

      // Autonomous Multi-Step ReAct & Self-Healing Loop Decision:
      // If tool actions were executed during this turn, feed observations back into LLM context so it reads results!
      if (turnActionExecuted && turnObservations.length > 0 && stepIteration < MAX_AGENT_STEPS) {
        apiMessages.push({
          role: 'assistant',
          content: turnRawContent
        });

        const hasErrorInTurn = turnObservations.some(o => {
          const text = (o.observation || '').toLowerCase();
          return text.includes('stderr') || 
                 text.includes('error:') || 
                 text.includes('traceback') || 
                 text.includes('exception:') || 
                 text.includes('syntaxerror') || 
                 text.includes('nameerror') || 
                 text.includes('attributeerror') || 
                 text.includes('modulenotfounderror') ||
                 text.includes('gagal') ||
                 text.includes('failed');
        });

        // Detect unmet target deliverables in sandbox
        const currentFiles = agentSandboxService.listFiles(sessionId);
        const unmetGoals = [];
        const isCreationIntent = /\b(buat|bikin|create|generate|rancang|susun|tulis|tambahkan|edit|ubah|ganti)\b/i.test(promptLower);
        const wantsPdf = /\b(pdf|invoice|laporan\s*pdf)\b/i.test(promptLower);
        const wantsHtml = /\b(html|web|dashboard|landing\s*page|website)\b/i.test(promptLower);

        if (isCreationIntent) {
          if (wantsDocx && !currentFiles.some(f => f.ext === 'docx')) unmetGoals.push("Dokumen Word (.docx) belum terbentuk di disk");
          if (wantsPptx && !currentFiles.some(f => f.ext === 'pptx')) unmetGoals.push("Presentasi PowerPoint (.pptx) belum terbentuk di disk");
          if (wantsXlsx && !currentFiles.some(f => f.ext === 'xlsx')) unmetGoals.push("Spreadsheet Excel (.xlsx) belum terbentuk di disk");
          if (wantsPdf && !currentFiles.some(f => f.ext === 'pdf')) unmetGoals.push("Dokumen PDF (.pdf) belum terbentuk di disk");
          if (wantsHtml && !currentFiles.some(f => f.ext === 'html')) unmetGoals.push("Aplikasi Web (index.html) belum terbentuk di disk");
        }

        const needsSelfHealing = hasErrorInTurn || (unmetGoals.length > 0 && stepIteration >= 2);

        if (isSelfHealingActive && !hasErrorInTurn && unmetGoals.length === 0) {
          updateLastStep('completed', 'Perbaikan mandiri (Self-Healing) berhasil! Berkas dan sistem telah diverifikasi 100% aman.');
          isSelfHealingActive = false;
        }

        // Check if the model already provided its executive conclusion in trailing text after its last action tag
        const lastActionCloseIdx = Math.max(
          turnRawContent.lastIndexOf('</check_file>'),
          turnRawContent.lastIndexOf('</run_command>'),
          turnRawContent.lastIndexOf('</write_file>'),
          turnRawContent.lastIndexOf('</execute_code>'),
          turnRawContent.lastIndexOf('</screenshot>'),
          turnRawContent.lastIndexOf('/>')
        );

        const trailingText = lastActionCloseIdx !== -1 
          ? turnRawContent.slice(lastActionCloseIdx).replace(/<[^>]+>/g, '').trim() 
          : '';

        const alreadyConcluded = trailingText.length > 30 && 
          /(?:kesimpulan|status|tuntas|selesai|berkas|deliverable|unduh|ringkasan|intisari)/i.test(trailingText);

        if (!needsSelfHealing && unmetGoals.length === 0 && alreadyConcluded) {
          // Model already executed all actions and provided the crisp executive conclusion!
          // Finish loop immediately to prevent duplicate conclusion or wasted tokens.
          continueAutonomousLoop = false;
          break;
        }

        const obsFormatted = turnObservations.map((o, idx) => `[HASIL OBSERVASI ${idx + 1} (${o.type})]:\n${o.observation}`).join('\n\n---\n\n');
        let followUpInstruction = '';

        if (needsSelfHealing) {
          isSelfHealingActive = true;
          addStep('healing', `Mendeteksi Kendala & Memulai Perbaikan Mandiri (Percobaan #${stepIteration})`, `Menganalisis penyebab kegagalan dan merancang kode perbaikan baru...`, 'running');

          const effortModeTag = effort === 'high' 
            ? '🔥 MODE PANTANG MENYERAH (MAX EFFORT)' 
            : (effort === 'low' ? '⚡ MODE CEPAT (LOW EFFORT)' : '⚖️ MODE STANDAR SEIMBANG');

          followUpInstruction = `${obsFormatted}\n\n` +
            `🚨 [AUTONOMOUS SELF-HEALING & PERBAIKAN MANDIRI AKTIF - ${effortModeTag} (Iterasi #${stepIteration}/${MAX_AGENT_STEPS})]:\n` +
            `Perhatian: Target pengerjaan belum tuntas atau terjadi kendala teknis pada langkah sebelumnya:\n` +
            (hasErrorInTurn ? `- Error atau kegagalan eksekusi terdeteksi dalam output observasi di atas.\n` : '') +
            (unmetGoals.length > 0 ? `- Berkas yang diminta pengguna belum terbentuk di sandbox: ${unmetGoals.join(', ')}.\n` : '') +
            `\n` +
            `INSTRUKSI KEPATUHAN KUALITAS & SKILL (WAJIB DIIKUTI):\n` +
            `1. 🚨 DILARANG KERAS MENGURANGI KUALITAS ATAU MEMBUAT BERKAS MINIMALIS POLOS (DILARANG slide_layouts[0] teks hitam putih tanpa background, dokumen Word polos tanpa callout/tabel zebra, atau spreadsheet tanpa format)! Anda WAJIB memegang teguh standar estetika dari buku skill!\n` +
            `2. JALUR PALING CEPAT & ANTI-ERROR: Manfaatkan mesin otomatis yang sudah tersedia di folder 'kits/':\n` +
            `   - Untuk PPT: Tulis <write_file path="spec.json">...</write_file> lalu <run_command>python kits/pptx_kit.py spec.json nama_file.pptx</run_command>.\n` +
            `   - Untuk DOCX: Tulis <write_file path="spec.json">...</write_file> lalu <run_command>python kits/word_kit.py spec.json nama_file.docx</run_command>.\n` +
            `   - Untuk XLSX: Tulis <write_file path="spec.json">...</write_file> lalu <run_command>python kits/excel_kit.py spec.json nama_file.xlsx</run_command>.\n` +
            `3. Analisis akar penyebab error (root cause traceback) secara kritis di dalam <thought>...</thought>.\n` +
            `4. Jika ragu dengan sintaks pustaka atau template berkas, baca skill yang tepat menggunakan <read_skill name="..." />.\n` +
            `5. Jika modul library belum terpasang (misal python-docx, openpyxl, python-pptx, matplotlib), jalankan <run_command>pip install nama_modul</run_command>.\n` +
            `6. Tulis ulang berkas skrip dengan <write_file path="..."> berisi kode perbaikan lengkap (DILARANG tanda triple backtick di dalam write_file!).\n` +
            `7. Jalankan kembali dengan <run_command>python ...</run_command>.\n` +
            `8. Verifikasi hasil berkas dengan <check_file path="..." />.\n` +
            `9. 🚨 DILARANG NGEDUMEL: Jangan mengeluh, curhat kendala teknis, atau meminta maaf berkepanjangan kepada pengguna. Langsung selesaikan perbaikan via tag aksi!`;
        } else {
          followUpInstruction = `${obsFormatted}\n\n` +
            `[STATUS EKSEKUSI RE-ACT - TINDAKAN SEBELUMNYA BERHASIL]:\n` +
            `1. BACA hasil observasi tindakan di atas.\n` +
            `2. JIKA TARGET BERKAS SUDAH SELESAI DIBUAT & DIVERIFIKASI DI SANDBOX:\n` +
            `   - 🚨 DILARANG KERAS NGEDUMEL, BERTELE-TELE, MENGULANG PENJELASAN TEKNIS, ATAU MENGURAIKAN ISI DOKUMEN BARIS DEMI BARIS (HEMAT TOKEN)!\n` +
            `   - Berikan HANYA KESIMPULAN EKSEKUTIF yang padat dan profesional:\n` +
            `     * ✅ Status: Konfirmasi pengerjaan tuntas 100%.\n` +
            `     * 📁 Berkas Jadi: Nama file dan lokasi di sandbox.\n` +
            `     * 📌 Ringkasan Intisari: 3-4 butir poin pokok penting dari materi yang dibuat.\n` +
            `     * 🚀 Panduan Akses: Petunjuk singkat untuk mengunduh / preview di panel.\n` +
            `   - JANGAN menambahkan tag aksi lagi jika semua berkas sudah siap.\n` +
            `3. JIKA TADI HANYA PENCARIAN DATA / MEMBACA SKILL & BELUM MEMBUAT BERKAS:\n` +
            `   - SEGERA LANJUTKAN dengan membuat berkas yang diminta pengguna!\n` +
            `   - Langsung tulis <write_file path="spec.json">...</write_file> lalu <run_command>python kits/pptx_designer.py spec.json presentasi.pptx</run_command> (atau kits/word_kit.py / kits/excel_kit.py).\n` +
            `   - Verifikasi dengan <check_file path="..." />.\n` +
            `4. JIKA PERLU VERIFIKASI ATAU SCREENSHOT WEB:\n` +
            `   - Jalankan <screenshot target="index.html" /> sekarang.`;
        }

        apiMessages.push({
          role: 'user',
          content: followUpInstruction
        });

        continueAutonomousLoop = true;
      } else {
        if (isSelfHealingActive) {
          updateLastStep('completed', 'Proses self-healing selesai.');
          isSelfHealingActive = false;
        }
        continueAutonomousLoop = false;
      }
    }

    if (isAborted) {
      res.end();
      return;
    }

    // Clean accumulated answer: strip any leftover reasoning tags so visible text is pristine
    accumulatedAnswer = accumulatedAnswer
      .replace(/<(?:think|thought|thinking|reasoning)[^>]*>[\s\S]*?<\/(?:think|thought|thinking|reasoning)>/gi, '')
      .replace(/<(?:think|thought|thinking|reasoning)[^>]*>[\s\S]*/gi, '')
      .replace(/\((?:do|do_search)\)\s*/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!accumulatedAnswer) {
      accumulatedAnswer = 'Seluruh tindakan dan pengerjaan berkas telah selesai diproses di dalam sandbox. Silakan periksa berkas hasil di bawah ini.';
    }

    // Final verification of files
    let finalFiles = agentSandboxService.listFiles(sessionId);

    // Safety Net: If target document was requested but not generated yet, auto-execute generator scripts
    const isCreationIntent = /\b(buat|bikin|create|generate|rancang|susun|tulis|tambahkan|edit|ubah|ganti)\b/i.test(promptLower);
    const hasPptx = finalFiles.some(f => f.ext === 'pptx');
    const hasDocx = finalFiles.some(f => f.ext === 'docx');
    const hasXlsx = finalFiles.some(f => f.ext === 'xlsx');

    const pyFiles = finalFiles.filter(f => f.ext === 'py' && f.name !== 'SKILL.md');

    if (isCreationIntent && wantsPptx && !hasPptx && pyFiles.length > 0) {
      const pptScript = pyFiles.find(f => /ppt|slide|pres/i.test(f.name)) || pyFiles[0];
      if (pptScript) {
        addStep('command', `Eksekusi Otomatis Generator PPTX`, `Menjalankan '${pptScript.name}' untuk menghasilkan presentasi PowerPoint...`, 'running');
        try {
          const res = await agentSandboxService.executeInSandbox(sessionId, { command: `python "${pptScript.name}"` });
          updateLastStep(res.success ? 'completed' : 'failed', res.success ? 'Berkas PowerPoint (.pptx) berhasil dibuat.' : `Error: ${res.stderr}`);
          finalFiles = agentSandboxService.listFiles(sessionId);
          emitEvent('files_update', { files: finalFiles });
        } catch (_) {}
      }
    }

    if (isCreationIntent && wantsDocx && !hasDocx && pyFiles.length > 0) {
      const docxScript = pyFiles.find(f => /docx|word|doc|laporan/i.test(f.name)) || pyFiles[0];
      if (docxScript) {
        addStep('command', `Eksekusi Otomatis Generator DOCX`, `Menjalankan '${docxScript.name}' untuk menghasilkan dokumen Word...`, 'running');
        try {
          const res = await agentSandboxService.executeInSandbox(sessionId, { command: `python "${docxScript.name}"` });
          updateLastStep(res.success ? 'completed' : 'failed', res.success ? 'Dokumen Word (.docx) berhasil dibuat.' : `Error: ${res.stderr}`);
          finalFiles = agentSandboxService.listFiles(sessionId);
          emitEvent('files_update', { files: finalFiles });
        } catch (_) {}
      }
    }

    if (isCreationIntent && wantsXlsx && !hasXlsx && pyFiles.length > 0) {
      const xlsxScript = pyFiles.find(f => /xlsx|excel|sheet/i.test(f.name)) || pyFiles[0];
      if (xlsxScript) {
        addStep('command', `Eksekusi Otomatis Generator XLSX`, `Menjalankan '${xlsxScript.name}' untuk menghasilkan spreadsheet Excel...`, 'running');
        try {
          const res = await agentSandboxService.executeInSandbox(sessionId, { command: `python "${xlsxScript.name}"` });
          updateLastStep(res.success ? 'completed' : 'failed', res.success ? 'Spreadsheet Excel (.xlsx) berhasil dibuat.' : `Error: ${res.stderr}`);
          finalFiles = agentSandboxService.listFiles(sessionId);
          emitEvent('files_update', { files: finalFiles });
        } catch (_) {}
      }
    }

    if (!hasPreview && finalFiles.some(f => f.ext === 'html')) {
      hasPreview = true;
      previewFile = finalFiles.find(f => f.ext === 'html').path;
    }

    const previewUrl = hasPreview ? `/api/agent/preview/${sessionId}/${previewFile}` : null;

    // Capture or resolve visual preview (screenshot of HTML or chart image)
    const visualPreview = await agentScreenshotService.getSessionVisualPreview(sessionId);
    const screenshotUrl = visualPreview ? visualPreview.url : null;

    // Check which files were genuinely created or modified in THIS turn
    const newlyChangedFiles = finalFiles.filter(f => {
      if (f.path === 'SKILL.md' || f.path.startsWith('_runner_temp') || (f.ext && f.ext.endsWith('pyc'))) return false;
      const prev = existingFileMap.get(f.path);
      if (!prev) return true; // Newly created in this turn!
      if (prev.size !== f.size) return true; // Size changed in this turn!
      const mtime = new Date(f.updatedAt).getTime();
      if (mtime >= turnStartTime - 1000) return true; // Modified in this turn!
      return false;
    });

    const userExplicitlyRequestedFiles = /\b(unduh|download|kirim\s*lagi|mana\s*file|lihat\s*file|minta\s*file|berkas|file\s*tadi|hasil\s*file|unduh\s*berkas|link\s*file|file(?:nya)?)\b/i.test(promptLower);

    // AI Cerdas: Only attach file deliverable cards if files were explicitly sent, modified/created, or user explicitly asked!
    let relevantFiles = [];
    if (sentFilePaths && sentFilePaths.size > 0) {
      // Prioritize files explicitly sent via <send_file path="..." />
      const explicitlySent = finalFiles.filter(f => sentFilePaths.has(f.path) || sentFilePaths.has(f.name));
      const autoDeliverables = agentSandboxService.getRelevantDeliverables(finalFiles, prompt);
      const combined = [...explicitlySent];
      for (const f of autoDeliverables) {
        if (!combined.some(c => c.path === f.path)) {
          combined.push(f);
        }
      }
      relevantFiles = combined;
    } else if (newlyChangedFiles.length > 0 || (fileActionExecuted && finalFiles.length > 0)) {
      relevantFiles = agentSandboxService.getRelevantDeliverables(finalFiles, prompt);
    } else if (userExplicitlyRequestedFiles && finalFiles.length > 0) {
      relevantFiles = agentSandboxService.getRelevantDeliverables(finalFiles, prompt);
    } else {
      // Conversational message, follow-up, or simple question -> DO NOT re-attach old file cards!
      relevantFiles = [];
    }

    const finishMessage = relevantFiles.length > 0
      ? `Seluruh tugas berhasil dieksekusi dengan ${relevantFiles.length} berkas utama siap diunduh.`
      : `Pertanyaan berhasil dijawab dan proses selesai.`;

    addStep('finish', 'Selesai', finishMessage, 'running');
    updateLastStep('completed', finishMessage, {
      totalFiles: relevantFiles.length,
      previewUrl,
      screenshotUrl
    });

    // Save final assistant message to DB
    const botMsgId = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    agentMessageDb.create(
      botMsgId,
      sessionId,
      userId,
      'assistant',
      accumulatedAnswer,
      chainOfWork,
      relevantFiles,
      screenshotUrl || previewUrl,
      accumulatedReasoning || null
    );

    // Emit final 'done' event
    emitEvent('done', {
      messageId: botMsgId,
      content: accumulatedAnswer,
      reasoning: accumulatedReasoning || null,
      chainOfWork,
      files: relevantFiles,
      allFiles: finalFiles,
      previewUrl,
      screenshotUrl,
      activeSkill: activeSkill ? {
        id: activeSkill.id,
        file: activeSkill.file,
        title: activeSkill.title,
        category: activeSkill.category
      } : null
    });

    // Automatically remember turn in long-term and cross-session memory (Autonomous Agent Standard)
    agentMemoryService.rememberTurn(
      userId,
      sessionId,
      prompt,
      accumulatedAnswer,
      relevantFiles,
      accumulatedReasoning
    ).catch(err => console.warn('[AGENT MEMORY] Error saving turn memory:', err.message));

    res.end();
  } catch (runErr) {
    if (isAborted) {
      res.end();
      return;
    }
    console.error('[AGENT_RUN_ERROR]', runErr);
    addStep('error', 'Terjadi Kendala', runErr.message, 'failed');
    emitEvent('error', { error: runErr.message, chainOfWork });
    res.end();
  }
});

export default router;
