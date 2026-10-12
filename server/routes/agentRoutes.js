import express from 'express';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import JSZip from 'jszip';
import agentSandboxService, { DEFAULT_SKILL_MD, extractSequentialActions } from '../services/agentSandboxService.js';
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
  return req.user?.id || req.session?.userId || 'guest_agent_user';
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

// ============================================================================
// 4. AUTONOMOUS AGENT RUN PIPELINE (LIVE STREAMING CHAIN-OF-WORK)
// ============================================================================

// Helper to execute single sandbox action item and generate action_pill XML
async function executeActionItem(action, sessionId, addStep, updateLastStep) {
  const actionId = `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  let pillXml = '';

  if (action.type === 'thought') {
    addStep('thought', 'Catatan Berpikir Agent', action.content, 'completed');
    pillXml = `<action_pill id="${actionId}" type="thought" title="Catatan Berpikir AI" status="completed">${escapeXml(action.content)}</action_pill>`;
  } else if (action.type === 'read_file' || action.type === 'read') {
    const targetPath = action.path || 'SKILL.md';
    addStep('read', `Membaca: ${targetPath}`, `Membaca berkas '${targetPath}' dari workspace...`, 'running');
    try {
      const content = agentSandboxService.readFile(sessionId, targetPath);
      const previewContent = content.length > 2500 ? content.slice(0, 2500) + '\n... (konten dipotong)' : content;
      updateLastStep('completed', `Berhasil membaca '${targetPath}' (${content.length} karakter).`, { content: previewContent });
      pillXml = `<action_pill id="${actionId}" type="read" title="Membaca ${targetPath}" meta="${targetPath}" status="completed">${escapeXml(previewContent)}</action_pill>`;
    } catch (readErr) {
      updateLastStep('failed', `Gagal membaca berkas: ${readErr.message}`);
      pillXml = `<action_pill id="${actionId}" type="read" title="Gagal Membaca ${targetPath}" meta="${targetPath}" status="failed">${escapeXml(readErr.message)}</action_pill>`;
    }
  } else if (action.type === 'search_web' || action.type === 'search') {
    const query = action.query || 'referensi';
    addStep('search', `Mencari di Web: ${query}`, `Melakukan pencarian live di internet untuk '${query}'...`, 'running');
    try {
      const searchRes = await webSearchService.searchGoogle(query, 3);
      let summary = '';
      if (searchRes.success && searchRes.results && searchRes.results.length > 0) {
        summary = searchRes.results.map((r, rIdx) => `${rIdx + 1}. ${r.title}\n   ${r.snippet}\n   URL: ${r.url}`).join('\n\n');
        updateLastStep('completed', `Ditemukan ${searchRes.results.length} referensi dari web.`, { results: searchRes.results });
      } else {
        summary = 'Pencarian selesai. Melanjutkan penyusunan materi dengan referensi internal.';
        updateLastStep('completed', summary);
      }
      pillXml = `<action_pill id="${actionId}" type="search" title="Mencari di Web: ${query}" meta="${query}" status="completed">${escapeXml(summary)}</action_pill>`;
    } catch (searchErr) {
      updateLastStep('failed', `Pencarian web terhambat: ${searchErr.message}`);
      pillXml = `<action_pill id="${actionId}" type="search" title="Pencarian: ${query}" meta="${query}" status="completed">${escapeXml('Pencarian web selesai.')}</action_pill>`;
    }
  } else if (action.type === 'write_file' || action.type === 'file') {
    const targetPath = action.path || 'script.js';
    addStep('file_write', `Menulis Berkas: ${targetPath}`, `Menulis isi berkas (${action.content ? action.content.length : 0} karakter)...`, 'running');
    try {
      const written = agentSandboxService.writeFile(sessionId, targetPath, action.content || '');
      updateLastStep('completed', `Berkas '${written.path}' berhasil dibuat/diperbarui (${(written.size / 1024).toFixed(2)} KB).`, { filePath: written.path });
      pillXml = `<action_pill id="${actionId}" type="write" title="Menulis Berkas: ${targetPath}" meta="${targetPath}" status="completed">${escapeXml(action.content || '')}</action_pill>`;
    } catch (writeErr) {
      updateLastStep('failed', `Gagal menulis berkas: ${writeErr.message}`);
      pillXml = `<action_pill id="${actionId}" type="write" title="Gagal Menulis ${targetPath}" meta="${targetPath}" status="failed">${escapeXml(writeErr.message)}</action_pill>`;
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
    } catch (execErr) {
      updateLastStep('failed', `Gagal eksekusi: ${execErr.message}`);
      pillXml = `<action_pill id="${actionId}" type="execute" title="Eksekusi Gagal" meta="${lang}" status="failed">${escapeXml(execErr.message)}</action_pill>`;
    }
  } else if (action.type === 'run_command' || action.type === 'command' || action.type === 'terminal') {
    const cmd = action.command || '';
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
    } catch (cmdErr) {
      updateLastStep('failed', `Gagal command: ${cmdErr.message}`);
      pillXml = `<action_pill id="${actionId}" type="command" title="Perintah Terminal Gagal" meta="${cmd}" status="failed">${escapeXml(cmdErr.message)}</action_pill>`;
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
    } catch (checkErr) {
      updateLastStep('failed', checkErr.message);
      pillXml = `<action_pill id="${actionId}" type="check" title="Pemeriksaan Berkas: ${targetPath}" meta="${targetPath}" status="failed">${escapeXml(checkErr.message)}</action_pill>`;
    }
  } else if (action.type === 'preview') {
    const previewFile = action.entryFile || 'index.html';
    addStep('preview', 'Live Web Preview', `Entry point: ${previewFile}`, 'completed');
    pillXml = `<action_pill id="${actionId}" type="preview" title="Web Preview Siap" meta="${previewFile}" status="completed">Entry point: ${escapeXml(previewFile)}</action_pill>`;
  }

  return pillXml;
}

// Stream Action Parser to separate narrative text chunks from XML action tags
function createStreamActionParser(callbacks) {
  let buffer = '';
  const KNOWN_TAGS = ['thought', 'read_file', 'read', 'search_web', 'search', 'run_command', 'command', 'terminal', 'write_file', 'file', 'execute_code', 'run_code', 'check_file', 'verify_file', 'preview'];
  let queue = Promise.resolve();

  async function processChunk(chunk) {
    buffer += chunk;

    while (buffer.length > 0) {
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
        break; // Wait for closing tag
      }

      const fullTag = buffer.slice(0, closeTagIndex + closeTagStr.length);
      buffer = buffer.slice(closeTagIndex + closeTagStr.length);
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

    agentSandboxService.getSandboxDir(sessionId);
    const existingFiles = agentSandboxService.listFiles(sessionId);
    const fileListText = existingFiles.map(f => `- ${f.path} (${(f.size / 1024).toFixed(1)} KB)`).join('\n') || '(Belum ada berkas)';

    let skillContent = DEFAULT_SKILL_MD;
    try {
      skillContent = agentSandboxService.readFile(sessionId, 'SKILL.md');
    } catch (_) {}

    updateLastStep('completed', `Workspace sandbox siap (${existingFiles.length} berkas terdeteksi).`);

    // Build system prompt with SKILL.md and Sandbox context
    const systemPrompt = `Anda adalah Deepernova AI Agent — asisten koding dan eksekusi sandbox otonom tercanggih.
Anda dapat berdiskusi secara interaktif dan langsung mengeksekusi aksi nyata di dalam lingkungan sandbox.

GAYA KOMUNIKASI & PERILAKU ANDA:
1. Berbicaralah secara hangat, komunikatif, dan alami dalam Bahasa Indonesia. Tetaplah ramah dan santai layaknya rekan kerja profesional.
2. Jelaskan langkah yang akan atau sedang Anda lakukan di antara aksi-aksi Anda (interleaved narrative workflow).
3. JANGAN PERNAH menulis teks pura-pura seperti "(do)" atau "(do_search)". Cukup tulis percakapan Anda dan gunakan tag aksi XML nyata. Sistem akan otomatis mengubah aksi Anda menjadi tombol pill interaktif yang dapat diklik oleh pengguna.
4. JANGAN menuliskan blok kode markdown triple-backtick di luar tag aksi jika kode tersebut sudah dibuat di dalam <write_file path="...">. Cukup jelaskan rencana Anda dengan ramah lalu letakkan kode di dalam tag aksi.
5. Tulis kode nyata, lengkap, dan tanpa placeholder.

TAG AKSI SANDBOX YANG TERSEDIA:
- <read_file path="nama_file.ext" />
  Membaca isi berkas dari sandbox atau SKILL.md.
- <search_web query="kata kunci pencarian" />
  Melakukan pencarian di internet untuk referensi, inspirasi materi/puisi/laporan, atau data aktual.
- <run_command>perintah terminal</run_command>
  Menjalankan perintah terminal di sandbox (misal: pip, dir, node, dsb).
- <write_file path="nama_file.ext">isi berkas lengkap</write_file>
  Menulis berkas kode atau skrip lengkap ke sandbox.
- <execute_code language="python|node">kode untuk dieksekusi</execute_code>
  Mengeksekusi kode langsung di sandbox dan menangkap output terminalnya.
- <check_file path="nama_file.ext" />
  Memeriksa keberadaan dan ukuran berkas hasil eksekusi di sandbox.
- <preview>index.html</preview>
  (Opsional) Menetapkan file visual preview untuk aplikasi web.

PETUNJUK KEAHLIAN MASTER OFFICE & KURVA GRAFIK (.DOCX, .PPTX, .XLSX, MATPLOTLIB):
Pustaka Python 'python-docx', 'python-pptx', 'openpyxl', 'matplotlib', 'numpy', dan 'pandas' SUDAH TERPASANG di sistem dan siap dieksekusi!

1. JIKA PENGGUNA MEMINTA DOKUMEN WORD (.DOCX):
   - Jangan pernah membuat dokumen polos tanpa format! Terapkan standar laporan eksekutif (McKinsey/BCG style).
   - Terapkan elemen wajib:
     a) Judul besar berkelas (24-28pt bold) dan subjudul.
     b) Callout Box 1x1:
        c_cell = doc.add_table(rows=1, cols=1).rows[0].cells[0]
        c_cell._tc.get_or_add_tcPr().append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="F8FAFC"/>'))
        c_cell._tc.get_or_add_tcPr().append(parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="36" w:color="EA580C"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>'))
     c) Tabel Bergaya: Buat tabel 1 baris header tbl = doc.add_table(rows=1, cols=...). Header sel cell._tc.get_or_add_tcPr().append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="0F172A"/>')), teks putih bold (from docx.shared import RGBColor; run.font.color.rgb = RGBColor(255, 255, 255)). Tambahkan data dengan row_cells = tbl.add_row().cells (otomatis aman tanpa IndexError!), beri zebra striping baris genap 'F8FAFC'.
     d) Visualisasi Grafik & Kurva: Buat kurva Matplotlib (dpi=300), simpan sebagai 'chart.png', lalu sisipkan ke dokumen via doc.add_picture('chart.png', width=Inches(5.8))!
     e) Kartu Scorecard KPI jika memuat metrik kuantitatif.

