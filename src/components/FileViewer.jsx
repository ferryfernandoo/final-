import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { registerBackHandler } from '../services/mobileNavigationService';
import { downloadBlob, downloadFromUrl, downloadText } from '../services/universalDownloadService';
import './FileViewer.css';

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'ogv', 'm4v', 'mkv']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac']);
const TEXT_EXTS = new Set([
  'txt', 'md', 'markdown', 'json', 'js', 'jsx', 'ts', 'tsx',
  'py', 'css', 'scss', 'sql', 'xml', 'yaml', 'yml', 'sh', 'log', 'env', 'ini', 'toml'
]);
const MAX_SHEET_PREVIEW_ROWS = 1000;

function getExt(name = '', explicitExt = '') {
  if (explicitExt) return String(explicitExt).replace(/^\./, '').toLowerCase();
  const parts = String(name).split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function colLetter(idx) {
  let s = '';
  let n = idx + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function sanitizeDocxHtml(rawHtml = '') {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(rawHtml || ''), 'text/html');
    doc.querySelectorAll('script, style, iframe, object, embed, link, meta, base, form').forEach((el) => el.remove());
    doc.querySelectorAll('*').forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        const val = String(attr.value || '').trim().toLowerCase();
        if (name.startsWith('on')) {
          el.removeAttribute(attr.name);
        } else if ((name === 'href' || name === 'src' || name === 'xlink:href') &&
          (val.startsWith('javascript:') || val.startsWith('vbscript:') || val.startsWith('data:text/html'))) {
          el.removeAttribute(attr.name);
        }
      }
    });
    return doc.body.innerHTML || '';
  } catch {
    return '';
  }
}

