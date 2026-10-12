import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import { agentSessionDb, agentMessageDb } from '../database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root path for all user sandboxes
const SANDBOX_ROOT = path.resolve(__dirname, '..', 'temp-files', 'sandbox');

if (!fs.existsSync(SANDBOX_ROOT)) {
  fs.mkdirSync(SANDBOX_ROOT, { recursive: true });
}

// Default standard SKILL.md template to guide the agent
export const DEFAULT_SKILL_MD = `# ⚡ DEEPERNOVA AGENTIC CODING & WORKFLOW PROTOCOL (SKILL.md)
Role: Senior Autonomous AI Agent, Software Engineer & Document Creator
Language: Indonesian (Warm, Conversational, Professional)

---

## 🎯 PRINSIP KOMUNIKASI & EKSEKUSI AGENTIC
1. Berbicaralah secara hangat, komunikatif, dan alami dalam Bahasa Indonesia.
2. Jelaskan langkah Anda secara bersahabat di antara aksi-aksi Anda (interleaved workflow).
3. JANGAN PERNAH menulis teks pura-pura seperti "(do)" atau "(do_search)". Gunakan tag aksi XML yang nyata.
4. Sistem akan otomatis menampilkan aksi Anda sebagai tombol pill interaktif yang dapat diklik pengguna untuk melihat detail (file, pencarian, kode, log terminal).
5. Tulis kode nyata, lengkap, dan tanpa placeholder.

---

## 🛠 DAFTAR AKSI (TOOLS) TERSEDIA:
- \`<read_file path="nama_file.ext" />\`
  Membaca isi berkas dari sandbox atau panduan SKILL.md.
- \`<search_web query="kata kunci pencarian" />\`
  Mencari referensi, inspirasi materi/puisi/laporan, atau data aktual di internet.
- \`<run_command>perintah terminal</run_command>\`
  Menjalankan perintah terminal di workspace sandbox.
- \`<write_file path="nama_file.ext">isi berkas</write_file>\`
  Membuat atau memperbarui berkas kode/skrip secara utuh.
- \`<execute_code language="python|node">kode</execute_code>\`
  Mengeksekusi kode langsung di sandbox dan menangkap stdout/stderr.
- \`<check_file path="nama_file.ext" />\`
  Memverifikasi bahwa berkas hasil pengerjaan benar-benar sudah ada di disk.
- \`<preview>index.html</preview>\`
  Menetapkan live web preview (khusus proyek aplikasi web).

---

## 📄 PEMBUATAN BERKAS OFFICE (.DOCX, .XLSX):
- Python 3 di sandbox sudah terpasang pustaka 'python-docx' dan 'openpyxl'.
- Untuk dokumen Word (.docx): Tulis skrip Python dengan 'python-docx' (heading, format paragraf, tabel, bullet points), simpan dengan doc.save("nama_file.docx"), lalu eksekusi dengan <execute_code language="python">!
- Untuk spreadsheet Excel (.xlsx): Tulis skrip Python dengan 'openpyxl', simpan dengan wb.save("nama_file.xlsx"), lalu eksekusi!
- Selalu periksa berkas output dengan <check_file path="nama_file.docx" /> sebelum memberikan tautan unduhan ke pengguna.
`;

/**
 * Helper to safely sanitize sessionId
 */
