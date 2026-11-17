import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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

async function parsePptxSlides(bytes) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(bytes);
  const slideEntries = Object.keys(zip.files)
    .map((name) => {
      const m = name.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
      return m ? { name, num: parseInt(m[1], 10) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.num - b.num);

  const parser = new DOMParser();
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

    let notes = '';
    const relPath = `ppt/slides/_rels/slide${entry.num}.xml.rels`;
    if (zip.files[relPath]) {
      const relStr = await zip.file(relPath).async('string');
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

    const title = paragraphs[0] || `Slide ${entry.num}`;
    const body = paragraphs.length > 1 ? paragraphs.slice(1) : [];
    slides.push({ num: entry.num, title, body, notes });
  }

  return slides;
}

function getFileMetaIcon(ext) {
  if (ext === 'docx' || ext === 'doc') return { icon: 'fa-solid fa-file-word', color: '#2b579a', label: 'Word' };
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return { icon: 'fa-solid fa-file-excel', color: '#107c41', label: 'Spreadsheet' };
  if (ext === 'pptx' || ext === 'ppt') return { icon: 'fa-solid fa-file-powerpoint', color: '#d24726', label: 'PowerPoint' };
  if (ext === 'pdf') return { icon: 'fa-solid fa-file-pdf', color: '#dc2626', label: 'PDF' };
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

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Parsed state
  const [docxHtml, setDocxHtml] = useState('');
  const [sheets, setSheets] = useState([]); // [{ name, rows, truncated, totalRows }]
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [sheetSearch, setSheetSearch] = useState('');
  const [slides, setSlides] = useState([]); // [{ num, title, body, notes }]
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [showAllSlides, setShowAllSlides] = useState(true);
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

    if (!activeFile) return undefined;

    const loadAndParse = async () => {
      setLoading(true);
      try {
        let bytes = null;
        let plainText = typeof activeFile.content === 'string' ? activeFile.content : null;

        if (activeFile.arrayBuffer instanceof ArrayBuffer) {
          bytes = new Uint8Array(activeFile.arrayBuffer);
        } else if (activeFile.arrayBuffer instanceof Uint8Array) {
          bytes = activeFile.arrayBuffer;
        } else if (activeFile.blob instanceof Blob) {
          bytes = new Uint8Array(await activeFile.blob.arrayBuffer());
        } else if (typeof activeFile.dataUrl === 'string' && activeFile.dataUrl.startsWith('data:')) {
          bytes = decodeBase64ToBytes(activeFile.dataUrl);
        } else if (activeFile.url) {
          const res = await fetch(activeFile.url, { credentials: 'include' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          bytes = new Uint8Array(await res.arrayBuffer());
        } else if (activeFile.content && (ext === 'docx' || ext === 'xlsx' || ext === 'xls' || ext === 'pptx')) {
          const { buildDeliverableBlob } = await import('../utils/subAgentOfficeBuilder');
          const built = await buildDeliverableBlob({ name: fileName, content: activeFile.content });
          bytes = new Uint8Array(await built.arrayBuffer());
        } else if (plainText !== null) {
          bytes = new TextEncoder().encode(plainText);
        }

        if (cancelled) return;
        if (bytes) setResolvedBytes(bytes);

        // Parse by file type
        if (ext === 'docx' || ext === 'doc') {
          if (!bytes || bytes.length < 4) {
            throw new Error(isEn ? 'Empty Word document data.' : 'Data berkas Word kosong.');
          }
          const isZipSignature = bytes[0] === 0x50 && bytes[1] === 0x4b;
          if (!isZipSignature && ext === 'doc') {
            setTextBody(plainText || new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/[^\x20-\x7E\n\r\t\u00A0-\u024F]/g, ' ').trim());
            return;
          }
          const mammoth = await import('mammoth');
          const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
          const result = await mammoth.convertToHtml({ arrayBuffer: ab });
          if (cancelled) return;
          const clean = sanitizeDocxHtml(result.value || '');
          setDocxHtml(clean || `<p>${isEn ? '(Document contains no displayable text)' : '(Dokumen tidak memiliki teks untuk ditampilkan)'}</p>`);
          return;
        }

        if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
          const XLSX = await import('xlsx');
          const wb = ext === 'csv' && plainText !== null
            ? XLSX.read(plainText, { type: 'string' })
            : XLSX.read(bytes, { type: 'array' });
          const parsedSheets = wb.SheetNames.map((sheetName) => {
            const ws = wb.Sheets[sheetName];
            const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            const truncated = rawRows.length > MAX_SHEET_PREVIEW_ROWS;
            const rows = truncated ? rawRows.slice(0, MAX_SHEET_PREVIEW_ROWS) : rawRows;
            return { name: sheetName, rows, truncated, totalRows: rawRows.length };
          });
          if (cancelled) return;
          setSheets(parsedSheets);
          return;
        }

        if (ext === 'pptx' || ext === 'ppt') {
          if (!bytes || bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
            throw new Error(isEn ? 'Legacy binary .ppt preview is unavailable. Please download.' : 'Pratinjau .ppt biner lama tidak didukung, silakan unduh berkas.');
          }
          const parsedSlides = await parsePptxSlides(bytes);
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
        try { URL.revokeObjectURL(objectUrlToRevoke); } catch {}
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
              <div className="fv-slide-body">
                <h3 className="fv-slide-title">{slide.title}</h3>
                {slide.body.length > 0 && (
                  <ul className="fv-slide-lines">
                    {slide.body.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                )}
                {slide.notes && (
                  <div className="fv-slide-notes">
                    <strong>{isEn ? 'Speaker Notes: ' : 'Catatan Slide: '}</strong>
                    {slide.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (isPdf && blobUrl) {
      return <iframe className="fv-iframe-full" src={blobUrl} title={fileName} />;
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
                  className={`fv-btn${showAllSlides ? ' is-active' : ''}`}
                  onClick={() => setShowAllSlides(true)}
                >
                  {isEn ? `All Slides (${slides.length})` : `Semua Slide (${slides.length})`}
                </button>
                <button
                  type="button"
                  className={`fv-btn${!showAllSlides ? ' is-active' : ''}`}
                  onClick={() => setShowAllSlides(false)}
                >
                  {isEn ? 'Single Slide' : 'Per Slide'}
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

            {(isDocx || isMd || isImage) && (
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
                    } catch {}
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
    return (
      <div className={`fv-modal-backdrop${isFullscreen ? ' is-fullscreen' : ''}`} onClick={onClose}>
        {viewerCard}
      </div>
    );
  }

  if (mode === 'embedded') {
    return viewerCard;
  }

  return <div className="fv-page-shell">{viewerCard}</div>;
}
