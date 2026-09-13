/**
 * Typernova Comprehensive Excel Formula Engine & Evaluator
 * Supports 100+ standard Microsoft Excel formula functions, nested functions, operators, ranges, and criteria.
 */

// ── 1. CELL REFERENCE CONVERSIONS ──
export const colLetterToIdx = (colStr) => {
  if (!colStr) return 0;
  let idx = 0;
  const str = colStr.toUpperCase().trim();
  for (let i = 0; i < str.length; i++) {
    idx = idx * 26 + (str.charCodeAt(i) - 64);
  }
  return Math.max(0, idx - 1);
};

export const colIdxToLetter = (colIdx) => {
  let label = '';
  let n = Math.max(0, colIdx);
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
};

export const parseCellRef = (refStr) => {
  const clean = String(refStr || '').replace(/\$/g, '').toUpperCase().trim();
  const match = clean.match(/^([A-Z]+)([0-9]+)$/);
  if (!match) return null;
  const col = colLetterToIdx(match[1]);
  const row = parseInt(match[2], 10) - 1;
  return { r: row, c: col };
};

export const parseCleanNumber = (val) => {
  if (typeof val === 'number') return val;
  let str = String(val || '').trim();
  if (!str) return NaN;
  if (str.includes('Rp') || str.includes('rp')) {
    str = str.replace(/Rp\s*/gi, '').replace(/\./g, '').replace(',', '.');
  } else if (str.includes('$')) {
    str = str.replace(/\$/g, '').replace(/,/g, '');
  } else {
    str = str.replace(/,/g, '');
  }
  return parseFloat(str);
};

export const formatRupiah = (val) => {
  const num = parseCleanNumber(val);
  if (isNaN(num)) return val;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
};

export const formatUSD = (val) => {
  const num = parseCleanNumber(val);
  if (isNaN(num)) return val;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(num);
};

export const formatPercent = (val) => {
  const num = parseCleanNumber(val);
  if (isNaN(num)) return val;
  return `${(num * 100).toFixed(1)}%`;
};

export const getCellValue = (sheetData, r, c, visited = new Set()) => {
  if (!sheetData || !sheetData[r] || !sheetData[r][c]) return '';
  const key = `${r},${c}`;
  if (visited.has(key)) return '#CIRCULAR!';
  const raw = sheetData[r][c].value ?? '';
  if (typeof raw === 'number') return raw;
  const str = String(raw).trim();

  if (str.startsWith('=')) {
    const nextVisited = new Set(visited);
    nextVisited.add(key);
    const calculated = evaluateFormula(str, sheetData, nextVisited);
    const num = parseCleanNumber(calculated);
    return isNaN(num) ? calculated : num;
  }

  const parsed = parseCleanNumber(str);
  return isNaN(parsed) ? str : parsed;
};

export const parseArgs = (argStr) => {
  const args = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  let parenDepth = 0;

  for (let i = 0; i < argStr.length; i++) {
    const ch = argStr[i];
    if (inQuotes) {
      current += ch;
      if (ch === quoteChar) inQuotes = false;
    } else if (ch === '"' || ch === "'") {
      inQuotes = true;
      quoteChar = ch;
      current += ch;
    } else if (ch === '(') {
      parenDepth++;
      current += ch;
    } else if (ch === ')') {
      parenDepth--;
      current += ch;
    } else if (ch === ',' && parenDepth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim() || args.length > 0) args.push(current.trim());
  return args;
};

export const getRangeValues = (sheetData, rangeStr, visited = new Set()) => {
  const values = [];
  if (!rangeStr) return values;

  const parts = parseArgs(rangeStr);
  for (const part of parts) {
    if (part.includes(':')) {
      const rangeBounds = part.split(':');
      const start = parseCellRef(rangeBounds[0]);
      const end = parseCellRef(rangeBounds[1]);
      if (start && end) {
        const minR = Math.min(start.r, end.r);
        const maxR = Math.max(start.r, end.r);
        const minC = Math.min(start.c, end.c);
        const maxC = Math.max(start.c, end.c);

        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            if (visited.has(`${r},${c}`)) continue;
            values.push(getCellValue(sheetData, r, c, visited));
          }
        }
      }
    } else {
      const ref = parseCellRef(part);
      if (ref) {
        if (!visited.has(`${ref.r},${ref.c}`)) {
          values.push(getCellValue(sheetData, ref.r, ref.c, visited));
        }
      } else {
        const val = parseFloat(part);
        if (!isNaN(val)) values.push(val);
        else if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'"))) values.push(part.slice(1, -1));
        else values.push(part);
      }
    }
  }
  return values;
};

