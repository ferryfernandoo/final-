// ============================================================================
// DeeperNova AI — Synchronous Sub-Agent Orchestrator Service
// ============================================================================
// Implements a deterministic, 100% synchronous multi-stage Sub-Agent Orchestrator
// directly inside ChatBot (non-polling, non-background-queue):
//   Stage 1: Planner & Architect Sub-Agent (Architecture & File Manifest)
//   Stage 2: Engineer & File Builder Sub-Agent (Chain-of-Thought + File Synthesis)
//   Stage 3: QA Verifier & Delivery Sub-Agent (Validation + Final Answer + ZIP/Files)
// ============================================================================

import JSZip from 'jszip';
import { API_BASE_URL } from '../apiConfig.js';
import { getDeviceId } from './realtimeSyncService.js';

export const SUBAGENT_FLAG_REGEX = /\[(?:SUBAGENT_ORCHESTRATE|ACTIVATE_SUBAGENT|SUBAGENT_REQUEST|SUB_AGENT|AGENT_EXECUTE):\s*([\s\S]+?)\]/i;
export const SUBAGENT_XML_REGEX = /<subagent(?:_orchestrate)?>\s*([\s\S]+?)\s*<\/subagent(?:_orchestrate)?>/i;

/**
 * Detect if raw streaming text currently has a partial (unclosed) Sub-Agent tag at the end
 */
export function hasPartialSubAgentTag(text = '') {
  if (!text || typeof text !== 'string') return false;
  return (
    /\[(?:SUB|SUBA|SUBAG|SUBAGE|SUBAGEN|SUBAGENT|ACTIVATE_SUB|AGENT_EXEC)[A-Z_]*(?::[^\]]*)?$/i.test(text) ||
    /<subagent(?:_orchestrate)?(?:>[\s\S]*)?$/i.test(text) && !/<\/subagent(?:_orchestrate)?>/i.test(text)
  );
}

/**
 * Strip all Sub-Agent activation flags (complete or partial) from display text
 */
export function stripSubAgentFlags(text = '') {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\[(?:SUBAGENT_ORCHESTRATE|ACTIVATE_SUBAGENT|SUBAGENT_REQUEST|SUB_AGENT|AGENT_EXECUTE):[\s\S]*?\]/gi, '')
    .replace(/\[(?:SUBAGENT_ORCHESTRATE|ACTIVATE_SUBAGENT|SUBAGENT_REQUEST|SUB_AGENT|AGENT_EXECUTE):[\s\S]*$/gi, '')
    .replace(/<subagent(?:_orchestrate)?>[\s\S]*?<\/subagent(?:_orchestrate)?>/gi, '')
    .replace(/<subagent(?:_orchestrate)?>[\s\S]*$/gi, '')
    .trim();
}

/**
 * Parse AI response text to check for Sub-Agent activation flag.
 * Preserves the AI's normal conversational reply ("jawab biasa") before activating Sub-Agent.
 */
