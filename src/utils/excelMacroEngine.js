/**
 * Typernova Universal Excel Macro & Automation Engine
 * Provides 1-click built-in macros and custom scriptable macros for spreadsheet manipulation.
 */
import { formatRupiah, formatUSD, colIdxToLetter } from './excelFormulaEngine.js';

export const BUILTIN_MACROS = [
  {
    id: 'autosum_total',
    name: '⚡ AutoSum & Baris Total',
    desc: 'Otomatis tambahkan baris Total dan rumus =SUM() di bagian bawah kolom angka',
    category: 'Calculations'
  },
  {
    id: 'format_rupiah',
    name: '💰 Format Rupiah (IDR)',
    desc: 'Format sel berangka menjadi tampilan Rupiah resmi (Rp)',
    category: 'Formatting'
  },
  {
    id: 'format_usd',
    name: '💵 Format Dolar USD ($)',
    desc: 'Format sel berangka menjadi tampilan mata uang Dolar ($)',
    category: 'Formatting'
  },
  {
    id: 'header_styling',
    name: '🎨 Format Header Emerald',
    desc: 'Beri warna Emerald Green, teks putih tebal, dan perataan tengah pada baris judul',
    category: 'Formatting'
  },
  {
    id: 'header_navy',
    name: '👔 Format Header Modern Navy',
    desc: 'Beri warna Deep Navy Blue, teks putih tebal, dan perataan tengah pada baris judul',
    category: 'Formatting'
  },
  {
    id: 'fcr_efficiency_calc',
    name: '🌾 Rasio Efisiensi Produksi (Output vs Input)',
    desc: 'Hitung rasio efisiensi operasional dan perbandingan input vs hasil',
    category: 'Calculations'
  },
  {
    id: 'autonumber_id',
    name: '🔢 Isi Otomatis Nomor Urut (1, 2, 3...)',
    desc: 'Beri penomoran otomatis pada kolom pertama (No / ID)',
    category: 'Automation'
  },
  {
    id: 'highlight_min_max',
    name: '🎯 Sorot Nilai Maksimal & Minimal',
    desc: 'Warnai sel dengan nilai tertinggi (Hijau) dan nilai terendah (Merah)',
    category: 'Analytics'
  },
  {
    id: 'uppercase_headers',
    name: '🔤 Kapitalkan Seluruh Header',
    desc: 'Ubah teks pada baris pertama menjadi huruf KAPITAL semua',
    category: 'Formatting'
  },
  {
    id: 'clean_empty',
    name: '🧹 Bersihkan Baris Kosong',
    desc: 'Hapus semua baris yang tidak memiliki data di dalamnya',
    category: 'Data Cleanup'
  }
];

/**
 * Runs a built-in macro on sheet data
 */
