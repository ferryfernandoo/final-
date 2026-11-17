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
    } catch (_) { }
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
    } catch (_) { }
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

const PPT_THEMES = {
  indigo: {
    heroBg: '0F172A', canvasBg: 'F8FAFC', cardBg: 'FFFFFF', border: 'E2E8F0',
    accent: '4F46E5', accentSoft: 'EEF2FF', ink: '0F172A', muted: '475569', subtle: '64748B',
    heroInk: 'FFFFFF', heroSub: 'CBD5E1', positive: '10B981', negative: 'EF4444'
  },
  navy: {
    heroBg: '0B1F3A', canvasBg: 'F8FAFC', cardBg: 'FFFFFF', border: 'CBD5E1',
    accent: '0284C7', accentSoft: 'E0F2FE', ink: '0F172A', muted: '334155', subtle: '64748B',
    heroInk: 'FFFFFF', heroSub: 'BAE6FD', positive: '10B981', negative: 'EF4444'
  },
  emerald: {
    heroBg: '064E3B', canvasBg: 'F8FAFC', cardBg: 'FFFFFF', border: 'D1FAE5',
    accent: '059669', accentSoft: 'ECFDF5', ink: '064E3B', muted: '334155', subtle: '64748B',
    heroInk: 'FFFFFF', heroSub: 'A7F3D0', positive: '059669', negative: 'DC2626'
  },
  amber: {
    heroBg: '1C1917', canvasBg: 'FAF8F5', cardBg: 'FFFFFF', border: 'FED7AA',
    accent: 'EA580C', accentSoft: 'FFF7ED', ink: '1C1917', muted: '44403C', subtle: '78716C',
    heroInk: 'FFFFFF', heroSub: 'FDBA74', positive: '16A34A', negative: 'DC2626'
  },
  obsidian: {
    heroBg: '09090B', canvasBg: '111827', cardBg: '1F2937', border: '374151',
    accent: '38BDF8', accentSoft: '1E293B', ink: 'F9FAFB', muted: 'D1D5DB', subtle: '9CA3AF',
    heroInk: 'FFFFFF', heroSub: '94A3B8', positive: '34D399', negative: 'F87171'
  }
};

function normalizeSlideObj(s, idx, total) {
  const title = String(s?.title || `Slide ${idx + 1}`).trim();
  const bullets = Array.isArray(s?.bullets)
    ? s.bullets.map((b) => String(b || '').replace(/^[-*•]\s+/, '').trim()).filter(Boolean)
    : [];
  const rawBody = Array.isArray(s?.bullets) ? s.bullets.join('\n') : String(s?.content || s?.body || '');
  const bodyLines = rawBody
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*•]\s+/, '').trim())
    .filter(Boolean);
  const effectiveBullets = bullets.length > 0 ? bullets : bodyLines;

  let layout = String(s?.layout || s?.type || '').toLowerCase().trim();
  if (!layout) {
    if (idx === 0) layout = 'cover';
    else if (s?.chart && Array.isArray(s.chart.values)) layout = 'chart';
    else if (Array.isArray(s?.kpis) && s.kpis.length > 0) layout = 'kpi';
    else if (s?.hero || (Array.isArray(s?.cards) && s.cards.length === 2 && s?.stat)) layout = 'bento';
    else if (Array.isArray(s?.steps) && s.steps.length > 0) layout = 'timeline';
    else if (Array.isArray(s?.cards) && s.cards.length > 0) layout = 'pillars';
    else if (Array.isArray(s?.table?.rows) && s.table.rows.length > 0) layout = 'table';
    else if (idx === total - 1 && total >= 3 && effectiveBullets.length <= 2) layout = 'outro';
    else if (effectiveBullets.length >= 2) layout = 'bento_auto';
    else layout = 'standard';
  }

  return {
    layout,
    kicker: String(s?.kicker || s?.category || s?.tag || '').trim(),
    title,
    subtitle: String(s?.subtitle || '').trim(),
    meta: String(s?.meta || '').trim(),
    hero: s?.hero || null,
    kpis: Array.isArray(s?.kpis) ? s.kpis.slice(0, 4) : [],
    cards: Array.isArray(s?.cards) ? s.cards.slice(0, 4) : [],
    steps: Array.isArray(s?.steps) ? s.steps.slice(0, 5) : [],
    chart: s?.chart || null,
    insight: s?.insight || null,
    table: s?.table || null,
    bullets: effectiveBullets,
    body: rawBody,
    notes: String(s?.notes || '').trim(),
  };
}