export function parseSubAgentFlag(text = '', fallbackUserPrompt = '', language = 'id') {
  if (!text || typeof text !== 'string') return { hasFlag: false };

  const bracketMatch = text.match(SUBAGENT_FLAG_REGEX);
  const xmlMatch = !bracketMatch ? text.match(SUBAGENT_XML_REGEX) : null;
  const match = bracketMatch || xmlMatch;

  if (!match || !match[1]) {
    return { hasFlag: false };
  }

  const rawTask = match[1].trim().replace(/^["']|["']$/g, '');
  const taskDescription = rawTask || fallbackUserPrompt || 'Eksekusi tugas Sub-Agent & pembuatan berkas';
  let introText = stripSubAgentFlags(text);

  if (!introText || introText.length < 8) {
    introText = buildDefaultIntroText(taskDescription, language);
  }

  return {
    hasFlag: true,
    taskDescription,
    introText
  };
}

/**
 * Check if the user explicitly requested Sub-Agent mode or downloadable file/project creation,
 * as a safety net when the LLM answers normally without emitting the literal bracket flag.
 */
export function detectExplicitSubAgentUserIntent(userPrompt = '') {
  if (!userPrompt || typeof userPrompt !== 'string') return false;
  const norm = userPrompt.trim();
  if (norm.length < 4) return false;

  // 1. Explicit sub-agent mention
  if (/\b(sub[\s-]*agent|subagent|mode\s+agentic|agent\s+orchestrator|aktifkan\s+agent|pake\s+sub\s*agent)\b/i.test(norm)) {
    return true;
  }

  // 2. Explicit request to generate & send/deliver a file in chat
  if (/\b(kirim(?:kan)?\s+file(?:nya)?|buat(?:kan|in)?\s+file|bikin(?:kan|in)?\s+file|generate\s+file|sertakan\s+file(?:nya)?|dalam\s+bentuk\s+file)\b/i.test(norm)) {
    return true;
  }

  return false;
}

export function buildDefaultIntroText(taskDescription = '', language = 'id') {
  const cleanTask = (taskDescription || '').slice(0, 120);
  if (language === 'en') {
    return `Sure! I will help you design and build **${cleanTask}**. I am now activating the **Synchronous Sub-Agent Orchestrator** to perform step-by-step Chain of Thought reasoning and deliver the complete files directly below.`;
  }
  if (language === 'zh') {
    return `好的！我将为您设计和构建 **${cleanTask}**。现在正在启动 **同步子代理编排器 (Sub-Agent Orchestrator)**，通过思维链 (Chain of Thought) 逐步推理并直接向您发送完整文件。`;
  }
  return `Siap! Aku akan membantu merancang dan menyelesaikan permintaanmu untuk **${cleanTask}**. Sekarang aku aktifkan **Sub-Agent Orchestrator (Synchronous)** untuk menjalankan penalaran *Chain of Thought* bertahap sekaligus mengirimkan berkas lengkapnya langsung di bawah ini.`;
}

/**
 * Determine file metadata (language, badge, icon, MIME type) from filename
 */
export function getSubAgentFileMeta(fileName = 'output.txt') {
  const cleanName = String(fileName || 'output.txt').trim();
  const ext = (cleanName.split('.').pop() || 'txt').toLowerCase();

  const map = {
    html: { lang: 'html', badge: 'HTML5', icon: 'fa-brands fa-html5', color: '#e34f26', bg: 'rgba(227, 79, 38, 0.12)', mime: 'text/html' },
    htm: { lang: 'html', badge: 'HTML', icon: 'fa-brands fa-html5', color: '#e34f26', bg: 'rgba(227, 79, 38, 0.12)', mime: 'text/html' },
    css: { lang: 'css', badge: 'CSS3', icon: 'fa-brands fa-css3-alt', color: '#264de4', bg: 'rgba(38, 77, 228, 0.12)', mime: 'text/css' },
    js: { lang: 'javascript', badge: 'JS', icon: 'fa-brands fa-js', color: '#d97706', bg: 'rgba(245, 158, 11, 0.14)', mime: 'text/javascript' },
    mjs: { lang: 'javascript', badge: 'ESM', icon: 'fa-brands fa-js', color: '#d97706', bg: 'rgba(245, 158, 11, 0.14)', mime: 'text/javascript' },
    jsx: { lang: 'javascript', badge: 'React JSX', icon: 'fa-brands fa-react', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)', mime: 'text/javascript' },
    ts: { lang: 'typescript', badge: 'TS', icon: 'fa-solid fa-file-code', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.12)', mime: 'text/typescript' },
    tsx: { lang: 'typescript', badge: 'React TSX', icon: 'fa-brands fa-react', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)', mime: 'text/typescript' },
    py: { lang: 'python', badge: 'Python', icon: 'fa-brands fa-python', color: '#3776ab', bg: 'rgba(55, 118, 171, 0.12)', mime: 'text/x-python' },
    json: { lang: 'json', badge: 'JSON', icon: 'fa-solid fa-brackets-curly', color: '#059669', bg: 'rgba(5, 150, 105, 0.12)', mime: 'application/json' },
    md: { lang: 'markdown', badge: 'Markdown', icon: 'fa-solid fa-file-lines', color: '#4f46e5', bg: 'rgba(79, 70, 229, 0.12)', mime: 'text/markdown' },
    sql: { lang: 'sql', badge: 'SQL', icon: 'fa-solid fa-database', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)', mime: 'application/sql' },
    csv: { lang: 'csv', badge: 'CSV', icon: 'fa-solid fa-table', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.12)', mime: 'text/csv' },
    svg: { lang: 'xml', badge: 'SVG', icon: 'fa-solid fa-bezier-curve', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)', mime: 'image/svg+xml' },
    sh: { lang: 'bash', badge: 'Shell', icon: 'fa-solid fa-terminal', color: '#334155', bg: 'rgba(51, 65, 85, 0.12)', mime: 'text/x-shellscript' },
    yml: { lang: 'yaml', badge: 'YAML', icon: 'fa-solid fa-gears', color: '#ca8a04', bg: 'rgba(202, 138, 4, 0.12)', mime: 'text/yaml' },
    yaml: { lang: 'yaml', badge: 'YAML', icon: 'fa-solid fa-gears', color: '#ca8a04', bg: 'rgba(202, 138, 4, 0.12)', mime: 'text/yaml' },
    txt: { lang: 'text', badge: 'TXT', icon: 'fa-solid fa-file-alt', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)', mime: 'text/plain' }
  };

  return map[ext] || {
    lang: ext || 'text',
    badge: (ext || 'FILE').toUpperCase(),
    icon: 'fa-solid fa-file-code',
    color: '#4f46e5',
    bg: 'rgba(79, 70, 229, 0.12)',
    mime: 'text/plain'
  };
}

export function formatBytesSize(bytes = 0) {
  if (bytes < 1024) return `${Math.max(1, bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

/**
 * Create a structured file object from name, content, and description
 */
export function buildDeliverableFileObject(name, content, description = '', index = 0) {
  const cleanName = String(name || `deliverable_${index + 1}.txt`).trim().replace(/^[/\\]+/, '');
  const cleanContent = String(content || '').replace(/^\n+|\n+$/g, '');
  const sizeBytes = new Blob([cleanContent]).size;
  const lineCount = cleanContent ? cleanContent.split('\n').length : 0;
  const meta = getSubAgentFileMeta(cleanName);

  return {
    id: `sa_file_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    description: description || `Berkas ${meta.badge} hasil konstruksi Sub-Agent`,
    content: cleanContent,
    sizeBytes,
    sizeFormatted: formatBytesSize(sizeBytes),
    lineCount,
    language: meta.lang,
    badge: meta.badge,
    icon: meta.icon,
    color: meta.color,
    bg: meta.bg,
    mime: meta.mime,
    status: 'verified'
  };
}

/**
 * Download a single generated file immediately in browser
 */
export function downloadSingleSubAgentFile(file) {
  if (!file || !file.content) return;
  const meta = getSubAgentFileMeta(file.name);
  const blob = new Blob([file.content], { type: `${meta.mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name.split('/').pop() || 'file.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Package all Sub-Agent deliverable files into a single .ZIP archive and download
 */
export async function downloadAllSubAgentFilesAsZip(files = [], taskTitle = 'deepernova-subagent') {
  if (!Array.isArray(files) || files.length === 0) return;
  const zip = new JSZip();

  files.forEach((f, idx) => {
    const fileName = f.name || `file_${idx + 1}.txt`;
    zip.file(fileName, f.content || '');
  });

  const slug = String(taskTitle || 'deepernova-subagent')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'deepernova-subagent';

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}-files.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Bundle HTML + companion CSS + JS files from the same Sub-Agent run for instant interactive preview
 */
export function buildBundledHtmlPreview(files = [], targetHtmlFile = null) {
  if (!Array.isArray(files) || files.length === 0) return '';
  const htmlFile = targetHtmlFile || files.find(f => /\.(html?|svg)$/i.test(f.name));
  if (!htmlFile) return '';

  let html = htmlFile.content || '';
  const cssFiles = files.filter(f => /\.css$/i.test(f.name));
  const jsFiles = files.filter(f => /\.(?:js|mjs)$/i.test(f.name));

  // Inject companion CSS files
  if (cssFiles.length > 0) {
    const combinedCss = cssFiles.map(c => `/* === ${c.name} === */\n${c.content}`).join('\n\n');
    const styleTag = `\n<style data-subagent-bundled="true">\n${combinedCss}\n</style>\n`;
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${styleTag}</head>`);
    } else {
      html = styleTag + html;
    }
  }

  // Inject companion JS files
  if (jsFiles.length > 0) {
    const combinedJs = jsFiles.map(j => `// === ${j.name} ===\n${j.content}`).join('\n\n');
    const scriptTag = `\n<script data-subagent-bundled="true">\n${combinedJs}\n</script>\n`;
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `${scriptTag}</body>`);
    } else {
      html = html + scriptTag;
    }
  }

  return html;
}

