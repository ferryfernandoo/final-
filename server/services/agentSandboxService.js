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
export const DEFAULT_SKILL_MD = `# ⚡ DEEPERNOVA AGENTIC CODING PROTOCOL (SKILL.md)
Role: Senior Autonomous Full-Stack Engineer & Code Sandbox Architect
Version: 2.5
Target: Production-Ready, Verified, Bug-Free Code

---

## 🎯 PROTOKOL KERJA OTONOM (Langkah Demi Langkah)
Agar tindakan Anda terarah, terukur, dan tidak hilang arah:
1. **Analisis Masalah (Thought & Plan)**: Pahami apa yang diminta user sebelum menyentuh file.
2. **Periksa Struktur Workspace**: Amati berkas yang sudah ada di sandbox.
3. **Penyusunan Kode (Write File)**: Tulis berkas kode secara utuh dan terstruktur (HTML, CSS, JS/Node, Python). Jangan tinggalkan placeholder atau snippet setengah jadi.
4. **Eksekusi & Verifikasi (Run Code / Terminal)**: Uji kode di sandbox. Pastikan stdout tidak menghasilkan error atau syntax exception.
5. **Live Preview**: Jika proyek berupa aplikasi web, jadikan 'index.html' sebagai entry point agar dapat dirender live di layar browser pengguna.
6. **Transparansi Chain-of-Work**: Laporkan setiap fase pengerjaan secara jujur dan transparan ke pengguna.

---

## 🛠 TOOLS TERSEDIA
- \`<thought>...\</thought>\`: Catatan berpikir dan strategi teknis Anda.
- \`<write_file path="nama_file.ext">isi kode\</write_file>\`: Membuat atau memperbarui berkas di sandbox.
- \`<execute_code language="node|python">kode untuk dijalankan\</execute_code>\`: Menjalankan kode di sandbox dan menangkap output terminal.
- \`<run_command>perintah terminal\</run_command>\`: Menjalankan command shell aman di folder workspace.
- \`<preview>nama_file.html\</preview>\`: Menetapkan berkas preview visual web.

---

## 🔒 ATURAN KEAMANAN SANDBOX
- Semua berkas terkunci di dalam direktori workspace sesi ini.
- Dilarang keras mencoba mengakses direktori sistem di luar workspace.
- Utamakan performa, UI modern responsif, dan kode bersih yang mudah dipahami.
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
 * Parse agent tool tags from upstream model response
 */
export function extractAgentActions(text) {
  const actions = [];
  let remainingText = text;

  // 1. Extract thought
  const thoughtRegex = /<thought>([\s\S]*?)<\/thought>/gi;
  let match;
  while ((match = thoughtRegex.exec(text)) !== null) {
    actions.push({
      type: 'thought',
      content: match[1].trim()
    });
  }

  // 2. Extract write_file
  const writeFileRegex = /<write_file\s+path=["']([^"']+)["']>([\s\S]*?)<\/write_file>/gi;
  while ((match = writeFileRegex.exec(text)) !== null) {
    actions.push({
      type: 'write_file',
      path: match[1].trim(),
      content: match[2]
    });
  }

  // 3. Extract execute_code
  const execCodeRegex = /<execute_code(?:\s+language=["']([^"']+)["'])?>([\s\S]*?)<\/execute_code>/gi;
  while ((match = execCodeRegex.exec(text)) !== null) {
    actions.push({
      type: 'execute_code',
      language: match[1] || 'node',
      code: match[2].trim()
    });
  }

  // 4. Extract run_command
  const runCommandRegex = /<run_command>([\s\S]*?)<\/run_command>/gi;
  while ((match = runCommandRegex.exec(text)) !== null) {
    actions.push({
      type: 'run_command',
      command: match[1].trim()
    });
  }

  // 5. Extract preview
  const previewRegex = /<preview>([\s\S]*?)<\/preview>/gi;
  while ((match = previewRegex.exec(text)) !== null) {
    actions.push({
      type: 'preview',
      entryFile: match[1].trim()
    });
  }

  // Clean the text from XML tags for human friendly reading
  const cleanSummary = text
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/<write_file[\s\S]*?<\/write_file>/gi, '')
    .replace(/<execute_code[\s\S]*?<\/execute_code>/gi, '')
    .replace(/<run_command>[\s\S]*?<\/run_command>/gi, '')
    .replace(/<preview>[\s\S]*?<\/preview>/gi, '')
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
  extractAgentActions,
  DEFAULT_SKILL_MD
};
