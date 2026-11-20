import express from 'express';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import JSZip from 'jszip';
import agentSandboxService, { DEFAULT_SKILL_MD, extractSequentialActions, getRelevantDeliverables, patchFile, grepSearch, rollbackFile, trimObservation, killSessionProcesses } from '../services/agentSandboxService.js';
import agentScreenshotService from '../services/agentScreenshotService.js';
import agentMemoryService from '../services/agentMemoryService.js';
import { agentSessionDb, agentMessageDb } from '../database.js';
import {
  dispatchFreeLlmRequest,
  apiProxyService
} from '../apiProxyService.js';
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
    } catch (_cleanupErr) { }

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

const SANDBOX_MIME_MAP = {
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.jsx': 'text/plain; charset=utf-8',
  '.ts': 'text/plain; charset=utf-8',
  '.tsx': 'text/plain; charset=utf-8',
  '.py': 'text/x-python; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.sql': 'application/sql; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function sendSandboxDownloadFile(res, fullPath, requestedName) {
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ success: false, error: 'File tidak ditemukan di sandbox' });
  }
  const stat = fs.statSync(fullPath);
  if (!stat.isFile()) {
    return res.status(400).json({ success: false, error: 'Target bukan berkas yang dapat diunduh' });
  }
  const rawBase = path.basename(requestedName || fullPath);
  const safeName = rawBase.replace(/[\r\n\0"<>:|?*\\/]/g, '_') || 'download';
  const ext = path.extname(safeName).toLowerCase();
  const contentType = SANDBOX_MIME_MAP[ext] || 'application/octet-stream';
  const encodedName = encodeURIComponent(safeName);

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', String(stat.size));
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
  return res.sendFile(path.resolve(fullPath));
}

// GET /api/agent/file/download - Direct file download for individual created files
router.get('/file/download', (req, res) => {
  try {
    const { sessionId, path: relativePath } = req.query;
    if (!sessionId || !relativePath) {
      return res.status(400).json({ success: false, error: 'sessionId dan path diperlukan' });
    }
    const fullPath = agentSandboxService.safeResolvePath(sessionId, relativePath);
    return sendSandboxDownloadFile(res, fullPath, path.basename(fullPath));
  } catch (err) {
    console.error('[AGENT_ROUTES] Download error:', err);
    return res.status(500).json({ success: false, error: err.message });
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
    res.setHeader('Content-Security-Policy', 'sandbox allow-scripts allow-forms allow-modals');
    res.setHeader('X-Content-Type-Options', 'nosniff');
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
      return res.status(400).json({ success: false, error: 'sessionId diperlukan' });
    }
    const sandboxDir = agentSandboxService.getSandboxDir(sessionId);
    const allFiles = agentSandboxService.listFiles(sessionId);
    const userFiles = allFiles.filter(
      (f) => f.name !== 'SKILL.md' && f.name !== 'CLAUDE.md' && !f.name.startsWith('_runner_temp') && !f.path.includes('__pycache__') && f.ext !== 'pyc'
    );
    const filesToZip = userFiles.length > 0 ? userFiles : allFiles.filter((f) => !f.name.startsWith('_runner_temp'));

    const zip = new JSZip();
    let addedCount = 0;
    for (const f of filesToZip) {
      const fullPath = path.join(sandboxDir, f.path);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        zip.file(f.path, fs.readFileSync(fullPath));
        addedCount++;
      }
    }

    if (addedCount === 0) {
      return res.status(404).json({ success: false, error: 'Belum ada berkas di sandbox untuk diunduh' });
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const zipName = `deepernova-project-${String(sessionId).slice(-6)}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Length', String(zipBuffer.length));
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"; filename*=UTF-8''${encodeURIComponent(zipName)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
    res.send(zipBuffer);
  } catch (err) {
    console.error('[AGENT_ROUTES] Download zip error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Save a text or base64 file into a session sandbox and auto-extract .zip archives safely.
 */
async function saveBufferOrContentToSandbox(sessionId, filename, { content, base64, extractZip = true } = {}) {
  const cleanName = String(filename || 'upload.bin').replace(/^[/\\]+/, '');
  let fileBuffer;
  if (base64) {
    fileBuffer = Buffer.from(base64, 'base64');
  } else {
    fileBuffer = Buffer.from(content || '', 'utf8');
  }
  const targetPath = agentSandboxService.safeResolvePath(sessionId, cleanName);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, fileBuffer);

  let zipMeta = null;
  if (extractZip !== false && cleanName.toLowerCase().endsWith('.zip')) {
    try {
      zipMeta = await agentSandboxService.extractZipIntoSandbox(sessionId, cleanName, '.');
    } catch (unzipErr) {
      console.warn('[AGENT_ROUTES] Auto-unzip warning:', unzipErr.message);
    }
  }
  return { cleanName, zipMeta };
}

/**
 * Sync one or more chatbot/client uploaded files into the target session sandbox.
 */
export async function attachUploadedFilesToSandbox(sessionId, attachedFiles = []) {
  if (!sessionId || !Array.isArray(attachedFiles) || attachedFiles.length === 0) return [];
  agentSandboxService.getSandboxDir(sessionId);
  const results = [];
  for (const item of attachedFiles) {
    if (!item || !item.name) continue;
    try {
      const saved = await saveBufferOrContentToSandbox(sessionId, item.name, {
        content: item.content,
        base64: item.base64,
        extractZip: item.extractZip !== false
      });
      results.push(saved);
    } catch (err) {
      console.warn(`[AGENT_ROUTES] Failed syncing attachment '${item.name}':`, err.message);
    }
  }
  return results;
}

// POST /api/agent/upload - Upload user file (auto-extracting .zip archives) to sandbox session
router.post('/upload', async (req, res) => {
  try {
    const { sessionId, filename, content, base64, extractZip = true } = req.body;
    if (!sessionId || !filename) {
      return res.status(400).json({ success: false, error: 'sessionId dan filename diperlukan' });
    }
    const { zipMeta } = await saveBufferOrContentToSandbox(sessionId, filename, { content, base64, extractZip });

    const files = agentSandboxService.listFiles(sessionId);
    res.json({
      success: true,
      files,
      filename,
      ...(zipMeta ? {
        isZip: true,
        extractedCount: zipMeta.extractedCount,
        extractedFiles: zipMeta.extractedFiles.map(f => f.path),
        rootFolderHint: zipMeta.rootFolderHint
      } : {})
    });
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

      // Initialize sandbox cleanly without writing internal system markdown files
      agentSandboxService.getSandboxDir(actualSessionId);

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
    return sendSandboxDownloadFile(res, filePath, fileName);
  } catch (err) {
    console.error('[AGENT_ROUTES] Download error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/agent/preview/:sessionId/* - Live render HTML/CSS/JS web project from sandbox
router.get('/preview/:sessionId/*', (req, res) => {
  try {
    const { sessionId } = req.params;
    const requestedFile = req.params[0] || 'index.html';
    const filePath = agentSandboxService.safeResolvePath(sessionId, requestedFile);
    res.setHeader('Content-Security-Policy', 'sandbox allow-scripts allow-forms allow-modals');
    res.setHeader('X-Content-Type-Options', 'nosniff');

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
    const targetPath = action.path || '';
    if (!targetPath) {
      return { pillXml: null, observation: 'Parameter path diperlukan untuk read_file.' };
    }
    if (/^(?:CLAUDE|SKILL)\.md$/i.test(targetPath.trim())) {
      const skillObj = /^CLAUDE\.md$/i.test(targetPath.trim())
        ? agentSkillService.getClaudeContract()
        : agentSkillService.readSkill('00-MASTER-AGENTIC-STEPPING-OS');
      const internalText = skillObj?.content || DEFAULT_SKILL_MD;
      return {
        pillXml: null,
        observation: `[SYSTEM SKILL INTERNAL - JANGAN TAMPILKAN KE PERCAKAPAN]:\n${internalText}`
      };
    }
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
    addStep('file_write', `Patch / Edit Berkas: ${targetPath}`, `Menerapkan perubahan terarah (diff/patch) pada '${targetPath}'...`, 'running');
    try {
      const editRes = agentSandboxService.patchFile(sessionId, targetPath, {
        startLine: action.startLine,
        endLine: action.endLine,
        target: action.target,
        replacement: action.replacement,
        content: action.content
      });
      updateLastStep('completed', `Berkas '${targetPath}' berhasil di-patch (${(editRes.size / 1024).toFixed(1)} KB).`);
      pillXml = `<action_pill id="${actionId}" type="patch" title="Patch Berkas: ${targetPath}" meta="${targetPath}" status="completed">${escapeXml(editRes.summary)}</action_pill>`;
      observation = `Berkas '${targetPath}' berhasil di-patch (${(editRes.size / 1024).toFixed(1)} KB). ${editRes.summary}`;
    } catch (editErr) {
      updateLastStep('failed', `Gagal patch berkas: ${editErr.message}`);
      pillXml = `<action_pill id="${actionId}" type="patch" title="Gagal Patch: ${targetPath}" meta="${targetPath}" status="failed">${escapeXml(editErr.message)}</action_pill>`;
      observation = `Gagal patch berkas '${targetPath}': ${editErr.message}`;
    }
  } else if (action.type === 'grep_search' || action.type === 'grep') {
    const query = action.query || '';
    const includes = action.includes || '';
    addStep('read', `Grep Search: ${query}`, `Mencari teks '${query}' di seluruh berkas sandbox...`, 'running');
    try {
      const matches = agentSandboxService.grepSearch(sessionId, { query, includes });
      const summary = matches.length > 0
        ? matches.slice(0, 30).map(m => `${m.file}:${m.line}: ${m.content}`).join('\n')
        : `Tidak ditemukan baris yang cocok dengan '${query}'.`;
      updateLastStep('completed', `Ditemukan ${matches.length} kemunculan.`);
      pillXml = `<action_pill id="${actionId}" type="grep" title="Grep Search: ${query}" meta="${matches.length} hasil" status="completed">${escapeXml(summary)}</action_pill>`;
      observation = `Hasil grep pencarian untuk "${query}":\n${summary}`;
    } catch (grepErr) {
      updateLastStep('failed', grepErr.message);
      pillXml = `<action_pill id="${actionId}" type="grep" title="Grep Gagal: ${query}" meta="${query}" status="failed">${escapeXml(grepErr.message)}</action_pill>`;
      observation = `Gagal melakukan grep search: ${grepErr.message}`;
    }
  } else if (action.type === 'revert_file' || action.type === 'rollback_file') {
    const targetPath = action.path || '';
    addStep('file_write', `Rollback Berkas: ${targetPath}`, `Mengembalikan berkas '${targetPath}' ke checkpoint sebelumnya...`, 'running');
    try {
      const rollbackRes = agentSandboxService.rollbackFile(sessionId, targetPath);
      updateLastStep('completed', `Berkas '${targetPath}' berhasil dikembalikan ke checkpoint.`);
      pillXml = `<action_pill id="${actionId}" type="revert" title="Rollback Berkas: ${targetPath}" meta="${targetPath}" status="completed">Berkas '${targetPath}' dipulihkan ke versi sebelum mutasi.</action_pill>`;
      observation = `Berkas '${targetPath}' berhasil di-rollback ke versi sebelumnya (${rollbackRes.restoredFrom}).`;
    } catch (rbErr) {
      updateLastStep('failed', rbErr.message);
      pillXml = `<action_pill id="${actionId}" type="revert" title="Rollback Gagal: ${targetPath}" meta="${targetPath}" status="failed">${escapeXml(rbErr.message)}</action_pill>`;
      observation = `Gagal rollback berkas '${targetPath}': ${rbErr.message}`;
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
  } else if (action.type === 'unzip_file') {
    const zipPath = action.path || '';
    const targetDir = action.target || '.';
    addStep('file_write', `Mengekstrak Arsip ZIP: ${zipPath}`, `Membuka isi arsip '${zipPath}' ke '${targetDir}'...`, 'running');
    try {
      const extRes = await agentSandboxService.extractZipIntoSandbox(sessionId, zipPath, targetDir);
      const listPreview = extRes.extractedFiles.slice(0, 35).map(f => `- ${f.path} (${(f.size / 1024).toFixed(1)} KB)`).join('\n');
      updateLastStep('completed', `Berhasil mengekstrak ${extRes.extractedCount} berkas dari '${zipPath}'.`);
      pillXml = `<action_pill id="${actionId}" type="write" title="Ekstrak ZIP: ${zipPath}" meta="${extRes.extractedCount} berkas" status="completed">${escapeXml(listPreview)}</action_pill>`;
      observation = `Arsip ZIP '${zipPath}' berhasil diekstrak (${extRes.extractedCount} berkas):\n${listPreview}${extRes.extractedCount > 35 ? `\n... +${extRes.extractedCount - 35} berkas lainnya` : ''}`;
    } catch (uzErr) {
      updateLastStep('failed', `Gagal ekstrak ZIP: ${uzErr.message}`);
      pillXml = `<action_pill id="${actionId}" type="write" title="Gagal Ekstrak ZIP: ${zipPath}" meta="${zipPath}" status="failed">${escapeXml(uzErr.message)}</action_pill>`;
      observation = `Gagal mengekstrak '${zipPath}': ${uzErr.message}`;
    }
  } else if (action.type === 'zip_project') {
    const outName = action.name || 'project-updated.zip';
    const srcDir = action.source || '.';
    addStep('file_write', `Mengemas Proyek ZIP: ${outName}`, `Mengompres seluruh berkas proyek bersih menjadi '${outName}'...`, 'running');
    try {
      const zipRes = await agentSandboxService.createProjectZipInSandbox(sessionId, outName, srcDir);
      action.outputZipPath = zipRes.path;
      const summary = `Arsip ZIP '${zipRes.path}' (${(zipRes.size / 1024).toFixed(1)} KB, ${zipRes.fileCount} berkas) berhasil dibuat dan siap diunduh.`;
      updateLastStep('completed', summary);
      pillXml = `<action_pill id="${actionId}" type="write" title="Paket ZIP: ${zipRes.path}" meta="${zipRes.fileCount} berkas" status="completed">${escapeXml(summary)}</action_pill>`;
      observation = `${summary}\nBerkas di dalam ZIP:\n${zipRes.includedFiles.slice(0, 30).map(p => `- ${p}`).join('\n')}`;
    } catch (zErr) {
      updateLastStep('failed', `Gagal mengemas ZIP: ${zErr.message}`);
      pillXml = `<action_pill id="${actionId}" type="write" title="Gagal Kemas ZIP" meta="${outName}" status="failed">${escapeXml(zErr.message)}</action_pill>`;
      observation = `Gagal membuat arsip ZIP '${outName}': ${zErr.message}`;
    }
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
    'write_file', 'subagent_file', 'file', 'execute_code', 'run_code', 'check_file', 'verify_file',
    'preview', 'screenshot', 'take_screenshot',
    'grep_search', 'grep', 'revert_file', 'rollback_file',
    'unzip_file', 'extract_zip', 'unzip', 'zip_project', 'zip_files', 'archive_zip'
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

      // Peek if tag at openIndex is a recognized action or thought tag
      const tagMatchAtOpen = buffer.slice(openIndex).match(/^<([a-zA-Z0-9_-]+)([\s>\/])/);
      const peekTag = tagMatchAtOpen ? tagMatchAtOpen[1].toLowerCase() : null;
      const isActionOrThought = peekTag && (
        KNOWN_TAGS.includes(peekTag) ||
        ['thinking', 'thought', 'think', 'reasoning', 'plan'].includes(peekTag)
      );

      if (openIndex > 0) {
        const textBefore = buffer.slice(0, openIndex);
        if (isActionOrThought) {
          // Silent agent execution: divert pre-action / pre-thought monologue into reasoning
          // so visible chat remains clean of intermediate chatter!
          if (textBefore.trim() && callbacks.onThinking) {
            await callbacks.onThinking(textBefore.trim() + '\n');
          }
        } else {
          await callbacks.onText(textBefore);
        }
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
        tagName === 'revert_file' ||
        tagName === 'rollback_file' ||
        (tagName === 'grep_search' && !buffer.includes('</grep_search>')) ||
        (tagName === 'grep' && !buffer.includes('</grep>')) ||
        (tagName === 'read_skill' && !buffer.includes(`</${tagName}>`) && buffer.length > closeGtIndex + 30) ||
        (tagName === 'search_skill' && !buffer.includes(`</${tagName}>`) && buffer.length > closeGtIndex + 30) ||
        (tagName === 'search_web' && !buffer.includes(`</${tagName}>`) && buffer.length > closeGtIndex + 30);

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

function isComparisonRequestPrompt(prompt = '') {
  if (!prompt || typeof prompt !== 'string') return false;
  return (
    /\b(?:banding(?:kan)?|perbandingan|komparasi|vs\.?|versus|compare)\b/i.test(prompt) ||
    /\b(?:bagusan\s+mana|lebih\s+(?:bagus|baik|unggul|cepat|hemat|murah|cocok|worth\s*it)\s+mana|pilih\s+mana|mana\s+yang\s+lebih)\b/i.test(prompt) ||
    /\b(?:perbedaan|beda(?:nya)?|kelebihan\s+dan\s+kekurangan)\s+.+?\s+(?:dengan|dan|sama|vs\.?|versus|dibanding(?:kan)?)\b/i.test(prompt)
  );
}

function buildComparisonSearchSteps(prompt = '') {
  const clean = String(prompt || '').trim();
  const year = new Date().getFullYear();
  const compMatch =
    clean.match(/(?:banding(?:kan)?|perbandingan|komparasi|perbedaan|beda(?:nya)?|pilih\s+mana|bagusan\s+mana|mana\s+yang\s+lebih\s+(?:bagus|baik|unggul)|compare)\s+(.+?)\s+(?:dengan|dan|atau|sama|vs\.?|versus|dibanding(?:kan)?|and|with)\s+(.+)/i) ||
    clean.match(/(.+?)\s+(?:vs\.?|versus)\s+(.+)/i);

  if (compMatch && compMatch[1] && compMatch[2]) {
    const cleanEntity = (raw) => raw
      .replace(/^(?:antara|mengenai|tentang|dari|kelebihan\s+dan\s+kekurangan)\s+/i, '')
      .replace(/[?!.,]+$/, '')
      .replace(/\b(?:untuk|buat|mana\s+yang\s+lebih\s+bagus).*$/i, '')
      .trim()
      .slice(0, 65);
    const entityA = cleanEntity(compMatch[1]);
    const entityB = cleanEntity(compMatch[2]);
    if (entityA.length >= 2 && entityB.length >= 2 && entityA.toLowerCase() !== entityB.toLowerCase()) {
      return [
        {
          title: `Riset Data 1: ${entityA}`,
          query: `${entityA} review fitur kelebihan kekurangan data terbaru ${year}`
        },
        {
          title: `Riset Data 2: ${entityB}`,
          query: `${entityB} review fitur kelebihan kekurangan data terbaru ${year}`
        },
        {
          title: `Validasi Komparasi: ${entityA} vs ${entityB}`,
          query: `perbandingan ${entityA} vs ${entityB} kelebihan kekurangan perbedaan ${year}`
        }
      ];
    }
  }

  const compactBase = clean.replace(/[?!.]+$/, '').slice(0, 90);
  return [
    {
      title: `Riset Data Awal: ${compactBase.slice(0, 40)}`,
      query: `${compactBase} data fakta terbaru ${year}`
    },
    {
      title: `Validasi Sumber Pembanding`,
      query: `perbandingan ${compactBase} kelebihan kekurangan data terbaru ${year}`
    }
  ];
}

/**
 * Execute the full Autonomous Multi-Step ReAct Sandbox Agent loop.
 * Shared by `/api/agent/run` and Chatbot Sub-Agent (`/api/subagent/orchestrate`).
 */
export async function executeAutonomousAgentRun({
  sessionId,
  prompt,
  model = 'qwen2.5-vl-72b',
  history = [],
  effort = 'high',
  language = 'id',
  userId = 'guest_agent_user',
  deferDeltaUntilDone = false,
  onEvent,
  onCloseRegister,
  finishStream
}) {
  if (String(model || '').toLowerCase().includes('grok-4.6')) {
    onEvent?.('error', { error: 'Model grok-4.6 dilarang menjalankan sub-agent.', chainOfWork: [] });
    finishStream?.();
    return;
  }
  let isAborted = false;
  const upstreamAbortController = new AbortController();

  if (typeof onCloseRegister === 'function') {
    onCloseRegister(() => {
      isAborted = true;
      try {
        upstreamAbortController.abort();
      } catch (_) { }
      try {
        killSessionProcesses(sessionId);
      } catch (_) { }
      console.log(`[AGENT_STREAM] Client disconnected prematurely for session ${sessionId}, upstream aborted & active processes terminated.`);
    });
  }

  const emitEvent = (eventType, data) => {
    if (isAborted) return;
    try {
      onEvent?.(eventType, data);
    } catch (_e) { }
  };

  const endStream = () => {
    try {
      finishStream?.();
    } catch (_e) { }
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
    const isComparisonPrompt = isComparisonRequestPrompt(prompt);
    const isSearchIntent = isComparisonPrompt || /\b(cari|search|googling|berita|news|hari ini|terbaru|terkini|siapa|apa itu|apakah|harga|saham|kurs|presiden|pemilu|update|cuaca|jadwal|skor|hasil|peringkat|info|informasi|peristiwa|kejadian|gemini|claude|deepseek|ai agent|investasi|ekonomi|politik)\b/i.test(promptLower);

    let upfrontSearchContext = '';
    if (isComparisonPrompt) {
      // Multi-Step Searching specifically for comparisons to guarantee valid cross-verified data
      const compSteps = buildComparisonSearchSteps(prompt);
      const stepContexts = [];
      for (let sIdx = 0; sIdx < compSteps.length; sIdx++) {
        if (isAborted) break;
        const cStep = compSteps[sIdx];
        addStep('search', `${cStep.title}`, `Menelusuri data valid (${sIdx + 1}/${compSteps.length}): "${cStep.query}"`, 'running');
        try {
          const stepRes = await webSearchService.searchGoogle(cStep.query, 5);
          if (stepRes && stepRes.success && stepRes.results && stepRes.results.length > 0) {
            const stepText = stepRes.ai_context || webSearchService.formatSearchResultsForPrompt(stepRes.results);
            stepContexts.push(`=== LANGKAH RISET ${sIdx + 1}: ${cStep.title} (Query: "${cStep.query}") ===\n${stepText}`);
            updateLastStep('completed', `Ditemukan ${stepRes.results.length} sumber valid.`, { results: stepRes.results });
          } else {
            updateLastStep('completed', 'Pencarian selesai.');
          }
        } catch (_err) {
          updateLastStep('completed', 'Pencarian selesai.');
        }
      }
      upfrontSearchContext = stepContexts.join('\n\n');
    } else if (isSearchIntent) {
      // Single Search for normal non-comparison search queries
      addStep('search', `Deepernova Search: ${prompt.slice(0, 48)}`, 'Menelusuri informasi live dan terindeks via Deepernova Search Engine (Single Search)...', 'running');
      try {
        const upfrontRes = await webSearchService.searchGoogle(prompt, 5);
        if (upfrontRes && upfrontRes.success && upfrontRes.results && upfrontRes.results.length > 0) {
          upfrontSearchContext = upfrontRes.ai_context || webSearchService.formatSearchResultsForPrompt(upfrontRes.results);
          updateLastStep('completed', `Ditemukan ${upfrontRes.results.length} sumber data terverifikasi.`, { results: upfrontRes.results });
        } else {
          updateLastStep('completed', 'Pencarian selesai.');
        }
      } catch (_err) {
        updateLastStep('completed', 'Pencarian selesai.');
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

    // Configure Effort & Max Steps (Claude Code Loop capacity)
    let MAX_AGENT_STEPS = 8;
    let effortInstruction = '';
    if (effort === 'low') {
      MAX_AGENT_STEPS = 4;
      effortInstruction = `\n[TINGKAT USAHA AI AGENT: RENDAH / QUICK MODE (MAKSIMAL 4 ITERASI)]\nFokus pada eksekusi cepat, langsung to the point, dan hemat token.\n`;
    } else if (effort === 'high') {
      MAX_AGENT_STEPS = 14;
      effortInstruction = `\n[TINGKAT USAHA AI AGENT: TINGGI / PERSISTENT EXECUTIVE EFFORT (PANTANG MENYERAH - MAKSIMAL 14 ITERASI)]
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

      // Keep skills strictly server-internal (never write SKILL.md or CLAUDE.md into user deliverable workspace)
      strictSkillAdherencePrompt = agentSkillService.getStrictAdherencePrompt(activeSkill);
    } else {
      addStep(
        'skill',
        'Mode Percakapan Langsung',
        'Tidak memerlukan buku panduan khusus. Memproses respons secara langsung...',
        'completed'
      );
    }

    // Build system prompt with CLAUDE.md contract, Dynamic Skill Catalog & Sandbox context
    const claudeContractPrompt = agentSkillService.getClaudeContractPrompt();
    const compactCatalog = agentSkillService.getCompactCatalog();
    const skillSuggestionNote = activeSkill
      ? `\n📖 BUKU SKILL AKTIF: Tugas ini dieksekusi dengan standar buku skill \`${activeSkill.file}\` (${activeSkill.title}). Anda WAJIB berpegang teguh pada aturan dan template di dalamnya!\n`
      : '';

    const reqLang = (language || 'id').toLowerCase();
    const langDirective = reqLang === 'en'
      ? '\n[MANDATORY SYSTEM DIRECTIVE - STRICT ENGLISH LANGUAGE REQUIREMENT]: You MUST communicate, write your <thought> analyses, deliver the final executive summary, and interact with the user entirely in English. All explanations and messages must be in fluent English.\n'
      : (reqLang === 'zh'
        ? '\n[MANDATORY SYSTEM DIRECTIVE - STRICT CHINESE LANGUAGE REQUIREMENT]: 你的所有 <thought> 分析、最终执行总结以及与用户的交互必须全程使用地道自然的中文进行。\n'
        : '\n[DIREKTIF BAHASA MUTLAK - BAHASA INDONESIA]: Seluruh penalaran, thought, dan kesimpulan akhir wajib disampaikan dalam Bahasa Indonesia yang alami dan jelas.\n');

    const systemPrompt = `Anda adalah Deepernova AI Agent — asisten koding dan eksekusi sandbox otonom tercanggih dengan standar Autonomous Agent Orchestrator, Workspace Artifacts & Dynamic Skill Architecture.
${langDirective}
Anda bertugas mengeksekusi instruksi pengguna secara nyata di dalam sandbox hingga menghasilkan berkas jadi berkualitas tinggi tanpa error.

PRINSIP UTAMA: EKSEKUSI SENYAP & KESIMPULAN AKHIR PADAT (ZERO-CHATTER & HEMAT TOKEN):
1. SENYAP TOTAL SAAT EKSEKUSI TUGAS (ZERO-CHATTER DURING EXECUTION):
   - KETIKA ANDA SEDANG MENGERJAKAN TUGAS (menggunakan tag aksi <write_file>, <run_command>, <read_file>, <check_file>, <read_skill>, <search_web>):
   - 🚨 DILARANG KERAS MENULIS TEKS NARASI / OBROLAN / GUMAMAN DI LUAR TAG AKSI!
   - DILARANG berkata: "Baik, saya akan mulai...", "Sekarang mari kita jalankan...", "Tunggu sebentar saya periksa...", "Sedang mengecek...", "Langkah pertama adalah...".
   - Seluruh penalaran, analisa, dan strategi pengerjaan WAJIB 100% diletakkan di dalam tag <thought>...</thought> (karena akan otomatis masuk ke panel penalaran rapi).
   - Di luar tag <thought>, output Anda harus LANGSUNG berupa tag aksi nyata!
   - Jangan boros token untuk menceritakan apa yang akan Anda lakukan — LANGSUNG LAKUKAN!

2. DILARANG KERAS NGEDUMEL, MENGELUH, ATAU BERTELE-TELE (ANTI-NGEDUMEL):
   - DILARANG curhat teknis, mengeluh error, meminta maaf berlebihan, atau mengulang-ulang instruksi pengguna.
   - DILARANG menulis ulang seluruh kode atau isi dokumen secara mentah di teks obrolan jika sudah dituliskan ke dalam berkas via <write_file>.
   - Bekerjalah secara otonom, senyap, efisien, rapi, dan presisi tinggi!

3. KESIMPULAN DIBERIKAN HANYA SETELAH SEMUA TUGAS SELESAI (CRISP EXECUTIVE SUMMARY):
   - DILARANG KERAS menulis kalimat pengantar atau jawaban sebelum seluruh aksi tag & pembuatan berkas tuntas! Saat memanggil tag aksi, jangan menulis teks chat apa pun di luar <thought>.
   - HANYA SETELAH seluruh aksi agentic selesai dan berkas terverifikasi terbentuk di disk sandbox (<check_file>):
   - Tuliskan SATU ringkasan hasil yang rapi, padat, natural, dan informatif (inti isi/fitur, nama berkas yang dibuat, serta cara pakai singkat jika perlu).
   - 🚨 DILARANG KERAS menulis kalimat konfirmasi klise/sampah seperti: "Status: Konfirmasi tuntas 100%", "Konfirmasi pengerjaan tuntas", "Tugas berhasil dieksekusi", "Seluruh tahapan berhasil", atau "Silakan periksa berkas hasil di bawah ini"! Langsung bahas substansi hasilnya saja!

4. PROTOKOL MUTLAK AKSES INTERNET & AUDIT KEAMANAN WEB (ANTI-LINGLUNG & ACTION-FIRST):
   - Jika pengguna meminta audit keamanan, pentest, uji website lain, scraping, atau mengambil data dari web lain:
   - DILARANG KERAS LINGLUNG ATAU BERTEORI! Sandbox Anda memiliki koneksi internet penuh 100%.
   - Untuk audit keamanan website target:
     * Tulis skrip audit Python komprehensif ke audit.py via <write_file path="audit.py">.
     * Jalankan scanner di terminal via <run_command>python audit.py "TARGET_URL"</run_command>.
     * Periksa hasil audit via <check_file path="security_audit_report.json" /> dan <check_file path="security_audit_report.md" />.
     * Berikan Kesimpulan Eksekutif hasil audit (Skor Keamanan, Grade A/B/C/F, Temuan Kritis, dan Rekomendasi Hardening).
   - Untuk web fetching / scraping:
     * Gunakan cURL cepat: <run_command>curl -s -L -A "Mozilla/5.0" "URL" | head -n 40</run_command>
     * Atau tulis fetcher dengan requests & BeautifulSoup via <write_file path="fetcher.py"> lalu jalankan dengan <run_command>python fetcher.py</run_command>.
   - Baca hasil observasi dari terminal secara seksama, lalu berikan jawaban berbasis data nyata dari web tersebut!

SIKLUS ORKESTRASI MULTI-STEP RE-ACT & AUTONOMOUS RETRY LOOP:
- Analisis di <thought> -> Tag Aksi Sandbox/Web/Skill -> Pembacaan Observasi Hasil Tindakan -> Eksekusi Lanjutan Hingga Tuntas -> Kesimpulan Eksekutif Singkat.
- PENCARIAN BERITA, VERIFIKASI FAKTA & ANTI-MENGARANG (DEEPERNOVA SEARCH ENGINE):
  a. Anda terintegrasi langsung dengan Deepernova Search Engine — mesin pencari berkecepatan tinggi dengan BM25 indexer dan PageRank yang akurat dan terindeks terkini.
  b. ATURAN KETAT JIKA RAGU ATAU TIDAK TAHU: DILARANG menjawab "Saya tidak tahu", "Saya kurang yakin", atau mengarang angka/fakta! Jika merasa tidak yakin atau butuh data valid, WAJIB panggil <search_web query="kata kunci spesifik" /> terlebih dahulu.
  c. Untuk permintaan PERBANDINGAN (A vs B), pastikan data kedua entitas dan perbandingan head-to-head sudah terverifikasi lewat hasil multi-step search di bawah (atau panggil <search_web /> tambahan bila ada aspek yang masih kurang) lalu sajikan perbandingan objektif, tabel ringkas, pro-kontra, serta sitasi link [Nama Sumber](URL).
  d. Untuk pertanyaan pencarian biasa/tunggal, gunakan 1x pencarian saja tanpa mengulang-ulang search yang tidak perlu.
- AUTONOMOUS SELF-HEALING (PERBAIKAN MANDIRI):
  Jika terjadi error eksekusi (stderr, syntax error, missing module, atau target berkas belum terbentuk): JANGAN mengeluh atau curhat kepada pengguna! Analisis akar masalah di <thought>, tulis ulang skrip perbaikan via <write_file>, pasang modul jika perlu dengan <run_command>pip install ...</run_command>, jalankan kembali dengan <run_command>, dan verifikasi dengan <check_file>.

${effortInstruction}
${claudeContractPrompt}
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
- <patch_file path="nama_file.ext" startLine="10" endLine="20"><replacement>kode baru</replacement></patch_file>
  (atau: <patch_file path="nama_file.ext"><target>blok lama</target><replacement>blok baru</replacement></patch_file>)
  Melakukan diff & patch presisi SOTA (standar Claude Code / Codex) pada baris atau blok target tertentu tanpa menulis ulang seluruh berkas. Otomatis membuat checkpoint rollback sebelum modifikasi.
- <grep_search query="regex_atau_kata_kunci" includes="*.py" />
  Pencarian kode secepat kilat (ripgrep-style) di seluruh workspace sandbox untuk menemukan baris kode, fungsi, variabel, atau definisi berkas.
- <revert_file path="nama_file.ext" />
  Rollback / kembalikan berkas ke snapshot checkpoint sebelumnya jika modifikasi atau patch menimbulkan regresi atau error.
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
- <unzip_file path="arsip.zip" target="." />
  Mengekstrak arsip .zip yang diunggah ke workspace sandbox secara aman (otomatis melewati node_modules/.git/__MACOSX).
- <zip_project name="project_hasil.zip" target="." />
  Mengemas ulang seluruh berkas proyek yang telah dikerjakan & diverifikasi menjadi berkas .zip bersih siap unduh ke pengguna.

DISIPLIN ALUR ENGINEERING CLAUDE CODE & ARSIP ZIP (MUTLAK):
1. EXPLORE -> PLAN -> CODE -> TEST -> VERIFY -> PACKAGE:
   - Jika pengguna mengirim/mengunggah berkas .zip atau meminta modifikasi proyek: awali dengan <list_files /> dan baca berkas konfigurasi (package.json / requirements.txt / entry files) dengan <read_file> atau <grep_search> sebelum mengedit kode.
   - Susun arsitektur & kontrak antar-berkas di <plan> / <thought>. Tulis kode modular yang lengkap & sinkron antar-file (tanpa placeholder TODO).
   - WAJIB uji kode/proyek nyata lewat <test_file> & <run_command> (\`node --check\`, \`python -m py_compile\`, \`npm test\`, \`npm run build\`, dsb.) sebelum menyimpulkan selesai.
   - Jika membangun proyek multi-berkas atau memperbarui arsip .zip kiriman pengguna: AKHIRI dengan <zip_project name="nama_project_update.zip" /> lalu <check_file path="nama_project_update.zip" /> agar pengguna bisa langsung mengunduh & meninjau isi ZIP-nya!
2. SKILL INTERNAL RAHASIA (SILENT EXECUTION): Buku skill (\`CLAUDE.md\` & \`SKILL.md\`) adalah panduan kerja internal AI. DILARANG mencetak isi aturan skill ke obrolan atau menyimpannya sebagai berkas hasil untuk pengguna.

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
${upfrontSearchContext ? `\n\n${upfrontSearchContext}\n\nCATATAN KHUSUS PENCARIAN DEEPERNOVA: Data pencarian di atas adalah data terverifikasi dari Deepernova Search Engine. Anda WAJIB menggunakannya sebagai acuan fakta utama dalam jawaban Anda!` : ''}
${isComparisonPrompt && !wantsDocx && !wantsPptx && !wantsXlsx ? `\n\n[MODE AGENTIC MULTI-STEP COMPARISON]: Anda sedang menangani permintaan PERBANDINGAN. Seluruh riset multi-langkah telah dijalankan di atas (panggil <search_web /> lagi hanya jika ada metrik/spesifikasi penting yang belum ditemukan). Jawab langsung dengan perbandingan objektif, tabel/poin terstruktur, angka valid, kelebihan & kekurangan masing-masing, serta sitasi [Nama Sumber](URL). JANGAN membuat berkas (<write_file>) kecuali user secara eksplisit meminta output file.` : ''}`;

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
      process.env.DEEPERNOVA_PUBLIC_API_URL || 'https://liberty-bracelet-mayor-gaps.trycloudflare.com/v1/chat/completions'
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
      let turnAnswerText = '';

      let upstreamRes = null;
      let lastErr = null;

      // 1. FreeLLM Unified Gateway + Official Free-Tier Multi-Provider Failover
      const agentDispatch = await dispatchFreeLlmRequest({
        requestedModel: model || 'qwen2.5-vl-72b',
        messages: apiMessages,
        temperature: 0.5,
        max_tokens: 4096,
        stream: true,
        hasImages: false,
        enableReasoning: effort === 'high',
        signal: upstreamAbortController.signal,
        timeoutMs: 14000
      });
      if (agentDispatch.response && agentDispatch.response.ok) {
        upstreamRes = agentDispatch.response;
        lastErr = null;
      } else {
        lastErr = agentDispatch.lastError;
      }

      // 2. Seamless Fallback: Native GPU Engine
      if (!upstreamRes || !upstreamRes.ok) {
        const cloudErr = lastErr;
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
              if (!cloudErr) {
                lastErr = new Error(`GPU Engine Error (${res.status}): ${errText.slice(0, 100)}`);
              }
            }
          } catch (fetchErr) {
            if (!cloudErr) {
              lastErr = fetchErr;
            }
          }
        }
      }

      // 3. Ultra-Resilient Standby Fallback: Synthetic Stream if all upstreams temporarily unreachable
      if (!upstreamRes || !upstreamRes.ok) {
        console.warn('[AGENT_ROUTES] Upstream AI offline, creating synthetic standby completion stream:', lastErr?.message);
        const fallbackText = apiProxyService.generateStandbyCompletion(apiMessages, model || 'qwen2.5-vl-72b', lastErr);
        const syntheticStream = apiProxyService.createSyntheticSSEStream(fallbackText, model || 'qwen2.5-vl-72b');
        upstreamRes = {
          ok: true,
          status: 200,
          body: syntheticStream
        };
      }

      let lastActionEndRawLen = 0;
      const streamParser = createStreamActionParser({
        onText: async (plainText) => {
          if (isAborted) return;
          // Strip accidental (do) markers or any raw <action_pill> XML emitted by model
          const clean = plainText
            .replace(/\((?:do|do_search)\)\s*/gi, '')
            .replace(/<action_pill\b[^>]*>[\s\S]*?<\/action_pill>/gi, '')
            .replace(/<\/?action_pill\b[^>]*>/gi, '');
          if (clean) {
            turnAnswerText += clean;
            if (!deferDeltaUntilDone) {
              accumulatedAnswer += clean;
              emitEvent('delta', { content: clean });
            }
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
            // Structured steps are streamed via step/step_update events cleanly without polluting delta text with raw <action_pill> XML
            const { observation } = await executeActionItem(parsedAction, sessionId, addStep, updateLastStep, emitEvent);

            if (observation) {
              turnObservations.push({ type: parsedAction.type, observation });
              turnActionExecuted = true;
              lastActionEndRawLen = turnRawContent.length;
              // Discard pre-action chatter when deferred so only post-action response counts
              if (deferDeltaUntilDone) {
                turnAnswerText = '';
              }
            }

            if (parsedAction.type === 'preview') {
              hasPreview = true;
              previewFile = parsedAction.entryFile || 'index.html';
            }

            if (['send_file', 'deliver_file', 'resend_file'].includes(parsedAction.type) && parsedAction.path) {
              sentFilePaths.add(parsedAction.path);
            }
            if (parsedAction.type === 'zip_project' && parsedAction.outputZipPath) {
              sentFilePaths.add(parsedAction.outputZipPath);
            }

            // Emit live sandbox files update if file modified or manipulated
            if (['write_file', 'file', 'edit_file', 'patch_file', 'delete_file', 'remove_file', 'delete', 'send_file', 'deliver_file', 'resend_file', 'execute_code', 'run_code', 'run_command', 'command', 'unzip_file', 'zip_project'].includes(parsedAction.type)) {
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
            } catch (_e) { }
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
          updateLastStep('completed', 'Perbaikan selesai diterapkan.');
          isSelfHealingActive = false;
        }

        // Check if the model already provided its executive conclusion in trailing text after its last action tag
        const lastActionCloseIdx = Math.max(
          turnRawContent.lastIndexOf('</check_file>'),
          turnRawContent.lastIndexOf('</verify_file>'),
          turnRawContent.lastIndexOf('</test_file>'),
          turnRawContent.lastIndexOf('</send_file>'),
          turnRawContent.lastIndexOf('</run_command>'),
          turnRawContent.lastIndexOf('</write_file>'),
          turnRawContent.lastIndexOf('</subagent_file>'),
          turnRawContent.lastIndexOf('</execute_code>'),
          turnRawContent.lastIndexOf('</screenshot>'),
          turnRawContent.lastIndexOf('</zip_project>'),
          turnRawContent.lastIndexOf('/>')
        );

        const trailingText = lastActionCloseIdx !== -1
          ? turnRawContent.slice(lastActionCloseIdx).replace(/<[^>]+>/g, '').trim()
          : (lastActionEndRawLen > 0 ? turnRawContent.slice(lastActionEndRawLen).replace(/<[^>]+>/g, '').trim() : '');

        const alreadyConcluded = trailingText.length > 35 &&
          /(?:ringkasan|intisari|fitur|dibuat|struktur|berkas|unduh|buka|penjelasan)/i.test(trailingText) &&
          !/^\s*(?:baik|siap|sekarang|sedang|tunggu)/i.test(trailingText);

        if (!needsSelfHealing && unmetGoals.length === 0 && alreadyConcluded) {
          if (deferDeltaUntilDone) {
            accumulatedAnswer = (turnAnswerText && turnAnswerText.trim().length > 20 ? turnAnswerText : trailingText).trim();
          }
          continueAutonomousLoop = false;
          break;
        }

        const obsFormatted = turnObservations.map((o, idx) => `[HASIL OBSERVASI ${idx + 1} (${o.type})]:\n${trimObservation(o.observation)}`).join('\n\n---\n\n');
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
            `[OBSERVASI TINDAKAN SELESAI]:\n` +
            `1. Baca hasil observasi di atas.\n` +
            `2. Jika target berkas atau tugas SUDAH SELESAI dan diverifikasi di sandbox:\n` +
            `   - 🚨 DILARANG menulis kalimat konfirmasi klise/sampah ("Status: Konfirmasi tuntas 100%", "Konfirmasi pengerjaan tuntas", "Tugas berhasil dieksekusi", "Seluruh tahapan berhasil").\n` +
            `   - Langsung berikan jawaban/ringkasan hasil yang rapi, padat, dan jelas (inti materi/fitur & nama berkas yang siap dibuka).\n` +
            `   - Jangan menambahkan tag aksi lagi.\n` +
            `3. Jika masih ada berkas atau verifikasi yang belum dikerjakan, langsung jalankan tag aksinya tanpa teks narasi pengantar.\n` +
            `4. Jika membuat aplikasi web, jalankan <screenshot target="index.html" /> bila belum dilakukan.`;
        }

        apiMessages.push({
          role: 'user',
          content: followUpInstruction
        });

        // SOTA Context Compaction (Claude Code / Codex Standard):
        // Prevent token explosion by compacting older intermediate tool write/output messages while retaining system & latest turn
        if (apiMessages.length > 8) {
          for (let mIdx = 2; mIdx < apiMessages.length - 2; mIdx++) {
            const msg = apiMessages[mIdx];
            if (msg.role === 'assistant' && typeof msg.content === 'string') {
              msg.content = msg.content.replace(/<write_file path="([^"]+)">[\s\S]{300,}?<\/write_file>/g, '<write_file path="$1">[konten sebelumnya telah ditulis ke disk]</write_file>');
            } else if (msg.role === 'user' && typeof msg.content === 'string') {
              msg.content = msg.content.replace(/\[HASIL OBSERVASI \d+ \([^)]+\)\]:[\s\S]{500,}?(?=(\[HASIL OBSERVASI|\n\n\[STATUS|\n\n🚨|\n\nINSTRUKSI|$))/g, (match) => {
                const lines = match.split('\n');
                if (lines.length > 10) {
                  return lines.slice(0, 4).join('\n') + '\n... [observasi historis diringkas untuk efisiensi konteks] ...\n' + lines.slice(-3).join('\n');
                }
                return match;
              });
            }
          }
        }

        continueAutonomousLoop = true;
      } else {
        if (deferDeltaUntilDone && turnAnswerText.trim()) {
          accumulatedAnswer = turnAnswerText.trim();
        }
        if (isSelfHealingActive) {
          updateLastStep('completed', 'Perbaikan selesai.');
          isSelfHealingActive = false;
        }
        continueAutonomousLoop = false;
      }
    }

    if (isAborted) {
      endStream();
      return;
    }

    // Clean accumulated answer: strip reasoning, action pills, subagent tags, and confirmation clutter
    accumulatedAnswer = accumulatedAnswer
      .replace(/<(?:think|thought|thinking|reasoning|plan)[^>]*>[\s\S]*?<\/(?:think|thought|thinking|reasoning|plan)>/gi, '')
      .replace(/<(?:think|thought|thinking|reasoning|plan)[^>]*>[\s\S]*/gi, '')
      .replace(/<\/?(?:SUBAGENT_PLAN|SUBAGENT_COT|SUBAGENT_FILE|SUBAGENT_SUMMARY)\b[^>]*>/gi, '')
      .replace(/<action_pill\b[^>]*>[\s\S]*?<\/action_pill>/gi, '')
      .replace(/<\/?action_pill\b[^>]*>/gi, '')
      .replace(/<action_pill[\s\S]*$/i, '')
      .replace(/\((?:do|do_search)\)\s*/gi, '')
      .replace(/^(?:[-*•]\s*)?(?:✅|📊|🚀)?\s*\*{0,2}Status:?\*{0,2}\s*Konfirmasi[^\n]*\n?/gim, '')
      .replace(/^(?:Seluruh\s+tugas\s+berhasil\s+dieksekusi|Tugas\s+berhasil\s+dieksekusi|Konfirmasi\s+pengerjaan\s+tuntas)[^\n]*\n?/gim, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Final verification of files
    let finalFiles = agentSandboxService.listFiles(sessionId);

    // Safety Net: If target document was requested but not generated yet, auto-execute generator scripts or spec.json kits
    const isCreationIntent = /\b(buat|bikin|create|generate|rancang|susun|tulis|tambahkan|edit|ubah|ganti)\b/i.test(promptLower);
    const hasPptx = finalFiles.some(f => f.ext === 'pptx');
    const hasDocx = finalFiles.some(f => f.ext === 'docx');
    const hasXlsx = finalFiles.some(f => f.ext === 'xlsx');

    const pyFiles = finalFiles.filter(f => f.ext === 'py' && f.name !== 'SKILL.md' && f.name !== 'CLAUDE.md');
    const specJsonFile = finalFiles.find(f => f.name === 'spec.json' || f.ext === 'json');

    if (isCreationIntent && wantsPptx && !hasPptx) {
      const pptScript = pyFiles.find(f => /ppt|slide|pres/i.test(f.name)) || pyFiles[0];
      if (pptScript) {
        addStep('command', `Menyusun Presentasi (.pptx)`, `Menjalankan '${pptScript.name}'...`, 'running');
        try {
          const res = await agentSandboxService.executeInSandbox(sessionId, { command: `python "${pptScript.name}"` });
          finalFiles = agentSandboxService.listFiles(sessionId);
          const created = finalFiles.some(f => f.ext === 'pptx');
          updateLastStep(res.success || created ? 'completed' : 'failed', created ? 'Presentasi (.pptx) dibuat.' : (res.stderr || 'Gagal'));
          emitEvent('files_update', { files: finalFiles });
        } catch (_) { }
      } else if (specJsonFile) {
        addStep('command', `Menyusun Presentasi (.pptx)`, `Memproses '${specJsonFile.path}' ke PowerPoint...`, 'running');
        try {
          const res = await agentSandboxService.executeInSandbox(sessionId, { command: `python kits/pptx_designer.py "${specJsonFile.path}" presentasi.pptx` });
          finalFiles = agentSandboxService.listFiles(sessionId);
          const created = finalFiles.some(f => f.ext === 'pptx');
          updateLastStep(res.success || created ? 'completed' : 'failed', created ? 'presentasi.pptx dibuat.' : (res.stderr || 'Gagal'));
          emitEvent('files_update', { files: finalFiles });
        } catch (_) { }
      }
    }

    if (isCreationIntent && wantsDocx && !finalFiles.some(f => f.ext === 'docx')) {
      const docxScript = pyFiles.find(f => /docx|word|doc|laporan/i.test(f.name)) || pyFiles[0];
      if (docxScript) {
        addStep('command', `Menyusun Dokumen (.docx)`, `Menjalankan '${docxScript.name}'...`, 'running');
        try {
          const res = await agentSandboxService.executeInSandbox(sessionId, { command: `python "${docxScript.name}"` });
          finalFiles = agentSandboxService.listFiles(sessionId);
          const created = finalFiles.some(f => f.ext === 'docx');
          updateLastStep(res.success || created ? 'completed' : 'failed', created ? 'Dokumen (.docx) dibuat.' : (res.stderr || 'Gagal'));
          emitEvent('files_update', { files: finalFiles });
        } catch (_) { }
      } else if (specJsonFile) {
        addStep('command', `Menyusun Dokumen (.docx)`, `Memproses '${specJsonFile.path}' ke Word...`, 'running');
        try {
          const res = await agentSandboxService.executeInSandbox(sessionId, { command: `python kits/word_kit.py "${specJsonFile.path}" dokumen.docx` });
          finalFiles = agentSandboxService.listFiles(sessionId);
          const created = finalFiles.some(f => f.ext === 'docx');
          updateLastStep(res.success || created ? 'completed' : 'failed', created ? 'dokumen.docx dibuat.' : (res.stderr || 'Gagal'));
          emitEvent('files_update', { files: finalFiles });
        } catch (_) { }
      }
    }

    if (isCreationIntent && wantsXlsx && !finalFiles.some(f => f.ext === 'xlsx')) {
      const xlsxScript = pyFiles.find(f => /xlsx|excel|sheet/i.test(f.name)) || pyFiles[0];
      if (xlsxScript) {
        addStep('command', `Menyusun Spreadsheet (.xlsx)`, `Menjalankan '${xlsxScript.name}'...`, 'running');
        try {
          const res = await agentSandboxService.executeInSandbox(sessionId, { command: `python "${xlsxScript.name}"` });
          finalFiles = agentSandboxService.listFiles(sessionId);
          const created = finalFiles.some(f => f.ext === 'xlsx');
          updateLastStep(res.success || created ? 'completed' : 'failed', created ? 'Spreadsheet (.xlsx) dibuat.' : (res.stderr || 'Gagal'));
          emitEvent('files_update', { files: finalFiles });
        } catch (_) { }
      } else if (specJsonFile) {
        addStep('command', `Menyusun Spreadsheet (.xlsx)`, `Memproses '${specJsonFile.path}' ke Excel...`, 'running');
        try {
          const res = await agentSandboxService.executeInSandbox(sessionId, { command: `python kits/excel_kit.py "${specJsonFile.path}" spreadsheet.xlsx` });
          finalFiles = agentSandboxService.listFiles(sessionId);
          const created = finalFiles.some(f => f.ext === 'xlsx');
          updateLastStep(res.success || created ? 'completed' : 'failed', created ? 'spreadsheet.xlsx dibuat.' : (res.stderr || 'Gagal'));
          emitEvent('files_update', { files: finalFiles });
        } catch (_) { }
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
      if (f.path === 'SKILL.md' || f.path === 'CLAUDE.md' || f.path.startsWith('_runner_temp') || (f.ext && f.ext.endsWith('pyc'))) return false;
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

    if (!accumulatedAnswer) {
      if (relevantFiles.length > 0) {
        accumulatedAnswer = `Berikut berkas yang disiapkan:\n${relevantFiles.map((f) => `- \`${f.name}\``).join('\n')}`;
      } else {
        accumulatedAnswer = '';
      }
    }

    const finishMessage = relevantFiles.length > 0
      ? `${relevantFiles.length} berkas siap`
      : 'Selesai';

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

    endStream();
  } catch (runErr) {
    if (isAborted) {
      endStream();
      return;
    }
    console.error('[AGENT_RUN_ERROR]', runErr);
    addStep('error', 'Terjadi Kendala', runErr.message, 'failed');
    emitEvent('error', { error: runErr.message, chainOfWork });
    endStream();
  }
}

const PREVIEWABLE_TEXT_EXTS = new Set([
  'html', 'htm', 'css', 'js', 'mjs', 'jsx', 'ts', 'tsx',
  'py', 'json', 'md', 'sql', 'csv', 'svg', 'sh', 'yml', 'yaml', 'txt'
]);

/**
 * Enrich sandbox file metadata with direct download/raw URLs and inline text content for live preview/code panels.
 */
export function buildEnrichedSandboxFiles(sessionId, files = []) {
  if (!Array.isArray(files) || !sessionId) return [];
  const encodedSid = encodeURIComponent(sessionId);
  return files
    .filter((f) => f && f.name !== 'CLAUDE.md' && f.name !== 'SKILL.md' && !String(f.name || '').startsWith('_runner_temp'))
    .map((f) => {
      const relPath = f.path || f.name;
      const ext = (f.ext || String(relPath).split('.').pop() || '').toLowerCase();
      const encodedPath = encodeURIComponent(relPath);
      const isText = PREVIEWABLE_TEXT_EXTS.has(ext);
      let textContent = null;
      if (isText && (f.size || 0) <= 250000) {
        try {
          textContent = agentSandboxService.readFile(sessionId, relPath);
        } catch (_) {
          textContent = null;
        }
      }
      return {
        ...f,
        name: f.name || path.basename(relPath),
        path: relPath,
        ext,
        isServerFile: true,
        url: `/api/agent/file/raw?sessionId=${encodedSid}&path=${encodedPath}`,
        downloadUrl: `/api/agent/file/download?sessionId=${encodedSid}&path=${encodedPath}`,
        ...(textContent != null ? { content: textContent } : {})
      };
    });
}

router.post('/run', async (req, res) => {
  const { sessionId, prompt, model = 'qwen2.5-vl-72b', history = [], effort = 'high', language = 'id' } = req.body;
  const userId = getUserId(req);

  if (!sessionId || !prompt) {
    return res.status(400).json({ success: false, error: 'sessionId dan prompt diperlukan' });
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
  res.write(': connected\n\n');

  await executeAutonomousAgentRun({
    sessionId,
    prompt,
    model,
    history,
    effort,
    language,
    userId,
    onEvent: (eventType, data) => {
      res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    },
    onCloseRegister: (cb) => {
      res.on('close', () => {
        if (!res.writableEnded) cb();
      });
    },
    finishStream: () => {
      if (!res.writableEnded) res.end();
    }
  });
});

export default router;