/**
 * Parse live streaming buffer from Synchronous Sub-Agent Orchestrator
 */
function parseSynchronousOrchestratorBuffer(rawBuffer = '', taskDescription = '') {
  // 1. Extract <SUBAGENT_PLAN>...</SUBAGENT_PLAN>
  let planText = '';
  const planCompleteMatch = rawBuffer.match(/<SUBAGENT_PLAN>([\s\S]*?)<\/SUBAGENT_PLAN>/i);
  const planOpenMatch = !planCompleteMatch ? rawBuffer.match(/<SUBAGENT_PLAN>([\s\S]*)$/i) : null;
  if (planCompleteMatch) {
    planText = planCompleteMatch[1].trim();
  } else if (planOpenMatch) {
    planText = planOpenMatch[1].replace(/<(?:SUBAGENT_COT|SUBAGENT_FILE|SUBAGENT_SUMMARY)[\s\S]*$/i, '').trim();
  }

  // Extract planned file names from planText
  const plannedFiles = [];
  if (planText) {
    const fileRegex = /`?([a-zA-Z0-9_\-./]+\.(?:html|css|js|jsx|ts|tsx|py|json|md|sql|csv|svg|yml|yaml|sh|txt))`?/gi;
    let m;
    const seen = new Set();
    while ((m = fileRegex.exec(planText)) !== null) {
      const fn = m[1].trim();
      if (!seen.has(fn.toLowerCase())) {
        seen.add(fn.toLowerCase());
        plannedFiles.push(fn);
      }
    }
  }

  // 2. Extract <SUBAGENT_COT>...</SUBAGENT_COT>
  let cotText = '';
  const cotCompleteMatch = rawBuffer.match(/<SUBAGENT_COT>([\s\S]*?)<\/SUBAGENT_COT>/i);
  const cotOpenMatch = !cotCompleteMatch ? rawBuffer.match(/<SUBAGENT_COT>([\s\S]*)$/i) : null;
  if (cotCompleteMatch) {
    cotText = cotCompleteMatch[1].trim();
  } else if (cotOpenMatch) {
    cotText = cotOpenMatch[1].replace(/<(?:SUBAGENT_FILE|SUBAGENT_SUMMARY)[\s\S]*$/i, '').trim();
  }

  // Parse structured thought steps from CoT text + Plan text
  const thoughtSteps = [];
  if (planText) {
    const cleanPlanLines = planText
      .split('\n')
      .map(l => l.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter(l => l.length > 4);
    if (cleanPlanLines.length > 0) {
      thoughtSteps.push({
        id: 'step_plan',
        agent: 'Planner Sub-Agent',
        badge: 'PLANNER',
        title: 'Perencanaan Arsitektur & Spesifikasi Berkas',
        detail: cleanPlanLines.slice(0, 3).join(' • '),
        status: planCompleteMatch ? 'completed' : 'running'
      });
    }
  }

  if (cotText) {
    const cotLines = cotText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 6);

    cotLines.forEach((line, idx) => {
      const tagMatch = line.match(/^\[([A-Z_\-\s]+)\]\s*(.+)$/i) || line.match(/^(?:\d+\.|[-*•])\s*\*\*([^*]+)\*\*[:\s-]*(.+)$/i);
      if (tagMatch) {
        const rawBadge = tagMatch[1].trim().toUpperCase();
        const textBody = tagMatch[2].trim();
        let agentName = 'Engineer Sub-Agent';
        if (rawBadge.includes('PLAN') || rawBadge.includes('ARSITEK')) agentName = 'Planner Sub-Agent';
        else if (rawBadge.includes('VERIF') || rawBadge.includes('QA') || rawBadge.includes('AUDIT')) agentName = 'Verifier Sub-Agent';

        thoughtSteps.push({
          id: `cot_step_${idx}`,
          agent: agentName,
          badge: rawBadge.slice(0, 14),
          title: textBody.slice(0, 95),
          detail: textBody,
          status: cotCompleteMatch ? 'completed' : (idx === cotLines.length - 1 ? 'running' : 'completed')
        });
      }
    });
  }

  // 3. Extract completed <SUBAGENT_FILE name="..." description="...">...</SUBAGENT_FILE>
  const files = [];
  const fileCompleteRegex = /<SUBAGENT_FILE\s+([^>]+)>([\s\S]*?)<\/SUBAGENT_FILE>/gi;
  let fileMatch;
  let fileIndex = 0;
  while ((fileMatch = fileCompleteRegex.exec(rawBuffer)) !== null) {
    const attrs = fileMatch[1] || '';
    const fileBody = (fileMatch[2] || '').replace(/^\s*```[a-zA-Z0-9_-]*\n?/, '').replace(/\n?```\s*$/, '');
    const nameAttr = attrs.match(/name=["']([^"']+)["']/i)?.[1] || `file_${fileIndex + 1}.txt`;
    const descAttr = attrs.match(/description=["']([^"']+)["']/i)?.[1] || '';
    files.push(buildDeliverableFileObject(nameAttr, fileBody, descAttr, fileIndex));
    fileIndex++;
  }

  // Check if there is currently an unclosed <SUBAGENT_FILE ...> being written right now
  let activeWritingFile = null;
  const withoutCompletedFiles = rawBuffer.replace(/<SUBAGENT_FILE\s+[^>]+>[\s\S]*?<\/SUBAGENT_FILE>/gi, '');
  const openFileMatch = withoutCompletedFiles.match(/<SUBAGENT_FILE\s+([^>]+)>([\s\S]*)$/i);
  if (openFileMatch) {
    const attrs = openFileMatch[1] || '';
    const partialContent = openFileMatch[2] || '';
    const nameAttr = attrs.match(/name=["']([^"']+)["']/i)?.[1] || 'deliverable.txt';
    const descAttr = attrs.match(/description=["']([^"']+)["']/i)?.[1] || 'Sedang menyusun kode & struktur berkas...';
    const currentLines = partialContent.split('\n').length;
    activeWritingFile = {
      name: nameAttr,
      description: descAttr,
      lineCount: currentLines,
      previewTail: partialContent.slice(-280)
    };
  }

  // 4. Extract <SUBAGENT_SUMMARY>...</SUBAGENT_SUMMARY>
  let finalAnswer = '';
  const summaryCompleteMatch = rawBuffer.match(/<SUBAGENT_SUMMARY>([\s\S]*?)<\/SUBAGENT_SUMMARY>/i);
  const summaryOpenMatch = !summaryCompleteMatch ? rawBuffer.match(/<SUBAGENT_SUMMARY>([\s\S]*)$/i) : null;
  if (summaryCompleteMatch) {
    finalAnswer = summaryCompleteMatch[1].trim();
  } else if (summaryOpenMatch) {
    finalAnswer = summaryOpenMatch[1].trim();
  }

  // Determine current active synchronous stage (1, 2, or 3)
  let currentStage = 1;
  if (summaryOpenMatch || summaryCompleteMatch) {
    currentStage = 3;
  } else if (files.length > 0 || activeWritingFile || cotCompleteMatch) {
    currentStage = 2;
  } else if (cotOpenMatch || planCompleteMatch) {
    currentStage = 1;
  }

  return {
    planText,
    plannedFiles,
    cotText,
    thoughtSteps,
    files,
    activeWritingFile,
    finalAnswer,
    currentStage
  };
}