2. JIKA PENGGUNA MEMINTA PRESENTASI POWERPOINT (.PPTX):
   - Gunakan 'python-pptx' dengan RASIO LAYAR LEBAR 16:9 (prs.slide_width = Inches(13.333), prs.slide_height = Inches(7.5)).
   - Terapkan estetika Pitch Deck Unicorn / Apple Keynote (pilih Dark Executive Theme '#0F172A' atau Clean Light Theme '#F8FAFC').
   - Desain slide wajib:
     a) Slide 1: Hero Title (Judul 40-44pt bold, Subjudul 20pt aksen oranye, tag penulis/tanggal).
     b) Slide 2: KPI Scorecard Cards (3-4 kotak rounded rectangle MSO_SHAPE.ROUNDED_RECTANGLE dengan angka raksasa 36pt bold dan label).
     c) Slide 3: Data Visual & Kurva Grafik (Sisipkan grafik Matplotlib resolusi tinggi slide.shapes.add_picture).
     d) Slide 4: 3-Column Feature Cards / Struktur Pilar.
     e) Slide 5: Roadmap Milestone / Kesimpulan & Langkah Strategis.

3. JIKA PENGGUNA MEMINTA SPREADSHEET EXCEL (.XLSX):
   - Gunakan 'openpyxl' untuk merancang dashboard keuangan atau model data korporat (bukan sheet mentah polos!).
   - Terapkan:
     a) Baris 1: Header Banner Gelap ('#0F172A'), tinggi 32pt, teks putih tebal (13pt).
     b) Baris 3-4: Kartu KPI Summary (Total Pendapatan, Pertumbuhan %, Laba Bersih) dengan angka besar berwarna.
     c) Baris 6+: Tabel data ber-header gelap '#1E293B', teks putih bold, zebra striping '#F8FAFC', border tipis.
     d) Format Angka Resmi: Rupiah ('Rp #,##0'), Persentase ('0.0%'), Angka ('#,##0').
     e) Auto-fit lebar kolom (hitung max panjang teks + 3 padding) agar kolom tidak terpotong (###).
     f) Freeze Panes: ws.freeze_panes = 'A7'. Gridlines aktif: ws.views.sheetView[0].showGridLines = True.
     g) Grafik Interaktif Native: Buat LineChart atau BarChart menggunakan 'openpyxl.chart' dan tempelkan di ws.add_chart(chart, "G3")!

