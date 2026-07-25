import React, { useState, useRef, useEffect, useCallback } from 'react';
import './DocumentEditor.css';
import { sendMessageToGrok, processStreamingResponse } from '../services/grokApi';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, TabStopPosition, TabStopType, Table, TableRow, TableCell, VerticalAlign, ImageRun, WidthType } from 'docx';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import mammoth from 'mammoth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ===== CELL FORMAT MODEL =====
const defaultCellFormat = () => ({
  bold: false, italic: false, underline: false, strikethrough: false,
  fontSize: 11, fontFamily: 'Calibri',
  fontColor: '#000000', fillColor: '',
  halign: 'left', valign: 'middle',
  wrapText: false,
  numberFormat: '',
  borderTop: '', borderBottom: '', borderLeft: '', borderRight: '',
});

const createCell = (value = '', format = {}) => ({
  value: String(value ?? ''),
  format: { ...defaultCellFormat(), ...format },
});

const createRow = (cols, values = []) =>
  Array.from({ length: cols }, (_, i) => createCell(values[i] ?? ''));

const createSheet = (name, rows = 10, cols = 8) => ({
  name,
  data: Array.from({ length: rows }, () => createRow(cols)),
  merges: [],
  colWidths: Array(cols).fill(100),
  rowHeights: Array(rows).fill(32),
});

const EDITOR_SLASH_COMMANDS = [
  { command: '/brainstorm', desc_id: 'Mode Chat Bebas / Tanya AI', desc_en: 'Free Chat mode', icon: '💬' },
  { command: '/agent', desc_id: 'Mode Agent — Susun Bab demi Bab', desc_en: 'Drafting Agent', icon: '🤖' },
  { command: '/draft', desc_id: 'Susun laporan bab demi bab otomatis', desc_en: 'Full report step-by-step', icon: '📝' },
  { command: '/perbaiki', desc_id: 'Edit & modifikasi isi dokumen', desc_en: 'Repair document content', icon: '🔧' },
  { command: '/outline', desc_id: 'Buat kerangka outline dokumen', desc_en: 'Generate outline', icon: '📋' },
  { command: '/audit', desc_id: 'Deteksi typo & kesalahan ejaan', desc_en: 'Typo detection audit', icon: '🔍' },
  { command: '/review', desc_id: 'Evaluasi kualitas & beri saran', desc_en: 'Quality review', icon: '⭐' },
  { command: '/diff', desc_id: 'Lihat perubahan terakhir (diff view)', desc_en: 'View last diff', icon: '📊' },
  { command: '/undo', desc_id: 'Batalkan perubahan terakhir', desc_en: 'Undo last change', icon: '↩️' },
  { command: '/fixall', desc_id: 'Perbaiki semua typo otomatis', desc_en: 'Auto-fix all typos', icon: '✨' },
];

const DocumentEditor = ({ _user, onNavigate, documentType = 'docx' }) => {
  const [editorType, setEditorType] = useState(documentType);
  const [content, setContent] = useState([]);
  const docxTextRef = useRef('');
  const syncDocxContent = useCallback(() => {
    const html = docxTextRef.current || '';
    setContent([{ id: Date.now(), type: 'html', text: html }]);
  }, []);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [generationProgress, setGenerationProgress] = useState('');
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [showAiPanel, setShowAiPanel] = useState(true);
  const [aiResponse, setAiResponse] = useState('');
  const [messages, setMessages] = useState([]);
  const [aiError, setAiError] = useState('');
  const [pendingExecution, setPendingExecution] = useState(false);
  const [pendingExecutionText, setPendingExecutionText] = useState('');
  const [executionAgentStatus, setExecutionAgentStatus] = useState('');
  // Brainstorm floating chat
  const [showBrainstormChat, setShowBrainstormChat] = useState(false);
  const [brainstormMessages, setBrainstormMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(`brainstorm_messages_${documentType}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [brainstormInput, setBrainstormInput] = useState('');
  const [isBrainstormLoading, setIsBrainstormLoading] = useState(false);

  // Custom dialog state for presets
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetModalTitle, setPresetModalTitle] = useState('');
  const [presetModalPlaceholder, setPresetModalPlaceholder] = useState('');
  const [presetModalValue, setPresetModalValue] = useState('');
  const [presetModalCallback, setPresetModalCallback] = useState(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [fontSize, setFontSize] = useState('12pt');
  const [fontFamily, setFontFamily] = useState('Times New Roman');
  const [textColor, setTextColor] = useState('#1a1a1a');
  const [excelSheets, setExcelSheets] = useState([createSheet('Sheet1', 10, 8)]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [selectedCell, setSelectedCell] = useState(null);
  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  // DOCX advanced state
  const [docxTables, setDocxTables] = useState([]);
  const [docxImages, setDocxImages] = useState([]);
  const [docxCharts, setDocxCharts] = useState([]);
  const [showTableToolbar, setShowTableToolbar] = useState(false);
  const [activeTableIdx, setActiveTableIdx] = useState(-1);
  const [showInsertImage, setShowInsertImage] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const photoInputRef = useRef(null);
  const docInputRef = useRef(null);
  const [showChartModal, setShowChartModal] = useState(false);
  const [chartModalTab, setChartModalTab] = useState('standard'); // standard or curve
  const [chartType, setChartType] = useState('bar');
  const [chartTitle, setChartTitle] = useState('Chart Title');
  const [chartData, setChartData] = useState([
    { name: 'A', value: 40 },
    { name: 'B', value: 30 },
    { name: 'C', value: 20 },
    { name: 'D', value: 50 }
  ]);
  const [docxHeader, setDocxHeader] = useState('');
  const [docxFooter, setDocxFooter] = useState('');
  const [showPageNumbers, setShowPageNumbers] = useState(false);
  const [_listLevel, _setListLevel] = useState(0);
  // Upload and Curve states
  const [uploadedFileText, setUploadedFileText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileType, setUploadedFileType] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [curveEquation, setCurveEquation] = useState('sine'); // sine, exponential, linear, bell
  const [curveAmplitude, setCurveAmplitude] = useState(50);
  const [curveColor, setCurveColor] = useState('#ff6b00');

  // ===== IMAGE SMART PLACEMENT & AI LAYOUT STATES =====
  const [imgAlign, setImgAlign] = useState('center'); // center, float-left, float-right, left, right
  const [imgWidth, setImgWidth] = useState('60%'); // 25%, 33%, 50%, 75%, 100%
  const [imgStyleType, setImgStyleType] = useState('shadow'); // shadow, border, rounded, polaroid
  const [imgCaption, setImgCaption] = useState('');
  const [imgDataUrl, setImgDataUrl] = useState('');
  const [selectedCanvasImg, setSelectedCanvasImg] = useState(null);

  // ===== PAPER SETUP STATES =====
  const [paperSize, setPaperSize] = useState('a4'); // a4, letter, legal, a5, custom
  const [customWidth, setCustomWidth] = useState('21.0'); // cm
  const [customHeight, setCustomHeight] = useState('29.7'); // cm
  const [paperStyle, setPaperStyle] = useState('blank'); // blank, lined, grid, dotted
  const [paperTheme, setPaperTheme] = useState('white'); // white, cream, yellow, dark, kraft
  const [paperMargin, setPaperMargin] = useState('normal'); // normal, narrow, wide, custom
  const [customMargin, setCustomMargin] = useState('2.54'); // cm
  const [paperOrientation, setPaperOrientation] = useState('portrait'); // portrait, landscape
  const [pageZoom, setPageZoom] = useState('fit'); // fit, 100%, 75%, 50%
  const [isDraftMode, setIsDraftMode] = useState(false); // real layout vs fluid edit width
  const [showPageSetup, setShowPageSetup] = useState(false);
  const [isAiMinimized, setIsAiMinimized] = useState(false);

  // ===== DRAW / PEN SUPPORT STATES =====
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [penColor, setPenColor] = useState('#000000');
  const [penWidth, setPenWidth] = useState(3);
  const [toolType, setToolType] = useState('pen'); // 'pen' | 'highlighter' | 'eraser'
  const [drawingPaths, setDrawingPaths] = useState([]);
  const [activePenId, setActivePenId] = useState(null);
  const drawingCanvasRef = useRef(null);

  // ===== NEW MS WORD STATES =====
  const [activeRibbonTab, setActiveRibbonTab] = useState('home'); // home, insert, layout, draw, ai
  const [highlightColor, setHighlightColor] = useState('#ffff00');
  const [lineSpacing, setLineSpacing] = useState('1.5');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [pageBorder, setPageBorder] = useState('none'); // none, solid, double, dashed
  const [watermarkText, setWatermarkText] = useState('');
  const [showFormattingMarks, setShowFormattingMarks] = useState(false);
  const [pageColumns, setPageColumns] = useState(1); // 1, 2, 3 columns
  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState(false);

  const handleTabClick = (tabName) => {
    if (activeRibbonTab === tabName) {
      setIsRibbonCollapsed(prev => !prev);
    } else {
      setActiveRibbonTab(tabName);
      setIsRibbonCollapsed(false);
    }
  };

  // ===== CLOUD FILE EXPLORER STATES =====
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [cloudFiles, setCloudFiles] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null); // parentId of browsed directory
  const [explorerMode, setExplorerMode] = useState('open'); // open, save
  const [cloudFileName, setCloudFileName] = useState('');
  const [selectedCloudFile, setSelectedCloudFile] = useState(null);
  const [activeCloudFileId, setActiveCloudFileId] = useState(null); // currently loaded cloud file ID

  // ===== DOCX INSERT POPUP STATES =====
  const [activeInsertModal, setActiveInsertModal] = useState(null); // 'table' | 'online_picture' | 'shape' | 'icon' | 'bookmark' | 'comment' | 'wikipedia' | 'video' | 'header' | 'footer' | 'symbol' | 'addins'
  const [insertParam1, setInsertParam1] = useState('');
  const [insertParam2, setInsertParam2] = useState('');

  // ===== AI AGENT STATES =====
  const [aiMode, setAiMode] = useState('chat'); // chat, drafting_agent
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentOutline, setAgentOutline] = useState([]);
  const [currentAgentStep, setCurrentAgentStep] = useState(0);
  const [agentChecklist, setAgentChecklist] = useState([]);
  const [agentStatusText, setAgentStatusText] = useState('');
  const agentAbortControllerRef = useRef(null);
  const messagesBeforeAgentRef = useRef(null);
  const [agentLogs, setAgentLogs] = useState([]);
  const [agentSources, setAgentSources] = useState([]);
  const [showAgentOutlineProgress, setShowAgentOutlineProgress] = useState(false);
  const agentLogsBoxRef = useRef(null);

  useEffect(() => {
    if (agentLogsBoxRef.current) {
      agentLogsBoxRef.current.scrollTop = agentLogsBoxRef.current.scrollHeight;
    }
  }, [agentLogs]);

  // ===== DOCUMENT VERSION CONTROL (UNDO/REDO) =====
  const [docHistory, setDocHistory] = useState([]);
  const [docHistoryIdx, setDocHistoryIdx] = useState(-1);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const MAX_HISTORY = 50;
  const docHistoryRef = useRef([]);
  const docHistoryIdxRef = useRef(-1);

  const pushDocHistory = useCallback((html, action = 'manual edit') => {
    const prev = docHistoryRef.current;
    const curIdx = docHistoryIdxRef.current;
    const sliced = prev.slice(0, curIdx + 1);
    const entry = { html, timestamp: Date.now(), action };
    const next = [...sliced, entry].slice(-MAX_HISTORY);
    docHistoryRef.current = next;
    docHistoryIdxRef.current = next.length - 1;
    setDocHistory(next);
    setDocHistoryIdx(next.length - 1);
  }, []);

  const undoDoc = useCallback(() => {
    const idx = docHistoryIdxRef.current;
    if (idx <= 0) return;
    const newIdx = idx - 1;
    const entry = docHistoryRef.current[newIdx];
    if (entry && pageRef.current) {
      pageRef.current.innerHTML = entry.html;
      docxTextRef.current = entry.html;
      syncDocxContent();
      docHistoryIdxRef.current = newIdx;
      setDocHistoryIdx(newIdx);
    }
  }, [syncDocxContent]);

  const redoDoc = useCallback(() => {
    const idx = docHistoryIdxRef.current;
    const hist = docHistoryRef.current;
    if (idx >= hist.length - 1) return;
    const newIdx = idx + 1;
    const entry = hist[newIdx];
    if (entry && pageRef.current) {
      pageRef.current.innerHTML = entry.html;
      docxTextRef.current = entry.html;
      syncDocxContent();
      docHistoryIdxRef.current = newIdx;
      setDocHistoryIdx(newIdx);
    }
  }, [syncDocxContent]);

  // ===== DIFF ENGINE (VISUAL CHANGE PREVIEW) =====
  const [showDiffPreview, setShowDiffPreview] = useState(false);
  const [diffOldHtml, setDiffOldHtml] = useState('');
  const [diffNewHtml, setDiffNewHtml] = useState('');
  const [diffAction, setDiffAction] = useState('');
  const [diffOldText, setDiffOldText] = useState('');
  const [diffNewText, setDiffNewText] = useState('');

  const htmlToPlainText = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.innerText || div.textContent || '';
  };

  const computeWordDiff = (oldText, newText) => {
    const oldWords = oldText.split(/\s+/).filter(Boolean);
    const newWords = newText.split(/\s+/).filter(Boolean);
    const result = [];
    let oi = 0, ni = 0;
    while (oi < oldWords.length || ni < newWords.length) {
      if (oi < oldWords.length && ni < newWords.length && oldWords[oi] === newWords[ni]) {
        result.push({ type: 'same', text: oldWords[oi] });
        oi++; ni++;
      } else {
        let foundMatch = false;
        for (let lookahead = 1; lookahead <= 5; lookahead++) {
          if (ni + lookahead < newWords.length && oldWords[oi] === newWords[ni + lookahead]) {
            for (let k = 0; k < lookahead; k++) result.push({ type: 'add', text: newWords[ni + k] });
            ni += lookahead;
            foundMatch = true;
            break;
          }
          if (oi + lookahead < oldWords.length && oldWords[oi + lookahead] === newWords[ni]) {
            for (let k = 0; k < lookahead; k++) result.push({ type: 'remove', text: oldWords[oi + k] });
            oi += lookahead;
            foundMatch = true;
            break;
          }
        }
        if (!foundMatch) {
          if (oi < oldWords.length) { result.push({ type: 'remove', text: oldWords[oi] }); oi++; }
          if (ni < newWords.length) { result.push({ type: 'add', text: newWords[ni] }); ni++; }
        }
      }
    }
    return result;
  };

  const showDiffAndConfirm = (oldHtml, newHtml, action) => {
    setDiffOldHtml(oldHtml);
    setDiffNewHtml(newHtml);
    setDiffOldText(htmlToPlainText(oldHtml));
    setDiffNewText(htmlToPlainText(newHtml));
    setDiffAction(action);
    setShowDiffPreview(true);
  };

  const acceptDiff = () => {
    if (pageRef.current) {
      pushDocHistory(pageRef.current.innerHTML, `Before: ${diffAction}`);
      pageRef.current.innerHTML = diffNewHtml;
      docxTextRef.current = diffNewHtml;
      syncDocxContent();
      pushDocHistory(diffNewHtml, diffAction);

      // Add a walkthrough summary of the changes in the chat side panel
      const plainOld = htmlToPlainText(diffOldHtml);
      const plainNew = htmlToPlainText(diffNewHtml);
      
      const wordsAdded = plainNew.split(/\s+/).filter(w => !plainOld.split(/\s+/).includes(w)).length;
      const wordsRemoved = plainOld.split(/\s+/).filter(w => !plainNew.split(/\s+/).includes(w)).length;
      
      const walkthroughMsg = {
        sender: 'ai',
        text: `### 🛠️ Laporan Perubahan Dokumen (Walkthrough)
Perubahan dari perintah **"${diffAction}"** telah berhasil diterapkan ke dokumen:
- 📈 **Kata Baru Ditambahkan**: ~${wordsAdded} kata
- 📉 **Kata Lama Dihapus/Diganti**: ~${wordsRemoved} kata
- 📝 **Status Dokumen**: Berhasil diperbarui dan siap diedit kembali.

Anda dapat membatalkan tindakan ini kapan saja dengan mengetik \`/undo\` atau menekan tombol Undo di toolbar Beranda.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, walkthroughMsg]);
    }
    setShowDiffPreview(false);
    setDiffOldHtml('');
    setDiffNewHtml('');
  };

  const rejectDiff = () => {
    setShowDiffPreview(false);
    setDiffOldHtml('');
    setDiffNewHtml('');
  };

  // ===== SMART TYPO DETECTION ENGINE =====
  const [detectedTypos, setDetectedTypos] = useState([]);
  const [showTypoPanel, setShowTypoPanel] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);

  const fixTypo = useCallback((typoItem) => {
    if (!pageRef.current) return;
    const html = pageRef.current.innerHTML;
    pushDocHistory(html, `Fix typo: ${typoItem.word}`);
    const escapedWord = typoItem.word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(<mark[^>]*>)${escapedWord}(</mark>)`, 'gi');
    const newHtml = html.replace(regex, typoItem.suggestion);
    pageRef.current.innerHTML = newHtml;
    docxTextRef.current = newHtml;
    syncDocxContent();
    setDetectedTypos(prev => prev.filter(t => t.word !== typoItem.word || t.context !== typoItem.context));
  }, [pushDocHistory, syncDocxContent]);

  const fixAllTypos = useCallback(() => {
    if (!pageRef.current || detectedTypos.length === 0) return;
    let html = pageRef.current.innerHTML;
    pushDocHistory(html, 'Fix all typos');
    detectedTypos.forEach(typo => {
      const escapedWord = typo.word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(<mark[^>]*>)${escapedWord}(</mark>)`, 'gi');
      html = html.replace(regex, typo.suggestion);
    });
    pageRef.current.innerHTML = html;
    docxTextRef.current = html;
    syncDocxContent();
    setDetectedTypos([]);
  }, [detectedTypos, pushDocHistory, syncDocxContent]);

  const clearAllTypoHighlights = useCallback(() => {
    if (!pageRef.current) return;
    let html = pageRef.current.innerHTML;
    html = html.replace(/<mark class="typo-highlight"[^>]*>(.*?)<\/mark>/gi, '$1');
    pageRef.current.innerHTML = html;
    docxTextRef.current = html;
    syncDocxContent();
    setDetectedTypos([]);
    setShowTypoPanel(false);
  }, [syncDocxContent]);

  const addAgentLog = (text, type = 'info') => {
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAgentLogs(prev => [...prev, { time, text, type }]);
  };

  const searchWorkspaceAndWeb = async (query) => {
    const results = {
      web: [],
      workspace: []
    };

    if (!query) return results;

    // 1. Search Local Workspace Files (Cloud DB)
    try {
      console.log(`[Agent Search] Searching workspace files for: "${query}"`);
      const response = await fetch('/api/cloud/files', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.files)) {
          const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);
          const matchingFiles = data.files.filter(file => {
            if (file.type === 'folder') return false;
            const fileNameLower = file.name.toLowerCase();
            return keywords.some(kw => fileNameLower.includes(kw));
          });

          for (const file of matchingFiles.slice(0, 3)) {
            try {
              const fileRes = await fetch(`/api/cloud/files/${file.id}`, { credentials: 'include' });
              if (fileRes.ok) {
                const fileData = await fileRes.json();
                if (fileData.success && fileData.file) {
                  let textRepresentation = '';
                  const content = fileData.file.content;
                  if (content) {
                    if (typeof content === 'string') {
                      textRepresentation = content;
                    } else if (Array.isArray(content)) {
                      textRepresentation = JSON.stringify(content);
                    } else if (content.text) {
                      textRepresentation = content.text;
                    } else if (Array.isArray(content.content)) {
                      textRepresentation = content.content.map(c => c.text || '').join(' ');
                    }
                  }

                  results.workspace.push({
                    id: file.id,
                    name: file.name,
                    type: file.type,
                    snippet: textRepresentation.substring(0, 800),
                    url: `file:///workspace/cloud/${file.name}`
                  });
                }
              }
            } catch (e) {
              console.error('[Agent Search] Error fetching workspace file content:', e);
            }
          }
        }
      }
    } catch (err) {
      console.error('[Agent Search] Workspace search failed:', err);
    }

    // 2. Search Web (SerpAPI proxy)
    try {
      console.log(`[Agent Search] Searching web for: "${query}"`);
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { credentials: 'include' });
      if (response.ok) {
        const searchData = await response.json();
        if (searchData.success && searchData.data) {
          const organic = searchData.data.organic_results || [];
          organic.slice(0, 4).forEach((item) => {
            results.web.push({
              title: item.title || 'Untitled Web Page',
              url: item.link || item.url || '',
              snippet: item.snippet || ''
            });
          });
        }
      }
    } catch (err) {
      console.error('[Agent Search] Web search failed:', err);
    }

    return results;
  };

  // ===== SESSION MEMORY & ARTIFACTS =====
  const [artifacts, setArtifacts] = useState(() => {
    try {
      const saved = sessionStorage.getItem('doc_artifacts');
      return saved ? JSON.parse(saved) : [];
    } catch (_e) {
      return [];
    }
  });
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [autoRegenerate, setAutoRegenerate] = useState(false);
  const [isPptGenerating, setIsPptGenerating] = useState(false);
  const [pptGenerationStatus, setPptGenerationStatus] = useState('');
  const [generatedPptFiles, setGeneratedPptFiles] = useState([]);
  const [uploadedPptFile, setUploadedPptFile] = useState(null);
  const [showPptResults, setShowPptResults] = useState(false);
  const [pptTemplate, setPptTemplate] = useState('classic');
  const [previewPptFile, setPreviewPptFile] = useState(null);
  const [previewSlides, setPreviewSlides] = useState([]);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const _editTimerRef = useRef(null);
  const pageRef = useRef(null);
  const aiPanelRef = useRef(null);
  const fileInputRef = useRef(null);
  const pptUploadRef = useRef(null);
  // Refs to track latest state for artifact saving (avoids stale closure issues)
  const contentRef = useRef(content);
  const excelSheetsRef = useRef(excelSheets);
  const docxTablesRef = useRef(docxTables);
  const docxImagesRef = useRef(docxImages);
  const docxChartsRef = useRef(docxCharts);
  const messagesRef = useRef(messages);
  const aiResponseRef = useRef(aiResponse);
  const aiPromptRef = useRef(aiPrompt);
  
  // Keep refs in sync with state
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { excelSheetsRef.current = excelSheets; }, [excelSheets]);
  useEffect(() => { docxTablesRef.current = docxTables; }, [docxTables]);
  useEffect(() => { docxImagesRef.current = docxImages; }, [docxImages]);
  useEffect(() => { docxChartsRef.current = docxCharts; }, [docxCharts]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { aiResponseRef.current = aiResponse; }, [aiResponse]);
  useEffect(() => { aiPromptRef.current = aiPrompt; }, [aiPrompt]);

  // Monitor aiPrompt for slash command triggers
  useEffect(() => {
    if (aiPrompt.startsWith('/')) {
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  }, [aiPrompt]);

  useEffect(() => {
    try {
      localStorage.setItem(`brainstorm_messages_${editorType}`, JSON.stringify(brainstormMessages));
    } catch (e) {
      console.error('Failed to save brainstorm messages to localStorage', e);
    }
  }, [brainstormMessages, editorType]);

  // Auto-scroll brainstorm chat to bottom when messages or open state changes
  useEffect(() => {
    if (showBrainstormChat) {
      const timer = setTimeout(() => {
        const container = document.getElementById('bc-messages-container');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [brainstormMessages, showBrainstormChat]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsDraftMode(true);
      setPageZoom('100%');
    }
  }, []);

  useEffect(() => {
    initializeContent();
    const pendingTopic = localStorage.getItem('pending_agent_topic');
    if (pendingTopic) {
      localStorage.removeItem('pending_agent_topic');
      setTimeout(() => {
        handleStartAgentDrafting(pendingTopic);
      }, 500);
    }
  }, [editorType]);

  useEffect(() => {
    if (editorType === 'docx' && pageRef.current) {
      setTimeout(() => {
        pageRef.current?.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(pageRef.current, 0);
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }, 100);
    }
  }, [editorType]);

  // ===== DRAWING CANVAS UTILITIES =====
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef([]);

  const drawAllPaths = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. Draw completed paths
    drawingPaths.forEach(path => {
      if (path.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (path.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }
      
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    });
    
    // 2. Draw active path in real-time if drawing
    if (isDrawingRef.current && currentPathRef.current.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = toolType === 'eraser' ? '#ffffff' : (toolType === 'highlighter' ? 'rgba(255, 235, 59, 0.45)' : penColor);
      ctx.lineWidth = penWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (toolType === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }
      
      ctx.moveTo(currentPathRef.current[0].x, currentPathRef.current[0].y);
      for (let i = 1; i < currentPathRef.current.length; i++) {
        ctx.lineTo(currentPathRef.current[i].x, currentPathRef.current[i].y);
      }
      ctx.stroke();
    }
    
    ctx.globalCompositeOperation = 'source-over';
  }, [drawingPaths, penColor, penWidth, toolType]);

  // Redraw when canvas sizes or active tab changes
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    const page = pageRef.current;
    if (canvas && page) {
      if (canvas.width !== page.clientWidth || canvas.height !== page.clientHeight) {
        canvas.width = page.clientWidth;
        canvas.height = page.clientHeight;
      }
      drawAllPaths();
    }
  }, [drawingPaths, activeRibbonTab, paperOrientation, paperSize, paperStyle, paperTheme, isDraftMode, pageZoom, isDrawingMode, drawAllPaths]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = drawingCanvasRef.current;
      const page = pageRef.current;
      if (canvas && page) {
        if (canvas.width !== page.clientWidth || canvas.height !== page.clientHeight) {
          canvas.width = page.clientWidth;
          canvas.height = page.clientHeight;
        }
        drawAllPaths();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawAllPaths]);

  const getCanvasCoords = (e) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scale = getZoomScale() || 1;
    
    let clientX = 0;
    let clientY = 0;
    
    // Support mouse and touch events
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale
    };
  };

  const startDrawing = (e) => {
    if (!isDrawingMode) return;
    if (e.cancelable) e.preventDefault();
    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    currentPathRef.current = [coords];
    
    // Draw initial dot immediately
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.fillStyle = toolType === 'eraser' ? '#ffffff' : (toolType === 'highlighter' ? 'rgba(255, 235, 59, 0.45)' : penColor);
      ctx.arc(coords.x, coords.y, penWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    if (e.cancelable) e.preventDefault();
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoords(e);
    
    currentPathRef.current.push(coords);
    
    ctx.beginPath();
    ctx.strokeStyle = toolType === 'eraser' ? '#ffffff' : (toolType === 'highlighter' ? 'rgba(255, 235, 59, 0.45)' : penColor);
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (toolType === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }
    
    const points = currentPathRef.current;
    if (points.length >= 2) {
      ctx.moveTo(points[points.length - 2].x, points[points.length - 2].y);
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentPathRef.current.length > 1) {
      const newPath = {
        tool: toolType,
        color: toolType === 'highlighter' ? 'rgba(255, 235, 59, 0.45)' : penColor,
        width: penWidth,
        points: currentPathRef.current
      };
      setDrawingPaths(prev => [...prev, newPath]);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (documentTitle && (content.length > 0 || excelSheets.length > 0)) handleAutoSave();
    }, 10000);
    return () => clearTimeout(timer);
  }, [content, documentTitle, excelSheets]);

  // Dynamic word and character counting
  useEffect(() => {
    const updateStats = () => {
      const text = pageRef.current?.innerText || '';
      const cleanText = text.trim();
      const words = cleanText ? cleanText.split(/\s+/).filter(w => w.length > 0).length : 0;
      const chars = cleanText.length;
      setWordCount(words);
      setCharCount(chars);
    };
    
    updateStats();
    
    const page = pageRef.current;
    if (page) {
      page.addEventListener('input', updateStats);
      return () => page.removeEventListener('input', updateStats);
    }
  }, [content, editorType]);

  // ===== AUTH STATUS & LOCAL API WRAPPER =====
  const getAuthStatus = () => {
    try {
      const authUser = localStorage.getItem('authUser');
      const guestSession = localStorage.getItem('guestSession');
      if (authUser) {
        const parsed = JSON.parse(authUser);
        return { isAuthenticated: true, isGuest: false, userName: parsed.name || parsed.email || 'User' };
      }
      if (guestSession) {
        const parsed = JSON.parse(guestSession);
        return { isAuthenticated: false, isGuest: true, userName: parsed.name || 'Guest' };
      }
    } catch (e) {
      console.warn('Error reading auth:', e);
    }
    return { isAuthenticated: false, isGuest: true, userName: 'Guest' };
  };

  const callAiService = async (messagePrompt, history = [], abortCtrl = null) => {
    const auth = getAuthStatus();
    return await sendMessageToGrok(
      messagePrompt,
      history,
      'id',                   // language
      null,                   // conversationId
      'formal',               // personality
      abortCtrl,              // abortController
      'deepernova-1.2-flash', // model
      auth.isAuthenticated,   // isAuthenticated
      auth.isGuest,           // isGuest
      auth.userName,          // userName
      0,                      // sessionMessageCount
      []                      // uploadedImages
    );
  };

  const streamAiResponse = async (response, onChunk, abortSignal = null) => {
    if (!response?.body) return '';
    let fullText = '';
    await processStreamingResponse(response, async (chunk) => {
      fullText += chunk;
      if (typeof onChunk === 'function') {
        onChunk(chunk);
      }
    }, abortSignal);
    return fullText;
  };

  const getPageDimensions = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return { width: '100%', minHeight: 'auto' };
    }

    let w = 21; // width in cm
    let h = 29.7; // height in cm
    if (paperSize === 'a4') { w = 21; h = 29.7; }
    else if (paperSize === 'letter') { w = 21.59; h = 27.94; }
    else if (paperSize === 'legal') { w = 21.59; h = 35.56; }
    else if (paperSize === 'a5') { w = 14.8; h = 21; }
    else if (paperSize === 'custom') {
      w = parseFloat(customWidth) || 21;
      h = parseFloat(customHeight) || 29.7;
    }

    if (paperOrientation === 'landscape') {
      return { width: `${h}cm`, minHeight: `${w}cm` };
    }
    return { width: `${w}cm`, minHeight: `${h}cm` };
  };

  const getPageMargin = () => {
    if (isDraftMode) return '16px';
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return '16px';
    }
    if (paperMargin === 'normal') return '2.54cm';
    if (paperMargin === 'narrow') return '1.27cm';
    if (paperMargin === 'wide') return '2.54cm 5.08cm';
    if (paperMargin === 'custom') return `${parseFloat(customMargin) || 2.54}cm`;
    return '2.54cm';
  };

  const getZoomScale = () => {
    if (isDraftMode) return 1;
    if (pageZoom === 'fit') {
      if (typeof window !== 'undefined') {
        const screenWidth = window.innerWidth;
        // Subtract width of all open sidebar panels + padding margin
        let sidebarsWidth = 0;
        if (showAiPanel) sidebarsWidth += 360;
        if (showArtifacts) sidebarsWidth += 300;
        if (showHistoryPanel) sidebarsWidth += 320;
        if (showTypoPanel) sidebarsWidth += 320;
        
        const availableWidth = screenWidth - sidebarsWidth - 60;
        const targetWidth = paperOrientation === 'landscape' ? 1120 : 840;
        
        if (availableWidth < targetWidth) {
          return Math.max(0.35, Math.min(1.0, availableWidth / targetWidth));
        }
      }
      return 1;
    }
    if (pageZoom && pageZoom.endsWith('%')) {
      const val = parseFloat(pageZoom);
      if (!isNaN(val)) return val / 100;
    }
    return 1;
  };

  // ===== INLINE AI AUTOCOMPLETE =====
  const handleAiAutocomplete = async () => {
    if (!pageRef.current) return;
    const currentText = pageRef.current.innerText || '';
    if (!currentText.trim() || currentText.includes('Mulai menulis')) {
      setAiError('Tulis beberapa kata/kalimat terlebih dahulu agar AI bisa melanjutkan.');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress('AI sedang melanjutkan tulisan...');
    setAiError('');

    try {
      const autocompletePrompt = `Berikut adalah kutipan tulisan dalam editor:\n\n"${currentText.slice(-1500)}"\n\nLanjutkan paragraf/kalimat di atas secara logis, alami, dan mengalir dengan gaya penulisan yang sama. Hanya berikan teks lanjutannya saja tanpa mengulangi tulisan di atas dan tanpa penjelasan apa pun.`;
      
      const systemContext = getSystemContext();
      const formattedMessages = [
        { sender: 'system', text: systemContext, timestamp: new Date().toISOString() }
      ];

      const response = await callAiService(autocompletePrompt, formattedMessages);
      let continuation = '';

      if (response?.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6);
                  if (jsonStr === '[DONE]') continue;
                  const json = JSON.parse(jsonStr);
                  if (json.choices?.[0]?.delta?.content) {
                    continuation += json.choices[0].delta.content;
                  }
                } catch {}
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      if (continuation.trim()) {
        const cleaned = cleanAiResponse(continuation);
        const htmlCont = convertMarkdownToHtml(cleaned);
        
        pageRef.current.focus();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          if (pageRef.current.contains(range.startContainer)) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlCont;
            const frag = document.createDocumentFragment();
            let node;
            while ((node = tempDiv.firstChild)) {
              frag.appendChild(node);
            }
            range.insertNode(frag);
            range.collapse(false);
          } else {
            pageRef.current.innerHTML += ' ' + htmlCont;
          }
        } else {
          pageRef.current.innerHTML += ' ' + htmlCont;
        }

        docxTextRef.current = pageRef.current.innerHTML;
        syncDocxContent();
        setGenerationProgress('Selesai!');
        setTimeout(() => setGenerationProgress(''), 1500);
      } else {
        setAiError('AI gagal melanjutkan.');
      }
    } catch (err) {
      setAiError(`Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // ===== MULTI-STEP AI DRAFTING AGENT =====
  const cancelAgent = () => {
    if (agentAbortControllerRef.current) {
      agentAbortControllerRef.current.abort();
    }
    setIsAgentRunning(false);
    setAgentStatusText('Dibatalkan');
    setGenerationProgress('');
  };

  const handleContinueAgent = async (agentState) => {
    if (!agentState) return;
    
    // Clear any previous error and reset agent UI running state
    setAiError('');
    setIsAgentRunning(true);
    setIsGenerating(true);
    setIsStreaming(true);
    
    // Remove the failed agent card from the chat history
    setMessages(prev => prev.filter(msg => !msg.isFailedAgentCard));
    if (messagesRef.current) {
      messagesRef.current = messagesRef.current.filter(msg => !msg.isFailedAgentCard);
    }
    
    const { type, stepIdx, outline, topic, instructions } = agentState;
    
    if (type === 'drafting') {
      addAgentLog(`▶️ Melanjutkan Drafting Agent pada Bab ${stepIdx + 1}: "${outline[stepIdx]}"...`, 'info');
      const abortCtrl = new AbortController();
      agentAbortControllerRef.current = abortCtrl;
      runAgentSteps(stepIdx, outline, topic, abortCtrl);
    } else if (type === 'perbaiki') {
      addAgentLog(`▶️ Melanjutkan Document Repair Agent...`, 'info');
      handleStartDocumentPerbaiki(instructions);
    } else if (type === 'audit') {
      addAgentLog(`▶️ Melanjutkan Smart Audit Agent...`, 'info');
      handleStartDocumentAudit(instructions);
    } else if (type === 'critique') {
      addAgentLog(`▶️ Melanjutkan Document Critique Agent...`, 'info');
      handleStartDocumentCritique(instructions);
    }
  };

  // ===== AGENTIC DAFTAR ISI (TABLE OF CONTENTS) GENERATOR =====
  const generateTableOfContentsHtml = (outlineList = [], docTitle = 'DOKUMEN') => {
    let html = `
<div class="daftar-isi-block" style="margin: 15px 0 30px 0; font-family: 'Times New Roman', Times, serif; color: #0f172a; background: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
  <h2 style="text-align: center; text-transform: uppercase; font-weight: 700; margin-bottom: 24px; font-size: 16pt; letter-spacing: 0.05em; color: #0f172a;">DAFTAR ISI</h2>
  
  <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12pt; line-height: 1.6;">
    <div style="display: flex; justify-content: space-between; align-items: baseline;">
      <span style="font-weight: 700; letter-spacing: 0.02em;">KATA PENGANTAR</span>
      <span style="flex-grow: 1; border-bottom: 1.5px dotted #64748b; margin: 0 10px; height: 1px; min-width: 50px;"></span>
      <span style="font-weight: 600; min-width: 24px; text-align: right;">i</span>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: baseline;">
      <span style="font-weight: 700; letter-spacing: 0.02em;">DAFTAR ISI</span>
      <span style="flex-grow: 1; border-bottom: 1.5px dotted #64748b; margin: 0 10px; height: 1px; min-width: 50px;"></span>
      <span style="font-weight: 600; min-width: 24px; text-align: right;">ii</span>
    </div>
`;

    let pageNum = 1;
    let babCount = 1;
    const romanNums = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

    const validOutline = outlineList.filter(item => item && typeof item === 'string' && !item.toLowerCase().includes('review') && !item.toLowerCase().includes('polish'));
    const itemsToRender = validOutline.length > 0 ? validOutline : ['PENDAHULUAN', 'TINJAUAN PUSTAKA & PEMBAHASAN', 'ANALISIS & METODOLOGI', 'KESIMPULAN & SARAN'];

    itemsToRender.forEach((item) => {
      const rNum = romanNums[babCount - 1] || `${babCount}`;
      const cleanTitle = item.replace(/^(BAB\s+[IVX0-9]+\s*[:\-]?\s*|\d+[\.\s]+)/i, '').trim();

      html += `
    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 8px; font-weight: 700;">
      <span>BAB ${rNum} ${cleanTitle.toUpperCase()}</span>
      <span style="flex-grow: 1; border-bottom: 1.5px dotted #64748b; margin: 0 10px; height: 1px; min-width: 50px;"></span>
      <span style="font-weight: 700; min-width: 24px; text-align: right;">${pageNum}</span>
    </div>
    
    <div style="display: flex; justify-content: space-between; align-items: baseline; padding-left: 24px;">
      <span>${babCount}.1 Latar Belakang & Konteks Pembahasan</span>
      <span style="flex-grow: 1; border-bottom: 1.5px dotted #64748b; margin: 0 10px; height: 1px; min-width: 50px;"></span>
      <span style="min-width: 24px; text-align: right;">${pageNum}</span>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: baseline; padding-left: 24px;">
      <span>${babCount}.2 Rumusan Masalah & Metodologi</span>
      <span style="flex-grow: 1; border-bottom: 1.5px dotted #64748b; margin: 0 10px; height: 1px; min-width: 50px;"></span>
      <span style="min-width: 24px; text-align: right;">${pageNum + 1}</span>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: baseline; padding-left: 24px;">
      <span>${babCount}.3 Analisis Data & Temuan Utama</span>
      <span style="flex-grow: 1; border-bottom: 1.5px dotted #64748b; margin: 0 10px; height: 1px; min-width: 50px;"></span>
      <span style="min-width: 24px; text-align: right;">${pageNum + 2}</span>
    </div>
`;

      pageNum += 3;
      babCount++;
    });

    html += `
    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 10px; font-weight: 700;">
      <span>DAFTAR PUSTAKA</span>
      <span style="flex-grow: 1; border-bottom: 1.5px dotted #64748b; margin: 0 10px; height: 1px; min-width: 50px;"></span>
      <span style="font-weight: 700; min-width: 24px; text-align: right;">${pageNum}</span>
    </div>
  </div>
</div>
<hr style="border: 0; border-top: 1px dashed #cbd5e1; margin: 25px 0;" />
`;

    return html;
  };

  // ===== DYNAMIC REAL-TIME DAFTAR ISI UPDATER =====
  const updateTableOfContentsFromCanvas = () => {
    if (!pageRef.current) return;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = pageRef.current.innerHTML;

    // Strip out any existing TOC block during heading scan
    const existingToc = tempDiv.querySelector('.daftar-isi-block, .table-of-contents-block');
    if (existingToc) existingToc.remove();

    // Extract all actual headings generated in the document
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4');
    const headingEntries = [];

    headings.forEach(h => {
      const text = h.textContent.trim();
      if (!text || text.toUpperCase().includes('DAFTAR ISI')) return;
      const tag = h.tagName.toLowerCase();
      headingEntries.push({ text, level: tag === 'h1' ? 1 : (tag === 'h2' ? 2 : (tag === 'h3' ? 3 : 4)) });
    });

    let tocHtml = `
<div class="daftar-isi-block" style="margin: 15px 0 30px 0; font-family: 'Times New Roman', Times, serif; color: #0f172a; background: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
  <h2 style="text-align: center; text-transform: uppercase; font-weight: 700; margin-bottom: 24px; font-size: 16pt; letter-spacing: 0.05em; color: #0f172a;">DAFTAR ISI</h2>
  
  <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12pt; line-height: 1.6;">
    <div style="display: flex; justify-content: space-between; align-items: baseline;">
      <span style="font-weight: 700; letter-spacing: 0.02em;">KATA PENGANTAR</span>
      <span style="flex-grow: 1; border-bottom: 1.5px dotted #64748b; margin: 0 10px; height: 1px; min-width: 50px;"></span>
      <span style="font-weight: 600; min-width: 24px; text-align: right;">i</span>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: baseline;">
      <span style="font-weight: 700; letter-spacing: 0.02em;">DAFTAR ISI</span>
      <span style="flex-grow: 1; border-bottom: 1.5px dotted #64748b; margin: 0 10px; height: 1px; min-width: 50px;"></span>
      <span style="font-weight: 600; min-width: 24px; text-align: right;">ii</span>
    </div>
`;

    let pageNum = 1;

    if (headingEntries.length > 0) {
      headingEntries.forEach((entry) => {
        const isMainHeader = entry.level === 1 || entry.text.toUpperCase().startsWith('BAB') || entry.text.toUpperCase().startsWith('DAFTAR');
        const paddingLeft = isMainHeader ? '0px' : (entry.level === 3 ? '36px' : '20px');
        const fontWeight = isMainHeader ? '700' : '500';
        const marginTop = isMainHeader ? '10px' : '3px';

        tocHtml += `
    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: ${marginTop}; font-weight: ${fontWeight}; padding-left: ${paddingLeft};">
      <span>${entry.text}</span>
      <span style="flex-grow: 1; border-bottom: 1.5px dotted #64748b; margin: 0 10px; height: 1px; min-width: 50px;"></span>
      <span style="min-width: 24px; text-align: right; font-weight: ${fontWeight};">${pageNum}</span>
    </div>
`;
        if (isMainHeader) pageNum += 2;
      });
    } else {
      tocHtml += `
    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 8px; font-weight: 700;">
      <span>BAB I PENDAHULUAN</span>
      <span style="flex-grow: 1; border-bottom: 1.5px dotted #64748b; margin: 0 10px; height: 1px; min-width: 50px;"></span>
      <span style="font-weight: 700; min-width: 24px; text-align: right;">1</span>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: baseline; padding-left: 20px;">
      <span>1.1 Latar Belakang Masalah</span>
      <span style="flex-grow: 1; border-bottom: 1.5px dotted #64748b; margin: 0 10px; height: 1px; min-width: 50px;"></span>
      <span style="min-width: 24px; text-align: right;">1</span>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: baseline; padding-left: 20px;">
      <span>1.2 Rumusan Masalah & Tujuan</span>
      <span style="flex-grow: 1; border-bottom: 1.5px dotted #64748b; margin: 0 10px; height: 1px; min-width: 50px;"></span>
      <span style="min-width: 24px; text-align: right;">2</span>
    </div>
`;
    }

    tocHtml += `
    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 10px; font-weight: 700;">
      <span>DAFTAR PUSTAKA</span>
      <span style="flex-grow: 1; border-bottom: 1.5px dotted #64748b; margin: 0 10px; height: 1px; min-width: 50px;"></span>
      <span style="font-weight: 700; min-width: 24px; text-align: right;">${pageNum + 1}</span>
    </div>
  </div>
</div>
<hr style="border: 0; border-top: 1px dashed #cbd5e1; margin: 25px 0;" />
`;

    const bodyContent = tempDiv.innerHTML.trim();
    const finalCanvasHtml = tocHtml + bodyContent;

    if (pageRef.current) pageRef.current.innerHTML = finalCanvasHtml;
    docxTextRef.current = finalCanvasHtml;
    setContent([{ id: Date.now(), type: 'html', text: finalCanvasHtml }]);
    syncDocxContent();
  };

  const insertTableOfContentsInteractive = () => {
    updateTableOfContentsFromCanvas();
  };

  const handleStartAgentDrafting = async (promptText) => {
    const topic = promptText || aiPrompt;
    if (!topic.trim()) return;

    // Capture message history before starting
    messagesBeforeAgentRef.current = [...messages];

    setIsAgentRunning(true);
    setCurrentAgentStep(0);
    setAgentOutline([]);
    setAgentChecklist([]);
    setAgentLogs([]);
    setAgentSources([]);
    setAgentStatusText('Membuat kerangka outline...');
    setAiError('');
    setGenerationProgress('Drafting Agent is writing...');

    addAgentLog(`Memulai penyusunan dokumen baru untuk topik: "${topic}"`, 'info');
    addAgentLog('Menganalisis topik dan merancang kerangka outline...', 'info');

    try {
      const abortCtrl = new AbortController();
      agentAbortControllerRef.current = abortCtrl;

      const systemContext = getSystemContext(true);
      const outlinePrompt = `Buatkan kerangka outline terperinci untuk menulis dokumen laporan bisnis/makalah akademik tentang: "${topic}". 
Outline ini harus memiliki 4 sampai 7 sub-bagian (bab) yang mendalam.
Hanya kembalikan outline dengan format baris per baris bernomor persis seperti berikut:
1. [Judul Bab 1]
2. [Judul Bab 2]
3. [Judul Bab 3]
...
Jangan tambahkan kata pengantar, penutup, markdown tebal, asterisks, atau tanda apapun. Langsung kembalikan daftar outlines tersebut.`;

      const formattedMessages = [
        { sender: 'system', text: systemContext, timestamp: new Date().toISOString() }
      ];

      const response = await callAiService(outlinePrompt, formattedMessages, abortCtrl);
      
      let fullOutlineText = '';
      if (response?.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            if (abortCtrl.signal.aborted) throw new Error('Aborted');
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6);
                  if (jsonStr === '[DONE]') continue;
                  const json = JSON.parse(jsonStr);
                  if (json.choices?.[0]?.delta?.content) {
                    fullOutlineText += json.choices[0].delta.content;
                  }
                } catch {}
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      if (abortCtrl.signal.aborted) return;

      const parsedOutline = fullOutlineText
        .split('\n')
        .map(line => line.replace(/^\d+[\.\s\-)]+/, '').replace(/\*\*/g, '').trim())
        .filter(line => line.length > 2 && !line.toLowerCase().includes('outline') && !line.toLowerCase().includes('bab'));

      const finalOutline = parsedOutline.length > 0 ? parsedOutline : ['Pendahuluan', 'Pembahasan Utama', 'Analisis Data', 'Kesimpulan'];
      
      setAgentOutline([...finalOutline, 'Self-Review & Polish']);
      const checklist = [
        ...finalOutline.map(title => ({ title, status: 'pending' })),
        { title: 'Self-Review & Polish Laporan', status: 'pending' }
      ];
      setAgentChecklist(checklist);
      setAgentStatusText('Outline siap. Memuat DAFTAR ISI & menulis bab...');
      
      addAgentLog(`Kerangka dokumen berhasil dibuat dengan ${finalOutline.length} bab. Memulai penyusunan DAFTAR ISI...`, 'success');

      // Generate Table of Contents FIRST before writing chapters!
      const initialTocHtml = generateTableOfContentsHtml(finalOutline, topic);
      setContent([{ id: Date.now(), type: 'html', text: initialTocHtml }]);
      if (pageRef.current) pageRef.current.innerHTML = initialTocHtml;
      docxTextRef.current = initialTocHtml;

      addAgentLog(`📋 DAFTAR ISI resmi dengan garis titik-titik berhasil dipasangkan di halaman utama.`, 'success');

      runAgentSteps(0, finalOutline, topic, abortCtrl);

    } catch (err) {
      console.error(err);
      const errMsg = err.message === 'Aborted' ? 'Penyusunan dibatalkan.' : `Gagal: ${err.message}`;
      setAiError(errMsg);
      addAgentLog(`Terjadi kesalahan: ${errMsg}`, 'error');
      setIsAgentRunning(false);
      setGenerationProgress('');

      if (err.message !== 'Aborted') {
        const failedMsg = {
          role: 'assistant',
          isFailedAgentCard: true,
          agentState: {
            type: 'drafting',
            stepIdx: 0,
            outline: [],
            topic: topic
          },
          content: `Gagal membuat kerangka outline: ${err.message}`
        };
        setMessages(prev => [...prev, failedMsg]);
      }
    }
  };

  const runAgentSteps = async (stepIdx, outline, topic, abortCtrl) => {
    if (stepIdx >= outline.length) {
      updateTableOfContentsFromCanvas();
      setIsAgentRunning(false);
      setAgentStatusText('✅ Selesai! Dokumen lengkap berhasil disusun.');
      setGenerationProgress('');
      addAgentLog('📋 DAFTAR ISI diperbarui secara presisi sesuai seluruh judul bab & sub-bab nyata.', 'success');
      addAgentLog('Semua bab berhasil disusun! Dokumen selesai ditulis.', 'success');
      const finalHtml = pageRef.current?.innerHTML || '';
      saveArtifact(`Drafting Agent: ${topic}`, `Dokumen lengkap tentang ${topic} berhasil disusun secara terpisah bab demi bab.`, [{ id: Date.now(), type: 'html', text: finalHtml }]);

      // Restore chat messages to state before agent was launched (leaving no trace)
      if (messagesBeforeAgentRef.current) {
        setMessages(messagesBeforeAgentRef.current);
        if (messagesRef.current) {
          messagesRef.current = messagesBeforeAgentRef.current;
        }
        messagesBeforeAgentRef.current = null;
      }
      return;
    }

    if (abortCtrl.signal.aborted) return;

    setCurrentAgentStep(stepIdx);
    setAgentChecklist(prev => prev.map((item, idx) => {
      if (idx === stepIdx) return { ...item, status: 'generating' };
      if (idx < stepIdx) return { ...item, status: 'done' };
      return item;
    }));
    
    // If it's the last step: Self-Review & Polish Laporan
    if (stepIdx === outline.length - 1) {
      setAgentStatusText('🧠 Sedang mengevaluasi & merapikan kualitas seluruh dokumen (Self-Review)...');
      addAgentLog('🔬 Memulai Self-Review Pass: Menganalisis flow & ejaan seluruh laporan...', 'info');
      try {
        const fullContent = pageRef.current?.innerHTML || '';
        
        // Parse HTML into nodes
        const parser = new DOMParser();
        const doc = parser.parseFromString(fullContent, 'text/html');
        const nodes = Array.from(doc.body.childNodes);
        
        // Group nodes into chunks (limit ~2000 characters to prevent truncation/summarization)
        const chunks = [];
        let currentChunk = [];
        let currentLen = 0;
        
        nodes.forEach(node => {
          const outerHTML = node.nodeType === Node.ELEMENT_NODE ? node.outerHTML : (node.textContent || '');
          if (currentLen + outerHTML.length > 2000 && currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = [];
            currentLen = 0;
          }
          currentChunk.push(node);
          currentLen += outerHTML.length;
        });
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
        }
        
        addAgentLog(`📦 Dokumen dibagi menjadi ${chunks.length} bagian untuk diproses secara aman.`, 'info');
        
        let finalFullHtml = '';
        const systemContext = getSystemContext(true);
        
        for (let i = 0; i < chunks.length; i++) {
          if (abortCtrl.signal.aborted) throw new Error('Aborted');
          
          const chunkNodes = chunks[i];
          const chunkHtml = chunkNodes.map(node => node.nodeType === Node.ELEMENT_NODE ? node.outerHTML : (node.textContent || '')).join('');
          
          addAgentLog(`🔬 Memoles bagian ${i + 1} dari ${chunks.length}...`, 'info');
          
          const chunkPrompt = `Kamu adalah Agen Editor Dokumen. Tolong rapikan ejaan, tata bahasa, dan kalimat tidak baku pada potongan dokumen HTML berikut.
PENTING: Jangan ringkas konten ini! Jangan buang informasi apa pun! Cukup poles kalimatnya agar profesional dan kembalikan HTML-nya secara utuh.

HTML POTONGAN DOKUMEN:
${chunkHtml}

Aturan Keluaran:
Kembalikan HANYA kode HTML baru yang sudah dipolish di dalam tag [CONTENT_START] dan [CONTENT_END]. Jangan berikan teks penjelasan atau pembuka/penutup lainnya.`;

          const formattedMessages = [
            { sender: 'system', text: systemContext, timestamp: new Date().toISOString() },
            { sender: 'user', text: chunkPrompt, timestamp: new Date().toISOString() }
          ];

          let chunkResult = '';
          const response = await callAiService(chunkPrompt, formattedMessages, abortCtrl);
          if (response?.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            try {
              while (true) {
                if (abortCtrl.signal.aborted) throw new Error('Aborted');
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const jsonStr = line.slice(6);
                      if (jsonStr === '[DONE]') continue;
                      const json = JSON.parse(jsonStr);
                      if (json.choices?.[0]?.delta?.content) {
                        chunkResult += json.choices[0].delta.content;
                      }
                    } catch {}
                  }
                }
              }
            } finally {
              reader.releaseLock();
            }
          }

          if (abortCtrl.signal.aborted) return;

          const cleaned = cleanAiResponse(chunkResult);
          const contentMatch = cleaned.match(/\[CONTENT_START\]([\s\S]*?)\[CONTENT_END\]/);
          const polishedChunkHtml = contentMatch ? contentMatch[1].trim() : cleaned.trim();
          
          // Safety Check: If the polished chunk is too short or empty, keep original to avoid loss
          if (polishedChunkHtml && polishedChunkHtml.length >= chunkHtml.length * 0.6) {
            finalFullHtml += polishedChunkHtml;
            addAgentLog(`✅ Bagian ${i + 1} berhasil dipoles.`, 'success');
          } else {
            finalFullHtml += chunkHtml;
            addAgentLog(`⚠️ Bagian ${i + 1} dipertahankan asli (AI memotong atau memperpendek konten secara tidak wajar).`, 'warning');
          }
        }

        if (finalFullHtml && pageRef.current) {
          pushDocHistory(pageRef.current.innerHTML, 'Before: Self-Review & Polish');
          pageRef.current.innerHTML = finalFullHtml;
          docxTextRef.current = finalFullHtml;
          syncDocxContent();
          updateTableOfContentsFromCanvas();
          pushDocHistory(pageRef.current.innerHTML, 'Self-Review & Polish Complete');
          addAgentLog('✅ Proses poles dokumen selesai dengan aman!', 'success');
        }

        setAgentChecklist(prev => prev.map((item, idx) => {
          if (idx === stepIdx) return { ...item, status: 'done' };
          return item;
        }));

        setTimeout(() => {
          runAgentSteps(stepIdx + 1, outline, topic, abortCtrl);
        }, 500);

      } catch (err) {
        addAgentLog(`⚠️ Gagal saat review pass: ${err.message}`, 'error');
        setAgentChecklist(prev => prev.map((item, idx) => {
          if (idx === stepIdx) return { ...item, status: 'done' };
          return item;
        }));
        setTimeout(() => {
          runAgentSteps(stepIdx + 1, outline, topic, abortCtrl);
        }, 500);
      }
      return;
    }

    const currentSection = outline[stepIdx];
    setAgentStatusText(`Sedang menulis Bab ${stepIdx + 1}/${outline.length}: ${currentSection}...`);
    addAgentLog(`[Bab ${stepIdx + 1}/${outline.length}] Memulai Bab: "${currentSection}"`, 'info');

    // Run Search before writing this section
    const searchQuery = `${topic} ${currentSection}`;
    addAgentLog(`[Bab ${stepIdx + 1}/${outline.length}] 🔍 Mencari referensi di web & file lokal...`, 'search');
    
    let searchRes = { web: [], workspace: [] };
    try {
      searchRes = await searchWorkspaceAndWeb(searchQuery);
    } catch (e) {
      console.error('Search failed during drafting step:', e);
    }

    const foundCount = searchRes.web.length + searchRes.workspace.length;
    if (foundCount > 0) {
      addAgentLog(`[Bab ${stepIdx + 1}/${outline.length}] 📂 Menemukan ${foundCount} referensi relevan (Web: ${searchRes.web.length}, Lokal: ${searchRes.workspace.length})`, 'success');
      
      const newSources = [
        ...searchRes.workspace.map(w => ({ title: `[Lokal] ${w.name}`, url: w.url, type: 'workspace' })),
        ...searchRes.web.map(w => ({ title: w.title, url: w.url, type: 'web' }))
      ];
      setAgentSources(prev => {
        const unique = [...prev];
        newSources.forEach(ns => {
          if (!unique.some(u => u.url === ns.url)) unique.push(ns);
        });
        return unique;
      });
    } else {
      addAgentLog(`[Bab ${stepIdx + 1}/${outline.length}] 📂 Tidak menemukan referensi luar tambahan. Menggunakan pengetahuan internal...`, 'info');
    }

    try {
      let searchContext = '';
      if (searchRes.workspace.length > 0) {
        searchContext += "\n=== REFERENSI DOKUMEN LOKAL ===\n" + searchRes.workspace.map((w, idx) => `[Lokal ${idx+1}] ${w.name}\nURL: ${w.url}\nKutipan: ${w.snippet}`).join('\n\n') + "\n";
      }
      if (searchRes.web.length > 0) {
        searchContext += "\n=== REFERENSI PENCARIAN WEB ===\n" + searchRes.web.map((w, idx) => `[Web ${idx+1}] ${w.title}\nURL: ${w.url}\nKutipan: ${w.snippet}`).join('\n\n') + "\n";
      }

      const sectionPrompt = `Kamu adalah Deepernova AI Agent.
Topik Utama Laporan: "${topic}"

Tulis Bab/Bagian: "${currentSection}"
${searchContext ? `\nINFORMASI REFERENSI YANG DAPAT DIGUNAKAN:\n${searchContext}\n` : ''}
Aturan Menulis:
1. Tulis penjelasan yang sangat lengkap, mendalam, kaya informasi, dan berkualitas tinggi.
2. Panjang tulisan minimal 2-4 paragraf yang berbobot.
3. Gunakan gaya penulisan formal dan terstruktur.
4. Gunakan double newline (\\n\\n) untuk memisahkan paragraf. Jangan gunakan markdown tebal (*) untuk teks biasa.
5. Jangan berikan kata pengantar, langsung tulis konten penjelasan bab tersebut.
${searchContext ? '6. Rujuklah informasi dari REFERENSI di atas secara alami. Jika merujuk ke [Lokal X] atau [Web X], Anda WAJIB mengubahnya menjadi format link HTML miring: <i><a href="URL_REFERENSI" target="_blank" style="color: #ea580c; text-decoration: underline;">[Lokal X]</a></i> atau <i><a href="URL_REFERENSI" target="_blank" style="color: #2563eb; text-decoration: underline;">[Web X]</a></i>. Jangan menulis teks polos saja.' : ''}

Tulis konten untuk Bab "${currentSection}" sekarang:`;

      addAgentLog(`[Bab ${stepIdx + 1}/${outline.length}] ✍️ Menyusun konten Bab...`, 'drafting');

      const systemContext = getSystemContext(true);
      const formattedMessages = [
        { sender: 'system', text: systemContext, timestamp: new Date().toISOString() }
      ];

      const response = await callAiService(sectionPrompt, formattedMessages, abortCtrl);
      
      let sectionContent = '';
      if (response?.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            if (abortCtrl.signal.aborted) throw new Error('Aborted');
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6);
                  if (jsonStr === '[DONE]') continue;
                  const json = JSON.parse(jsonStr);
                  if (json.choices?.[0]?.delta?.content) {
                    const contentDelta = json.choices[0].delta.content;
                    sectionContent += contentDelta;
                    setStreamingContent(prev => prev + contentDelta);
                  }
                } catch {}
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      if (abortCtrl.signal.aborted) return;

      const cleanedContent = cleanAiResponse(sectionContent);
      const pageBreakHtml = '<hr class="page-break" style="border: none; border-top: 2px dashed #106ebe; margin: 20px 0; text-align: center; color: #106ebe; font-size: 11px; user-select: none;" contenteditable="false" data-label="--- Batas Halaman (Page Break) ---" />';
      const sectionHtml = (stepIdx > 0 ? pageBreakHtml : '') + `<h2>${currentSection}</h2>` + convertMarkdownToHtml(cleanedContent) + '<br/><br/>';
      
      if (pageRef.current) {
        if (stepIdx === 0) {
          pageRef.current.innerHTML = sectionHtml;
        } else {
          pageRef.current.innerHTML += sectionHtml;
        }
        docxTextRef.current = pageRef.current.innerHTML;
        syncDocxContent();
      }

      addAgentLog(`[Bab ${stepIdx + 1}/${outline.length}] ✅ Selesai menyusun Bab: "${currentSection}"`, 'success');
      setStreamingContent('');

      setAgentChecklist(prev => prev.map((item, idx) => {
        if (idx === stepIdx) return { ...item, status: 'done' };
        return item;
      }));

      setTimeout(() => {
        runAgentSteps(stepIdx + 1, outline, topic, abortCtrl);
      }, 500);

    } catch (err) {
      console.error(err);
      if (err.message === 'Aborted') {
        setAiError('Penyusunan dibatalkan.');
        addAgentLog(`[Bab ${stepIdx + 1}/${outline.length}] ❌ Penyusunan dibatalkan.`, 'error');
      } else {
        const errMsg = `Gagal pada bab ${currentSection}: ${err.message}`;
        setAiError(errMsg);
        addAgentLog(`[Bab ${stepIdx + 1}/${outline.length}] ❌ ${errMsg}`, 'error');

        // Append Failed Agent Card to Chat
        const failedMsg = {
          role: 'assistant',
          isFailedAgentCard: true,
          agentState: {
            type: 'drafting',
            stepIdx: stepIdx,
            outline: outline,
            topic: topic
          },
          content: `Gagal menyusun Bab "${currentSection}": ${err.message}`
        };
        setMessages(prev => [...prev, failedMsg]);
      }
      setIsAgentRunning(false);
      setGenerationProgress('');
    }
  };

  useEffect(() => {
    return () => clearTimeout(_editTimerRef.current);
  }, []);

  const initializeContent = () => {
    switch (editorType) {
      case 'docx':
        setContent([{ id: Date.now(), type: 'html', text: '' }]);
        docxTextRef.current = '';
        break;
      case 'pptx':
        setContent([{ id: Date.now(), type: 'slide', title: 'Slide 1', content: 'Konten slide di sini', notes: '' }]);
        break;
      case 'excel':
        // Default: 20 rows x 10 cols full empty grid like real Excel
        setExcelSheets([createSheet('Sheet1', 20, 10)]);
        setActiveSheet(0);
        setSelectedCell(null);
        setContent([]);
        break;
      default:
        setContent([]);
    }
  };

  // ===== ADVANCED EXCEL PARSING - Smart Table Detection =====
  const parseExcelContent = useCallback((text) => {
    if (!text || typeof text !== 'string') return null;
    
    // Try JSON first
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        const sheets = parsed.map(s => {
          const data = (s.data || []).map(row =>
            Array.isArray(row) ? row.map(cell =>
              typeof cell === 'object' && cell !== null
                ? createCell(cell.value, cell.format)
                : createCell(String(cell ?? ''))
            ) : [createCell(String(row ?? ''))]
          );
          const cols = Math.max(...data.map(r => r.length), 1);
          return {
            name: s.name || 'Sheet',
            data: data.map(r => { while (r.length < cols) r.push(createCell('')); return r; }),
            merges: s.merges || [],
            colWidths: s.colWidths || Array(cols).fill(100),
            rowHeights: s.rowHeights || Array(data.length || 1).fill(32),
            isTable: s.isTable !== false,
          };
        });
        if (sheets.length) return { type: 'multi_sheet', sheets };
      }
      if (parsed.data && Array.isArray(parsed.data)) {
        const data = parsed.data.map(row =>
          Array.isArray(row) ? row.map(cell =>
            typeof cell === 'object' && cell !== null
              ? createCell(cell.value, cell.format)
              : createCell(String(cell ?? ''))
          ) : [createCell(String(row ?? ''))]
        );
        const cols = Math.max(...data.map(r => r.length), 1);
        return {
          type: 'single_sheet', name: parsed.name || 'Sheet1',
          data: data.map(r => { while (r.length < cols) r.push(createCell('')); return r; }),
          merges: parsed.merges || [],
          colWidths: parsed.colWidths || Array(cols).fill(100),
          isTable: parsed.isTable !== false,
        };
      }
    } catch (_e) {
      // not JSON
    }
    
    // Smart text parsing: detect tables vs regular text
    const lines = text.split('\n');
    const nonEmptyLines = lines.filter(l => l.trim());
    
    // Detect table: lines with | separator, at least 2 rows
    const tableLines = [];
    const textLines = [];
    let inTable = false;
    
    for (const line of nonEmptyLines) {
      const hasPipe = line.includes('|') && line.trim().split('|').length > 1;
      if (hasPipe) {
        inTable = true;
        tableLines.push(line);
      } else {
        if (inTable) {
          // Check if this line could be a continuation of table
          const couldBeTable = line.split(/\s{2,}|\t/).length > 2;
          if (couldBeTable) {
            tableLines.push(line);
          } else {
            inTable = false;
            textLines.push(line);
          }
        } else {
          textLines.push(line);
        }
      }
    }
    
    // If we have a proper table (2+ rows with pipes)
    if (tableLines.length >= 2) {
      const data = tableLines.map(row => row.split('|').map(c => createCell(c.trim())));
      const maxCols = Math.max(...data.map(r => r.length));
      const padded = data.map(r => { while (r.length < maxCols) r.push(createCell('')); return r; });
      
      // Apply thick borders to create proper table outline
      padded.forEach((row, ri) => {
        row.forEach((cell, ci) => {
          cell.format.borderTop = ri === 0 ? '2px solid #333' : '1px solid #d0d0d0';
          cell.format.borderBottom = ri === padded.length - 1 ? '2px solid #333' : '1px solid #d0d0d0';
          cell.format.borderLeft = ci === 0 ? '2px solid #333' : '1px solid #d0d0d0';
          cell.format.borderRight = ci === maxCols - 1 ? '2px solid #333' : '1px solid #d0d0d0';
          if (ri === 0) {
            cell.format.bold = true;
            cell.format.fillColor = '#f0f0f0';
          }
        });
      });
      
      return {
        type: 'single_sheet',
        name: 'Sheet1',
        data: padded,
        isTable: true,
        textBefore: textLines.filter(l => l.trim()).join('\n'),
      };
    }
    
    // Try tab/comma separated
    const hasTabs = nonEmptyLines.some(l => l.includes('\t'));
    const hasCommas = nonEmptyLines.some(l => l.includes(',') && !l.includes('|'));
    if (hasTabs || hasCommas) {
      const sep = hasTabs ? '\t' : ',';
      const data = nonEmptyLines.map(row =>
        row.split(sep).map(c => createCell(c.trim().replace(/^"|"$/g, '')))
      );
      const maxCols = Math.max(...data.map(r => r.length));
      const padded = data.map(r => { while (r.length < maxCols) r.push(createCell('')); return r; });
      return { type: 'single_sheet', name: 'Sheet1', data: padded, isTable: true };
    }
    
    // Single column data
    const data = nonEmptyLines.map(l => [createCell(l.trim())]);
    return data.length ? { type: 'single_sheet', name: 'Sheet1', data, isTable: false } : null;
  }, []);

  // ===== SESSION MEMORY: Save/Load Artifacts (Supercharged) =====
  // Uses REFS to always get the LATEST state (avoids stale closure issues)
  const saveArtifact = useCallback((prompt, response, overrideContent, overrideSheets) => {
    // Use refs for latest state, or override values if provided
    const latestContent = overrideContent || contentRef.current;
    const latestSheets = overrideSheets || excelSheetsRef.current;
    const latestMessages = messagesRef.current;
    const latestResponse = response || aiResponseRef.current;
    const latestPrompt = prompt || aiPromptRef.current;
    
    const newArtifact = {
      id: Date.now(),
      prompt: latestPrompt,
      response: latestResponse,
      type: editorType,
      title: documentTitle,
      timestamp: new Date().toISOString(),
      // Save ALL document state from refs (always latest)
      content: JSON.parse(JSON.stringify(latestContent)),
      excelSheets: editorType === 'excel' ? JSON.parse(JSON.stringify(latestSheets)) : null,
      activeSheet: editorType === 'excel' ? activeSheet : null,
      docxTables: editorType === 'docx' ? JSON.parse(JSON.stringify(docxTablesRef.current)) : null,
      docxImages: editorType === 'docx' ? JSON.parse(JSON.stringify(docxImagesRef.current)) : null,
      docxHeader: editorType === 'docx' ? docxHeader : null,
      docxFooter: editorType === 'docx' ? docxFooter : null,
      showPageNumbers: editorType === 'docx' ? showPageNumbers : null,
      // Save font/formatting state
      fontSize,
      fontFamily,
      textColor,
      // Save conversation context from refs
      messages: JSON.parse(JSON.stringify(latestMessages)),
      // Save last AI interaction
      lastPrompt: latestPrompt,
      lastResponse: latestResponse,
    };
    const updated = [newArtifact, ...artifacts].slice(0, 50);
    setArtifacts(updated);
    try { sessionStorage.setItem('doc_artifacts', JSON.stringify(updated)); } catch {}
    return newArtifact;
  }, [artifacts, editorType, documentTitle, activeSheet,
      docxHeader, docxFooter, showPageNumbers,
      fontSize, fontFamily, textColor]);

  const loadArtifact = useCallback((artifact) => {
    setSelectedArtifact(artifact);
    // Restore all document state
    if (artifact.content) {
      setContent(artifact.content);
      if (artifact.type === 'docx') {
        docxTextRef.current = artifact.content[0]?.text || '';
      }
    }
    if (artifact.excelSheets) setExcelSheets(artifact.excelSheets);
    if (artifact.activeSheet !== undefined) setActiveSheet(artifact.activeSheet);
    if (artifact.title) setDocumentTitle(artifact.title);
    if (artifact.type) setEditorType(artifact.type);
    if (artifact.docxTables) setDocxTables(artifact.docxTables);
    if (artifact.docxImages) setDocxImages(artifact.docxImages);
    if (artifact.docxHeader !== undefined) setDocxHeader(artifact.docxHeader);
    if (artifact.docxFooter !== undefined) setDocxFooter(artifact.docxFooter);
    if (artifact.showPageNumbers !== undefined) setShowPageNumbers(artifact.showPageNumbers);
    if (artifact.fontSize) setFontSize(artifact.fontSize);
    if (artifact.fontFamily) setFontFamily(artifact.fontFamily);
    if (artifact.textColor) setTextColor(artifact.textColor);
    if (artifact.messages) setMessages(artifact.messages);
    // Restore last AI interaction
    if (artifact.lastResponse) setAiResponse(artifact.lastResponse);
    setShowArtifacts(false);
  }, []);

  const deleteArtifact = useCallback((id) => {
    const updated = artifacts.filter(a => a.id !== id);
    setArtifacts(updated);
    try { sessionStorage.setItem('doc_artifacts', JSON.stringify(updated)); } catch (_e) {
      // ignore
    }
  }, [artifacts]);

  // ===== AUTO-REGENERATE ON EDIT =====
  const _triggerAutoRegenerate = useCallback((editContent) => {
    if (!autoRegenerate || !editContent.trim()) return;
    // Clear current content and regenerate
    setContent([]);
    setAiPrompt(`Revisi dokumen ini dengan lebih baik:\n\n${editContent}`);
    // Auto-trigger AI after short delay
    setTimeout(() => {
      if (aiPrompt.trim()) handleAiWrite();
    }, 500);
  }, [autoRegenerate]);

  // ===== SUPER AI SYSTEM CONTEXT - Master of ALL Tools =====
  // AI understands every tool deeply and can manipulate DOCX, PPTX, Excel with precision
  const getSystemContext = (isAgent = false) => {
    // Build full document context with ALL current state
    let docContext = '';
    
    if (editorType === 'docx') {
      const liveHtml = pageRef.current ? pageRef.current.innerHTML : (content[0]?.text || '');
      const liveText = pageRef.current ? pageRef.current.innerText : '';
      docContext = (liveHtml && liveHtml.trim()) ? `\n\n=== REAL-TIME CANVAS DOCUMENT CONTEXT (DIBELAKANG LAYAR) ===\n[HTML Format]:\n${liveHtml}\n\n[Text Format]:\n${liveText}\n=== END CANVAS CONTEXT ===\n` : '\n\n=== REAL-TIME CANVAS DOCUMENT CONTEXT ===\n(Kanvas dokumen saat ini masih kosong)\n=== END CANVAS CONTEXT ===\n';
      if (uploadedFileText) {
        docContext += `\n\n=== CONTEXT FROM UPLOADED FILE (${uploadedFileName}) ===\n${uploadedFileText}\n=== END UPLOADED FILE ===\n`;
      }
    } else if (editorType === 'excel') {
      // Show ALL sheets context
      docContext += `\n=== ALL SHEETS (${excelSheets.length} total) ===\n`;
      excelSheets.forEach((sheet) => {
        const rows = sheet.data.map((r) => 
          r.map((c) => c.value).join('\t')
        ).join('\n');
        docContext += `\n--- Sheet: ${sheet.name} (${sheet.data.length}R x ${Math.max(...sheet.data.map(r => r.length), 1)}C) ---\n`;
        docContext += rows ? rows + '\n' : '(empty)\n';
      });
      docContext += '=== END ALL SHEETS ===\n';
      docContext += `\nActive sheet: ${excelSheets[activeSheet]?.name || 'Sheet1'}\n`;
      
    } else if (editorType === 'pptx') {
      const slides = Array.isArray(content) ? content.map((s, i) => 
        `Slide ${i + 1}: "${s.title}"\n${s.content}`
      ).join('\n---\n') : '';
      docContext = slides ? `\n=== CURRENT SLIDES ===\n${slides}\n=== END SLIDES ===\n` : '';
    }

    // ===== SUPER SYSTEM CONTEXT: 100% FULLY AUTONOMOUS AGENTIC PROTOCOL =====
    const masterContext = `Kamu adalah DEEPERNOVA AI AGENT MASTER — Asisten Agentic Otonom Tingkat Tinggi untuk DOCX (Word), PPTX (PowerPoint), dan XLSX (Excel).
Kamu bekerja secara 100% AGENTIC & OTONOM. Kamu tidak perlu bertanya hal-hal sepele, kamu LANGSUNG MENGAMBIL KEPUTUSAN TERBAIK (AGENTIC DECISION MAKING) dalam menyusun dokumen, memosisikan foto, memilih jenis grafik/kurva, serta memformat layout kanvas.

PROTOKOL AGENTIC OTONOM (100% FULLY AGENTIC PROTOCOL):
0. AKSES LANGSUNG KANVAS REAL-TIME (DIBELAKANG LAYAR):
   - Setiap kali pengguna chat, kamu SECARA OTOMATIS membaca seluruh isi kanvas dokumen ('pageRef.current') yang ada dibelakang layar secara real-time.
   - Gunakan konteks kanvas real-time ini untuk menjawab obrolan, merevisi bagian tertentu, atau menambah konten baru secara presisi tanpa merusak bagian dokumen yang sudah ditulis sebelumnya.
1. AGENTIC PHOTO & IMAGE PLACEMENT:
   - Kamu secara otonom menentukan posisi terbaik untuk foto yang diunggah berdasarkan alur dokumen.
   - Pilihlah posisi yang paling estetis:
     - [IMAGE_PLACE: align="center", width="75%", caption="...", target_heading="Subjudul"] untuk foto lanskap / gambar utama.
     - [IMAGE_PLACE: align="float-right", width="35%", caption="...", target_heading="Pendahuluan"] untuk foto potret agar teks mengalir indah di sekeliling gambar.
     - [IMAGE_PLACE: align="float-left", width="35%", caption="..."] untuk ilustrasi samping.
2. AGENTIC CHART & CURVE DECISION ENGINE:
   - Kamu secara otonom mendeteksi kebutuhan visualisasi data. Jika ada angka, statistik, tren, atau persentase, KAMU WAJIB MEMILIH JENIS GRAFIK YANG PAS:
     - Tipe Pie: [CHART: type="pie", title="...", labels="A,B,C", values="40,30,30"] -> untuk persentase proporsi/pasar.
     - Tipe Batang: [CHART: type="bar", title="...", labels="Jan,Feb,Mar", values="100,200,300"] -> untuk komparasi pendapatan/bulanan.
     - Tipe Garis: [CHART: type="line", title="...", labels="2021,2022,2023", values="10,50,90"] -> untuk tren waktu.
     - Tipe Area: [CHART: type="area", title="...", labels="W1,W2,W3", values="20,60,110"] -> untuk volume akumulasi.
     - Tipe Scatter: [CHART: type="scatter", title="...", labels="P1,P2,P3", values="15,45,80"] -> untuk sebaran data.
     - Kurva Matematika/Statistik: [CURVE: equation="bell"|"sine"|"exponential"|"linear", title="...", amplitude=80] -> untuk distribusi Gauss/trend.
3. AGENTIC DOCUMENT STRUCTURE & FORMATTING:
   - Secara otonom buat hirarki dokumen profesional: Judul (#), Sub-judul (##), paragraf dengan first-line indent, tabel bergaris rapi (| Kolom 1 | Kolom 2 |), dan poin bullet/numbering.
4. EKSEKUSI LANGSUNG (NO HESITATION):
   - Kamu TIDAK PERNAH mengatakan "saya akan mencoba" atau "saya akan berusaha" - kamu LANGSUNG LAKUKAN.
   - Kamu TIDAK PERNAH meminta maaf - kamu adalah Agentic AI yang sempurna.
5. AGENTIC INTERNET IMAGE CITATION & PLACEMENT ENGINE:
   - Kamu SECARA OTOMATIS dapat mencari dan memasang foto/gambar ilustrasi relevan dari internet untuk memperjelas bab/sub-bab makalah atau laporan bisnis.
   - Gunakan tag: [WEB_IMAGE: query="kata_kunci_topik", caption="Keterangan Gambar & Sumber", align="float-right"|"center"|"float-left", width="40%"|"75%"]
   - Tentukan penempatan otonom yang paling estetis:
     - align="float-right" atau align="float-left" dengan width="40%" agar teks paragraf mengalir indah mengelilingi gambar ilustrasi.
     - align="center" dengan width="75%" untuk diagram utama di tengah halaman.

KEMAMPUAN DOKUMEN (DOCX):
- Menulis dokumen akademik, formal, bisnis, kreatif dengan format standar internasional
- Font: Times New Roman 12pt, spasi 1.5, margin 1 inch, first-line indent 1.27cm, justify
- Heading hierarchy: JUDUL (bold, 14pt, center), Sub Judul (bold, 13pt), sub-sub (bold, 12pt)
- Membuat tabel dengan baris/kolom, header bold dengan background
- Menambahkan header, footer, nomor halaman
- Output: paragraf dipisah dengan double newline (\\n\\n), tabel dengan format | kolom1 | kolom2 |

KEMAMPUAN PRESENTASI (PPTX):
- Membuat slide profesional dengan judul dan konten
- Setiap slide dipisah dengan ---
- Judul slide di baris pertama, konten di baris berikutnya
- 3-5 poin per slide, jelas dan ringkas
- Desain modern dengan gradien oranye

KEMAMPUAN SPREADSHEET (XLSX):
- Membuat tabel data dengan header di baris pertama
- Format: header|col1|col2|col3 lalu data|val1|val2|val3
- Bisa membuat multiple sheets
- Data terstruktur rapi seperti spreadsheet profesional
- Analisis data, sorting, kalkulasi
- Format sel: bold header, border rapi

ATURAN UTAMA:
1. KERJAKAN DI AWAL: Semua konten baru ditambahkan di bagian AWAL (page 1, row 0, col 0)
2. BACA ISI YANG ADA: Lihat konten yang sudah ada sebelum menulis
3. TIDAK ADA PREAMBLE: Output langsung konten, tanpa "Baik saya akan..." atau intro apapun
4. TIDAK ADA MARKDOWN: Jangan gunakan markdown formatting
5. KONTEKS PERCAKAPAN: Ingat semua pesan sebelumnya. Jika user minta revisi, lihat konten yang sudah ada lalu perbaiki
6. KUALITAS TINGGI: Konten harus profesional, akademik, dan berkualitas
7. ${isAgent ? 'Kamu adalah agen eksekutor/penulis yang sedang menulis konten nyata ke dokumen. Kamu WAJIB menghasilkan isi teks final yang lengkap dan utuh secara langsung. JANGAN menuliskan tag [REQUEST_DOCUMENT], [SEARCH_REQUEST], atau [IMAGE_REQUEST] karena konten yang kamu hasilkan akan langsung ditempelkan ke halaman dokumen.' : 'JIKA USER MEMINTA MEMBUAT MAKALAH, LAPORAN, DOKUMEN, ARTIKEL, FILE, SLIDE, ATAU SPREADSHEET, JANGAN LANGSUNG MENULIS ISI LENGKAP DI CHAT. BALAS SINGKAT DAN KIRIM FLAG [REQUEST_DOCUMENT: <topik atau instruksi>] AGAR FRONTEND BISA MEMICU EKSEKUSI SETELAH USER MENYETUJUI.'}${docContext}`;

    return masterContext;
  };

  const renderAssistantMessage = (text) => {
    if (!text) return '…';

    const specialRegex = /\[(REQUEST|REQUEST_DOCUMENT|REQUEST_FILE|EXECUTE|IMAGE_PLACE|CHART|CURVE):\s*(.*?)\]/gi;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = specialRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const kind = match[1].toUpperCase();
      const payload = match[2]?.trim();
      parts.push(
        <div key={match.index} style={{ margin: '10px 0', padding: '12px', background: 'rgba(255,107,0,0.06)', border: '1.2px dashed var(--orange)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
            {kind === 'IMAGE_PLACE' ? '🖼️ Penempatan Foto / Gambar AI Siap' : kind === 'CHART' || kind === 'CURVE' ? '📊 Grafik/Kurva AI Siap' : 'AI Siap Menulis ke Canvas'}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b', textAlign: 'center' }}>{payload || text.slice(0, 80)}</span>
          <button
            type="button"
            onClick={() => {
              insertAiContent(text);
            }}
            className="action-button send-mode"
            style={{ fontSize: '11px', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #ff6b00 0%, #ea580c 100%)', color: '#fff', fontWeight: 700, boxShadow: '0 2px 6px rgba(255,107,0,0.25)' }}
          >
            <i className="fas fa-plus-circle"></i> Sisipkan Foto / Konten Ke Canvas
          </button>
        </div>
      );

      lastIndex = specialRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return (
      <div className="assistant-message-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {parts.map((part, index) => {
          if (typeof part === 'string') {
            return (
              <ReactMarkdown
                key={index}
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({children}) => <p className="bc-md-p">{children}</p>,
                  strong: ({children}) => <strong className="bc-md-bold">{children}</strong>,
                  em: ({children}) => <em>{children}</em>,
                  ul: ({children}) => <ul className="bc-md-ul">{children}</ul>,
                  ol: ({children}) => <ol className="bc-md-ol">{children}</ol>,
                  li: ({children}) => <li className="bc-md-li">{children}</li>,
                  code: ({inline, children}) => inline
                    ? <code className="bc-md-code-inline">{children}</code>
                    : <pre className="bc-md-code-block"><code>{children}</code></pre>,
                  h1: ({children}) => <div className="bc-md-h1">{children}</div>,
                  h2: ({children}) => <div className="bc-md-h2">{children}</div>,
                  h3: ({children}) => <div className="bc-md-h3">{children}</div>,
                }}
              >
                {part}
              </ReactMarkdown>
            );
          }
          return part;
        })}

        {/* Quick Insert to Canvas Button */}
        <button 
          type="button"
          onClick={() => insertAiContent(text)}
          style={{ alignSelf: 'flex-start', background: '#fff', border: '1px solid #ff6b00', color: '#ff6b00', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s ease' }}
          title="Masukkan konten ini langsung ke kanvas dokumen"
        >
          📌 Sisipkan Ke Canvas Dokumen
        </button>
      </div>
    );
  };

  // ===== BRAINSTORM FLOATING CHAT =====
  const openBrainstormChat = (starterPrompt = null) => {
    setShowBrainstormChat(true);
    if (starterPrompt) {
      // Auto-send the starter question
      setTimeout(() => handleBrainstormSend(starterPrompt), 100);
    }
  };

  const handleBrainstormSend = async (overrideMessage = null) => {
    const msg = overrideMessage || brainstormInput.trim();
    if (!msg || isBrainstormLoading) return;

    const isWriteCommand = msg.trim().startsWith('/buat') || msg.trim().startsWith('/write') || msg.trim().startsWith('/draft');
    if (isWriteCommand) {
      const parts = msg.trim().split(' ');
      const instructions = parts.slice(1).join(' ').trim();
      
      const userMsg = { role: 'user', text: msg };
      setBrainstormMessages(prev => [...prev, userMsg]);
      setBrainstormInput('');
      
      setShowBrainstormChat(false);
      setShowAiPanel(true);
      handleBrainstormWriteToDocument(instructions || 'buat dokumen lengkap');
      return;
    }

    const userMsg = { role: 'user', text: msg };
    setBrainstormInput('');
    setIsBrainstormLoading(true);
    setBrainstormMessages(prev => [...prev, userMsg, { role: 'assistant', text: '' }]);

    try {
      // Get current editor content dynamically based on type
      let currentEditorContext = '';
      if (editorType === 'docx' && pageRef.current) {
        currentEditorContext = pageRef.current.innerText || '';
      } else if (editorType === 'excel') {
        const activeSheetData = excelSheets[activeSheet]?.data || [];
        currentEditorContext = activeSheetData.map(row => row.map(c => c.value).join('\t')).join('\n');
      } else if (editorType === 'pptx') {
        currentEditorContext = content.map(slide => `Title: ${slide.title}\nContent: ${slide.content}`).join('\n\n');
      }

      const docContext = currentEditorContext.trim() 
        ? `\n\n[KONTEKS DOKUMEN EDIT SAAT INI]:\n${currentEditorContext.slice(0, 4000)}\n---` 
        : '';

      const fileContext = uploadedFileText
        ? `\n\n[KONTEKS FILE UPLOADED - "${uploadedFileName}"]: \n${uploadedFileText.slice(0, 4000)}\n---`
        : '';

      const systemPrompt = `Kamu adalah Brainstorm AI partner. Kamu sedang mengobrol di jendela melayang di atas editor dokumen untuk berdiskusi, bertukar ide, dan merencanakan draf sebelum ditulis ke dokumen.
Kamu memiliki akses ke isi dokumen saat ini dan file yang diunggah.

PENTING:
1. Kamu adalah asisten chat diskusi (brainstorming). Mengobrollah secara alami dan interaktif seperti manusia. Jangan langsung menulis draf dokumen panjang atau kode HTML di sini kecuali diminta secara eksplisit.
2. Gunakan Markdown standar (*bold*, # header, - bullet) untuk memformat chatmu. JANGAN PERNAH menghasilkan tag HTML mentah seperti <h1>, <p>, <ul>, dll.
3. Ingat, kamu adalah partner chatting untuk berdiskusi secara santai dan cerdas. Dengarkan pengguna, tanyakan detail, dan matangkan ide bersama pengguna terlebih dahulu.

ATURAN REKOMENDASI AGENT:
Jika kamu merasa pengguna ingin atau sebaiknya menulis laporan/makalah/artikel baru menggunakan agen penulis otomatis (Word Agent) kami, kamu WAJIB memberikan opsi/tombol pelatuk dengan cara menuliskan tag '[RUN_AGENT: Nama Topik]' di bagian bawah pesanmu.
Contoh:
"Saya menyarankan kita membuat tulisan baru tentang Sejarah Fisika Kuantum. Klik tombol di bawah untuk meminta Agen menyusunnya bab-demi-bab:
[RUN_AGENT: Sejarah Fisika Kuantum]"

Ingat, format '[RUN_AGENT: Topik]' ini sangat krusial agar UI bisa memunculkan tombol pelatuk agen secara visual.`;

      // Build conversation history in the format sendMessageToGrok expects
      const historyForGrok = [
        { sender: 'system', text: systemPrompt },
        ...brainstormMessages.map(m => ({
          sender: m.role === 'user' ? 'user' : 'ai',
          text: m.text,
        }))
      ];

      // Full message with context injected
      const fullMsg = `${docContext}${fileContext}\n\nPertanyaan: ${msg}`;

      const abortCtrl = new AbortController();
      const auth = getAuthStatus();
      const response = await sendMessageToGrok(
        fullMsg,
        historyForGrok,
        'id',            // language
        null,            // conversationId
        'formal',        // personality
        abortCtrl,       // abortController
        'deepernova-1.2-flash', // model
        auth.isAuthenticated,   // isAuthenticated
        auth.isGuest,           // isGuest
        auth.userName,          // userName
        0,                      // sessionMessageCount
        [],                      // uploadedImages
      );

      // Process SSE stream — append each chunk to the last assistant bubble
      await processStreamingResponse(
        response,
        (chunk) => {
          setBrainstormMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = { role: 'assistant', text: last.text + chunk };
            }
            return updated;
          });
        },
        abortCtrl.signal
      );

      setBrainstormMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant' && !last.text.trim()) {
          updated[updated.length - 1] = {
            role: 'assistant',
            text: '❌ Respon AI tidak diterima. Silakan coba lagi atau periksa koneksi Anda.'
          };
        }
        return updated;
      });
    } catch (err) {
      console.error('[handleBrainstormSend]', err);
      setBrainstormMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant' && last.text === '') {
          updated[updated.length - 1] = { role: 'assistant', text: `❌ Gagal: ${err.message}` };
        } else {
          updated.push({ role: 'assistant', text: `❌ Gagal: ${err.message}` });
        }
        return updated;
      });
    } finally {
      setIsBrainstormLoading(false);
    }
  };

  const handlePhotoUploadDirect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFile(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (typeof dataUrl === 'string') {
        setImgDataUrl(dataUrl);
        setUploadedFileName(file.name);
        setUploadedFileType('image');
        setUploadedFileText(`[Foto Terlampir: ${file.name}]`);
        setAiPrompt(`Saya mengunggah foto "${file.name}". Tolong posisikan foto ini di kanvas dokumen dengan rapi.`);
      }
      setIsUploadingFile(false);
      setShowUploadMenu(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDocUploader = async (e) => {
    setShowUploadMenu(false);
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    setAiError('');

    const ext = file.name.split('.').pop().toLowerCase();
    const name = file.name;

    try {
      // ── DOCX: use mammoth with rich style map ──
      if (ext === 'docx' || ext === 'doc') {
        const arrayBuffer = await file.arrayBuffer();

        const styleMap = [
          "p[style-name='Heading 1'] => h1.doc-h1:fresh",
          "p[style-name='Heading 2'] => h2.doc-h2:fresh",
          "p[style-name='Heading 3'] => h3.doc-h3:fresh",
          "p[style-name='Heading 4'] => h4.doc-h4:fresh",
          "p[style-name='Title'] => h1.doc-title:fresh",
          "p[style-name='Subtitle'] => p.doc-subtitle:fresh",
          "p[style-name='Normal'] => p.doc-para:fresh",
          "p[style-name='Body Text'] => p.doc-para:fresh",
          "p[style-name='List Paragraph'] => p.doc-list-para:fresh",
          "r[style-name='Strong'] => strong",
          "r[style-name='Emphasis'] => em",
          "p:unordered-list(1) => ul > li:fresh",
          "p:unordered-list(2) => ul.doc-ul-2 > li:fresh",
          "p:ordered-list(1) => ol > li:fresh",
          "p:ordered-list(2) => ol.doc-ol-2 > li:fresh",
          "table => table.doc-table",
          "tr => tr",
          "td => td",
          "th => th",
        ];

        const result = await mammoth.convertToHtml({ arrayBuffer }, {
          styleMap,
          includeDefaultStyleMap: true,
        });

        // Post-process: fix alignment hints from inline style on Word paragraphs
        let htmlContent = result.value;

        // Wrap in a div that acts as a document container
        const styledHtml = `<div class="word-doc-view">${htmlContent}</div>`;

        // Extract plain text for AI context
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const plainText = tempDiv.innerText || tempDiv.textContent || '';

        // Load into editor
        setContent([{ text: styledHtml }]);
        if (pageRef.current) {
          pageRef.current.innerHTML = styledHtml;
          docxTextRef.current = styledHtml;
        }

        setUploadedFileName(name);
        setUploadedFileType('docx');
        setUploadedFileText(plainText.slice(0, 8000));
        setAiPrompt(`File "${name}" berhasil dimuat ke editor. Tolong analisis isinya dan berikan ringkasan serta rekomendasi.`);
        if (result.messages?.length > 0) {
          console.warn('[Mammoth warnings]', result.messages);
        }
      }
      // ── XLSX / XLS: use XLSX library ──
      else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetTexts = [];

        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          sheetTexts.push(`--- Sheet: ${sheetName} ---\n${csv}`);
        });

        const fullText = sheetTexts.join('\n\n');

        // Build a simple HTML table preview for the first sheet
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        let tableHtml = '<table border="1" style="border-collapse:collapse; width:100%; font-size:12px;">';
        rows.forEach((row, ri) => {
          tableHtml += '<tr>';
          row.forEach(cell => {
            const tag = ri === 0 ? 'th' : 'td';
            tableHtml += `<${tag} style="padding:4px 8px; border:1px solid #cbd5e1;">${cell ?? ''}</${tag}>`;
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</table>';

        const htmlContent = `<h2>${name}</h2>${tableHtml}`;
        setContent([{ text: htmlContent }]);
        if (pageRef.current) {
          pageRef.current.innerHTML = htmlContent;
          docxTextRef.current = htmlContent;
        }

        setUploadedFileName(name);
        setUploadedFileType('xlsx');
        setUploadedFileText(fullText.slice(0, 8000));
        setAiPrompt(`File Excel "${name}" berhasil dimuat. Tolong analisis data spreadsheet ini dan berikan insight.`);
      }
      // ── TXT / JSON / CSV plain text ──
      else if (['txt', 'md', 'json', 'html', 'xml'].includes(ext)) {
        const text = await file.text();
        const htmlContent = `<pre style="font-family: monospace; font-size:12px; white-space: pre-wrap; word-break: break-word;">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;

        setContent([{ text: htmlContent }]);
        if (pageRef.current) {
          pageRef.current.innerHTML = htmlContent;
          docxTextRef.current = htmlContent;
        }

        setUploadedFileName(name);
        setUploadedFileType(ext);
        setUploadedFileText(text.slice(0, 8000));
        setAiPrompt(`File "${name}" berhasil dimuat. Tolong analisis isinya.`);
      }
      // ── IMAGES / PHOTOS (PNG, JPG, WEBP, GIF, SVG) ──
      else if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result;
          if (typeof dataUrl === 'string') {
            setImgDataUrl(dataUrl);
            setUploadedFileName(name);
            setUploadedFileType('image');
            setUploadedFileText(`[Foto Terlampir: ${name}]`);
            setAiPrompt(`Saya melampirkan foto "${name}". Tolong posisikan dan atur tata letaknya secara otomatis di kanvas dokumen.`);
          }
        };
        reader.readAsDataURL(file);
      }
      // ── Unsupported ──
      else {
        setAiError(`Format file .${ext} belum didukung. Gunakan DOCX, XLSX, PDF, TXT, CSV, atau Foto (PNG/JPG/WEBP).`);
      }
    } catch (err) {
      console.error('[handleDocUploader]', err);
      setAiError(`Gagal membaca file: ${err.message}`);
    } finally {
      setIsUploadingFile(false);
      // Reset input so same file can be re-uploaded
      e.target.value = '';
    }
  };

  const generateAndInsertCurve = () => {
    let title = 'Kurva Sinusoidal';
    if (curveEquation === 'exponential') title = 'Tren Eksponensial';
    if (curveEquation === 'linear') title = 'Kurva Regresi Linear';
    if (curveEquation === 'bell') title = 'Distribusi Normal (Gauss)';

    const dataUrl = generateChartPngDataUrl({
      type: 'curve',
      title,
      equation: curveEquation,
      amplitude: curveAmplitude,
      color: curveColor
    });

    const imgHtml = createImageHtml({ src: dataUrl, align: 'center', width: '85%', caption: `📈 ${title}` });

    if (pageRef.current) {
      pageRef.current.focus();
      document.execCommand('insertHTML', false, imgHtml);
      docxTextRef.current = pageRef.current.innerHTML;
      syncDocxContent();
    }
    setShowChartModal(false);
  };

  const downloadCurveImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 40; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 40; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, canvas.height - 40);
    ctx.lineTo(canvas.width - 20, canvas.height - 40);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(40, 20);
    ctx.lineTo(40, canvas.height - 40);
    ctx.stroke();
    
    ctx.strokeStyle = curveColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    const startX = 40;
    const endX = canvas.width - 40;
    const centerY = canvas.height - 40;
    
    for (let px = startX; px <= endX; px++) {
      const x = (px - startX) / (endX - startX);
      let y = 0;
      
      if (curveEquation === 'sine') {
        y = Math.sin(x * Math.PI * 4) * (curveAmplitude / 100);
      } else if (curveEquation === 'exponential') {
        y = Math.pow(x, 2) * (curveAmplitude / 100);
      } else if (curveEquation === 'linear') {
        y = x * (curveAmplitude / 100);
      } else if (curveEquation === 'bell') {
        const mean = 0.5;
        const stdDev = 0.15;
        y = Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2)) * (curveAmplitude / 100);
      }
      
      const py = centerY - (y * (canvas.height - 80));
      if (px === startX) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px sans-serif';
    let title = 'sinusoidal';
    if (curveEquation === 'exponential') title = 'exponential';
    if (curveEquation === 'linear') title = 'linear_regression';
    if (curveEquation === 'bell') title = 'gauss_distribution';
    ctx.fillText(title, 50, 40);
    
    const dataUrl = canvas.toDataURL('image/png');
    const el = document.createElement('a');
    el.href = dataUrl;
    el.download = `${title}_curve.png`;
    el.click();
  };

  const triggerPreset = (promptText, title) => {
    if (title === "Tulis Draf Awal") {
      setPresetModalTitle("Tulis Draf Awal");
      setPresetModalPlaceholder("Masukkan topik untuk draf artikel/laporan bisnis Anda...");
      setPresetModalValue("riset teknologi terbaru");
      setPresetModalCallback(() => (topic) => {
        const finalPrompt = `Tuliskan draf artikel/laporan bisnis awal tentang topik ${topic.trim() || 'riset teknologi terbaru'}.`;
        setAiPrompt(finalPrompt);
        handleAiWrite(finalPrompt);
      });
      setShowPresetModal(true);
    } else if (title === "Buat Kerangka Kerja") {
      setPresetModalTitle("Buat Kerangka Kerja");
      setPresetModalPlaceholder("Masukkan topik/judul dokumen untuk dibuatkan kerangka kerja...");
      setPresetModalValue("dokumen baru");
      setPresetModalCallback(() => (topic) => {
        const finalPrompt = `Buatkan kerangka kerja (framework) dan outline bab untuk ${topic.trim() || 'dokumen baru'}.`;
        setAiPrompt(finalPrompt);
        handleAiWrite(finalPrompt);
      });
      setShowPresetModal(true);
    } else if (title === "Outline") {
      setPresetModalTitle("Buat Outline");
      setPresetModalPlaceholder("Masukkan topik laporan bisnis untuk outline...");
      setPresetModalValue("laporan bisnis");
      setPresetModalCallback(() => (topic) => {
        const finalPrompt = `Buatkan kerangka outline dokumen laporan bisnis tentang ${topic.trim() || 'laporan bisnis'} yang sangat lengkap dan terstruktur.`;
        setAiPrompt(finalPrompt);
        handleAiWrite(finalPrompt);
      });
      setShowPresetModal(true);
    } else {
      setAiPrompt(promptText);
      handleAiWrite(promptText);
    }
  };

  const getSmartRecommendations = () => {
    const html = content[0]?.text || '';
    const textLength = html.replace(/<[^>]*>/g, '').trim().length;
    
    const recs = [];
    if (textLength === 0 || html.includes('Mulai menulis')) {
      recs.push({
        title: "Tulis Draf Awal",
        icon: "fas fa-pen-nib",
        prompt: "Tuliskan draf artikel/laporan bisnis awal tentang topik riset teknologi terbaru."
      });
      recs.push({
        title: "Buat Kerangka Kerja",
        icon: "fas fa-lightbulb",
        prompt: "Buatkan kerangka kerja (framework) dan outline bab untuk dokumen baru."
      });
    } else {
      recs.push({
        title: "Buat Kesimpulan",
        icon: "fas fa-check-double",
        prompt: "Tambahkan paragraf kesimpulan dan poin-poin rekomendasi tindakan di akhir dokumen."
      });
      if (!html.includes('<table')) {
        recs.push({
          title: "Tambahkan Tabel Data",
          icon: "fas fa-table",
          prompt: "Buatkan tabel data analisis statistik yang relevan dengan isi dokumen saat ini."
        });
      }
      recs.push({
        title: "Parafrase Profesional",
        icon: "fas fa-sync-alt",
        prompt: "Parafrase dokumen ini agar bahasanya lebih mengalir, elegan, dan profesional."
      });
    }
    return recs;
  };

  // ===== TARGETED DOCUMENT REPAIR AGENT =====
  const handleStartDocumentPerbaiki = async (instructions) => {
    if (!instructions.trim()) return;

    // Capture message history before starting
    messagesBeforeAgentRef.current = [...messages];

    setIsAgentRunning(true);
    setAgentOutline(['Analisis Konteks & Rencana', 'Penyusunan Draft Modifikasi', 'Review & Penyempurnaan', 'Verifikasi & Diff Preview']);
    setAgentChecklist([
      { title: '1. Menganalisis Perbaikan & Cari Konteks', status: 'generating' },
      { title: '2. Menyusun Draft Modifikasi Konten', status: 'pending' },
      { title: '3. Memeriksa & Menyempurnakan Hasil Akhir', status: 'pending' },
      { title: '4. Verifikasi & Tampilkan Diff Preview', status: 'pending' }
    ]);
    setAgentLogs([]);
    setAgentSources([]);
    setIsGenerating(true);
    setIsStreaming(true);
    setStreamingContent('');
    setAiError('');
    setGenerationProgress(userLanguage === 'id' ? 'Menganalisis perbaikan...' : 'Analyzing modification...');
    
    addAgentLog(`Memulai perbaikan dokumen dengan instruksi: "${instructions}"`, 'info');

    // Add prompt to chat history
    const userMsg = { role: 'user', content: `/perbaiki ${instructions}` };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    messagesRef.current = newMessages;

    // Step 1: Search context
    addAgentLog(`🔍 Mencari data pendukung di web & file lokal...`, 'search');
    let searchRes = { web: [], workspace: [] };
    try {
      searchRes = await searchWorkspaceAndWeb(instructions);
    } catch (e) {
      console.error(e);
    }

    const foundCount = searchRes.web.length + searchRes.workspace.length;
    if (foundCount > 0) {
      addAgentLog(`📂 Menemukan ${foundCount} referensi relevan (Web: ${searchRes.web.length}, Lokal: ${searchRes.workspace.length})`, 'success');
      
      const newSources = [
        ...searchRes.workspace.map(w => ({ title: `[Lokal] ${w.name}`, url: w.url, type: 'workspace' })),
        ...searchRes.web.map(w => ({ title: w.title, url: w.url, type: 'web' }))
      ];
      setAgentSources(newSources);
    } else {
      addAgentLog(`📂 Tidak menemukan referensi luar tambahan. Menggunakan pengetahuan internal...`, 'info');
    }

    // Get current content representation
    let currentContent = '';
    if (editorType === 'docx') {
      currentContent = pageRef.current?.innerHTML || contentRef.current[0]?.text || '';
    } else if (editorType === 'excel') {
      currentContent = JSON.stringify(excelSheets);
    } else {
      currentContent = JSON.stringify(contentRef.current);
    }

    let searchContext = '';
    if (searchRes.workspace.length > 0) {
      searchContext += "\n=== REFERENSI DOKUMEN LOKAL ===\n" + searchRes.workspace.map((w, idx) => `[Lokal ${idx+1}] ${w.name}\nURL: ${w.url}\nKutipan: ${w.snippet}`).join('\n\n') + "\n";
    }
    if (searchRes.web.length > 0) {
      searchContext += "\n=== REFERENSI PENCARIAN WEB ===\n" + searchRes.web.map((w, idx) => `[Web ${idx+1}] ${w.title}\nURL: ${w.url}\nKutipan: ${w.snippet}`).join('\n\n') + "\n";
    }

    // Pass 1: Reasoning / Planning
    addAgentLog(`🧠 Menganalisis perubahan & mendeteksi segmen yang perlu diedit (Reasoning)...`, 'info');
    const systemContext = getSystemContext(true);
    let reasoningResult = '';
    try {
      const planPrompt = `Analisis instruksi berikut secara mendalam dengan melihat isi dokumen saat ini dan referensi tambahan.
Tentukan apakah perbaikan ini bersifat LOKAL (hanya mengubah satu paragraf/bagian tertentu) atau GLOBAL (mengubah seluruh dokumen atau banyak bagian sekaligus).

Jika perbaikan bersifat LOKAL:
1. Temukan teks/HTML asli di dalam dokumen yang ingin diganti secara presisi. Teks ini harus persis sama karakter-demi-karakter dengan yang ada di dokumen asli.
2. Tuliskan teks asli tersebut di dalam tag [TARGET_START] dan [TARGET_END].
3. Rancang rencana perubahan di luar tag tersebut. Fokus pada reasoning, analisis dan logika perbaikan.

Jika perbaikan bersifat GLOBAL:
1. Nyatakan bahwa ini adalah perubahan global, dan jelaskan rencana perubahan Anda secara logis.

Konten dokumen saat ini:
${currentContent}

Instruksi: "${instructions}"
${searchContext ? `\nReferensi Tambahan:\n${searchContext}\n` : ''}`;

      const formattedPlanMessages = [
        { sender: 'system', text: systemContext, timestamp: new Date().toISOString() },
        { sender: 'user', text: planPrompt, timestamp: new Date().toISOString() }
      ];

      const response = await callAiService(planPrompt, formattedPlanMessages);
      if (response?.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6);
                  if (jsonStr === '[DONE]') continue;
                  const json = JSON.parse(jsonStr);
                  if (json.choices?.[0]?.delta?.content) {
                    const contentDelta = json.choices[0].delta.content;
                    reasoningResult += contentDelta;
                    setStreamingContent(prev => prev + contentDelta);
                  }
                } catch {}
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (err) {
      console.error(err);
      addAgentLog(`⚠️ Reasoning pass error: ${err.message}`, 'error');
    }

    // Move to step 2: Drafting
    setAgentChecklist(prev => prev.map((item, idx) => {
      if (idx === 0) return { ...item, status: 'done' };
      if (idx === 1) return { ...item, status: 'generating' };
      return item;
    }));
    setStreamingContent('');
    setGenerationProgress(userLanguage === 'id' ? 'Menyusun draft modifikasi...' : 'Drafting modification...');

    // Detect target segments for targeted replacement
    const targetMatch = reasoningResult.match(/\[TARGET_START\]([\s\S]*?)\[TARGET_END\]/);
    const targetText = targetMatch ? targetMatch[1].trim() : '';
    const isLocal = !!targetText && currentContent.includes(targetText);

    if (isLocal) {
      addAgentLog(`🎯 Menargetkan segmen spesifik untuk perbaikan hemat token & aman...`, 'success');
      addAgentLog(`   └─ Menemukan teks target sepanjang ${targetText.length} karakter.`, 'info');
    } else {
      addAgentLog(`🌐 Melakukan modifikasi dokumen secara global (seluruh konten)...`, 'info');
    }

    addAgentLog(`✍️ Menyusun draft konten hasil modifikasi (Drafting)...`, 'drafting');

    let draftResult = '';
    try {
      let draftPrompt = '';
      if (isLocal) {
        draftPrompt = `Tuliskan konten baru hasil modifikasi khusus untuk menggantikan segmen teks berikut.
Hanya tuliskan konten penggantinya saja (format HTML bersih jika tipe docx). Jangan tuliskan bagian dokumen lain yang tidak berubah.

SEGMEN ASLI YANG AKAN DIGANTI:
${targetText}

Bungkus konten pengganti baru Anda di dalam tag [REPLACEMENT_START] dan [REPLACEMENT_END].

Aturan Referensi Sumber (Citations):
Jika merujuk ke REFERENSI pendukung [Lokal X] atau [Web X], Anda WAJIB mengubahnya menjadi format link HTML miring: 
<i><a href="URL_REFERENSI" target="_blank" style="color: #ea580c; text-decoration: underline;">[Lokal X]</a></i> atau <i><a href="URL_REFERENSI" target="_blank" style="color: #2563eb; text-decoration: underline;">[Web X]</a></i>. Jangan hanya menulis teks polos saja.`;
      } else {
        draftPrompt = `Tulis ulang seluruh isi dokumen yang sudah dimodifikasi secara lengkap dan utuh.
Bungkus konten dokumen final Anda di dalam tag [CONTENT_START] dan [CONTENT_END].

Konten dokumen asli:
${currentContent}

Instruksi: "${instructions}"

Aturan Referensi Sumber (Citations):
Jika merujuk ke REFERENSI pendukung [Lokal X] atau [Web X], Anda WAJIB mengubahnya menjadi format link HTML miring: 
<i><a href="URL_REFERENSI" target="_blank" style="color: #ea580c; text-decoration: underline;">[Lokal X]</a></i> atau <i><a href="URL_REFERENSI" target="_blank" style="color: #2563eb; text-decoration: underline;">[Web X]</a></i>. Jangan hanya menulis teks polos saja.`;
      }

      const formattedDraftMessages = [
        { sender: 'system', text: systemContext, timestamp: new Date().toISOString() },
        { sender: 'user', text: draftPrompt, timestamp: new Date().toISOString() }
      ];

      const response = await callAiService(draftPrompt, formattedDraftMessages);
      if (response?.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6);
                  if (jsonStr === '[DONE]') continue;
                  const json = JSON.parse(jsonStr);
                  if (json.choices?.[0]?.delta?.content) {
                    const contentDelta = json.choices[0].delta.content;
                    draftResult += contentDelta;
                    setStreamingContent(prev => prev + contentDelta);
                  }
                } catch {}
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (err) {
      console.error(err);
      addAgentLog(`⚠️ Drafting pass error: ${err.message}`, 'error');
    }

    // Move to step 3: Review / Refine
    setAgentChecklist(prev => prev.map((item, idx) => {
      if (idx === 1) return { ...item, status: 'done' };
      if (idx === 2) return { ...item, status: 'generating' };
      return item;
    }));
    setStreamingContent('');
    setGenerationProgress(userLanguage === 'id' ? 'Memeriksa kualitas...' : 'Reviewing quality...');
    addAgentLog(`🔍 Memeriksa, merapikan, dan menyempurnakan hasil akhir (Review)...`, 'info');

    let reviewedResult = '';
    try {
      const reviewPrompt = `Periksa draft konten dokumen hasil modifikasi berikut.
Koreksi kualitasnya, pastikan tidak ada tag [REQUEST_DOCUMENT] atau [SEARCH_REQUEST], dan pastikan outputnya bersih dan siap disisipkan ke editor.
Hasil akhir harus dibungkus dengan tag ${isLocal ? '[REPLACEMENT_START] dan [REPLACEMENT_END]' : '[CONTENT_START] dan [CONTENT_END]'}.

Draft Konten:
${draftResult}`;

      const formattedReviewMessages = [
        { sender: 'system', text: systemContext, timestamp: new Date().toISOString() },
        { sender: 'user', text: reviewPrompt, timestamp: new Date().toISOString() }
      ];

      const response = await callAiService(reviewPrompt, formattedReviewMessages);
      if (response?.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6);
                  if (jsonStr === '[DONE]') continue;
                  const json = JSON.parse(jsonStr);
                  if (json.choices?.[0]?.delta?.content) {
                    const contentDelta = json.choices[0].delta.content;
                    reviewedResult += contentDelta;
                    setStreamingContent(prev => prev + contentDelta);
                  }
                } catch {}
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (err) {
      console.error(err);
      addAgentLog(`⚠️ Review pass error: ${err.message}`, 'error');
    }

    // Step 4: Verify & Diff Preview
    setAgentChecklist(prev => prev.map((item, idx) => {
      if (idx === 2) return { ...item, status: 'done' };
      if (idx === 3) return { ...item, status: 'generating' };
      return item;
    }));
    setStreamingContent('');
    setGenerationProgress(userLanguage === 'id' ? 'Verifikasi & Diff Preview...' : 'Verifying & Diff Preview...');
    addAgentLog(`🔎 Memverifikasi hasil akhir dan menyiapkan diff preview...`, 'info');

    try {
      const cleaned = cleanAiResponse(reviewedResult || draftResult);
      
      let finalHtml = currentContent;
      let rawContent = '';
      
      if (isLocal) {
        const replacementMatch = cleaned.match(/\[REPLACEMENT_START\]([\s\S]*?)\[REPLACEMENT_END\]/);
        rawContent = replacementMatch ? replacementMatch[1].trim() : cleaned.trim();
        const replacementHtml = convertMarkdownToHtml(rawContent);
        
        if (finalHtml.includes(targetText)) {
          finalHtml = finalHtml.replace(targetText, replacementHtml);
          addAgentLog(`🔄 Berhasil melakukan penggantian segmen lokal secara akurat & aman!`, 'success');
        } else {
          const normalize = s => s.replace(/\s+/g, ' ').trim();
          const normHtml = normalize(finalHtml);
          const normTarget = normalize(targetText);
          
          if (normHtml.includes(normTarget)) {
            addAgentLog(`🔄 Berhasil menyinkronkan segmen lokal dengan penyesuaian spasi!`, 'success');
            finalHtml = finalHtml.replace(targetText.slice(0, 100), replacementHtml);
          } else {
            addAgentLog(`⚠️ Gagal mencocokkan segmen asli. Menempelkan hasil perbaikan ke akhir dokumen.`, 'error');
            finalHtml = finalHtml + '<br/>' + replacementHtml;
          }
        }
      } else {
        const contentMatch = cleaned.match(/\[CONTENT_START\]([\s\S]*?)\[CONTENT_END\]/);
        rawContent = contentMatch ? contentMatch[1].trim() : cleaned.trim();
        finalHtml = convertMarkdownToHtml(rawContent);
        addAgentLog(`🔄 Berhasil memperbarui seluruh konten dokumen secara global!`, 'success');
      }

      setGenerationProgress('Done!');
      setIsStreaming(false);

      // For DOCX — show diff preview so user can accept/reject
      if (editorType === 'docx') {
        addAgentLog(`📊 Menampilkan Diff Preview — Anda dapat Accept atau Reject perubahan.`, 'success');
        showDiffAndConfirm(currentContent, finalHtml, `/perbaiki ${instructions}`);
      } else {
        // For non-docx, apply directly
        const finalInserted = insertAiContent(rawContent);
        pushDocHistory(currentContent, `Before: /perbaiki ${instructions}`);
      }

      // Restore chat messages to state before agent was launched (leaving no trace)
      if (messagesBeforeAgentRef.current) {
        setMessages(messagesBeforeAgentRef.current);
        if (messagesRef.current) {
          messagesRef.current = messagesBeforeAgentRef.current;
        }
        messagesBeforeAgentRef.current = null;
      }
      setAiResponse(cleaned);
      setAiPrompt('');
      
      addAgentLog(`✅ Proses perbaikan selesai!`, 'success');
      
      setAgentChecklist(prev => prev.map((item, idx) => {
        if (idx === 3) return { ...item, status: 'done' };
        return item;
      }));

      saveArtifact(`/perbaiki ${instructions}`, cleaned, null, null);
      setTimeout(() => { 
        setGenerationProgress(''); 
        setStreamingContent(''); 
        setIsAgentRunning(false); 
      }, 2000);
    } catch (err) {
      console.error(err);
      setAiError(`Error: ${err.message}`);
      addAgentLog(`❌ Error: ${err.message}`, 'error');
      setIsStreaming(false);
      setIsAgentRunning(false);

      // Append Failed Agent Card to Chat
      const failedMsg = {
        role: 'assistant',
        isFailedAgentCard: true,
        agentState: {
          type: 'perbaiki',
          instructions: instructions
        },
        content: `Gagal memperbaiki dokumen: ${err.message}`
      };
      setMessages(prev => [...prev, failedMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  // ===== SMART DOCUMENT AUDIT AGENT (CHUNKED TYPO DETECTION + PANEL) =====
  const handleStartDocumentAudit = async (instructions) => {
    try {
      // Capture message history before starting
      messagesBeforeAgentRef.current = [...messages];

      setIsAgentRunning(true);
      setIsAuditing(true);
      setAgentOutline(['Ekstrak & Chunk Teks', 'Audit Typo per Chunk', 'Highlight & Typo Panel']);
      setAgentChecklist([
        { title: '1. Membaca & Memecah Teks Dokumen', status: 'generating' },
        { title: '2. Analisis Typo per Segmen (Chunked AI)', status: 'pending' },
        { title: '3. Menandai & Membuka Panel Typo', status: 'pending' }
      ]);
      setAgentLogs([]);
      setAgentSources([]);
      setDetectedTypos([]);
      setIsGenerating(true);
      setIsStreaming(true);
      setStreamingContent('');
      setAiError('');
      setGenerationProgress(userLanguage === 'id' ? 'Memulai smart audit...' : 'Starting smart audit...');

    addAgentLog(`Memulai Smart Audit — deteksi typo berbasis chunking...`, 'info');

    const userMsg = { role: 'user', content: `/audit ${instructions || ''}` };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    messagesRef.current = newMessages;

    // Step 1: Extract plain text & chunk
    let currentHtml = '';
    if (editorType === 'docx') {
      currentHtml = pageRef.current?.innerHTML || contentRef.current[0]?.text || '';
    } else {
      currentHtml = JSON.stringify(contentRef.current);
    }

    const plainText = htmlToPlainText(currentHtml);
    const words = plainText.split(/\s+/).filter(Boolean);
    const CHUNK_SIZE = 400;
    const chunks = [];
    for (let i = 0; i < words.length; i += CHUNK_SIZE) {
      chunks.push(words.slice(i, i + CHUNK_SIZE).join(' '));
    }

    addAgentLog(`📖 Dokumen berhasil diekstrak: ${words.length} kata, dipecah menjadi ${chunks.length} chunk.`, 'success');

    // Step 2: Audit per chunk
    setAgentChecklist(prev => prev.map((item, idx) => {
      if (idx === 0) return { ...item, status: 'done' };
      if (idx === 1) return { ...item, status: 'generating' };
      return item;
    }));

    let allTypos = [];
    const systemContext = getSystemContext(true);

    for (let ci = 0; ci < chunks.length; ci++) {
      addAgentLog(`🧠 [Chunk ${ci + 1}/${chunks.length}] Menganalisis ${chunks[ci].split(/\s+/).length} kata...`, 'search');
      
      const chunkPrompt = `Kamu adalah Agen Audit Ejaan. Analisis teks berikut dan temukan kata-kata typo (salah ketik, salah ejaan, tidak baku).

TEKS UNTUK DIAUDIT:
${chunks[ci]}

ATURAN:
1. Hanya output JSON array, tanpa penjelasan tambahan.
2. Format: [{"word":"kata_salah","suggestion":"kata_benar","context":"3-5 kata sekitar kata salah"}]
3. Jika tidak ada typo, kembalikan array kosong: []
4. Fokus pada typo nyata, bukan variasi gaya.`;

      const formattedMessages = [
        { sender: 'system', text: systemContext, timestamp: new Date().toISOString() },
        { sender: 'user', text: chunkPrompt, timestamp: new Date().toISOString() }
      ];

      let chunkResult = '';
      try {
        const response = await callAiService(chunkPrompt, formattedMessages);
        if (response?.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const jsonStr = line.slice(6);
                    if (jsonStr === '[DONE]') continue;
                    const json = JSON.parse(jsonStr);
                    if (json.choices?.[0]?.delta?.content) {
                      chunkResult += json.choices[0].delta.content;
                    }
                  } catch {}
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        }

        // Parse JSON from result
        const jsonMatch = chunkResult.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const valid = parsed.filter(t => t.word && t.suggestion);
              allTypos = [...allTypos, ...valid];
              addAgentLog(`   ✅ Chunk ${ci + 1}: ${valid.length} typo ditemukan`, 'success');
            } else {
              addAgentLog(`   ✅ Chunk ${ci + 1}: Bersih — tidak ada typo`, 'success');
            }
          } catch {
            addAgentLog(`   ⚠️ Chunk ${ci + 1}: Gagal parse JSON response`, 'error');
          }
        } else {
          addAgentLog(`   ✅ Chunk ${ci + 1}: Bersih`, 'success');
        }
      } catch (err) {
        addAgentLog(`   ❌ Chunk ${ci + 1}: Error — ${err.message}`, 'error');
      }
    }

    // Deduplicate typos
    const uniqueTypos = [];
    const seen = new Set();
    allTypos.forEach(t => {
      const key = `${t.word.toLowerCase()}|${t.suggestion.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueTypos.push(t);
      }
    });

    // Step 3: Highlight in canvas & open typo panel
    setAgentChecklist(prev => prev.map((item, idx) => {
      if (idx === 1) return { ...item, status: 'done' };
      if (idx === 2) return { ...item, status: 'generating' };
      return item;
    }));

    addAgentLog(`🎨 Menandai ${uniqueTypos.length} typo di canvas dengan stabilo kuning...`, 'drafting');

    if (editorType === 'docx' && pageRef.current && uniqueTypos.length > 0) {
      pushDocHistory(currentHtml, 'Before: /audit');
      let html = currentHtml;
      uniqueTypos.forEach(typo => {
        const escapedWord = typo.word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\b(${escapedWord})\\b`, 'gi');
        html = html.replace(regex, (match) => {
          return `<mark class="typo-highlight" style="background-color: #fef08a; padding: 1px 3px; border-radius: 3px; border-bottom: 2px solid #eab308; cursor: help;" title="Saran: ${typo.suggestion}">${match}</mark>`;
        });
      });
      pageRef.current.innerHTML = html;
      docxTextRef.current = html;
      syncDocxContent();
    }

    setDetectedTypos(uniqueTypos);
    setShowTypoPanel(true);

    const totalTypos = uniqueTypos.length;
    // Restore chat messages to state before agent was launched (leaving no trace)
    if (messagesBeforeAgentRef.current) {
      setMessages(messagesBeforeAgentRef.current);
      if (messagesRef.current) {
        messagesRef.current = messagesBeforeAgentRef.current;
      }
      messagesBeforeAgentRef.current = null;
    }
    setAiResponse(totalTypos > 0 
      ? `Smart Audit selesai! Ditemukan ${totalTypos} typo. Lihat Typo Panel untuk memperbaiki satu per satu atau klik "Fix All".`
      : `Smart Audit selesai! Tidak ditemukan typo — dokumen Anda bersih. 🎉`);
    setAiPrompt('');

    addAgentLog(`✅ Smart Audit selesai! ${totalTypos} typo terdeteksi.`, 'success');

    setAgentChecklist(prev => prev.map((item, idx) => {
      if (idx === 2) return { ...item, status: 'done' };
      return item;
    }));

    setGenerationProgress('Done!');
    setStreamingContent('');
    setIsStreaming(false);
    setTimeout(() => {
      setGenerationProgress('');
      setIsAgentRunning(false);
      setIsAuditing(false);
    }, 2000);
    setIsGenerating(false);
    } catch (err) {
      console.error(err);
      setAiError(`Error: ${err.message}`);
      addAgentLog(`❌ Error: ${err.message}`, 'error');
      setIsStreaming(false);
      setIsAgentRunning(false);
      setIsAuditing(false);
      setIsGenerating(false);

      // Append Failed Agent Card to Chat
      const failedMsg = {
        role: 'assistant',
        isFailedAgentCard: true,
        agentState: {
          type: 'audit',
          instructions: instructions
        },
        content: `Gagal menjalankan smart audit: ${err.message}`
      };
      setMessages(prev => [...prev, failedMsg]);
    }
  };

  // ===== DOCUMENT CRITIQUE / EVALUATION AGENT (SEMANTIC GREP + CoT ANALYSIS) =====
  const handleStartDocumentCritique = async (instructions) => {
    try {
      // Capture message history before starting
      messagesBeforeAgentRef.current = [...messages];

      setIsAgentRunning(true);
      setAgentOutline(['Navigasi & Baca Struktur', 'Pencarian Kata Kunci Canvas', 'Analisis Kualitas & CoT']);
      setAgentChecklist([
        { title: '1. Membaca Struktur Bab & Halaman', status: 'generating' },
        { title: '2. Melakukan Grep / Pencarian Kata Kunci', status: 'pending' },
        { title: '3. Evaluasi Kualitas & Rekomendasi (CoT)', status: 'pending' }
      ]);
      setAgentLogs([]);
      setAgentSources([]);
      setIsGenerating(true);
      setIsStreaming(true);
      setStreamingContent('');
      setAiError('');
      setGenerationProgress(userLanguage === 'id' ? 'Mengevaluasi dokumen...' : 'Evaluating document...');

    addAgentLog(`Memulai evaluasi kualitas dokumen pada canvas...`, 'info');

    // Add prompt to chat history
    const userMsg = { role: 'user', content: instructions };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    messagesRef.current = newMessages;

    // Get canvas content
    let currentContentText = '';
    let currentContentHtml = '';
    if (editorType === 'docx') {
      currentContentHtml = pageRef.current?.innerHTML || '';
      currentContentText = pageRef.current?.innerText || '';
    } else {
      currentContentText = JSON.stringify(contentRef.current);
      currentContentHtml = currentContentText;
    }

    // Step 1: Navigasi & Baca kerangka bab
    addAgentLog(`📖 Membaca kerangka bab & daftar isi dari canvas...`, 'info');
    const headingRegex = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi;
    let headings = [];
    let match;
    while ((match = headingRegex.exec(currentContentHtml)) !== null) {
      const text = match[1].replace(/<[^>]*>/g, '').trim();
      if (text) headings.push(text);
    }

    if (headings.length > 0) {
      addAgentLog(`📂 Menemukan ${headings.length} bagian di canvas:`, 'success');
      headings.forEach((h, idx) => {
        addAgentLog(`   └─ Bagian ${idx+1}: "${h}"`, 'info');
      });
    } else {
      addAgentLog(`📂 Dokumen tidak memiliki heading. Menganalisis sebaran paragraf...`, 'info');
    }
    await new Promise(resolve => setTimeout(resolve, 800));

    // Step 2: Grep / Pencarian kata kunci efisien
    setAgentChecklist(prev => prev.map((item, idx) => {
      if (idx === 0) return { ...item, status: 'done' };
      if (idx === 1) return { ...item, status: 'generating' };
      return item;
    }));
    
    addAgentLog(`🔎 Menjalankan pencarian kata kunci efisien di dalam canvas (Grep Mode)...`, 'search');
    
    const searchTerms = ['kesimpulan', 'data', 'hasil', 'tujuan', 'metode', 'pendahuluan', 'tabel', 'analisis'];
    let matchedSegments = [];
    
    searchTerms.forEach(term => {
      const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const termRegex = new RegExp(`[^.!?\\n]*\\b${escapedTerm}\\b[^.!?\\n]*[.!?]?`, 'gi');
      let termMatches = currentContentText.match(termRegex);
      if (termMatches) {
        termMatches.slice(0, 2).forEach(m => {
          const cleanMatch = m.trim();
          if (cleanMatch.length > 15 && !matchedSegments.includes(cleanMatch)) {
            matchedSegments.push(`[Pencarian: "${term}"] -> "...${cleanMatch}..."`);
          }
        });
      }
    });

    addAgentLog(`🎯 Berhasil memindai dokumen (${currentContentText.length} karakter).`, 'success');
    addAgentLog(`📑 Menyeleksi ${matchedSegments.length} segmen penting untuk analisis hemat token.`, 'success');
    matchedSegments.slice(0, 5).forEach((seg, idx) => {
      addAgentLog(`   ├─ Segmen ${idx+1}: ${seg.slice(0, 80)}...`, 'info');
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Evaluasi Kualitas & CoT
    setAgentChecklist(prev => prev.map((item, idx) => {
      if (idx === 1) return { ...item, status: 'done' };
      if (idx === 2) return { ...item, status: 'generating' };
      return item;
    }));
    addAgentLog(`🧠 Melakukan analisis kualitas akademik & bisnis (Reasoning)...`, 'info');

    const headingsList = headings.length > 0 ? headings.map((h, i) => `${i+1}. ${h}`).join('\n') : 'Tidak ada heading.';
    const selectedContent = matchedSegments.length > 0 ? matchedSegments.join('\n\n') : currentContentText.slice(0, 2000);

    const prompt = `Kamu adalah Agen Evaluasi Dokumen Deepernova. Tugasmu adalah menganalisis struktur dan potongan konten dokumen berikut untuk memberikan kritik, evaluasi, dan saran perbaikan yang sangat konstruktif.

Tuliskan tanggapan Anda dengan menyertakan **Chain of Thought (Alur Pikir Agen)** secara transparan: sebutkan bagian/bab mana saja yang telah Anda baca, apa analisis Anda terhadap bagian tersebut, dan berikan penilaian apakah kualitas dokumen ini sudah bagus atau perlu perbaikan (tata bahasa, kelengkapan data, dll).

STRUKTUR UTAMA DOKUMEN:
${headingsList}

POTONGAN KONTEN DOKUMEN TERPILIH (DIAMBIL DARI SEARCH KATA KUNCI CANVAS):
${selectedContent}

Tugasmu:
1. Berikan evaluasi terperinci mengenai kelengkapan struktur, alur tulisan, tata bahasa, dan kepadatan informasi.
2. Tunjukkan bagian mana saja yang sudah bagus dan bagian mana yang kurang lengkap (misal: datanya kurang, penjelasannya terlalu pendek).
3. Berikan saran konkret perbaikan.
4. Tulis langsung tanggapan evaluasi lengkap Anda secara profesional dengan format Chain of Thought yang terstruktur.`;

    const systemContext = getSystemContext(true);
    const formattedMessages = [
      { sender: 'system', text: systemContext, timestamp: new Date().toISOString() },
      { sender: 'user', text: prompt, timestamp: new Date().toISOString() }
    ];

    let evaluationResult = '';
    try {
      const response = await callAiService(prompt, formattedMessages);
      if (response?.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6);
                  if (jsonStr === '[DONE]') continue;
                  const json = JSON.parse(jsonStr);
                  if (json.choices?.[0]?.delta?.content) {
                    const contentDelta = json.choices[0].delta.content;
                    evaluationResult += contentDelta;
                    setStreamingContent(prev => prev + contentDelta);
                  }
                } catch {}
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (err) {
      console.error(err);
      addAgentLog(`❌ Gagal mengevaluasi kualitas: ${err.message}`, 'error');
    }

    // Restore chat messages to state before agent was launched (leaving no trace)
    if (messagesBeforeAgentRef.current) {
      setMessages(messagesBeforeAgentRef.current);
      if (messagesRef.current) {
        messagesRef.current = messagesBeforeAgentRef.current;
      }
      messagesBeforeAgentRef.current = null;
    }
    setAiResponse(cleaned);
    setAiPrompt('');

    addAgentLog(`✅ Evaluasi kualitas berhasil diselesaikan!`, 'success');
    
    setAgentChecklist(prev => prev.map((item, idx) => {
      if (idx === 2) return { ...item, status: 'done' };
      return item;
    }));

    saveArtifact(`/evaluasi`, cleaned, null, null);
    setTimeout(() => {
      setGenerationProgress('');
      setStreamingContent('');
      setIsAgentRunning(false);
    }, 2000);
    setIsGenerating(false);
    } catch (err) {
      console.error(err);
      setAiError(`Error: ${err.message}`);
      addAgentLog(`❌ Error: ${err.message}`, 'error');
      setIsStreaming(false);
      setIsAgentRunning(false);
      setIsGenerating(false);

      // Append Failed Agent Card to Chat
      const failedMsg = {
        role: 'assistant',
        isFailedAgentCard: true,
        agentState: {
          type: 'critique',
          instructions: instructions
        },
        content: `Gagal menjalankan evaluasi dokumen: ${err.message}`
      };
      setMessages(prev => [...prev, failedMsg]);
    }
  };

  const handleBrainstormWriteToDocument = async (instructions) => {
    setIsGenerating(true);
    setIsStreaming(true);
    setStreamingContent('');
    setAiError('');
    setGenerationProgress(userLanguage === 'id' ? 'Menyusun dokumen dari brainstorm...' : 'Writing document from brainstorm...');
    
    // Add prompt to chat history
    const userMsg = { role: 'user', content: `/buat ${instructions}` };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    messagesRef.current = newMessages;

    try {
      const brainstormHistoryContext = brainstormMessages
        .filter(msg => msg.text && msg.role)
        .map(msg => `${msg.role === 'user' ? 'Pengguna' : 'AI'}: ${msg.text}`)
        .join('\n');

      const prompt = `Anda adalah AI Penulis Dokumen. Anda baru saja melakukan sesi brainstorm dengan pengguna.
      
Berikut adalah riwayat diskusi brainstorm yang telah dilakukan:
${brainstormHistoryContext}

Tipe dokumen yang sedang diedit: ${editorType}
Instruksi tambahan penulisan dari pengguna: "${instructions}"

Berdasarkan diskusi brainstorm dan instruksi tambahan di atas, tuliskan konten dokumen baru yang utuh, profesional, dan lengkap.
- Jika tipenya docx: Formatnya harus HTML bersih (tag h1, h2, p, ul, li).
- Jika tipenya pptx: Formatnya harus array slide [{ "id": 1, "type": "slide", "title": "...", "content": "..." }].
- Jika tipenya excel: Formatnya harus array 2D dari tabel Excel [[ "Kolom1", "Kolom2" ], [ "Data1", "Data2" ]].

Bungkus konten dokumen final Anda di dalam tag [CONTENT_START] dan [CONTENT_END]. Jangan tambahkan teks penjelasan di luar tag tersebut.`;

      const formattedMessages = [
        { sender: 'system', text: getSystemContext(true), timestamp: new Date().toISOString() },
        { sender: 'user', text: prompt, timestamp: new Date().toISOString() }
      ];

      const response = await callAiService(prompt, formattedMessages);
      if (response?.body) {
        let fullContent = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6);
                  if (jsonStr === '[DONE]') continue;
                  const json = JSON.parse(jsonStr);
                  if (json.choices?.[0]?.delta?.content) {
                    fullContent += json.choices[0].delta.content;
                    setStreamingContent(prev => prev + json.choices[0].delta.content);
                  }
                } catch {}
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        if (fullContent.trim()) {
          const cleaned = cleanAiResponse(fullContent);
          const contentMatch = cleaned.match(/\[CONTENT_START\]([\s\S]*?)\[CONTENT_END\]/);
          const rawContent = contentMatch ? contentMatch[1].trim() : cleaned.trim();

          if (!rawContent) {
            setAiError('AI returned empty document content. Silakan coba lagi.');
            setGenerationProgress('No content generated');
            setIsStreaming(false);
            return;
          }
          
          setGenerationProgress('Done!');
          setIsStreaming(false);

          let finalInserted = null;
          if (editorType === 'docx') {
            const docHtml = convertMarkdownToHtml(rawContent);
            const newContent = [{ id: Date.now(), type: 'html', text: docHtml }];
            setContent(newContent);
            contentRef.current = newContent;
            if (pageRef.current) pageRef.current.innerHTML = docHtml;
            finalInserted = { content: newContent };
          } else {
            finalInserted = insertAiContent(rawContent);
          }

          const assistantMsg = { role: 'assistant', content: cleaned };
          const finalMessages = [...newMessages, assistantMsg];
          setMessages(finalMessages);
          messagesRef.current = finalMessages;
          setAiResponse(cleaned);
          setAiPrompt('');
          
          saveArtifact(`/buat ${instructions}`, cleaned, finalInserted?.content, finalInserted?.sheets);
          setTimeout(() => { setGenerationProgress(''); setStreamingContent(''); }, 2000);
        } else {
          setAiError('No content generated.');
          setIsStreaming(false);
        }
      }
    } catch (err) {
      console.error(err);
      setAiError(`Error: ${err.message}`);
      setIsStreaming(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const isEditingInstruction = (promptText = '') => {
    if (!promptText || typeof promptText !== 'string') return false;
    const normalized = promptText.trim().toLowerCase();
    const editKeywords = [
      'ubah', 'perbaiki', 'tambahkan', 'ganti', 'revisi', 'rapikan', 'perbarui', 
      'update', 'modify', 'repair', 'edit', 'format', 'sisipkan', 'hapus',
      'tambah', 'kurangi', 'gaya', 'style', 'translate', 'terjemahkan'
    ];
    return editKeywords.some(keyword => normalized.includes(keyword));
  };

  const isAuditInstruction = (promptText = '') => {
    if (!promptText || typeof promptText !== 'string') return false;
    const normalized = promptText.trim().toLowerCase();
    const auditKeywords = [
      'audit', 'periksa', 'typo', 'salah ketik', 'koreksi', 'stabilo', 
      'highlight', 'ejaan', 'salah eja', 'spelling'
    ];
    return auditKeywords.some(keyword => normalized.includes(keyword));
  };

  const isCritiqueInstruction = (promptText = '') => {
    if (!promptText || typeof promptText !== 'string') return false;
    const normalized = promptText.trim().toLowerCase();
    const keywords = [
      'bagus ga', 'bagus gak', 'bagus tidak', 'bagus kah', 'kualitas', 'review', 
      'evaluasi', 'kritik', 'komentar', 'saran', 'kurang apa', 'apakah lengkap', 
      'analisis dokumen', 'analisis tulisan', 'periksa kualitas', 'koreksi kualitas',
      'ok ga', 'ok gak', 'oke ga', 'oke gak'
    ];
    return keywords.some(keyword => normalized.includes(keyword));
  };

  const shouldInsertToCanvas = (promptText = '', responseText = '', hasAttachment = false) => {
    if (hasAttachment) return true;
    if (!promptText || typeof promptText !== 'string') return false;
    
    const normPrompt = promptText.trim().toLowerCase();
    const editKeywords = [
      'tulis', 'buat', 'buatkan', 'sisipkan', 'tambahkan', 'tambah', 'masukkan', 
      'ubah', 'perbaiki', 'ganti', 'revisi', 'rapikan', 'perbarui', 'update', 
      'edit', 'format', 'hapus', 'terjemahkan', 'generasi', 'bikin', 'posisikan', 'taruh', 'taro'
    ];
    const isEditPrompt = editKeywords.some(keyword => normPrompt.includes(keyword));
    const hasCanvasTags = /\[(CHART|CURVE|IMAGE_PLACE|TABLE):/i.test(responseText) || responseText.includes('[TABLE]');
    
    return isEditPrompt || hasCanvasTags;
  };

  // ===== AI WRITE =====
  const handleAiWrite = async (forcedPrompt = null) => {
    const activePrompt = (forcedPrompt && typeof forcedPrompt === 'string') ? forcedPrompt : aiPrompt;
    const promptText = activePrompt?.trim();
    if (!promptText) return;

    // Instant-action slash commands (no AI needed)
    if (promptText.startsWith('/undo')) {
      setAiPrompt(''); aiPromptRef.current = '';
      undoDoc();
      return;
    }
    if (promptText.startsWith('/diff')) {
      setAiPrompt(''); aiPromptRef.current = '';
      if (docHistory.length >= 2) {
        const lastIdx = docHistoryIdx;
        const prevIdx = Math.max(0, lastIdx - 1);
        showDiffAndConfirm(docHistory[prevIdx]?.html || '', docHistory[lastIdx]?.html || '', 'View last diff');
      }
      return;
    }
    if (promptText.startsWith('/fixall')) {
      setAiPrompt(''); aiPromptRef.current = '';
      fixAllTypos();
      return;
    }

    // Intercept agent drafting command or auto-route document requests
    if (promptText.startsWith('/draft') || promptText.startsWith('/agent')) {
      const topic = promptText.replace(/^\/(draft|agent)\s*/, '').trim();
      setAiPrompt('');
      aiPromptRef.current = '';
      handleStartAgentDrafting(topic || 'dokumen baru');
      return;
    }

    // Only intercept user slash commands
    if (promptText.startsWith('/audit') || promptText.startsWith('/periksa')) {
      const instructions = promptText.replace(/^\/(audit|periksa)\s*/, '').trim();
      setAiPrompt('');
      aiPromptRef.current = '';
      handleStartDocumentAudit(instructions || 'audit typo');
      return;
    }

    if (promptText.startsWith('/evaluasi') || promptText.startsWith('/review')) {
      const instructions = promptText.replace(/^\/(evaluasi|review)\s*/, '').trim();
      setAiPrompt('');
      aiPromptRef.current = '';
      handleStartDocumentCritique(instructions || 'evaluasi kualitas');
      return;
    }

    if (promptText.startsWith('/perbaiki')) {
      const instructions = promptText.replace(/^\/perbaiki\s*/, '').trim();
      setAiPrompt('');
      aiPromptRef.current = '';
      handleStartDocumentPerbaiki(instructions || 'revisi dokumen');
      return;
    }

    const userMsg = { role: 'user', content: promptText };
    const updatedMessages = [...(messagesRef.current || messages), userMsg];
    setMessages(updatedMessages);
    messagesRef.current = updatedMessages;

    setAiPrompt('');
    aiPromptRef.current = '';

    setIsGenerating(true);
    setIsStreaming(true);
    setStreamingContent('');
    setAiError('');
    setGenerationProgress('Menyusun balasan...');

    try {
      const systemContext = getSystemContext();
      const formattedMessages = [
        { sender: 'system', text: systemContext, timestamp: new Date().toISOString() },
        ...updatedMessages.map(msg => ({
          sender: msg.role === 'user' ? 'user' : 'assistant',
          text: msg.content || msg.text || '',
          timestamp: new Date().toISOString()
        }))
      ];

      const response = await callAiService(promptText, formattedMessages);

      if (response?.body) {
        let fullContent = '';

        await processStreamingResponse(response, (chunk) => {
          fullContent += chunk;
          setStreamingContent(prev => prev + chunk);
        });

        if (fullContent.trim()) {
          const cleaned = cleanAiResponse(fullContent);

          const documentRequestMatch = cleaned.match(/\[REQUEST_DOCUMENT:\s*(.*?)\]/);
          if (documentRequestMatch) {
            const topic = documentRequestMatch[1].trim();
            setIsGenerating(false);
            setIsStreaming(false);
            setStreamingContent('');
            setGenerationProgress('');
            setTimeout(() => {
              handleStartAgentDrafting(topic);
            }, 500);
            return;
          }

          const executeMatch = cleaned.match(/\[(?:REQUEST|EXECUTE|REQUEST_FILE):\s*(.*?)\]/);
          if (executeMatch) {
            const instructions = executeMatch[1].trim();
            setIsGenerating(false);
            setIsStreaming(false);
            setStreamingContent('');
            setGenerationProgress('');
            setTimeout(() => {
              handleStartDocumentPerbaiki(instructions);
            }, 500);
            return;
          }

          const finalMessages = [...updatedMessages, { role: 'assistant', content: cleaned || '...' }];
          setMessages(finalMessages);
          messagesRef.current = finalMessages;
          setAiResponse(cleaned || '');
          aiResponseRef.current = cleaned || '';

          // Insert response into canvas ONLY if requested or relevant (e.g. drafting, formatting, tags, or attachments)
          const doInsert = shouldInsertToCanvas(promptText, cleaned, !!imgDataUrl);
          const finalInserted = doInsert ? insertAiContent(cleaned) : null;

          // Clear uploaded image state after inserting to canvas
          if (imgDataUrl) {
            setImgDataUrl('');
            setUploadedFileName('');
            setUploadedFileType('');
            setUploadedFileText('');
          }

          saveArtifact(promptText, cleaned, finalInserted?.content, finalInserted?.sheets);
          setTimeout(() => { setGenerationProgress(''); setStreamingContent(''); }, 1500);
        } else {
          setAiError('Tidak ada respons yang diterima.');
          setIsStreaming(false);
          setStreamingContent('');
        }
      } else {
        setAiError('Respons tidak valid.');
        setIsStreaming(false);
        setStreamingContent('');
      }
    } catch (error) {
      setAiError(`Error: ${error.message}`);
      setGenerationProgress('');
      setIsStreaming(false);
      setStreamingContent('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDocxAiFormat = async () => {
    if (editorType !== 'docx' || !pageRef.current) return;
    const rawText = pageRef.current.innerText.trim();
    if (!rawText) {
      setAiError('Tidak ada teks untuk diformat.');
      return;
    }

    setIsGenerating(true);
    setIsStreaming(true);
    setStreamingContent('');
    setAiError('');
    setGenerationProgress('Memformat dokumen...');

    try {
      const systemContext = getSystemContext(true);
      const formattedMessages = [
        { sender: 'system', text: systemContext, timestamp: new Date().toISOString() },
        ...messages.map(msg => ({ sender: msg.role === 'user' ? 'user' : 'assistant', text: msg.content || '', timestamp: new Date().toISOString() }))
      ];

      const prompt = `Format ulang teks dokumen akademik berikut menjadi makalah yang rapi dan terstruktur:\n\nATURAN FORMATTING TEKS:\n1. Setiap paragraf HARUS dipisahkan dengan DUA newline (\\n\\n)\n2. Gunakan heading/BAB dengan format: BAB I: JUDUL\\n\\nThen content\\n\\n\n3. Setiap bagian/section diberi nomor (BAB I, BAB II, dll)\n4. Jangan gunakan markdown, asterisk, atau simbol apapun\n5. Gunakan struktur: BAB -> Judul -> Isi paragraf (dengan newline ganda antar paragraf)\n6. Pastikan setiap paragraf berkualitas akademik tinggi\n\nATURAN FORMATTING TABEL (JIKA ADA DATA TABEL):\n- Jika terdapat data tabular, buat tabel dengan format EXACTLY:\n[TABLE]\nHeader1 | Header2 | Header3\nValue1 | Value2 | Value3\nValue1 | Value2 | Value3\n[/TABLE]\n- Gunakan pipe (|) untuk separator kolom\n- Baris pertama adalah header (direkomendasikan)\n- Satu baris per data\n- Tabel akan di-insert otomatis ke dokumen\n\nKAPABILITAS EDITOR:\n- [TABLE]...[/TABLE]: Untuk tabel data\n- Jika ada grafik/chart perlu, sebutkan dalam teks\n\nOUTPUT:\n- Hanya teks terformat, tabel dengan [TABLE] marker, tanpa penjelasan tambahan\n\nTeks untuk diformat:\n${rawText}`;
      const response = await callAiService(prompt, formattedMessages);

      if (response?.body) {
        let fullContent = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6);
                  if (jsonStr === '[DONE]') continue;
                  const json = JSON.parse(jsonStr);
                  if (json.choices?.[0]?.delta?.content) {
                    fullContent += json.choices[0].delta.content;
                    setStreamingContent(prev => prev + json.choices[0].delta.content);
                  }
                } catch (_e) {
                  // skip parse error
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        if (fullContent.trim()) {
          const cleaned = cleanAiResponse(fullContent);
          
          // Parse and extract tables from AI response
          const parsedTables = parseTablesFromText(cleaned);
          if (parsedTables.length > 0) {
            insertParsedTables(parsedTables);
          }
          
          // Remove table markers from text for display
          const textWithoutTables = removeTableMarkersFromText(cleaned);
          
          pageRef.current.innerText = textWithoutTables;
          docxTextRef.current = textWithoutTables;
          syncDocxContent();
          setGenerationProgress('Selesai');
          setIsStreaming(false);
          const newMessages = [...messages, { role: 'user', content: prompt }, { role: 'assistant', content: cleaned }];
          setMessages(newMessages);
          messagesRef.current = newMessages;
          setAiResponse(cleaned);
          aiResponseRef.current = cleaned;
          setTimeout(() => { setGenerationProgress(''); setStreamingContent(''); }, 2000);
        } else {
          setAiError('Tidak ada hasil format.');
          setIsStreaming(false);
          setStreamingContent('');
        }
      } else {
        setAiError('Invalid response.');
        setIsStreaming(false);
        setStreamingContent('');
      }
    } catch (error) {
      setAiError(`Error: ${error.message}`);
      setGenerationProgress('');
      setIsStreaming(false);
      setStreamingContent('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStopStreaming = () => {
    setIsStreaming(false);
    setIsGenerating(false);
    setStreamingContent('');
    setGenerationProgress('Stopped');
    setTimeout(() => setGenerationProgress(''), 1200);
  };

  const buildDocumentExecutionRequest = (promptText = '') => {
    if (!promptText || typeof promptText !== 'string') return null;

    const normalized = promptText.trim().toLowerCase();
    const createMatch = normalized.match(/\b(buat|buatkan|tulis|tuliskan|susun|rancang|generate|create|write)\b[^\n]{0,120}\b(makalah|laporan|dokumen|artikel|file|slide|presentasi|spreadsheet|tabel|paper|resume)\b/i);

    if (createMatch?.[0]) {
      const topic = (createMatch[0].replace(/^\s*(buat|buatkan|tulis|tuliskan|susun|rancang|generate|create|write)\s+/i, '').trim());
      return topic ? `[REQUEST_DOCUMENT: ${topic}]` : '[REQUEST_DOCUMENT: dokumen baru]';
    }

    return null;
  };

  const runExecutionPass = async (statusMessage, promptBody, contextText = '') => {
    setExecutionAgentStatus(statusMessage);
    setStreamingContent('');

    const systemContext = getSystemContext(true);
    const response = await callAiService(promptBody, [
      { sender: 'system', text: systemContext, timestamp: new Date().toISOString() },
      { sender: 'user', text: contextText ? `${contextText}\n\n${promptBody}` : promptBody, timestamp: new Date().toISOString() }
    ]);

    if (!response?.body) {
      throw new Error('Respons eksekutor tidak valid.');
    }

    let fullContent = '';
    await processStreamingResponse(response, (chunk) => {
      fullContent += chunk;
      setStreamingContent(prev => prev + chunk);
    });

    return cleanAiResponse(fullContent);
  };

  const handleApproveExecution = async () => {
    if (!pendingExecutionText.trim()) return;
    const instruction = pendingExecutionText.trim();

    setPendingExecution(false);
    setIsGenerating(true);
    setIsStreaming(true);
    setStreamingContent('');
    setGenerationProgress('Agent eksekutor sedang berpikir...');
    setExecutionAgentStatus('Agent eksekutor sedang menganalisis instruksi...');

    try {
      const reasoningResult = await runExecutionPass(
        'Agent eksekutor sedang menganalisis instruksi...',
        `Analisis instruksi berikut secara mendalam. Buat ringkasan rencana eksekusi, keputusan penulisan, dan target hasil. Jangan menulis isi akhir. Fokus pada reasoning dan logika.\n\nInstruksi:\n${instruction}`,
        instruction
      );

      const draftResult = await runExecutionPass(
        'Agent eksekutor sedang menyiapkan draft konten...',
        `Berdasarkan analisis berikut, tulis isi final yang siap disisipkan ke canvas. Gunakan bahasa singkat, rapi, langsung, dan sesuai instruksi. Jangan memperkenalkan pembuka yang bertele-tele.\n\nAnalisis:\n${reasoningResult}`,
        reasoningResult
      );

      const reviewedResult = await runExecutionPass(
        'Agent eksekutor sedang memeriksa dan menyempurnakan hasil...',
        `Periksa draft berikut, koreksi kualitas, singkatkan jika perlu, dan pastikan hasil paling sesuai dengan instruksi awal. Hasil akhir harus siap ditempelkan ke canvas tanpa penjelasan tambahan.\n\nDraft:\n${draftResult}`,
        draftResult
      );

      if (reviewedResult.trim()) {
        setExecutionAgentStatus('Agent eksekutor sedang menempelkan hasil ke canvas...');
        insertAiContent(reviewedResult);
        setAiResponse(reviewedResult);
        aiResponseRef.current = reviewedResult;
        setGenerationProgress('Selesai');
        setTimeout(() => { setGenerationProgress(''); setStreamingContent(''); setExecutionAgentStatus(''); }, 1500);
      } else {
        setAiError('Tidak ada konten yang ditulis.');
      }
    } catch (error) {
      setAiError(`Error: ${error.message}`);
    } finally {
      setIsStreaming(false);
      setIsGenerating(false);
      setPendingExecutionText('');
      setExecutionAgentStatus('');
    }
  };

  const cleanAiResponse = (text) => {
    if (!text) return '';

    let cleaned = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/^\s*(baik|oke|ok|tentu|siap|berikut|ini)\b.*?[:\n]/gim, '')
      .replace(/^\s*(hasil|konten|draft|ringkasan|revisi|tulisan)\s*[:\-]\s*/gim, '')
      .replace(/^\s*(saya|kami)\s+(akan|mau|ingin|telah)\s+.*?[:\n]/gim, '')
      .replace(/^(pembukaan|pendahuluan|kesimpulan|catatan|note|penutup)\s*[:\-]?\s*$/gim, '')
      .replace(/\n+(semoga|harap|terima kasih|terima.*?kasih|regards|best|thanks).*$/gim, '')
      .replace(/^#+\s+/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^\s*[-•*]\s+/gm, '')
      .replace(/^\s*\d+[.)]\s+/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    cleaned = cleaned
      .replace(/^\s*[-_•#]+\s*/gm, '')
      .replace(/\s*[-_•#]+\s*$/gm, '')
      .replace(/^\s+|\s+$/g, '');

    const lines = cleaned.split('\n').map(line => line.trim()).filter(Boolean);
    const compactLines = [];
    for (const line of lines) {
      if (/^(berikut|ini|hasil|draft|ringkasan|revisi|catatan|note|penutup|pembukaan|pendahuluan|kesimpulan)/i.test(line)) {
        continue;
      }
      compactLines.push(line);
    }

    return compactLines.join('\n\n').trim();
  };

  const convertMarkdownToHtml = (markdown) => {
    if (!markdown) return '';
    let html = markdown
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    // ===== PARSE AI TAGS: CHART, CURVE, IMAGE_PLACE =====
    // 1. [CHART: type="bar", title="...", labels="Jan,Feb,Mar", values="100,200,300"]
    html = html.replace(/\[CHART:\s*(.*?)\]/gi, (match, paramStr) => {
      try {
        const params = {};
        paramStr.replace(/(\w+)="([^"]*)"/g, (_, k, v) => { params[k] = v; });

        const type = params.type || 'bar';
        const title = params.title || 'Grafik AI';
        const labels = (params.labels || 'A,B,C,D').split(',');
        const values = (params.values || '10,20,30,40').split(',').map(v => Number(v) || 0);

        const data = labels.map((l, i) => ({ name: l.trim(), value: values[i] || 0 }));
        const dataUrl = generateChartPngDataUrl({ type, title, data });

        return createImageHtml({ src: dataUrl, align: 'center', width: '85%', caption: `📊 ${title}` });
      } catch (err) {
        console.warn('Failed to parse AI chart tag:', err);
        return match;
      }
    });

    // 2. [CURVE: equation="sine", title="...", amplitude=80]
    html = html.replace(/\[CURVE:\s*(.*?)\]/gi, (match, paramStr) => {
      try {
        const params = {};
        paramStr.replace(/(\w+)="([^"]*)"/g, (_, k, v) => { params[k] = v; });

        const equation = params.equation || 'bell';
        const title = params.title || 'Kurva Distribusi';
        const amplitude = Number(params.amplitude) || 50;

        const dataUrl = generateChartPngDataUrl({ type: 'curve', title, equation, amplitude });

        return createImageHtml({ src: dataUrl, align: 'center', width: '85%', caption: `📈 ${title}` });
      } catch (err) {
        console.warn('Failed to parse AI curve tag:', err);
        return match;
      }
    });

    // 3. [IMAGE_PLACE: align="float-right", width="40%", caption="...", src="..."]
    html = html.replace(/\[IMAGE_PLACE:\s*(.*?)\]/gi, (match, paramStr) => {
      try {
        const params = {};
        paramStr.replace(/(\w+)="([^"]*)"/g, (_, k, v) => { params[k] = v; });

        let imageSrc = params.src || '';
        if ((!imageSrc || (!imageSrc.startsWith('data:') && !imageSrc.startsWith('http'))) && imgDataUrl) {
          imageSrc = imgDataUrl;
        }

        if (!imageSrc) return '';

        return createImageHtml({
          src: imageSrc,
          align: params.align || 'center',
          width: params.width || '75%',
          styleType: params.style || 'shadow',
          caption: params.caption || ''
        });
      } catch (err) {
        console.warn('Failed to parse AI image tag:', err);
        return match;
      }
    });

    // 4. [WEB_IMAGE: query="teknologi stunting", caption="Ilustrasi: ...", align="float-right", width="40%"]
    html = html.replace(/\[(?:WEB_IMAGE|IMAGE_WEB):\s*(.*?)\]/gi, (match, paramStr) => {
      try {
        const params = {};
        paramStr.replace(/(\w+)="([^"]*)"/g, (_, k, v) => { params[k] = v; });

        const rawQuery = params.query || params.keyword || 'illustration';
        const cleanQuery = rawQuery.replace(/[^a-zA-Z0-9\s]/g, '').trim();
        const caption = params.caption || `Ilustrasi: ${cleanQuery}`;
        const align = params.align || 'float-right';
        const width = params.width || '40%';

        const queryImageSrc = `https://loremflickr.com/800/500/${encodeURIComponent(cleanQuery)}`;

        return createImageHtml({
          src: queryImageSrc,
          align: align,
          width: width,
          styleType: 'shadow',
          caption: `🖼️ ${caption}`
        });
      } catch (err) {
        console.warn('Failed to parse WEB_IMAGE tag:', err);
        return match;
      }
    });

    // Parse [TABLE]...[/TABLE] tags if present
    html = html.replace(/\[TABLE\]([\s\S]*?)\[\/TABLE\]/gi, (match, inner) => inner.trim());

    // Convert headings
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Convert tables (lines containing |)
    const lines = html.split('\n');
    let inTable = false;
    let tableRows = [];
    const newLines = [];

    const flushTable = () => {
      if (tableRows.length === 0) return;
      
      let tHtml = '<table style="width:100%; border-collapse:collapse; margin:16px 0; border:1px solid #cbd5e1; font-size:13.5px; text-align:left;">';
      const isSepRow = (cells) => cells.length > 0 && cells.every(c => /^:?-+:?$/.test(c.trim()));
      const validRows = tableRows.filter(r => !isSepRow(r));
      
      if (validRows.length > 0) {
        // First valid row is header
        const headerCells = validRows[0];
        tHtml += '<thead style="background-color:#f1f5f9; font-weight:700; color:#1e293b;"><tr>';
        headerCells.forEach(cell => {
          tHtml += `<th style="border:1px solid #cbd5e1; padding:10px 14px; background-color:#f1f5f9;">${cell}</th>`;
        });
        tHtml += '</tr></thead>';

        if (validRows.length > 1) {
          tHtml += '<tbody>';
          validRows.slice(1).forEach((rowCells, rIdx) => {
            const bg = rIdx % 2 === 1 ? '#f8fafc' : '#ffffff';
            tHtml += `<tr style="background-color:${bg};">`;
            rowCells.forEach(cell => {
              tHtml += `<td style="border:1px solid #cbd5e1; padding:8px 14px;">${cell}</td>`;
            });
            tHtml += '</tr>';
          });
          tHtml += '</tbody>';
        }
      }
      
      tHtml += '</table>';
      newLines.push(tHtml);
      tableRows = [];
      inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        inTable = true;
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        tableRows.push(cells);
      } else {
        if (inTable) {
          flushTable();
        }
        newLines.push(line);
      }
    }
    if (inTable) {
      flushTable();
    }
    html = newLines.join('\n');

    // Convert lists
    html = html.replace(/^\s*[-*•]\s+(.*)$/gim, '<ul><li>$1</li></ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    html = html.replace(/^\s*\d+[.)]\s+(.*)$/gim, '<ol><li>$1</li></ol>');
    html = html.replace(/<\/ol>\s*<ol>/g, '');

    // Convert paragraphs (skip headers, tables, lists, images)
    html = html.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<table') || trimmed.startsWith('</table') || trimmed.startsWith('<thead') || trimmed.startsWith('</thead') || trimmed.startsWith('<tbody') || trimmed.startsWith('</tbody') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || trimmed.startsWith('<li') || trimmed.startsWith('<tr') || trimmed.startsWith('<td') || trimmed.startsWith('<th') || trimmed.startsWith('<div') || trimmed.startsWith('</')) {
        return line;
      }
      return `<p>${line}</p>`;
    }).join('\n');

    return html;
  };

  // ===== AGENTIC CANVAS PLACEMENT ENGINE =====
  const insertAgenticallyToCanvas = (insertedHtml, targetHeading = null) => {
    if (!pageRef.current) return;

    // 1. Cursor Priority: if selection is active inside pageRef.current, insert at exact cursor position!
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && pageRef.current.contains(sel.anchorNode)) {
      try {
        document.execCommand('insertHTML', false, insertedHtml);
        docxTextRef.current = pageRef.current.innerHTML;
        setContent([{ id: Date.now(), type: 'html', text: pageRef.current.innerHTML }]);
        syncDocxContent();
        return;
      } catch (_e) {
        // Fallback
      }
    }

    const currentInner = pageRef.current.innerHTML || '';
    if (!currentInner.trim()) {
      pageRef.current.innerHTML = insertedHtml;
      docxTextRef.current = insertedHtml;
      setContent([{ id: Date.now(), type: 'html', text: insertedHtml }]);
      syncDocxContent();
      return;
    }

    // 2. Heading Target Priority: ONLY if targetHeading is explicitly specified
    if (targetHeading) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = currentInner;
      const headings = tempDiv.querySelectorAll('h1, h2, h3, h4');
      let targetEl = null;

      headings.forEach(h => {
        if (h.textContent.toLowerCase().includes(targetHeading.toLowerCase())) {
          targetEl = h;
        }
      });

      if (targetEl) {
        const insertBlock = document.createElement('div');
        insertBlock.innerHTML = insertedHtml;
        if (targetEl.nextSibling) {
          targetEl.parentNode.insertBefore(insertBlock, targetEl.nextSibling);
        } else {
          targetEl.parentNode.appendChild(insertBlock);
        }

        const newHtml = tempDiv.innerHTML;
        pageRef.current.innerHTML = newHtml;
        docxTextRef.current = newHtml;
        setContent([{ id: Date.now(), type: 'html', text: newHtml }]);
        syncDocxContent();
        return;
      }
    }

    // 3. Default Natural Sequential Flow: Append cleanly at the end
    const newHtml = currentInner + '\n' + insertedHtml;
    pageRef.current.innerHTML = newHtml;
    docxTextRef.current = newHtml;
    setContent([{ id: Date.now(), type: 'html', text: newHtml }]);
    syncDocxContent();
  };

  // ===== INSERT AI CONTENT =====
  const insertAiContent = (responseContent) => {
    if (!responseContent || typeof responseContent !== 'string') return null;
    let cleaned = cleanAiResponse(responseContent);
    if (!cleaned.trim()) return null;

    let newContent = null;
    let newSheets = null;

    switch (editorType) {
      case 'docx': {
        let insertedHtml = convertMarkdownToHtml(cleaned);
        // Automatic image placement fallback: if imgDataUrl exists and no <img> tag was rendered, insert the uploaded photo directly!
        if (imgDataUrl && !insertedHtml.includes('<img')) {
          const photoHtml = createImageHtml({
            src: imgDataUrl,
            align: 'center',
            width: '75%',
            styleType: 'shadow',
            caption: uploadedFileName ? `Foto: ${uploadedFileName}` : 'Foto Terlampir'
          });
          insertedHtml = photoHtml + insertedHtml;
        }

        insertAgenticallyToCanvas(insertedHtml);
        newContent = [{ id: Date.now(), type: 'html', text: pageRef.current ? pageRef.current.innerHTML : insertedHtml }];
        break;
      }
      case 'pptx': {
        const slides = cleaned.split(/---|\n\n---|\n---\n/).filter(Boolean);
        const newSlides = slides.map((s, idx) => {
          const lines = s.trim().split('\n').filter(Boolean);
          return { id: Date.now() + idx, type: 'slide', title: lines[0]?.trim() || `Slide ${idx + 1}`, content: lines.slice(1).join('\n').trim() || 'Konten slide', notes: '' };
        });
        if (newSlides.length) {
          newContent = [...newSlides, ...contentRef.current];
          setContent(newContent);
          contentRef.current = newContent; // Update ref immediately
        }
        break;
      }
      case 'excel': {
        const parsed = parseExcelContent(cleaned);
        if (parsed) {
          if (parsed.type === 'multi_sheet') {
            newSheets = parsed.sheets;
            setExcelSheets(newSheets);
            excelSheetsRef.current = newSheets; // Update ref immediately
            setActiveSheet(0);
          } else {
            newSheets = [...excelSheetsRef.current];
            const sheetIdx = activeSheet;
            if (parsed.data.length > 0) {
              const isCurrentEmpty = newSheets[sheetIdx].data.length === 1 &&
                newSheets[sheetIdx].data[0].length === 1 &&
                newSheets[sheetIdx].data[0][0]?.value === '';
              if (isCurrentEmpty) {
                newSheets[sheetIdx] = {
                  ...newSheets[sheetIdx], data: parsed.data,
                  merges: parsed.merges || [],
                  colWidths: parsed.colWidths || Array(Math.max(...parsed.data.map(r => r.length), 1)).fill(100),
                };
              } else {
                newSheets[sheetIdx] = { ...newSheets[sheetIdx], data: [...parsed.data, ...newSheets[sheetIdx].data] };
              }
              setExcelSheets(newSheets);
              excelSheetsRef.current = newSheets; // Update ref immediately
            }
          }
        }
        break;
      }
      default: break;
    }
    
    return { content: newContent, sheets: newSheets };
  };

  // ===== EXCEL OPERATIONS =====
  const updateCell = (r, c, value) => {
    const newSheets = [...excelSheets];
    const sheet = { ...newSheets[activeSheet], data: [...newSheets[activeSheet].data] };
    if (!sheet.data[r]) sheet.data[r] = [];
    if (!sheet.data[r][c]) sheet.data[r][c] = createCell();
    sheet.data[r] = [...sheet.data[r]];
    sheet.data[r][c] = { ...sheet.data[r][c], value: String(value ?? '') };
    newSheets[activeSheet] = sheet;
    setExcelSheets(newSheets);
  };

  const updateCellFormat = (r, c, formatChanges) => {
    const newSheets = [...excelSheets];
    const sheet = { ...newSheets[activeSheet], data: [...newSheets[activeSheet].data] };
    if (!sheet.data[r]) sheet.data[r] = [];
    if (!sheet.data[r][c]) sheet.data[r][c] = createCell();
    sheet.data[r] = [...sheet.data[r]];
    sheet.data[r][c] = { ...sheet.data[r][c], format: { ...sheet.data[r][c].format, ...formatChanges } };
    newSheets[activeSheet] = sheet;
    setExcelSheets(newSheets);
  };

  const applyFormatToSelection = (formatChanges) => {
    if (!selectedCell) return;
    updateCellFormat(selectedCell.r, selectedCell.c, formatChanges);
  };

  const addExcelRow = () => {
    const newSheets = [...excelSheets];
    const sheet = newSheets[activeSheet];
    const cols = sheet.data[0]?.length || 8;
    sheet.data = [...sheet.data, createRow(cols)];
    sheet.rowHeights = [...(sheet.rowHeights || []), 32];
    newSheets[activeSheet] = sheet;
    setExcelSheets(newSheets);
  };

  const addExcelColumn = () => {
    const newSheets = [...excelSheets];
    const sheet = newSheets[activeSheet];
    sheet.data = sheet.data.map(row => [...row, createCell('')]);
    sheet.colWidths = [...(sheet.colWidths || Array(sheet.data[0]?.length || 1).fill(100)), 100];
    newSheets[activeSheet] = sheet;
    setExcelSheets(newSheets);
  };

  const addExcelSheet = () => {
    const cols = excelSheets[activeSheet]?.data[0]?.length || 8;
    setExcelSheets([...excelSheets, createSheet(`Sheet${excelSheets.length + 1}`, 10, cols)]);
    setActiveSheet(excelSheets.length);
  };

  const deleteExcelSheet = (idx) => {
    if (excelSheets.length <= 1) return;
    const newSheets = excelSheets.filter((_, i) => i !== idx);
    setExcelSheets(newSheets);
    if (activeSheet >= newSheets.length) setActiveSheet(newSheets.length - 1);
  };

  const deleteExcelRow = (r) => {
    const newSheets = [...excelSheets];
    const sheet = newSheets[activeSheet];
    if (sheet.data.length <= 1) return;
    sheet.data = sheet.data.filter((_, i) => i !== r);
    sheet.rowHeights = (sheet.rowHeights || []).filter((_, i) => i !== r);
    newSheets[activeSheet] = sheet;
    setExcelSheets(newSheets);
    setSelectedCell(null);
  };

  const deleteExcelColumn = (c) => {
    const newSheets = [...excelSheets];
    const sheet = newSheets[activeSheet];
    if ((sheet.data[0]?.length || 0) <= 1) return;
    sheet.data = sheet.data.map(row => row.filter((_, i) => i !== c));
    sheet.colWidths = (sheet.colWidths || []).filter((_, i) => i !== c);
    newSheets[activeSheet] = sheet;
    setExcelSheets(newSheets);
    setSelectedCell(null);
  };

  const insertExcelRowAbove = (r) => {
    const newSheets = [...excelSheets];
    const sheet = newSheets[activeSheet];
    const cols = sheet.data[0]?.length || 8;
    sheet.data = [...sheet.data.slice(0, r), createRow(cols), ...sheet.data.slice(r)];
    sheet.rowHeights = [...(sheet.rowHeights || Array(sheet.data.length - 1).fill(32)), 32];
    newSheets[activeSheet] = sheet;
    setExcelSheets(newSheets);
  };

  const insertExcelColumnLeft = (c) => {
    const newSheets = [...excelSheets];
    const sheet = newSheets[activeSheet];
    sheet.data = sheet.data.map(row => [...row.slice(0, c), createCell(''), ...row.slice(c)]);
    sheet.colWidths = [...(sheet.colWidths || Array(sheet.data[0]?.length - 1 || 1).fill(100)), 100];
    newSheets[activeSheet] = sheet;
    setExcelSheets(newSheets);
  };

  const sortExcelData = (colIdx, dir = 'asc') => {
    const newSheets = [...excelSheets];
    const sheet = newSheets[activeSheet];
    const header = sheet.data[0];
    const body = sheet.data.slice(1);
    body.sort((a, b) => {
      const va = (a[colIdx]?.value || '').toLowerCase();
      const vb = (b[colIdx]?.value || '').toLowerCase();
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    sheet.data = [header, ...body];
    newSheets[activeSheet] = sheet;
    setExcelSheets(newSheets);
  };

  const findAndReplace = () => {
    if (!findText) return;
    const newSheets = [...excelSheets];
    const sheet = newSheets[activeSheet];
    let count = 0;
    sheet.data = sheet.data.map(row =>
      row.map(cell => {
        if (cell.value.toLowerCase().includes(findText.toLowerCase())) {
          count++;
          if (replaceText !== undefined) {
            return { ...cell, value: cell.value.replace(new RegExp(findText, 'gi'), replaceText) };
          }
          return cell;
        }
        return cell;
      })
    );
    newSheets[activeSheet] = sheet;
    setExcelSheets(newSheets);
    alert(`Found ${count} cell(s)` + (replaceText ? `, replaced ${count}` : ''));
  };

  const getColumnLabel = (col) => {
    let label = '';
    let n = col;
    while (n >= 0) {
      label = String.fromCharCode(65 + (n % 26)) + label;
      n = Math.floor(n / 26) - 1;
    }
    return label;
  };

  const getCellStyle = (cell, r, c) => {
    if (!cell || !cell.format) return {};
    const f = cell.format;
    const isSelected = selectedCell?.r === r && selectedCell?.c === c;
    return {
      fontWeight: f.bold ? 'bold' : 'normal',
      fontStyle: f.italic ? 'italic' : 'normal',
      textDecoration: [f.underline ? 'underline' : '', f.strikethrough ? 'line-through' : ''].filter(Boolean).join(' ') || 'none',
      fontSize: `${f.fontSize || 11}px`,
      fontFamily: f.fontFamily || 'Calibri',
      color: f.fontColor || '#000000',
      backgroundColor: f.fillColor || (isSelected ? '#e8f0fe' : (r === 0 ? '#fff6f0' : '')),
      textAlign: f.halign || 'left',
      verticalAlign: f.valign || 'middle',
      whiteSpace: f.wrapText ? 'pre-wrap' : 'nowrap',
      wordBreak: f.wrapText ? 'break-word' : 'normal',
      minWidth: 80,
      borderTop: f.borderTop || '1px solid #e0e0e0',
      borderBottom: f.borderBottom || '1px solid #e0e0e0',
      borderLeft: f.borderLeft || '1px solid #e0e0e0',
      borderRight: f.borderRight || '1px solid #e0e0e0',
      outline: isSelected ? '2px solid #ff6b00' : 'none',
      outlineOffset: isSelected ? '-1px' : '0',
    };
  };

  // ===== RENDER =====
  const renderEditor = () => {
    switch (editorType) {
      case 'docx': return renderDocxEditor();
      case 'pptx': return renderPptxEditor();
      case 'excel': return renderExcelEditor();
      default: return null;
    }
  };

  // ===== DOCX TABLE OPERATIONS =====
  const addDocxTable = (rows = 3, cols = 3) => {
    let tableHtml = '<table style="width:100%; border-collapse:collapse; margin:14px 0;"><tbody>';
    for (let r = 0; r < rows; r++) {
      tableHtml += '<tr>';
      for (let c = 0; c < cols; c++) {
        tableHtml += '<td style="border:1px solid #cbd5e1; padding:8px 12px; min-width:60px;">&nbsp;</td>';
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table><p>&nbsp;</p>';
    
    if (pageRef.current) {
      pageRef.current.focus();
      document.execCommand('insertHTML', false, tableHtml);
      docxTextRef.current = pageRef.current.innerHTML;
      syncDocxContent();
    }
  };

  // ===== HIGH-DEFINITION AI CANVAS CHART & CURVE ENGINE =====
  const generateChartPngDataUrl = ({
    type = 'bar', // bar, line, pie, area, scatter, curve
    title = 'Grafik Data AI',
    data = [{ name: 'Q1', value: 100 }, { name: 'Q2', value: 250 }, { name: 'Q3', value: 400 }],
    equation = 'sine', // sine, exponential, linear, bell
    amplitude = 50,
    color = '#ff6b00',
    palette = ['#ff6b00', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
  }) => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 540;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border Container
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Title
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvas.width / 2, 45);

    const margin = { top: 75, right: 50, bottom: 65, left: 75 };
    const chartW = canvas.width - margin.left - margin.right;
    const chartH = canvas.height - margin.top - margin.bottom;

    if (type === 'curve') {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1.5;
      for (let x = margin.left; x <= margin.left + chartW; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, margin.top); ctx.lineTo(x, margin.top + chartH); ctx.stroke();
      }
      for (let y = margin.top; y <= margin.top + chartH; y += 50) {
        ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(margin.left + chartW, y); ctx.stroke();
      }

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(margin.left, margin.top + chartH);
      ctx.lineTo(margin.left + chartW, margin.top + chartH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(margin.left, margin.top);
      ctx.lineTo(margin.left, margin.top + chartH);
      ctx.stroke();

      ctx.strokeStyle = color || '#ff6b00';
      ctx.lineWidth = 4.5;
      ctx.beginPath();

      const startX = margin.left;
      const endX = margin.left + chartW;
      const centerY = margin.top + chartH;

      for (let px = startX; px <= endX; px++) {
        const x = (px - startX) / chartW;
        let y = 0;

        if (equation === 'sine') {
          y = Math.sin(x * Math.PI * 4) * (amplitude / 100);
        } else if (equation === 'exponential') {
          y = Math.pow(x, 2) * (amplitude / 100);
        } else if (equation === 'linear') {
          y = x * (amplitude / 100);
        } else if (equation === 'bell') {
          const mean = 0.5;
          const stdDev = 0.15;
          y = Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2)) * (amplitude / 100);
        }

        const py = centerY - (y * (chartH - 25));
        if (px === startX) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('0.0', margin.left, margin.top + chartH + 24);
      ctx.fillText('0.5', margin.left + chartW / 2, margin.top + chartH + 24);
      ctx.fillText('1.0', margin.left + chartW, margin.top + chartH + 24);

    } else if (type === 'pie') {
      const total = data.reduce((acc, d) => acc + (Number(d.value) || 0), 0) || 1;
      const centerX = canvas.width / 2 - 90;
      const centerY = margin.top + chartH / 2;
      const radius = Math.min(chartW, chartH) / 2 - 15;

      let startAngle = 0;
      data.forEach((d, idx) => {
        const val = Number(d.value) || 0;
        const sliceAngle = (val / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;

        ctx.fillStyle = palette[idx % palette.length];
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        startAngle = endAngle;
      });

      let legendY = margin.top + 25;
      const legendX = canvas.width - 230;
      ctx.textAlign = 'left';
      ctx.font = '14px sans-serif';
      data.forEach((d, idx) => {
        const val = Number(d.value) || 0;
        const pct = Math.round((val / total) * 100);
        ctx.fillStyle = palette[idx % palette.length];
        ctx.fillRect(legendX, legendY, 18, 18);
        ctx.fillStyle = '#334155';
        ctx.fillText(`${d.name}: ${val} (${pct}%)`, legendX + 28, legendY + 14);
        legendY += 32;
      });

    } else if (type === 'bar') {
      const maxVal = Math.max(...data.map(d => Number(d.value) || 0), 10);
      const barWidth = Math.min(70, (chartW / data.length) * 0.55);
      const gap = chartW / data.length;

      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= 5; i++) {
        const y = margin.top + (chartH / 5) * i;
        const valLabel = Math.round(maxVal - (maxVal / 5) * i);
        ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(margin.left + chartW, y); ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(String(valLabel), margin.left - 12, y + 4);
      }

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(margin.left, margin.top + chartH);
      ctx.lineTo(margin.left + chartW, margin.top + chartH);
      ctx.stroke();

      data.forEach((d, idx) => {
        const val = Number(d.value) || 0;
        const barH = (val / maxVal) * (chartH - 25);
        const x = margin.left + idx * gap + (gap - barWidth) / 2;
        const y = margin.top + chartH - barH;

        const grad = ctx.createLinearGradient(x, y, x, y + barH);
        grad.addColorStop(0, palette[idx % palette.length]);
        grad.addColorStop(1, palette[idx % palette.length] + 'cc');

        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, barWidth, barH, [8, 8, 0, 0]);
        else ctx.fillRect(x, y, barWidth, barH);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(val), x + barWidth / 2, y - 8);

        ctx.fillStyle = '#475569';
        ctx.font = '13px sans-serif';
        ctx.fillText(d.name, x + barWidth / 2, margin.top + chartH + 24);
      });

    } else if (type === 'line' || type === 'area' || type === 'scatter') {
      const maxVal = Math.max(...data.map(d => Number(d.value) || 0), 10);
      const stepX = chartW / Math.max(data.length - 1, 1);

      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= 5; i++) {
        const y = margin.top + (chartH / 5) * i;
        const valLabel = Math.round(maxVal - (maxVal / 5) * i);
        ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(margin.left + chartW, y); ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(String(valLabel), margin.left - 12, y + 4);
      }

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(margin.left, margin.top + chartH);
      ctx.lineTo(margin.left + chartW, margin.top + chartH);
      ctx.stroke();

      const points = data.map((d, idx) => {
        const val = Number(d.value) || 0;
        const x = margin.left + idx * stepX;
        const y = margin.top + chartH - (val / maxVal) * (chartH - 25);
        return { x, y, val, name: d.name };
      });

      if (type === 'area') {
        ctx.fillStyle = (color || '#ff6b00') + '30';
        ctx.beginPath();
        ctx.moveTo(points[0].x, margin.top + chartH);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, margin.top + chartH);
        ctx.closePath();
        ctx.fill();
      }

      if (type === 'line' || type === 'area') {
        ctx.strokeStyle = color || '#ff6b00';
        ctx.lineWidth = 4;
        ctx.beginPath();
        points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      }

      points.forEach(p => {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color || '#ff6b00';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(p.val), p.x, p.y - 12);

        ctx.fillStyle = '#475569';
        ctx.font = '13px sans-serif';
        ctx.fillText(p.name, p.x, margin.top + chartH + 24);
      });
    }

    return canvas.toDataURL('image/png');
  };

  // ===== SMART IMAGE & PHOTO PLACEMENT GENERATOR =====
  const createImageHtml = ({
    src,
    align = 'center', // center, float-left, float-right, left, right
    width = '60%', // 25%, 33%, 50%, 75%, 100%
    styleType = 'shadow', // shadow, border, rounded, polaroid
    caption = ''
  }) => {
    if (!src) return '';
    const isFloat = align === 'float-left' || align === 'float-right';
    const floatVal = align === 'float-left' ? 'left' : align === 'float-right' ? 'right' : 'none';
    const marginVal = align === 'float-left' ? '0 18px 14px 0' : align === 'float-right' ? '0 0 14px 18px' : '18px auto';
    const textAlignVal = align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';

    let borderStyle = 'none';
    let borderRadius = '6px';
    let boxShadow = '0 4px 18px rgba(0,0,0,0.1)';

    if (styleType === 'border') {
      borderStyle = '2px solid #cbd5e1';
    } else if (styleType === 'rounded') {
      borderRadius = '16px';
      boxShadow = '0 10px 30px rgba(0,0,0,0.14)';
    } else if (styleType === 'polaroid') {
      borderStyle = '12px solid #ffffff';
      boxShadow = '0 12px 35px rgba(0,0,0,0.18)';
    }

    return `<div class="docx-image-block" data-img-wrapper="true" data-align="${align}" data-width="${width}" style="display:${isFloat ? 'inline-block' : 'block'}; text-align:${textAlignVal}; float:${floatVal}; margin:${marginVal}; width:${width}; max-width:100%; clear:${isFloat ? 'none' : 'both'};" contenteditable="false">
      <img src="${src}" style="width:100%; height:auto; border-radius:${borderRadius}; box-shadow:${boxShadow}; border:${borderStyle}; display:block; margin:0 auto;" />
      ${caption ? `<p style="font-size:12px; color:#475569; font-weight:600; text-align:center; margin-top:6px; margin-bottom:0;">📷 ${caption}</p>` : ''}
    </div>${isFloat ? '' : '<p>&nbsp;</p>'}`;
  };

  // ===== DOCX CHART OPERATIONS =====
  const insertChart = () => {
    const dataUrl = generateChartPngDataUrl({ type: chartType, title: chartTitle, data: chartData });
    const chartHtml = createImageHtml({ src: dataUrl, align: 'center', width: '85%', caption: `📊 ${chartTitle}` });
    
    if (pageRef.current) {
      pageRef.current.focus();
      document.execCommand('insertHTML', false, chartHtml);
      docxTextRef.current = pageRef.current.innerHTML;
      syncDocxContent();
    }
    setShowChartModal(false);
  };

  const updateChartData = (text) => {
    try {
      const lines = text.trim().split('\n');
      const parsed = lines.map(line => {
        const [name, value] = line.split(':').map(s => s.trim());
        return { name, value: parseInt(value) || 0 };
      }).filter(d => d.name && d.value);
      if (parsed.length > 0) setChartData(parsed);
    } catch (_e) {
      console.warn('Chart data parse error');
    }
  };

  const deleteChart = (chartIdx) => {
    setDocxCharts(prev => prev.filter((_, i) => i !== chartIdx));
  };

  const renderChart = (chart) => {
    const chartColors = ['#4472c4', '#70ad47', '#ed7d31', '#ffc000', '#5b9bd5'];
    if (chart.type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#4472c4" />
          </BarChart>
        </ResponsiveContainer>
      );
    } else if (chart.type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#4472c4" />
          </LineChart>
        </ResponsiveContainer>
      );
    } else if (chart.type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie dataKey="value" data={chart.data} cx="50%" cy="50%" labelLine={false} label>
              {chart.data.map((_, idx) => (
                <Cell key={idx} fill={chartColors[idx % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    }
  };

  // ===== DOCX SMART IMAGE & PHOTO PLACEMENT =====
  const handleImageFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (typeof dataUrl === 'string') {
        setImgDataUrl(dataUrl);
        if (!imgCaption) setImgCaption(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAiAutoLayoutImage = () => {
    if (!imgDataUrl) return;
    const img = new Image();
    img.src = imgDataUrl;
    img.onload = () => {
      const aspect = img.width / img.height;
      if (aspect < 0.85) {
        // Portrait photo -> float right 35%
        setImgAlign('float-right');
        setImgWidth('35%');
        setImgStyleType('shadow');
      } else if (aspect > 1.3) {
        // Landscape photo -> center 80%
        setImgAlign('center');
        setImgWidth('80%');
        setImgStyleType('rounded');
      } else {
        // Square photo -> float left 40%
        setImgAlign('float-left');
        setImgWidth('40%');
        setImgStyleType('border');
      }
    };
  };

  const handleInsertSmartImage = () => {
    if (!imgDataUrl) return;
    const imgHtml = createImageHtml({
      src: imgDataUrl,
      align: imgAlign,
      width: imgWidth,
      styleType: imgStyleType,
      caption: imgCaption
    });

    if (pageRef.current) {
      pageRef.current.focus();
      document.execCommand('insertHTML', false, imgHtml);
      docxTextRef.current = pageRef.current.innerHTML;
      syncDocxContent();
    }
    setShowInsertImage(false);
    setImgDataUrl('');
    setImgCaption('');
  };

  // ===== DOCX INSERT RIBBON ACTIONS =====
  const insertCoverPage = () => {
    if (pageRef.current) {
      pageRef.current.focus();
      const coverHtml = `
        <div class="word-cover-page" style="page-break-after: always; height: 950px; display: flex; flex-direction: column; justify-content: space-between; padding: 60px 40px; border: 1px solid #e2e8f0; margin-bottom: 40px; box-sizing: border-box; background: #fafafa; position: relative; font-family: 'Segoe UI', Arial, sans-serif;" contenteditable="false">
          <div style="border-top: 8px solid #106ebe; padding-top: 20px;">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; color: #106ebe; font-weight: 700;">Laporan Resmi / Official Report</div>
            <h1 style="font-size: 32px; margin: 15px 0 5px 0; color: #1f2937; font-weight: 800; line-height: 1.2;">${documentTitle}</h1>
            <div style="font-size: 16px; color: #4b5563; font-style: italic; margin-top: 5px;">Subjudul Laporan Dokumen</div>
          </div>
          <div style="margin: 40px 0; flex-grow: 1; border-left: 3px solid #106ebe; padding-left: 20px; display: flex; align-items: center;">
            <p style="color: #6b7280; font-size: 13px; line-height: 1.6; max-width: 500px;">Dokumen ini disusun menggunakan Deepernova Word Agent. Berisi ringkasan eksekutif, analisis data komprehensif, serta visualisasi grafik resmi perusahaan.</p>
          </div>
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase;">Dipersiapkan Oleh:</div>
              <div style="font-size: 13px; font-weight: 600; color: #374151;">Deepernova AI Agent</div>
            </div>
            <div>
              <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase;">Tanggal:</div>
              <div style="font-size: 13px; font-weight: 600; color: #374151;">${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
        </div>
        <p>&nbsp;</p>
      `;
      const originalHtml = pageRef.current.innerHTML;
      pageRef.current.innerHTML = coverHtml + originalHtml;
      docxTextRef.current = pageRef.current.innerHTML;
      syncDocxContent();
    }
  };

  const insertBlankPage = () => {
    const blankHtml = '<div style="page-break-after: always; height: 10px;"></div><p>&nbsp;</p>';
    applyFormatting('insertHTML', blankHtml);
  };

  const insertOnlinePicture = () => {
    setInsertParam1('office');
    setActiveInsertModal('online_picture');
  };

  const insertShape = (shapeType) => {
    let shapeHtml = '';
    if (shapeType === 'rect') {
      shapeHtml = '<div style="text-align:center; margin:14px 0;"><svg width="200" height="100"><rect width="200" height="100" style="fill:#106ebe;stroke-width:2;stroke:#005a9e" /></svg></div><p>&nbsp;</p>';
    } else if (shapeType === 'circle') {
      shapeHtml = '<div style="text-align:center; margin:14px 0;"><svg width="100" height="100"><circle cx="50" cy="50" r="40" style="fill:#106ebe;stroke-width:2;stroke:#005a9e" /></svg></div><p>&nbsp;</p>';
    } else if (shapeType === 'arrow') {
      shapeHtml = '<div style="text-align:center; margin:14px 0;"><svg width="150" height="50"><path d="M0,20 L100,20 L100,10 L140,25 L100,40 L100,30 L0,30 Z" style="fill:#106ebe;stroke-width:1;stroke:#005a9e" /></svg></div><p>&nbsp;</p>';
    } else if (shapeType === 'star') {
      shapeHtml = '<div style="text-align:center; margin:14px 0;"><svg width="100" height="100"><polygon points="50,9 60,40 90,40 65,60 75,90 50,70 25,90 35,60 10,40 40,40" style="fill:#f97316;stroke-width:2;stroke:#ea580c" /></svg></div><p>&nbsp;</p>';
    }
    if (pageRef.current && shapeHtml) {
      pageRef.current.focus();
      document.execCommand('insertHTML', false, shapeHtml);
      docxTextRef.current = pageRef.current.innerHTML;
      syncDocxContent();
    }
  };

  const insertIcon = () => {
    setActiveInsertModal('icon');
  };

  const insert3DModel = () => {
    const modelHtml = `
      <div style="display:flex; justify-content:center; margin:20px 0;" contenteditable="false">
        <div style="width: 100px; height: 100px; perspective: 300px;">
          <div style="width: 100%; height: 100%; position: relative; transform-style: preserve-3d; animation: spin3D 8s infinite linear;">
            <div style="position: absolute; width: 100px; height: 100px; background: rgba(16, 110, 238, 0.6); border: 2px solid #106ebe; transform: translateZ(50px); display:flex; align-items:center; justify-content:center; color:white; font-size:10px; font-weight:bold;">FRONT</div>
            <div style="position: absolute; width: 100px; height: 100px; background: rgba(16, 110, 238, 0.6); border: 2px solid #106ebe; transform: rotateY(180deg) translateZ(50px); display:flex; align-items:center; justify-content:center; color:white; font-size:10px; font-weight:bold;">BACK</div>
            <div style="position: absolute; width: 100px; height: 100px; background: rgba(16, 110, 238, 0.6); border: 2px solid #106ebe; transform: rotateY(90deg) translateZ(50px); display:flex; align-items:center; justify-content:center; color:white; font-size:10px; font-weight:bold;">RIGHT</div>
            <div style="position: absolute; width: 100px; height: 100px; background: rgba(16, 110, 238, 0.6); border: 2px solid #106ebe; transform: rotateY(-90deg) translateZ(50px); display:flex; align-items:center; justify-content:center; color:white; font-size:10px; font-weight:bold;">LEFT</div>
            <div style="position: absolute; width: 100px; height: 100px; background: rgba(16, 110, 238, 0.6); border: 2px solid #106ebe; transform: rotateX(90deg) translateZ(50px); display:flex; align-items:center; justify-content:center; color:white; font-size:10px; font-weight:bold;">TOP</div>
            <div style="position: absolute; width: 100px; height: 100px; background: rgba(16, 110, 238, 0.6); border: 2px solid #106ebe; transform: rotateX(-90deg) translateZ(50px); display:flex; align-items:center; justify-content:center; color:white; font-size:10px; font-weight:bold;">BOTTOM</div>
          </div>
        </div>
      </div>
      <style>
        @keyframes spin3D {
          from { transform: rotateX(0deg) rotateY(0deg); }
          to { transform: rotateX(360deg) rotateY(360deg); }
        }
      </style>
      <p>&nbsp;</p>
    `;
    if (pageRef.current) {
      pageRef.current.focus();
      document.execCommand('insertHTML', false, modelHtml);
      docxTextRef.current = pageRef.current.innerHTML;
      syncDocxContent();
    }
  };

  const insertSmartArt = () => {
    const smartArtHtml = `
      <div style="display:flex; justify-content:center; gap:16px; margin:20px 0; font-family:sans-serif;" contenteditable="false">
        <div style="flex:1; background:#eff6ff; border:1px solid #3b82f6; border-radius:8px; padding:12px; text-align:center;">
          <div style="font-weight:700; color:#1d4ed8; font-size:12px;">LANGKAH 1</div>
          <div style="font-size:11px; color:#1e3a8a; margin-top:4px;">Inisiasi & Perencanaan</div>
        </div>
        <div style="display:flex; align-items:center; color:#3b82f6; font-weight:bold;">➔</div>
        <div style="flex:1; background:#f0fdf4; border:1px solid #22c55e; border-radius:8px; padding:12px; text-align:center;">
          <div style="font-weight:700; color:#15803d; font-size:12px;">LANGKAH 2</div>
          <div style="font-size:11px; color:#14532d; margin-top:4px;">Eksekusi & Desain</div>
        </div>
        <div style="display:flex; align-items:center; color:#22c55e; font-weight:bold;">➔</div>
        <div style="flex:1; background:#fff7ed; border:1px solid #f97316; border-radius:8px; padding:12px; text-align:center;">
          <div style="font-weight:700; color:#c2410c; font-size:12px;">LANGKAH 3</div>
          <div style="font-size:11px; color:#7c2d12; margin-top:4px;">Evaluasi & Serah Terima</div>
        </div>
      </div>
      <p>&nbsp;</p>
    `;
    if (pageRef.current) {
      pageRef.current.focus();
      document.execCommand('insertHTML', false, smartArtHtml);
      docxTextRef.current = pageRef.current.innerHTML;
      syncDocxContent();
    }
  };

  const insertScreenshot = () => {
    const screenshotHtml = `
      <div style="text-align:center; margin:16px 0;" contenteditable="false">
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; max-width: 450px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          <div style="background:#f1f5f9; padding:6px 12px; border-bottom:1px solid #e2e8f0; display:flex; gap:4px; align-items:center;">
            <span style="width:8px; height:8px; border-radius:50%; background:#ef4444; display:inline-block;"></span>
            <span style="width:8px; height:8px; border-radius:50%; background:#eab308; display:inline-block;"></span>
            <span style="width:8px; height:8px; border-radius:50%; background:#22c55e; display:inline-block;"></span>
            <span style="font-size:10px; color:#64748b; margin-left:8px; font-family:monospace;">dashboard_snapshot.png</span>
          </div>
          <div style="background:#ffffff; padding:20px; display:flex; flex-direction:column; gap:8px; text-align:left;">
            <div style="height:12px; width:60%; background:#e2e8f0; border-radius:4px;"></div>
            <div style="height:8px; width:90%; background:#f1f5f9; border-radius:4px;"></div>
            <div style="height:8px; width:80%; background:#f1f5f9; border-radius:4px;"></div>
            <div style="display:flex; gap:8px; margin-top:10px;">
              <div style="flex:1; height:40px; background:#eff6ff; border-radius:4px; border:1px solid #3b82f6;"></div>
              <div style="flex:1; height:40px; background:#f0fdf4; border-radius:4px; border:1px solid #22c55e;"></div>
            </div>
          </div>
        </div>
        <p style="font-size:10px; color:#64748b; margin-top:4px;">Tangkapan Layar Sistem (Screenshot Preview)</p>
      </div>
      <p>&nbsp;</p>
    `;
    if (pageRef.current) {
      pageRef.current.focus();
      document.execCommand('insertHTML', false, screenshotHtml);
      docxTextRef.current = pageRef.current.innerHTML;
      syncDocxContent();
    }
  };

  const insertBookmark = () => {
    setInsertParam1('Penunjuk1');
    setActiveInsertModal('bookmark');
  };

  const insertComment = () => {
    setInsertParam1('');
    setActiveInsertModal('comment');
  };

  const insertTextBox = () => {
    const boxHtml = `
      <div style="border: 1px solid #106ebe; background: #f3f8fc; padding: 16px; border-radius: 6px; margin: 14px 0; max-width: 320px;" class="word-textbox">
        <p style="margin: 0; font-size: 13px; color: #1e293b; font-weight: 500;"><strong>Kotak Teks (Text Box)</strong></p>
        <p style="margin: 6px 0 0 0; font-size: 12px; color: #475569; line-height: 1.5;">Masukkan dan sunting teks penting Anda di dalam kotak ini.</p>
      </div>
      <p>&nbsp;</p>
    `;
    if (pageRef.current) {
      pageRef.current.focus();
      document.execCommand('insertHTML', false, boxHtml);
      docxTextRef.current = pageRef.current.innerHTML;
      syncDocxContent();
    }
  };

  const insertEquation = () => {
    const eqHtml = `<span style="font-family: 'Cambria Math', 'Times New Roman', serif; font-style: italic; font-size: 14px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 4px; display: inline-block; margin: 4px 0;">f(x) = a₀ + ∑ (aₙ cos(nπx/L) + bₙ sin(nπx/L))</span>`;
    applyFormatting('insertHTML', eqHtml);
  };

  const insertSymbol = () => {
    setActiveInsertModal('symbol');
  };

  const showAddinsAlert = () => {
    setActiveInsertModal('addins');
  };

  const insertWikipediaReference = () => {
    setInsertParam1('Kecerdasan Buatan');
    setActiveInsertModal('wikipedia');
  };

  const insertOnlineVideo = () => {
    setInsertParam1('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    setActiveInsertModal('video');
  };

  const promptHeader = () => {
    setInsertParam1(docxHeader || '');
    setActiveInsertModal('header');
  };

  const promptFooter = () => {
    setInsertParam1(docxFooter || '');
    setActiveInsertModal('footer');
  };

  const togglePageNumbers = () => {
    setShowPageNumbers(prev => !prev);
  };

  useEffect(() => {
    if (editorType === 'docx' && pageRef.current) {
      const html = content[0]?.text || '';
      if (pageRef.current.innerHTML !== html) {
        pageRef.current.innerHTML = html;
      }
    }
  }, [editorType, content]);

  const handleNewDocument = () => {
    if (confirm('Buat dokumen baru? Konten yang belum tersimpan akan hilang.')) {
      setActiveCloudFileId(null);
      setDocumentTitle('Untitled Document');
      if (editorType === 'excel') {
        setExcelSheets([createSheet('Sheet1', 20, 10)]);
        setActiveSheet(0);
      } else {
        setContent([{ id: Date.now(), type: 'html', text: '' }]);
        if (pageRef.current) pageRef.current.innerHTML = '';
      }
    }
  };

  const handleOpenFromCloud = () => {
    setExplorerMode('open');
    setSelectedCloudFile(null);
    setShowCloudModal(true);
    fetchCloudFiles();
  };

  const handleSaveToCloud = () => {
    if (activeCloudFileId) {
      saveActiveFileToCloud(documentTitle);
    } else {
      setExplorerMode('save');
      setCloudFileName(documentTitle);
      setSelectedCloudFile(null);
      setShowCloudModal(true);
      fetchCloudFiles();
    }
  };

  const handleSaveAsToCloud = () => {
    setExplorerMode('save');
    setCloudFileName(documentTitle);
    setSelectedCloudFile(null);
    setShowCloudModal(true);
    fetchCloudFiles();
  };

  const renderDocxEditor = () => {
    return (
      <div className="docx-editor-wrapper">
        {/* Microsoft Word Ribbon Toolbar Content */}
        <div className="word-toolbar" style={{ display: isRibbonCollapsed ? 'none' : 'flex' }}>
          {activeRibbonTab === 'file' && (
            <>
              {/* Group 1: New/Open/Save/Save As */}
              <div className="toolbar-group" title="Berkas Cloud">
                <button className="toolbar-btn" onClick={handleNewDocument} title="Dokumen Baru"><i className="fas fa-file-alt" style={{ marginRight: 6 }}></i> Baru</button>
                <button className="toolbar-btn" onClick={handleOpenFromCloud} title="Buka dari Cloud"><i className="fas fa-folder-open" style={{ marginRight: 6 }}></i> Buka</button>
                <button className="toolbar-btn" onClick={handleSaveToCloud} title="Simpan ke Cloud"><i className="fas fa-save" style={{ marginRight: 6 }}></i> Simpan</button>
                <button className="toolbar-btn" onClick={handleSaveAsToCloud} title="Simpan Sebagai..."><i className="fas fa-file-export" style={{ marginRight: 6 }}></i> Simpan Sebagai</button>
              </div>
            </>
          )}
          {activeRibbonTab === 'home' && (
            <>
              {/* Group 0: Clipboard */}
              <div className="toolbar-group" title="Papan Klip (Clipboard)">
                <button 
                  className="toolbar-btn" 
                  onClick={() => {
                    navigator.clipboard.readText().then(text => {
                      document.execCommand('insertText', false, text);
                    }).catch(() => {
                      alert('Gunakan pintasan keyboard Ctrl+V untuk menempel teks.');
                    });
                  }} 
                  title="Tempel (Paste)"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '11px', padding: '4px 8px' }}
                >
                  <i className="fas fa-paste" style={{ fontSize: '20px', marginBottom: '2px' }}></i>
                  <span>Tempel</span>
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button className="toolbar-btn" style={{ padding: '2px 6px', fontSize: '11px', gap: '4px' }} onClick={() => formatText('cut')} title="Potong (Cut)"><i className="fas fa-cut" style={{ fontSize: '11px' }}></i> Potong</button>
                  <button className="toolbar-btn" style={{ padding: '2px 6px', fontSize: '11px', gap: '4px' }} onClick={() => formatText('copy')} title="Salin (Copy)"><i className="fas fa-copy" style={{ fontSize: '11px' }}></i> Salin</button>
                </div>
              </div>

              {/* Group 1: History */}
              <div className="toolbar-group" title="Riwayat">
                <button className="toolbar-btn" onClick={() => { if (editorType === 'docx') { undoDoc(); } else { formatText('undo'); } }} title="Batal (Undo)"><i className="fas fa-undo"></i></button>
                <button className="toolbar-btn" onClick={() => { if (editorType === 'docx') { redoDoc(); } else { formatText('redo'); } }} title="Ulangi (Redo)"><i className="fas fa-redo"></i></button>
                {editorType === 'docx' && (
                  <button className={`toolbar-btn ${showHistoryPanel ? 'active' : ''}`} onClick={() => setShowHistoryPanel(!showHistoryPanel)} title="Lihat Riwayat Versi"><i className="fas fa-history"></i></button>
                )}
              </div>
              
              {/* Group 2: Typography family & size & line spacing */}
              <div className="toolbar-group" title="Huruf">
                <select 
                  value={fontFamily} 
                  onChange={e => handleFontFamily(e.target.value)} 
                  className="toolbar-select" 
                  title="Jenis Huruf"
                  style={{ fontFamily: fontFamily, fontSize: '13px', minWidth: '150px' }}
                >
                  {[
                    // Serif
                    'Times New Roman', 'Georgia', 'Garamond', 'Bookman', 'PT Serif', 'Lora', 'Merriweather', 'Playfair Display', 'Cinzel', 'Cinzel Decorative',
                    // Sans-serif
                    'Arial', 'Calibri', 'Verdana', 'Helvetica', 'Trebuchet MS', 'Inter', 'Montserrat', 'Roboto', 'Outfit', 'Poppins', 'Lato', 'Nunito', 'Raleway', 'Ubuntu', 'Open Sans', 'Quicksand',
                    // Monospace
                    'Courier New', 'Fira Code', 'Consolas', 'Monaco', 'Source Code Pro',
                    // Handwriting / Script / Fun
                    'Dancing Script', 'Pacifico', 'Caveat', 'Indie Flower', 'Shadows Into Light', 'Comic Sans MS',
                    // Display / Impact
                    'Impact', 'Arial Black', 'Bebas Neue'
                  ].map(f => (
                    <option key={f} value={f} style={{ fontFamily: f, fontSize: '15px', background: '#2b2b2b', color: '#ffffff' }}>
                      {f}
                    </option>
                  ))}
                </select>
                <select value={fontSize} onChange={e => handleFontSize(e.target.value)} className="toolbar-select" title="Ukuran Huruf">
                  {[10,11,12,13,14,16,18,20,24,28,32,36,48,72].map(s => (
                    <option key={s} value={`${s}pt`}>{s}</option>
                  ))}
                </select>
                {/* Text Case Changer dropdown */}
                <select onChange={e => { if(e.target.value) { changeTextCase(e.target.value); e.target.value = ''; } }} className="toolbar-select" title="Ubah Kapitalisasi (Change Case)" style={{ width: '60px' }}>
                  <option value="">Aa</option>
                  <option value="upper">UPPERCASE</option>
                  <option value="lower">lowercase</option>
                  <option value="capitalize">Capitalize Each Word</option>
                  <option value="sentence">Sentence case</option>
                </select>
                <select value={lineSpacing} onChange={e => handleLineSpacing(e.target.value)} className="toolbar-select" title="Spasi Baris (Line Spacing)">
                  <option value="1.0">Spasi 1.0</option>
                  <option value="1.15">Spasi 1.15</option>
                  <option value="1.5">Spasi 1.5</option>
                  <option value="2.0">Spasi 2.0</option>
                </select>
              </div>

              {/* Group 3: Core formatting */}
              <div className="toolbar-group" title="Pemformatan Teks">
                <button className="toolbar-btn" onClick={() => formatText('bold')} title="Tebal (Bold)"><i className="fas fa-bold"></i></button>
                <button className="toolbar-btn" onClick={() => formatText('italic')} title="Miring (Italic)"><i className="fas fa-italic"></i></button>
                <button className="toolbar-btn" onClick={() => formatText('underline')} title="Garis Bawah (Underline)"><i className="fas fa-underline"></i></button>
                <button className="toolbar-btn" onClick={() => formatText('strikeThrough')} title="Coret (Strikethrough)"><i className="fas fa-strikethrough"></i></button>
                {/* Subscript / Superscript */}
                <button className="toolbar-btn" onClick={() => applyFormatting('subscript')} title="Subskrip (x₂)"><i className="fas fa-subscript"></i></button>
                <button className="toolbar-btn" onClick={() => applyFormatting('superscript')} title="Superskrip (x²)"><i className="fas fa-superscript"></i></button>
              </div>

              {/* Group 4: Colors & Eraser */}
              <div className="toolbar-group" title="Warna & Bersihkan">
                <label className="toolbar-btn color-picker-label" title="Warna Huruf (Text Color)">
                  <i className="fas fa-font"></i>
                  <input type="color" value={textColor} onChange={e => handleTextColor(e.target.value)} className="toolbar-color-input" />
                </label>
                <label className="toolbar-btn color-picker-label" title="Warna Stabilo (Highlight Color)">
                  <i className="fas fa-highlighter"></i>
                  <input type="color" value={highlightColor} onChange={e => handleHighlightColor(e.target.value)} className="toolbar-color-input" />
                </label>
                <button className="toolbar-btn" onClick={handleClearFormatting} title="Hapus Pemformatan"><i className="fas fa-eraser"></i></button>
              </div>

              {/* Group 5: Alignments & Indents */}
              <div className="toolbar-group" title="Perataan Paragraf">
                <button className="toolbar-btn" onClick={() => formatText('justifyLeft')} title="Rata Kiri"><i className="fas fa-align-left"></i></button>
                <button className="toolbar-btn" onClick={() => formatText('justifyCenter')} title="Rata Tengah"><i className="fas fa-align-center"></i></button>
                <button className="toolbar-btn" onClick={() => formatText('justifyRight')} title="Rata Kanan"><i className="fas fa-align-right"></i></button>
                <button className="toolbar-btn" onClick={() => formatText('justifyFull')} title="Rata Kanan-Kiri (Justify)"><i className="fas fa-align-justify"></i></button>
                <button className="toolbar-btn" onClick={() => formatText('outdent')} title="Kurangi Indentasi"><i className="fas fa-outdent"></i></button>
                <button className="toolbar-btn" onClick={() => formatText('indent')} title="Tambah Indentasi"><i className="fas fa-indent"></i></button>
                {/* Toggle Formatting Marks (¶) */}
                <button className={`toolbar-btn ${showFormattingMarks ? 'active' : ''}`} onClick={() => setShowFormattingMarks(!showFormattingMarks)} title="Tampilkan Tanda Paragraf (¶)"><i className="fas fa-paragraph"></i></button>
              </div>

              {/* Group 6: Lists */}
              <div className="toolbar-group" title="Daftar (Lists)">
                <button className="toolbar-btn" onClick={() => formatText('insertUnorderedList')} title="Daftar Simbol (Bullet List)"><i className="fas fa-list-ul"></i></button>
                <button className="toolbar-btn" onClick={() => formatText('insertOrderedList')} title="Daftar Angka (Numbered List)"><i className="fas fa-list-ol"></i></button>
              </div>

              {/* Group 7: Styles */}
              <div className="toolbar-group" title="Gaya (Styles)">
                <button className="toolbar-btn" onClick={() => formatText('formatBlock', 'p')} style={{ fontWeight: 'normal' }} title="Teks Normal">Normal</button>
                <button className="toolbar-btn" onClick={() => formatText('formatBlock', 'h1')} style={{ fontWeight: 'bold' }} title="Heading 1">Heading 1</button>
                <button className="toolbar-btn" onClick={() => formatText('formatBlock', 'h2')} style={{ fontWeight: 'bold' }} title="Heading 2">Heading 2</button>
                <button className="toolbar-btn" onClick={() => {
                  if (pageRef.current) {
                    pageRef.current.focus();
                    document.execCommand('insertHTML', false, '<h1 class="doc-title" style="font-family:\'Times New Roman\'; font-size:26pt; font-weight:bold; text-align:center; margin-bottom:6pt;">Judul Dokumen</h1><p>&nbsp;</p>');
                  }
                }} style={{ fontWeight: 'bold', fontSize: '13px' }} title="Judul Besar (Title)">Judul</button>
                <button className="toolbar-btn" onClick={() => {
                  if (pageRef.current) {
                    pageRef.current.focus();
                    document.execCommand('insertHTML', false, '<p class="doc-subtitle" style="font-family:\'Times New Roman\'; font-size:16pt; color:#666666; text-align:center; margin-bottom:12pt; font-style:italic;">Subjudul Dokumen</p><p>&nbsp;</p>');
                  }
                }} style={{ fontStyle: 'italic', fontSize: '11px' }} title="Subjudul (Subtitle)">Subjudul</button>
              </div>
            </>
          )}

          {activeRibbonTab === 'insert' && (
            <div style={{ display: 'flex', alignItems: 'center', height: '100%', overflowX: 'auto', background: '#202020', borderBottom: '1px solid #151515', padding: '4px 8px', gap: '2px', width: '100%', boxSizing: 'border-box' }}>
              
              {/* Group 1: Pages */}
              <div className="ribbon-group">
                <div className="ribbon-group-content">
                  <button className="ribbon-large-btn" onClick={insertCoverPage} title="Cover Page">
                    <i className="fas fa-file-alt"></i>
                    <span>Cover Page</span>
                  </button>
                  <div className="ribbon-col-stack">
                    <button className="ribbon-small-btn" onClick={insertBlankPage} title="Blank Page">
                      <i className="fas fa-file"></i>
                      <span>Blank Page</span>
                    </button>
                    <button className="ribbon-small-btn" onClick={insertTableOfContentsInteractive} title="Daftar Isi (Resmi Dotted Leaders)">
                      <i className="fas fa-list-ol"></i>
                      <span>Daftar Isi</span>
                    </button>
                    <button className="ribbon-small-btn" onClick={insertPageBreak} title="Page Break">
                      <i className="fas fa-columns"></i>
                      <span>Page Break</span>
                    </button>
                  </div>
                </div>
                <div className="ribbon-group-label">Pages & TOC</div>
              </div>

              {/* Group 2: Tables */}
              <div className="ribbon-group">
                <div className="ribbon-group-content">
                  <button className="ribbon-large-btn" onClick={() => {
                    const r = prompt("Masukkan jumlah baris tabel (1-20):", "3");
                    const c = prompt("Masukkan jumlah kolom tabel (1-10):", "3");
                    if (r && c) addDocxTable(parseInt(r), parseInt(c));
                  }} title="Table">
                    <i className="fas fa-table"></i>
                    <span>Table</span>
                  </button>
                </div>
                <div className="ribbon-group-label">Tables</div>
              </div>

              {/* Group 3: Illustrations */}
              <div className="ribbon-group">
                <div className="ribbon-group-content">
                  <button className="ribbon-large-btn" onClick={() => setShowInsertImage(true)} title="Pictures (Upload dari perangkat)">
                    <i className="fas fa-image"></i>
                    <span>Pictures</span>
                  </button>
                  
                  <div className="ribbon-col-stack">
                    <button className="ribbon-small-btn" onClick={insertOnlinePicture} title="Online Pictures (Cari gambar online)">
                      <i className="fas fa-globe"></i>
                      <span>Online Pictures</span>
                    </button>
                    <button className="ribbon-small-btn" onClick={() => {
                      const choice = prompt("Pilih bentuk: rect (Kotak), circle (Lingkaran), arrow (Panah), star (Bintang)", "rect");
                      if (choice) insertShape(choice);
                    }} title="Shapes (Sisipkan bentuk SVG)">
                      <i className="fas fa-shapes"></i>
                      <span>Shapes</span>
                    </button>
                  </div>

                  <div className="ribbon-col-stack">
                    <button className="ribbon-small-btn" onClick={insertIcon} title="Icons (Sisipkan emoji/ikon)">
                      <i className="fas fa-smile"></i>
                      <span>Icons</span>
                    </button>
                    <button className="ribbon-small-btn" onClick={insert3DModel} title="3D Models (Sisipkan kubus 3D interaktif)">
                      <i className="fas fa-cube"></i>
                      <span>3D Models</span>
                    </button>
                  </div>

                  <div className="ribbon-col-stack">
                    <button className="ribbon-small-btn" onClick={insertSmartArt} title="SmartArt (Bagan Alur Proses)">
                      <i className="fas fa-project-diagram"></i>
                      <span>SmartArt</span>
                    </button>
                    <button className="ribbon-small-btn" onClick={() => setShowChartModal(true)} title="Chart (Grafik Bar/Line/Pie)">
                      <i className="fas fa-chart-bar"></i>
                      <span>Chart</span>
                    </button>
                  </div>

                  <div className="ribbon-col-stack">
                    <button className="ribbon-small-btn" onClick={insertScreenshot} title="Screenshot (Sisipkan Mockup Tangkapan Layar)">
                      <i className="fas fa-desktop"></i>
                      <span>Screenshot</span>
                    </button>
                  </div>
                </div>
                <div className="ribbon-group-label">Illustrations</div>
              </div>

              {/* Group 4: Add-ins */}
              <div className="ribbon-group">
                <div className="ribbon-group-content">
                  <div className="ribbon-col-stack">
                    <button className="ribbon-small-btn" onClick={showAddinsAlert} title="Get Add-ins">
                      <i className="fas fa-store"></i>
                      <span>Get Add-ins</span>
                    </button>
                    <button className="ribbon-small-btn" onClick={insertWikipediaReference} title="Wikipedia (Sisipkan Referensi Ensiklopedia)">
                      <i className="fab fa-wikipedia-w"></i>
                      <span>Wikipedia</span>
                    </button>
                  </div>
                </div>
                <div className="ribbon-group-label">Add-ins</div>
              </div>

              {/* Group 5: Media */}
              <div className="ribbon-group">
                <div className="ribbon-group-content">
                  <button className="ribbon-large-btn" onClick={insertOnlineVideo} title="Online Video (Sematkan YouTube)">
                    <i className="fas fa-video"></i>
                    <span>Online Video</span>
                  </button>
                </div>
                <div className="ribbon-group-label">Media</div>
              </div>

              {/* Group 6: Links */}
              <div className="ribbon-group">
                <div className="ribbon-group-content">
                  <div className="ribbon-col-stack">
                    <button className="ribbon-small-btn" onClick={promptLink} title="Link">
                      <i className="fas fa-link"></i>
                      <span>Link</span>
                    </button>
                    <button className="ribbon-small-btn" onClick={insertBookmark} title="Bookmark">
                      <i className="fas fa-bookmark"></i>
                      <span>Bookmark</span>
                    </button>
                  </div>
                </div>
                <div className="ribbon-group-label">Links</div>
              </div>

              {/* Group 7: Comments */}
              <div className="ribbon-group">
                <div className="ribbon-group-content">
                  <button className="ribbon-large-btn" onClick={insertComment} title="Comment">
                    <i className="far fa-comment-alt"></i>
                    <span>Comment</span>
                  </button>
                </div>
                <div className="ribbon-group-label">Comments</div>
              </div>

              {/* Group 8: Header & Footer */}
              <div className="ribbon-group">
                <div className="ribbon-group-content">
                  <div className="ribbon-col-stack">
                    <button className="ribbon-small-btn" onClick={promptHeader} title="Header">
                      <i className="fas fa-heading"></i>
                      <span>Header</span>
                    </button>
                    <button className="ribbon-small-btn" onClick={promptFooter} title="Footer">
                      <i className="fas fa-footprint"></i>
                      <span>Footer</span>
                    </button>
                    <button className="ribbon-small-btn" onClick={togglePageNumbers} title="Page Number">
                      <i className="fas fa-hashtag"></i>
                      <span>Page Number: {showPageNumbers ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>
                </div>
                <div className="ribbon-group-label">Header & Footer</div>
              </div>

              {/* Group 9: Text */}
              <div className="ribbon-group">
                <div className="ribbon-group-content">
                  <button className="ribbon-large-btn" onClick={insertTextBox} title="Text Box">
                    <i className="far fa-window-maximize"></i>
                    <span>Text Box</span>
                  </button>
                </div>
                <div className="ribbon-group-label">Text</div>
              </div>

              {/* Group 10: Symbols */}
              <div className="ribbon-group" style={{ borderRight: 'none' }}>
                <div className="ribbon-group-content">
                  <div className="ribbon-col-stack">
                    <button className="ribbon-small-btn" onClick={insertEquation} title="Equation">
                      <i className="fas fa-calculator"></i>
                      <span>Equation</span>
                    </button>
                    <button className="ribbon-small-btn" onClick={insertSymbol} title="Symbol">
                      <i className="fas fa-font"></i>
                      <span>Symbol</span>
                    </button>
                  </div>
                </div>
                <div className="ribbon-group-label">Symbols</div>
              </div>

            </div>
          )}

          {activeRibbonTab === 'layout' && (
            <>
              {/* Layout Display Mode Toggle */}
              <div className="toolbar-group" title="Mode Tampilan">
                <button className={`toolbar-btn ${!isDraftMode ? 'active' : ''}`} onClick={() => setIsDraftMode(false)}>Mode Kertas A4</button>
                <button className={`toolbar-btn ${isDraftMode ? 'active' : ''}`} onClick={() => setIsDraftMode(true)}>Mode Web Fluid</button>
              </div>

              {!isDraftMode && (
                <>
                  {/* Paper Size & Margins & Orientation & Columns & Border */}
                  <div className="toolbar-group" title="Ukuran & Tata Letak">
                    <span style={{ fontSize: 11, color: '#666', padding: '0 4px' }}>Kertas:</span>
                    <select className="toolbar-select" value={paperSize} onChange={e => setPaperSize(e.target.value)}>
                      <option value="a4">A4 (21 x 29.7 cm)</option>
                      <option value="letter">Letter (21.6 x 27.9 cm)</option>
                      <option value="legal">Legal (21.6 x 35.6 cm)</option>
                      <option value="a5">A5 (14.8 x 21 cm)</option>
                      <option value="custom">Kustom...</option>
                    </select>

                    <span style={{ fontSize: 11, color: '#666', padding: '0 4px' }}>Margin:</span>
                    <select className="toolbar-select" value={paperMargin} onChange={e => setPaperMargin(e.target.value)}>
                      <option value="normal">Normal (2.54 cm)</option>
                      <option value="narrow">Sempit (1.27 cm)</option>
                      <option value="wide">Lebar (5.08 cm)</option>
                      <option value="custom">Kustom...</option>
                    </select>

                    <span style={{ fontSize: 11, color: '#666', padding: '0 4px' }}>Orientasi:</span>
                    <select className="toolbar-select" value={paperOrientation} onChange={e => setPaperOrientation(e.target.value)}>
                      <option value="portrait">Tegak (Portrait)</option>
                      <option value="landscape">Mendatar (Landscape)</option>
                    </select>

                    <span style={{ fontSize: 11, color: '#666', padding: '0 4px' }}>Kolom:</span>
                    <select className="toolbar-select" value={pageColumns} onChange={e => setPageColumns(parseInt(e.target.value))}>
                      <option value={1}>1 Kolom</option>
                      <option value={2}>2 Kolom</option>
                      <option value={3}>3 Kolom</option>
                    </select>

                    <span style={{ fontSize: 11, color: '#666', padding: '0 4px' }}>Bingkai:</span>
                    <select className="toolbar-select" value={pageBorder} onChange={e => setPageBorder(e.target.value)}>
                      <option value="none">Tanpa Bingkai</option>
                      <option value="solid">Garis Solid</option>
                      <option value="double">Garis Ganda</option>
                      <option value="dashed">Garis Putus</option>
                    </select>
                  </div>
                </>
              )}

              {/* Lined styles and color themes & Watermark */}
              <div className="toolbar-group" title="Gaya & Tanda Air">
                <span style={{ fontSize: 11, color: '#666', padding: '0 4px' }}>Garis:</span>
                <select className="toolbar-select" value={paperStyle} onChange={e => setPaperStyle(e.target.value)}>
                  <option value="blank">Polos (Blank)</option>
                  <option value="lined">Bergaris (Lined)</option>
                  <option value="grid">Kotak-kotak (Grid)</option>
                  <option value="dotted">Titik-titik (Dotted)</option>
                </select>

                <span style={{ fontSize: 11, color: '#666', padding: '0 4px' }}>Warna:</span>
                <select className="toolbar-select" value={paperTheme} onChange={e => setPaperTheme(e.target.value)}>
                  <option value="white">Putih Bersih</option>
                  <option value="cream">Kuning Cream</option>
                  <option value="yellow">Yellow Pad (Kuning)</option>
                  <option value="kraft">Kraft Cokelat</option>
                  <option value="dark">Dark Slate</option>
                </select>

                <span style={{ fontSize: 11, color: '#666', padding: '0 4px' }}>Tanda Air:</span>
                <select className="toolbar-select" value={watermarkText} onChange={e => setWatermarkText(e.target.value)}>
                  <option value="">Tanpa Tanda Air</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="CONFIDENTIAL">RAHASIA (CONFIDENTIAL)</option>
                  <option value="LAPORAN KEUANGAN">LAPORAN KEUANGAN</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>

              {/* Dynamic Header & Footer inputs */}
              {!isDraftMode && (
                <div className="toolbar-group" title="Kop & Kaki Halaman">
                  <input 
                    type="text" 
                    value={docxHeader} 
                    onChange={e => setDocxHeader(e.target.value)} 
                    placeholder="Header Teks..." 
                    className="toolbar-input" 
                    style={{ width: '100px', padding: '3px 6px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    title="Catatan Kop Atas (Header)"
                  />
                  <input 
                    type="text" 
                    value={docxFooter} 
                    onChange={e => setDocxFooter(e.target.value)} 
                    placeholder="Footer Teks..." 
                    className="toolbar-input" 
                    style={{ width: '100px', padding: '3px 6px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    title="Catatan Kaki Bawah (Footer)"
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#475569', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showPageNumbers} onChange={e => setShowPageNumbers(e.target.checked)} style={{ cursor: 'pointer' }} />
                    No. Halaman
                  </label>
                </div>
              )}
            </>
          )}

          {activeRibbonTab === 'draw' && (
            <>
              {/* Group 1: Tools */}
              <div className="ribbon-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '1px solid #3c3c3c', padding: '0 10px', height: '100%', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                  <button 
                    className={`ribbon-large-btn ${!isDrawingMode ? 'active' : ''}`}
                    onClick={() => {
                      setIsDrawingMode(false);
                      setActivePenId(null);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: !isDrawingMode ? '#333333' : 'transparent',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      gap: '4px'
                    }}
                    title="Pilih / Edit Teks"
                  >
                    <i className="fas fa-mouse-pointer" style={{ fontSize: '18px', color: '#106ebe' }}></i>
                    <span>Select</span>
                  </button>
                  
                  <button 
                    className={`ribbon-large-btn ${isDrawingMode && toolType !== 'eraser' && activePenId === null ? 'active' : ''}`}
                    onClick={() => {
                      setIsDrawingMode(true);
                      setToolType('pen');
                      setActivePenId(null);
                      setPenColor('#000000');
                      setPenWidth(3);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: isDrawingMode && toolType !== 'eraser' && activePenId === null ? '#333333' : 'transparent',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      gap: '4px'
                    }}
                    title="Gambar dengan Sentuhan/Pena"
                  >
                    <i className="fas fa-hand-pointer" style={{ fontSize: '18px', color: '#106ebe' }}></i>
                    <span>Draw Touch</span>
                  </button>
                  
                  <button 
                    className={`ribbon-large-btn ${isDrawingMode && toolType === 'eraser' ? 'active' : ''}`}
                    onClick={() => {
                      setIsDrawingMode(true);
                      setToolType('eraser');
                      setPenWidth(16);
                      setActivePenId('eraser');
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: isDrawingMode && toolType === 'eraser' ? '#333333' : 'transparent',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      gap: '4px'
                    }}
                    title="Hapus Goresan"
                  >
                    <i className="fas fa-eraser" style={{ fontSize: '18px', color: '#e06666' }}></i>
                    <span>Eraser</span>
                  </button>
                </div>
                <div style={{ fontSize: '9px', color: '#888', marginTop: '3px' }}>Tools</div>
              </div>

              {/* Group 2: Pens Rack */}
              <div className="ribbon-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '1px solid #3c3c3c', padding: '0 15px', height: '100%', justifyContent: 'space-between' }}>
                <div className="pens-rack" style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '62px' }}>
                  {[
                    { id: 'black_pen', label: 'Pena', type: 'pen', color: '#000000', width: 2, bodyBg: 'linear-gradient(to right, #444, #111, #444)', stripeColor: '#000000', tipColor: '#000000' },
                    { id: 'red_pen', label: 'Pena', type: 'pen', color: '#ff0000', width: 2, bodyBg: 'linear-gradient(to right, #ff6b6b, #b91c1c, #ff6b6b)', stripeColor: '#ffffff', tipColor: '#ff0000' },
                    { id: 'silver_pen', label: 'Pena', type: 'pen', color: '#7f8c8d', width: 2, bodyBg: 'linear-gradient(to right, #e2e8f0, #94a3b8, #e2e8f0)', stripeColor: '#475569', tipColor: '#7f8c8d' },
                    { id: 'blue_pen', label: 'Pena', type: 'pen', color: '#002060', width: 2, bodyBg: 'linear-gradient(to right, #3b82f6, #1d4ed8, #3b82f6)', stripeColor: '#ffffff', tipColor: '#002060' },
                    { id: 'yellow_highlighter', label: 'Stabilo', type: 'highlighter', color: 'rgba(255, 235, 59, 0.45)', width: 12, bodyBg: 'linear-gradient(to right, #fef08a, #ca8a04, #fef08a)', stripeColor: '#ffff00', tipColor: '#facc15' },
                    { id: 'green_highlighter', label: 'Stabilo', type: 'highlighter', color: 'rgba(74, 222, 128, 0.45)', width: 12, bodyBg: 'linear-gradient(to right, #bbf7d0, #16a34a, #bbf7d0)', stripeColor: '#00ff00', tipColor: '#4ade80' },
                    { id: 'galaxy_pen', label: 'Galaxy', type: 'pen', color: '#a855f7', width: 4, bodyBg: 'linear-gradient(45deg, #a855f7, #6366f1, #ec4899)', stripeColor: '#ffffff', tipColor: '#c084fc' },
                    { id: 'gold_pen', label: 'Emas', type: 'pen', color: '#d97706', width: 3, bodyBg: 'linear-gradient(to right, #fbbf24, #b45309, #fbbf24)', stripeColor: '#fff7ed', tipColor: '#f59e0b' }
                  ].map(p => {
                    const isActive = isDrawingMode && activePenId === p.id;
                    return (
                      <div 
                        key={p.id}
                        className={`word-pen-wrapper ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          setIsDrawingMode(true);
                          setToolType(p.type);
                          setPenColor(p.color);
                          setPenWidth(p.width);
                          setActivePenId(p.id);
                        }}
                      >
                        <div className="word-pen-body" style={{ background: p.bodyBg }}>
                          <div className="word-pen-stripe" style={{ backgroundColor: p.stripeColor }}></div>
                        </div>
                        <div className="word-pen-tip" style={{ borderTopColor: p.tipColor }}></div>
                        <div className="word-pen-label">{p.label}</div>
                      </div>
                    );
                  })}
                  
                  {/* Add Pen Button */}
                  <div 
                    className="word-pen-wrapper add-pen-btn"
                    style={{ opacity: 0.6 }}
                    onClick={() => {
                      const col = window.prompt('Masukkan warna pena kustom (HEX, misal #ff00ff):', penColor);
                      if (col) {
                        setIsDrawingMode(true);
                        setToolType('pen');
                        setPenColor(col);
                        setPenWidth(3);
                        setActivePenId(null);
                      }
                    }}
                  >
                    <div className="word-pen-body" style={{ background: '#333', border: '1px dashed #666', borderBottom: 'none' }}>
                      <div style={{ color: '#fff', fontSize: '9px', textAlign: 'center', marginTop: '10px', fontWeight: 'bold' }}>+</div>
                    </div>
                    <div className="word-pen-tip" style={{ borderTopColor: '#333' }}></div>
                    <div className="word-pen-label">Add Pen</div>
                  </div>
                </div>
                <div style={{ fontSize: '9px', color: '#888', marginTop: '3px' }}>Pens</div>
              </div>

              {/* Group 3: Pen Settings */}
              <div className="ribbon-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '1px solid #3c3c3c', padding: '0 15px', height: '100%', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#d1d5db' }}>
                    <span>Color:</span>
                    <input 
                      type="color" 
                      value={toolType === 'highlighter' ? '#ffff00' : (penColor.startsWith('rgba') ? '#ff0000' : penColor)} 
                      onChange={e => {
                        setIsDrawingMode(true);
                        if (toolType === 'highlighter') {
                          const hex = e.target.value;
                          const r = parseInt(hex.slice(1, 3), 16);
                          const g = parseInt(hex.slice(3, 5), 16);
                          const b = parseInt(hex.slice(5, 7), 16);
                          setPenColor(`rgba(${r}, ${g}, ${b}, 0.45)`);
                        } else {
                          setPenColor(e.target.value);
                          setActivePenId(null);
                        }
                      }} 
                      style={{ border: 'none', padding: 0, width: '22px', height: '22px', cursor: 'pointer', background: 'transparent' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#d1d5db' }}>
                    <span>Thickness:</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="30" 
                      value={penWidth} 
                      onChange={e => {
                        setIsDrawingMode(true);
                        setPenWidth(parseInt(e.target.value));
                      }} 
                      style={{ width: '60px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '10px', color: '#888', minWidth: '22px' }}>{penWidth}px</span>
                  </div>
                </div>
                <div style={{ fontSize: '9px', color: '#888', marginTop: '3px' }}>Settings</div>
              </div>

              {/* Group 4: Convert / Clear */}
              <div className="ribbon-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 15px', height: '100%', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                  <button 
                    className="ribbon-large-btn"
                    onClick={() => {
                      if (window.confirm('Hapus semua coretan pena di dokumen ini?')) {
                        setDrawingPaths([]);
                      }
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: 'transparent',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      gap: '4px'
                    }}
                    title="Hapus Semua Coretan"
                  >
                    <i className="fas fa-trash-alt" style={{ fontSize: '18px', color: '#ef4444' }}></i>
                    <span>Clear Ink</span>
                  </button>
                  
                  <button 
                    className="ribbon-large-btn"
                    onClick={() => alert('Fitur Ink to Shape: Menstabilkan goresan pena Anda menjadi bentuk geometris sempurna (Segitiga, Lingkaran, Kotak).')}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: 'transparent',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      gap: '4px'
                    }}
                    title="Ubah Coretan ke Bentuk Sempurna"
                  >
                    <i className="fas fa-shapes" style={{ fontSize: '18px', color: '#fbbf24' }}></i>
                    <span>Ink to Shape</span>
                  </button>
                </div>
                <div style={{ fontSize: '9px', color: '#888', marginTop: '3px' }}>Convert</div>
              </div>
            </>
          )}

          {activeRibbonTab === 'ai' && (
            <>
              {/* Deepernova AI magic assistant tools */}
              <div className="toolbar-group" title="Bantuan Teks AI">
                <button 
                  className="toolbar-btn" 
                  onClick={handleAiAutocomplete} 
                  title="Lanjutkan Tulisan dengan AI" 
                  style={{ background: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa', border: '1px solid', fontWeight: 600 }}
                >
                  <i className="fas fa-magic" style={{ marginRight: 6 }}></i> Lanjutkan Kalimat
                </button>
                <button 
                  className="toolbar-btn ai-magic-btn" 
                  onClick={handleDocxAiFormat} 
                  title="Rapikan dokumen dengan AI"
                >
                  <i className="fas fa-magic"></i> Format Ulang AI
                </button>
              </div>

              {/* Financial template generator dropdown */}
              <div className="toolbar-group" title="Templat Keuangan Instan">
                <select 
                  onChange={e => { if(e.target.value) { insertFinancialTemplate(e.target.value); e.target.value = ''; } }} 
                  className="toolbar-select ai-template-select" 
                  style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0', border: '1px solid', fontWeight: 600 }}
                >
                  <option value="">📝 Templat Laporan Keuangan...</option>
                  <option value="labarugi">1. Laporan Laba Rugi (Income Statement)</option>
                  <option value="neraca">2. Laporan Neraca Keuangan (Balance Sheet)</option>
                  <option value="aruskas">3. Laporan Arus Kas (Cash Flow)</option>
                </select>
              </div>

              {/* Floating Chat */}
              <div className="toolbar-group" title="Diskusi Dokumen">
                <button 
                  className={`toolbar-btn ${showBrainstormChat ? 'active' : ''}`}
                  onClick={() => openBrainstormChat()}
                  style={{ fontWeight: 600 }}
                >
                  💡 Diskusi Melayang
                </button>
              </div>

              {/* Smart Coding & Audit Tools */}
              {editorType === 'docx' && (
                <div className="toolbar-group" title="Smart Coding & Audit">
                  <button 
                    className={`toolbar-btn ${showTypoPanel ? 'active' : ''}`}
                    onClick={() => {
                      if (!showTypoPanel && detectedTypos.length === 0) {
                        handleStartDocumentAudit('');
                      } else {
                        setShowTypoPanel(!showTypoPanel);
                      }
                    }}
                    style={{ background: '#fef08a', color: '#854d0e', borderColor: '#fef3c7', border: '1px solid', fontWeight: 600 }}
                    title="Audit Typo & Ejaan"
                  >
                    🔍 Audit Typo
                  </button>
                  <button 
                    className={`toolbar-btn ${showHistoryPanel ? 'active' : ''}`}
                    onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                    style={{ background: '#eff6ff', color: '#1e40af', borderColor: '#dbeafe', border: '1px solid', fontWeight: 600 }}
                    title="Riwayat Versi Dokumen"
                  >
                    📜 Riwayat Versi
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Page Setup Drawer Panel */}
        {showPageSetup && (
          <div className="page-setup-drawer">
            <div className="setup-control-group">
              <label>Tampilan</label>
              <div className="layout-toggle-row">
                <button className={`layout-toggle-btn ${!isDraftMode ? 'active' : ''}`} onClick={() => setIsDraftMode(false)}>Kertas</button>
                <button className={`layout-toggle-btn ${isDraftMode ? 'active' : ''}`} onClick={() => setIsDraftMode(true)}>Web</button>
              </div>
            </div>

            {!isDraftMode && (
              <>
                <div className="setup-control-group">
                  <label>Ukuran</label>
                  <select className="setup-select" value={paperSize} onChange={e => setPaperSize(e.target.value)}>
                    <option value="a4">A4 (21 x 29.7 cm)</option>
                    <option value="letter">Letter (21.6 x 27.9 cm)</option>
                    <option value="legal">Legal (21.6 x 35.6 cm)</option>
                    <option value="a5">A5 (14.8 x 21 cm)</option>
                    <option value="custom">Kustom...</option>
                  </select>
                </div>

                {paperSize === 'custom' && (
                  <>
                    <div className="setup-control-group">
                      <label>Lebar (cm)</label>
                      <input type="number" step="0.1" className="setup-input" value={customWidth} onChange={e => setCustomWidth(e.target.value)} style={{ width: '60px' }} />
                    </div>
                    <div className="setup-control-group">
                      <label>Tinggi (cm)</label>
                      <input type="number" step="0.1" className="setup-input" value={customHeight} onChange={e => setCustomHeight(e.target.value)} style={{ width: '60px' }} />
                    </div>
                  </>
                )}

                <div className="setup-control-group">
                  <label>Orientasi</label>
                  <select className="setup-select" value={paperOrientation} onChange={e => setPaperOrientation(e.target.value)}>
                    <option value="portrait">Tegak (Portrait)</option>
                    <option value="landscape">Mendatar (Landscape)</option>
                  </select>
                </div>

                <div className="setup-control-group">
                  <label>Margin</label>
                  <select className="setup-select" value={paperMargin} onChange={e => setPaperMargin(e.target.value)}>
                    <option value="normal">Normal (2.54 cm)</option>
                    <option value="narrow">Sempit (1.27 cm)</option>
                    <option value="wide">Lebar (5.08 cm)</option>
                    <option value="custom">Kustom...</option>
                  </select>
                </div>

                {paperMargin === 'custom' && (
                  <div className="setup-control-group">
                    <label>Margin (cm)</label>
                    <input type="number" step="0.1" className="setup-input" value={customMargin} onChange={e => setCustomMargin(e.target.value)} style={{ width: '60px' }} />
                  </div>
                )}
              </>
            )}

            <div className="setup-control-group">
              <label>Gaya</label>
              <select className="setup-select" value={paperStyle} onChange={e => setPaperStyle(e.target.value)}>
                <option value="blank">Polos (Blank)</option>
                <option value="lined">Bergaris (Lined)</option>
                <option value="grid">Kotak-kotak (Grid)</option>
                <option value="dotted">Titik-titik (Dotted)</option>
              </select>
            </div>

            <div className="setup-control-group">
              <label>Warna Kertas</label>
              <select className="setup-select" value={paperTheme} onChange={e => setPaperTheme(e.target.value)}>
                <option value="white">Putih Bersih</option>
                <option value="cream">Kuning Cream</option>
                <option value="yellow">Yellow Pad (Kuning)</option>
                <option value="kraft">Kraft Cokelat</option>
                <option value="dark">Dark Slate</option>
              </select>
            </div>

            {!isDraftMode && (
              <div className="setup-control-group">
                <label>Zoom</label>
                <select className="setup-select" value={pageZoom} onChange={e => setPageZoom(e.target.value)}>
                  <option value="fit">Fit Width (Mobile)</option>
                  <option value="100%">100%</option>
                  <option value="75%">75%</option>
                  <option value="50%">50%</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Image Smart Placement & AI Auto-Layout Modal */}
        {showInsertImage && (
          <div className="image-upload-overlay" onClick={() => setShowInsertImage(false)}>
            <div className="image-upload-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px', width: '90%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>🖼️ AI Smart Image Placement</h4>
                <button style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#64748b' }} onClick={() => setShowInsertImage(false)}>✕</button>
              </div>

              <div style={{ marginBottom: '14px', textAlign: 'left' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>1. Pilih Foto / Gambar dari Perangkat:</label>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageFileSelect} style={{ fontSize: '13px', width: '100%' }} />
              </div>

              {imgDataUrl && (
                <>
                  <div style={{ marginBottom: '14px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ maxHeight: '180px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <img src={imgDataUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '6px', objectFit: 'contain' }} />
                    </div>
                    <button 
                      onClick={handleAiAutoLayoutImage}
                      style={{ marginTop: '10px', padding: '6px 14px', background: 'linear-gradient(135deg, #ff6b00 0%, #ea580c 100%)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      🤖 Auto-Layout AI (Posisikan & Ukur Otomatis)
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px', textAlign: 'left' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Posisi (Alignment):</label>
                      <select value={imgAlign} onChange={e => setImgAlign(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                        <option value="center">🎯 Tengah (Center Block)</option>
                        <option value="float-left">👈 Float Kiri (Teks di Kanan)</option>
                        <option value="float-right">👉 Float Kanan (Teks di Kiri)</option>
                        <option value="left">📄 Align Kiri</option>
                        <option value="right">📄 Align Kanan</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Ukuran Lebar Dokumen:</label>
                      <select value={imgWidth} onChange={e => setImgWidth(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                        <option value="25%">25% (Kecil)</option>
                        <option value="33%">33% (Sedang)</option>
                        <option value="50%">50% (Setengah Halaman)</option>
                        <option value="75%">75% (Lebar)</option>
                        <option value="100%">100% (Penuh Dokumen)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px', textAlign: 'left' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Gaya Bingkai & Efek:</label>
                      <select value={imgStyleType} onChange={e => setImgStyleType(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                        <option value="shadow">✨ Shadow & Soft Rounded</option>
                        <option value="border">🔲 Border Subtle</option>
                        <option value="rounded">🔵 Curved Rounded (16px)</option>
                        <option value="polaroid">🖼️ Bingkai Polaroid</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Keterangan / Caption Gambar:</label>
                      <input 
                        type="text" 
                        value={imgCaption} 
                        onChange={e => setImgCaption(e.target.value)} 
                        placeholder="Contoh: Foto Produk Utama" 
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} 
                      />
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                {imgDataUrl && (
                  <button className="toolbar-btn" onClick={handleInsertSmartImage} style={{ flex: 1, background: '#ff6b00', color: '#fff', fontWeight: 700 }}>✓ Insert Ke Canvas</button>
                )}
                <button className="toolbar-btn" onClick={() => setShowInsertImage(false)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Chart Modal */}
        {showChartModal && (
          <div className="image-upload-overlay" onClick={() => setShowChartModal(false)}>
            <div className="image-upload-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="modal-tabs" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <button 
                  className={`modal-tab-btn ${chartModalTab === 'standard' ? 'active' : ''}`}
                  onClick={() => setChartModalTab('standard')}
                  style={{ flex: 1, padding: '10px', background: 'transparent', border: 'none', borderBottom: chartModalTab === 'standard' ? '2px solid #ff6b00' : 'none', fontWeight: 600, color: chartModalTab === 'standard' ? '#ff6b00' : '#64748b', cursor: 'pointer' }}
                >
                  Grafik Data 📊
                </button>
                <button 
                  className={`modal-tab-btn ${chartModalTab === 'curve' ? 'active' : ''}`}
                  onClick={() => setChartModalTab('curve')}
                  style={{ flex: 1, padding: '10px', background: 'transparent', border: 'none', borderBottom: chartModalTab === 'curve' ? '2px solid #ff6b00' : 'none', fontWeight: 600, color: chartModalTab === 'curve' ? '#ff6b00' : '#64748b', cursor: 'pointer' }}
                >
                  Kurva Matematika 📈
                </button>
              </div>

              {chartModalTab === 'standard' ? (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <label>Jenis Grafik:</label>
                    <select value={chartType} onChange={e => setChartType(e.target.value)} style={{ width: '100%', padding: '6px', marginTop: '4px' }}>
                      <option value="bar">Bar Chart</option>
                      <option value="line">Line Chart</option>
                      <option value="pie">Pie Chart</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label>Judul Grafik:</label>
                    <input type="text" value={chartTitle} onChange={e => setChartTitle(e.target.value)} style={{ width: '100%', padding: '6px', marginTop: '4px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label>Data (format: Nama:Nilai, satu per baris):</label>
                    <textarea 
                      style={{ width: '100%', height: '100px', padding: '6px', marginTop: '4px', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: '12px' }}
                      defaultValue="A:40\nB:30\nC:20\nD:50"
                      onChange={e => updateChartData(e.target.value)}
                    />
                  </div>
                  <div style={{ marginBottom: '12px', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: '#f9f9f9', height: '250px', overflow: 'hidden' }}>
                    {renderChart({ type: chartType, title: chartTitle, data: chartData })}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="toolbar-btn" onClick={insertChart} style={{ flex: 1 }}>✓ Insert</button>
                    <button className="toolbar-btn" onClick={() => setShowChartModal(false)} style={{ flex: 1 }}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <label>Persamaan Kurva:</label>
                    <select value={curveEquation} onChange={e => setCurveEquation(e.target.value)} style={{ width: '100%', padding: '6px', marginTop: '4px' }}>
                      <option value="sine">Sinusoidal (Wave)</option>
                      <option value="exponential">Eksponensial (Growth)</option>
                      <option value="linear">Regresi Linear (Trend)</option>
                      <option value="bell">Kurva Gauss (Normal Distribution)</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label>Amplitudo / Skala: {curveAmplitude}%</label>
                    <input type="range" min="10" max="100" value={curveAmplitude} onChange={e => setCurveAmplitude(Number(e.target.value))} style={{ width: '100%', marginTop: '4px' }} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label>Warna Kurva:</label>
                    <input type="color" value={curveColor} onChange={e => setCurveColor(e.target.value)} style={{ width: '100%', height: '36px', padding: '3px', marginTop: '4px', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button className="toolbar-btn" onClick={generateAndInsertCurve} style={{ flex: 1, background: '#ff6b00', color: '#fff' }}>✓ Insert Kurva</button>
                    <button className="toolbar-btn" onClick={downloadCurveImage} style={{ flex: 1 }}><i className="fas fa-download"></i> Download PNG</button>
                    <button className="toolbar-btn" onClick={() => setShowChartModal(false)} style={{ flex: 1 }}>Cancel</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Deepernova Cloud Explorer Modal */}
        {showCloudModal && (
          <div className="cloud-explorer-overlay" onClick={() => setShowCloudModal(false)}>
            <div className="cloud-explorer-modal" onClick={e => e.stopPropagation()}>
              <div className="explorer-header">
                <h3><i className="fas fa-cloud-upload-alt" style={{ color: '#106ebe', marginRight: 8 }}></i> Deepernova Cloud Explorer</h3>
                <button className="close-btn" onClick={() => setShowCloudModal(false)}><i className="fas fa-times"></i></button>
              </div>

              {/* Path and Actions Bar */}
              <div className="explorer-path-bar">
                <button 
                  className="path-back-btn" 
                  disabled={currentFolderId === null} 
                  onClick={() => {
                    const parent = cloudFiles.find(f => f.id === currentFolderId);
                    setCurrentFolderId(parent ? parent.parentId : null);
                  }}
                  title="Kembali ke folder sebelumnya"
                >
                  <i className="fas fa-arrow-left"></i>
                </button>
                <div className="path-breadcrumbs">
                  <span className="crumb-item" onClick={() => setCurrentFolderId(null)}>Root</span>
                  {(() => {
                    const crumbs = [];
                    let currId = currentFolderId;
                    while (currId) {
                      const folder = cloudFiles.find(f => f.id === currId);
                      if (folder) {
                        crumbs.unshift(folder);
                        currId = folder.parentId;
                      } else {
                        break;
                      }
                    }
                    return crumbs.map(c => (
                      <span key={c.id} className="crumb-item" onClick={() => setCurrentFolderId(c.id)}>
                        <i className="fas fa-chevron-right" style={{ fontSize: 9, margin: '0 6px', color: '#a19f9d' }}></i>
                        {c.name}
                      </span>
                    ));
                  })()}
                </div>
                <button 
                  className="new-folder-btn" 
                  onClick={() => {
                    const name = prompt('Masukkan nama folder baru:');
                    if (name) createCloudFolder(name);
                  }}
                >
                  <i className="fas fa-folder-plus"></i> Folder Baru
                </button>
              </div>

              {/* Main files grid view */}
              <div className="explorer-files-view">
                {(() => {
                  const filteredItems = cloudFiles.filter(item => item.parentId === currentFolderId);
                  if (filteredItems.length === 0) {
                    return (
                      <div className="empty-explorer">
                        <i className="fas fa-folder-open" style={{ fontSize: 48, color: '#e1dfdd', marginBottom: 12 }}></i>
                        <p>Folder ini kosong.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="files-grid">
                      {filteredItems.map(item => {
                        const isFolder = item.type === 'folder';
                        const isSelected = selectedCloudFile?.id === item.id;
                        let iconClass = 'fas fa-folder';
                        let iconColor = '#ffb900'; // Folder Gold

                        if (item.type === 'docx') {
                          iconClass = 'fas fa-file-word';
                          iconColor = '#106ebe'; // Word Blue
                        } else if (item.type === 'excel') {
                          iconClass = 'fas fa-file-excel';
                          iconColor = '#107c41'; // Excel Green
                        } else if (item.type === 'pptx') {
                          iconClass = 'fas fa-file-powerpoint';
                          iconColor = '#d83b01'; // PPT Orange
                        }

                        return (
                          <div 
                            key={item.id} 
                            className={`grid-file-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedCloudFile(item);
                              if (explorerMode === 'save' && !isFolder) {
                                setCloudFileName(item.name.replace(`.${item.type}`, ''));
                              }
                            }}
                            onDoubleClick={() => {
                              if (isFolder) {
                                setCurrentFolderId(item.id);
                                setSelectedCloudFile(null);
                              } else {
                                loadCloudFile(item);
                              }
                            }}
                          >
                            <i className={`${iconClass} file-item-icon`} style={{ color: iconColor }}></i>
                            <span className="file-item-name" title={item.name}>{item.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Bottom Actions Bar */}
              <div className="explorer-footer">
                <div className="footer-left">
                  {explorerMode === 'save' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                      <span style={{ fontSize: 13, color: '#323130' }}>Nama Berkas:</span>
                      <input 
                        type="text" 
                        value={cloudFileName} 
                        onChange={e => setCloudFileName(e.target.value)}
                        placeholder="Nama dokumen..."
                        className="explorer-name-input"
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: '#605e5c' }}>
                      {selectedCloudFile ? `Terpilih: ${selectedCloudFile.name}` : 'Pilih berkas dari daftar'}
                    </span>
                  )}
                </div>
                <div className="footer-right">
                  {selectedCloudFile && (
                    <button className="explorer-btn delete-btn" onClick={() => deleteCloudFile(selectedCloudFile.id)} title="Hapus Terpilih">
                      <i className="fas fa-trash-alt"></i> Hapus
                    </button>
                  )}
                  {explorerMode === 'save' ? (
                    <button 
                      className="explorer-btn save-btn" 
                      onClick={() => saveActiveFileToCloud(cloudFileName)}
                      disabled={!cloudFileName.trim()}
                    >
                      <i className="fas fa-save" style={{ marginRight: 6 }}></i> Simpan ke Cloud
                    </button>
                  ) : (
                    <button 
                      className="explorer-btn open-btn" 
                      onClick={() => selectedCloudFile && loadCloudFile(selectedCloudFile)}
                      disabled={!selectedCloudFile || selectedCloudFile.type === 'folder'}
                    >
                      <i className="fas fa-folder-open" style={{ marginRight: 6 }}></i> Buka
                    </button>
                  )}
                  <button className="explorer-btn cancel-btn" onClick={() => setShowCloudModal(false)}>Batal</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={`docx-editor-viewport ${isDraftMode ? 'draft-mode' : ''}`}>
          <div 
            className="zoom-scale-wrapper" 
            style={{
              transform: `scale(${getZoomScale()})`,
              transformOrigin: 'top center',
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              flex: 1
            }}
          >
            <div className="a4-container">
              {uploadedFileName && uploadedFileType === 'docx' ? (
                /* ── Word Document Viewer Mode: multi-page read view ── */
                <div className="word-viewer-pages">
                  <div
                    className="word-viewer-page"
                    dangerouslySetInnerHTML={{ __html: content[0]?.text || '' }}
                  />
                </div>
              ) : (
                /* ── Editable Mode for new documents ── */
                <div
                  className={`a4-page style-${paperStyle} theme-${paperTheme} margin-${paperMargin} orientation-${paperOrientation} ${showFormattingMarks ? 'show-marks' : ''} ${watermarkText ? 'has-watermark' : ''}`}
                  contentEditable={!isDrawingMode}
                  suppressContentEditableWarning
                  ref={(el) => {
                    pageRef.current = el;
                    if (el) {
                      const html = content[0]?.text || docxTextRef.current || '';
                      if (el.innerHTML !== html && document.activeElement !== el) {
                        el.innerHTML = html;
                      }
                    }
                  }}
                  data-watermark={watermarkText}
                  data-placeholder="Mulai menulis dokumen Anda di sini..."
                  style={{
                    position: 'relative',
                    fontSize: '12pt',
                    fontFamily: fontFamily || 'Times New Roman, serif',
                    color: paperTheme === 'dark' ? '#f1f5f9' : '#1a1a1a',
                    lineHeight: paperStyle === 'lined' ? '28px' : (lineSpacing || 1.5),
                    textAlign: 'justify',
                    margin: isDraftMode ? '0' : '20px auto',
                    padding: getPageMargin(),
                    boxSizing: 'border-box',
                    columnCount: !isDraftMode ? pageColumns : 1,
                    columnGap: '24px',
                    border: pageBorder === 'none' ? '1px solid #d2d0ce' : (pageBorder === 'double' ? '6px double #106ebe' : `3px ${pageBorder} #106ebe`),
                    maxWidth: isDraftMode ? '100%' : 'unset',
                    overflowY: 'visible',
                    ...(!isDraftMode ? getPageDimensions() : { minHeight: '100vh' })
                  }}
                  onInput={e => {
                    docxTextRef.current = e.currentTarget.innerHTML;
                  }}
                  onBlur={() => {
                    syncDocxContent();
                    if (docxTextRef.current) pushDocHistory(docxTextRef.current, 'Manual edit');
                  }}
                >
                  {/* Visual Page Header in portrait/landscape modes */}
                  {!isDraftMode && docxHeader && (
                    <div 
                      className="page-header-display" 
                      style={{ position: 'absolute', top: '15px', left: getPageMargin(), right: getPageMargin(), fontSize: '10px', color: '#666', borderBottom: '1px solid #eee', paddingBottom: '3px', userSelect: 'none', pointerEvents: 'none' }}
                      contentEditable={false}
                    >
                      {docxHeader}
                    </div>
                  )}

                  {/* Visual Page Footer in portrait/landscape modes */}
                  {!isDraftMode && docxFooter && (
                    <div 
                      className="page-footer-display" 
                      style={{ position: 'absolute', bottom: '15px', left: getPageMargin(), right: getPageMargin(), fontSize: '10px', color: '#666', borderTop: '1px solid #eee', paddingTop: '3px', userSelect: 'none', pointerEvents: 'none', display: 'flex', justifyContent: 'space-between' }}
                      contentEditable={false}
                    >
                      <span>{docxFooter}</span>
                      {showPageNumbers && <span>Halaman 1</span>}
                    </div>
                  )}

                  <canvas
                    ref={drawingCanvasRef}
                    contentEditable={false}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    onTouchCancel={stopDrawing}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: isDrawingMode ? 'auto' : 'none',
                      zIndex: 99,
                      cursor: isDrawingMode ? 'crosshair' : 'default',
                      userSelect: 'none',
                      touchAction: 'none'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Microsoft Word Style Bottom Blue Status Bar */}
        <div className="word-status-bar">
          <div className="status-left">
            <span>Halaman 1 dari 1</span>
            <span className="status-separator">|</span>
            <span>{wordCount} Kata</span>
            <span className="status-separator">|</span>
            <span>{charCount} Karakter</span>
            <span className="status-separator">|</span>
            <span>Bahasa Indonesia</span>
          </div>
          <div className="status-right">
            <i className="fas fa-search-plus" style={{ marginRight: 6 }}></i>
            <input 
              type="range" 
              min="50" 
              max="150" 
              step="10" 
              value={pageZoom === 'fit' ? 100 : parseInt(pageZoom)} 
              onChange={e => setPageZoom(`${e.target.value}%`)} 
              className="zoom-slider"
            />
            <span>{pageZoom === 'fit' ? 'Fit' : pageZoom}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderPptxEditor = () => (
    <div className="pptx-editor">
      {Array.isArray(content) && content.map(slide => (
        <div key={slide.id} className="slide-container">
          <div className="slide">
            <div className="slide-title">{slide.title}</div>
            <div className="slide-content">{slide.content}</div>
          </div>
          <div className="slide-notes">Notes: {slide.notes}</div>
        </div>
      ))}
    </div>
  );

  const renderExcelEditor = () => {
    const sheet = excelSheets[activeSheet];
    if (!sheet) return null;
    const data = sheet.data;
    const rows = data.length;
    const cols = Math.max(...data.map(r => r.length), 1);
    const cell = selectedCell ? data[selectedCell.r]?.[selectedCell.c] : null;

    return (
      <div className="excel-editor">
        {/* Sheet Tabs */}
        <div className="excel-tabs">
          {excelSheets.map((s, idx) => (
            <div key={idx} className={`excel-tab ${idx === activeSheet ? 'active' : ''}`}>
              <span onClick={() => { setActiveSheet(idx); setSelectedCell(null); }}>{s.name}</span>
              {excelSheets.length > 1 && (
                <button className="excel-tab-close" onClick={() => deleteExcelSheet(idx)}>✕</button>
              )}
            </div>
          ))}
          <button className="excel-tab-add" onClick={addExcelSheet}>+</button>
        </div>

        {/* Format Bar */}
        <div className="excel-format-bar">
          <div className="excel-format-left">
            <span className="excel-cell-ref">
              {selectedCell ? `${getColumnLabel(selectedCell.c)}${selectedCell.r + 1}` : ''}
            </span>
            <input
              className="excel-cell-input"
              value={cell?.value ?? ''}
              onChange={e => { if (selectedCell) updateCell(selectedCell.r, selectedCell.c, e.target.value); }}
              placeholder="Value"
            />
          </div>
          <div className="excel-format-actions">
            <button className={`ef-btn ${cell?.format?.bold ? 'active' : ''}`} onClick={() => applyFormatToSelection({ bold: !cell?.format?.bold })} title="Bold"><b>B</b></button>
            <button className={`ef-btn ${cell?.format?.italic ? 'active' : ''}`} onClick={() => applyFormatToSelection({ italic: !cell?.format?.italic })} title="Italic"><i>I</i></button>
            <button className={`ef-btn ${cell?.format?.underline ? 'active' : ''}`} onClick={() => applyFormatToSelection({ underline: !cell?.format?.underline })} title="Underline"><u>U</u></button>
            <button className={`ef-btn ${cell?.format?.strikethrough ? 'active' : ''}`} onClick={() => applyFormatToSelection({ strikethrough: !cell?.format?.strikethrough })} title="Strikethrough"><s>S</s></button>
            <span className="ef-sep">|</span>
            <button className={`ef-btn ${cell?.format?.halign === 'left' ? 'active' : ''}`} onClick={() => applyFormatToSelection({ halign: 'left' })} title="Align Left">⬅</button>
            <button className={`ef-btn ${cell?.format?.halign === 'center' ? 'active' : ''}`} onClick={() => applyFormatToSelection({ halign: 'center' })} title="Center">↔</button>
            <button className={`ef-btn ${cell?.format?.halign === 'right' ? 'active' : ''}`} onClick={() => applyFormatToSelection({ halign: 'right' })} title="Align Right">➡</button>
            <span className="ef-sep">|</span>
            <button className={`ef-btn ${cell?.format?.wrapText ? 'active' : ''}`} onClick={() => applyFormatToSelection({ wrapText: !cell?.format?.wrapText })} title="Wrap Text">↕</button>
            <label className="ef-label" title="Font Color">
              <span style={{ color: cell?.format?.fontColor || '#000', fontWeight: 'bold' }}>A</span>
              <input type="color" value={cell?.format?.fontColor || '#000000'} onChange={e => applyFormatToSelection({ fontColor: e.target.value })} className="ef-color" />
            </label>
            <label className="ef-label" title="Fill Color">
              <span style={{ background: cell?.format?.fillColor || '#fff', border: '1px solid #ccc', display: 'inline-block', width: 14, height: 14, borderRadius: 2 }}></span>
              <input type="color" value={cell?.format?.fillColor || '#ffffff'} onChange={e => applyFormatToSelection({ fillColor: e.target.value })} className="ef-color" />
            </label>
            <span className="ef-sep">|</span>
            <select className="ef-select" value={cell?.format?.fontSize || 11} onChange={e => applyFormatToSelection({ fontSize: Number(e.target.value) })}>
              {[8,9,10,11,12,14,16,18,20,24,28,32,36,48].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Find/Replace Bar */}
        {showFind && (
          <div className="excel-find-bar">
            <input className="ef-input" value={findText} onChange={e => setFindText(e.target.value)} placeholder="Find..." />
            <input className="ef-input" value={replaceText} onChange={e => setReplaceText(e.target.value)} placeholder="Replace with..." />
            <button className="ef-btn-sm" onClick={findAndReplace}>Find & Replace</button>
            <button className="ef-btn-sm" onClick={() => setShowFind(false)}>✕</button>
          </div>
        )}

        {/* Row/Column Toolbar */}
        <div className="excel-toolbar">
          <button className="excel-toolbar-btn" onClick={addExcelRow}>+ Row</button>
          <button className="excel-toolbar-btn" onClick={addExcelColumn}>+ Col</button>
          {selectedCell && (
            <>
              <button className="excel-toolbar-btn" onClick={() => insertExcelRowAbove(selectedCell.r)}>Ins Row</button>
              <button className="excel-toolbar-btn" onClick={() => insertExcelColumnLeft(selectedCell.c)}>Ins Col</button>
              <button className="excel-toolbar-btn" onClick={() => deleteExcelRow(selectedCell.r)}>Del Row</button>
              <button className="excel-toolbar-btn" onClick={() => deleteExcelColumn(selectedCell.c)}>Del Col</button>
            </>
          )}
          <button className="excel-toolbar-btn" onClick={() => { if (selectedCell) sortExcelData(selectedCell.c, 'asc'); }}>Sort ↑</button>
          <button className="excel-toolbar-btn" onClick={() => { if (selectedCell) sortExcelData(selectedCell.c, 'desc'); }}>Sort ↓</button>
          <button className="excel-toolbar-btn" onClick={() => setShowFind(!showFind)}>Find</button>
          <span className="excel-dimension">{rows}R × {cols}C</span>
        </div>

        {/* Spreadsheet Grid */}
        <div className="excel-scroll">
          <table className="spreadsheet">
            <thead>
              <tr>
                <th className="excel-corner"></th>
                {Array.from({ length: cols }, (_, ci) => (
                  <th key={ci} className="excel-col-header" onClick={() => sortExcelData(ci)}>
                    {getColumnLabel(ci)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, ri) => (
                <tr key={ri}>
                  <td className="excel-row-header">{ri + 1}</td>
                  {Array.from({ length: cols }, (_, ci) => {
                    const cell = row[ci] || createCell('');
                    return (
                      <td
                        key={ci}
                        contentEditable
                        suppressContentEditableWarning
                        onClick={() => setSelectedCell({ r: ri, c: ci })}
                        onBlur={e => updateCell(ri, ci, e.currentTarget.innerText)}
                        className="excel-cell"
                        style={getCellStyle(cell, ri, ci)}
                      >
                        {cell.value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ===== EXPORT =====
  const handleExport = async () => {
    try {
      if (editorType === 'docx') await exportDocx();
      else if (editorType === 'pptx') await generatePptxViaServer();
      else if (editorType === 'excel') await exportExcel();
    } catch (error) {
      alert('Export error: ' + error.message);
    }
  };

  // ===== CLOUD FILE EXPLORER METHODS =====
  const fetchCloudFiles = async () => {
    try {
      const response = await fetch('/api/cloud/files');
      const data = await response.json();
      if (data.success) {
        setCloudFiles(data.files || []);
      }
    } catch (error) {
      console.warn('Gagal mengambil daftar file cloud:', error);
    }
  };

  const createCloudFolder = async (name) => {
    if (!name.trim()) return;
    try {
      const response = await fetch('/api/cloud/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: currentFolderId,
          name: name.trim()
        })
      });
      const data = await response.json();
      if (data.success) {
        fetchCloudFiles();
      } else {
        alert(`Gagal membuat folder: ${data.error}`);
      }
    } catch (error) {
      console.error('[Cloud Folder Create Error]:', error);
      alert('Gagal membuat folder di server.');
    }
  };

  const saveActiveFileToCloud = async (fileName) => {
    if (!fileName.trim()) {
      alert('Nama dokumen tidak boleh kosong.');
      return;
    }
    try {
      let fileContent = null;
      if (editorType === 'excel') {
        fileContent = { excelSheets, activeSheet };
      } else {
        // For docx/pptx
        if (editorType === 'docx' && pageRef.current) {
          // Sync react states
          docxTextRef.current = pageRef.current.innerHTML;
          const updated = [{ id: Date.now(), type: 'html', text: pageRef.current.innerHTML }];
          setContent(updated);
          fileContent = updated;
        } else {
          fileContent = content;
        }
      }

      const formattedName = fileName.endsWith(`.${editorType}`) ? fileName : `${fileName}.${editorType}`;

      const response = await fetch('/api/cloud/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeCloudFileId || null,
          parentId: currentFolderId,
          name: formattedName,
          type: editorType,
          content: fileContent
        })
      });
      const data = await response.json();
      if (data.success && data.file) {
        setDocumentTitle(data.file.name.replace(`.${editorType}`, ''));
        setActiveCloudFileId(data.file.id);
        setShowCloudModal(false);
        fetchCloudFiles();
        alert(`Dokumen "${data.file.name}" berhasil disimpan ke cloud.`);
      } else {
        alert(`Gagal menyimpan ke cloud: ${data.error}`);
      }
    } catch (error) {
      console.error('[Cloud Save Error]:', error);
      alert('Gagal menyimpan file ke server.');
    }
  };

  const loadCloudFile = async (file) => {
    try {
      const response = await fetch(`/api/cloud/files/${file.id}`);
      const data = await response.json();
      if (data.success && data.file) {
        setDocumentTitle(data.file.name.replace(`.${data.file.type}`, ''));
        setEditorType(data.file.type);
        setActiveCloudFileId(data.file.id);

        if (data.file.type === 'excel') {
          const parsed = data.file.content;
          setExcelSheets(parsed?.excelSheets || []);
          setActiveSheet(parsed?.activeSheet || 0);
          setContent([]);
        } else {
          // docx / pptx
          const parsed = data.file.content;
          setContent(parsed || []);
          
          if (data.file.type === 'docx' && pageRef.current) {
            const html = parsed[0]?.text || '';
            pageRef.current.innerHTML = html;
            docxTextRef.current = html;
          }
        }
        setShowCloudModal(false);
        alert(`Dokumen "${data.file.name}" berhasil dimuat dari cloud.`);
      } else {
        alert(`Gagal memuat dokumen: ${data.error}`);
      }
    } catch (error) {
      console.error('[Cloud Load Error]:', error);
      alert('Gagal memuat file dari server.');
    }
  };

  const deleteCloudFile = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus folder/dokumen ini? Semua sub-file di dalamnya juga akan terhapus.')) return;
    try {
      const response = await fetch(`/api/cloud/files/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        if (activeCloudFileId === id) {
          setActiveCloudFileId(null);
        }
        setSelectedCloudFile(null);
        fetchCloudFiles();
      } else {
        alert(`Gagal menghapus: ${data.error}`);
      }
    } catch (error) {
      console.error('[Cloud Delete Error]:', error);
      alert('Gagal menghapus file di server.');
    }
  };

  // Fetch cloud files on startup
  useEffect(() => {
    fetchCloudFiles();
  }, []);

  const handleAutoSave = async () => {
    try {
      const key = `doc_${documentTitle}_${editorType}`;
      const saveData = editorType === 'excel'
        ? { title: documentTitle, type: editorType, excelSheets, activeSheet }
        : { title: documentTitle, type: editorType, content };
      localStorage.setItem(key, JSON.stringify({
        ...saveData,
        metadata: { savedAt: new Date().toISOString() }
      }));
    } catch (error) {
      console.warn('Auto-save failed:', error);
    }
  };

  const downloadFile = (blob, fileName) => {
    const el = document.createElement('a');
    el.href = URL.createObjectURL(blob);
    el.download = fileName;
    el.style.display = 'none';
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
    URL.revokeObjectURL(el.href);
  };

  // ===== PARSE TABLES FROM AI RESPONSE =====
  const parseTablesFromText = (text) => {
    const tableRegex = /\[TABLE\]([\s\S]*?)\[\/TABLE\]/g;
    const matches = [];
    let match;
    while ((match = tableRegex.exec(text)) !== null) {
      matches.push(match[1]);
    }
    
    return matches.map(tableStr => {
      const lines = tableStr.trim().split('\n').filter(line => line.trim());
      if (lines.length === 0) return null;
      
      const rows = lines.map(line => {
        const cells = line.split('|').map(cell => cell.trim()).filter(c => c);
        return {
          id: Date.now() + Math.random(),
          cells: cells.map((text, ci) => ({
            id: Date.now() + ci,
            text: text,
            rowspan: 1,
            colspan: 1,
            bold: false,
            italic: false,
            align: 'left',
            bgColor: ''
          }))
        };
      });
      
      if (rows.length === 0) return null;
      
      return {
        id: Date.now(),
        rows: rows
      };
    }).filter(t => t !== null);
  };

  const insertParsedTables = (tables) => {
    if (!Array.isArray(tables) || tables.length === 0) return;
    setDocxTables(prev => [...prev, ...tables]);
  };

  const removeTableMarkersFromText = (text) => {
    return text.replace(/\[TABLE\]([\s\S]*?)\[\/TABLE\]/g, '').trim();
  };

  // ===== EXPORT DOCX - International Standard Format =====
  const exportDocx = async () => {
    const mapToSystemFont = (fontName) => {
      if (!fontName) return 'Times New Roman';
      const standardFonts = [
        'Times New Roman', 'Arial', 'Calibri', 'Courier New', 'Georgia', 'Verdana', 
        'Helvetica', 'Trebuchet MS', 'Garamond', 'Bookman', 'Comic Sans MS', 'Impact'
      ];
      if (standardFonts.includes(fontName)) {
        return fontName;
      }
      const lowercaseFont = fontName.toLowerCase();
      if (['inter', 'roboto', 'montserrat', 'outfit', 'poppins', 'lato', 'nunito', 'raleway', 'ubuntu', 'open sans', 'quicksand'].some(f => lowercaseFont.includes(f))) {
        return 'Arial';
      }
      if (['lora', 'merriweather', 'pt serif', 'playfair display', 'cinzel'].some(f => lowercaseFont.includes(f))) {
        return 'Georgia';
      }
      if (['fira code', 'source code pro', 'consolas', 'monaco'].some(f => lowercaseFont.includes(f))) {
        return 'Courier New';
      }
      if (['dancing script', 'pacifico', 'caveat', 'indie flower', 'shadows into light'].some(f => lowercaseFont.includes(f))) {
        return 'Comic Sans MS';
      }
      if (lowercaseFont.includes('bebas') || lowercaseFont.includes('black')) {
        return 'Impact';
      }
      return 'Times New Roman';
    };

    const docxFont = mapToSystemFont(fontFamily);
    const sections = [];
    const htmlString = content[0]?.text || '';
    
    const parser = new DOMParser();
    const parsedHtmlDoc = parser.parseFromString(htmlString, 'text/html');
    const elements = Array.from(parsedHtmlDoc.body.childNodes);
    
    // Recursive HTML formatter for inline tags
    const parseHtmlToRuns = (htmlElement, defaultStyle = {}) => {
      const runs = [];
      const traverse = (node, currentStyle = { ...defaultStyle }) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          if (text) {
            runs.push(new TextRun({
              text: text,
              font: docxFont,
              size: currentStyle.size || 24, // 12pt
              bold: !!currentStyle.bold,
              italic: !!currentStyle.italic,
              underline: currentStyle.underline ? {} : undefined,
              color: currentStyle.color || undefined,
              shading: currentStyle.highlight ? { fill: currentStyle.highlight } : undefined
            }));
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const tagName = node.tagName.toLowerCase();
          const nextStyle = { ...currentStyle };
          
          if (tagName === 'strong' || tagName === 'b') nextStyle.bold = true;
          if (tagName === 'em' || tagName === 'i') nextStyle.italic = true;
          if (tagName === 'u') nextStyle.underline = true;
          if (tagName === 'mark') nextStyle.highlight = 'ffff00';
          
          const styleAttr = node.getAttribute('style') || '';
          if (styleAttr) {
            const colorMatch = styleAttr.match(/color:\s*(#[0-9a-fA-F]{6}|rgb\([^)]+\))/);
            if (colorMatch) {
              let colorVal = colorMatch[1];
              if (colorVal.startsWith('#')) {
                nextStyle.color = colorVal.replace('#', '');
              }
            }
            const sizeMatch = styleAttr.match(/font-size:\s*([0-9]+)pt/);
            if (sizeMatch) {
              nextStyle.size = parseInt(sizeMatch[1]) * 2;
            }
          }
          
          node.childNodes.forEach(child => traverse(child, nextStyle));
        }
      };
      
      htmlElement.childNodes.forEach(child => traverse(child));
      return runs;
    };

    const processNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          sections.push(
            new Paragraph({
              children: [new TextRun({ text: text, font: docxFont, size: 24 })],
              spacing: { line: 360, lineRule: 'auto', after: 240 },
              indent: { firstLine: 720 },
              alignment: AlignmentType.JUSTIFIED,
            })
          );
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        
        if (tagName.startsWith('h')) {
          const runs = parseHtmlToRuns(node, { bold: true });
          sections.push(
            new Paragraph({
              children: runs.length > 0 ? runs : [new TextRun('')],
              spacing: { before: 240, after: 120 },
              heading: tagName === 'h1' ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2
            })
          );
        } else if (tagName === 'p') {
          const runs = parseHtmlToRuns(node);
          let alignment = AlignmentType.JUSTIFIED;
          const styleAttr = node.getAttribute('style') || '';
          if (styleAttr.includes('text-align: center')) alignment = AlignmentType.CENTER;
          else if (styleAttr.includes('text-align: right')) alignment = AlignmentType.RIGHT;
          else if (styleAttr.includes('text-align: left')) alignment = AlignmentType.LEFT;
          
          sections.push(
            new Paragraph({
              children: runs.length > 0 ? runs : [new TextRun('')],
              spacing: { line: 360, lineRule: 'auto', after: 240 },
              indent: { firstLine: 720 },
              alignment: alignment,
            })
          );
        } else if (tagName === 'ul' || tagName === 'ol') {
          const lis = node.querySelectorAll('li');
          lis.forEach((li, idx) => {
            const prefix = tagName === 'ol' ? `${idx + 1}. ` : '• ';
            const runs = parseHtmlToRuns(li);
            runs.unshift(new TextRun({ text: prefix, font: docxFont, size: 24 }));
            sections.push(
              new Paragraph({
                children: runs,
                spacing: { line: 360, lineRule: 'auto', after: 120 },
                indent: { left: 720, hanging: 360 },
              })
            );
          });
        } else if (tagName === 'table') {
          const trs = node.querySelectorAll('tr');
          const rows = [];
          
          trs.forEach(tr => {
            const tds = tr.querySelectorAll('td, th');
            const cells = [];
            
            tds.forEach(td => {
              const runs = parseHtmlToRuns(td);
              cells.push(
                new TableCell({
                  children: [new Paragraph({
                    children: runs.length > 0 ? runs : [new TextRun('')],
                  })],
                  verticalAlign: VerticalAlign.CENTER,
                })
              );
            });
            
            if (cells.length > 0) {
              rows.push(new TableRow({ children: cells }));
            }
          });
          
          if (rows.length > 0) {
            sections.push(
              new Table({
                rows: rows,
                width: { size: 100, type: WidthType.PERCENTAGE },
              })
            );
            sections.push(new Paragraph({ children: [new TextRun('')] }));
          }
        } else if (node.classList && (node.classList.contains('daftar-isi-block') || node.classList.contains('table-of-contents-block'))) {
          sections.push(
            new Paragraph({
              children: [new TextRun({ text: 'DAFTAR ISI', font: docxFont, size: 32, bold: true })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 240, after: 360 },
            })
          );

          const items = node.querySelectorAll('div[style*="display: flex"]');
          items.forEach(item => {
            const spans = item.querySelectorAll('span');
            if (spans.length >= 2) {
              const titleText = spans[0]?.textContent?.trim() || '';
              const pageText = spans[spans.length - 1]?.textContent?.trim() || '';
              if (titleText && pageText && titleText !== 'DAFTAR ISI') {
                const dotsCount = Math.max(5, 70 - titleText.length - pageText.length);
                const dots = ' .'.repeat(dotsCount);
                
                const isSub = item.getAttribute('style')?.includes('padding-left');
                const isBold = item.getAttribute('style')?.includes('font-weight: 700') || titleText.startsWith('BAB') || titleText.startsWith('KATA') || titleText.startsWith('DAFTAR');

                sections.push(
                  new Paragraph({
                    children: [
                      new TextRun({ text: titleText, font: docxFont, size: isBold ? 24 : 22, bold: isBold }),
                      new TextRun({ text: dots, font: docxFont, size: 20, color: '64748B' }),
                      new TextRun({ text: ` ${pageText}`, font: docxFont, size: isBold ? 24 : 22, bold: isBold })
                    ],
                    spacing: { line: 360, lineRule: 'auto', after: 120 },
                    indent: isSub ? { left: 480 } : undefined,
                  })
                );
              }
            }
          });

          sections.push(new Paragraph({ children: [new TextRun('')], spacing: { after: 360 } }));
        } else if (tagName === 'img' || (node.querySelector && node.querySelector('img'))) {
          const imgEl = tagName === 'img' ? node : node.querySelector('img');
          const src = imgEl ? (imgEl.getAttribute('src') || '') : '';
          if (src && src.startsWith('data:image/')) {
            const headerParts = src.split(';')[0];
            let imgType = 'png';
            if (headerParts.includes('jpeg') || headerParts.includes('jpg')) imgType = 'jpg';
            else if (headerParts.includes('gif')) imgType = 'gif';
            else if (headerParts.includes('bmp')) imgType = 'bmp';

            const base64Data = src.split(',')[1];
            if (base64Data) {
              try {
                const binaryString = atob(base64Data);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }

                let imgW = 480;
                let imgH = 280;
                const styleAttr = imgEl.getAttribute('style') || '';
                const widthMatch = styleAttr.match(/width:\s*([0-9]+)%/);
                if (widthMatch) {
                  const pct = parseInt(widthMatch[1]);
                  imgW = Math.round(520 * (pct / 100));
                  imgH = Math.round(imgW * 0.65);
                }

                sections.push(
                  new Paragraph({
                    children: [
                      new ImageRun({
                        data: bytes,
                        transformation: {
                          width: imgW,
                          height: imgH,
                        },
                        type: imgType,
                      })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 180, after: 240 },
                  })
                );
              } catch (err) {
                console.warn('Failed to parse embedded image base64:', err);
              }
            }
          }
        } else if (tagName === 'div' || tagName === 'section' || tagName === 'body') {
          const hasBlockChildren = Array.from(node.childNodes).some(child => 
            child.nodeType === Node.ELEMENT_NODE && 
            ['p', 'div', 'section', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'ul', 'ol'].includes(child.tagName.toLowerCase())
          );
          
          if (hasBlockChildren) {
            node.childNodes.forEach(child => processNode(child));
          } else {
            const runs = parseHtmlToRuns(node);
            if (runs.length > 0) {
              let alignment = AlignmentType.JUSTIFIED;
              const styleAttr = node.getAttribute('style') || '';
              if (styleAttr.includes('text-align: center')) alignment = AlignmentType.CENTER;
              else if (styleAttr.includes('text-align: right')) alignment = AlignmentType.RIGHT;
              else if (styleAttr.includes('text-align: left')) alignment = AlignmentType.LEFT;
              
              sections.push(
                new Paragraph({
                  children: runs,
                  spacing: { line: 360, lineRule: 'auto', after: 240 },
                  indent: { firstLine: 720 },
                  alignment: alignment,
                })
              );
            }
          }
        }
      }
    };

    elements.forEach(node => processNode(node));
    
    if (sections.length === 0) sections.push(new Paragraph({ children: [new TextRun('')] }));
    
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margins: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
              header: 720,
              footer: 720,
              gutter: 0,
            },
            size: {
              width: 12240,
              height: 15840,
            },
          }
        },
        children: sections
      }]
    });
    const blob = await Packer.toBlob(doc);
    downloadFile(blob, `${documentTitle || 'document'}.docx`);
  };

  const exportPptx = async () => {
    const pptx = new PptxGenJS();
    content.forEach(slide => {
      if (slide.type === 'slide') {
        const s = pptx.addSlide();
        s.addText(slide.title || 'Slide', { x: 0.5, y: 0.5, fontSize: 26, color: '363636', bold: true });
        s.addText(slide.content || '', { x: 0.5, y: 1.4, fontSize: 16, color: '555555', wrap: true, w: '90%' });
      }
    });
    await pptx.writeFile({ fileName: `${documentTitle || 'presentation'}.pptx` });
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    excelSheets.forEach((sheet, idx) => {
      const plainData = sheet.data.map(row => row.map(cell => cell.value));
      const ws = XLSX.utils.aoa_to_sheet(plainData);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name || `Sheet${idx + 1}`);
    });
    downloadFile(
      new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' }),
      `${documentTitle || 'spreadsheet'}.xlsx`
    );
  };

  // ===== PPT GENERATION VIA SERVER (with security) =====
  const generatePptxViaServer = async () => {
    try {
      if (!Array.isArray(content) || content.length === 0) {
        alert('Tambahkan slide sebelum generate');
        return;
      }

      setIsPptGenerating(true);
      setPptGenerationStatus('Mempersiapkan data...');

      // Extract slides data for server
      const slides = content
        .filter(slide => slide.type === 'slide')
        .map(slide => ({
          title: slide.title || 'Slide',
          content: slide.content || ''
        }));

      if (slides.length === 0) {
        alert('Minimal 1 slide dengan konten');
        setIsPptGenerating(false);
        return;
      }

      setPptGenerationStatus(`Mengirim ${slides.length} slide ke server...`);

      const requestPayload = {
        title: documentTitle || 'Untitled Presentation',
        subtitle: 'Dibuat oleh Deepernova',
        template: pptTemplate,
        slides: slides
      };

      console.log('[PPT_EDITOR] Sending to /api/generate-ppt:', {
        title: requestPayload.title,
        slide_count: slides.length,
        bytes: JSON.stringify(requestPayload).length
      });

      const response = await fetch('/api/generate-ppt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result.error || result.data?.error || 'Gagal generate PPT';
        setPptGenerationStatus(`❌ Error: ${errorMsg}`);
        alert(`Error: ${errorMsg}`);
        setIsPptGenerating(false);
        return;
      }

      setPptGenerationStatus(`✅ Berhasil! Mengunduh ${result.slides_count} slides...`);

      // Track generated file
      setGeneratedPptFiles(prev => [...prev, {
        filename: result.filename,
        url: result.downloadUrl,
        slides: result.slides_count,
        size: result.size_mb,
        timestamp: new Date().toLocaleString()
      }]);
      
      setShowPptResults(true);

      // Download file from server
      const downloadUrl = result.downloadUrl;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = result.filename || `${documentTitle || 'presentation'}.pptx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('[PPT_EDITOR] ✅ Download complete:', result.filename);
      
      setTimeout(() => {
        setPptGenerationStatus('');
        setIsPptGenerating(false);
      }, 2000);

    } catch (error) {
      console.error('[PPT_EDITOR] Error:', error);
      const errMsg = error.message || 'Kesalahan saat generate';
      setPptGenerationStatus(`❌ ${errMsg}`);
      alert(`Error: ${errMsg}`);
      setIsPptGenerating(false);
    }
  };

  // ===== PPT FILE UPLOAD =====
  const handlePptUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.pptx')) {
      alert('Hanya file .pptx yang didukung');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedPptFile({
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2),
        type: 'uploaded',
        timestamp: new Date().toLocaleString(),
        data: e.target?.result
      });
      setShowPptResults(true);
    };
    reader.readAsArrayBuffer(file);
  };

  // ===== PPT SLIDE PREVIEW =====
  const extractSlidesFromPptx = async (pptxData) => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      await zip.loadAsync(pptxData);

      // Get slide content
      const slides = [];
      let slideNum = 1;
      
      while (true) {
        const slidePath = `ppt/slides/slide${slideNum}.xml`;
        const slideFile = zip.file(slidePath);
        if (!slideFile) break;

        const slideXml = await slideFile.async('text');
        const parser = new DOMParser();
        const slideDoc = parser.parseFromString(slideXml, 'text/xml');

        const paragraphs = Array.from(slideDoc.querySelectorAll('a\\:p'))
          .map(p => Array.from(p.querySelectorAll('a\\:t, t'))
            .map(el => el.textContent?.trim())
            .filter(Boolean)
            .join(' ')
          )
          .filter(Boolean);

        const title = paragraphs.length > 0 ? paragraphs[0] : `Slide ${slideNum}`;
        const body = paragraphs.slice(1).map(line => line.replace(/^[-•]\s*/, '').trim());
        const lines = body.length > 0 ? body : paragraphs.length > 1 ? paragraphs.slice(1) : [];
        const content = [title, ...lines].join('\n');

        slides.push({
          number: slideNum,
          title,
          lines,
          content,
        });

        slideNum += 1;
      }

      return slides.length > 0 ? slides : [{ number: 1, content: 'Empty presentation' }];
    } catch (error) {
      console.error('Error parsing PPTX:', error);
      return [{ number: 1, content: 'Gagal parse file' }];
    }
  };

  const handlePptPreview = async (file) => {
    if (file.type === 'uploaded' && file.data) {
      // Preview uploaded file
      const slides = await extractSlidesFromPptx(file.data);
      setPreviewSlides(slides);
      setPreviewPptFile(file);
      setCurrentSlideIdx(0);
    } else if (file.url) {
      // Preview generated file - fetch from server
      try {
        const response = await fetch(file.url);
        const arrayBuffer = await response.arrayBuffer();
        const slides = await extractSlidesFromPptx(arrayBuffer);
        setPreviewSlides(slides);
        setPreviewPptFile(file);
        setCurrentSlideIdx(0);
      } catch (error) {
        console.error('Error fetching PPT:', error);
        alert('Gagal load preview');
      }
    }
  };

  // ===== FORMATTING =====
  const applyFormatting = (command, value = null) => {
    document.execCommand(command, false, value);
    if (pageRef.current) {
      docxTextRef.current = pageRef.current.innerHTML;
      syncDocxContent();
      pageRef.current.focus();
    }
  };

  const formatText = (style) => {
    const map = {
      bold: 'bold', italic: 'italic', underline: 'underline', strikethrough: 'strikeThrough',
      left: 'justifyLeft', center: 'justifyCenter', right: 'justifyRight', justify: 'justifyFull',
      bullet: 'insertUnorderedList', number: 'insertOrderedList', undo: 'undo', redo: 'redo',
      indent: 'indent', outdent: 'outdent',
    };
    applyFormatting(map[style] || style);
  };

  const handleFontSize = (size) => { setFontSize(size); applyFormatting('fontSize', parseInt(size)); };
  const handleFontFamily = (font) => { setFontFamily(font); applyFormatting('fontName', font); };
  const handleTextColor = (color) => { setTextColor(color); applyFormatting('foreColor', color); };
  const handleHighlightColor = (color) => { setHighlightColor(color); applyFormatting('hiliteColor', color); };
  const handleLineSpacing = (spacing) => {
    setLineSpacing(spacing);
    if (pageRef.current) {
      pageRef.current.style.lineHeight = spacing;
    }
  };
  const handleClearFormatting = () => applyFormatting('removeFormat');

  const changeTextCase = (caseType) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const text = selection.toString();
    if (!text) return;
    let newText = '';
    if (caseType === 'upper') newText = text.toUpperCase();
    else if (caseType === 'lower') newText = text.toLowerCase();
    else if (caseType === 'capitalize') {
      newText = text.replace(/\b\w/g, c => c.toUpperCase());
    } else if (caseType === 'sentence') {
      newText = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }
    document.execCommand('insertHTML', false, newText);
  };

  const promptLink = () => {
    const url = prompt('Masukkan URL tautan (Contoh: https://example.com):');
    if (url) {
      applyFormatting('createLink', url);
    }
  };

  const insertPageBreak = () => {
    const pbHtml = '<hr class="page-break" style="border: none; border-top: 2px dashed #106ebe; margin: 20px 0; text-align: center; color: #106ebe; font-size: 11px; user-select: none;" contenteditable="false" data-label="--- Batas Halaman (Page Break) ---" /><p>&nbsp;</p>';
    if (pageRef.current) {
      pageRef.current.focus();
      document.execCommand('insertHTML', false, pbHtml);
      docxTextRef.current = pageRef.current.innerHTML;
      syncDocxContent();
    }
  };

  const insertFinancialTemplate = (type) => {
    let templateHtml = '';
    if (type === 'labarugi') {
      templateHtml = `
        <h2 style="text-align: center; color: #106ebe; font-family: 'Times New Roman', serif; margin-bottom: 2px; font-weight: bold;">LAPORAN LABA RUGI</h2>
        <h4 style="text-align: center; color: #555; font-family: 'Times New Roman', serif; margin-top: 0; margin-bottom: 20px; font-style: italic;">Periode: Bulanan</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: 'Times New Roman', serif; border: 1px solid #d2d0ce;">
          <thead>
            <tr style="background-color: #f3f2f1; border-bottom: 2px solid #106ebe;">
              <th style="padding: 10px; text-align: left; font-weight: bold; border: 1px solid #d2d0ce;">Keterangan</th>
              <th style="padding: 10px; text-align: right; font-weight: bold; width: 180px; border: 1px solid #d2d0ce;">Jumlah (Rupiah)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #e1dfdd; font-weight: bold; background-color: #faf9f8;">
              <td style="padding: 8px; border: 1px solid #d2d0ce;">1. PENDAPATAN</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #d2d0ce;"></td>
            </tr>
            <tr style="border-bottom: 1px solid #edebe9;">
              <td style="padding: 8px; padding-left: 20px; border: 1px solid #d2d0ce;">Pendapatan Penjualan</td>
              <td style="padding: 8px; text-align: right; color: #107c41; border: 1px solid #d2d0ce;">Rp 50.000.000</td>
            </tr>
            <tr style="border-bottom: 1px solid #e1dfdd; font-weight: bold; background-color: #faf9f8;">
              <td style="padding: 8px; border: 1px solid #d2d0ce;">2. BEBAN (PENGELUARAN)</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #d2d0ce;"></td>
            </tr>
            <tr style="border-bottom: 1px solid #edebe9;">
              <td style="padding: 8px; padding-left: 20px; border: 1px solid #d2d0ce;">Harga Pokok Penjualan (HPP)</td>
              <td style="padding: 8px; text-align: right; color: #a80000; border: 1px solid #d2d0ce;">Rp 20.000.000</td>
            </tr>
            <tr style="border-bottom: 1px solid #edebe9;">
              <td style="padding: 8px; padding-left: 20px; border: 1px solid #d2d0ce;">Beban Operasional & Gaji</td>
              <td style="padding: 8px; text-align: right; color: #a80000; border: 1px solid #d2d0ce;">Rp 10.000.000</td>
            </tr>
            <tr style="border-bottom: 1px solid #edebe9;">
              <td style="padding: 8px; padding-left: 20px; border: 1px solid #d2d0ce;">Beban Pemasaran & Iklan</td>
              <td style="padding: 8px; text-align: right; color: #a80000; border: 1px solid #d2d0ce;">Rp 5.000.000</td>
            </tr>
            <tr style="border-bottom: 1px solid #e1dfdd; font-weight: bold; background-color: #f3f2f1;">
              <td style="padding: 8px; border: 1px solid #d2d0ce;">TOTAL BEBAN</td>
              <td style="padding: 8px; text-align: right; color: #a80000; border: 1px solid #d2d0ce;">Rp 35.000.000</td>
            </tr>
            <tr style="border-bottom: 2px double #106ebe; font-weight: bold; background-color: #edebe9; font-size: 15px;">
              <td style="padding: 10px; color: #106ebe; border: 1px solid #d2d0ce;">LABA BERSIH (PENDAPATAN - BEBAN)</td>
              <td style="padding: 10px; text-align: right; color: #107c41; border: 1px solid #d2d0ce;">Rp 15.000.000</td>
            </tr>
          </tbody>
        </table>
        <p>&nbsp;</p>
      `;
    } else if (type === 'neraca') {
      templateHtml = `
        <h2 style="text-align: center; color: #106ebe; font-family: 'Times New Roman', serif; margin-bottom: 2px; font-weight: bold;">LAPORAN NERACA KEUANGAN</h2>
        <h4 style="text-align: center; color: #555; font-family: 'Times New Roman', serif; margin-top: 0; margin-bottom: 20px; font-style: italic;">Per Tanggal: Akhir Bulan</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: 'Times New Roman', serif; border: 1px solid #d2d0ce;">
          <thead>
            <tr style="background-color: #f3f2f1; border-bottom: 2px solid #106ebe;">
              <th style="padding: 10px; text-align: left; font-weight: bold; border: 1px solid #d2d0ce;">Aktiva (Aset)</th>
              <th style="padding: 10px; text-align: right; font-weight: bold; width: 140px; border: 1px solid #d2d0ce;">Nilai</th>
              <th style="padding: 10px; text-align: left; font-weight: bold; padding-left: 20px; border: 1px solid #d2d0ce;">Pasiva (Kewajiban & Modal)</th>
              <th style="padding: 10px; text-align: right; font-weight: bold; width: 140px; border: 1px solid #d2d0ce;">Nilai</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #edebe9; font-weight: bold; background-color: #faf9f8;">
              <td style="padding: 8px; border: 1px solid #d2d0ce;">ASET LANCAR</td>
              <td style="padding: 8px; border: 1px solid #d2d0ce;"></td>
              <td style="padding: 8px; padding-left: 20px; border: 1px solid #d2d0ce;">KEWAJIBAN (UTANG)</td>
              <td style="padding: 8px; border: 1px solid #d2d0ce;"></td>
            </tr>
            <tr style="border-bottom: 1px solid #edebe9;">
              <td style="padding: 6px; padding-left: 15px; border: 1px solid #d2d0ce;">Kas & Setara Kas</td>
              <td style="padding: 6px; text-align: right; border: 1px solid #d2d0ce;">Rp 30.000.000</td>
              <td style="padding: 6px; padding-left: 30px; border: 1px solid #d2d0ce;">Utang Dagang</td>
              <td style="padding: 6px; text-align: right; color: #a80000; border: 1px solid #d2d0ce;">Rp 5.000.000</td>
            </tr>
            <tr style="border-bottom: 1px solid #edebe9;">
              <td style="padding: 6px; padding-left: 15px; border: 1px solid #d2d0ce;">Persediaan Barang</td>
              <td style="padding: 6px; text-align: right; border: 1px solid #d2d0ce;">Rp 15.000.000</td>
              <td style="padding: 6px; padding-left: 30px; border: 1px solid #d2d0ce;">Utang Bank</td>
              <td style="padding: 6px; text-align: right; color: #a80000; border: 1px solid #d2d0ce;">Rp 10.000.000</td>
            </tr>
            <tr style="border-bottom: 1px solid #edebe9; font-weight: bold; background-color: #faf9f8;">
              <td style="padding: 8px; border: 1px solid #d2d0ce;">ASET TETAP</td>
              <td style="padding: 8px; border: 1px solid #d2d0ce;"></td>
              <td style="padding: 8px; padding-left: 20px; border: 1px solid #d2d0ce;">MODAL (EKUITAS)</td>
              <td style="padding: 8px; border: 1px solid #d2d0ce;"></td>
            </tr>
            <tr style="border-bottom: 1px solid #edebe9;">
              <td style="padding: 6px; padding-left: 15px; border: 1px solid #d2d0ce;">Peralatan Toko</td>
              <td style="padding: 6px; text-align: right; border: 1px solid #d2d0ce;">Rp 10.000.000</td>
              <td style="padding: 6px; padding-left: 30px; border: 1px solid #d2d0ce;">Modal Pemilik</td>
              <td style="padding: 6px; text-align: right; border: 1px solid #d2d0ce;">Rp 40.000.000</td>
            </tr>
            <tr style="border-bottom: 1px solid #edebe9;">
              <td style="padding: 6px; padding-left: 15px; border: 1px solid #d2d0ce;">Akumulasi Penyusutan</td>
              <td style="padding: 6px; text-align: right; color: #a80000; border: 1px solid #d2d0ce;">-Rp 2.000.000</td>
              <td style="padding: 6px; padding-left: 30px; border: 1px solid #d2d0ce;">Laba Ditahan</td>
              <td style="padding: 6px; text-align: right; color: #107c41; border: 1px solid #d2d0ce;">Rp 12.000.000</td>
            </tr>
            <tr style="border-bottom: 2px double #106ebe; font-weight: bold; background-color: #edebe9;">
              <td style="padding: 10px; color: #106ebe; border: 1px solid #d2d0ce;">TOTAL AKTIVA</td>
              <td style="padding: 10px; text-align: right; color: #106ebe; border: 1px solid #d2d0ce;">Rp 53.000.000</td>
              <td style="padding: 10px; padding-left: 20px; color: #106ebe; border: 1px solid #d2d0ce;">TOTAL PASIVA</td>
              <td style="padding: 10px; text-align: right; color: #106ebe; border: 1px solid #d2d0ce;">Rp 53.000.000</td>
            </tr>
          </tbody>
        </table>
        <p style="font-size: 11px; font-style: italic; color: #666; text-align: center;">* Laporan neraca seimbang (Balanced).</p>
        <p>&nbsp;</p>
      `;
    } else if (type === 'aruskas') {
      templateHtml = `
        <h2 style="text-align: center; color: #106ebe; font-family: 'Times New Roman', serif; margin-bottom: 2px; font-weight: bold;">LAPORAN ARUS KAS</h2>
        <h4 style="text-align: center; color: #555; font-family: 'Times New Roman', serif; margin-top: 0; margin-bottom: 20px; font-style: italic;">Periode: Bulanan</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: 'Times New Roman', serif; border: 1px solid #d2d0ce;">
          <thead>
            <tr style="background-color: #f3f2f1; border-bottom: 2px solid #106ebe;">
              <th style="padding: 10px; text-align: left; font-weight: bold; border: 1px solid #d2d0ce;">Aktivitas Aliran Kas</th>
              <th style="padding: 10px; text-align: right; font-weight: bold; width: 180px; border: 1px solid #d2d0ce;">Nilai (Rupiah)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #edebe9; font-weight: bold; background-color: #faf9f8;">
              <td style="padding: 8px; border: 1px solid #d2d0ce;">1. ARUS KAS DARI AKTIVITAS OPERASIONAL</td>
              <td style="padding: 8px; border: 1px solid #d2d0ce;"></td>
            </tr>
            <tr style="border-bottom: 1px solid #edebe9;">
              <td style="padding: 6px; padding-left: 20px; border: 1px solid #d2d0ce;">Penerimaan Kas dari Pelanggan</td>
              <td style="padding: 6px; text-align: right; color: #107c41; border: 1px solid #d2d0ce;">Rp 50.000.000</td>
            </tr>
            <tr style="border-bottom: 1px solid #edebe9;">
              <td style="padding: 6px; padding-left: 20px; border: 1px solid #d2d0ce;">Pembayaran Kas untuk Operasional & Supplier</td>
              <td style="padding: 6px; text-align: right; color: #a80000; border: 1px solid #d2d0ce;">-Rp 30.000.000</td>
            </tr>
            <tr style="border-bottom: 1px solid #edebe9; font-weight: bold; background-color: #faf9f8;">
              <td style="padding: 8px; border: 1px solid #d2d0ce;">2. ARUS KAS DARI AKTIVITAS INVESTASI</td>
              <td style="padding: 8px; border: 1px solid #d2d0ce;"></td>
            </tr>
            <tr style="border-bottom: 1px solid #edebe9;">
              <td style="padding: 6px; padding-left: 20px; border: 1px solid #d2d0ce;">Pembelian Peralatan Komputer Baru</td>
              <td style="padding: 6px; text-align: right; color: #a80000; border: 1px solid #d2d0ce;">-Rp 5.000.000</td>
            </tr>
            <tr style="border-bottom: 1px solid #edebe9; font-weight: bold; background-color: #faf9f8;">
              <td style="padding: 8px; border: 1px solid #d2d0ce;">3. ARUS KAS DARI AKTIVITAS PENDANAAN</td>
              <td style="padding: 8px; border: 1px solid #d2d0ce;"></td>
            </tr>
            <tr style="border-bottom: 1px solid #edebe9;">
              <td style="padding: 6px; padding-left: 20px; border: 1px solid #d2d0ce;">Penerimaan Modal Pemilik Baru</td>
              <td style="padding: 6px; text-align: right; color: #107c41; border: 1px solid #d2d0ce;">Rp 10.000.000</td>
            </tr>
            <tr style="border-bottom: 1px solid #edebe9; font-weight: bold; background-color: #f3f2f1;">
              <td style="padding: 8px; border: 1px solid #d2d0ce;">KENAIKAN BERSIH KAS (OP + INV + PEND)</td>
              <td style="padding: 8px; text-align: right; color: #107c41; font-weight: bold; border: 1px solid #d2d0ce;">Rp 25.000.000</td>
            </tr>
            <tr style="border-bottom: 1px solid #edebe9;">
              <td style="padding: 8px; padding-left: 20px; font-weight: bold; border: 1px solid #d2d0ce;">Saldo Awal Kas Bulanan</td>
              <td style="padding: 8px; text-align: right; font-weight: bold; border: 1px solid #d2d0ce;">Rp 10.000.000</td>
            </tr>
            <tr style="border-bottom: 2px double #106ebe; font-weight: bold; background-color: #edebe9; font-size: 15px;">
              <td style="padding: 10px; color: #106ebe; border: 1px solid #d2d0ce;">SALDO AKHIR KAS BULANAN</td>
              <td style="padding: 10px; text-align: right; color: #107c41; border: 1px solid #d2d0ce;">Rp 35.000.000</td>
            </tr>
          </tbody>
        </table>
        <p>&nbsp;</p>
      `;
    }
    
    if (pageRef.current && templateHtml) {
      pageRef.current.focus();
      if (pageRef.current.innerHTML.trim() === '' || pageRef.current.innerHTML === '<p>Mulai menulis dokumen Anda di sini...</p>' || pageRef.current.innerText.trim() === '' || pageRef.current.innerText.trim() === 'Mulai menulis dokumen Anda di sini...') {
        pageRef.current.innerHTML = templateHtml;
      } else {
        document.execCommand('insertHTML', false, templateHtml);
      }
      docxTextRef.current = pageRef.current.innerHTML;
      syncDocxContent();
    }
  };

  // ===== RENDER =====
  return (
    <div className="document-editor-container">
      {/* Minimal Header */}
      {/* Combined Unified MS Word Header */}
      <div className="doc-editor-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#1f1f1f',
        borderBottom: '1px solid #1a1a1a',
        padding: '0 16px',
        height: '48px',
        flexShrink: 0,
        color: '#ffffff'
      }}>
        {/* Left Side: Back & Title + Ribbon Tabs */}
        <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '20px', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="back-to-chat-btn" onClick={() => onNavigate?.('chat')} title="Kembali" style={{ color: '#ffffff', background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px' }}>
              <i className="fas fa-chevron-left"></i>
            </button>
            <input 
              type="text" 
              value={documentTitle} 
              onChange={e => setDocumentTitle(e.target.value)}
              className="doc-title-input" 
              placeholder="Untitled" 
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
                outline: 'none',
                width: '180px',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Inline Word Ribbon Tabs */}
          {editorType === 'docx' && (
            <div className="word-ribbon-tabs" style={{
              display: 'flex',
              background: 'transparent',
              borderBottom: 'none',
              padding: 0,
              gap: '2px',
              alignItems: 'flex-end',
              height: '100%',
              overflow: 'visible'
            }} title="Double click tab mana saja untuk sembunyikan/tampilkan toolbar">
              <button 
                className={`ribbon-tab-btn ${activeRibbonTab === 'file' ? 'active' : ''}`} 
                onClick={() => handleTabClick('file')}
                onDoubleClick={() => setIsRibbonCollapsed(!isRibbonCollapsed)}
                style={{
                  backgroundColor: activeRibbonTab === 'file' ? '#2b2b2b' : 'transparent',
                  color: activeRibbonTab === 'file' ? '#ffffff' : '#d1d5db',
                  height: '40px',
                  borderBottom: activeRibbonTab === 'file' ? '3px solid #106ebe' : 'none'
                }}
              >
                File
              </button>
              <button 
                className={`ribbon-tab-btn ${activeRibbonTab === 'home' ? 'active' : ''}`} 
                onClick={() => handleTabClick('home')}
                onDoubleClick={() => setIsRibbonCollapsed(!isRibbonCollapsed)}
                style={{
                  backgroundColor: activeRibbonTab === 'home' ? '#2b2b2b' : 'transparent',
                  color: activeRibbonTab === 'home' ? '#ffffff' : '#d1d5db',
                  height: '40px',
                  borderBottom: activeRibbonTab === 'home' ? '3px solid #106ebe' : 'none'
                }}
              >
                Home
              </button>
              <button 
                className={`ribbon-tab-btn ${activeRibbonTab === 'insert' ? 'active' : ''}`} 
                onClick={() => handleTabClick('insert')}
                onDoubleClick={() => setIsRibbonCollapsed(!isRibbonCollapsed)}
                style={{
                  backgroundColor: activeRibbonTab === 'insert' ? '#2b2b2b' : 'transparent',
                  color: activeRibbonTab === 'insert' ? '#ffffff' : '#d1d5db',
                  height: '40px',
                  borderBottom: activeRibbonTab === 'insert' ? '3px solid #106ebe' : 'none'
                }}
              >
                Insert
              </button>
              <button 
                className={`ribbon-tab-btn ${activeRibbonTab === 'layout' ? 'active' : ''}`} 
                onClick={() => handleTabClick('layout')}
                onDoubleClick={() => setIsRibbonCollapsed(!isRibbonCollapsed)}
                style={{
                  backgroundColor: activeRibbonTab === 'layout' ? '#2b2b2b' : 'transparent',
                  color: activeRibbonTab === 'layout' ? '#ffffff' : '#d1d5db',
                  height: '40px',
                  borderBottom: activeRibbonTab === 'layout' ? '3px solid #106ebe' : 'none'
                }}
              >
                Layout
              </button>
              <button 
                className={`ribbon-tab-btn ${activeRibbonTab === 'draw' ? 'active' : ''}`} 
                onClick={() => handleTabClick('draw')}
                onDoubleClick={() => setIsRibbonCollapsed(!isRibbonCollapsed)}
                style={{
                  backgroundColor: activeRibbonTab === 'draw' ? '#2b2b2b' : 'transparent',
                  color: activeRibbonTab === 'draw' ? '#ffffff' : '#d1d5db',
                  height: '40px',
                  borderBottom: activeRibbonTab === 'draw' ? '3px solid #106ebe' : 'none'
                }}
              >
                Draw
              </button>
              <button 
                className={`ribbon-tab-btn ${activeRibbonTab === 'ai' ? 'active' : ''}`} 
                onClick={() => handleTabClick('ai')}
                onDoubleClick={() => setIsRibbonCollapsed(!isRibbonCollapsed)}
                style={{
                  backgroundColor: activeRibbonTab === 'ai' ? '#2b2b2b' : 'transparent',
                  color: '#60a5fa',
                  height: '40px',
                  fontWeight: '600',
                  borderBottom: activeRibbonTab === 'ai' ? '3px solid #106ebe' : 'none'
                }}
              >
                AI ✨
              </button>
            </div>
          )}
        </div>

        {/* Center: Mode Indicator for Non-Docx */}
        {editorType !== 'docx' && (
          <div style={{ color: '#888', fontSize: '13px', fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>
            {editorType === 'pptx' ? '📊 PowerPoint Mode' : '📈 Excel Spreadsheet Mode'}
          </div>
        )}

        {/* Right Side: Mode Switcher & Tools */}
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="editor-type-selector" style={{ background: '#333', padding: '2px', borderRadius: '4px', display: 'flex', gap: '2px' }}>
            <button className={`type-btn ${editorType === 'docx' ? 'active' : ''}`} onClick={() => setEditorType('docx')} style={{ background: editorType === 'docx' ? '#106ebe' : 'transparent', color: '#fff', border: 'none', padding: '4px 10px', fontSize: '11px', borderRadius: '2px', cursor: 'pointer', fontWeight: 'bold' }}>DOCX</button>
            <button className={`type-btn ${editorType === 'pptx' ? 'active' : ''}`} onClick={() => setEditorType('pptx')} style={{ background: editorType === 'pptx' ? '#d83b01' : 'transparent', color: '#fff', border: 'none', padding: '4px 10px', fontSize: '11px', borderRadius: '2px', cursor: 'pointer', fontWeight: 'bold' }}>PPTX</button>
            <button className={`type-btn ${editorType === 'excel' ? 'active' : ''}`} onClick={() => setEditorType('excel')} style={{ background: editorType === 'excel' ? '#107c41' : 'transparent', color: '#fff', border: 'none', padding: '4px 10px', fontSize: '11px', borderRadius: '2px', cursor: 'pointer', fontWeight: 'bold' }}>XLSX</button>
          </div>
          {pptGenerationStatus && (
            <span className={`ppt-status ${isPptGenerating ? 'generating' : 'complete'}`} style={{ fontSize: '11px', color: '#60a5fa' }}>
              {isPptGenerating ? '⏳ ' : ''}{pptGenerationStatus}
            </span>
          )}
          {editorType === 'pptx' && (
            <>
              <button className="artifact-btn" onClick={() => setShowPptResults(!showPptResults)} title="PPT Results" style={{ background: '#333', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                📊 {generatedPptFiles.length + (uploadedPptFile ? 1 : 0)}
              </button>
              <input 
                ref={pptUploadRef} 
                type="file" 
                accept=".pptx" 
                style={{ display: 'none' }} 
                onChange={handlePptUpload}
              />
              <button className="artifact-btn" onClick={() => pptUploadRef.current?.click()} title="Upload PPT" style={{ background: '#333', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                📂
              </button>
            </>
          )}
          <button 
            className={`artifact-btn ${showAiPanel ? 'active' : ''}`} 
            onClick={() => setShowAiPanel(!showAiPanel)} 
            title={showAiPanel ? "Tutup Panel Agen AI" : "Buka Panel Agen AI"}
            style={{ background: showAiPanel ? 'var(--orange)' : '#333', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}
          >
            💡
          </button>
          <button className="artifact-btn" onClick={() => setShowArtifacts(!showArtifacts)} title="Artifacts" style={{ background: showArtifacts ? '#106ebe' : '#333', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>
            {showArtifacts ? '✕' : '+'}
          </button>
          <button className="export-btn" onClick={handleExport} disabled={isPptGenerating} title="Export" style={{ background: '#106ebe', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isPptGenerating ? '⏳' : '⬇ Export'}
          </button>
        </div>
      </div>

      <div className="editor-layout">
        {editorType === 'pptx' ? (
          <div className="pptx-layout">
            <div className="pptx-editor-section">
              <div className="ppt-template-bar">
                <span className="ppt-template-label">Template:</span>
                <div className="ppt-template-selector">
                  {['classic', 'modern', 'bold', 'minimal'].map(option => (
                    <button
                      key={option}
                      className={`ppt-template-btn ${pptTemplate === option ? 'active' : ''}`}
                      onClick={() => setPptTemplate(option)}
                      type="button"
                    >
                      {option === 'classic' ? 'Classic' : option === 'modern' ? 'Modern' : option === 'bold' ? 'Bold' : 'Minimal'}
                    </button>
                  ))}
                </div>
              </div>
              {renderEditor()}
            </div>
            <div className="pptx-chat-section">
              {showAiPanel && (
                <div className={`ai-panel ${isAiMinimized ? 'minimized' : ''}`} ref={aiPanelRef}>
                  <div className="ai-header">
                    <span className="ai-title">💬 Chat</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        className="minimize-btn" 
                        onClick={() => setIsAiMinimized(!isAiMinimized)}
                        style={{
                          background: 'transparent', border: 'none', fontSize: '13px', cursor: 'pointer', color: '#64748b'
                        }}
                        title={isAiMinimized ? "Expand" : "Minimize"}
                      >
                        {isAiMinimized ? <i className="fas fa-chevron-up"></i> : <i className="fas fa-chevron-down"></i>}
                      </button>
                      <button className="close-btn" onClick={() => setShowAiPanel(false)}>✕</button>
                    </div>
                  </div>
                  <div className="ai-content">
                    {generationProgress && (
                      <div className="generation-status-wrapper">
                        <div className="generation-status-spinner"></div>
                        <span className="generation-status-text">{generationProgress}</span>
                      </div>
                    )}
                    {aiError && <div className="error-message">{aiError}</div>}

                    <div className="ai-input-section">
                      <div className="textarea-wrapper">
                        <textarea
                          value={aiPrompt}
                          onChange={e => {
                            setAiPrompt(e.target.value);
                            const ta = e.target;
                            ta.style.height = 'auto';
                            ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
                          }}
                          placeholder={messages.length === 0 ? "Chat with Deepernova..." : "Reply to Deepernova..."}
                          disabled={isGenerating}
                          className="message-input"
                          rows={1}
                        />
                      </div>
                      <button
                        className={`action-button ${isGenerating ? 'stop-mode' : 'send-mode'}`}
                        onClick={isGenerating ? handleStopStreaming : () => handleAiWrite()}
                        disabled={!isGenerating && !aiPrompt.trim()}
                      >
                        {isGenerating ? 'Stop' : 'Send'}
                      </button>
                    </div>

                    {isStreaming && streamingContent && (
                      <div className="ai-response-compact streaming">
                        <div className="response-label">
                          <span>Streaming</span>
                          <span className="streaming-dot">●</span>
                        </div>
                        <div className="ai-response-content">
                          {streamingContent.split('\n').slice(0, 10).map((line, idx) => (
                            <p key={idx} className="response-line">{line || '\u00A0'}</p>
                          ))}
                          {streamingContent.split('\n').length > 10 && <p className="response-more">...</p>}
                          <p className="streaming-cursor">▌</p>
                        </div>
                      </div>
                    )}

                    {!isStreaming && aiResponse && (
                      <div className="ai-response-compact">
                        <div className="response-label">Preview</div>
                        <div className="ai-response-content">
                          {aiResponse.split('\n').slice(0, 8).map((line, idx) => (
                            <p key={idx} className="response-line">{line}</p>
                          ))}
                          {aiResponse.split('\n').length > 8 && <p className="response-more">...</p>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {previewPptFile && previewSlides.length > 0 && (
              <div className="pptx-preview-section">
                <div className="ppt-preview-inline">
                  <div className="ppt-preview-header">
                    <div className="ppt-preview-title">
                      <span>{previewPptFile.name || previewPptFile.filename}</span>
                      <span className="ppt-slide-counter">
                        {currentSlideIdx + 1} / {previewSlides.length}
                      </span>
                    </div>
                    <button className="ppt-preview-close" onClick={() => { setPreviewPptFile(null); setPreviewSlides([]); }}>✕</button>
                  </div>
                  <div className="ppt-preview-content">
                    <div className="ppt-slide-display">
                      <div className="ppt-slide-number">
                        SLIDE {previewSlides[currentSlideIdx]?.number}
                      </div>
                      <div className="ppt-slide-content-card">
                        <div className="ppt-slide-title">
                          {previewSlides[currentSlideIdx]?.title}
                        </div>
                        {previewSlides[currentSlideIdx]?.lines?.length > 0 ? (
                          <ul className="ppt-slide-bullets">
                            {previewSlides[currentSlideIdx].lines.map((line, idx) => (
                              <li key={idx}>{line}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="ppt-slide-text">
                            {previewSlides[currentSlideIdx]?.content}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="ppt-preview-controls">
                    <button 
                      className="ppt-nav-btn" 
                      onClick={() => setCurrentSlideIdx(Math.max(0, currentSlideIdx - 1))}
                      disabled={currentSlideIdx === 0}
                    >
                      ← Sebelumnya
                    </button>
                    
                    <div className="ppt-slide-dots">
                      {previewSlides.map((_, idx) => (
                        <button
                          key={idx}
                          className={`ppt-dot ${idx === currentSlideIdx ? 'active' : ''}`}
                          onClick={() => setCurrentSlideIdx(idx)}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>

                    <button 
                      className="ppt-nav-btn" 
                      onClick={() => setCurrentSlideIdx(Math.min(previewSlides.length - 1, currentSlideIdx + 1))}
                      disabled={currentSlideIdx === previewSlides.length - 1}
                    >
                      Selanjutnya →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
        <div className="editor-center">
          <div className="editor-main" style={{ overflow: 'hidden', padding: 0 }}>
            {renderEditor()}
          </div>
        </div>

        {/* Artifacts Panel */}
        {showArtifacts && (
          <div className="artifacts-panel">
            <div className="artifacts-header">
              <span className="artifacts-title">Artifacts ({artifacts.length})</span>
              <div className="artifacts-controls">
                <label className="auto-regen-toggle" title="Auto-regenerate on edit">
                  <input type="checkbox" checked={autoRegenerate} onChange={e => setAutoRegenerate(e.target.checked)} />
                  <span>Auto</span>
                </label>
                <button className="close-btn" onClick={() => setShowArtifacts(false)}>✕</button>
              </div>
            </div>
            <div className="artifacts-list">
              {artifacts.length === 0 && (
                <div className="artifacts-empty">
                  <p>No artifacts yet.</p>
                  <p className="artifacts-hint">Generate content with AI to create artifacts.</p>
                </div>
              )}
              {artifacts.map(art => (
                <div key={art.id} className={`artifact-item ${selectedArtifact?.id === art.id ? 'active' : ''}`}
                  onClick={() => loadArtifact(art)}>
                  <div className="artifact-icon">
                    {art.type === 'docx' ? '📄' : art.type === 'pptx' ? '📊' : '📈'}
                  </div>
                  <div className="artifact-info">
                    <div className="artifact-prompt">{art.prompt?.slice(0, 60)}{art.prompt?.length > 60 ? '...' : ''}</div>
                    <div className="artifact-meta">
                      <span className="artifact-type">{art.type?.toUpperCase()}</span>
                      <span className="artifact-time">{new Date(art.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <button className="artifact-delete" onClick={e => { e.stopPropagation(); deleteArtifact(art.id); }}>🗑</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Panel */}
        {showHistoryPanel && (
          <div className="artifacts-panel history-panel" style={{ width: '320px', display: 'flex', flexDirection: 'column' }}>
            <div className="artifacts-header">
              <span className="artifacts-title">📜 Versi Dokumen ({docHistory.length})</span>
              <button className="close-btn" onClick={() => setShowHistoryPanel(false)}>✕</button>
            </div>
            <div className="artifacts-list" style={{ padding: '10px', overflowY: 'auto' }}>
              {docHistory.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
                  Belum ada riwayat perubahan.
                </div>
              ) : (
                docHistory.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`artifact-item ${idx === docHistoryIdx ? 'active' : ''}`}
                    onClick={() => {
                      if (pageRef.current) {
                        pageRef.current.innerHTML = item.html;
                        docxTextRef.current = item.html;
                        syncDocxContent();
                        docHistoryIdxRef.current = idx;
                        setDocHistoryIdx(idx);
                      }
                    }}
                    style={{ padding: '10px', cursor: 'pointer', borderRadius: '8px', border: idx === docHistoryIdx ? '1px solid var(--orange)' : '1px solid #e2e8f0', marginBottom: '8px', background: idx === docHistoryIdx ? 'rgba(255, 107, 0, 0.05)' : '#fff' }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '12.5px', color: '#1e293b' }}>
                      {idx === docHistoryIdx ? '👉 ' : ''}{item.action}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Typo Panel */}
        {showTypoPanel && (
          <div className="artifacts-panel typo-panel" style={{ width: '320px', display: 'flex', flexDirection: 'column' }}>
            <div className="artifacts-header">
              <span className="artifacts-title">🔍 Typo & Ejaan ({detectedTypos.length})</span>
              <button className="close-btn" onClick={() => { setShowTypoPanel(false); clearAllTypoHighlights(); }}>✕</button>
            </div>
            <div className="artifacts-list" style={{ padding: '10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {detectedTypos.length === 0 ? (
                <div style={{ color: '#10b981', fontSize: '13px', textAlign: 'center', marginTop: '20px', fontWeight: 600 }}>
                  🎉 Tidak ada typo terdeteksi!
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                    <button onClick={fixAllTypos} style={{ flex: 1, padding: '8px', background: 'linear-gradient(135deg, #ff6b00 0%, #dd5700 100%)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}>
                      ✨ Perbaiki Semua
                    </button>
                    <button onClick={clearAllTypoHighlights} style={{ padding: '8px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11.5px', color: '#475569', cursor: 'pointer' }}>
                      Clear
                    </button>
                  </div>
                  {detectedTypos.map((typo, idx) => (
                    <div key={idx} style={{ padding: '10px', background: '#fefefe', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ textDecoration: 'line-through', color: '#ef4444', fontWeight: 600, fontSize: '12px' }}>"{typo.word}"</span>
                        <i className="fas fa-arrow-right" style={{ fontSize: '10px', color: '#94a3b8' }}></i>
                        <span style={{ color: '#10b981', fontWeight: 600, fontSize: '12.5px' }}>"{typo.suggestion}"</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                        Konteks: "...{typo.context}..."
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <button onClick={() => fixTypo(typo)} style={{ flex: 1, padding: '4px 8px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '11px', color: '#15803d', fontWeight: 600, cursor: 'pointer' }}>
                          Fix
                        </button>
                        <button onClick={() => setDetectedTypos(prev => prev.filter((_, i) => i !== idx))} style={{ padding: '4px 8px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', color: '#64748b', cursor: 'pointer' }}>
                          Ignore
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* AI Panel */}
        {showAiPanel && (
          <div className={`ai-panel ${isAiMinimized ? 'minimized' : ''}`} ref={aiPanelRef} style={{ width: '360px', display: 'flex', flexDirection: 'column' }}>
            {/* ── HEADER ── */}
            <div className="ai-header">
              <span className="ai-title">{isAgentRunning ? <span><i className="fas fa-robot" style={{marginRight:5, color:'var(--orange)'}}></i>Deepernova Word Agent</span> : <span><i className="fas fa-magic" style={{marginRight:5}}></i>AI Chat</span>}</span>
              <div className="ai-header-controls">
                <button 
                  className="minimize-btn" 
                  onClick={() => setShowAiPanel(false)}
                  style={{
                    background: 'transparent', border: 'none', fontSize: '13px', cursor: 'pointer', color: '#64748b', marginRight: '6px'
                  }}
                  title="Tutup (Kerja di Latar Belakang)"
                >
                  <i className="fas fa-chevron-down"></i>
                </button>
                <label className="auto-regen-toggle" title="Auto-regenerate on edit">
                  <input type="checkbox" checked={autoRegenerate} onChange={e => setAutoRegenerate(e.target.checked)} />
                  <span>Auto</span>
                </label>
                <button className="close-btn" onClick={() => setShowAiPanel(false)}>✕</button>
              </div>
            </div>

            {isAgentRunning ? (
              <div className="agent-execution-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: 'calc(100% - 48px)', overflowY: 'auto', padding: '16px', background: '#f8fafc' }}>
                {/* Goal Header */}
                <div className="agent-goal-card" style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', border: '1px solid #fed7aa', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tujuan Agen</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#431407', marginTop: '4px' }}>
                    {agentOutline.length === 2 && agentOutline[1] === 'Eksekusi Modifikasi' ? 'Perbaikan Dokumen' : 'Penyusunan Dokumen Baru'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#7c2d12', marginTop: '2px', fontStyle: 'italic', wordBreak: 'break-word' }}>
                    "{aiPromptRef.current || (agentOutline.length === 2 ? 'Modifikasi Dokumen' : 'Penyusunan Laporan')}"
                  </div>
                </div>

                {/* Streaming content preview (Moved to the very top!) */}
                {streamingContent && (
                  <div className="agent-section-card">
                    <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}><i className="fas fa-eye"></i> Pratinjau Teks (Streaming)</div>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', fontSize: '11.5px', color: '#475569', maxOpacity: 0.85, maxHeight: '100px', overflowY: 'auto', fontStyle: 'italic', marginTop: '4px' }}>
                      {streamingContent.slice(-150)}...
                    </div>
                  </div>
                )}

                {/* Outline / Checklist Progress */}
                <div className="agent-section-card">
                  <div 
                    className="section-title" 
                    onClick={() => setShowAgentOutlineProgress(!showAgentOutlineProgress)} 
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fas fa-list-ol"></i> Progress Kerangka Dokumen
                    </span>
                    <i className={`fas ${showAgentOutlineProgress ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ fontSize: '10px', color: '#94a3b8' }}></i>
                  </div>
                  
                  {showAgentOutlineProgress && (
                    <div className="agent-checklist-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      {agentChecklist.map((item, idx) => {
                        let icon = <i className="far fa-circle" style={{ color: '#94a3b8' }}></i>;
                        let className = 'pending';
                        let textColor = '#64748b';
                        
                        if (item.status === 'generating') {
                          icon = <i className="fas fa-spinner fa-spin" style={{ color: 'var(--orange)' }}></i>;
                          className = 'generating';
                          textColor = 'var(--orange)';
                        } else if (item.status === 'done') {
                          icon = <i className="fas fa-check-circle" style={{ color: '#10b981' }}></i>;
                          className = 'done';
                          textColor = '#10b981';
                        }

                        return (
                          <div key={idx} className={`agent-checklist-item ${className}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: item.status === 'generating' ? '#fffaf8' : '#ffffff', border: `1px solid ${item.status === 'generating' ? '#ffedd5' : '#e2e8f0'}`, padding: '8px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: item.status === 'generating' ? 600 : 500, color: textColor }}>
                            {icon}
                            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Live Terminal Logs (With auto-scroll Ref attached) */}
                <div className="agent-section-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '180px' }}>
                  <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}><i className="fas fa-terminal"></i> Log Aktivitas Agen</div>
                  <div ref={agentLogsBoxRef} className="agent-logs-box" style={{ flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '10px', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '11px', overflowY: 'auto', maxHeight: '180px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                    {agentLogs.length === 0 && <div style={{ color: '#64748b' }}>Menunggu aktivitas...</div>}
                    {agentLogs.map((log, idx) => {
                      let color = '#94a3b8';
                      if (log.type === 'success') color = '#34d399';
                      if (log.type === 'error') color = '#f87171';
                      if (log.type === 'search') color = '#60a5fa';
                      if (log.type === 'drafting') color = '#fb923c';

                      return (
                        <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', lineHeight: '1.4' }}>
                          <span style={{ color: '#64748b', flexShrink: 0 }}>[{log.time}]</span>
                          <span style={{ color: color }}>{log.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Found Sources & Citations */}
                {agentSources.length > 0 && (
                  <div className="agent-section-card">
                    <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}><i className="fas fa-link"></i> Referensi yang Digunakan ({agentSources.length})</div>
                    <div className="agent-sources-box" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                      {agentSources.map((source, idx) => (
                        <a key={idx} href={source.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', fontSize: '11px', color: '#334155', transition: 'all 0.2s' }} className="agent-source-link">
                          <i className={source.type === 'workspace' ? 'fas fa-file-alt' : 'fas fa-globe'} style={{ color: source.type === 'workspace' ? '#f59e0b' : '#3b82f6' }}></i>
                          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{source.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cancel Button */}
                <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                  <button onClick={cancelAgent} style={{ width: '100%', padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <i className="fas fa-stop"></i> Batalkan Proses Agen
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="ai-panel-body" style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Message List */}
                  <div className="ai-chat-history" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {messages.length === 0 && (
                      <div className="ai-chat-empty-state" style={{ textAlign: 'center', padding: '20px 10px', color: '#94a3b8' }}>
                        <i className="fas fa-comments" style={{ fontSize: '32px', marginBottom: '8px', color: '#cbd5e1', display: 'block' }}></i>
                        <p style={{ margin: 0, fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>Tanya atau Instruksikan Deepernova AI</p>
                        <span style={{ fontSize: '11px', display: 'block', marginTop: '4px', color: '#94a3b8', marginBottom: '12px' }}>Gunakan perintah "/" untuk memicu perintah editing dokumen secara langsung.</span>
                      </div>
                    )}
                    
                    {messages.map((msg, idx) => {
                      if (msg.isFailedAgentCard) {
                        return (
                          <div key={idx} className="ai-chat-bubble-row assistant" style={{ display: 'flex', flexDirection: 'column', alignSelf: 'flex-start', maxWidth: '90%', alignItems: 'flex-start' }}>
                            <div className="ai-chat-bubble assistant" style={{
                              padding: '12px 14px',
                              borderRadius: '12px',
                              fontSize: '12.5px',
                              lineHeight: 1.5,
                              background: '#fef2f2',
                              color: '#991b1b',
                              border: '1px solid #fca5a5',
                              wordBreak: 'break-word',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                                <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444' }}></i>
                                <span>Agen Terhenti / Gagal</span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#7f1d1d' }}>
                                {msg.content || msg.text}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleContinueAgent(msg.agentState)}
                                style={{
                                  alignSelf: 'flex-start',
                                  background: '#dc2626',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '8px',
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  marginTop: '4px',
                                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
                                  transition: 'background 0.2s'
                                }}
                              >
                                <i className="fas fa-redo-alt"></i> Continue
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={idx} className={`ai-chat-bubble-row ${msg.role}`} style={{ display: 'flex', flexDirection: 'column', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                          <div className={`ai-chat-bubble ${msg.role}`} style={{
                            padding: '10px 12px',
                            borderRadius: '12px',
                            fontSize: '12.5px',
                            lineHeight: 1.5,
                            background: msg.role === 'user' ? 'rgba(255, 107, 0, 0.08)' : '#f1f5f9',
                            color: msg.role === 'user' ? '#7c2d12' : '#334155',
                            border: msg.role === 'user' ? '1px solid rgba(255, 107, 0, 0.2)' : '1px solid #e2e8f0',
                            wordBreak: 'break-word'
                          }}>
                            {msg.role === 'assistant' ? (
                              renderAssistantMessage(msg.content || msg.text || '')
                            ) : (
                              msg.content || msg.text
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {pendingExecutionText && (
                      <div className="ai-chat-bubble-row assistant" style={{ display: 'flex', flexDirection: 'column', alignSelf: 'flex-start', maxWidth: '90%' }}>
                        <div className="ai-chat-bubble assistant" style={{ background: '#fff7ed', border: '1px solid #fdba74', color: '#9a2c00' }}>
                          <div style={{ fontWeight: 700, marginBottom: '6px' }}>Persetujuan eksekusi</div>
                          <div>{pendingExecutionText}</div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button type="button" onClick={handleApproveExecution} style={{ border: 'none', borderRadius: '8px', padding: '6px 10px', background: 'var(--orange)', color: '#fff', cursor: 'pointer' }}>Eksekusi ke Canvas</button>
                            <button type="button" onClick={() => { setPendingExecution(false); setPendingExecutionText(''); }} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', background: '#fff', cursor: 'pointer' }}>Batal</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Streaming output bubble */}
                    {isStreaming && streamingContent && (
                      <div className="ai-chat-bubble-row assistant" style={{ display: 'flex', flexDirection: 'column', alignSelf: 'flex-start', maxWidth: '90%' }}>
                        <div className="ai-chat-bubble assistant" style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          fontSize: '12.5px',
                          lineHeight: 1.5,
                          background: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #e2e8f0',
                          wordBreak: 'break-word',
                          position: 'relative'
                        }}>
                          <div dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(streamingContent) }} />
                          <span className="streaming-cursor" style={{ display: 'inline-block', width: '2px', height: '14px', background: '#3b82f6', marginLeft: '2px' }}>▌</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                  {/* ── STICKY BOTTOM: Premium Input Bar & Interactive Upload Menu ── */}
                  <div className="modern-ai-chat-input-bar" style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                    {/* Hidden Inputs for Direct Photo vs Document Upload */}
                    <input 
                      type="file" 
                      ref={photoInputRef} 
                      onChange={handlePhotoUploadDirect} 
                      style={{ display: 'none' }} 
                      accept="image/*,.png,.jpg,.jpeg,.webp,.gif" 
                      disabled={isUploadingFile} 
                    />
                    <input 
                      type="file" 
                      ref={docInputRef} 
                      onChange={handleDocUploader} 
                      style={{ display: 'none' }} 
                      accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.xls,.json" 
                      disabled={isUploadingFile} 
                    />

                    {/* Interactive Pilih File / Foto Popover Menu */}
                    {showUploadMenu && (
                      <div className="upload-select-popover" style={{ position: 'absolute', bottom: '60px', left: '12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.1)', padding: '6px', width: '220px', zIndex: 100, animation: 'fadeInUp 0.18s ease-out' }}>
                        <div style={{ padding: '6px 10px 4px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pilih Jenis Lampiran</div>
                        
                        <button 
                          type="button" 
                          onClick={() => { photoInputRef.current?.click(); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 10px', border: 'none', background: 'transparent', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
                          className="popover-choice-btn"
                        >
                          <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '13px' }}>📷</div>
                          <div>
                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e293b' }}>Upload Foto / Gambar</div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>PNG, JPG, WEBP, GIF</div>
                          </div>
                        </button>

                        <button 
                          type="button" 
                          onClick={() => { docInputRef.current?.click(); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 10px', border: 'none', background: 'transparent', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
                          className="popover-choice-btn"
                        >
                          <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255, 107, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b00', fontSize: '13px' }}>📄</div>
                          <div>
                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e293b' }}>Upload Dokumen / Berkas</div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>PDF, Word, Excel, TXT</div>
                          </div>
                        </button>

                        <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />

                        <button 
                          type="button" 
                          onClick={() => { setChartModalTab('standard'); setShowChartModal(true); setShowUploadMenu(false); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 10px', border: 'none', background: 'transparent', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
                          className="popover-choice-btn"
                        >
                          <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: '13px' }}>📊</div>
                          <div>
                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e293b' }}>Buat Grafik & Pie Chart AI</div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>Pie, Bar, Line, Area, Scatter</div>
                          </div>
                        </button>

                        <button 
                          type="button" 
                          onClick={() => { setChartModalTab('curve'); setShowChartModal(true); setShowUploadMenu(false); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 10px', border: 'none', background: 'transparent', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
                          className="popover-choice-btn"
                        >
                          <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontSize: '13px' }}>📈</div>
                          <div>
                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e293b' }}>Buat Kurva Matematika AI</div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>Gauss, Sinusoidal, Trend</div>
                          </div>
                        </button>

                        <button 
                          type="button" 
                          onClick={() => { insertTableOfContentsInteractive(); setShowUploadMenu(false); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 10px', border: 'none', background: 'transparent', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
                          className="popover-choice-btn"
                        >
                          <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7', fontSize: '13px' }}>📋</div>
                          <div>
                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e293b' }}>Buat DAFTAR ISI Resmi AI</div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>Garis Titik-Titik Dotted Leaders</div>
                          </div>
                        </button>
                      </div>
                    )}

                    {/* Attachment / Photo Preview Badge */}
                    {uploadedFileName && (
                      <div className="ai-attachment-preview-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: uploadedFileType === 'image' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 107, 0, 0.08)', border: `1px solid ${uploadedFileType === 'image' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 107, 0, 0.25)'}`, borderRadius: '20px', fontSize: '11px', fontWeight: 600, color: uploadedFileType === 'image' ? '#b91c1c' : '#c2410c', alignSelf: 'flex-start', maxWidth: '100%' }}>
                        {uploadedFileType === 'image' && imgDataUrl ? (
                          <img src={imgDataUrl} alt="Thumbnail" style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #ef4444' }} />
                        ) : (
                          <i className="fas fa-file-alt" style={{ color: '#ff6b00' }}></i>
                        )}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{uploadedFileName}</span>
                        <button 
                          type="button"
                          onClick={(e) => { 
                            e.preventDefault(); 
                            setUploadedFileName(''); 
                            setUploadedFileText(''); 
                            setUploadedFileType(''); 
                            setImgDataUrl('');
                          }} 
                          title="Hapus Lampiran" 
                          style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', marginLeft: '4px' }}
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Sleek Input Card Wrapper */}
                    <div className="input-box-wrapper" style={{ display: 'flex', alignItems: 'flex-end', background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '16px', padding: '5px 8px 5px 8px', gap: '6px', transition: 'all 0.2s ease', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                      {/* Plus / Upload Trigger Button */}
                      <button 
                        type="button"
                        className="unified-upload-btn" 
                        onClick={() => setShowUploadMenu(!showUploadMenu)}
                        title="Tambah Foto atau Dokumen" 
                        style={{ cursor: 'pointer', border: 'none', background: showUploadMenu ? '#ff6b00' : 'rgba(241, 245, 249, 0.9)', color: showUploadMenu ? '#ffffff' : '#ff6b00', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', flexShrink: 0 }}
                      >
                        {isUploadingFile ? (
                          <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fas fa-plus" style={{ fontSize: '14px', transform: showUploadMenu ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s ease' }}></i>
                        )}
                      </button>

                      <textarea
                        value={aiPrompt}
                        onChange={e => {
                          setAiPrompt(e.target.value);
                          const ta = e.target;
                          ta.style.height = 'auto';
                          ta.style.height = Math.min(ta.scrollHeight, 130) + 'px';
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
                            e.preventDefault();
                            handleAiWrite();
                          }
                        }}
                        placeholder={messages.length === 0 ? "Ketik instruksi AI, upload foto/file, atau /perbaiki..." : "Tulis pesan ke Deepernova AI..."}
                        disabled={isGenerating}
                        className="message-input"
                        rows={1}
                        style={{ flex: 1, resize: 'none', border: 'none', background: 'transparent', padding: '6px 4px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', color: '#0f172a', maxHeight: '130px', lineHeight: '1.4' }}
                      />

                      <button
                        className={`action-button ${isGenerating ? 'stop-mode' : 'send-mode'}`}
                        onClick={isGenerating ? handleStopStreaming : () => handleAiWrite()}
                        disabled={!isGenerating && !aiPrompt.trim() && !imgDataUrl && !uploadedFileName}
                        style={{ background: isGenerating ? '#ef4444' : 'linear-gradient(135deg, #ff6b00 0%, #ea580c 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 3px 10px rgba(255,107,0,0.3)', flexShrink: 0 }}
                        title={isGenerating ? "Hentikan Generasi" : "Kirim Pesan"}
                      >
                        {isGenerating ? <i className="fas fa-stop"></i> : <i className="fas fa-arrow-up" style={{ fontWeight: 'bold' }}></i>}
                      </button>
                    </div>
                  </div>
              </>
            )}
          </div>
        )}

        {/* PPT Results Panel */}
        {editorType === 'pptx' && (
          <div className="ppt-results-panel">
            <div className="ppt-results-header">
              <span className="ppt-results-title">📊 PPT Files ({generatedPptFiles.length + (uploadedPptFile ? 1 : 0)})</span>
              <button className="close-btn" onClick={() => setShowPptResults(false)}>✕</button>
            </div>
            <div className="ppt-results-list">
              {/* Generated Files */}
              {generatedPptFiles.map((file, idx) => (
                <div key={`gen-${idx}`} className="ppt-file-item">
                  <div className="ppt-file-icon">📄</div>
                  <div className="ppt-file-info">
                    <div className="ppt-file-name">{file.filename}</div>
                    <div className="ppt-file-meta">
                      <span>📊 {file.slides} slides</span>
                      <span>💾 {file.size}MB</span>
                      <span>🕐 {file.timestamp}</span>
                    </div>
                  </div>
                  <div className="ppt-file-actions">
                    <a href={file.url} download={file.filename} className="ppt-download-btn" title="Download">⬇</a>
                    <button className="ppt-view-btn" onClick={() => handlePptPreview(file)} title="View">👁</button>
                  </div>
                </div>
              ))}
              
              {/* Uploaded File */}
              {uploadedPptFile && (
                <div className="ppt-file-item uploaded">
                  <div className="ppt-file-icon">📤</div>
                  <div className="ppt-file-info">
                    <div className="ppt-file-name">{uploadedPptFile.name}</div>
                    <div className="ppt-file-meta">
                      <span>📌 Uploaded</span>
                      <span>💾 {uploadedPptFile.size}MB</span>
                      <span>🕐 {uploadedPptFile.timestamp}</span>
                    </div>
                  </div>
                  <div className="ppt-file-actions">
                    <button className="ppt-view-btn" onClick={() => handlePptPreview(uploadedPptFile)} title="View">👁</button>
                  </div>
                </div>
              )}

              {generatedPptFiles.length === 0 && !uploadedPptFile && (
                <div className="ppt-empty-state">
                  <p>Belum ada file PPT</p>
                  <p className="ppt-empty-hint">Generate atau upload file PPT untuk melihatnya di sini</p>
                </div>
              )}
            </div>

            {previewPptFile && previewSlides.length > 0 && (
              <div className="ppt-preview-inline">
                <div className="ppt-preview-header">
                  <div className="ppt-preview-title">
                    <span>{previewPptFile.name || previewPptFile.filename}</span>
                    <span className="ppt-slide-counter">
                      {currentSlideIdx + 1} / {previewSlides.length}
                    </span>
                  </div>
                  <button className="ppt-preview-close" onClick={() => { setPreviewPptFile(null); setPreviewSlides([]); }}>✕</button>
                </div>
                <div className="ppt-preview-content">
                  <div className="ppt-slide-display">
                    <div className="ppt-slide-number">
                      SLIDE {previewSlides[currentSlideIdx]?.number}
                    </div>
                    <div className="ppt-slide-content-card">
                      <div className="ppt-slide-title">
                        {previewSlides[currentSlideIdx]?.title}
                      </div>
                      {previewSlides[currentSlideIdx]?.lines?.length > 0 ? (
                        <ul className="ppt-slide-bullets">
                          {previewSlides[currentSlideIdx].lines.map((line, idx) => (
                            <li key={idx}>{line}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="ppt-slide-text">
                          {previewSlides[currentSlideIdx]?.content}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ppt-preview-controls">
                  <button 
                    className="ppt-nav-btn" 
                    onClick={() => setCurrentSlideIdx(Math.max(0, currentSlideIdx - 1))}
                    disabled={currentSlideIdx === 0}
                  >
                    ← Sebelumnya
                  </button>
                  
                  <div className="ppt-slide-dots">
                    {previewSlides.map((_, idx) => (
                      <button
                        key={idx}
                        className={`ppt-dot ${idx === currentSlideIdx ? 'active' : ''}`}
                        onClick={() => setCurrentSlideIdx(idx)}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>

                  <button 
                    className="ppt-nav-btn" 
                    onClick={() => setCurrentSlideIdx(Math.min(previewSlides.length - 1, currentSlideIdx + 1))}
                    disabled={currentSlideIdx === previewSlides.length - 1}
                  >
                    Selanjutnya →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>
      {/* Floating Mobile AI Button */}
      <button className="mobile-ai-toggle-btn" onClick={() => setShowAiPanel(!showAiPanel)} title="Tanya AI">
        <i className="fas fa-magic"></i>
        <span>AI Agent</span>
      </button>

      {/* ── FLOATING BRAINSTORM CHAT MODAL ── */}
      {showBrainstormChat && (
        <div className="brainstorm-overlay" onClick={() => setShowBrainstormChat(false)}>
          <div className="brainstorm-chat-modal" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bc-header">
              <div className="bc-header-left">
                <div className="bc-avatar"><i className="fas fa-brain"></i></div>
                <div>
                  <div className="bc-title">Brainstorm AI</div>
                  <div className="bc-sub">{uploadedFileName || 'Dokumen Anda'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {brainstormMessages.length > 0 && (
                  <button 
                    className="bc-write-doc-btn"
                    onClick={() => {
                      const instr = prompt(userLanguage === 'id' ? "Masukkan instruksi penulisan dokumen (opsional):" : "Enter document writing instructions (optional):", userLanguage === 'id' ? "Buat dokumen lengkap berdasarkan hasil brainstorm di atas" : "Create complete document based on the brainstorm above");
                      if (instr !== null) {
                        handleBrainstormSend(`/buat ${instr}`);
                      }
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      padding: '4px 10px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      borderRadius: '12px',
                      transition: 'all 0.2s',
                      marginRight: '4px'
                    }}
                    title={userLanguage === 'id' ? "Buat dokumen dari brainstorm ini" : "Create document from this brainstorm"}
                  >
                    <i className="fas fa-file-signature"></i> {userLanguage === 'id' ? 'Buat Dokumen' : 'Write Document'}
                  </button>
                )}
                {brainstormMessages.length > 0 && (
                  <button 
                    className="bc-clear-history" 
                    onClick={() => {
                      if (confirm('Hapus riwayat diskusi brainstorm ini?')) {
                        setBrainstormMessages([]);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px'
                    }}
                    title="Hapus riwayat chat"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                )}
                <button className="bc-close" onClick={() => setShowBrainstormChat(false)}>✕</button>
              </div>
            </div>

            {/* Messages */}
            <div className="bc-messages" id="bc-messages-container">
              {brainstormMessages.length === 0 && (
                <div className="bc-empty">
                  <div className="bc-empty-icon">💬</div>
                  <p>Tanyakan apa saja tentang <strong>{uploadedFileName || 'dokumen Anda'}</strong></p>
                  <div className="bc-suggestions">
                    {[
                      'Apa inti dari dokumen ini?',
                      'Apa kelemahan utama dokumen ini?',
                      'Beri 5 pertanyaan diskusi',
                      'Apa rekomendasi pengembangannya?',
                    ].map((q, i) => (
                      <button key={i} className="bc-suggestion-btn" onClick={() => handleBrainstormSend(q)}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {brainstormMessages.map((msg, idx) => (
                <div key={idx} className={`bc-bubble-row ${msg.role}`}>
                  {msg.role === 'assistant' && (
                    <div className="bc-bot-avatar"><i className="fas fa-brain"></i></div>
                  )}
                  <div className={`bc-bubble ${msg.role}`}>
                    {msg.role === 'assistant' ? (
                      renderAssistantMessage(msg.text)
                    ) : (
                      msg.text
                    )}
                  </div>
                </div>
              ))}
              {isBrainstormLoading && (
                <div className="bc-bubble-row assistant">
                  <div className="bc-bot-avatar"><i className="fas fa-brain"></i></div>
                  <div className="bc-bubble assistant bc-typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="bc-input-row">
              <textarea
                className="bc-input"
                value={brainstormInput}
                onChange={e => setBrainstormInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleBrainstormSend();
                  }
                }}
                placeholder="Tanyakan sesuatu tentang dokumen..."
                rows={1}
                disabled={isBrainstormLoading}
              />
              <button
                className="bc-send-btn"
                onClick={() => handleBrainstormSend()}
                disabled={isBrainstormLoading || !brainstormInput.trim()}
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM PRESET MODAL ── */}
      {showPresetModal && (
        <div className="brainstorm-overlay" onClick={() => setShowPresetModal(false)}>
          <div className="brainstorm-chat-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', height: 'auto', padding: '20px' }}>
            <div className="bc-header" style={{ borderBottom: 'none', padding: '0 0 12px 0' }}>
              <div className="bc-header-left">
                <div className="bc-avatar" style={{ background: 'linear-gradient(135deg, #ff6b00 0%, #dd5700 100%)' }}><i className="fas fa-magic"></i></div>
                <div>
                  <div className="bc-title">{presetModalTitle}</div>
                  <div className="bc-sub">AI Preset Customization</div>
                </div>
              </div>
              <button className="bc-close" onClick={() => setShowPresetModal(false)}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                Masukkan Topik/Detail:
              </label>
              <textarea
                value={presetModalValue}
                onChange={e => setPresetModalValue(e.target.value)}
                placeholder={presetModalPlaceholder}
                className="bc-input"
                style={{ 
                  width: '100%', 
                  minHeight: '80px', 
                  padding: '10px', 
                  borderRadius: '8px', 
                  border: '1.2px solid #cbd5e1', 
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                rows={3}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (presetModalValue.trim()) {
                      presetModalCallback?.(presetModalValue);
                      setShowPresetModal(false);
                    }
                  }
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button 
                  onClick={() => setShowPresetModal(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                <button 
                  onClick={() => {
                    if (presetModalValue.trim()) {
                      presetModalCallback?.(presetModalValue);
                      setShowPresetModal(false);
                    }
                  }}
                  disabled={!presetModalValue.trim()}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #ff6b00 0%, #dd5700 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: presetModalValue.trim() ? 1 : 0.6
                  }}
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ===== DIFF PREVIEW MODAL ===== */}
      {showDiffPreview && (
        <div className="diff-modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div className="diff-modal-content" style={{ background: '#ffffff', width: '90%', maxWidth: '980px', height: '80vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>📊 Bandingkan Perubahan (Diff Preview)</h3>
                <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'block' }}>Rencana Aksi: {diffAction}</span>
              </div>
              <button onClick={rejectDiff} style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            
            {/* Body - Split Columns */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Left: Original */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0' }}>
                <div style={{ padding: '8px 16px', background: '#fef2f2', borderBottom: '1px solid #fecaca', fontWeight: 600, fontSize: '12px', color: '#991b1b' }}>ASLI (SEBELUM PERBAIKAN)</div>
                <div style={{ flex: 1, padding: '16px', overflowY: 'auto', fontSize: '13px', lineHeight: '1.6', color: '#1e293b', whiteSpace: 'pre-wrap', background: '#fffaf8' }}>
                  {diffOldText}
                </div>
              </div>
              
              {/* Right: Word-level Diff Highlighted View */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '8px 16px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', fontWeight: 600, fontSize: '12px', color: '#166534' }}>REKOMENDASI PERUBAHAN (DIFF VIEW)</div>
                <div style={{ flex: 1, padding: '16px', overflowY: 'auto', fontSize: '13px', lineHeight: '1.6', color: '#1e293b', background: '#fcfdfd' }}>
                  {computeWordDiff(diffOldText, diffNewText).map((chunk, idx) => {
                    if (chunk.type === 'add') {
                      return <span key={idx} style={{ backgroundColor: '#bbf7d0', color: '#14532d', padding: '1px 3px', borderRadius: '3px', fontWeight: 500, margin: '0 2px' }}>{chunk.text}</span>;
                    }
                    if (chunk.type === 'remove') {
                      return <span key={idx} style={{ backgroundColor: '#fecaca', color: '#7f1d1d', textDecoration: 'line-through', padding: '1px 3px', borderRadius: '3px', margin: '0 2px' }}>{chunk.text}</span>;
                    }
                    return <span key={idx}> {chunk.text} </span>;
                  })}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
              <button onClick={rejectDiff} style={{ padding: '10px 18px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                Batalkan (Reject)
              </button>
              <button onClick={acceptDiff} style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #ff6b00 0%, #dd5700 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(255, 107, 0, 0.2)' }}>
                Terapkan Perubahan (Accept)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Agent Resume Button */}
      {isAgentRunning && !showAiPanel && (
        <button
          onClick={() => {
            setShowAiPanel(true);
          }}
          className="floating-agent-trigger"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '50px',
            padding: '12px 20px',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 10px 25px -5px rgba(234, 88, 12, 0.4), 0 8px 10px -6px rgba(234, 88, 12, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 9999,
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 30px -5px rgba(234, 88, 12, 0.6), 0 10px 15px -6px rgba(234, 88, 12, 0.6)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(234, 88, 12, 0.4), 0 8px 10px -6px rgba(234, 88, 12, 0.4)';
          }}
        >
          <i className="fas fa-spinner fa-spin" style={{ color: '#ffffff' }}></i>
          <span>AI Agent</span>
        </button>
      )}
    </div>
  );
};

export default DocumentEditor;