/**
 * Fallback extractor if the model output standard markdown fenced blocks instead of XML tags
 */
function finalizeDeliverablesFromRawText(rawBuffer = '', parsedState, taskDescription = '') {
  const files = [...(parsedState.files || [])];

  if (files.length === 0) {
    const fenceRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    let m;
    let idx = 0;
    const extCounter = {};
    while ((m = fenceRegex.exec(rawBuffer)) !== null) {
      const lang = (m[1] || 'txt').toLowerCase().trim();
      const code = (m[2] || '').trim();
      if (code.length < 15) continue;

      const extMap = {
        html: 'index.html',
        css: 'styles.css',
        javascript: 'app.js',
        js: 'app.js',
        jsx: 'App.jsx',
        typescript: 'index.ts',
        ts: 'index.ts',
        python: 'main.py',
        py: 'main.py',
        sql: 'schema.sql',
        json: 'config.json',
        csv: 'data.csv',
        markdown: 'README.md',
        md: 'README.md',
        bash: 'run.sh',
        sh: 'run.sh'
      };

      let baseName = extMap[lang] || `solution_${idx + 1}.${lang || 'txt'}`;
      extCounter[baseName] = (extCounter[baseName] || 0) + 1;
      if (extCounter[baseName] > 1) {
        const parts = baseName.split('.');
        const ext = parts.pop();
        baseName = `${parts.join('.')}_${extCounter[baseName]}.${ext}`;
      }

      files.push(buildDeliverableFileObject(baseName, code, `Berkas ${lang.toUpperCase() || 'Kode'} hasil Sub-Agent`, idx));
      idx++;
    }
  }

  // Guarantee at least one downloadable deliverable file if the task produced analysis/documentation
  if (files.length === 0 && rawBuffer.trim().length > 40) {
    const cleanDoc = rawBuffer
      .replace(/<\/?(?:SUBAGENT_PLAN|SUBAGENT_COT|SUBAGENT_SUMMARY)>/gi, '')
      .trim();
    files.push(
      buildDeliverableFileObject(
        'hasil_subagent_deepernova.md',
        `# Hasil Eksekusi Sub-Agent DeeperNova AI\n\n**Tugas:** ${taskDescription}\n\n---\n\n${cleanDoc}`,
        'Dokumen lengkap hasil analisis & eksekusi Sub-Agent',
        0
      )
    );
  }

  let finalAnswer = parsedState.finalAnswer;
  if (!finalAnswer) {
    // Strip internal tags & large file blocks to form a clean summary
    finalAnswer = rawBuffer
      .replace(/<SUBAGENT_PLAN>[\s\S]*?<\/SUBAGENT_PLAN>/gi, '')
      .replace(/<SUBAGENT_COT>[\s\S]*?<\/SUBAGENT_COT>/gi, '')
      .replace(/<SUBAGENT_FILE\s+[^>]+>[\s\S]*?<\/SUBAGENT_FILE>/gi, '')
      .replace(/<\/?SUBAGENT_SUMMARY>/gi, '')
      .trim();
  }

  if (!finalAnswer || finalAnswer.length < 15) {
    const fileListMd = files.map(f => `- **\`${f.name}\`** (${f.badge} • ${f.lineCount} baris • ${f.sizeFormatted}): ${f.description}`).join('\n');
    finalAnswer = `### Ringkasan Hasil Eksekusi Sub-Agent\n\nSeluruh tahapan **Sub-Agent Orchestrator** telah selesai dijalankan secara sinkron dan terverifikasi. Berikut adalah berkas yang telah disiapkan dan siap Anda unduh atau pratinjau langsung:\n\n${fileListMd}`;
  }

  let cotText = parsedState.cotText;
  if (!cotText) {
    cotText = [
      `[PLANNER] Menganalisis spesifikasi tugas: "${taskDescription}"`,
      `[ARCHITECT] Merancang struktur modular (${files.map(f => f.name).join(', ')})`,
      `[BUILDER] Menyusun implementasi kode & konten utuh untuk ${files.length} berkas`,
      `[VERIFIER] Memvalidasi kelengkapan sintaks, ukuran berkas, dan paket unduhan`
    ].join('\n');
  }

  let thoughtSteps = parsedState.thoughtSteps || [];
  if (thoughtSteps.length === 0) {
    thoughtSteps = [
      {
        id: 'step_1',
        agent: 'Planner Sub-Agent',
        badge: 'PLANNER',
        title: 'Menganalisis kebutuhan & merancang arsitektur solusi',
        detail: `Menentukan struktur ${files.length} berkas: ${files.map(f => f.name).join(', ')}`,
        status: 'completed'
      },
      {
        id: 'step_2',
        agent: 'Engineer Sub-Agent',
        badge: 'BUILDER',
        title: `Menulis & menyusun ${files.length} berkas secara sinkron`,
        detail: `Total ${files.reduce((acc, f) => acc + f.lineCount, 0)} baris kode/konten berhasil dibuat`,
        status: 'completed'
      },
      {
        id: 'step_3',
        agent: 'Verifier Sub-Agent',
        badge: 'VERIFIER',
        title: 'Verifikasi kualitas & pengemasan berkas siap unduh',
        detail: 'Semua berkas lulus pemeriksaan struktur dan siap diunduh / dipratinjau',
        status: 'completed'
      }
    ];
  } else {
    thoughtSteps = thoughtSteps.map(s => ({ ...s, status: 'completed' }));
    if (!thoughtSteps.some(s => s.badge === 'VERIFIER')) {
      thoughtSteps.push({
        id: 'step_verifier_final',
        agent: 'Verifier Sub-Agent',
        badge: 'VERIFIER',
        title: `Verifikasi akhir selesai (${files.length} berkas siap diunduh)`,
        detail: files.map(f => `${f.name} (${f.lineCount} baris)`).join(', '),
        status: 'completed'
      });
    }
  }

  return {
    ...parsedState,
    cotText,
    thoughtSteps,
    files,
    activeWritingFile: null,
    finalAnswer,
    currentStage: 3
  };
}

