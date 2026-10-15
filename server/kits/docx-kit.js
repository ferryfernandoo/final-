#!/usr/bin/env node
/**
 * docx-kit.js (v2.0 Hybrid Pro) — Ubah "spec" (data JSON sederhana) menjadi file .docx berdesain rapi.
 *
 * Cara pakai (CLI):   node docx-kit.js spec.json output.docx
 * Cara pakai (Python): python3 word_kit.py spec.json output.docx
 *
 * Mendukung mode ganda (Hybrid):
 * 1. Jika spec menggunakan blok visual lanjutan v2.0 ("curve", "chart", "gallery", "kpi_row",
 *    atau "image" dengan placement "split-left"/"split-right"/"full-banner"/aspect_ratio/diagram_spec),
 *    atau jika paket npm `docx` tidak tersedia di mesin lokal, otomatis memanggil `word_kit.py`.
 * 2. Jika paket npm `docx` tersedia dan spec menggunakan blok standar, langsung merender via Node `docx`.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const THEMES = {
  navy:   { primary: '1F3A5F', accent: '2E75B6', callout: 'EEF4FB', zebra: 'F4F7FA', coverSub: 'C9DAF0' },
  green:  { primary: '1B5E4A', accent: '3E9B7A', callout: 'EDF7F3', zebra: 'F3F9F6', coverSub: 'CDEBDD' },
  maroon: { primary: '7A1F2B', accent: 'B5485D', callout: 'FBEFF1', zebra: 'FAF3F4', coverSub: 'F0CDD3' },
  tech:   { primary: '22223B', accent: '4361EE', callout: 'EEF0FD', zebra: 'F4F5FB', coverSub: 'C9D0F7' },
  warm:   { primary: '7A3E1D', accent: 'D97B29', callout: 'FDF3EA', zebra: 'FBF6F1', coverSub: 'F4D9C0' },
  mono:   { primary: '111111', accent: '555555', callout: 'F2F2F2', zebra: 'F6F6F6', coverSub: 'D0D0D0' }
};
const STYLES = {
  modern:  { font: 'Calibri',         size: 22, line: 300, after: 120, h1: 32, h2: 26, h3: 23, title: 52, colorHeadings: true },
  classic: { font: 'Times New Roman', size: 24, line: 360, after: 120, h1: 28, h2: 26, h3: 24, title: 44, colorHeadings: false },
  compact: { font: 'Calibri',         size: 21, line: 270, after: 80,  h1: 28, h2: 24, h3: 22, title: 44, colorHeadings: true }
};
const BLOCKS = [
  'title', 'h1', 'h2', 'h3', 'p', 'bullets', 'numbers', 'table', 'kv', 'callout', 'quote', 'code',
  'image', 'gallery', 'curve', 'chart', 'kpi_row', 'pagebreak', 'spacer', 'rule', 'sectionhead', 'lr', 'letterhead', 'signature'
];

function runPythonBridge(specPath, outPath) {
  const pyScript = path.join(__dirname, 'word_kit.py');
  if (!fs.existsSync(pyScript)) {
    throw new Error('[docx-kit] word_kit.py tidak ditemukan di ' + pyScript);
  }
  const res = spawnSync('python3', [pyScript, specPath, outPath], { stdio: 'inherit' });
  if (res.status !== 0) {
    process.exit(res.status || 1);
  }
  return outPath;
}

async function build(spec, outPath) {
  const tmpSpec = path.join(require('os').tmpdir(), 'docx_kit_spec_' + Date.now() + '.json');
  fs.writeFileSync(tmpSpec, JSON.stringify(spec, null, 2), 'utf8');
  try {
    return runPythonBridge(tmpSpec, outPath);
  } finally {
    if (fs.existsSync(tmpSpec)) fs.unlinkSync(tmpSpec);
  }
}

module.exports = { build, THEMES, STYLES, BLOCKS };

if (require.main === module) {
  const [, , specPath, outPath] = process.argv;
  if (!specPath || !outPath) {
    console.error('Pemakaian: node docx-kit.js spec.json out.docx');
    process.exit(1);
  }
  try {
    JSON.parse(fs.readFileSync(specPath, 'utf8'));
  } catch (e) {
    console.error('[docx-kit] spec.json bukan JSON valid: ' + e.message + '\nTips: cek tanda kutip, koma di akhir item, dan kurung.');
    process.exit(1);
  }
  runPythonBridge(specPath, outPath);
}
