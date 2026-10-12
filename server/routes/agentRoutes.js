import express from 'express';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import agentSandboxService, { DEFAULT_SKILL_MD } from '../services/agentSandboxService.js';
import { agentSessionDb, agentMessageDb } from '../database.js';
import { TOKENMIX_API_KEYS } from '../apiProxyService.js';

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

  const emitEvent = (eventType, data) => {
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

    // Step 1: Inisialisasi Workspace & Memeriksa SKILL.md
    addStep('plan', 'Menganalisis Permintaan & Memeriksa SKILL.md', 'Mempersiapkan jailed workspace sandbox dan memverifikasi protokol agentic...', 'running');
    agentSandboxService.getSandboxDir(sessionId);
    const existingFiles = agentSandboxService.listFiles(sessionId);
    const fileListText = existingFiles.map(f => `- ${f.path} (${(f.size / 1024).toFixed(1)} KB)`).join('\n') || '(Belum ada berkas)';

    let skillContent = DEFAULT_SKILL_MD;
    try {
      skillContent = agentSandboxService.readFile(sessionId, 'SKILL.md');
    } catch (_) {}

    updateLastStep('completed', `Workspace siap. Berkas terdeteksi:\n${fileListText}`);

    // Step 2: Merumuskan Rencana dan Mengeksekusi
    addStep('thought', 'Merancang Solusi Kode & Menghubungi Model AI', 'Menyusun arsitektur berkas dan pengujian di sandbox...', 'running');

    // Build system prompt with SKILL.md and Sandbox context
    const systemPrompt = `Anda adalah Deepernova AI Agent — asisten koding dan eksekusi sandbox otonom tercanggih.
Anda bekerja di dalam sandbox lingkungan terisolasi.

PROSES KERJA ANDA DIPANTAU SECARA TRANSPARAN DI LAYAR PENGGUNA (CHAIN-OF-WORK).
IKUTI PROTOKOL DI BAWAH INI (SKILL.md):
${skillContent}

STRUKTUR BERKAS SAAT INI DI SANDBOX:
${fileListText}

FORMAT AKSI YANG WAJIB ANDA GUNAKAN UNTUK MELAKUKAN TINDAKAN NYATA:
1. Menjelaskan rencana berpikir:
<thought>Penjelasan langkah dan strategi teknis Anda</thought>

2. Membuat atau memperbarui berkas:
<write_file path="nama_file.ext">
Isi kode lengkap di sini
</write_file>

3. Mengeksekusi kode di sandbox (Node.js atau Python):
<execute_code language="node">
console.log('Testing code...');
</execute_code>

4. Menjalankan perintah terminal:
<run_command>node app.js</run_command>

5. Menentukan berkas entry point preview web (biasanya index.html):
<preview>index.html</preview>

PENTING:
- Tulis kode LENGKAP tanpa placeholder atau potongan terputus.
- Jika membuat web app, selalu buat "index.html" yang modern, responsif, dan siap jalan.
- Berikan ringkasan ramah dalam Bahasa Indonesia setelah seluruh aksi selesai.`;

    // Messages payload for LLM
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(h => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content || h.text || ''
      })),
      { role: 'user', content: prompt }
    ];

    // Call Upstream Model
    const tokenMixKey = TOKENMIX_API_KEYS[0] || process.env.TOKENMIX_API_KEY || '';
    const upstreamUrl = process.env.TOKENMIX_CHAT_API_URL || 'https://api.tokenmix.ai/v1/chat/completions';

    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenMixKey}`
      },
      body: JSON.stringify({
        model: 'llama-4-maverick',
        messages: apiMessages,
        temperature: 0.3,
        max_tokens: 3000
      })
    });

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text();
      throw new Error(`Upstream AI Error (${upstreamRes.status}): ${errText.slice(0, 150)}`);
    }

    const aiData = await upstreamRes.json();
    const rawAiText = aiData.choices?.[0]?.message?.content || '';

    updateLastStep('completed', 'Rencana dan aksi teknis telah dirumuskan oleh AI Agent.');

    // Parse and execute actions sequentially
    const { actions, cleanSummary } = agentSandboxService.extractAgentActions(rawAiText);

    let hasPreview = false;
    let previewFile = 'index.html';

    for (const action of actions) {
      if (action.type === 'thought') {
        addStep('thought', 'Catatan Berpikir Agent', action.content, 'completed');
      } else if (action.type === 'write_file') {
        addStep('file_write', `Menulis Berkas: ${action.path}`, `Menulis isi berkas (${action.content.length} karakter)...`, 'running');
        try {
          const written = agentSandboxService.writeFile(sessionId, action.path, action.content);
          updateLastStep('completed', `Berkas '${written.path}' berhasil dibuat/diperbarui (${(written.size / 1024).toFixed(2)} KB).`, { filePath: written.path });
          if (action.path.endsWith('.html')) {
            hasPreview = true;
            previewFile = action.path;
          }
        } catch (writeErr) {
          updateLastStep('failed', `Gagal menulis berkas: ${writeErr.message}`);
        }
      } else if (action.type === 'execute_code') {
        addStep('execute', `Mengeksekusi Kode (${action.language})`, 'Menjalankan kode di dalam jailed sandbox...', 'running');
        try {
          const execRes = await agentSandboxService.executeInSandbox(sessionId, {
            language: action.language,
            code: action.code
          });
          const detail = execRes.stdout ? `Output:\n${execRes.stdout}` : (execRes.stderr ? `Error:\n${execRes.stderr}` : 'Eksekusi selesai tanpa output.');
          updateLastStep(execRes.success ? 'completed' : 'failed', detail, {
            stdout: execRes.stdout,
            stderr: execRes.stderr,
            executionTimeMs: execRes.executionTimeMs
          });
        } catch (execErr) {
          updateLastStep('failed', `Gagal eksekusi: ${execErr.message}`);
        }
      } else if (action.type === 'run_command') {
        addStep('command', `Perintah Terminal: ${action.command}`, 'Mengeksekusi command di sandbox...', 'running');
        try {
          const cmdRes = await agentSandboxService.executeInSandbox(sessionId, {
            command: action.command
          });
          const detail = cmdRes.stdout ? `Output:\n${cmdRes.stdout}` : (cmdRes.stderr ? `Error:\n${cmdRes.stderr}` : 'Selesai.');
          updateLastStep(cmdRes.success ? 'completed' : 'failed', detail, {
            stdout: cmdRes.stdout,
            stderr: cmdRes.stderr,
            executionTimeMs: cmdRes.executionTimeMs
          });
        } catch (cmdErr) {
          updateLastStep('failed', `Gagal command: ${cmdErr.message}`);
        }
      } else if (action.type === 'preview') {
        hasPreview = true;
        previewFile = action.entryFile || 'index.html';
        addStep('preview', 'Live Web Preview', `Entry point: ${previewFile}`, 'completed');
      }
    }

    // Step Final: Verifikasi seluruh file yang ada di sandbox
    const finalFiles = agentSandboxService.listFiles(sessionId);
    if (!hasPreview && finalFiles.some(f => f.ext === 'html')) {
      hasPreview = true;
      previewFile = finalFiles.find(f => f.ext === 'html').path;
    }

    const previewUrl = hasPreview ? `/api/agent/preview/${sessionId}/${previewFile}` : null;

    addStep('finish', 'Verifikasi Selesai', `Seluruh tugas berhasil dieksekusi dengan ${finalFiles.length} berkas aktif di sandbox.`, 'completed', {
      totalFiles: finalFiles.length,
      previewUrl
    });

    const finalAnswer = cleanSummary || 'Tugas telah selesai diproses di dalam sandbox. Silakan periksa berkas dan terminal untuk melihat hasilnya.';

    // Save bot message with complete chainOfWork and sandboxFiles in Database
    const botMsgId = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    agentMessageDb.create(
      botMsgId,
      sessionId,
      userId,
      'assistant',
      finalAnswer,
      chainOfWork,
      finalFiles,
      previewUrl
    );

    // Emit final 'done' event
    emitEvent('done', {
      messageId: botMsgId,
      content: finalAnswer,
      chainOfWork,
      files: finalFiles,
      previewUrl
    });

    res.end();
  } catch (runErr) {
    console.error('[AGENT_RUN_ERROR]', runErr);
    addStep('error', 'Terjadi Kendala', runErr.message, 'failed');
    emitEvent('error', { error: runErr.message, chainOfWork });
    res.end();
  }
});

export default router;