function decodeBase64ToBytes(dataUrl) {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return new Uint8Array(0);
  const meta = dataUrl.slice(0, commaIdx);
  const body = dataUrl.slice(commaIdx + 1);
  if (/;base64/i.test(meta)) {
    const bin = atob(body);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  return new TextEncoder().encode(decodeURIComponent(body));
}

function parseHexOrSchemeColor(containerNode, themeMap = {}, fallback = null) {
  if (!containerNode) return fallback;
  const srgb = containerNode.getElementsByTagNameNS('*', 'srgbClr')[0];
  if (srgb) {
    const val = (srgb.getAttribute('val') || '').replace(/^#/, '');
    if (/^[0-9a-f]{6}$/i.test(val)) return `#${val}`;
  }
  const scheme = containerNode.getElementsByTagNameNS('*', 'schemeClr')[0];
  if (scheme) {
    const key = (scheme.getAttribute('val') || '').toLowerCase();
    const mapped = themeMap[key] || themeMap[key === 'tx1' ? 'dk1' : key === 'bg1' ? 'lt1' : key === 'tx2' ? 'dk2' : key === 'bg2' ? 'lt2' : key];
    if (mapped) return mapped;
  }
  return fallback;
}

function isDarkHex(hex = '') {
  const m = String(hex).replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return false;
  const lum = (0.299 * parseInt(m[1], 16) + 0.587 * parseInt(m[2], 16) + 0.114 * parseInt(m[3], 16)) / 255;
  return lum < 0.48;
}

function uint8ToDataUrl(u8, mime = 'image/png') {
  let bin = '';
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return `data:${mime};base64,${btoa(bin)}`;
}

async function parsePptxTheme(zip, parser) {
  const map = {
    dk1: '#0F172A', lt1: '#FFFFFF', dk2: '#1E293B', lt2: '#F8FAFC',
    accent1: '#4F46E5', accent2: '#0284C7', accent3: '#10B981',
    accent4: '#EA580C', accent5: '#8B5CF6', accent6: '#0EA5E9'
  };
  const themeEntry = zip.file('ppt/theme/theme1.xml');
  if (!themeEntry) return map;
  try {
    const xml = await themeEntry.async('string');
    const doc = parser.parseFromString(xml, 'application/xml');
    const clrScheme = doc.getElementsByTagNameNS('*', 'clrScheme')[0];
    if (!clrScheme) return map;
    for (const key of Object.keys(map)) {
      const node = clrScheme.getElementsByTagNameNS('*', key)[0];
      if (!node) continue;
      const srgb = node.getElementsByTagNameNS('*', 'srgbClr')[0];
      const sysClr = node.getElementsByTagNameNS('*', 'sysClr')[0];
      const hex = srgb?.getAttribute('val') || sysClr?.getAttribute('lastClr');
      if (hex && /^[0-9a-f]{6}$/i.test(hex)) map[key] = `#${hex}`;
    }
  } catch {}
  return map;
}

function resolvePptRelTarget(relTarget = '') {
  const clean = String(relTarget || '').replace(/\\/g, '/').trim();
  if (!clean) return '';
  if (clean.startsWith('/')) return clean.slice(1);
  if (clean.startsWith('../')) return `ppt/${clean.slice(3)}`;
  if (clean.startsWith('ppt/')) return clean;
  return `ppt/slides/${clean}`;
}

async function parsePptxChartXml(zip, relPath, parser, themeMap) {
  const entry = zip.file(relPath);
  if (!entry) return null;
  try {
    const xml = await entry.async('string');
    const doc = parser.parseFromString(xml, 'application/xml');
    const isLine = doc.getElementsByTagNameNS('*', 'lineChart').length > 0 && doc.getElementsByTagNameNS('*', 'barChart').length === 0;
    const serNodes = Array.from(doc.getElementsByTagNameNS('*', 'ser'));
    if (!serNodes.length) return null;
    const firstSer = serNodes[0];
    const cats = Array.from(firstSer.getElementsByTagNameNS('*', 'cat')[0]?.getElementsByTagNameNS('*', 'v') || []).map((n) => (n.textContent || '').trim());
    const vals = Array.from(firstSer.getElementsByTagNameNS('*', 'val')[0]?.getElementsByTagNameNS('*', 'v') || []).map((n) => parseFloat(n.textContent || '0') || 0);
    const spPr = firstSer.getElementsByTagNameNS('*', 'spPr')[0];
    const color = parseHexOrSchemeColor(spPr, themeMap, themeMap.accent1 || '#4F46E5');
    return { type: isLine ? 'line' : 'bar', labels: cats, values: vals, color };
  } catch {
    return null;
  }
}

async function parsePptxSlides(bytes) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(bytes);
  const parser = new DOMParser();
  const themeMap = await parsePptxTheme(zip, parser);

  // Slide size in EMU (default 16:9 widescreen 13.333" x 7.5")
  let slideW = 12192000;
  let slideH = 6858000;
  const presEntry = zip.file('ppt/presentation.xml');
  if (presEntry) {
    try {
      const presDoc = parser.parseFromString(await presEntry.async('string'), 'application/xml');
      const sldSz = presDoc.getElementsByTagNameNS('*', 'sldSz')[0];
      if (sldSz) {
        const cx = parseInt(sldSz.getAttribute('cx') || '0', 10);
        const cy = parseInt(sldSz.getAttribute('cy') || '0', 10);
        if (cx > 0 && cy > 0) {
          slideW = cx;
          slideH = cy;
        }
      }
    } catch {}
  }
  const slideWidthPt = (slideW / 914400) * 72;
  const slideHeightPt = (slideH / 914400) * 72;

  const slideEntries = Object.keys(zip.files)
    .map((name) => {
      const m = name.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
      return m ? { name, num: parseInt(m[1], 10) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.num - b.num);

  const slides = [];

  for (const entry of slideEntries) {
    const xmlStr = await zip.file(entry.name).async('string');
    const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');
    const paragraphs = [];

    const pNodes = Array.from(xmlDoc.getElementsByTagNameNS('*', 'p'));
    for (const p of pNodes) {
      const runs = Array.from(p.getElementsByTagNameNS('*', 't'))
        .map((t) => t.textContent || '')
        .join('')
        .trim();
      if (runs) paragraphs.push(runs);
    }

    if (paragraphs.length === 0) {
      const looseText = Array.from(xmlDoc.getElementsByTagNameNS('*', 't'))
        .map((t) => (t.textContent || '').trim())
        .filter(Boolean);
      paragraphs.push(...looseText);
    }

    // Parse slide relationships (media images, charts, speaker notes)
    let notes = '';
    const relMap = {};
    const relPath = `ppt/slides/_rels/slide${entry.num}.xml.rels`;
    if (zip.files[relPath]) {
      const relStr = await zip.file(relPath).async('string');
      const relDoc = parser.parseFromString(relStr, 'application/xml');
      for (const rel of Array.from(relDoc.getElementsByTagNameNS('*', 'Relationship'))) {
        const id = rel.getAttribute('Id');
        const target = rel.getAttribute('Target') || '';
        if (id) relMap[id] = target;
      }
      const noteMatch = relStr.match(/Target="\.\.\/(notesSlides\/notesSlide\d+\.xml)"/i);
      if (noteMatch && zip.files[`ppt/${noteMatch[1]}`]) {
        const noteXml = await zip.file(`ppt/${noteMatch[1]}`).async('string');
        const noteDoc = parser.parseFromString(noteXml, 'application/xml');
        const noteLines = Array.from(noteDoc.getElementsByTagNameNS('*', 't'))
          .map((t) => (t.textContent || '').trim())
          .filter((txt) => txt && !/^\d+$/.test(txt));
        notes = noteLines.join(' ').trim();
      }
    }

    // Extract background fill
    const bgNode = xmlDoc.getElementsByTagNameNS('*', 'bg')[0];
    const bgFillNode = bgNode?.getElementsByTagNameNS('*', 'solidFill')[0] || bgNode?.getElementsByTagNameNS('*', 'gs')[0];
    const bgColor = parseHexOrSchemeColor(bgFillNode, themeMap, '#FFFFFF');
    const slideDarkBg = isDarkHex(bgColor);

    // Extract visual elements from <p:spTree>
    const elements = [];
    const spTree = xmlDoc.getElementsByTagNameNS('*', 'spTree')[0];
    const children = spTree ? Array.from(spTree.children || []) : [];

    for (const child of children) {
      const localName = (child.localName || child.nodeName || '').split(':').pop();
      if (localName === 'nvGrpSpPr' || localName === 'grpSpPr') continue;

      const xfrm = child.getElementsByTagNameNS('*', 'xfrm')[0];
      const off = xfrm?.getElementsByTagNameNS('*', 'off')[0];
      const ext = xfrm?.getElementsByTagNameNS('*', 'ext')[0];
      if (!off || !ext) continue;

      const xPct = (parseFloat(off.getAttribute('x') || '0') / slideW) * 100;
      const yPct = (parseFloat(off.getAttribute('y') || '0') / slideH) * 100;
      const wPct = (parseFloat(ext.getAttribute('cx') || '0') / slideW) * 100;
      const hPct = (parseFloat(ext.getAttribute('cy') || '0') / slideH) * 100;
      if (wPct <= 0.05 || hPct <= 0.05) continue;

      if (localName === 'sp') {
        const spPr = child.getElementsByTagNameNS('*', 'spPr')[0];
        const prstGeom = spPr?.getElementsByTagNameNS('*', 'prstGeom')[0]?.getAttribute('prst') || 'rect';
        const directSolidFill = Array.from(spPr?.children || []).find((n) => (n.localName || '').endsWith('solidFill'));
        const noFill = Array.from(spPr?.children || []).some((n) => (n.localName || '').endsWith('noFill'));
        const fillColor = noFill ? 'transparent' : parseHexOrSchemeColor(directSolidFill, themeMap, 'transparent');

        const lnNode = Array.from(spPr?.children || []).find((n) => (n.localName || '').endsWith('ln'));
        const lnNoFill = lnNode && Array.from(lnNode.children || []).some((n) => (n.localName || '').endsWith('noFill'));
        const lnFill = lnNode && Array.from(lnNode.children || []).find((n) => (n.localName || '').endsWith('solidFill'));
        const borderColor = (!lnNode || lnNoFill || !lnFill) ? 'transparent' : parseHexOrSchemeColor(lnFill, themeMap, 'transparent');
        const borderPt = borderColor !== 'transparent' ? Math.max(0.75, (parseFloat(lnNode.getAttribute('w') || '12700') / 12700)) : 0;

        const txBody = child.getElementsByTagNameNS('*', 'txBody')[0];
        const bodyPr = txBody?.getElementsByTagNameNS('*', 'bodyPr')[0];
        const anchor = bodyPr?.getAttribute('anchor') || 't';
        const shapeDark = fillColor !== 'transparent' ? isDarkHex(fillColor) : slideDarkBg;
        const defaultTextColor = shapeDark ? '#FFFFFF' : '#0F172A';

        const richParagraphs = [];
        if (txBody) {
          for (const p of Array.from(txBody.children || [])) {
            if ((p.localName || '') !== 'p') continue;
            const pPr = Array.from(p.children || []).find((n) => (n.localName || '') === 'pPr');
            const algn = pPr?.getAttribute('algn') || 'l';
            const hasBuChar = Boolean(pPr?.getElementsByTagNameNS('*', 'buChar')[0]);
            const runs = [];
            for (const r of Array.from(p.children || [])) {
              const rName = r.localName || '';
              if (rName !== 'r' && rName !== 'fld') continue;
              const tNode = r.getElementsByTagNameNS('*', 't')[0];
              const txt = tNode?.textContent || '';
              if (!txt) continue;
              const rPr = r.getElementsByTagNameNS('*', 'rPr')[0];
              const szRaw = rPr?.getAttribute('sz');
              const fontSize = szRaw ? parseFloat(szRaw) / 100 : 14;
              const bold = rPr?.getAttribute('b') === '1';
              const italic = rPr?.getAttribute('i') === '1';
              const rFill = Array.from(rPr?.children || []).find((n) => (n.localName || '') === 'solidFill');
              const color = parseHexOrSchemeColor(rFill, themeMap, defaultTextColor);
              runs.push({ text: txt, fontSize, bold, italic, color });
            }
            if (runs.length > 0) {
              richParagraphs.push({ align: algn === 'ctr' ? 'center' : algn === 'r' ? 'right' : 'left', bullet: hasBuChar, runs });
            }
          }
        }

        elements.push({
          kind: 'shape',
          x: xPct, y: yPct, w: wPct, h: hPct,
          prstGeom, fillColor, borderColor, borderPt, anchor,
          paragraphs: richParagraphs
        });
      } else if (localName === 'pic') {
        const blip = child.getElementsByTagNameNS('*', 'blip')[0];
        const rId = blip?.getAttribute('r:embed') || blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed');
        const relTarget = rId ? relMap[rId] : null;
        if (relTarget) {
          const mediaPath = resolvePptRelTarget(relTarget);
          const mediaEntry = zip.file(mediaPath);
          if (mediaEntry) {
            const mediaU8 = await mediaEntry.async('uint8array');
            const mExt = mediaPath.split('.').pop()?.toLowerCase() || 'png';
            const mime = mExt === 'jpg' || mExt === 'jpeg' ? 'image/jpeg' : mExt === 'svg' ? 'image/svg+xml' : `image/${mExt}`;
            elements.push({ kind: 'image', x: xPct, y: yPct, w: wPct, h: hPct, src: uint8ToDataUrl(mediaU8, mime) });
          }
        }
      } else if (localName === 'graphicFrame') {
        const tbl = child.getElementsByTagNameNS('*', 'tbl')[0];
        if (tbl) {
          const tblRows = [];
          for (const tr of Array.from(tbl.getElementsByTagNameNS('*', 'tr'))) {
            const rowCells = [];
            for (const tc of Array.from(tr.getElementsByTagNameNS('*', 'tc'))) {
              const tcPr = tc.getElementsByTagNameNS('*', 'tcPr')[0];
              const tcFill = tcPr?.getElementsByTagNameNS('*', 'solidFill')[0];
              const fillColor = parseHexOrSchemeColor(tcFill, themeMap, '#FFFFFF');
              const txt = Array.from(tc.getElementsByTagNameNS('*', 't')).map((t) => t.textContent || '').join('').trim();
              const rPr = tc.getElementsByTagNameNS('*', 'rPr')[0];
              const color = parseHexOrSchemeColor(rPr?.getElementsByTagNameNS('*', 'solidFill')[0], themeMap, isDarkHex(fillColor) ? '#FFFFFF' : '#0F172A');
              const bold = rPr?.getAttribute('b') === '1';
              rowCells.push({ text: txt, fillColor, color, bold });
            }
            if (rowCells.length) tblRows.push(rowCells);
          }
          elements.push({ kind: 'table', x: xPct, y: yPct, w: wPct, h: hPct, rows: tblRows });
        } else {
          const chartNode = child.getElementsByTagNameNS('*', 'chart')[0];
          const rId = chartNode?.getAttribute('r:id') || chartNode?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
          const relTarget = rId ? relMap[rId] : null;
          if (relTarget) {
            const chartPath = resolvePptRelTarget(relTarget);
            const chartData = await parsePptxChartXml(zip, chartPath, parser, themeMap);
            if (chartData) {
              elements.push({ kind: 'chart', x: xPct, y: yPct, w: wPct, h: hPct, chart: chartData });
            }
          }
        }
      }
    }

    const title = paragraphs[0] || `Slide ${entry.num}`;
    const body = paragraphs.length > 1 ? paragraphs.slice(1) : [];
    slides.push({ num: entry.num, title, body, notes, bgColor, slideWidthPt, slideHeightPt, elements });
  }

  return slides;
}

async function parseDocxXmlFallback(bytes) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(bytes);
  const docEntry = zip.file('word/document.xml');
  if (!docEntry) return '';
  const xmlStr = await docEntry.async('string');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');
  const paras = Array.from(xmlDoc.getElementsByTagNameNS('*', 'p'))
    .map((p) => Array.from(p.getElementsByTagNameNS('*', 't')).map((t) => t.textContent || '').join('').trim())
    .filter(Boolean);
  if (!paras.length) return '';
  return paras
    .map((line, i) => {
      const safe = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return i === 0 ? `<h1>${safe}</h1>` : `<p>${safe}</p>`;
    })
    .join('');
}

function parseTabularFallback(text = '') {
  const lines = String(text || '').split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];
  const rows = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^\|?[\s:|-]+\|?$/.test(t) && t.includes('-')) continue;
    if (t.startsWith('|') && t.includes('|')) {
      rows.push(t.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
    } else if (t.includes('\t')) {
      rows.push(t.split('\t').map((c) => c.trim()));
    } else {
      rows.push(t.split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
    }
  }
  return rows.length ? [{ name: 'Sheet1', rows: rows.slice(0, MAX_SHEET_PREVIEW_ROWS), truncated: rows.length > MAX_SHEET_PREVIEW_ROWS, totalRows: rows.length }] : [];
}

function extractReadableBinaryStrings(bytes) {
  try {
    const ascii = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    const lines = ascii
      .replace(/[^\x20-\x7E\r\n]/g, '\n')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 6 && /[a-zA-Z]{3}/.test(s));
    return Array.from(new Set(lines)).slice(0, 80);
  } catch {
    return [];
  }
}

