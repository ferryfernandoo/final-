// ============================================================
// Deepernova AI ChatBot — Pure Text, Table, Chart & Code Utilities
// ============================================================
import React from 'react';

// Code Structure Parser - untuk menampilkan struktur kode seperti tree
export const parseCodeStructure = (code, language) => {
  if (!code) return null;
  const lines = code.split('\n');
  const structure = [];

  if (language === 'json') {
    try {
      const parsed = JSON.parse(code);
      const buildTree = (obj, depth = 0) => {
        const items = [];
        if (typeof obj === 'object' && obj !== null) {
          Object.entries(obj).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              items.push({
                type: 'object',
                label: key,
                depth,
                hasChildren: true,
                value: value
              });
              items.push(...buildTree(value, depth + 1));
            } else {
              items.push({
                type: 'property',
                label: key,
                value: value,
                depth
              });
            }
          });
        }
        return items;
      };
      return buildTree(parsed);
    } catch (_e) {
      return null;
    }
  }

  if (['javascript', 'js', 'typescript', 'ts', 'java'].includes(language)) {
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      const depth = (line.match(/^\s*/)[0].length / 2);

      if (trimmed.match(/^(async\s+)?function\s+(\w+)|^const\s+(\w+)\s*=\s*(\(|async\s*\()|^class\s+(\w+)/)) {
        const match = trimmed.match(/function\s+(\w+)|const\s+(\w+)|class\s+(\w+)/);
        const name = match[1] || match[2] || match[3];
        structure.push({ type: 'function', label: name, line: idx + 1, depth });
      }

      if (trimmed.match(/^class\s+(\w+)/)) {
        const match = trimmed.match(/class\s+(\w+)/);
        structure.push({ type: 'class', label: match[1], line: idx + 1, depth });
      }

      if (trimmed.match(/^\w+\s*\(\s*\)/)) {
        const match = trimmed.match(/(\w+)\s*\(/);
        structure.push({ type: 'method', label: match[1], line: idx + 1, depth });
      }
    });
  }

  if (language === 'python') {
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      const depth = (line.match(/^\s*/)[0].length / 2);

      if (trimmed.match(/^def\s+(\w+)/)) {
        const match = trimmed.match(/def\s+(\w+)/);
        structure.push({ type: 'function', label: match[1], line: idx + 1, depth });
      }

      if (trimmed.match(/^class\s+(\w+)/)) {
        const match = trimmed.match(/class\s+(\w+)/);
        structure.push({ type: 'class', label: match[1], line: idx + 1, depth });
      }
    });
  }

  return structure.length > 0 ? structure : null;
};

export const unescapeHtmlEntities = (text) => {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
};

export const renderHighlightedCode = (highlightedHtml) => {
  if (!highlightedHtml) return null;

  const elements = [];
  let lastIndex = 0;

  const spanRegex = /<span class="hl-(\w+)">([\s\S]*?)<\/span>/g;
  let match;

  while ((match = spanRegex.exec(highlightedHtml)) !== null) {
    if (match.index > lastIndex) {
      const raw = highlightedHtml.substring(lastIndex, match.index);
      elements.push(
        <React.Fragment key={`txt-${lastIndex}`}>
          {unescapeHtmlEntities(raw)}
        </React.Fragment>
      );
    }

    elements.push(
      <span key={`tok-${match.index}`} className={`hl-${match[1]}`}>
        {unescapeHtmlEntities(match[2])}
      </span>
    );

    lastIndex = spanRegex.lastIndex;
  }

  if (lastIndex < highlightedHtml.length) {
    const raw = highlightedHtml.substring(lastIndex);
    elements.push(
      <React.Fragment key={`txt-${lastIndex}`}>
        {unescapeHtmlEntities(raw)}
      </React.Fragment>
    );
  }

  return elements;
};

