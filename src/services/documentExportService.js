/**
 * Document Export Service
 * Handles DOCX, PPTX, and Excel export with genuine OOXML binaries
 */

import { downloadBlob as universalDownloadBlob } from './universalDownloadService';
import { buildDocxBlob, buildPptxBlob, buildXlsxBlob } from '../utils/subAgentOfficeBuilder';

const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MIME_PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// DOCX export (genuine OOXML binary via docx)
export const exportToDocx = async (content, fileName) => {
  try {
    const cleanName = `${(fileName || 'document').replace(/\.docx$/i, '')}.docx`;
    const blob = await buildDocxBlob(content, fileName || 'Document');
    const dlResult = await downloadFile(blob, cleanName, { mimeType: MIME_DOCX });
    return dlResult?.ok !== false
      ? { success: true, message: 'Document exported successfully' }
      : { success: false, error: dlResult?.error || 'Download failed' };
  } catch (error) {
    console.error('DOCX export error:', error);
    return { success: false, error: error.message };
  }
};

// PPTX export function (genuine OOXML binary via pptxgenjs)
export const exportToPptx = async (slides, fileName) => {
  try {
    const cleanName = `${(fileName || 'presentation').replace(/\.pptx$/i, '')}.pptx`;
    const blob = await buildPptxBlob(slides, fileName || 'Presentation');
    const dlResult = await downloadFile(blob, cleanName, { mimeType: MIME_PPTX });
    return dlResult?.ok !== false
      ? { success: true, message: 'Presentation exported successfully' }
      : { success: false, error: dlResult?.error || 'Download failed' };
  } catch (error) {
    console.error('PPTX export error:', error);
    return { success: false, error: error.message };
  }
};

// Excel export function (genuine OOXML .xlsx binary via SheetJS)
export const exportToExcel = async (rows, fileName) => {
  try {
    const cleanName = `${(fileName || 'spreadsheet').replace(/\.xlsx$/i, '')}.xlsx`;
    const sheetRows = Array.isArray(rows)
      ? rows
      : rows?.excelSheets?.[rows.activeSheet || 0]?.data || rows?.excelSheets?.[0]?.data || [];
    const blob = await buildXlsxBlob(sheetRows, 'Sheet1');
    const dlResult = await downloadFile(blob, cleanName, { mimeType: MIME_XLSX });
    return dlResult?.ok !== false
      ? { success: true, message: 'Spreadsheet exported successfully' }
      : { success: false, error: dlResult?.error || 'Download failed' };
  } catch (error) {
    console.error('Excel export error:', error);
    return { success: false, error: error.message };
  }
};

// Generic download file helper
const downloadFile = (blob, fileName, options = {}) => {
  return universalDownloadBlob(blob, fileName, options);
};

// Convert JSON to Excel data
export const jsonToExcelData = (jsonData) => {
  if (!Array.isArray(jsonData) || jsonData.length === 0) return [];

  const headers = Object.keys(jsonData[0]);
  const rows = [headers, ...jsonData.map((item) => headers.map((h) => item[h] || ''))];

  return rows;
};

// Convert table HTML to Excel data
export const htmlTableToExcelData = (tableElement) => {
  const rows = [];
  const tableRows = tableElement.querySelectorAll('tr');

  tableRows.forEach((tr) => {
    const cells = tr.querySelectorAll('td, th');
    const row = Array.from(cells).map((cell) => cell.textContent.trim());
    rows.push(row);
  });

  return rows;
};

// Generate sample data for documents
export const generateSampleContent = (type) => {
  switch (type) {
    case 'docx':
      return [
        { id: 1, type: 'paragraph', text: 'Introduction' },
        { id: 2, type: 'paragraph', text: 'Your content here...' },
        { id: 3, type: 'paragraph', text: 'Conclusion' }
      ];

    case 'pptx':
      return [
        { id: 1, type: 'slide', title: 'Title Slide', content: 'Welcome to your presentation', notes: '' },
        { id: 2, type: 'slide', title: 'Content', content: 'Your content here', notes: 'Speaker notes' }
      ];

    case 'excel':
      return [
        ['Header 1', 'Header 2', 'Header 3'],
        ['Data 1', 'Data 2', 'Data 3'],
        ['Data 4', 'Data 5', 'Data 6']
      ];

    default:
      return [];
  }
};

// Validate document content
export const validateDocumentContent = (content, type) => {
  if (!content) return { valid: false, error: 'Content is empty' };

  switch (type) {
    case 'docx':
      return { valid: Array.isArray(content) || typeof content === 'string', error: null };
    case 'pptx':
      return { valid: Array.isArray(content) && content.length > 0, error: 'At least one slide required' };
    case 'excel':
      return { valid: Array.isArray(content) && content.length > 0, error: 'At least one row required' };
    default:
      return { valid: false, error: 'Unknown document type' };
  }
};

export default {
  exportToDocx,
  exportToPptx,
  exportToExcel,
  jsonToExcelData,
  htmlTableToExcelData,
  generateSampleContent,
  validateDocumentContent
};