const matchCriteria = (val, criteriaStr) => {
  const crit = String(criteriaStr).trim();
  const strVal = String(val).trim();
  const numVal = parseCleanNumber(val);

  if (crit.startsWith('>=')) {
    const target = parseCleanNumber(crit.slice(2));
    return !isNaN(numVal) && !isNaN(target) && numVal >= target;
  }
  if (crit.startsWith('<=')) {
    const target = parseCleanNumber(crit.slice(2));
    return !isNaN(numVal) && !isNaN(target) && numVal <= target;
  }
  if (crit.startsWith('<>')) {
    const target = crit.slice(2).replace(/^["']|["']$/g, '');
    return strVal.toLowerCase() !== target.toLowerCase();
  }
  if (crit.startsWith('>')) {
    const target = parseCleanNumber(crit.slice(1));
    return !isNaN(numVal) && !isNaN(target) && numVal > target;
  }
  if (crit.startsWith('<')) {
    const target = parseCleanNumber(crit.slice(1));
    return !isNaN(numVal) && !isNaN(target) && numVal < target;
  }
  if (crit.startsWith('=')) {
    const target = crit.slice(1).replace(/^["']|["']$/g, '');
    return strVal.toLowerCase() === target.toLowerCase();
  }

  const cleanCrit = crit.replace(/^["']|["']$/g, '');
  return strVal.toLowerCase() === cleanCrit.toLowerCase();
};

const calcGCD = (a, b) => (b === 0 ? a : calcGCD(b, a % b));
const calcLCM = (a, b) => Math.abs(a * b) / calcGCD(a, b);

// ── 2. COMPREHENSIVE FORMULA EVALUATION ENGINE ──
export const evaluateFormula = (formulaStr, sheetData = [], visited = new Set()) => {
  if (!formulaStr || typeof formulaStr !== 'string' || !formulaStr.startsWith('=')) {
    return formulaStr ?? '';
  }

  let expr = formulaStr.slice(1).trim();
  if (!expr) return '';

  try {
    const upperExpr = expr.toUpperCase();
    const funcMatch = upperExpr.match(/^([A-Z0-9_.]+)\((.*)\)$/s);

    if (funcMatch) {
      const funcName = funcMatch[1];
      const argsStr = funcMatch[2];
      const args = parseArgs(argsStr);

      // ── A. MATH & STATISTICAL ──
      if (funcName === 'SUM') {
        const nums = getRangeValues(sheetData, argsStr, visited).map(v => typeof v === 'number' ? v : parseFloat(v) || 0);
        return nums.reduce((acc, n) => acc + n, 0);
      }
      if (funcName === 'AVERAGE') {
        const nums = getRangeValues(sheetData, argsStr, visited).map(v => typeof v === 'number' ? v : parseFloat(v) || 0);
        if (nums.length === 0) return 0;
        return parseFloat((nums.reduce((acc, n) => acc + n, 0) / nums.length).toFixed(2));
      }
      if (funcName === 'COUNT') {
        const nums = getRangeValues(sheetData, argsStr, visited).filter(v => typeof v === 'number' || (!isNaN(parseFloat(v)) && String(v).trim() !== ''));
        return nums.length;
      }
      if (funcName === 'COUNTA') {
        const items = getRangeValues(sheetData, argsStr, visited).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
        return items.length;
      }
      if (funcName === 'COUNTBLANK') {
        const items = getRangeValues(sheetData, argsStr, visited).filter(v => v === null || v === undefined || String(v).trim() === '');
        return items.length;
      }
      if (funcName === 'MIN') {
        const nums = getRangeValues(sheetData, argsStr, visited).map(v => typeof v === 'number' ? v : parseFloat(v) || 0);
        return nums.length ? Math.min(...nums) : 0;
      }
      if (funcName === 'MAX') {
        const nums = getRangeValues(sheetData, argsStr, visited).map(v => typeof v === 'number' ? v : parseFloat(v) || 0);
        return nums.length ? Math.max(...nums) : 0;
      }
      if (funcName === 'PRODUCT') {
        const nums = getRangeValues(sheetData, argsStr, visited).map(v => typeof v === 'number' ? v : parseFloat(v) || 1);
        return nums.reduce((acc, n) => acc * n, 1);
      }
      if (funcName === 'MEDIAN') {
        const nums = getRangeValues(sheetData, argsStr, visited).map(v => typeof v === 'number' ? v : parseFloat(v) || 0).sort((a, b) => a - b);
        if (nums.length === 0) return 0;
        const mid = Math.floor(nums.length / 2);
        return nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
      }
      if (funcName === 'MODE') {
        const nums = getRangeValues(sheetData, argsStr, visited).map(v => typeof v === 'number' ? v : parseFloat(v) || 0);
        const freq = {};
        let maxCount = 0, modeVal = nums[0];
        for (const n of nums) {
          freq[n] = (freq[n] || 0) + 1;
          if (freq[n] > maxCount) { maxCount = freq[n]; modeVal = n; }
        }
        return modeVal;
      }
      if (funcName === 'STDEV' || funcName === 'STDEVP') {
        const nums = getRangeValues(sheetData, argsStr, visited).map(v => typeof v === 'number' ? v : parseFloat(v) || 0);
        if (nums.length <= 1) return 0;
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (funcName === 'STDEVP' ? nums.length : nums.length - 1);
        return parseFloat(Math.sqrt(variance).toFixed(2));
      }
      if (funcName === 'VAR' || funcName === 'VARP') {
        const nums = getRangeValues(sheetData, argsStr, visited).map(v => typeof v === 'number' ? v : parseFloat(v) || 0);
        if (nums.length <= 1) return 0;
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (funcName === 'VARP' ? nums.length : nums.length - 1);
        return parseFloat(variance.toFixed(2));
      }
      if (funcName === 'ROUND') {
        const val = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0;
        const decimals = parseInt(args[1] || '0', 10);
        return parseFloat(val.toFixed(decimals));
      }
      if (funcName === 'ROUNDUP') {
        const val = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0;
        const decimals = parseInt(args[1] || '0', 10);
        const factor = Math.pow(10, decimals);
        return Math.ceil(val * factor) / factor;
      }
      if (funcName === 'ROUNDDOWN') {
        const val = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0;
        const decimals = parseInt(args[1] || '0', 10);
        const factor = Math.pow(10, decimals);
        return Math.floor(val * factor) / factor;
      }
      if (funcName === 'INT' || funcName === 'TRUNC') {
        const val = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0;
        const decimals = parseInt(args[1] || '0', 10);
        const factor = Math.pow(10, decimals);
        return Math.trunc(val * factor) / factor;
      }
      if (funcName === 'MOD') {
        const n1 = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0;
        const n2 = parseFloat(evaluateFormula(`=${args[1]}`, sheetData, visited)) || 1;
        return n1 % n2;
      }
      if (funcName === 'POWER') {
        const base = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0;
        const exp = parseFloat(evaluateFormula(`=${args[1]}`, sheetData, visited)) || 1;
        return Math.pow(base, exp);
      }
      if (funcName === 'SQRT') {
        const val = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0;
        return Math.sqrt(val);
      }
      if (funcName === 'ABS') {
        const val = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0;
        return Math.abs(val);
      }
      if (funcName === 'EXP') {
        const val = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0;
        return Math.exp(val);
      }
      if (funcName === 'LN') {
        const val = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 1;
        return Math.log(val);
      }
      if (funcName === 'LOG' || funcName === 'LOG10') {
        const val = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 1;
        const base = args[1] ? parseFloat(evaluateFormula(`=${args[1]}`, sheetData, visited)) : 10;
        return Math.log(val) / Math.log(base);
      }
      if (funcName === 'CEILING') {
        const val = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0;
        const sig = parseFloat(evaluateFormula(`=${args[1]}`, sheetData, visited)) || 1;
        return Math.ceil(val / sig) * sig;
      }
      if (funcName === 'FLOOR') {
        const val = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0;
        const sig = parseFloat(evaluateFormula(`=${args[1]}`, sheetData, visited)) || 1;
        return Math.floor(val / sig) * sig;
      }
      if (funcName === 'SIGN') {
        const val = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0;
        return Math.sign(val);
      }
      if (funcName === 'PI') return Math.PI;
      if (funcName === 'RAND') return Math.random();
      if (funcName === 'RANDBETWEEN') {
        const min = parseInt(evaluateFormula(`=${args[0]}`, sheetData, visited), 10) || 0;
        const max = parseInt(evaluateFormula(`=${args[1]}`, sheetData, visited), 10) || 100;
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
      if (funcName === 'FACT') {
        const n = parseInt(evaluateFormula(`=${args[0]}`, sheetData, visited), 10) || 0;
        let f = 1;
        for (let i = 1; i <= n; i++) f *= i;
        return f;
      }
      if (funcName === 'GCD') {
        const n1 = parseInt(evaluateFormula(`=${args[0]}`, sheetData, visited), 10) || 0;
        const n2 = parseInt(evaluateFormula(`=${args[1]}`, sheetData, visited), 10) || 0;
        return calcGCD(n1, n2);
      }
      if (funcName === 'LCM') {
        const n1 = parseInt(evaluateFormula(`=${args[0]}`, sheetData, visited), 10) || 0;
        const n2 = parseInt(evaluateFormula(`=${args[1]}`, sheetData, visited), 10) || 0;
        return calcLCM(n1, n2);
      }
      if (funcName === 'DEGREES') {
        const rad = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0;
        return rad * (180 / Math.PI);
      }
      if (funcName === 'RADIANS') {
        const deg = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0;
        return deg * (Math.PI / 180);
      }
      if (funcName === 'SIN') return Math.sin(parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0);
      if (funcName === 'COS') return Math.cos(parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0);
      if (funcName === 'TAN') return Math.tan(parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0);

      // ── B. CONDITIONAL AGGREGATIONS (SUMIF, COUNTIF, AVERAGEIF, SUMIFS, COUNTIFS) ──
      if (funcName === 'COUNTIF') {
        const rangeVals = getRangeValues(sheetData, args[0], visited);
        const crit = evaluateFormula(`=${args[1]}`, sheetData, visited);
        return rangeVals.filter(v => matchCriteria(v, crit)).length;
      }

      if (funcName === 'SUMIF') {
        const rangeVals = getRangeValues(sheetData, args[0], visited);
        const crit = evaluateFormula(`=${args[1]}`, sheetData, visited);
        const sumRangeVals = args[2] ? getRangeValues(sheetData, args[2], visited) : rangeVals;
        let sum = 0;
        for (let i = 0; i < rangeVals.length; i++) {
          if (matchCriteria(rangeVals[i], crit)) {
            sum += parseCleanNumber(sumRangeVals[i]) || 0;
          }
        }
        return sum;
      }

      if (funcName === 'AVERAGEIF') {
        const rangeVals = getRangeValues(sheetData, args[0], visited);
        const crit = evaluateFormula(`=${args[1]}`, sheetData, visited);
        const avgRangeVals = args[2] ? getRangeValues(sheetData, args[2], visited) : rangeVals;
        let sum = 0, count = 0;
        for (let i = 0; i < rangeVals.length; i++) {
          if (matchCriteria(rangeVals[i], crit)) {
            sum += parseCleanNumber(avgRangeVals[i]) || 0;
            count++;
          }
        }
        return count > 0 ? parseFloat((sum / count).toFixed(2)) : 0;
      }

      if (funcName === 'SUMIFS') {
        const sumRangeVals = getRangeValues(sheetData, args[0], visited);
        let sum = 0;
        for (let i = 0; i < sumRangeVals.length; i++) {
          let satisfiesAll = true;
          for (let c = 1; c < args.length; c += 2) {
            const critRange = getRangeValues(sheetData, args[c], visited);
            const crit = evaluateFormula(`=${args[c + 1]}`, sheetData, visited);
            if (!matchCriteria(critRange[i], crit)) { satisfiesAll = false; break; }
          }
          if (satisfiesAll) sum += parseCleanNumber(sumRangeVals[i]) || 0;
        }
        return sum;
      }

      if (funcName === 'COUNTIFS') {
        const firstRange = getRangeValues(sheetData, args[0], visited);
        let count = 0;
        for (let i = 0; i < firstRange.length; i++) {
          let satisfiesAll = true;
          for (let c = 0; c < args.length; c += 2) {
            const critRange = getRangeValues(sheetData, args[c], visited);
            const crit = evaluateFormula(`=${args[c + 1]}`, sheetData, visited);
            if (!matchCriteria(critRange[i], crit)) { satisfiesAll = false; break; }
          }
          if (satisfiesAll) count++;
        }
        return count;
      }

      if (funcName === 'LARGE') {
        const nums = getRangeValues(sheetData, args[0], visited).map(v => typeof v === 'number' ? v : parseFloat(v) || 0).sort((a, b) => b - a);
        const k = parseInt(args[1] || '1', 10) - 1;
        return nums[k] !== undefined ? nums[k] : '#N/A';
      }

      if (funcName === 'SMALL') {
        const nums = getRangeValues(sheetData, args[0], visited).map(v => typeof v === 'number' ? v : parseFloat(v) || 0).sort((a, b) => a - b);
        const k = parseInt(args[1] || '1', 10) - 1;
        return nums[k] !== undefined ? nums[k] : '#N/A';
      }

      if (funcName === 'RANK') {
        const val = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0;
        const nums = getRangeValues(sheetData, args[1], visited).map(v => typeof v === 'number' ? v : parseFloat(v) || 0).sort((a, b) => b - a);
        const pos = nums.indexOf(val);
        return pos !== -1 ? pos + 1 : '#N/A';
      }

      // ── C. LOGICAL & INFORMATION ──
      if (funcName === 'IF') {
        if (args.length >= 2) {
          const conditionVal = evaluateFormula(`=${args[0]}`, sheetData, visited);
          const isTrue = Boolean(conditionVal && conditionVal !== '0' && conditionVal !== 'FALSE' && conditionVal !== 0 && !String(conditionVal).startsWith('#'));
          const trueBranch = args[1];
          const falseBranch = args[2] !== undefined ? args[2] : 'FALSE';
          return evaluateFormula(`=${isTrue ? trueBranch : falseBranch}`, sheetData, visited);
        }
      }

      if (funcName === 'IFS') {
        for (let i = 0; i < args.length; i += 2) {
          const cond = evaluateFormula(`=${args[i]}`, sheetData, visited);
          if (cond && cond !== '0' && cond !== 'FALSE' && cond !== 0) {
            return evaluateFormula(`=${args[i + 1]}`, sheetData, visited);
          }
        }
        return '#N/A';
      }

      if (funcName === 'AND') {
        for (const arg of args) {
          const res = evaluateFormula(`=${arg}`, sheetData, visited);
          if (!res || res === '0' || res === 'FALSE' || res === 0) return false;
        }
        return true;
      }

      if (funcName === 'OR') {
        for (const arg of args) {
          const res = evaluateFormula(`=${arg}`, sheetData, visited);
          if (res && res !== '0' && res !== 'FALSE' && res !== 0) return true;
        }
        return false;
      }

      if (funcName === 'NOT') {
        const res = evaluateFormula(`=${args[0]}`, sheetData, visited);
        return !res || res === '0' || res === 'FALSE' || res === 0;
      }

      if (funcName === 'XOR') {
        let trueCount = 0;
        for (const arg of args) {
          const res = evaluateFormula(`=${arg}`, sheetData, visited);
          if (res && res !== '0' && res !== 'FALSE' && res !== 0) trueCount++;
        }
        return trueCount % 2 !== 0;
      }

      if (funcName === 'IFERROR') {
        const val = evaluateFormula(`=${args[0]}`, sheetData, visited);
        if (String(val).startsWith('#') || val === 'NaN' || val === undefined) {
          return evaluateFormula(`=${args[1]}`, sheetData, visited);
        }
        return val;
      }

      if (funcName === 'IFNA') {
        const val = evaluateFormula(`=${args[0]}`, sheetData, visited);
        if (String(val) === '#N/A') {
          return evaluateFormula(`=${args[1]}`, sheetData, visited);
        }
        return val;
      }

      if (funcName === 'ISBLANK') {
        const val = evaluateFormula(`=${args[0]}`, sheetData, visited);
        return val === null || val === undefined || String(val).trim() === '';
      }

      if (funcName === 'ISNUMBER') {
        const val = evaluateFormula(`=${args[0]}`, sheetData, visited);
        return !isNaN(parseFloat(val));
      }

      if (funcName === 'ISTEXT') {
        const val = evaluateFormula(`=${args[0]}`, sheetData, visited);
        return typeof val === 'string' && isNaN(parseFloat(val));
      }

      if (funcName === 'ISLOGICAL') {
        const val = evaluateFormula(`=${args[0]}`, sheetData, visited);
        return typeof val === 'boolean' || val === 'TRUE' || val === 'FALSE';
      }

      if (funcName === 'ISNONTEXT') {
        const val = evaluateFormula(`=${args[0]}`, sheetData, visited);
        return typeof val !== 'string' || !isNaN(parseFloat(val));
      }

      if (funcName === 'ISEVEN') {
        const val = parseInt(evaluateFormula(`=${args[0]}`, sheetData, visited), 10) || 0;
        return val % 2 === 0;
      }

      if (funcName === 'ISODD') {
        const val = parseInt(evaluateFormula(`=${args[0]}`, sheetData, visited), 10) || 0;
        return Math.abs(val) % 2 === 1;
      }

      if (funcName === 'ISERROR') {
        const val = evaluateFormula(`=${args[0]}`, sheetData, visited);
        return String(val).startsWith('#');
      }

      if (funcName === 'SWITCH') {
        const targetVal = evaluateFormula(`=${args[0]}`, sheetData, visited);
        for (let i = 1; i < args.length; i += 2) {
          if (i === args.length - 1) return evaluateFormula(`=${args[i]}`, sheetData, visited);
          const caseVal = evaluateFormula(`=${args[i]}`, sheetData, visited);
          if (String(caseVal).toLowerCase() === String(targetVal).toLowerCase()) {
            return evaluateFormula(`=${args[i + 1]}`, sheetData, visited);
          }
        }
        return '#N/A';
      }

      if (funcName === 'CHOOSE') {
        const idx = parseInt(evaluateFormula(`=${args[0]}`, sheetData, visited), 10);
        if (idx >= 1 && idx < args.length) {
          return evaluateFormula(`=${args[idx]}`, sheetData, visited);
        }
        return '#VALUE!';
      }

      // ── D. LOOKUP & REFERENCE (VLOOKUP, HLOOKUP, XLOOKUP, INDEX, MATCH) ──
      if (funcName === 'VLOOKUP') {
        if (args.length >= 3) {
          const lookupVal = evaluateFormula(`=${args[0]}`, sheetData, visited);
          const rangeStr = args[1];
          const colIndex = parseInt(args[2], 10) - 1;

          const bounds = rangeStr.split(':');
          const start = parseCellRef(bounds[0]);
          const end = parseCellRef(bounds[1]);

          if (start && end) {
            for (let r = start.r; r <= end.r; r++) {
              const keyVal = getCellValue(sheetData, r, start.c, visited);
              if (String(keyVal).toLowerCase() === String(lookupVal).toLowerCase()) {
                return getCellValue(sheetData, r, start.c + colIndex, visited);
              }
            }
          }
          return '#N/A';
        }
      }

      if (funcName === 'HLOOKUP') {
        if (args.length >= 3) {
          const lookupVal = evaluateFormula(`=${args[0]}`, sheetData, visited);
          const rangeStr = args[1];
          const rowIndex = parseInt(args[2], 10) - 1;

          const bounds = rangeStr.split(':');
          const start = parseCellRef(bounds[0]);
          const end = parseCellRef(bounds[1]);

          if (start && end) {
            for (let c = start.c; c <= end.c; c++) {
              const keyVal = getCellValue(sheetData, start.r, c, visited);
              if (String(keyVal).toLowerCase() === String(lookupVal).toLowerCase()) {
                return getCellValue(sheetData, start.r + rowIndex, c, visited);
              }
            }
          }
          return '#N/A';
        }
      }

      if (funcName === 'XLOOKUP') {
        if (args.length >= 3) {
          const lookupVal = evaluateFormula(`=${args[0]}`, sheetData, visited);
          const lookupRangeStr = args[1];
          const returnRangeStr = args[2];
          const ifNotFound = args[3] !== undefined ? evaluateFormula(`=${args[3]}`, sheetData, visited) : '#N/A';

          const lVals = getRangeValues(sheetData, lookupRangeStr, visited);
          const rVals = getRangeValues(sheetData, returnRangeStr, visited);

          for (let i = 0; i < lVals.length; i++) {
            if (String(lVals[i]).toLowerCase() === String(lookupVal).toLowerCase()) {
              return rVals[i] !== undefined ? rVals[i] : '';
            }
          }
          return ifNotFound;
        }
      }

      if (funcName === 'INDEX') {
        const rangeStr = args[0];
        const rowIdx = parseInt(args[1] || '1', 10) - 1;
        const colIdx = parseInt(args[2] || '1', 10) - 1;

        const bounds = rangeStr.split(':');
        const start = parseCellRef(bounds[0]);
        if (start) {
          return getCellValue(sheetData, start.r + rowIdx, start.c + colIdx, visited);
        }
      }

      if (funcName === 'MATCH') {
        const lookupVal = evaluateFormula(`=${args[0]}`, sheetData, visited);
        const rangeStr = args[1];
        const rangeVals = getRangeValues(sheetData, rangeStr, visited);

        for (let i = 0; i < rangeVals.length; i++) {
          if (String(rangeVals[i]).toLowerCase() === String(lookupVal).toLowerCase()) {
            return i + 1;
          }
        }
        return '#N/A';
      }

      if (funcName === 'ROW') {
        const ref = parseCellRef(args[0] || '');
        return ref ? ref.r + 1 : 1;
      }

      if (funcName === 'COLUMN') {
        const ref = parseCellRef(args[0] || '');
        return ref ? ref.c + 1 : 1;
      }

      if (funcName === 'ADDRESS') {
        const r = parseInt(evaluateFormula(`=${args[0]}`, sheetData, visited), 10) || 1;
        const c = parseInt(evaluateFormula(`=${args[1]}`, sheetData, visited), 10) || 1;
        return `${colIdxToLetter(c - 1)}${r}`;
      }

      // ── E. TEXT FUNCTIONS (TEXTBEFORE, TEXTAFTER, CONCAT, TEXTJOIN, etc.) ──
      if (funcName === 'TEXTBEFORE') {
        const text = String(evaluateFormula(`=${args[0]}`, sheetData, visited) || '');
        const delim = String(evaluateFormula(`=${args[1]}`, sheetData, visited) || '');
        const idx = text.indexOf(delim);
        return idx !== -1 ? text.substring(0, idx) : text;
      }

      if (funcName === 'TEXTAFTER') {
        const text = String(evaluateFormula(`=${args[0]}`, sheetData, visited) || '');
        const delim = String(evaluateFormula(`=${args[1]}`, sheetData, visited) || '');
        const idx = text.indexOf(delim);
        return idx !== -1 ? text.substring(idx + delim.length) : text;
      }

      if (funcName === 'CONCAT' || funcName === 'CONCATENATE') {
        const vals = getRangeValues(sheetData, argsStr, visited);
        return vals.join('');
      }

      if (funcName === 'TEXTJOIN') {
        const delim = evaluateFormula(`=${args[0]}`, sheetData, visited);
        const ignoreEmpty = evaluateFormula(`=${args[1]}`, sheetData, visited);
        const isIgnore = Boolean(ignoreEmpty && ignoreEmpty !== 'FALSE' && ignoreEmpty !== '0');
        const restArgs = args.slice(2).join(',');
        let vals = getRangeValues(sheetData, restArgs, visited);
        if (isIgnore) vals = vals.filter(v => String(v).trim() !== '');
        return vals.join(delim);
      }

      if (funcName === 'UPPER') return String(evaluateFormula(`=${args[0]}`, sheetData, visited) || '').toUpperCase();
      if (funcName === 'LOWER') return String(evaluateFormula(`=${args[0]}`, sheetData, visited) || '').toLowerCase();
      if (funcName === 'PROPER') {
        const val = String(evaluateFormula(`=${args[0]}`, sheetData, visited) || '');
        return val.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
      }
      if (funcName === 'LEN') return String(evaluateFormula(`=${args[0]}`, sheetData, visited) || '').length;
      if (funcName === 'LEFT') {
        const val = String(evaluateFormula(`=${args[0]}`, sheetData, visited) || '');
        const count = parseInt(args[1] || '1', 10);
        return val.substring(0, count);
      }
      if (funcName === 'RIGHT') {
        const val = String(evaluateFormula(`=${args[0]}`, sheetData, visited) || '');
        const count = parseInt(args[1] || '1', 10);
        return val.substring(val.length - count);
      }
      if (funcName === 'MID') {
        const val = String(evaluateFormula(`=${args[0]}`, sheetData, visited) || '');
        const start = parseInt(args[1] || '1', 10) - 1;
        const count = parseInt(args[2] || '1', 10);
        return val.substring(start, start + count);
      }
      if (funcName === 'TRIM') return String(evaluateFormula(`=${args[0]}`, sheetData, visited) || '').trim().replace(/\s+/g, ' ');
      if (funcName === 'SUBSTITUTE') {
        const text = String(evaluateFormula(`=${args[0]}`, sheetData, visited) || '');
        const oldText = String(evaluateFormula(`=${args[1]}`, sheetData, visited) || '');
        const newText = String(evaluateFormula(`=${args[2]}`, sheetData, visited) || '');
        return text.replaceAll(oldText, newText);
      }
      if (funcName === 'REPLACE') {
        const text = String(evaluateFormula(`=${args[0]}`, sheetData, visited) || '');
        const start = parseInt(args[1] || '1', 10) - 1;
        const num = parseInt(args[2] || '0', 10);
        const newText = String(evaluateFormula(`=${args[3]}`, sheetData, visited) || '');
        return text.substring(0, start) + newText + text.substring(start + num);
      }
      if (funcName === 'REPT') {
        const text = String(evaluateFormula(`=${args[0]}`, sheetData, visited) || '');
        const count = parseInt(args[1] || '1', 10);
        return text.repeat(Math.max(0, count));
      }
      if (funcName === 'EXACT') {
        const t1 = String(evaluateFormula(`=${args[0]}`, sheetData, visited) || '');
        const t2 = String(evaluateFormula(`=${args[1]}`, sheetData, visited) || '');
        return t1 === t2;
      }
      if (funcName === 'CHAR') return String.fromCharCode(parseInt(evaluateFormula(`=${args[0]}`, sheetData, visited), 10) || 65);
      if (funcName === 'CODE') return String(evaluateFormula(`=${args[0]}`, sheetData, visited) || 'A').charCodeAt(0);

      // ── F. DATE & TIME (EOMONTH, EDATE, NETWORKDAYS, etc.) ──
      if (funcName === 'TODAY' || funcName === 'NOW') {
        return new Date().toISOString().split('T')[0];
      }
      if (funcName === 'DATE') {
        const y = parseInt(evaluateFormula(`=${args[0]}`, sheetData, visited), 10) || 2025;
        const m = parseInt(evaluateFormula(`=${args[1]}`, sheetData, visited), 10) || 1;
        const d = parseInt(evaluateFormula(`=${args[2]}`, sheetData, visited), 10) || 1;
        return new Date(y, m - 1, d).toISOString().split('T')[0];
      }
      if (funcName === 'YEAR') return new Date(evaluateFormula(`=${args[0]}`, sheetData, visited)).getFullYear() || 2025;
      if (funcName === 'MONTH') return new Date(evaluateFormula(`=${args[0]}`, sheetData, visited)).getMonth() + 1;
      if (funcName === 'DAY') return new Date(evaluateFormula(`=${args[0]}`, sheetData, visited)).getDate();
      if (funcName === 'WEEKDAY') return new Date(evaluateFormula(`=${args[0]}`, sheetData, visited)).getDay() + 1;
      if (funcName === 'EOMONTH') {
        const startDateStr = evaluateFormula(`=${args[0]}`, sheetData, visited);
        const months = parseInt(evaluateFormula(`=${args[1]}`, sheetData, visited), 10) || 0;
        const d = new Date(startDateStr);
        if (isNaN(d.getTime())) return '#VALUE!';
        const targetDate = new Date(d.getFullYear(), d.getMonth() + months + 1, 0);
        return targetDate.toISOString().split('T')[0];
      }
      if (funcName === 'EDATE') {
        const startDateStr = evaluateFormula(`=${args[0]}`, sheetData, visited);
        const months = parseInt(evaluateFormula(`=${args[1]}`, sheetData, visited), 10) || 0;
        const d = new Date(startDateStr);
        if (isNaN(d.getTime())) return '#VALUE!';
        d.setMonth(d.getMonth() + months);
        return d.toISOString().split('T')[0];
      }

      // ── G. FINANCIAL (PMT, PV, FV, NPV, SLN, DB) ──
      if (funcName === 'PMT') {
        const rate = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0;
        const nper = parseFloat(evaluateFormula(`=${args[1]}`, sheetData, visited)) || 1;
        const pv = parseFloat(evaluateFormula(`=${args[2]}`, sheetData, visited)) || 0;
        if (rate === 0) return -(pv / nper);
        const pmt = (rate * pv) / (1 - Math.pow(1 + rate, -nper));
        return parseFloat((-pmt).toFixed(2));
      }
      if (funcName === 'PV') {
        const rate = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0;
        const nper = parseFloat(evaluateFormula(`=${args[1]}`, sheetData, visited)) || 1;
        const pmt = parseFloat(evaluateFormula(`=${args[2]}`, sheetData, visited)) || 0;
        if (rate === 0) return -(pmt * nper);
        const pv = pmt * ((1 - Math.pow(1 + rate, -nper)) / rate);
        return parseFloat((-pv).toFixed(2));
      }
      if (funcName === 'FV') {
        const rate = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0;
        const nper = parseFloat(evaluateFormula(`=${args[1]}`, sheetData, visited)) || 1;
        const pmt = parseFloat(evaluateFormula(`=${args[2]}`, sheetData, visited)) || 0;
        if (rate === 0) return -(pmt * nper);
        const fv = pmt * ((Math.pow(1 + rate, nper) - 1) / rate);
        return parseFloat((-fv).toFixed(2));
      }
      if (funcName === 'NPV') {
        const rate = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0.1;
        const restArgs = args.slice(1).join(',');
        const values = getRangeValues(sheetData, restArgs, visited).map(v => parseFloat(v) || 0);
        let npv = 0;
        for (let i = 0; i < values.length; i++) {
          npv += values[i] / Math.pow(1 + rate, i + 1);
        }
        return parseFloat(npv.toFixed(2));
      }
      if (funcName === 'SLN') {
        const cost = parseFloat(evaluateFormula(`=${args[0]}`, sheetData, visited)) || 0;
        const salvage = parseFloat(evaluateFormula(`=${args[1]}`, sheetData, visited)) || 0;
        const life = parseFloat(evaluateFormula(`=${args[2]}`, sheetData, visited)) || 1;
        return parseFloat(((cost - salvage) / life).toFixed(2));
      }
    }

    // ── 3. ARITHMETIC & STRING EXPRESSIONS (e.g. =A1*B1+100 or =A1 & " " & B1) ──
    const cellRefRegex = /\b[A-Za-z]+[0-9]+\b/g;
    let containsStringConcat = expr.includes('&');

    let sanitizedExpr = expr.replace(cellRefRegex, (ref) => {
      const parsed = parseCellRef(ref);
      if (!parsed) return '0';
      const key = `${parsed.r},${parsed.c}`;
      if (visited.has(key)) return '0';
      const nextVisited = new Set(visited);
      nextVisited.add(key);
      const val = getCellValue(sheetData, parsed.r, parsed.c, nextVisited);

      if (typeof val === 'number') return String(val);
      if (typeof val === 'string') {
        if (!isNaN(val) && val.trim() !== '') return val.trim();
        return JSON.stringify(val);
      }
      return '0';
    });

    if (containsStringConcat) {
      const parts = sanitizedExpr.split('&').map(p => {
        const clean = p.trim();
        try {
          return new Function(`return (${clean})`)();
        } catch {
          return clean.replace(/^["']|["']$/g, '');
        }
      });
      return parts.join('');
    }

    const cleanMathExpr = sanitizedExpr.replace(/[^0-9.+\-*/() ><=!]/g, '');
    if (!cleanMathExpr.trim()) return '#VALUE!';

    const result = new Function(`return (${cleanMathExpr})`)();
    return typeof result === 'number' ? (Number.isInteger(result) ? result : parseFloat(result.toFixed(2))) : result;

  } catch (err) {
    console.warn('[Formula Engine Error]:', err.message, formulaStr);
    return '#ERROR!';
  }
};