4. JIKA PERLU MEMBUAT KURVA GRAFIK / DATA VISUALIZATION (MATPLOTLIB):
   - Gunakan matplotlib.use('Agg'), dpi=300, dan bbox_inches='tight'.
   - Buat kurva halus (smooth spline curves) dengan np.linspace, tambahkan area fill transparan di bawah kurva (fill_between), hilangkan border atas & kanan (ax.spines['top'].set_visible(False)), dan beri grid halus.
   - Grafik dapat disisipkan langsung ke dalam berkas .docx atau .pptx!

5. JIKA PENGGUNA MEMINTA APLIKASI WEB:
   - Tulis 'index.html', 'style.css', dan 'app.js' yang modern, interaktif, dan rapi.

ALUR EKSEKUSI NYATA & EFISIENSI TOKEN:
- JANGAN PERNAH menduplikasi atau mengulang kode di dalam teks markdown biasa (\`\`\`python ... \`\`\`) sebelum atau sesudah tag aksi. Hal ini membuang token!
- Langsung tuliskan kode lengkap di dalam tag <write_file path="generate.py">isi kode</write_file> lalu jalankan, atau langsung di dalam <execute_code language="python">kode lengkap</execute_code>.
- Jika membuat presentasi PowerPoint (.pptx) atau Word (.docx) yang memerlukan grafik kurva, GABUNGKAN pembuatan grafik Matplotlib dan penyisipannya ke dalam SATU skrip Python yang sama, sehingga skrip langsung menghasilkan grafik 'chart.png' lalu menyematkannya ke berkas .pptx/.docx.
- Setelah mengeksekusi skrip, selalu panggil <check_file path="nama_berkas.ext" /> untuk memverifikasi berkas sudah terbentuk dengan sempurna di disk sandbox.

BERKAS SAAT INI DI SANDBOX:
${fileListText}

CATATAN PROTOKOL WORKSPACE:
Berkas 'SKILL.md' telah disiapkan di dalam workspace sandbox berisi panduan sintaksis eksekutif lengkap. Anda dapat membacanya dengan <read_file path="SKILL.md" /> kapan pun membutuhkan referensi tambahan.`;

    // Messages payload for LLM
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(h => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content || h.text || ''
      })),
      { role: 'user', content: prompt }
    ];

    // Call Upstream Model with stream: true
    const tokenMixKey = TOKENMIX_API_KEYS[0] || process.env.TOKENMIX_API_KEY || '';
    const upstreamUrl = process.env.TOKENMIX_CHAT_API_URL || 'https://api.tokenmix.ai/v1/chat/completions';

    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      signal: upstreamAbortController.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenMixKey}`
      },
      body: JSON.stringify({
        model: 'llama-4-maverick',
        messages: apiMessages,
        temperature: 0.6,
        max_tokens: 4500,
        stream: true
      })
    });

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text();
      throw new Error(`Upstream AI Error (${upstreamRes.status}): ${errText.slice(0, 150)}`);
    }

    let accumulatedAnswer = '';
    let hasPreview = false;
    let previewFile = 'index.html';

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
      onAction: async (tagName, fullTag) => {
        if (isAborted) return;
        const parsedAction = extractSequentialActions(fullTag)[0];
        if (parsedAction) {
          const pillXml = await executeActionItem(parsedAction, sessionId, addStep, updateLastStep);
          if (pillXml) {
            accumulatedAnswer += `\n\n${pillXml}\n\n`;
            emitEvent('delta', { content: `\n\n${pillXml}\n\n` });
          }

          if (parsedAction.type === 'preview') {
            hasPreview = true;
            previewFile = parsedAction.entryFile || 'index.html';
          }

          // Emit live sandbox files update if file modified
          if (['write_file', 'file', 'execute_code', 'run_code', 'run_command', 'command'].includes(parsedAction.type)) {
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
            if (deltaContent) {
              await streamParser.feed(deltaContent);
            }
          } catch (_e) {}
        }
      }
    }

    await streamParser.flush();

    if (isAborted) {
      res.end();
      return;
    }

    // Clean accumulated answer
    accumulatedAnswer = accumulatedAnswer
      .replace(/\((?:do|do_search)\)\s*/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!accumulatedAnswer) {
      accumulatedAnswer = 'Seluruh tindakan dan pengerjaan berkas telah selesai diproses di dalam sandbox. Silakan periksa berkas hasil di bawah ini.';
    }

    // Final verification of files
    const finalFiles = agentSandboxService.listFiles(sessionId);
    if (!hasPreview && finalFiles.some(f => f.ext === 'html')) {
      hasPreview = true;
      previewFile = finalFiles.find(f => f.ext === 'html').path;
    }

    const previewUrl = hasPreview ? `/api/agent/preview/${sessionId}/${previewFile}` : null;

    addStep('finish', 'Verifikasi Selesai', `Seluruh tugas berhasil dieksekusi dengan ${finalFiles.length} berkas aktif di sandbox.`, 'running');
    updateLastStep('completed', `Seluruh tugas berhasil dieksekusi dengan ${finalFiles.length} berkas aktif di sandbox.`, {
      totalFiles: finalFiles.length,
      previewUrl
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
      finalFiles,
      previewUrl
    );

    // Emit final 'done' event
    emitEvent('done', {
      messageId: botMsgId,
      content: accumulatedAnswer,
      chainOfWork,
      files: finalFiles,
      previewUrl
    });

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