function parseSlidesFromContent(content, fallbackTitle = 'Presentasi DeeperNova') {
  let themeName = 'indigo';
  let rawSlides = null;

  if (Array.isArray(content) && content.length > 0) {
    rawSlides = content;
  } else if (content && typeof content === 'object' && !Array.isArray(content)) {
    themeName = String(content.theme || 'indigo').toLowerCase();
    rawSlides = content.slides || content.presentation?.slides || null;
  } else {
    const trimmed = stripOuterCodeFence(content);
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed?.theme) themeName = String(parsed.theme).toLowerCase();
        rawSlides = Array.isArray(parsed) ? parsed : (parsed?.slides || parsed?.presentation?.slides || null);
      } catch (_) {}
    }

    if (!Array.isArray(rawSlides) || rawSlides.length === 0) {
      const sections = trimmed.split(/\n---+\n|\n(?=#{1,2}\s+|Slide\s+\d+[:.-]?)/i).filter((s) => s.trim());
      if (sections.length === 0) {
        rawSlides = [{ title: fallbackTitle, body: trimmed || 'Presentasi dibuat oleh DeeperNova AI', notes: '' }];
      } else {
        rawSlides = sections.map((sec, idx) => {
          const lines = sec.trim().split(/\r?\n/);
          const first = (lines[0] || '').replace(/^#+\s*|^Slide\s+\d+[:.-]?\s*/i, '').trim();
          const rest = lines.slice(1).join('\n').trim();
          return { title: first || `Slide ${idx + 1}`, body: rest || first, notes: '' };
        });
      }
    }
  }

  const total = rawSlides.length;
  return {
    theme: PPT_THEMES[themeName] || PPT_THEMES.indigo,
    slides: rawSlides.map((s, idx) => normalizeSlideObj(s, idx, total))
  };
}

function addHeaderAndFooterBands(slide, pptx, s, deckTitle, idx, total, T) {
  const defaultKicker = s.kicker || (s.layout === 'kpi' ? 'KEY METRICS' : s.layout === 'timeline' ? 'ROADMAP' : s.layout === 'chart' ? 'DATA INSIGHT' : 'STRATEGIC OVERVIEW');
  slide.addText(defaultKicker.toUpperCase().slice(0, 48), {
    x: 0.75, y: 0.36, w: 11.83, h: 0.3,
    fontSize: 10, bold: true, color: T.accent, fontFace: 'Helvetica'
  });
  slide.addText(s.title.slice(0, 120), {
    x: 0.75, y: 0.66, w: 11.83, h: 0.72,
    fontSize: 22, bold: true, color: T.ink, fontFace: 'Helvetica', valign: 'top'
  });
  // Thin divider under header
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.75, y: 1.44, w: 1.6, h: 0.04,
    fill: { color: T.accent }, line: { color: T.accent, width: 0 }
  });
  // Footer band (quiet contrast rule + slide counter)
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.75, y: 6.94, w: 11.83, h: 0.015,
    fill: { color: T.border }, line: { width: 0 }
  });
  slide.addText(String(deckTitle || 'DeeperNova AI').slice(0, 64), {
    x: 0.75, y: 7.02, w: 9.0, h: 0.28,
    fontSize: 9.5, color: T.subtle, fontFace: 'Helvetica'
  });
  slide.addText(`${String(idx + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, {
    x: 10.6, y: 7.02, w: 1.98, h: 0.28,
    fontSize: 9.5, bold: true, color: T.accent, align: 'right', fontFace: 'Helvetica'
  });
}

export async function buildPptxBlob(content, title = 'Presentasi DeeperNova') {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // Standard modern 13.333" x 7.5" 16:9 widescreen
  pptx.title = title;

  const { theme: T, slides } = parseSlidesFromContent(content, title);
  const total = slides.length;

  slides.forEach((s, idx) => {
    const slide = pptx.addSlide();

    // 1. COVER / OUTRO BOOKEND DARK HERO SLIDES
    if (s.layout === 'cover' || s.layout === 'outro') {
      slide.background = { color: T.heroBg };
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 0.24, h: 7.5,
        fill: { color: T.accent }, line: { width: 0 }
      });
      const badgeTxt = (s.kicker || (s.layout === 'cover' ? 'EXECUTIVE PRESENTATION' : 'THANK YOU & NEXT STEPS')).toUpperCase();
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.95, y: 1.45, w: 3.8, h: 0.42, rectRadius: 0.15,
        fill: { color: T.accent }, line: { width: 0 }
      });
      slide.addText(badgeTxt.slice(0, 40), {
        x: 1.05, y: 1.45, w: 3.6, h: 0.42,
        fontSize: 10, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace: 'Helvetica'
      });
      slide.addText(s.title.slice(0, 140), {
        x: 0.95, y: 2.15, w: 11.2, h: 1.85,
        fontSize: 36, bold: true, color: T.heroInk, fontFace: 'Helvetica', valign: 'top'
      });
      const subTxt = s.subtitle || (s.bullets.length > 0 ? s.bullets.slice(0, 3).join(' • ') : '');
      if (subTxt) {
        slide.addText(subTxt.slice(0, 320), {
          x: 0.95, y: 4.15, w: 10.6, h: 1.2,
          fontSize: 16, color: T.heroSub, fontFace: 'Helvetica', valign: 'top'
        });
      }
      if (s.meta || title) {
        slide.addText(String(s.meta || title).slice(0, 80), {
          x: 0.95, y: 6.45, w: 11.2, h: 0.36,
          fontSize: 11, color: T.heroSub, fontFace: 'Helvetica'
        });
      }
      if (s.notes) slide.addNotes(s.notes);
      return;
    }

    slide.background = { color: T.canvasBg };
    addHeaderAndFooterBands(slide, pptx, s, title, idx, total, T);

    // 2. KPI SCORECARD (Up to 4 Cards + Bottom Insight Bar)
    if (s.layout === 'kpi' && s.kpis.length > 0) {
      const count = s.kpis.length;
      const gap = 0.28;
      const cardW = (11.83 - gap * (count - 1)) / count;
      const cardH = s.bullets.length > 0 ? 3.2 : 4.65;
      s.kpis.forEach((k, kIdx) => {
        const x = 0.75 + kIdx * (cardW + gap);
        slide.addShape(pptx.ShapeType.roundRect, {
          x, y: 1.72, w: cardW, h: cardH, rectRadius: 0.08,
          fill: { color: T.cardBg }, line: { color: T.border, width: 1 }
        });
        slide.addShape(pptx.ShapeType.rect, {
          x, y: 1.72, w: cardW, h: 0.08,
          fill: { color: T.accent }, line: { width: 0 }
        });
        slide.addText(String(k.label || `KPI ${kIdx + 1}`).toUpperCase().slice(0, 38), {
          x: x + 0.22, y: 1.98, w: cardW - 0.44, h: 0.4,
          fontSize: 9.5, bold: true, color: T.subtle, fontFace: 'Helvetica'
        });
        slide.addText(String(k.value ?? '-').slice(0, 24), {
          x: x + 0.22, y: 2.52, w: cardW - 0.44, h: 0.95,
          fontSize: count <= 3 ? 34 : 28, bold: true, color: T.ink, fontFace: 'Helvetica'
        });
        const deltaStr = String(k.delta || k.sub || '').slice(0, 50);
        if (deltaStr) {
          const isNeg = k.positive === false || /^[-▼]/.test(deltaStr.trim());
          const deltaColor = k.positive === true || /^[+▲]/.test(deltaStr.trim()) ? T.positive : (isNeg ? T.negative : T.accent);
          slide.addText(deltaStr, {
            x: x + 0.22, y: 3.65, w: cardW - 0.44, h: 0.55,
            fontSize: 11.5, bold: true, color: deltaColor, fontFace: 'Helvetica'
          });
        }
      });
      if (s.bullets.length > 0) {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.75, y: 5.18, w: 11.83, h: 1.52, rectRadius: 0.08,
          fill: { color: T.accentSoft }, line: { color: T.border, width: 1 }
        });
        slide.addText(
          s.bullets.slice(0, 3).map((b) => ({ text: b.slice(0, 140), options: { bullet: true, breakLine: true } })),
          { x: 1.0, y: 5.32, w: 11.3, h: 1.24, fontSize: 12.5, color: T.ink, fontFace: 'Helvetica', paraSpaceAfter: 4 }
        );
      }
    }
    // 3. ASYMMETRICAL BENTO GRID (Hero Stat Card Left + 2 Right Cards)
    else if (s.layout === 'bento' || s.layout === 'bento_auto') {
      const hero = s.hero || {
        stat: s.cards[0]?.stat || `0${idx}`,
        label: (s.cards[0]?.tag || s.kicker || 'HIGHLIGHT').toUpperCase(),
        title: s.cards[0]?.title || s.bullets[0]?.slice(0, 60) || s.title,
        desc: s.cards[0]?.desc || s.bullets.slice(0, 2).join(' ')
      };
      const rightCards = s.hero
        ? (s.cards.length > 0 ? s.cards.slice(0, 2) : s.bullets.slice(0, 2).map((b, i) => ({ title: `Poin Kunci ${i + 1}`, desc: b })))
        : (s.cards.length > 1 ? s.cards.slice(1, 3) : s.bullets.slice(1, 5).reduce((acc, b, i) => {
            const slot = i % 2;
            if (!acc[slot]) acc[slot] = { title: slot === 0 ? 'Fokus Eksekusi' : 'Dampak Terukur', desc: b };
            else acc[slot].desc += `\n• ${b}`;
            return acc;
          }, []));

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.75, y: 1.72, w: 5.05, h: 4.98, rectRadius: 0.1,
        fill: { color: T.heroBg }, line: { width: 0 }
      });
      slide.addText(String(hero.label || 'SOROTAN').toUpperCase().slice(0, 36), {
        x: 1.1, y: 2.05, w: 4.35, h: 0.35,
        fontSize: 10.5, bold: true, color: T.heroSub, fontFace: 'Helvetica'
      });
      slide.addText(String(hero.stat || `0${idx}`).slice(0, 22), {
        x: 1.1, y: 2.55, w: 4.35, h: 1.15,
        fontSize: 44, bold: true, color: T.heroInk, fontFace: 'Helvetica'
      });
      slide.addText(String(hero.title || '').slice(0, 90), {
        x: 1.1, y: 3.85, w: 4.35, h: 0.75,
        fontSize: 18, bold: true, color: T.heroInk, fontFace: 'Helvetica'
      });
      if (hero.desc) {
        slide.addText(String(hero.desc).slice(0, 260), {
          x: 1.1, y: 4.72, w: 4.35, h: 1.75,
          fontSize: 13, color: T.heroSub, fontFace: 'Helvetica', valign: 'top'
        });
      }

      const safeRight = rightCards.length > 0 ? rightCards : [{ title: 'Ringkasan Poin', desc: s.bullets.join('\n') || s.body }];
      const rGap = 0.28;
      const rH = (4.98 - rGap * Math.max(0, safeRight.length - 1)) / safeRight.length;
      safeRight.forEach((rc, rIdx) => {
        const ry = 1.72 + rIdx * (rH + rGap);
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 6.08, y: ry, w: 6.5, h: rH, rectRadius: 0.08,
          fill: { color: T.cardBg }, line: { color: T.border, width: 1 }
        });
        slide.addShape(pptx.ShapeType.rect, {
          x: 6.08, y: ry, w: 0.1, h: rH,
          fill: { color: T.accent }, line: { width: 0 }
        });
        slide.addText(String(rc.title || `Poin ${rIdx + 1}`).slice(0, 80), {
          x: 6.4, y: ry + 0.22, w: 5.9, h: 0.45,
          fontSize: 16, bold: true, color: T.ink, fontFace: 'Helvetica'
        });
        const rTxt = Array.isArray(rc.bullets) ? rc.bullets.join('\n• ') : String(rc.desc || rc.body || '');
        slide.addText(rTxt.slice(0, 320), {
          x: 6.4, y: ry + 0.72, w: 5.9, h: Math.max(0.8, rH - 0.92),
          fontSize: 12.5, color: T.muted, fontFace: 'Helvetica', valign: 'top'
        });
      });
    }
    // 4. PILLARS / COMPARISON CARDS (2-4 Visual Columns)
    else if ((s.layout === 'pillars' || s.layout === 'comparison') && s.cards.length > 0) {
      const cols = s.cards.length;
      const gap = 0.32;
      const cW = (11.83 - gap * (cols - 1)) / cols;
      s.cards.forEach((c, cIdx) => {
        const cx = 0.75 + cIdx * (cW + gap);
        slide.addShape(pptx.ShapeType.roundRect, {
          x: cx, y: 1.72, w: cW, h: 4.98, rectRadius: 0.08,
          fill: { color: T.cardBg }, line: { color: T.border, width: 1 }
        });
        slide.addShape(pptx.ShapeType.rect, {
          x: cx, y: 1.72, w: cW, h: 0.1,
          fill: { color: T.accent }, line: { width: 0 }
        });
        const tag = String(c.tag || `0${cIdx + 1}`).toUpperCase().slice(0, 20);
        slide.addShape(pptx.ShapeType.roundRect, {
          x: cx + 0.24, y: 2.0, w: Math.min(2.2, cW - 0.48), h: 0.34, rectRadius: 0.12,
          fill: { color: T.accentSoft }, line: { width: 0 }
        });
        slide.addText(tag, {
          x: cx + 0.28, y: 2.02, w: Math.min(2.1, cW - 0.56), h: 0.3,
          fontSize: 9.5, bold: true, color: T.accent, fontFace: 'Helvetica'
        });
        slide.addText(String(c.title || `Pilar ${cIdx + 1}`).slice(0, 72), {
          x: cx + 0.24, y: 2.48, w: cW - 0.48, h: 0.68,
          fontSize: 16.5, bold: true, color: T.ink, fontFace: 'Helvetica', valign: 'top'
        });
        const cardBullets = Array.isArray(c.bullets) && c.bullets.length > 0
          ? c.bullets
          : (c.desc ? [c.desc] : []);
        if (cardBullets.length > 0) {
          slide.addText(
            cardBullets.slice(0, 5).map((b) => ({ text: String(b).slice(0, 140), options: { bullet: true, breakLine: true } })),
            { x: cx + 0.24, y: 3.24, w: cW - 0.48, h: 3.25, fontSize: 12.5, color: T.muted, fontFace: 'Helvetica', valign: 'top', paraSpaceAfter: 8 }
          );
        }
      });
    }
    // 5. HORIZONTAL TIMELINE / ROADMAP
    else if (s.layout === 'timeline' && s.steps.length > 0) {
      const count = s.steps.length;
      const gap = 0.26;
      const stepW = (11.83 - gap * (count - 1)) / count;
      // Connecting rail
      slide.addShape(pptx.ShapeType.rect, {
        x: 1.4, y: 2.38, w: 10.5, h: 0.05,
        fill: { color: T.border }, line: { width: 0 }
      });
      s.steps.forEach((st, stIdx) => {
        const sx = 0.75 + stIdx * (stepW + gap);
        slide.addShape(pptx.ShapeType.roundRect, {
          x: sx, y: 2.18, w: stepW, h: 0.44, rectRadius: 0.16,
          fill: { color: T.accent }, line: { width: 0 }
        });
        slide.addText(String(st.phase || st.date || `FASE ${stIdx + 1}`).toUpperCase().slice(0, 22), {
          x: sx + 0.08, y: 2.22, w: stepW - 0.16, h: 0.36,
          fontSize: 10, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Helvetica'
        });
        slide.addShape(pptx.ShapeType.roundRect, {
          x: sx, y: 2.82, w: stepW, h: 3.85, rectRadius: 0.08,
          fill: { color: T.cardBg }, line: { color: T.border, width: 1 }
        });
        slide.addText(String(st.title || `Tahap ${stIdx + 1}`).slice(0, 64), {
          x: sx + 0.2, y: 3.04, w: stepW - 0.4, h: 0.72,
          fontSize: 15, bold: true, color: T.ink, fontFace: 'Helvetica', valign: 'top'
        });
        slide.addText(String(st.desc || st.description || '').slice(0, 260), {
          x: sx + 0.2, y: 3.84, w: stepW - 0.4, h: 2.65,
          fontSize: 12.5, color: T.muted, fontFace: 'Helvetica', valign: 'top'
        });
      });
    }
    // 6. NATIVE POWERPOINT CHART + INSIGHT BENTO CARD
    else if (s.layout === 'chart' && s.chart && Array.isArray(s.chart.labels) && Array.isArray(s.chart.values)) {
      const chartData = [{
        name: String(s.chart.seriesName || 'Nilai'),
        labels: s.chart.labels.map((l) => String(l)),
        values: s.chart.values.map((v) => Number(v) || 0)
      }];
      const cType = String(s.chart.type || 'bar').toLowerCase() === 'line' ? pptx.ChartType.line : pptx.ChartType.bar;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.75, y: 1.72, w: 7.45, h: 4.98, rectRadius: 0.08,
        fill: { color: T.cardBg }, line: { color: T.border, width: 1 }
      });
      slide.addChart(cType, chartData, {
        x: 0.95, y: 1.92, w: 7.05, h: 4.58,
        barDir: 'col',
        chartColors: [T.accent],
        showLegend: false,
        showTitle: false,
        valAxisLabelFontSize: 10,
        catAxisLabelFontSize: 10,
        dataLabelColor: T.ink,
        showValue: true
      });
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 8.48, y: 1.72, w: 4.1, h: 4.98, rectRadius: 0.08,
        fill: { color: T.accentSoft }, line: { color: T.border, width: 1 }
      });
      slide.addText(String(s.insight?.title || 'SOROTAN ANALISIS').slice(0, 48), {
        x: 8.75, y: 2.02, w: 3.55, h: 0.5,
        fontSize: 16, bold: true, color: T.ink, fontFace: 'Helvetica'
      });
      const insBullets = Array.isArray(s.insight?.bullets) ? s.insight.bullets : s.bullets;
      if (insBullets.length > 0) {
        slide.addText(
          insBullets.slice(0, 5).map((b) => ({ text: String(b).slice(0, 140), options: { bullet: true, breakLine: true } })),
          { x: 8.75, y: 2.65, w: 3.55, h: 3.8, fontSize: 12.5, color: T.muted, fontFace: 'Helvetica', valign: 'top', paraSpaceAfter: 10 }
        );
      }
    }
    // 7. STYLED EXECUTIVE DATA TABLE
    else if (s.layout === 'table' && s.table?.rows?.length) {
      const headers = Array.isArray(s.table.headers) ? s.table.headers : [];
      const tableRows = [];
      if (headers.length > 0) {
        tableRows.push(headers.map((h) => ({
          text: String(h),
          options: { fill: { color: T.heroBg }, color: 'FFFFFF', bold: true, fontSize: 12 }
        })));
      }
      s.table.rows.slice(0, 10).forEach((row, rIdx) => {
        tableRows.push((Array.isArray(row) ? row : [row]).map((cell) => ({
          text: String(cell ?? ''),
          options: { fill: { color: rIdx % 2 === 0 ? T.cardBg : T.canvasBg }, color: T.ink, fontSize: 11.5 }
        })));
      });
      slide.addTable(tableRows, {
        x: 0.75, y: 1.75, w: 11.83,
        border: { type: 'solid', color: T.border, pt: 1 },
        margin: [6, 10, 6, 10],
        fontFace: 'Helvetica'
      });
    }
    // 8. CLEAN STRUCTURED CARD FALLBACK (Instead of plain text wall!)
    else {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.75, y: 1.72, w: 11.83, h: 4.98, rectRadius: 0.08,
        fill: { color: T.cardBg }, line: { color: T.border, width: 1 }
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.75, y: 1.72, w: 0.12, h: 4.98,
        fill: { color: T.accent }, line: { width: 0 }
      });
      if (s.bullets.length > 0) {
        slide.addText(
          s.bullets.slice(0, 8).map((line) => ({ text: line, options: { bullet: true, breakLine: true } })),
          {
            x: 1.15, y: 2.02, w: 11.1, h: 4.45,
            fontSize: 14, color: T.muted, fontFace: 'Helvetica', valign: 'top', paraSpaceAfter: 10
          }
        );
      } else if (s.body) {
        slide.addText(String(s.body).slice(0, 2800), {
          x: 1.15, y: 2.02, w: 11.1, h: 4.45,
          fontSize: 14, color: T.muted, fontFace: 'Helvetica', valign: 'top'
        });
      }
    }

    if (s.notes) slide.addNotes(s.notes);
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
