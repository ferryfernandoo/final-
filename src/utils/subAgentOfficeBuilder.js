/**
 * Lazy Office Binary Deliverable Builder (.docx, .xlsx, .pptx)
 * Converts AI-generated text, Markdown, HTML, JSON, or CSV content into valid binary OOXML files
 * so Chatbot Sub-Agent deliverables and Agent Live Workspace exports open cleanly in Word/Excel/PowerPoint.
 */

const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MIME_PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

function stripOuterCodeFence(raw) {
  const s = String(raw ?? '').trim();
  const m = s.match(/^```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)\r?\n```$/);
  return m ? m[1].trim() : s;
}

function stripHtmlToPlainLines(raw) {
  return String(raw || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r/g, '');
}

function parseInlineRuns(text, TextRun) {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  if (parts.length === 0) return [new TextRun({ text: '' })];
  return parts.map((part) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return new TextRun({ text: part.slice(2, -2), bold: true });
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return new TextRun({ text: part.slice(1, -1), font: 'Consolas' });
    }
    return new TextRun({ text: part });
  });
}

export async function buildDocxBlob(content, title = 'Dokumen DeeperNova') {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
  const rawText = stripOuterCodeFence(
    Array.isArray(content)
      ? content.map((p) => (typeof p === 'string' ? p : p?.text || '')).join('\n\n')
      : String(content || '')
  );

  const normalized = /<[a-z][\s\S]*>/i.test(rawText) ? stripHtmlToPlainLines(rawText) : rawText;
  const lines = normalized.split(/\r?\n/);

  const children = [];
  if (title && !lines.some((l) => l.trim().startsWith('# '))) {
    children.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      })
    );
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      continue;
    }

    if (/^###\s+/.test(trimmed)) {
      children.push(
        new Paragraph({
          text: trimmed.replace(/^###\s+/, ''),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
        })
      );
    } else if (/^##\s+/.test(trimmed)) {
      children.push(
        new Paragraph({
          text: trimmed.replace(/^##\s+/, ''),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (/^#\s+/.test(trimmed)) {
      children.push(
        new Paragraph({
          text: trimmed.replace(/^#\s+/, ''),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        })
      );
    } else if (/^[-*•]\s+/.test(trimmed)) {
      children.push(
        new Paragraph({
          children: parseInlineRuns(trimmed.replace(/^[-*•]\s+/, ''), TextRun),
          bullet: { level: 0 },
          spacing: { after: 60 },
        })
      );
    } else {
      children.push(
        new Paragraph({
          children: parseInlineRuns(trimmed, TextRun),
          spacing: { after: 120 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children: children.length ? children : [new Paragraph({ text: String(title || 'Document') })] }],
  });
  return Packer.toBlob(doc);
}

function parseWorkbookSheets(rawContent, defaultSheetName = 'Sheet1') {
  if (typeof rawContent === 'object' && rawContent !== null && !Array.isArray(rawContent)) {
    const sheetsArr = rawContent.excelSheets || rawContent.sheets;
    if (Array.isArray(sheetsArr) && sheetsArr.length > 0) {
      return sheetsArr.map((s, idx) => ({
        name: String(s?.name || `Sheet${idx + 1}`).slice(0, 31),
        rows: Array.isArray(s?.rows) ? s.rows : (Array.isArray(s?.data) ? s.data : [['Data']]),
      }));
    }
  }

  if (Array.isArray(rawContent)) {
    return [{ name: String(defaultSheetName || 'Sheet1').slice(0, 31), rows: rawContent.map((row) => (Array.isArray(row) ? row : Object.values(row || {}))) }];
  }

  const trimmed = stripOuterCodeFence(rawContent);
  if (!trimmed) return [{ name: String(defaultSheetName || 'Sheet1').slice(0, 31), rows: [['Data'], ['Kosong']] }];

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const sheetsArr = parsed?.excelSheets || parsed?.sheets;
      if (Array.isArray(sheetsArr) && sheetsArr.length > 0) {
        return sheetsArr.map((s, idx) => ({
          name: String(s?.name || `Sheet${idx + 1}`).slice(0, 31),
          rows: Array.isArray(s?.rows) ? s.rows : (Array.isArray(s?.data) ? s.data : [['Data']]),
        }));
      }
      if (Array.isArray(parsed)) {
        if (parsed.length > 0 && Array.isArray(parsed[0])) {
          return [{ name: String(defaultSheetName || 'Sheet1').slice(0, 31), rows: parsed }];
        }
        if (parsed.length > 0 && typeof parsed[0] === 'object') {
          const headers = Object.keys(parsed[0]);
          const rows = [headers, ...parsed.map((item) => headers.map((h) => item?.[h] ?? ''))];
          return [{ name: String(defaultSheetName || 'Sheet1').slice(0, 31), rows }];
        }
      }
    } catch (_) {}
  }

  return [{ name: String(defaultSheetName || 'Sheet1').slice(0, 31), rows: parseTabularRows(trimmed) }];
}

function parseTabularRows(rawContent) {
  if (Array.isArray(rawContent)) {
    return rawContent.map((row) => (Array.isArray(row) ? row : Object.values(row || {})));
  }

  const trimmed = stripOuterCodeFence(rawContent);
  if (!trimmed) return [['Data'], ['Kosong']];

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        if (parsed.length > 0 && Array.isArray(parsed[0])) return parsed;
        if (parsed.length > 0 && typeof parsed[0] === 'object') {
          const headers = Object.keys(parsed[0]);
          return [headers, ...parsed.map((item) => headers.map((h) => item?.[h] ?? ''))];
        }
      }
      const firstSheet = parsed?.excelSheets?.[0] || parsed?.sheets?.[0];
      if (Array.isArray(firstSheet?.rows)) return firstSheet.rows;
      if (Array.isArray(firstSheet?.data)) return firstSheet.data;
    } catch (_) {}
  }

  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  // Markdown pipe table detection
  const pipeLines = lines.filter((l) => l.includes('|'));
  if (pipeLines.length >= 2) {
    return pipeLines
      .filter((l) => !/^\s*\|?[\s:-]+(?:\|[\s:-]+)+\|?\s*$/.test(l))
      .map((l) =>
        l
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim())
      );
  }

  // CSV / TSV fallback
  return lines.map((line) => {
    const delimiter = line.includes('\t') ? '\t' : ',';
    const cells = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  });
}

export async function buildXlsxBlob(content, sheetName = 'Sheet1') {
  const XLSX = await import('xlsx');
  const sheetDefs = parseWorkbookSheets(content, sheetName);
  const wb = XLSX.utils.book_new();
  const usedNames = new Set();

  sheetDefs.forEach((def, sIdx) => {
    const safeRows = Array.isArray(def.rows) && def.rows.length > 0 ? def.rows : [['Data']];
    const ws = XLSX.utils.aoa_to_sheet(safeRows);

    const colWidths = [];
    for (const row of safeRows) {
      (Array.isArray(row) ? row : [row]).forEach((cell, idx) => {
        const len = Math.min(48, Math.max(10, String(cell ?? '').length + 4));
        if (!colWidths[idx] || colWidths[idx].wch < len) {
          colWidths[idx] = { wch: len };
        }
      });
    }
    ws['!cols'] = colWidths;

    let cleanName = String(def.name || `Sheet${sIdx + 1}`).replace(/[\\/?*[\]:]/g, '_').slice(0, 31) || `Sheet${sIdx + 1}`;
    if (usedNames.has(cleanName.toLowerCase())) {
      cleanName = `${cleanName.slice(0, 27)}_${sIdx + 1}`;
    }
    usedNames.add(cleanName.toLowerCase());
    XLSX.utils.book_append_sheet(wb, ws, cleanName);
  });

  const arrayBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([arrayBuf], { type: MIME_XLSX });
}

function parseSlidesFromContent(content, fallbackTitle = 'Presentasi DeeperNova') {
  if (Array.isArray(content) && content.length > 0) {
    return content.map((s, idx) => ({
      title: s.title || `Slide ${idx + 1}`,
      body: Array.isArray(s.bullets) ? s.bullets.join('\n') : (s.content || s.body || ''),
      notes: s.notes || '',
    }));
  }

  const trimmed = stripOuterCodeFence(typeof content === 'object' && content !== null ? JSON.stringify(content) : content);
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : (parsed?.slides || parsed?.presentation?.slides);
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.map((s, idx) => ({
          title: s.title || `Slide ${idx + 1}`,
          body: Array.isArray(s.bullets) ? s.bullets.join('\n') : (s.content || s.body || ''),
          notes: s.notes || '',
        }));
      }
    } catch (_) {}
  }

  const sections = trimmed.split(/\n---+\n|\n(?=#{1,2}\s+|Slide\s+\d+[:.-]?)/i).filter((s) => s.trim());
  if (sections.length === 0) {
    return [{ title: fallbackTitle, body: trimmed || 'Presentasi dibuat oleh DeeperNova AI', notes: '' }];
  }

  return sections.map((sec, idx) => {
    const lines = sec.trim().split(/\r?\n/);
    const first = (lines[0] || '').replace(/^#+\s*|^Slide\s+\d+[:.-]?\s*/i, '').trim();
    const rest = lines.slice(1).join('\n').trim();
    return {
      title: first || `Slide ${idx + 1}`,
      body: rest || first,
      notes: '',
    };
  });
}

export async function buildPptxBlob(content, title = 'Presentasi DeeperNova') {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = title;

  const slides = parseSlidesFromContent(content, title);
  slides.forEach((s, idx) => {
    const slide = pptx.addSlide();
    slide.background = { color: idx === 0 ? '0F172A' : 'FFFFFF' };
    slide.addText(String(s.title || `Slide ${idx + 1}`).slice(0, 140), {
      x: 0.6,
      y: idx === 0 ? 1.8 : 0.45,
      w: 8.8,
      h: 0.85,
      fontSize: idx === 0 ? 30 : 22,
      bold: true,
      color: idx === 0 ? 'FFFFFF' : '0F172A',
    });
    if (s.body) {
      const bodyLines = String(s.body)
        .slice(0, 3500)
        .split(/\r?\n/)
        .map((line) => {
          const clean = line.trim();
          const hasBullet = /^[-*•]\s+/.test(clean);
          return {
            text: hasBullet ? clean.replace(/^[-*•]\s+/, '') : clean,
            options: hasBullet && idx > 0 ? { bullet: true, breakLine: true } : { breakLine: true }
          };
        })
        .filter((item) => item.text);
      if (bodyLines.length > 0) {
        slide.addText(bodyLines, {
          x: 0.6,
          y: idx === 0 ? 2.9 : 1.45,
          w: 8.8,
          h: idx === 0 ? 2.2 : 3.7,
          fontSize: idx === 0 ? 16 : 14,
          color: idx === 0 ? 'CBD5E1' : '334155',
          valign: 'top',
          paraSpaceAfter: 8,
        });
      }
    }
    if (s.notes) {
      slide.addNotes(String(s.notes));
    }
  });

  const out = await pptx.write({ outputType: 'blob' });
  return out instanceof Blob ? out : new Blob([out], { type: MIME_PPTX });
}

/**
 * Convert a Sub-Agent deliverable file object into a ready-to-download Blob + MIME type.
 * Upgrades .docx, .xlsx, .pptx text outputs into genuine Office OOXML binaries automatically.
 */
export async function buildDeliverableBlob(file, defaultMime = 'text/plain;charset=utf-8') {
  const name = String(file?.name || 'deliverable.txt');
  const ext = (name.split('.').pop() || '').toLowerCase();
  const rawContent = file?.content ?? '';
  const isTextOrObj = (typeof rawContent === 'string' && !rawContent.startsWith('PK')) || (rawContent && typeof rawContent === 'object');

  if (isTextOrObj) {
    if (ext === 'docx' || ext === 'doc') {
      try {
        const blob = await buildDocxBlob(rawContent, name.replace(/\.docx?$/i, ''));
        return { blob, mimeType: MIME_DOCX };
      } catch (err) {
        console.warn('[OfficeBuilder] DOCX conversion fallback:', err);
      }
    } else if (ext === 'xlsx' || ext === 'xls') {
      try {
        const blob = await buildXlsxBlob(rawContent, name.replace(/\.xlsx?$/i, ''));
        return { blob, mimeType: MIME_XLSX };
      } catch (err) {
        console.warn('[OfficeBuilder] XLSX conversion fallback:', err);
      }
    } else if (ext === 'pptx' || ext === 'ppt') {
      try {
        const blob = await buildPptxBlob(rawContent, name.replace(/\.pptx?$/i, ''));
        return { blob, mimeType: MIME_PPTX };
      } catch (err) {
        console.warn('[OfficeBuilder] PPTX conversion fallback:', err);
      }
    }
  }

  return {
    blob: new Blob([typeof rawContent === 'object' ? JSON.stringify(rawContent, null, 2) : String(rawContent)], { type: defaultMime }),
    mimeType: defaultMime,
  };
}
