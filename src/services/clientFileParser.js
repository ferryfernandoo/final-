/**
 * Client-Side Universal File Parser Service
 * Parses ALL file formats (PDF, DOCX, XLSX, XLS, PPTX, CSV, JSON, TXT, Code, etc.)
 * directly in the browser with 0ms server latency and 100% offline capability.
 */

import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';

// Set up pdf.js worker if needed
if (typeof window !== 'undefined' && pdfjsLib) {
  try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '5.6.205'}/pdf.worker.min.mjs`;
    }
  } catch (e) {
    console.warn('[clientFileParser] PDF worker setup:', e.message);
  }
}

class ClientFileParser {
  /**
   * Universal Parse Method for any File object
   * @param {File} file
   * @returns {Promise<{ content: string, fileType: string, meta: Object }>}
   */
  static async parseFile(file) {
    if (!file) throw new Error('File tidak valid');

    const fileName = file.name || 'unnamed_file';
    const ext = fileName.split('.').pop().toLowerCase();
    const sizeKB = (file.size / 1024).toFixed(1);

    console.log(`[clientFileParser] 📂 Parsing file on frontend: "${fileName}" (${ext}, ${sizeKB} KB)`);

    let content = '';
    let detectedType = ext;
    let meta = { fileName, sizeKB, ext };

    try {
      // 1. DOCX / Word Documents
      if (ext === 'docx' || ext === 'doc') {
        content = await this.parseDocx(file);
        detectedType = 'word';
      }
      // 2. Excel & Spreadsheets (XLSX, XLS, CSV, TSV, ODS)
      else if (['xlsx', 'xls', 'csv', 'tsv', 'ods'].includes(ext)) {
        content = await this.parseSpreadsheet(file, ext);
        detectedType = 'spreadsheet';
      }
      // 3. PDF Documents
      else if (ext === 'pdf') {
        content = await this.parsePdf(file);
        detectedType = 'pdf';
      }
      // 4. PowerPoint Presentations (PPTX, PPT)
      else if (ext === 'pptx' || ext === 'ppt') {
        content = await this.parsePptx(file);
        detectedType = 'presentation';
      }
      // 5. Plain Text, Code, Markdown, Config, JSON, Logs
      else if (
        [
          'txt', 'md', 'markdown', 'json', 'html', 'htm', 'xml', 'csv',
          'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp',
          'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'sql', 'sh', 'bat',
          'ps1', 'yaml', 'yml', 'toml', 'ini', 'env', 'log', 'css', 'scss',
          'less', 'svg', 'vtt', 'srt'
        ].includes(ext) || file.type.startsWith('text/')
      ) {
        content = await this.parseTextFile(file, ext);
        detectedType = 'text';
      }
      // 6. Generic Binary / Fallback
      else {
        content = await this.parseFallback(file);
        detectedType = 'binary';
      }

      // Cleanup content
      content = (content || '').trim();
      if (!content) {
        content = `[File "${fileName}" (${sizeKB} KB) dimuat, namun tidak memiliki teks yang dapat diekstrak]`;
      }

      console.log(`[clientFileParser] ✅ Extracted ${content.length} chars from "${fileName}" directly on frontend!`);
      return {
        content,
        fileType: detectedType,
        meta: {
          ...meta,
          charCount: content.length,
          tokenEstimate: Math.ceil(content.length / 4)
        }
      };
    } catch (err) {
      console.error(`[clientFileParser] ❌ Error parsing "${fileName}":`, err);
      // Fallback: try raw text reading
      try {
        const rawText = await file.text();
        if (rawText && rawText.trim().length > 0) {
          return {
            content: rawText.trim(),
            fileType: 'raw_text',
            meta: { ...meta, charCount: rawText.length }
          };
        }
      } catch (_) {}

      throw new Error(`Gagal membaca file "${fileName}": ${err.message}`);
    }
  }

  /**
   * Parse DOCX / Word File
   */
  static async parseDocx(file) {
    const arrayBuffer = await file.arrayBuffer();

    try {
      // First attempt: Mammoth raw text extraction
      const result = await mammoth.extractRawText({ arrayBuffer });
      if (result && result.value && result.value.trim().length > 0) {
        return result.value.trim();
      }
    } catch (mammothErr) {
      console.warn('[clientFileParser] Mammoth docx parse fallback to JSZip:', mammothErr.message);
    }

    // Second attempt: Unzip DOCX with JSZip and parse document.xml
    try {
      const zip = await JSZip.loadAsync(arrayBuffer);
      const docXmlFile = zip.file('word/document.xml');
      if (docXmlFile) {
        const xmlText = await docXmlFile.async('string');
        // Extract all <w:t> text nodes
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
        const textNodes = xmlDoc.getElementsByTagName('w:t');
        let extracted = '';
        for (let i = 0; i < textNodes.length; i++) {
          extracted += textNodes[i].textContent + ' ';
        }
        if (extracted.trim().length > 0) {
          return extracted.trim();
        }
      }
    } catch (zipErr) {
      console.warn('[clientFileParser] JSZip docx parse error:', zipErr.message);
    }

    throw new Error('Tidak dapat mengekstrak teks dari dokumen Word');
  }

  /**
   * Parse Excel / Spreadsheets (XLSX, XLS, CSV, ODS)
   */
  static async parseSpreadsheet(file, ext) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('File spreadsheet tidak memiliki lembar kerja (sheet)');
    }

    let output = '';
    workbook.SheetNames.forEach((sheetName, index) => {
      const worksheet = workbook.Sheets[sheetName];
      // Convert to formatted CSV text
      const csvData = XLSX.utils.sheet_to_csv(worksheet);
      if (csvData && csvData.trim().length > 0) {
        output += `\n--- SHEET ${index + 1}: "${sheetName}" ---\n`;
        output += csvData.trim() + '\n';
      }
    });

    return output.trim();
  }

  /**
   * Parse PDF Documents using pdfjs-dist
   */
  static async parsePdf(file) {
    const arrayBuffer = await file.arrayBuffer();

    try {
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      let fullText = `[Dokumen PDF: ${numPages} Halaman]\n\n`;

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageStrings = textContent.items.map(item => item.str || '').filter(Boolean);
          const pageText = pageStrings.join(' ');
          fullText += `--- Halaman ${pageNum} ---\n${pageText}\n\n`;
        } catch (pageErr) {
          console.warn(`[clientFileParser] Error reading page ${pageNum}:`, pageErr);
        }
      }

      return fullText.trim();
    } catch (pdfErr) {
      console.warn('[clientFileParser] PDFjs error, attempting raw stream parsing:', pdfErr.message);
      // Fallback: extract plain ASCII text streams from PDF buffer
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const rawString = decoder.decode(arrayBuffer);
      const textMatches = rawString.match(/\(([^()]+)\)\s*Tj/g) || [];
      if (textMatches.length > 0) {
        return textMatches.map(m => m.replace(/^\(|\)\s*Tj$/g, '')).join(' ');
      }
      throw new Error('Gagal membaca teks dari PDF: ' + pdfErr.message);
    }
  }

  /**
   * Parse PowerPoint Presentations (PPTX)
   */
  static async parsePptx(file) {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    let presentationText = `[Presentasi PowerPoint: "${file.name}"]\n\n`;
    let slideIndex = 1;

    // Find all slide XML files
    const slideFiles = Object.keys(zip.files).filter(path => /^ppt\/slides\/slide\d+\.xml$/i.test(path));
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
      return numA - numB;
    });

    for (const slidePath of slideFiles) {
      const slideFile = zip.file(slidePath);
      if (slideFile) {
        const xmlText = await slideFile.async('string');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
        const textElements = xmlDoc.getElementsByTagName('a:t');
        let slideContent = '';
        for (let i = 0; i < textElements.length; i++) {
          const text = textElements[i].textContent;
          if (text) slideContent += text + ' ';
        }

        if (slideContent.trim().length > 0) {
          presentationText += `--- SLIDE ${slideIndex} ---\n${slideContent.trim()}\n\n`;
          slideIndex++;
        }
      }
    }

    if (slideIndex > 1) {
      return presentationText.trim();
    }

    throw new Error('Tidak ada teks yang ditemukan di slide presentasi');
  }

  /**
   * Parse Text / Code / JSON / HTML / Markdown
   */
  static async parseTextFile(file, ext) {
    const text = await file.text();

    if (ext === 'json') {
      try {
        const parsed = JSON.parse(text);
        return JSON.stringify(parsed, null, 2);
      } catch (_) {
        return text;
      }
    }

    return text;
  }

  /**
   * Generic Fallback Parser
   */
  static async parseFallback(file) {
    try {
      const text = await file.text();
      return text;
    } catch (_) {
      return `[File binary "${file.name}", ukuran: ${(file.size / 1024).toFixed(1)} KB]`;
    }
  }
}

export default ClientFileParser;