// Extract Agentic Steps from message text, search state, and tools
export const extractAgenticSteps = (text, isGenerating, isSearching, sources, userPrompt = '') => {
  const steps = [];

  if (sources && sources.length > 0) {
    steps.push({
      title: 'Mencari referensi internet',
      desc: `Menemukan ${sources.length} sumber referensi terverifikasi melalui mesin pencari`,
      status: 'completed'
    });
  } else if (isSearching) {
    steps.push({
      title: 'Mencari informasi di internet...',
      desc: 'Menghubungkan ke mesin pencari Deepernova AI',
      status: 'in-progress'
    });
  }

  if (text) {
    const stepRegex = /\[STEP:\s*([^|\]]+)(?:\|\s*([^\]]+))?\]/gi;
    let match;
    while ((match = stepRegex.exec(text)) !== null) {
      steps.push({
        title: match[1].trim(),
        desc: match[2] ? match[2].trim() : '',
        status: 'completed'
      });
    }

    if (steps.length === 0 || (steps.length === 1 && sources && sources.length > 0)) {
      const sectionRegex = /(?:^|\n)(?:###?\s*|\*\*)?(\d+)\.\s*([^\n:]+)(?::|\n)?([\s\S]*?)(?=(?:\n(?:###?\s*|\*\*)?\d+\.|\n\n###|$))/g;
      let secMatch;
      while ((secMatch = sectionRegex.exec(text)) !== null) {
        const title = secMatch[2].replace(/\*\*/g, '').trim();
        const snippet = secMatch[3].replace(/```[\s\S]*?```/g, '').replace(/[\*\#\`]/g, '').trim().slice(0, 140);
        if (title && title.length < 50) {
          steps.push({
            title: title,
            desc: snippet || 'Menyiapkan modul dan implementasi kode terstruktur',
            status: 'completed'
          });
        }
      }
    }

    const hasExplicitSteps = steps.some(s => s.title !== 'Mencari referensi internet' && s.title !== 'Mencari informasi di internet...');
    if (!hasExplicitSteps) {
      const combined = ((userPrompt || '') + ' ' + text).toLowerCase();
      if (combined.includes('html') || combined.includes('game') || combined.includes('clicker') || combined.includes('aplikasi') || combined.includes('web') || combined.includes('coding')) {
        steps.push({
          title: 'Menyiapkan ide proyek',
          desc: 'Memilih konsep proyek interaktif yang seru, responsif, dan siap dijalankan langsung di browser.',
          status: 'completed'
        });
        steps.push({
          title: 'Menyusun logika game & alur data',
          desc: 'Merancang sistem state, skor, event klik, multiplier, dan mekanisme interaksi pengguna.',
          status: 'completed'
        });
        steps.push({
          title: 'Merancang fitur toko & visual UI',
          desc: 'Mengonfigurasi tema visual modern, elemen berpendar, dan komponen interaktif.',
          status: isGenerating ? 'in-progress' : 'completed'
        });
      } else if (text.includes('```')) {
        steps.push({
          title: 'Menganalisis kebutuhan & algoritma',
          desc: 'Memetakan alur pemecahan masalah dan struktur data pemrograman yang optimal.',
          status: 'completed'
        });
        steps.push({
          title: 'Menulis sintaks & implementasi kode',
          desc: 'Menyusun fungsi yang bersih, teruji, dan terdokumentasi rapi.',
          status: isGenerating ? 'in-progress' : 'completed'
        });
      } else if (text.length > 50) {
        steps.push({
          title: 'Memahami konteks pertanyaan',
          desc: 'Menganalisis inti kebutuhan pengguna dan merumuskan jawaban yang akurat.',
          status: 'completed'
        });
        steps.push({
          title: 'Menyusun penjelasan komprehensif',
          desc: 'Menyajikan informasi terstruktur dengan gaya bahasa alami dan mudah dipahami.',
          status: isGenerating ? 'in-progress' : 'completed'
        });
      }
    }
  } else if (isGenerating) {
    const promptLower = (userPrompt || '').toLowerCase();
    if (promptLower.includes('game') || promptLower.includes('buat') || promptLower.includes('coding') || promptLower.includes('code')) {
      steps.push({
        title: 'Menyiapkan ide proyek',
        desc: 'Memilih konsep proyek dan arsitektur kode terbaik...',
        status: 'completed'
      });
      steps.push({
        title: 'Menyusun logika & alur sistem',
        desc: 'Merancang algoritma dan alur interaktivitas...',
        status: 'in-progress'
      });
    } else {
      steps.push({
        title: 'Menganalisis permintaan',
        desc: 'Memproses instruksi dan merancang respon terbaik...',
        status: 'in-progress'
      });
    }
  }

  if (isGenerating) {
    if (!steps.some(s => s.status === 'in-progress')) {
      steps.push({
        title: 'Menyusun respon cerdas...',
        desc: 'Memvalidasi artefak dan menyempurnakan jawaban akhir',
        status: 'in-progress'
      });
    }
  } else if (steps.length > 0) {
    steps.push({
      title: 'Selesai',
      desc: 'Semua langkah tugas telah selesai dijalankan',
      status: 'completed'
    });
  }

  return steps;
};

export const parseStreamingText = async (response) => {
  if (!response?.body) {
    try {
      const text = await response.text();
      return text ? text.trim() : '';
    } catch {
      return '';
    }
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;
        try {
          const json = JSON.parse(jsonStr);
          if (json.choices?.[0]?.delta?.content) {
            text += json.choices[0].delta.content;
          }
        } catch (_e) {
          // ignore parse errors for partial chunks
        }
      }
    }

    if (buffer.startsWith('data: ')) {
      const jsonStr = buffer.slice(6).trim();
      if (jsonStr && jsonStr !== '[DONE]') {
        try {
          const json = JSON.parse(jsonStr);
          if (json.choices?.[0]?.delta?.content) {
            text += json.choices[0].delta.content;
          }
        } catch (_e) {
          // ignore final parse errors
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!text.trim()) {
    try {
      const fallbackText = await response.text();
      return fallbackText ? fallbackText.trim() : '';
    } catch {
      return '';
    }
  }

  return text.trim();
};

export const sanitizeWelcomeText = (text) => {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
};

export const ensurePerfectTable = (text) => {
  if (!text || typeof text !== 'string' || !text.includes('|')) return text;

  const lines = text.split('\n');
  const resultLines = [];
  let inTable = false;
  let currentTableRows = [];

  const isTableSeparator = (str) => {
    const trimmed = String(str || '').trim();
    return trimmed.length > 0 && /^[\s|:\-]+$/.test(trimmed) && trimmed.includes('-');
  };

  const flushTable = () => {
    if (currentTableRows.length === 0) return;

    const countPipes = (row) => (row.match(/\|/g) || []).length;

    let maxPipes = 0;
    for (const row of currentTableRows) {
      const trimmed = row.trim();
      const isSep = isTableSeparator(trimmed);
      if (!isSep) {
        let tempRow = trimmed;
        if (!tempRow.startsWith('|')) tempRow = '| ' + tempRow;
        if (!tempRow.endsWith('|')) tempRow = tempRow + ' |';
        const pCount = countPipes(tempRow);
        if (pCount > maxPipes) {
          maxPipes = pCount;
        }
      }
    }

    let header = currentTableRows[0].trim();
    if (!header.startsWith('|')) header = '| ' + header;
    if (!header.endsWith('|')) header = header + ' |';
    const headerPipes = countPipes(header);

    const expectedPipes = Math.max(maxPipes, headerPipes);

    if (expectedPipes < 2) {
      resultLines.push(...currentTableRows);
      currentTableRows = [];
      inTable = false;
      return;
    }

    currentTableRows[0] = header;

    let hasSeparator = false;
    if (currentTableRows.length > 1) {
      const secondRow = currentTableRows[1].trim();
      const isSep = isTableSeparator(secondRow);
      if (isSep) {
        hasSeparator = true;
        const sepParts = [];
        for (let c = 0; c < expectedPipes - 1; c++) {
          sepParts.push(' --- ');
        }
        currentTableRows[1] = '|' + sepParts.join('|') + '|';
      }
    }

    if (!hasSeparator) {
      const sepParts = [];
      for (let c = 0; c < expectedPipes - 1; c++) {
        sepParts.push(' --- ');
      }
      const newSeparator = '|' + sepParts.join('|') + '|';
      currentTableRows.splice(1, 0, newSeparator);
    }

    for (let r = 0; r < currentTableRows.length; r++) {
      let row = currentTableRows[r].trim();
      if (isTableSeparator(row)) continue;

      if (!row.startsWith('|')) row = '| ' + row;
      if (!row.endsWith('|')) row = row + ' |';

      const rowPipes = countPipes(row);
      if (rowPipes < expectedPipes) {
        const diff = expectedPipes - rowPipes;
        row = row.slice(0, -1) + ' |'.repeat(diff);
      } else if (rowPipes > expectedPipes) {
        const cells = row.split('|').map(c => c.trim()).filter((_, idx) => idx > 0 && idx < expectedPipes);
        row = '| ' + cells.join(' | ') + ' |';
      }
      currentTableRows[r] = row;
    }

    resultLines.push(...currentTableRows);
    currentTableRows = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('|')) {
      inTable = true;
      currentTableRows.push(line);
    } else {
      if (inTable) flushTable();
      resultLines.push(line);
    }
  }

  if (inTable) flushTable();

  return resultLines.join('\n');
};

export const cleanResponseText = (text) => {
  if (!text || typeof text !== 'string') return text || '';

  let cleaned = text;
  cleaned = cleaned.replace(/\[(?:EXECUTE_SEARCH|SEARCH_REQUEST|SEARCH|WEB_SEARCH):[\s\S]*?\]/gi, '');
  cleaned = cleaned.replace(/<search(?:_request)?>[\s\S]*?<\/search(?:_request)?>/gi, '');
  cleaned = cleaned.replace(/\[RECALL_MEMORY:[\s\S]*?\]/g, '');
  cleaned = cleaned.replace(/\[(MEMORY_SAVE|MEMORY_UPDATE|MEMORY_DELETE|MEMORY_RECALL):[\s\S]*?\]/gi, '');
  cleaned = cleaned.replace(/<\/?reasoning>/gi, '');
  cleaned = cleaned.replace(/\[STEP:\s*[^\]]+\]/gi, '');

  const preserveCodeSections = (input) => {
    const map = new Map();
    let index = 0;
    const placeholder = (match) => {
      const key = `__CODE_SECTION_${index}__`;
      map.set(key, match);
      index += 1;
      return key;
    };
    const blockPreserved = input.replace(/```[\s\S]*?```|```[\s\S]*$/g, placeholder);
    const inlinePreserved = blockPreserved.replace(/`[^`\n]+`/g, placeholder);
    return { text: inlinePreserved, map };
  };

  const preserveTableSections = (input) => {
    const map = new Map();
    let index = 0;
    const lines = input.split('\n');
    const newLines = [];
    let currentTable = [];

    for (const line of lines) {
      if (line.includes('|')) {
        currentTable.push(line);
      } else {
        if (currentTable.length > 0) {
          const key = `__TABLE_SECTION_${index}__`;
          map.set(key, currentTable.join('\n'));
          index++;
          newLines.push(key);
          currentTable = [];
        }
        newLines.push(line);
      }
    }

    if (currentTable.length > 0) {
      const key = `__TABLE_SECTION_${index}__`;
      map.set(key, currentTable.join('\n'));
      newLines.push(key);
    }

    return { text: newLines.join('\n'), map };
  };

  const preserved = preserveCodeSections(cleaned);
  const preservedTable = preserveTableSections(preserved.text);
  let s = preservedTable.text;

  s = s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p>/gi, '\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<[^>]+>/g, '');

  s = s
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, ' ');

  s = s.replace(/^\s*(\*\*)?Jawaban:?(\*\*)?\s*\n?/i, '');
  s = s.replace(/^\s*(?:terima\s*kasih|makasih|thanks|thank\s*you)[^\n.!?]*(?:hasil\s*pencarian|pencariannya|informasi(?:nya)?|data\s*pencarian|search\s*results?)[^\n.!?]*[.!?\n]+\s*/i, '');
  s = s.replace(/^\s*(?:berdasarkan\s*(?:data|informasi|hasil)\s*pencarian\s*yang\s*(?:anda|kamu|telah)\s*(?:berikan|disediakan))[^\n.!?]*[,.:!?\n]+\s*/i, '');
  s = s.replace(/--\*\*/g, '').replace(/\*\*--/g, '');
  s = s.replace(/\n\s*[-*_]{3,}\s*\n/g, '\n\n---\n\n');
  s = s.replace(/([^\n#])\n(#{1,6}\s+)/g, '$1\n\n$2');

  const rawLines = s.split('\n');
  const cleanedLines = [];
  let lastWasBlank = false;
  for (const ln of rawLines) {
    const trimmed = ln.trim();
    if (trimmed === '') {
      if (!lastWasBlank) {
        cleanedLines.push('');
        lastWasBlank = true;
      }
    } else {
      if (/^[-*_]{3,}$/.test(trimmed)) {
        cleanedLines.push('---');
      } else {
        cleanedLines.push(ln);
      }
      lastWasBlank = false;
    }
  }
  s = cleanedLines.join('\n');
  s = s.replace(/\n{3,}/g, '\n\n');

  for (const [key, value] of preservedTable.map.entries()) {
    s = s.replace(key, ensurePerfectTable(value));
  }

  for (const [key, value] of preserved.map.entries()) {
    s = s.replace(key, value);
  }

  return s.trim();
};

export const sanitizeStreamingText = (text) => {
  if (!text || typeof text !== 'string') return text;

  let cleaned = text;
  cleaned = cleaned.replace(/\[(?:EXECUTE_SEARCH|SEARCH_REQUEST|SEARCH|WEB_SEARCH):[\s\S]*?\]/gi, '');
  cleaned = cleaned.replace(/\[(?:EXECUTE_SEARCH|SEARCH_REQUEST|SEARCH|WEB_SEARCH):[\s\S]*$/gi, '');
  cleaned = cleaned.replace(/<search(?:_request)?>[\s\S]*?<\/search(?:_request)?>/gi, '');
  cleaned = cleaned.replace(/<search(?:_request)?>[\s\S]*$/gi, '');
  cleaned = cleaned.replace(/\[RECALL_MEMORY:[\s\S]*?\]/g, '');
  cleaned = cleaned.replace(/\[RECALL_MEMORY:[\s\S]*$/g, '');
  cleaned = cleaned.replace(/\[(MEMORY_SAVE|MEMORY_UPDATE|MEMORY_DELETE|MEMORY_RECALL):[\s\S]*?\]/gi, '');
  cleaned = cleaned.replace(/\[(MEMORY_SAVE|MEMORY_UPDATE|MEMORY_DELETE|MEMORY_RECALL):[\s\S]*$/gi, '');

  const preserveCodeSections = (input) => {
    const map = new Map();
    let index = 0;
    const placeholder = (match) => {
      const key = `__STREAM_CODE_SECTION_${index}__`;
      map.set(key, match);
      index += 1;
      return key;
    };
    const blockPreserved = input.replace(/```[\s\S]*?```|```[\s\S]*$/g, placeholder);
    const inlinePreserved = blockPreserved.replace(/`[^`\n]+`/g, placeholder);
    return { text: inlinePreserved, map };
  };

  const preserved = preserveCodeSections(cleaned);
  let s = preserved.text;
  s = s.replace(/^\s*(\*\*)?Jawaban(\*\*)?\s*:?\s*/mi, '');
  s = s.replace(/^\s*(\*\*)?Jawaban(\*\*)?\s*$/gmi, '');
  s = s.replace(/^\s*\*\*Jawaban:\*\*\s*/gi, '');
  s = s.replace(/^\s*\*\*Jawaban:\s*/gi, '');
  s = s.replace(/^\s*\*\*Kesimpulan:\*\*\s*/gi, '');
  s = s.replace(/^\s*\*\*Kesimpulan:\s*/gi, '');
  s = s.replace(/^\s*Kesimpulan:\s*/gi, '');
  s = s.replace(/^\s*(?:terima\s*kasih|makasih|thanks|thank\s*you)[^\n.!?]*(?:hasil\s*pencarian|pencariannya|informasi(?:nya)?|data\s*pencarian|search\s*results?)[^\n.!?]*[.!?\n]+\s*/i, '');
  s = s.replace(/^\s*(?:berdasarkan\s*(?:data|informasi|hasil)\s*pencarian\s*yang\s*(?:anda|kamu|telah)\s*(?:berikan|disediakan))[^\n.!?]*[,.:!?\n]+\s*/i, '');
  s = s.replace(/--\*\*/g, '');
  s = s.replace(/\*\*--/g, '');
  s = s.replace(/[\u2012\u2013\u2014\u2015]+/g, '-');

  const streamingLines = s.split('\n');
  const formattedStreamingLines = [];
  for (let i = 0; i < streamingLines.length; i++) {
    const currentLine = streamingLines[i];
    const prevLine = i > 0 ? streamingLines[i - 1] : null;

    if (currentLine.includes('|')) {
      if (prevLine !== null && !prevLine.includes('|') && prevLine.trim() !== '') {
        formattedStreamingLines.push('');
      }
      formattedStreamingLines.push(currentLine);
    } else {
      if (prevLine !== null && prevLine.includes('|') && currentLine.trim() !== '') {
        formattedStreamingLines.push('');
      }
      const trimmed = currentLine.trim();
      if (/^[-*_]{3,}$/.test(trimmed)) {
        formattedStreamingLines.push('---');
      } else {
        formattedStreamingLines.push(currentLine.replace(/--+/g, '-'));
      }
    }
  }
  s = formattedStreamingLines.join('\n');
  s = s.replace(/\n{3,}/g, '\n\n');

  for (const [key, value] of preserved.map.entries()) {
    s = s.replace(key, value);
  }

  return ensurePerfectTable(s);
};

export const detectChartType = (text) => {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('pie chart') || lowerText.includes('pie-chart') || (lowerText.includes('pie') && lowerText.includes('chart'))) return 'pie';
  if (lowerText.includes('bar chart') || lowerText.includes('bar-chart') || (lowerText.includes('bar') && lowerText.includes('chart'))) return 'bar';
  if (lowerText.includes('line chart') || lowerText.includes('line-chart') || (lowerText.includes('line') && lowerText.includes('chart'))) return 'line';
  if (lowerText.includes('radar') || lowerText.includes('radar chart')) return 'radar';
  if (lowerText.includes('infografis') || lowerText.includes('infographic') || lowerText.includes('info grafis')) return 'infographic';
  if (lowerText.includes('statistik') || lowerText.includes('grafik') || lowerText.includes('chart')) return 'pie';
  return null;
};

export const parseChartDataFromText = (text) => {
  const lines = text.split('\n');
  const data = [];

  for (const line of lines) {
    const match = line.match(/^[\s-•*]*(.*?)[\s:|-]+([\d.,]+)\s*(%)?/);
    if (match && match[1] && match[2]) {
      const label = match[1].trim();
      const value = parseInt(match[2].replace(/[.,]/g, ''));
      if (label && !isNaN(value)) {
        data.push({ name: label, value });
      }
    }
  }

  return data.length > 0 ? data : null;
};

export const _extractChartBlock = (text) => {
  const chartPatterns = [
    /\[CHART\]([\s\S]*?)\[\/CHART\]/gi,
    /```chart([\s\S]*?)```/gi,
    /\*\*(PIE CHART|BAR CHART|LINE CHART|RADAR|INFOGRAFIS)(.*?)\*\*([\s\S]*?)(?=\*\*|```|$)/gi,
  ];

  for (const pattern of chartPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return null;
};

export const isExecutionLogLine = (line) => {
  if (!line) return false;
  const trimmed = line.trim();
  const patterns = [
    /^\[STEP \d+\/\d+\]/,
    /^📖 \[AGENT\]/,
    /^✅ \[AGENT\]/,
    /^⚠️\s*\[AGENT\]/,
    /^🔍/,
    /^📁/,
    /^📤/,
    /^🔧/,
    /^╔|^╚|^║/,
    /^: heartbeat$/i,
  ];
  return patterns.some((rx) => rx.test(trimmed));
};

export const removeExecutionLogLines = (text) => {
  return text
    .split(/\r?\n/)
    .filter((line) => !isExecutionLogLine(line))
    .join('\n');
};

export const removeDownloadStatusLines = (text) => {
  return text
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return !/^(✅\s*(File siap|File ready)|📄\s*File:|⏱️\s*(Waktu|Time):)/i.test(trimmed);
    })
    .join('\n')
    .trim();
};

export const humanizeClientError = (errStr) => {
  if (!errStr) return "Terjadi kendala koneksi pada server AI. Silakan coba sesaat lagi.";
  const str = String(errStr).toLowerCase();

  if (str.includes("invalid api key") || str.includes("401") || str.includes("unauthorized")) {
    return "Akses kunci server AI sedang diperbarui oleh sistem. Silakan coba kembali beberapa saat lagi.";
  }
  if (str.includes("rate limit") || str.includes("429") || str.includes("too many requests")) {
    return "Server AI sedang menerima terlalu banyak lalu lintas. Silakan tunggu beberapa detik dan coba lagi.";
  }
  if (str.includes("timeout") || str.includes("took too long") || str.includes("deadline")) {
    return "Koneksi ke server AI terputus karena batas waktu respons terlampaui. Silakan coba kirim kembali pesan Anda.";
  }
  if (str.includes("quota") || str.includes("insufficient balance") || str.includes("billing")) {
    return "Batas penggunaan server AI saat ini telah habis. Silakan hubungi administrator.";
  }
  if (str.includes("key index") || str.includes("status 401") || str.includes("failed with status")) {
    return "Akses kunci server AI sedang diperbarui. Silakan coba sesaat lagi.";
  }
  return errStr;
};