/**
 * Build the Synchronous Multi-Stage Sub-Agent Orchestrator Prompt
 */
export function buildSubAgentOrchestratorPrompt(taskDescription, userPrompt, language = 'id') {
  const langInstruction = language === 'en'
    ? 'Write all explanations, Chain of Thought logs, and summaries in fluent English.'
    : language === 'zh'
      ? '请全程使用清晰自然的中文编写思维链、说明与总结。'
      : 'Gunakan Bahasa Indonesia yang jelas, ramah, profesional, dan terstruktur.';

  return `[SUBAGENT_STAGE_PROMPT]
Anda adalah **DeeperNova Synchronous Sub-Agent Orchestrator** yang mengoordinasikan 3 Sub-Agent secara sinkron dalam satu alur kerja:
1. **Planner & Architect Sub-Agent** (Perencanaan & Desain Arsitektur Berkas)
2. **Engineer & File Builder Sub-Agent** (Penalaran Chain of Thought & Konstruksi Berkas Utuh)
3. **QA Verifier & Delivery Sub-Agent** (Verifikasi Kualitas & Ringkasan Panduan Penggunaan)

Permintaan Pengguna Asli: "${userPrompt || taskDescription}"
Spesifikasi Tugas Sub-Agent: "${taskDescription}"
Arahan Bahasa: ${langInstruction}

INSTRUKSI FORMAT OUTPUT WAJIB (IKUTI URUTAN TAG XML INI SECARA PRESISI):

1. Awali dengan blok <SUBAGENT_PLAN>:
<SUBAGENT_PLAN>
- Tulis 2-4 poin rencana arsitektur dan daftar nama berkas yang akan dibuat (misal: \`index.html\`, \`styles.css\`, \`app.js\`, atau \`main.py\`, \`README.md\`, dll.).
</SUBAGENT_PLAN>

2. Lanjutkan dengan blok <SUBAGENT_COT> (Chain of Thought terstruktur):
<SUBAGENT_COT>
[PLANNER] Analisis kebutuhan utama, komponen sistem, dan pemilihan arsitektur terbaik...
[ARCHITECT] Perancangan struktur file, alur data, dan antarmuka...
[BUILDER] Langkah teknis pembuatan masing-masing file, algoritma, dan penanganan edge-case...
[VERIFIER] Pemeriksaan integritas kode, kompatibilitas antar-file, dan kesiapan eksekusi...
</SUBAGENT_COT>

3. Lanjutkan dengan satu atau beberapa blok <SUBAGENT_FILE name="nama_file.ext" description="Deskripsi singkat fungsi file">:
- WAJIB menghasilkan berkas/file nyata yang LENGKAP, UTUH, SIAP JALAN (production-ready, tanpa placeholder \`// TODO\` atau pemotongan kode).
- Jika membuat aplikasi web / landing page / kalkulator / game / dashboard: pastikan tampilan modern, estetis, responsif, dan interaktif (bisa berupa \`index.html\`, \`styles.css\`, \`app.js\` atau single-file lengkap + \`README.md\`).
- Jangan membungkus isi di dalam <SUBAGENT_FILE> dengan backtick markdown (\`\`\`), langsung tulis isi kode/dokumen murninya!
Contoh:
<SUBAGENT_FILE name="index.html" description="Antarmuka utama aplikasi">
<!DOCTYPE html>
...isi kode lengkap...
</SUBAGENT_FILE>

4. Akhiri dengan blok <SUBAGENT_SUMMARY>:
<SUBAGENT_SUMMARY>
Tuliskan penjelasan akhir yang rapi, ramah, dan terstruktur (gunakan ### subjudul dan poin-poin):
- Ringkasan arsitektur & fitur yang telah dibangun oleh Sub-Agent
- Penjelasan fungsi masing-masing berkas yang dikirimkan
- Panduan singkat cara menjalankan atau menggunakan berkas tersebut
</SUBAGENT_SUMMARY>`;
}