export const runBuiltinMacro = (macroId, sheetData) => {
  if (!Array.isArray(sheetData) || sheetData.length === 0) return sheetData;
  const newData = sheetData.map(row => row.map(cell => ({ ...cell, format: { ...(cell.format || {}) } })));

  switch (macroId) {
    case 'autosum_total': {
      const numCols = Math.max(...newData.map(r => r.length), 1);
      const totalRow = Array.from({ length: numCols }, (_, ci) => ({
        value: ci === 0 ? 'TOTAL' : '',
        format: { bold: true, fillColor: '#f1f5f9', fontColor: '#0f172a' }
      }));

      // Detect numeric columns
      for (let c = 1; c < numCols; c++) {
        let hasNumber = false;
        let endR = newData.length - 1;
        for (let r = 1; r < newData.length; r++) {
          const val = newData[r][c]?.value;
          if (val && !isNaN(parseFloat(String(val).replace(/[^0-9.-]/g, '')))) {
            hasNumber = true;
            break;
          }
        }
        if (hasNumber) {
          const colLetter = colIdxToLetter(c);
          totalRow[c].value = `=SUM(${colLetter}2:${colLetter}${endR + 1})`;
          totalRow[c].format = { bold: true, fillColor: '#f1f5f9', fontColor: '#107c41', halign: 'right' };
        }
      }
      newData.push(totalRow);
      return newData;
    }

    case 'format_rupiah': {
      return newData.map((row, ri) =>
        row.map(cell => {
          if (ri === 0) return cell;
          const valStr = String(cell.value || '').trim();
          if (valStr.startsWith('=')) return cell;
          const num = parseFloat(valStr.replace(/Rp\s*|\.|,/g, ''));
          if (!isNaN(num) && num > 0) {
            return {
              ...cell,
              value: formatRupiah(num),
              format: { ...cell.format, halign: 'right', fontColor: '#107c41' }
            };
          }
          return cell;
        })
      );
    }

    case 'format_usd': {
      return newData.map((row, ri) =>
        row.map(cell => {
          if (ri === 0) return cell;
          const valStr = String(cell.value || '').trim();
          if (valStr.startsWith('=')) return cell;
          const num = parseFloat(valStr.replace(/\$|\.|,/g, ''));
          if (!isNaN(num) && num > 0) {
            return {
              ...cell,
              value: formatUSD(num),
              format: { ...cell.format, halign: 'right', fontColor: '#2563eb' }
            };
          }
          return cell;
        })
      );
    }

    case 'header_styling': {
      if (newData[0]) {
        newData[0] = newData[0].map(cell => ({
          ...cell,
          format: {
            ...cell.format,
            bold: true,
            fillColor: '#107c41',
            fontColor: '#ffffff',
            halign: 'center',
            fontSize: 12
          }
        }));
      }
      return newData;
    }

    case 'header_navy': {
      if (newData[0]) {
        newData[0] = newData[0].map(cell => ({
          ...cell,
          format: {
            ...cell.format,
            bold: true,
            fillColor: '#1e3a8a',
            fontColor: '#ffffff',
            halign: 'center',
            fontSize: 12
          }
        }));
      }
      return newData;
    }

    case 'fcr_efficiency_calc': {
      // Find numeric columns and append ratio column
      const numCols = newData[0]?.length || 0;
      if (numCols > 2) {
        const hasRatioHeader = newData[0]?.some(c => String(c.value).includes('Rasio'));
        if (!hasRatioHeader && newData[0]) {
          newData[0].push({
            value: 'Rasio Efisiensi',
            format: { bold: true, fillColor: '#0f766e', fontColor: '#ffffff', halign: 'center' }
          });
          for (let r = 1; r < newData.length; r++) {
            const val1 = parseFloat(String(newData[r][1]?.value || 0).replace(/[^0-9.-]/g, '')) || 0;
            const val2 = parseFloat(String(newData[r][2]?.value || 0).replace(/[^0-9.-]/g, '')) || 0;
            const ratio = val1 > 0 ? (val2 / val1).toFixed(2) : '-';
            newData[r].push({
              value: ratio !== '-' ? `${ratio}x` : '-',
              format: { halign: 'center', fontColor: parseFloat(ratio) >= 1 ? '#15803d' : '#b91c1c', bold: true }
            });
          }
        }
      }
      return newData;
    }

    case 'autonumber_id': {
      // Populate column 0 with auto-increment numbers for body rows
      for (let r = 1; r < newData.length; r++) {
        if (newData[r][0]) {
          newData[r][0] = {
            ...newData[r][0],
            value: String(r),
            format: { ...newData[r][0].format, halign: 'center', bold: true }
          };
        }
      }
      return newData;
    }

    case 'highlight_min_max': {
      const numCols = Math.max(...newData.map(r => r.length), 1);
      for (let c = 0; c < numCols; c++) {
        let minVal = Infinity;
        let maxVal = -Infinity;
        let minR = -1;
        let maxR = -1;

        for (let r = 1; r < newData.length; r++) {
          const raw = newData[r][c]?.value;
          const num = parseFloat(String(raw).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num) && typeof raw !== 'undefined' && String(raw).trim() !== '') {
            if (num < minVal) { minVal = num; minR = r; }
            if (num > maxVal) { maxVal = num; maxR = r; }
          }
        }

        if (minR !== -1 && maxR !== -1 && minR !== maxR) {
          newData[maxR][c].format = { ...newData[maxR][c].format, fillColor: '#dcfce7', fontColor: '#15803d', bold: true };
          newData[minR][c].format = { ...newData[minR][c].format, fillColor: '#fee2e2', fontColor: '#b91c1c', bold: true };
        }
      }
      return newData;
    }

    case 'uppercase_headers': {
      if (newData[0]) {
        newData[0] = newData[0].map(cell => ({
          ...cell,
          value: String(cell.value || '').toUpperCase()
        }));
      }
      return newData;
    }

    case 'clean_empty': {
      return newData.filter(row => row.some(cell => String(cell.value || '').trim() !== ''));
    }

    default:
      return newData;
  }
};