function PptxVisualSlideCanvas({ slide }) {
  const stageRef = useRef(null);
  const [frameWidth, setFrameWidth] = useState(820);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 40) setFrameWidth(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const designWpx = (slide.slideWidthPt || 960) * (96 / 72);
  const scale = frameWidth / designWpx;
  const aspect = (slide.slideWidthPt || 960) / (slide.slideHeightPt || 540);

  return (
    <div
      ref={stageRef}
      className="fv-pptx-visual-canvas"
      style={{ aspectRatio: String(aspect), background: slide.bgColor || '#FFFFFF' }}
    >
      {(slide.elements || []).map((el, idx) => {
        const baseStyle = {
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          boxSizing: 'border-box',
          overflow: 'hidden'
        };

        if (el.kind === 'image') {
          return (
            <img
              key={idx}
              src={el.src}
              alt=""
              style={{ ...baseStyle, objectFit: 'contain' }}
            />
          );
        }

        if (el.kind === 'table' && el.rows?.length) {
          return (
            <div key={idx} style={{ ...baseStyle, overflow: 'auto' }}>
              <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', fontSize: `${Math.max(7, 11 * scale)}px` }}>
                <tbody>
                  {el.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          style={{
                            background: cell.fillColor,
                            color: cell.color,
                            fontWeight: cell.bold || rIdx === 0 ? 700 : 400,
                            border: '1px solid #cbd5e1',
                            padding: `${Math.max(2, 4 * scale)}px ${Math.max(3, 6 * scale)}px`
                          }}
                        >
                          {cell.text}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (el.kind === 'chart' && el.chart?.values?.length) {
          const maxVal = Math.max(1, ...el.chart.values.map((v) => Math.abs(v)));
          const barCount = el.chart.values.length;
          return (
            <div key={idx} style={{ ...baseStyle, padding: `${Math.max(4, 10 * scale)}px`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <svg viewBox="0 0 400 200" style={{ width: '100%', height: '100%' }}>
                {el.chart.type === 'line' ? (
                  <>
                    <polyline
                      fill="none"
                      stroke={el.chart.color || '#4F46E5'}
                      strokeWidth="4"
                      points={el.chart.values.map((v, i) => `${30 + (i * 340) / Math.max(1, barCount - 1)},${165 - (v / maxVal) * 130}`).join(' ')}
                    />
                    {el.chart.values.map((v, i) => {
                      const cx = 30 + (i * 340) / Math.max(1, barCount - 1);
                      const cy = 165 - (v / maxVal) * 130;
                      return (
                        <g key={i}>
                          <circle cx={cx} cy={cy} r="5" fill={el.chart.color || '#4F46E5'} />
                          <text x={cx} y="190" fontSize="11" textAnchor="middle" fill="#475569">{el.chart.labels[i] || ''}</text>
                        </g>
                      );
                    })}
                  </>
                ) : (
                  el.chart.values.map((v, i) => {
                    const slotW = 360 / Math.max(1, barCount);
                    const barW = Math.min(48, slotW * 0.62);
                    const barH = Math.max(4, (Math.max(0, v) / maxVal) * 130);
                    const bx = 20 + i * slotW + (slotW - barW) / 2;
                    const by = 165 - barH;
                    return (
                      <g key={i}>
                        <rect x={bx} y={by} width={barW} height={barH} rx="4" fill={el.chart.color || '#4F46E5'} />
                        <text x={bx + barW / 2} y={by - 5} fontSize="10" fontWeight="700" textAnchor="middle" fill="#0F172A">{v}</text>
                        <text x={bx + barW / 2} y="186" fontSize="10" textAnchor="middle" fill="#475569">{String(el.chart.labels[i] || '').slice(0, 12)}</text>
                      </g>
                    );
                  })
                )}
              </svg>
            </div>
          );
        }

        const radius = el.prstGeom === 'ellipse'
          ? '50%'
          : el.prstGeom === 'roundRect'
            ? `${Math.max(3, 10 * scale)}px`
            : '0px';
        const justify = el.anchor === 'ctr' ? 'center' : el.anchor === 'b' ? 'flex-end' : 'flex-start';

        return (
          <div
            key={idx}
            style={{
              ...baseStyle,
              background: el.fillColor,
              borderRadius: radius,
              border: el.borderPt > 0 && el.borderColor !== 'transparent'
                ? `${Math.max(1, el.borderPt * scale)}px solid ${el.borderColor}`
                : 'none',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: justify,
              padding: el.paragraphs?.length ? `${Math.max(2, 5 * scale)}px ${Math.max(3, 7 * scale)}px` : 0
            }}
          >
            {(el.paragraphs || []).map((p, pIdx) => (
              <div
                key={pIdx}
                style={{
                  textAlign: p.align,
                  lineHeight: 1.28,
                  marginBottom: `${Math.max(1, 3 * scale)}px`,
                  wordBreak: 'break-word'
                }}
              >
                {p.bullet && <span style={{ marginRight: `${Math.max(2, 4 * scale)}px`, color: p.runs[0]?.color || '#334155', fontSize: `${Math.max(6, (p.runs[0]?.fontSize || 13) * scale)}px` }}>•</span>}
                {p.runs.map((r, rIdx) => (
                  <span
                    key={rIdx}
                    style={{
                      fontSize: `${Math.max(6, (r.fontSize || 13) * scale)}px`,
                      fontWeight: r.bold ? 700 : 400,
                      fontStyle: r.italic ? 'italic' : 'normal',
                      color: r.color
                    }}
                  >
                    {r.text}
                  </span>
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function getFileMetaIcon(ext) {
  if (ext === 'docx' || ext === 'doc') return { icon: 'fa-solid fa-file-word', color: '#2b579a', label: 'Word' };
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return { icon: 'fa-solid fa-file-excel', color: '#107c41', label: 'Spreadsheet' };
  if (ext === 'pptx' || ext === 'ppt') return { icon: 'fa-solid fa-file-powerpoint', color: '#d24726', label: 'PowerPoint' };
  if (ext === 'pdf') return { icon: 'fa-solid fa-file-pdf', color: '#dc2626', label: 'PDF' };
  if (ext === 'zip') return { icon: 'fa-solid fa-file-zipper', color: '#7c3aed', label: 'ZIP Archive' };
  if (IMAGE_EXTS.has(ext)) return { icon: 'fa-solid fa-file-image', color: '#059669', label: 'Image' };
  if (VIDEO_EXTS.has(ext)) return { icon: 'fa-solid fa-file-video', color: '#7c3aed', label: 'Video' };
  if (AUDIO_EXTS.has(ext)) return { icon: 'fa-solid fa-file-audio', color: '#0284c7', label: 'Audio' };
  if (ext === 'html' || ext === 'htm') return { icon: 'fa-brands fa-html5', color: '#e34f26', label: 'HTML' };
  if (ext === 'md' || ext === 'markdown') return { icon: 'fa-solid fa-file-lines', color: '#334155', label: 'Markdown' };
  return { icon: 'fa-solid fa-file-lines', color: '#475569', label: ext ? ext.toUpperCase() : 'File' };
}

function formatBytes(size) {
  if (!size) return '';
  if (typeof size === 'string') return size;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function PdfCanvasViewer({ bytes, blobUrl, fileName, isEn, zoom }) {
  const [pageImages, setPageImages] = useState([]);
  const [pdfError, setPdfError] = useState(false);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setPageImages([]);
    setPdfError(false);
    setNumPages(0);

    const renderPdf = async () => {
      if (!bytes || bytes.length < 4) {
        setPdfError(true);
        return;
      }
      try {
        const pdfjsLib = await import('pdfjs-dist');
        try {
          const workerMod = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
          if (pdfjsLib?.GlobalWorkerOptions && workerMod?.default) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerMod.default;
          }
        } catch {
          if (pdfjsLib?.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '5.6.205'}/pdf.worker.min.mjs`;
          }
        }
        const task = pdfjsLib.getDocument({ data: bytes.slice() });
        const pdf = await task.promise;
        if (cancelled) return;
        setNumPages(pdf.numPages);
        const maxRenderPages = Math.min(pdf.numPages, 25);
        const rendered = [];
        for (let p = 1; p <= maxRenderPages; p++) {
          if (cancelled) return;
          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
          rendered.push({ pageNum: p, dataUrl: canvas.toDataURL('image/png') });
        }
        if (!cancelled) setPageImages(rendered);
      } catch (_err) {
        if (!cancelled) setPdfError(true);
      }
    };

    renderPdf();
    return () => {
      cancelled = true;
    };
  }, [bytes]);

  if (!pdfError && pageImages.length > 0) {
    return (
      <div className="fv-pdf-pages-stage">
        {pageImages.map((pg) => (
          <div
            key={pg.pageNum}
            className="fv-pdf-page-card"
            style={{ width: `${Math.round(Math.min(920, 740 * zoom))}px` }}
          >
            <img
              src={pg.dataUrl}
              alt={`${fileName} - Page ${pg.pageNum}`}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
            <div className="fv-pdf-page-label">
              {isEn ? `Page ${pg.pageNum} / ${numPages}` : `Halaman ${pg.pageNum} / ${numPages}`}
            </div>
          </div>
        ))}
        {numPages > pageImages.length && (
          <div className="fv-banner-warn" style={{ borderRadius: 8 }}>
            {isEn
              ? `Showing first ${pageImages.length} of ${numPages} pages. Download for full PDF.`
              : `Menampilkan ${pageImages.length} halaman pertama dari ${numPages} halaman. Unduh untuk melihat semua halaman.`}
          </div>
        )}
      </div>
    );
  }

  if (blobUrl && pdfError) {
    return <iframe className="fv-iframe-full" src={blobUrl} title={fileName} />;
  }

  return (
    <div className="fv-state-box">
      <div className="fv-spinner" />
      <div style={{ fontWeight: 700, fontSize: 15 }}>
        {isEn ? 'Rendering PDF...' : 'Memuat halaman PDF...'}
      </div>
    </div>
  );
}

export default function FileViewer({
  file: initialFile = null,
  mode = 'page',
  onClose,
  onDownload,
  onNavigate,
  userLanguage = 'id'
}) {
  const isEn = userLanguage === 'en';
  const [localFile, setLocalFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeFile = localFile || initialFile;
  const fileName = activeFile?.name || (isEn ? 'Untitled' : 'Tanpa Judul');
  const ext = useMemo(() => getExt(fileName, activeFile?.ext), [fileName, activeFile?.ext]);
  const iconMeta = useMemo(() => getFileMetaIcon(ext), [ext]);

  const [loading, setLoading] = useState(() => Boolean(initialFile));
  const [errorMsg, setErrorMsg] = useState(null);

  // Parsed state
  const [docxHtml, setDocxHtml] = useState('');
  const [sheets, setSheets] = useState([]); // [{ name, rows, truncated, totalRows }]
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [sheetSearch, setSheetSearch] = useState('');
  const [slides, setSlides] = useState([]); // [{ num, title, body, notes, bgColor, elements }]
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [showAllSlides, setShowAllSlides] = useState(true);
  const [pptxViewMode, setPptxViewMode] = useState('visual'); // 'visual' | 'outline'
  const [zipEntries, setZipEntries] = useState([]); // [{ path, name, size, ext, entry }]
  const [selectedZipEntry, setSelectedZipEntry] = useState(null); // { path, name, text, imgUrl, size }
  const [textBody, setTextBody] = useState('');
  const [htmlViewMode, setHtmlViewMode] = useState('preview'); // 'preview' | 'source'
  const [mdViewMode, setMdViewMode] = useState('rendered'); // 'rendered' | 'source'
  const [wrapText, setWrapText] = useState(true);
  const [copiedText, setCopiedText] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const [resolvedBytes, setResolvedBytes] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const fileInputRef = useRef(null);

  // Keyboard & mobile back support for modal mode
  useEffect(() => {
    if (mode !== 'modal') return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const unreg = registerBackHandler(() => {
      onClose?.();
      return true;
    }, 60);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (typeof unreg === 'function') unreg();
    };
  }, [mode, onClose]);

  const resetParsedState = () => {
    setErrorMsg(null);
    setDocxHtml('');
    setSheets([]);
    setActiveSheetIdx(0);
    setSheetSearch('');
    setSlides([]);
    setActiveSlideIdx(0);
    setZipEntries([]);
    setSelectedZipEntry(null);
    setTextBody('');
    setResolvedBytes(null);
    setZoom(1);
    setRotation(0);
  };

  // Load and parse activeFile whenever it changes
  useEffect(() => {
    let cancelled = false;
    let objectUrlToRevoke = null;

    resetParsedState();
    setBlobUrl(null);

    if (!activeFile) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const loadAndParse = async () => {
      try {
        let bytes = null;
        let plainText = typeof activeFile.content === 'string'
          ? activeFile.content
          : (activeFile.content && typeof activeFile.content === 'object' ? JSON.stringify(activeFile.content, null, 2) : null);

        const rawBlob = activeFile.blob instanceof Blob
          ? activeFile.blob
          : (activeFile.blob?.blob instanceof Blob ? activeFile.blob.blob : null);

        if (activeFile.arrayBuffer instanceof ArrayBuffer) {
          bytes = new Uint8Array(activeFile.arrayBuffer);
        } else if (activeFile.arrayBuffer instanceof Uint8Array) {
          bytes = activeFile.arrayBuffer;
        } else if (rawBlob) {
          bytes = new Uint8Array(await rawBlob.arrayBuffer());
        } else if (typeof activeFile.dataUrl === 'string' && activeFile.dataUrl.startsWith('data:')) {
          bytes = decodeBase64ToBytes(activeFile.dataUrl);
        } else if (activeFile.url) {
          const res = await fetch(activeFile.url, { credentials: 'include' });
          if (!res.ok) {
            if (!plainText) throw new Error(`HTTP ${res.status}`);
          } else {
            bytes = new Uint8Array(await res.arrayBuffer());
          }
        }

        if ((!bytes || bytes.length === 0) && activeFile.content && ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ext)) {
          const { buildDeliverableBlob } = await import('../utils/subAgentOfficeBuilder');
          const built = await buildDeliverableBlob({ name: fileName, content: activeFile.content });
          const resolvedBlob = built?.blob instanceof Blob ? built.blob : (built instanceof Blob ? built : null);
          if (resolvedBlob) {
            bytes = new Uint8Array(await resolvedBlob.arrayBuffer());
          }
        } else if ((!bytes || bytes.length === 0) && plainText !== null) {
          bytes = new TextEncoder().encode(plainText);
        }

        if (cancelled) return;
        if (bytes) setResolvedBytes(bytes);

        const isZipSignature = Boolean(bytes && bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b);
        const isOleBinary = Boolean(bytes && bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0);

        // Parse by file type
        if (ext === 'docx' || ext === 'doc') {
          if (!bytes || bytes.length < 2) {
            throw new Error(isEn ? 'Empty Word document data.' : 'Data berkas Word kosong.');
          }
          if (isZipSignature) {
            let clean = '';
            try {
              const mammoth = await import('mammoth');
              const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
              const result = await mammoth.convertToHtml({ arrayBuffer: ab });
              clean = sanitizeDocxHtml(result.value || '');
            } catch {
              clean = '';
            }
            if (!clean) {
              try {
                clean = await parseDocxXmlFallback(bytes);
              } catch {
                clean = '';
              }
            }
            if (cancelled) return;
            setDocxHtml(clean || `<p>${isEn ? '(Document contains no displayable text)' : '(Dokumen Word berhasil dimuat — silakan unduh untuk melihat seluruh elemen)'}</p>`);
            return;
          }

          if (isOleBinary) {
            const lines = extractReadableBinaryStrings(bytes);
            if (cancelled) return;
            setDocxHtml(
              lines.length > 0
                ? lines.map((l) => `<p>${l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('')
                : `<p>${isEn ? 'Legacy binary .doc file. Click Download to open in Word.' : 'Berkas Word biner lama (.doc). Klik Unduh untuk membuka dokumen.'}</p>`
            );
            return;
          }

          const decoded = plainText ?? new TextDecoder('utf-8', { fatal: false }).decode(bytes);
          if (/<(?:html|body|p|h[1-6]|div|table)\b/i.test(decoded)) {
            setDocxHtml(sanitizeDocxHtml(decoded));
            return;
          }
          try {
            const { buildDeliverableBlob } = await import('../utils/subAgentOfficeBuilder');
            const built = await buildDeliverableBlob({ name: 'preview.docx', content: decoded });
            const resolvedBlob = built?.blob instanceof Blob ? built.blob : (built instanceof Blob ? built : null);
            if (resolvedBlob) {
              const ab = await resolvedBlob.arrayBuffer();
              const mammoth = await import('mammoth');
              const res = await mammoth.convertToHtml({ arrayBuffer: ab });
              if (cancelled) return;
              setResolvedBytes(new Uint8Array(ab));
              setDocxHtml(sanitizeDocxHtml(res.value || ''));
              return;
            }
          } catch { }
          if (cancelled) return;
          setTextBody(decoded);
          return;
        }

        if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
          let parsedSheets = [];
          try {
            const XLSX = await import('xlsx');
            const wb = ext === 'csv' && plainText !== null
              ? XLSX.read(plainText, { type: 'string' })
              : XLSX.read(bytes, { type: 'array' });
            parsedSheets = (wb.SheetNames || []).map((sheetName) => {
              const ws = wb.Sheets[sheetName];
              const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
              const truncated = rawRows.length > MAX_SHEET_PREVIEW_ROWS;
              const rows = truncated ? rawRows.slice(0, MAX_SHEET_PREVIEW_ROWS) : rawRows;
              return { name: sheetName, rows, truncated, totalRows: rawRows.length };
            });
          } catch {
            parsedSheets = [];
          }
          if (parsedSheets.length === 0) {
            const decoded = plainText ?? (bytes ? new TextDecoder('utf-8', { fatal: false }).decode(bytes) : '');
            if (decoded && !isOleBinary) {
              try {
                const { buildDeliverableBlob } = await import('../utils/subAgentOfficeBuilder');
                const built = await buildDeliverableBlob({ name: 'preview.xlsx', content: decoded });
                const resolvedBlob = built?.blob instanceof Blob ? built.blob : (built instanceof Blob ? built : null);
                if (resolvedBlob) {
                  const ab = await resolvedBlob.arrayBuffer();
                  const XLSX = await import('xlsx');
                  const wb = XLSX.read(new Uint8Array(ab), { type: 'array' });
                  parsedSheets = (wb.SheetNames || []).map((sheetName) => {
                    const ws = wb.Sheets[sheetName];
                    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
                    return { name: sheetName, rows: rawRows.slice(0, MAX_SHEET_PREVIEW_ROWS), truncated: rawRows.length > MAX_SHEET_PREVIEW_ROWS, totalRows: rawRows.length };
                  });
                  if (!cancelled) setResolvedBytes(new Uint8Array(ab));
                }
              } catch { }
              if (parsedSheets.length === 0) {
                parsedSheets = parseTabularFallback(decoded);
              }
            }
          }
          if (cancelled) return;
          if (parsedSheets.length > 0) {
            setSheets(parsedSheets);
            return;
          }
          setTextBody(isEn ? 'Binary spreadsheet ready to download.' : 'Berkas spreadsheet siap diunduh.');
          return;
        }

        if (ext === 'pptx' || ext === 'ppt') {
          let parsedSlides = [];
          if (isZipSignature) {
            try {
              parsedSlides = await parsePptxSlides(bytes);
            } catch {
              parsedSlides = [];
            }
          } else if (isOleBinary) {
            const lines = extractReadableBinaryStrings(bytes);
            parsedSlides = [{
              num: 1,
              title: fileName,
              body: lines.length > 0
                ? lines
                : [isEn ? 'Legacy binary PowerPoint (.ppt). Download to view full slides.' : 'Berkas PowerPoint biner (.ppt). Silakan unduh untuk melihat seluruh desain slide.'],
              notes: ''
            }];
          } else {
            const decoded = plainText ?? (bytes ? new TextDecoder('utf-8', { fatal: false }).decode(bytes) : '');
            if (decoded.trim()) {
              try {
                const { buildDeliverableBlob } = await import('../utils/subAgentOfficeBuilder');
                const built = await buildDeliverableBlob({ name: 'preview.pptx', content: decoded });
                const resolvedBlob = built?.blob instanceof Blob ? built.blob : (built instanceof Blob ? built : null);
                if (resolvedBlob) {
                  const ab = await resolvedBlob.arrayBuffer();
                  const u8 = new Uint8Array(ab);
                  if (!cancelled) setResolvedBytes(u8);
                  parsedSlides = await parsePptxSlides(u8);
                }
              } catch {
                parsedSlides = [];
              }
              if (parsedSlides.length === 0) {
                const sections = decoded.split(/\r?\n---\r?\n/).filter((s) => s.trim());
                parsedSlides = sections.map((sec, i) => {
                  const lines = sec.split(/\r?\n/).map((l) => l.replace(/^#+\s*/, '').trim()).filter(Boolean);
                  return {
                    num: i + 1,
                    title: lines[0] || `Slide ${i + 1}`,
                    body: lines.slice(1),
                    notes: ''
                  };
                });
              }
            }
          }
          if (cancelled) return;
          setSlides(parsedSlides);
          return;
        }

        if (ext === 'pdf') {
          if (bytes) {
            const pdfBlob = new Blob([bytes], { type: 'application/pdf' });
            objectUrlToRevoke = URL.createObjectURL(pdfBlob);
            setBlobUrl(objectUrlToRevoke);
          } else if (activeFile.url) {
            setBlobUrl(activeFile.url);
          }
          return;
        }

        if (ext === 'zip' && bytes) {
          const JSZip = (await import('jszip')).default;
          const zip = await JSZip.loadAsync(bytes);
          const entries = [];
          for (const [entryPath, zipObj] of Object.entries(zip.files)) {
            if (zipObj.dir || entryPath.startsWith('__MACOSX/')) continue;
            const entryName = entryPath.split('/').pop() || entryPath;
            const entryExt = (entryName.split('.').pop() || '').toLowerCase();
            entries.push({
              path: entryPath,
              name: entryName,
              ext: entryExt,
              size: zipObj._data?.uncompressedSize || 0,
              zipObj
            });
          }
          entries.sort((a, b) => a.path.localeCompare(b.path));
          if (cancelled) return;
          setZipEntries(entries);
          if (entries.length > 0) {
            const preferred = entries.find((e) => /^(readme\.md|package\.json|index\.html|main\.py|app\.js)$/i.test(e.name)) || entries[0];
            if (preferred && (TEXT_EXTS.has(preferred.ext) || ['html', 'htm', 'csv'].includes(preferred.ext))) {
              try {
                const txt = await preferred.zipObj.async('string');
                if (!cancelled) setSelectedZipEntry({ path: preferred.path, name: preferred.name, text: txt, size: preferred.size });
              } catch {}
            }
          }
          return;
        }

        if (IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext) || AUDIO_EXTS.has(ext)) {
          if (bytes && bytes.length > 0) {
            const mime = ext === 'svg'
              ? 'image/svg+xml'
              : IMAGE_EXTS.has(ext)
                ? `image/${ext === 'jpg' ? 'jpeg' : ext}`
                : VIDEO_EXTS.has(ext)
                  ? `video/${ext === 'mov' ? 'quicktime' : ext}`
                  : `audio/${ext === 'mp3' ? 'mpeg' : ext}`;
            const mediaBlob = new Blob([bytes], { type: mime });
            objectUrlToRevoke = URL.createObjectURL(mediaBlob);
            setBlobUrl(objectUrlToRevoke);
          } else if (activeFile.dataUrl || activeFile.url) {
            setBlobUrl(activeFile.dataUrl || activeFile.url);
          }
          return;
        }

        if (ext === 'html' || ext === 'htm' || TEXT_EXTS.has(ext)) {
          const decoded = plainText !== null
            ? plainText
            : bytes
              ? new TextDecoder('utf-8', { fatal: false }).decode(bytes)
              : '';
          if (cancelled) return;
          setTextBody(decoded);
          return;
        }

        // Unknown / archive binary: try decoding if small text else keep metadata card
        if (bytes && bytes.length > 0 && bytes.length < 256000) {
          const sample = bytes.slice(0, Math.min(bytes.length, 512));
          const nonPrintable = sample.filter((b) => b === 0).length;
          if (nonPrintable === 0) {
            setTextBody(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err?.message || (isEn ? 'Failed to open file.' : 'Gagal membuka berkas.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAndParse();

    return () => {
      cancelled = true;
      if (objectUrlToRevoke) {
        try { URL.revokeObjectURL(objectUrlToRevoke); } catch { }
      }
    };
  }, [activeFile, ext, fileName, isEn]);

  const handleOpenPickedFile = async (pickedFile) => {
    if (!pickedFile) return;
    const ab = await pickedFile.arrayBuffer();
    setLocalFile({
      name: pickedFile.name,
      size: pickedFile.size,
      arrayBuffer: ab
    });
  };

  const handleDownloadCurrent = useCallback(async () => {
    if (!activeFile) return;
    if (typeof onDownload === 'function') {
      onDownload(activeFile);
      return;
    }
    if (resolvedBytes) {
      const mimeMap = {
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        pdf: 'application/pdf'
      };
      await downloadBlob(new Blob([resolvedBytes], { type: mimeMap[ext] || 'application/octet-stream' }), fileName);
      return;
    }
    if (activeFile.url) {
      await downloadFromUrl(activeFile.url, fileName);
      return;
    }
    if (textBody) {
      await downloadText(textBody, fileName);
    }
  }, [activeFile, onDownload, resolvedBytes, ext, fileName, textBody]);

  const currentSheet = sheets[activeSheetIdx] || null;
  const filteredSheetRows = useMemo(() => {
    if (!currentSheet) return [];
    const q = sheetSearch.trim().toLowerCase();
    if (!q) return currentSheet.rows;
    return currentSheet.rows.filter((row, idx) =>
      idx === 0 || row.some((cell) => String(cell).toLowerCase().includes(q))
    );
  }, [currentSheet, sheetSearch]);

  const isDocx = ext === 'docx' || ext === 'doc';
  const isSheet = ext === 'xlsx' || ext === 'xls' || ext === 'csv';
  const isPptx = ext === 'pptx' || ext === 'ppt';
  const isPdf = ext === 'pdf';
  const isZip = ext === 'zip';
  const isHtml = ext === 'html' || ext === 'htm';
  const isMd = ext === 'md' || ext === 'markdown';
  const isImage = IMAGE_EXTS.has(ext);
  const isVideo = VIDEO_EXTS.has(ext);
  const isAudio = AUDIO_EXTS.has(ext);

  const maxCols = useMemo(() => {
    if (!filteredSheetRows.length) return 0;
    return filteredSheetRows.reduce((max, r) => Math.max(max, Array.isArray(r) ? r.length : 0), 0);
  }, [filteredSheetRows]);

  const renderViewerBody = () => {
    if (!activeFile) {
      return (
        <div className="fv-dropzone-wrap">
          <div
            className={`fv-dropzone${isDragging ? ' dragging' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer?.files?.[0];
              if (f) handleOpenPickedFile(f);
            }}
          >
            <div className="fv-dropzone-icon">
              <i className="fa-regular fa-folder-open" />
            </div>
            <h2>{isEn ? 'Open File in File Viewer' : 'Buka Berkas di File Viewer'}</h2>
            <p>
              {isEn
                ? 'Drag & drop or choose any document, spreadsheet, presentation, PDF, media, or code file directly from your device.'
                : 'Seret & lepas atau pilih dokumen, tabel spreadsheet, presentasi, PDF, gambar, media, maupun berkas teks langsung dari perangkat Anda.'}
            </p>
            <div className="fv-formats-row">
              {['.DOCX', '.XLSX', '.CSV', '.PPTX', '.PDF', '.MD', '.HTML', '.JSON', 'PNG/JPG', 'MP4/MP3'].map((fmt) => (
                <span key={fmt} className="fv-format-chip">{fmt}</span>
              ))}
            </div>
            <button type="button" className="fv-btn is-primary">
              <i className="fa-solid fa-file-arrow-up" />
              <span>{isEn ? 'Choose File from Device' : 'Pilih Berkas dari Perangkat'}</span>
            </button>
          </div>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="fv-state-box">
          <div className="fv-spinner" />
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {isEn ? `Opening ${fileName}...` : `Membuka ${fileName}...`}
          </div>
        </div>
      );
    }

    if (errorMsg) {
      return (
        <div className="fv-state-box">
          <div style={{ fontSize: 38, marginBottom: 10 }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
            {isEn ? 'Cannot preview this file' : 'Pratinjau berkas tidak tersedia'}
          </div>
          <p style={{ fontSize: 13.5, color: '#64748b', marginBottom: 18 }}>{errorMsg}</p>
          <button type="button" className="fv-btn is-primary" onClick={handleDownloadCurrent}>
            <i className="fa-solid fa-download" />
            <span>{isEn ? 'Download File' : 'Unduh Berkas'}</span>
          </button>
        </div>
      );
    }

    if (isDocx && docxHtml) {
      return (
        <div className="fv-docx-scroll">
          <div
            className="fv-docx-paper"
            style={{ fontSize: `${Math.round(15 * zoom)}px` }}
            dangerouslySetInnerHTML={{ __html: docxHtml }}
          />
        </div>
      );
    }

    if (isSheet && currentSheet) {
      return (
        <>
          {currentSheet.truncated && (
            <div className="fv-banner-warn">
              {isEn
                ? `Showing first ${MAX_SHEET_PREVIEW_ROWS.toLocaleString()} of ${currentSheet.totalRows.toLocaleString()} rows.`
                : `Menampilkan ${MAX_SHEET_PREVIEW_ROWS.toLocaleString()} baris pertama dari ${currentSheet.totalRows.toLocaleString()} baris.`}
            </div>
          )}
          <div className="fv-sheet-scroll">
            <table className="fv-sheet-table">
              <thead>
                <tr>
                  <th className="fv-sheet-row-idx">#</th>
                  {Array.from({ length: maxCols }).map((_, cIdx) => (
                    <th key={cIdx}>{colLetter(cIdx)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSheetRows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    <td className="fv-sheet-row-idx">{rIdx + 1}</td>
                    {Array.from({ length: maxCols }).map((_, cIdx) => (
                      <td key={cIdx}>{row?.[cIdx] !== undefined && row?.[cIdx] !== null ? String(row[cIdx]) : ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    if (isPptx) {
      const visibleSlides = showAllSlides ? slides : slides.slice(activeSlideIdx, activeSlideIdx + 1);
      if (!slides.length) {
        return (
          <div className="fv-state-box">
            <p style={{ color: '#64748b' }}>{isEn ? 'No slides found inside file.' : 'Tidak ada slide teks di dalam berkas.'}</p>
          </div>
        );
      }
      return (
        <div className="fv-slides-stage">
          {visibleSlides.map((slide) => (
            <div key={slide.num} className="fv-slide-card">
              <div className="fv-slide-header">
                <span>SLIDE {slide.num} / {slides.length}</span>
                <span>{fileName}</span>
              </div>
              {pptxViewMode === 'visual' && slide.elements?.length > 0 ? (
                <div className="fv-pptx-visual-wrap">
                  <PptxVisualSlideCanvas slide={slide} />
                </div>
              ) : (
                <div className="fv-slide-body">
                  <h3 className="fv-slide-title">{slide.title}</h3>
                  {slide.body.length > 0 && (
                    <ul className="fv-slide-lines">
                      {slide.body.map((line, i) => (
                        <li key={i}>{String(line || '').replace(/^[-*•]\s+/, '')}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {slide.notes && (
                <div className="fv-slide-notes" style={{ margin: '0 18px 16px' }}>
                  <strong>{isEn ? 'Speaker Notes: ' : 'Catatan Slide: '}</strong>
                  {slide.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (isZip) {
      return (
        <div className="fv-zip-explorer">
          <div className="fv-zip-sidebar">
            <div className="fv-zip-sidebar-hdr">
              <span>{isEn ? `Archive Contents (${zipEntries.length})` : `Isi Arsip ZIP (${zipEntries.length})`}</span>
            </div>
            <div className="fv-zip-list">
              {zipEntries.map((item) => {
                const isSel = selectedZipEntry?.path === item.path;
                return (
                  <button
                    key={item.path}
                    type="button"
                    className={`fv-zip-item${isSel ? ' active' : ''}`}
                    onClick={async () => {
                      if (IMAGE_EXTS.has(item.ext)) {
                        const u8 = await item.zipObj.async('uint8array');
                        const mime = item.ext === 'svg' ? 'image/svg+xml' : `image/${item.ext === 'jpg' ? 'jpeg' : item.ext}`;
                        setSelectedZipEntry({ path: item.path, name: item.name, imgUrl: uint8ToDataUrl(u8, mime), size: item.size });
                      } else {
                        const txt = await item.zipObj.async('string');
                        const isBin = txt.slice(0, 256).includes('\0');
                        setSelectedZipEntry({
                          path: item.path,
                          name: item.name,
                          text: isBin ? (isEn ? '(Binary file inside archive)' : '(Berkas biner di dalam arsip)') : txt,
                          size: item.size
                        });
                      }
                    }}
                  >
                    <span className="fv-zip-path">{item.path}</span>
                    <span className="fv-zip-size">{formatBytes(item.size)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="fv-zip-preview">
            {selectedZipEntry ? (
              selectedZipEntry.imgUrl ? (
                <div className="fv-media-stage">
                  <img src={selectedZipEntry.imgUrl} alt={selectedZipEntry.name} className="fv-image-el" />
                </div>
              ) : (
                <div className="fv-code-wrap" style={{ height: '100%' }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, borderBottom: '1px solid #1e293b', paddingBottom: 6 }}>
                    {selectedZipEntry.path}
                  </div>
                  <pre className="fv-code-pre wrap">{selectedZipEntry.text || ''}</pre>
                </div>
              )
            ) : (
              <div className="fv-state-box">
                <p style={{ color: '#64748b' }}>{isEn ? 'Select any file from the archive to inspect.' : 'Pilih berkas di arsip ZIP untuk meninjau isinya.'}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (isPdf && (resolvedBytes || blobUrl)) {
      return (
        <PdfCanvasViewer
          bytes={resolvedBytes}
          blobUrl={blobUrl}
          fileName={fileName}
          isEn={isEn}
          zoom={zoom}
        />
      );
    }

    if (isHtml) {
      if (htmlViewMode === 'preview') {
        return (
          <iframe
            className="fv-iframe-full"
            title={fileName}
            srcDoc={textBody}
            sandbox="allow-scripts allow-forms allow-popups allow-modals"
          />
        );
      }
      return (
        <div className="fv-code-wrap">
          <pre className={`fv-code-pre${wrapText ? ' wrap' : ''}`}>{textBody}</pre>
        </div>
      );
    }

    if (isMd && mdViewMode === 'rendered') {
      return (
        <div className="fv-docx-scroll">
          <div className="fv-docx-paper" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", fontSize: `${Math.round(15 * zoom)}px` }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{textBody}</ReactMarkdown>
          </div>
        </div>
      );
    }

    if (isImage && blobUrl) {
      return (
        <div className="fv-media-stage">
          <img
            src={blobUrl}
            alt={fileName}
            className="fv-image-el"
            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          />
        </div>
      );
    }

    if (isVideo && blobUrl) {
      return (
        <div className="fv-media-stage">
          <video src={blobUrl} controls playsInline className="fv-video-el" />
        </div>
      );
    }

    if (isAudio && blobUrl) {
      return (
        <div className="fv-state-box">
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎵</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{fileName}</div>
          <audio src={blobUrl} controls style={{ width: '100%', maxWidth: 440 }} />
        </div>
      );
    }

    if (textBody) {
      return (
        <div className="fv-code-wrap">
          <pre className={`fv-code-pre${wrapText ? ' wrap' : ''}`}>{textBody}</pre>
        </div>
      );
    }

    return (
      <div className="fv-state-box">
        <div style={{ fontSize: 44, marginBottom: 12, color: iconMeta.color }}>
          <i className={iconMeta.icon} />
        </div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{fileName}</div>
        <p style={{ fontSize: 13.5, color: '#64748b', marginBottom: 18 }}>
          {isEn
            ? 'Binary file preview is not available directly. Download to open on your device.'
            : 'Berkas biner ini dapat langsung diunduh untuk dibuka di perangkat Anda.'}
        </p>
        <button type="button" className="fv-btn is-primary" onClick={handleDownloadCurrent}>
          <i className="fa-solid fa-download" />
          <span>{isEn ? 'Download File' : 'Unduh Berkas'}</span>
        </button>
      </div>
    );
  };

  const showSubbar = Boolean(activeFile && !loading && !errorMsg && (
    isSheet || (isPptx && slides.length > 0) || isDocx || isMd || isImage || isHtml || textBody || isPdf
  ));

  const viewerCard = (
    <div className={mode === 'embedded' ? 'fv-embedded-shell' : 'fv-container'} onClick={(e) => e.stopPropagation()}>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked) handleOpenPickedFile(picked);
          e.target.value = '';
        }}
      />

      {/* Top Toolbar */}
      {mode !== 'embedded' && (
        <header className="fv-header">
          <div className="fv-header-left">
            {mode === 'page' && (
              <button
                type="button"
                className="fv-back-btn"
                onClick={() => onNavigate?.('chat')}
              >
                <i className="fa-solid fa-chevron-left" />
                <span>{isEn ? 'Back' : 'Kembali'}</span>
              </button>
            )}
            <div className="fv-file-icon-pill">
              <i className={iconMeta.icon} style={{ color: iconMeta.color }} />
            </div>
            <div className="fv-title-group">
              <h1 className="fv-filename" title={fileName}>
                {activeFile ? fileName : 'File Viewer'}
              </h1>
              <div className="fv-meta-row">
                <span className="fv-ext-badge">{activeFile ? (ext || iconMeta.label) : 'Universal'}</span>
                {activeFile?.size ? <span>{formatBytes(activeFile.size)}</span> : null}
                {isSheet && sheets.length > 0 && <span>• {sheets.length} sheet</span>}
                {isPptx && slides.length > 0 && <span>• {slides.length} slide</span>}
              </div>
            </div>
          </div>

          <div className="fv-header-actions">
            {mode === 'page' && (
              <button
                type="button"
                className="fv-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <i className="fa-regular fa-folder-open" />
                <span>{isEn ? 'Open File' : 'Buka Berkas'}</span>
              </button>
            )}
            {activeFile && (
              <button type="button" className="fv-btn is-primary" onClick={handleDownloadCurrent}>
                <i className="fa-solid fa-download" />
                <span>{isEn ? 'Download' : 'Unduh'}</span>
              </button>
            )}
            {mode === 'modal' && (
              <>
                <button
                  type="button"
                  className={`fv-btn${isFullscreen ? ' is-active' : ''}`}
                  onClick={() => setIsFullscreen((prev) => !prev)}
                  title={isFullscreen ? 'Normal' : 'Fullscreen'}
                >
                  <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} />
                </button>
                <button
                  type="button"
                  className="fv-btn is-close"
                  onClick={onClose}
                  aria-label="Close"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        </header>
      )}

      {/* Contextual Sub-toolbar */}
      {showSubbar && (
        <div className="fv-subbar">
          <div className="fv-tabs-scroll">
            {isSheet && sheets.map((s, idx) => (
              <button
                key={s.name}
                type="button"
                className={`fv-sheet-tab${activeSheetIdx === idx ? ' active' : ''}`}
                onClick={() => setActiveSheetIdx(idx)}
              >
                {s.name} ({s.totalRows})
              </button>
            ))}

            {isPptx && slides.length > 0 && (
              <>
                <button
                  type="button"
                  className={`fv-btn${pptxViewMode === 'visual' ? ' is-active' : ''}`}
                  onClick={() => setPptxViewMode('visual')}
                >
                  {isEn ? 'Visual 16:9' : 'Visual 16:9'}
                </button>
                <button
                  type="button"
                  className={`fv-btn${pptxViewMode === 'outline' ? ' is-active' : ''}`}
                  onClick={() => setPptxViewMode('outline')}
                >
                  {isEn ? 'Outline' : 'Teks'}
                </button>
                <button
                  type="button"
                  className={`fv-btn${showAllSlides ? ' is-active' : ''}`}
                  onClick={() => setShowAllSlides(true)}
                >
                  {isEn ? `All (${slides.length})` : `Semua (${slides.length})`}
                </button>
                <button
                  type="button"
                  className={`fv-btn${!showAllSlides ? ' is-active' : ''}`}
                  onClick={() => setShowAllSlides(false)}
                >
                  {isEn ? 'Single' : 'Per Slide'}
                </button>
                {!showAllSlides && (
                  <>
                    <button
                      type="button"
                      className="fv-btn"
                      disabled={activeSlideIdx <= 0}
                      onClick={() => setActiveSlideIdx((i) => Math.max(0, i - 1))}
                    >
                      ‹
                    </button>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '0 4px' }}>
                      {activeSlideIdx + 1} / {slides.length}
                    </span>
                    <button
                      type="button"
                      className="fv-btn"
                      disabled={activeSlideIdx >= slides.length - 1}
                      onClick={() => setActiveSlideIdx((i) => Math.min(slides.length - 1, i + 1))}
                    >
                      ›
                    </button>
                  </>
                )}
              </>
            )}

            {isHtml && (
              <>
                <button
                  type="button"
                  className={`fv-btn${htmlViewMode === 'preview' ? ' is-active' : ''}`}
                  onClick={() => setHtmlViewMode('preview')}
                >
                  Preview Web
                </button>
                <button
                  type="button"
                  className={`fv-btn${htmlViewMode === 'source' ? ' is-active' : ''}`}
                  onClick={() => setHtmlViewMode('source')}
                >
                  Source Code
                </button>
              </>
            )}

            {isMd && (
              <>
                <button
                  type="button"
                  className={`fv-btn${mdViewMode === 'rendered' ? ' is-active' : ''}`}
                  onClick={() => setMdViewMode('rendered')}
                >
                  {isEn ? 'Readable' : 'Tampilan Rapi'}
                </button>
                <button
                  type="button"
                  className={`fv-btn${mdViewMode === 'source' ? ' is-active' : ''}`}
                  onClick={() => setMdViewMode('source')}
                >
                  Markdown
                </button>
              </>
            )}

            {(isDocx || isMd || isImage || isPdf) && (
              <>
                <button type="button" className="fv-btn" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}>−</button>
                <button type="button" className="fv-btn" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
                <button type="button" className="fv-btn" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))}>+</button>
                {isImage && (
                  <button type="button" className="fv-btn" onClick={() => setRotation((r) => (r + 90) % 360)}>
                    <i className="fa-solid fa-rotate-right" />
                  </button>
                )}
              </>
            )}

            {isPdf && blobUrl && (
              <button
                type="button"
                className="fv-btn"
                onClick={() => window.open(blobUrl, '_blank', 'noopener,noreferrer')}
              >
                <i className="fa-solid fa-up-right-from-square" />
                <span>{isEn ? 'New Tab' : 'Tab Baru'}</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isSheet && (
              <input
                type="text"
                className="fv-search-input"
                placeholder={isEn ? 'Filter rows...' : 'Cari isi tabel...'}
                value={sheetSearch}
                onChange={(e) => setSheetSearch(e.target.value)}
              />
            )}

            {textBody && !isDocx && (
              <>
                <button
                  type="button"
                  className={`fv-btn${wrapText ? ' is-active' : ''}`}
                  onClick={() => setWrapText((w) => !w)}
                >
                  Wrap
                </button>
                <button
                  type="button"
                  className="fv-btn"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(textBody);
                      setCopiedText(true);
                      setTimeout(() => setCopiedText(false), 1600);
                    } catch { }
                  }}
                >
                  {copiedText ? (isEn ? '✓ Copied' : '✓ Tersalin') : (isEn ? 'Copy' : 'Salin')}
                </button>
              </>
            )}

            {mode === 'embedded' && (
              <button type="button" className="fv-btn is-primary" onClick={handleDownloadCurrent}>
                <i className="fa-solid fa-download" />
                <span>{isEn ? 'Download' : 'Unduh'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="fv-body">
        {renderViewerBody()}
      </div>
    </div>
  );

  if (mode === 'modal') {
    const modalContent = (
      <div className={`fv-modal-backdrop${isFullscreen ? ' is-fullscreen' : ''}`} onClick={onClose}>
        {viewerCard}
      </div>
    );
    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
  }

  if (mode === 'embedded') {
    return viewerCard;
  }

  return <div className="fv-page-shell">{viewerCard}</div>;
}