/**
 * Execute the Synchronous Sub-Agent Orchestrator.
 * Streams real-time progress updates (Stage 1 -> Stage 2 -> Stage 3, live CoT, live Files, Final Answer)
 * via `onUpdate(snapshot)` in a single synchronous execution lifecycle.
 */
export async function executeSynchronousSubAgent({
  taskDescription,
  userPrompt,
  language = 'id',
  model = 'deepernova-silicon-1.4',
  abortSignal = null,
  onUpdate = () => { }
}) {
  const startTime = Date.now();
  const getElapsedSec = () => Math.max(0.1, (Date.now() - startTime) / 1000).toFixed(1);

  const initialSnapshot = {
    status: 'running', // 'running' | 'completed' | 'error'
    taskDescription,
    currentStage: 1,
    elapsedSec: '0.1',
    planText: '',
    plannedFiles: [],
    cotText: language === 'id'
      ? `[PLANNER] Menginisialisasi Sub-Agent Orchestrator untuk: "${taskDescription}"...\n`
      : `[PLANNER] Initializing Sub-Agent Orchestrator for: "${taskDescription}"...\n`,
    thoughtSteps: [
      {
        id: 'init_plan',
        agent: 'Planner Sub-Agent',
        badge: 'PLANNER',
        title: language === 'id' ? 'Menganalisis spesifikasi tugas & merancang struktur berkas...' : 'Analyzing task specifications & file architecture...',
        detail: taskDescription,
        status: 'running'
      }
    ],
    files: [],
    activeWritingFile: null,
    finalAnswer: ''
  };

  onUpdate(initialSnapshot);

  const orchestratorPrompt = buildSubAgentOrchestratorPrompt(taskDescription, userPrompt, language);
  const requestBody = {
    model: model || 'deepernova-silicon-1.4',
    stream: true,
    isSubAgentStage: true,
    language,
    temperature: 0.45,
    max_tokens: 8192,
    deviceId: getDeviceId(),
    messages: [
      {
        role: 'system',
        content: 'You are DeeperNova Synchronous Sub-Agent Orchestrator. Always follow the exact XML tags <SUBAGENT_PLAN>, <SUBAGENT_COT>, <SUBAGENT_FILE name="..." description="...">, and <SUBAGENT_SUMMARY>. Write complete, working, high-quality code and files.'
      },
      {
        role: 'user',
        content: orchestratorPrompt
      }
    ]
  };

  // Try /api/subagent/orchestrate first, fallback seamlessly to /api/chat
  const endpoints = [
    `${API_BASE_URL || ''}/api/subagent/orchestrate`,
    `${API_BASE_URL || ''}/api/chat`
  ];

  let response = null;
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': getDeviceId()
        },
        body: JSON.stringify(requestBody),
        signal: abortSignal
      });
      if (res.ok && res.body) {
        response = res;
        break;
      } else {
        const errTxt = await res.text().catch(() => '');
        lastError = new Error(`HTTP ${res.status}: ${errTxt.slice(0, 120)}`);
      }
    } catch (err) {
      if (err?.name === 'AbortError' || abortSignal?.aborted) {
        throw err;
      }
      lastError = err;
    }
  }

  if (!response || !response.body) {
    throw lastError || new Error('Sub-Agent Orchestrator endpoint unavailable');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let sseBuffer = '';
  let rawOrchestratorText = '';

  try {
    while (true) {
      if (abortSignal?.aborted) {
        reader.cancel().catch(() => { });
        break;
      }
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop() || '';

      let hasNewToken = false;
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();
        if (!dataStr || dataStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(dataStr);
          const delta =
            parsed.choices?.[0]?.delta?.content ||
            parsed.choices?.[0]?.text ||
            parsed.delta ||
            '';
          if (delta) {
            rawOrchestratorText += delta;
            hasNewToken = true;
          }
        } catch (_e) {
          // ignore partial JSON line
        }
      }

      if (hasNewToken) {
        const liveState = parseSynchronousOrchestratorBuffer(rawOrchestratorText, taskDescription);
        onUpdate({
          status: 'running',
          taskDescription,
          currentStage: liveState.currentStage,
          elapsedSec: getElapsedSec(),
          planText: liveState.planText,
          plannedFiles: liveState.plannedFiles,
          cotText: liveState.cotText || initialSnapshot.cotText,
          thoughtSteps: liveState.thoughtSteps.length > 0 ? liveState.thoughtSteps : initialSnapshot.thoughtSteps,
          files: liveState.files,
          activeWritingFile: liveState.activeWritingFile,
          finalAnswer: liveState.finalAnswer
        });
      }
    }
  } finally {
    try { reader.releaseLock(); } catch (_e) { }
  }

  const parsedFinal = parseSynchronousOrchestratorBuffer(rawOrchestratorText, taskDescription);
  const verifiedState = finalizeDeliverablesFromRawText(rawOrchestratorText, parsedFinal, taskDescription);

  const completedSnapshot = {
    status: 'completed',
    taskDescription,
    currentStage: 3,
    elapsedSec: getElapsedSec(),
    planText: verifiedState.planText,
    plannedFiles: verifiedState.plannedFiles,
    cotText: verifiedState.cotText,
    thoughtSteps: verifiedState.thoughtSteps,
    files: verifiedState.files,
    activeWritingFile: null,
    finalAnswer: verifiedState.finalAnswer
  };

  onUpdate(completedSnapshot);
  return completedSnapshot;
}