/**
 * Safely executes custom macro scripts created by AI or User
 */
export const executeCustomMacroScript = (scriptCode, sheetData) => {
  try {
    if (!scriptCode || typeof scriptCode !== 'string') return sheetData;

    // 1. Clean markdown code blocks and preambles from AI response
    let cleanCode = scriptCode.trim();
    const codeBlockMatch = cleanCode.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
    if (codeBlockMatch) {
      cleanCode = codeBlockMatch[1].trim();
    } else {
      // Remove leading intro text before code
      cleanCode = cleanCode.replace(/^[\s\S]*?(?=(?:const|let|var|sheet|setCell|getCell|for|if|function|return)\b)/i, '');
      cleanCode = cleanCode.replace(/```/g, '').trim();
    }

    const clone = Array.isArray(sheetData) ? JSON.parse(JSON.stringify(sheetData)) : [];

    // Helper functions for AI/User to easily & safely manipulate grid
    const getCell = (r, c) => {
      if (!clone[r]) return { value: '', format: {} };
      if (!clone[r][c]) return { value: '', format: {} };
      return clone[r][c];
    };

    const setCell = (r, c, val, fmt = {}) => {
      while (clone.length <= r) {
        clone.push([]);
      }
      while (clone[r].length <= c) {
        clone[r].push({ value: '', format: {} });
      }
      const existing = clone[r][c] || { value: '', format: {} };
      clone[r][c] = {
        value: val !== undefined ? val : existing.value,
        format: { ...(existing.format || {}), ...fmt }
      };
    };

    const ensureGrid = (maxR, maxC) => {
      while (clone.length < maxR) {
        clone.push([]);
      }
      for (let r = 0; r < clone.length; r++) {
        while (clone[r].length < maxC) {
          clone[r].push({ value: '', format: {} });
        }
      }
    };

    // Auto-proxy clone array so direct index access sheet[r][c] doesn't throw on uninitialized rows/cells
    for (let r = 0; r < Math.max(clone.length, 50); r++) {
      if (!clone[r]) clone[r] = [];
      for (let c = 0; c < Math.max(clone[r].length, 20); c++) {
        if (!clone[r][c]) {
          clone[r][c] = { value: '', format: {} };
        } else if (!clone[r][c].format) {
          clone[r][c].format = {};
        }
      }
    }

    const macroFn = new Function(
      'sheet', 
      'formatRupiah', 
      'formatUSD', 
      'colIdxToLetter', 
      'setCell', 
      'getCell', 
      'ensureGrid', 
      cleanCode
    );

    const result = macroFn(clone, formatRupiah, formatUSD, colIdxToLetter, setCell, getCell, ensureGrid);
    return Array.isArray(result) ? result : clone;
  } catch (err) {
    console.error('[Macro Script Execution Error]:', err.message);
    throw new Error(`Gagal mengeksekusi makro kustom: ${err.message}`);
  }
};

