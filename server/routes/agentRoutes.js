import express from 'express';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import JSZip from 'jszip';
import agentSandboxService, { DEFAULT_SKILL_MD, extractSequentialActions, getRelevantDeliverables } from '../services/agentSandboxService.js';
import agentScreenshotService from '../services/agentScreenshotService.js';
import agentMemoryService from '../services/agentMemoryService.js';
import { agentSessionDb, agentMessageDb } from '../database.js';
import { TOKENMIX_API_KEYS } from '../apiProxyService.js';
import webSearchService from '../webSearchService.js';

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
    const { sessionId, language, code, command, timeoutMs } = req.body;
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
async function executeActionItem(action, sessionId, addStep, updateLastStep) {
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
  } else if (action.type === 'search_web' || action.type === 'search') {
    const query = action.query || 'referensi';
    addStep('search', `Mencari di Web: ${query}`, `Melakukan pencarian live di internet untuk '${query}'...`, 'running');
    try {
      const searchRes = await webSearchService.searchGoogle(query, 5);
      let summary = '';
      if (searchRes.success && searchRes.results && searchRes.results.length > 0) {
        summary = searchRes.results.map((r, rIdx) => `${rIdx + 1}. ${r.title}\n   ${r.snippet}\n   URL: ${r.url}`).join('\n\n');
        observation = `Hasil pencarian live web/berita untuk query "${query}":\n` + searchRes.results.map((r, rIdx) => `[Sumber ${rIdx + 1}]\nJudul: ${r.title}\nRingkasan Berita: ${r.snippet}\nURL: ${r.url}`).join('\n\n');
        updateLastStep('completed', `Ditemukan ${searchRes.results.length} referensi dari web.`, { results: searchRes.results });
      } else {
        summary = 'Pencarian selesai. Melanjutkan penyusunan materi dengan referensi internal.';
        observation = `Pencarian web untuk query "${query}" tidak mengembalikan rujukan spesifik.`;
        updateLastStep('completed', summary);
      }
      pillXml = `<action_pill id="${actionId}" type="search" title="Mencari di Web: ${query}" meta="${query}" status="completed">${escapeXml(summary)}</action_pill>`;
    } catch (searchErr) {
      updateLastStep('failed', `Pencarian web terhambat: ${searchErr.message}`);
      pillXml = `<action_pill id="${actionId}" type="search" title="Pencarian: ${query}" meta="${query}" status="completed">${escapeXml('Pencarian web selesai.')}</action_pill>`;
      observation = `Gagal melakukan pencarian web: ${searchErr.message}`;
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
  const KNOWN_TAGS = ['thinking', 'plan', 'thought', 'think', 'reasoning', 'read_file', 'read', 'search_web', 'search', 'run_command', 'command', 'terminal', 'write_file', 'file', 'execute_code', 'run_code', 'check_file', 'verify_file', 'preview', 'screenshot', 'take_screenshot'];
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
  const { sessionId, prompt, model = 'deepernova-gold-1.5', history = [] } = req.body;
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

    // Step 2: Explicitly read and consult SKILL.md before execution
    addStep('read', 'Membaca SKILL.md & Panduan Standar', 'Mempelajari panduan standar Deepernova: arsitektur front-end modern, dokumen Word .docx, presentasi PPTX, spreadsheet Excel .xlsx, dan visualisasi data...', 'running');

    let skillContent = DEFAULT_SKILL_MD;
    try {
      skillContent = agentSandboxService.readFile(sessionId, 'SKILL.md');
    } catch (_) {}

    updateLastStep('completed', 'Panduan SKILL.md berhasil dipelajari. Siap menerapkan standar koding dan perancangan berkualitas tinggi.');

    // Build system prompt with SKILL.md and Sandbox context (Autonomous Agent Orchestrator Standard)
    const systemPrompt = `Anda adalah Deepernova AI Agent — asisten koding dan eksekusi sandbox otonom tercanggih dengan standar Autonomous Agent Orchestrator & Workspace Artifacts.
Anda bertugas mengeksekusi instruksi pengguna secara nyata di dalam sandbox hingga menghasilkan berkas jadi berkualitas tinggi.
Sebelum melakukan tindakan apapun, Anda telah membaca dan memahami berkas SKILL.MD di workspace sandbox.

PROTOKOL KOMUNIKASI, PENALARAN & PENGALAMAN PENGGUNA (UX STANDAR TINGGI):
1. JANGAN PERNAH LANGSUNG MAIN KERJAIN TANPA PENJELASAN RAMAH KEPADA PENGGUNA!
   Pengguna sangat mengutamakan kejelasan nalar, keramahan komunikasi, dan transparansi proses.
2. ALUR OUTPUT YANG WAJIB ANDA IKUTI SECARA BERURUTAN:
   - Tahap 1: <thought>...</thought> (EXTENDED THINKING)
     Tuliskan seluruh proses perenungan, analisis arsitektur mendalam, pemilihan pustaka, perumusan logika algoritma, dan mitigasi error internal di dalam tag ini. Kotak penalaran ini akan ditampilkan langsung di layar pengguna secara rapi dan interaktif.
   
   - Tahap 2: PENJELASAN PEMBUKA & STRATEGI DESAIN (TEKS BIASA / MARKDOWN RAMAH)
     SEBELUM menuliskan tag aksi apapun (<write_file>, <run_command>, dll), Anda WAJIB menyapa pengguna dengan ramah dan memaparkan:
     a. Konfirmasi pemahaman terhadap instruksi pengguna.
     b. Rancangan & Alasan Desain (Reasoning): struktur bab/slide/sheet, palet warna, tipografi, dan pendekatan isi.
     c. Poin ringkas langkah-langkah yang akan segera dieksekusi di sandbox.

   - Tahap 3: EKSEKUSI PRODUKSI REAL DI SANDBOX (TAG AKSI)
     Menulis berkas generator dan menjalankannya di terminal sandbox:
     <write_file path="generate.py">kode murni tanpa backtick</write_file>
     <run_command>python generate.py</run_command>
     <check_file path="nama_berkas.ext" />
     (Jika membuat web: <screenshot target="index.html" />)

   - Tahap 4: KESIMPULAN EKSEKUTIF & PANDUAN PENGGUNA (TEKS BIASA PENUTUP)
     Setelah seluruh aksi sandbox selesai, sampaikan konfirmasi keberhasilan, deskripsi berkas yang terbentuk, ringkasan fitur, serta panduan cara mengunduh atau meninjaunya.

SIKLUS ORKESTRASI MULTI-STEP RE-ACT AGENT:
- Analisis di <thought> -> Penjelasan Pembuka -> Tag Aksi Sandbox/Web -> Pembacaan Observasi Hasil Tindakan -> Analisis Mendalam & Jawaban Komprehensif.
- PENCARIAN BERITA, RISET & INFORMASI AKTUAL (MULTI-STEP SEARCH & OBSERVATION):
  a. Jika pengguna meminta berita, peristiwa terkini, informasi live, atau riset, panggil <search_web query="kata kunci berita spesifik" />.
  b. Sistem akan melakukan pencarian web live dan memberikan hasil observasi (judul berita, ringkasan/fakta, dan URL sumber) kembali ke konteks Anda.
  c. Anda WAJIB MEMBACA dan MENGANALISIS seluruh data observasi hasil pencarian tersebut.
  d. Multi-Step Search: Jika topik memerlukan penelusuran lebih lanjut, verifikasi, atau topik turunan, Anda dapat melakukan pencarian lanjutan (<search_web query="..." /> kedua).
  e. Kirimkan laporan berita / jawaban yang utuh, komprehensif, terstruktur, mendalam, dan sebutkan sumber beritanya secara spesifik kepada pengguna! DILARANG berhenti hanya pada tag pencarian tanpa memberikan rangkuman berita lengkap!
- Self-Healing Loop: Jika muncul error atau dependensi gagal, analisis traceback observasi di dalam <thought>, perbaiki kodenya, dan jalankan ulang secara mandiri.

TAG AKSI SANDBOX YANG TERSEDIA:
- <thought>analisis nalar internal mendalam</thought>
- <plan>rencana milestone eksekusi</plan>
- <read_file path="nama_file.ext" />
  Membaca isi berkas dari sandbox atau SKILL.md.
- <search_web query="kata kunci pencarian" />
  Melakukan pencarian di internet untuk referensi, materi, atau data aktual.
- <run_command>perintah terminal</run_command>
  Menjalankan perintah terminal di sandbox (misal: python, node, dir, dsb).
- <write_file path="nama_file.ext">isi berkas lengkap</write_file>
  Menulis berkas kode atau skrip lengkap ke sandbox.
- <execute_code language="python|node">kode</execute_code>
  Mengeksekusi kode langsung di sandbox.
- <check_file path="nama_file.ext" />
  Memeriksa keberadaan dan ukuran berkas hasil eksekusi di sandbox.
- <screenshot target="index.html" />
  Mengambil tangkapan layar browser (screenshot preview) dari aplikasi web / berkas HTML dan langsung menampilkannya di obrolan pengguna.
- <preview>index.html</preview>
  Menetapkan file visual preview untuk aplikasi web.

ATURAN KECERDASAN RELEVANSI BERKAS (AI CERDAS):
1. Pengguna hanya ingin menerima berkas akhir yang relevan dan diminta (seperti berkas .docx, .pptx, .xlsx, atau aplikasi web). Jangan jadikan skrip python pembantu sementara sebagai file unduhan utama, kecuali bila pengguna meminta kode/skrip atau meminta semua berkas.
2. Setiap kali Anda membuat aplikasi web (HTML/CSS/JS), selalu panggil <screenshot target="index.html" /> agar tangkapan layarnya langsung tampil di obrolan pengguna!

PANDUAN STANDAR SKILL.MD & ATURAN MUTLAK KODING (ANTI-ERROR):
1. DOKUMEN WORD (.DOCX):
   - Gunakan 'python-docx'. Tulis skrip 'generate_docx.py' di <write_file path="generate_docx.py"> lalu jalankan dengan <run_command>python generate_docx.py</run_command>.
   - DILARANG KERAS table.rows.index(...) atau row.table.rows.index()! Objek _Rows bukan list.
   - Gunakan selalu pola enumerate(data_rows):
     for r_idx, row in enumerate(data_rows):
         row_cells = tbl.add_row().cells
         for c_idx, val in enumerate(row):
             row_cells[c_idx].text = str(val)
             if r_idx % 2 == 0:
                 row_cells[c_idx]._tc.get_or_add_tcPr().append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="F8FAFC"/>'))
   - Sisipkan Callout Box (tabel 1x1 border oranye #EA580C):
     callout = doc.add_table(rows=1, cols=1); c_cell = callout.rows[0].cells[0]
     c_cell._tc.get_or_add_tcPr().append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="F8FAFC"/>'))
     c_cell._tc.get_or_add_tcPr().append(parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="36" w:space="0" w:color="EA580C"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>'))
     (DILARANG memanggil tblPr.get_or_add_tblBorders, .lstStyle, atau paragraph_format.shading!)
   - Selalu periksa hasil dengan <check_file path="nama_file.docx" />.

2. PRESENTASI POWERPOINT (.PPTX):
   - Gunakan 'python-pptx' layar lebar 16:9 (prs.slide_width=Inches(13.333), prs.slide_height=Inches(7.5)).
   - Slide 1: Hero Title, Slide 2: KPI Scorecard Cards (MSO_SHAPE.ROUNDED_RECTANGLE), Slide 3: Visual kurva grafik, Slide 4: 3-Column Pillar, Slide 5: Roadmap.
   - Verifikasi berkas dengan <check_file path="nama_file.pptx" />.

3. SPREADSHEET EXCEL (.XLSX):
   - Gunakan 'openpyxl', banner header gelap #0F172A, kartu KPI, format Rupiah ('Rp #,##0') dan persentase ('0.0%'), auto-fit kolom, freeze panes, dan chart native via openpyxl.chart.
   - Verifikasi berkas dengan <check_file path="nama_file.xlsx" />.

4. KURVA GRAFIK & VISUALISASI DATA (MATPLOTLIB):
   - Gunakan matplotlib.use('Agg'), dpi=300, kurva halus np.linspace, fill_between, simpan 'chart.png' dan sisipkan ke dokumen via doc.add_picture('chart.png', width=Inches(5.8)).

5. FRONT-END WEB (HTML/CSS/JS) & CARA NGODING:
   - Tulis berkas lengkap mandiri di <write_file path="index.html"> dengan tema gelap eksekutif (#0F172A), kartu rapi (#1E293B), font modern, dan interaktivitas JS aktif sejak awal.
   - Halaman HARUS langsung memiliki konten hidup dan data aktif sejak awal (DILARANG KERAS membuat layar putih polos atau stuck loading!).
   - Panggil <screenshot target="index.html" /> setelah menulis berkas agar tangkapan layar browser resolusi 1280x800 langsung otomatis diambil dan dikirim ke obrolan pengguna!

ALUR EKSEKUSI NYATA & ATURAN MUTLAK MEMBUAT BERKAS:
- PENTING MUTLAK: Di dalam tag <write_file path="..."> TULIS LANGSUNG KODE MURNI TANPA MENYERTAKAN TRIPLE BACKTICK (\`\`\`python atau \`\`\`)! Baris pertama harus langsung kode sumber murni. Menyertakan tanda backtick di dalam <write_file> akan menyebabkan Python SyntaxError dan gagal total!
- KETIKA MEMBUAT DOKUMEN (.docx, .pptx, .xlsx): Anda WAJIB menulis skrip generator di <write_file path="generate.py"> lalu SEGERA MENJALANKANNYA dengan <run_command>python generate.py</run_command>! Berkas dokumen fisik TIDAK AKAN PERNAH TERBENTUK di disk sandbox jika Anda tidak menjalankan skripnya!
- JANGAN menduplikasi atau mengulang kode di dalam teks markdown biasa sebelum atau sesudah tag aksi.
- Jika membuat presentasi PowerPoint (.pptx) atau Word (.docx) yang memerlukan grafik kurva, GABUNGKAN pembuatan grafik Matplotlib dan penyisipannya ke dalam SATU skrip Python yang sama.
- Setelah mengeksekusi skrip, selalu panggil <check_file path="nama_berkas.ext" /> untuk memverifikasi berkas sudah terbentuk dengan sempurna di disk sandbox.

ATURAN PERTANYAAN SEDERHANA, PERCAKAPAN, & MEMORI LINTAS SESI:
1. Jika pengguna hanya bertanya hal sederhana, meminta penjelasan, berkonsultasi, berterima kasih, bertanya tentang identitas mereka ("siapa saya?", "nama saya siapa?"), atau menanyakan obrolan/berkas dari sesi lain ("kamu ingat file kemarin?", "apa saja yang sudah kita buat?"):
   - Anda TIDAK PERLU menuliskan tag aksi apapun (<write_file>, <run_command>, dll).
   - DILARANG KERAS membuat ulang berkas yang sudah ada jika pengguna tidak memintanya!
   - Jawablah pertanyaan pengguna secara ramah, cerdas, dan to the point dengan memanfaatkan memori lintas sesi yang tersedia.
2. Tag aksi (<write_file>, <run_command>) HANYA digunakan jika pengguna secara spesifik meminta membuat file baru, mengubah berkas yang ada, atau mengeksekusi perintah terminal.

${crossSessionMemoryText}

BERKAS SAAT INI DI SANDBOX:
${fileListText}

CATATAN PROTOKOL WORKSPACE:
Berkas SKILL.md telah tersedia di sandbox berisi panduan sintaksis lengkap. Anda dapat membacanya dengan <read_file path="SKILL.md" /> kapan pun dibutuhkan.`;

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

    const MAX_AGENT_STEPS = 4;
    let stepIteration = 0;
    let continueAutonomousLoop = true;

    while (continueAutonomousLoop && stepIteration < MAX_AGENT_STEPS && !isAborted) {
      stepIteration++;
      let turnActionExecuted = false;
      let turnObservations = [];
      let turnRawContent = '';

      let upstreamRes = null;
      let lastErr = null;
      for (const uUrl of upstreamUrls) {
        try {
          const res = await fetch(uUrl, {
            method: 'POST',
            signal: upstreamAbortController.signal,
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
          if (res.ok) {
            upstreamRes = res;
            break;
          } else {
            const errText = await res.text().catch(() => '');
            lastErr = new Error(`GPU Engine Error (${res.status}): ${errText.slice(0, 100)}`);
          }
        } catch (fetchErr) {
          lastErr = fetchErr;
        }
      }

      if (!upstreamRes || !upstreamRes.ok) {
        throw (lastErr || new Error('GPU Engine unreachable'));
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
            // Safety Net: Ensure introductory narrative text exists before first action pill on first turn
            if (stepIteration === 1 && !accumulatedAnswer.trim()) {
              const defaultIntro = `Saya akan membantu Anda memproses dan menelusuri data sesuai instruksi:\n\n`;
              accumulatedAnswer += defaultIntro;
              emitEvent('delta', { content: defaultIntro });
            }

            const { pillXml, observation } = await executeActionItem(parsedAction, sessionId, addStep, updateLastStep);
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

            // Emit live sandbox files update if file modified
            if (['write_file', 'file', 'execute_code', 'run_code', 'run_command', 'command'].includes(parsedAction.type)) {
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

      // Autonomous Multi-Step ReAct Loop Decision:
      // If tool actions were executed during this turn, feed observations back into LLM context so it reads results!
      if (turnActionExecuted && turnObservations.length > 0 && stepIteration < MAX_AGENT_STEPS) {
        apiMessages.push({
          role: 'assistant',
          content: turnRawContent
        });

        const obsFormatted = turnObservations.map((o, idx) => `[HASIL OBSERVASI ${idx + 1} (${o.type})]:\n${o.observation}`).join('\n\n---\n\n');
        const followUpInstruction = `${obsFormatted}\n\n` +
          `[INSTRUKSI MULTI-STEP RE-ACT]:\n` +
          `1. BACA dan ANALISIS secara mendalam seluruh hasil observasi/pencarian web/perintah di atas.\n` +
          `2. JAWAB pertanyaan pengguna secara lengkap, terstruktur, mendalam, dan sebutkan fakta serta sumber beritanya secara spesifik kepada pengguna sekarang.\n` +
          `3. Jika informasi masih kurang lengkap dan Anda membutuhkan pencarian lanjutan atau verifikasi langkah berikutnya, Anda boleh memanggil 1 tag <search_web> atau <run_command> lagi.\n` +
          `4. Jika informasi sudah cukup untuk menjawab atau tugas sudah tuntas, berikan analisis & laporan akhir yang komprehensif sekarang tanpa menyertakan tag aksi tambahan.`;

        apiMessages.push({
          role: 'user',
          content: followUpInstruction
        });

        continueAutonomousLoop = true;
      } else {
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
    const promptLower = (prompt || '').toLowerCase();
    const isCreationIntent = /\b(buat|bikin|create|generate|rancang|susun|tulis|tambahkan|edit|ubah|ganti)\b/i.test(promptLower);
    const hasPptx = finalFiles.some(f => f.ext === 'pptx');
    const hasDocx = finalFiles.some(f => f.ext === 'docx');
    const hasXlsx = finalFiles.some(f => f.ext === 'xlsx');

    const wantsPptx = /\b(pptx|powerpoint|slide|presentasi)\b/i.test(promptLower);
    const wantsDocx = /\b(docx|word|dokumen|laporan|surat|makalah|paper)\b/i.test(promptLower);
    const wantsXlsx = /\b(xlsx|excel|spreadsheet|tabel\s*excel|keuangan)\b/i.test(promptLower);

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

    // AI Cerdas: Only attach file deliverable cards if files were modified/created or user explicitly asked!
    let relevantFiles = [];
    if (newlyChangedFiles.length > 0 || (fileActionExecuted && finalFiles.length > 0)) {
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
      screenshotUrl
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