function sanitizeSessionId(sessionId) {
  if (!sessionId) return 'default_session';
  return String(sessionId).replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Get or create sandbox directory for a session
 */
export function getSandboxDir(sessionId) {
  const safeId = sanitizeSessionId(sessionId);
  const dir = path.join(SANDBOX_ROOT, safeId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    // Initialize default SKILL.md
    const skillPath = path.join(dir, 'SKILL.md');
    fs.writeFileSync(skillPath, DEFAULT_SKILL_MD, 'utf8');
  }
  return dir;
}

/**
 * Safely resolve a path inside the sandbox directory, preventing directory traversal
 */
export function safeResolvePath(sessionId, relativePath) {
  const sandboxDir = getSandboxDir(sessionId);
  const cleanRelative = String(relativePath || '').replace(/^[\\/]+/, '');
  const targetPath = path.resolve(sandboxDir, cleanRelative);

  if (!targetPath.startsWith(sandboxDir)) {
    throw new Error('Akses ditolak: Percobaan path traversal di luar sandbox terdeteksi.');
  }
  return targetPath;
}

/**
 * Write file to sandbox
 */
export function writeFile(sessionId, relativePath, content) {
  const filePath = safeResolvePath(sessionId, relativePath);
  const parentDir = path.dirname(filePath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
  fs.writeFileSync(filePath, content || '', 'utf8');
  const stats = fs.statSync(filePath);
  return {
    path: path.relative(getSandboxDir(sessionId), filePath).replace(/\\/g, '/'),
    size: stats.size,
    updatedAt: stats.mtime
  };
}

/**
 * Read file from sandbox
 */
export function readFile(sessionId, relativePath) {
  const filePath = safeResolvePath(sessionId, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File '${relativePath}' tidak ditemukan di sandbox.`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Delete file or directory from sandbox
 */
export function deleteFile(sessionId, relativePath) {
  const filePath = safeResolvePath(sessionId, relativePath);
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
    return true;
  }
  return false;
}

/**
 * List all files in sandbox
 */
export function listFiles(sessionId) {
  const sandboxDir = getSandboxDir(sessionId);
  const results = [];

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const item of items) {
      if (item.name === '.git' || item.name === 'node_modules' || item.name.startsWith('_runner_temp')) continue;
      const fullPath = path.join(currentDir, item.name);
      const relative = path.relative(sandboxDir, fullPath).replace(/\\/g, '/');
      if (item.isDirectory()) {
        walk(fullPath);
      } else {
        const stat = fs.statSync(fullPath);
        results.push({
          name: item.name,
          path: relative,
          size: stat.size,
          ext: path.extname(item.name).toLowerCase().replace('.', ''),
          updatedAt: stat.mtime
        });
      }
    }
  }

  walk(sandboxDir);
  return results;
}

/**
 * Execute code or command safely inside session sandbox
 */
export async function executeInSandbox(sessionId, { language = 'node', code = '', command = '', timeoutMs = 15000 }) {
  const sandboxDir = getSandboxDir(sessionId);
  const startTime = Date.now();

  // If specific code snippet provided, write to a runner script
  let execCommand = '';
  let createdRunnerFile = null;
  const langLower = (language || '').toLowerCase();

  if (command && command.trim()) {
    // Sanitize command against dangerous commands
    const dangerousPatterns = [
      /rm\s+-rf\s+\//i,
      /format\s+[a-z]:/i,
      /shutdown/i,
      /reboot/i,
      /powershell\s+-enc/i,
      /:(){ :|:& };:/i,
      /mkfs/i,
      /dd\s+if=/i
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        throw new Error('Perintah ditolak: Terdeteksi perintah sistem berbahaya.');
      }
    }
    execCommand = command.trim();
  } else if (langLower === 'python' || langLower === 'py') {
    createdRunnerFile = path.join(sandboxDir, `_runner_temp_${Date.now()}.py`);
    fs.writeFileSync(createdRunnerFile, code, 'utf8');
    execCommand = `python "${path.basename(createdRunnerFile)}"`;
  } else {
    // Default: Node.js / JavaScript
    createdRunnerFile = path.join(sandboxDir, `_runner_temp_${Date.now()}.mjs`);
    fs.writeFileSync(createdRunnerFile, code, 'utf8');
    execCommand = `node "${path.basename(createdRunnerFile)}"`;
  }

  return new Promise((resolve) => {
    exec(
      execCommand,
      {
        cwd: sandboxDir,
        timeout: timeoutMs,
        maxBuffer: 1024 * 512, // 512 KB
        env: {
          ...process.env,
          NODE_ENV: 'sandbox',
          SANDBOX_SESSION: sessionId
        }
      },
      (error, stdout, stderr) => {
        if (createdRunnerFile && fs.existsSync(createdRunnerFile)) {
          try { fs.unlinkSync(createdRunnerFile); } catch {}
        }
        const executionTimeMs = Date.now() - startTime;
        const cleanStdout = (stdout || '').toString();
        const cleanStderr = (stderr || '').toString();

        let exitCode = 0;
        let success = true;

        if (error) {
          exitCode = error.code || (error.killed ? 124 : 1);
          success = false;
        }

        resolve({
          command: execCommand,
          stdout: cleanStdout,
          stderr: cleanStderr + (error && error.killed ? '\n[TIMEOUT] Eksekusi dihentikan karena melebihi batas waktu 15 detik.' : ''),
          exitCode,
          executionTimeMs,
          success: success && exitCode === 0
        });
      }
    );
  });
}

/**
 * Parse agent tool tags sequentially from model response
 */
export function extractSequentialActions(text) {
  if (!text) return [];
  const actions = [];
  const writtenPaths = new Set();

  // Unified tag regex matching paired or self-closing action tags
  const tagRegex = /<(thought|read_file|read|search_web|search|run_command|command|terminal|write_file|file|execute_code|run_code|check_file|verify_file|preview)([^>]*)>([\s\S]*?)<\/\1>|<(read_file|read|search_web|search|check_file|verify_file)\s+([^>]*?)\/?>/gi;

  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    const rawMatch = match[0];
    const index = match.index;

    if (match[1]) {
      // Paired tag: <tag attr>body</tag>
      const tagName = match[1].toLowerCase();
      const attrStr = match[2] || '';
      const body = (match[3] || '').trim();

      const getAttr = (name) => {
        const m = attrStr.match(new RegExp(`${name}=["']([^"']+)["']|${name}=([^\\s>]+)`, 'i'));
        return m ? (m[1] || m[2] || '') : '';
      };

      if (tagName === 'thought') {
        actions.push({ type: 'thought', content: body, rawMatch, index });
      } else if (tagName === 'read_file' || tagName === 'read') {
        const filePath = getAttr('path') || getAttr('file') || body.split('\n')[0].trim();
        actions.push({ type: 'read_file', path: filePath, rawMatch, index });
      } else if (tagName === 'search_web' || tagName === 'search') {
        const query = getAttr('query') || getAttr('q') || body;
        actions.push({ type: 'search_web', query, rawMatch, index });
      } else if (tagName === 'run_command' || tagName === 'command' || tagName === 'terminal') {
        actions.push({ type: 'run_command', command: body, rawMatch, index });
      } else if (tagName === 'write_file' || tagName === 'file') {
        const filePath = getAttr('path') || getAttr('file') || getAttr('name');
        actions.push({ type: 'write_file', path: filePath, content: body, rawMatch, index });
        if (filePath) writtenPaths.add(filePath.toLowerCase());
      } else if (tagName === 'execute_code' || tagName === 'run_code') {
        const language = getAttr('language') || getAttr('lang') || 'node';
        actions.push({ type: 'execute_code', language, code: body, rawMatch, index });
      } else if (tagName === 'check_file' || tagName === 'verify_file') {
        const filePath = getAttr('path') || getAttr('file') || body.split('\n')[0].trim();
        actions.push({ type: 'check_file', path: filePath, rawMatch, index });
      } else if (tagName === 'preview') {
        actions.push({ type: 'preview', entryFile: body || 'index.html', rawMatch, index });
      }
    } else if (match[4]) {
      // Self-closing tag: <tag attr />
      const tagName = match[4].toLowerCase();
      const attrStr = match[5] || '';

      const getAttr = (name) => {
        const m = attrStr.match(new RegExp(`${name}=["']([^"']+)["']|${name}=([^\\s>]+)`, 'i'));
        return m ? (m[1] || m[2] || '') : '';
      };

      if (tagName === 'read_file' || tagName === 'read') {
        const filePath = getAttr('path') || getAttr('file');
        actions.push({ type: 'read_file', path: filePath, rawMatch, index });
      } else if (tagName === 'search_web' || tagName === 'search') {
        const query = getAttr('query') || getAttr('q');
        actions.push({ type: 'search_web', query, rawMatch, index });
      } else if (tagName === 'check_file' || tagName === 'verify_file') {
        const filePath = getAttr('path') || getAttr('file');
        actions.push({ type: 'check_file', path: filePath, rawMatch, index });
      }
    }
  }

  // Fallback: Markdown code blocks if model didn't use XML tags for writing files
  const codeBlockRegex = /```([a-zA-Z0-9_-]+)?(?::|\s+(?:file|filename|path)=["']?([^\s"'>\n]+)["']?)?\n([\s\S]*?)```/g;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const lang = (match[1] || '').toLowerCase();
    let detectedPath = match[2] || '';
    const codeContent = match[3] || '';

    if (!detectedPath) {
      const firstLine = (codeContent.trim().split('\n')[0] || '').trim();
      const commentFileMatch = firstLine.match(/^(?:\/{2}|<!--|#|\/\*)\s*(?:file(?:name)?:\s*)?([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)\s*(?:-->|\*\/)?$/i);
      if (commentFileMatch) {
        detectedPath = commentFileMatch[1].trim();
      }
    }

    if (!detectedPath && !writtenPaths.size && codeContent.trim().length > 30) {
      if (lang === 'html' || codeContent.includes('<!DOCTYPE') || codeContent.includes('<html')) {
        detectedPath = 'index.html';
      } else if (lang === 'css' || codeContent.includes('margin:') || codeContent.includes('padding:')) {
        detectedPath = 'style.css';
      } else if (lang === 'js' || lang === 'javascript') {
        detectedPath = 'app.js';
      } else if (lang === 'py' || lang === 'python') {
        detectedPath = 'main.py';
      } else if (lang === 'json') {
        detectedPath = 'data.json';
      }
    }

    if (detectedPath && !writtenPaths.has(detectedPath.toLowerCase())) {
      actions.push({
        type: 'write_file',
        path: detectedPath,
        content: codeContent.trim(),
        rawMatch: match[0],
        index: match.index
      });
      writtenPaths.add(detectedPath.toLowerCase());
    }
  }

  // Sort chronologically by occurrence in text
  actions.sort((a, b) => a.index - b.index);
  return actions;
}

/**
 * Backward compatibility wrapper
 */
export function extractAgentActions(text) {
  const actions = extractSequentialActions(text);
  const cleanSummary = text
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/<(?:write_file|file)[\s\S]*?<\/(?:write_file|file)>/gi, '')
    .replace(/<execute_code[\s\S]*?<\/execute_code>/gi, '')
    .replace(/<run_command>[\s\S]*?<\/run_command>/gi, '')
    .replace(/<preview>[\s\S]*?<\/preview>/gi, '')
    .replace(/<read_file[^>]*>(?:[\s\S]*?<\/read_file>)?/gi, '')
    .replace(/<search_web[^>]*>(?:[\s\S]*?<\/search_web>)?/gi, '')
    .replace(/<check_file[^>]*>(?:[\s\S]*?<\/check_file>)?/gi, '')
    .replace(/\((?:do|do_search)\)\s*/gi, '')
    .trim();

  return { actions, cleanSummary };
}

export default {
  getSandboxDir,
  safeResolvePath,
  writeFile,
  readFile,
  deleteFile,
  listFiles,
  executeInSandbox,
  extractSequentialActions,
  extractAgentActions,
  DEFAULT_SKILL_MD
};
