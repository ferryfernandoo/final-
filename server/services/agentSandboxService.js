import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import { agentSessionDb, agentMessageDb } from '../database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root path for all user sandboxes
const SANDBOX_ROOT = path.resolve(__dirname, '..', 'temp-files', 'sandbox');

if (!fs.existsSync(SANDBOX_ROOT)) {
  fs.mkdirSync(SANDBOX_ROOT, { recursive: true });
}

// Default standard SKILL.md template to guide the agent
export const DEFAULT_SKILL_MD = `# ⚡ DEEPERNOVA AGENTIC CODING & WORKFLOW PROTOCOL (SKILL.md)
Role: Senior Autonomous AI Agent, Executive Document Designer & Software Engineer
Language: Indonesian (Warm, Conversational, Professional, Highly Detailed)

---

## 🎯 PRINSIP UTAMA EKSEKUSI & GAYA KERJA AGENTIC
1. Berbicaralah secara hangat, komunikatif, dan alami dalam Bahasa Indonesia.
2. Jelaskan langkah yang Anda lakukan di sela-sela aksi (interleaved narrative workflow).
3. JANGAN PERNAH menulis teks pura-pura seperti "(do)" atau "(do_search)". Cukup gunakan tag aksi XML nyata.
4. Sistem otomatis mengubah tag aksi Anda menjadi tombol pill interaktif yang dapat diperiksa oleh pengguna secara transparan.
5. Tulis kode nyata, lengkap, dan tanpa placeholder. Pastikan eksekusi kode menghasilkan berkas fisik di disk sandbox.
6. Selalu periksa keberadaan dan ukuran berkas dengan \`<check_file path="nama_file.ext" />\` sebelum mengabarkan bahwa berkas siap diunduh.

---

## 🛠 DAFTAR TAG AKSI (TOOLS) TERSEDIA:
- \`<read_file path="nama_file.ext" />\`
  Membaca isi berkas dari sandbox atau SKILL.md.
- \`<search_web query="kata kunci pencarian" />\`
  Mencari referensi, inspirasi materi/puisi/laporan, atau data aktual di internet.
- \`<run_command>perintah terminal</run_command>\`
  Menjalankan perintah terminal di workspace sandbox.
- \`<write_file path="nama_file.ext">isi berkas</write_file>\`
  Membuat atau memperbarui berkas kode/skrip secara utuh.
- \`<execute_code language="python|node">kode</execute_code>\`
  Mengeksekusi kode langsung di sandbox dan menangkap output stdout/stderr.
- \`<check_file path="nama_file.ext" />\`
  Memverifikasi keberadaan dan ukuran berkas di disk sandbox.
- \`<screenshot target="index.html" />\`
  Mengambil tangkapan layar (screenshot visual) dari aplikasi web / berkas HTML dan menampilkannya di obrolan pengguna.
- \`<preview>index.html</preview>\`
  Menetapkan live web preview (khusus proyek aplikasi web).

---

## 📘 KEAHLIAN SUPER #1: PEMBUATAN DOKUMEN WORD (.DOCX) TINGKAT EKSEKUTIF
Pustaka Python: \`python-docx\` (SUDAH TERPASANG).

### Standar Kualitas Desain DOCX:
- JANGAN PERNAH membuat dokumen polos dengan teks mentah tanpa format!
- Buat dokumen yang setara dengan laporan konsultan manajemen papan atas (McKinsey / BCG whitepaper).
- Skema Warna Elegan:
  * Primary: Deep Navy (\`#0F172A\` atau \`#1E3A8A\`)
  * Accent: Vivid Tangerine (\`#EA580C\`) atau Electric Blue (\`#2563EB\`)
  * Neutral: Charcoal (\`#334155\`) untuk body text, Soft Gray (\`#F8FAFC\`) untuk latar belakang tabel/callout.
- Elemen Wajib dalam Dokumen:
  1. **Judul & Header Berkelas**: Judul besar (24-28pt bold), subjudul beraksen miring, pemisah visual.
  2. **Callout / Highlight Box**: Gunakan tabel 1x1 dengan border kiri tebal berwarna aksen (\`#EA580C\`, sz="36") dan shading abu-abu lembut (\`#F8FAFC\`).
  3. **Tabel Zebra-Striped dengan Shading XML**:
     - Header tabel: background gelap (\`#0F172A\`), teks putih bold (\`#FFFFFF\`), rata tengah.
     - Baris ganjil/genap bergantian warna (\`#FFFFFF\` dan \`#F8FAFC\`).
     - Border tipis (\`#E2E8F0\`), padding sel proporsional, angka rata kanan.
  4. **Penyematan Grafik & Kurva Matplotlib**:
     - Buat kurva/grafik dengan skrip Python Matplotlib, simpan sebagai \`chart.png\` (dpi=300).
     - Sisipkan ke dokumen: \`doc.add_picture('chart.png', width=Inches(5.8))\`.
     - Beri caption di bawah gambar (italic, 9.5pt, rata tengah).
  5. **KPI Scorecard Grid**: Tabel 3-4 kolom dengan angka metrik besar (22pt bold) dan label di bawahnya.

### Cuplikan Kode Referensi DOCX:
\`\`\`python
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

doc = docx.Document()

# 1. Judul & Header
title = doc.add_heading('Laporan Strategis & Analisis Kinerja', level=0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER

p_sub = doc.add_paragraph('Dokumen Eksekutif Resmi | Evaluasi Kinerja & Proyeksi 2026')
p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_sub.runs[0].font.color.rgb = RGBColor(100, 116, 139)

# 2. Callout Box (Tabel 1x1 dengan border kiri oranye)
callout = doc.add_table(rows=1, cols=1)
callout.alignment = WD_TABLE_ALIGNMENT.CENTER
c_cell = callout.rows[0].cells[0]
c_cell.width = Inches(6.2)
c_cell._tc.get_or_add_tcPr().append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="F8FAFC"/>'))
c_cell._tc.get_or_add_tcPr().append(parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="36" w:space="0" w:color="EA580C"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>'))
cp = c_cell.paragraphs[0].add_run("💡 Ringkasan: Efisiensi operasional meningkat 42.8% berkat penerapan sistem otomasi terintegrasi.")
cp.font.italic = True
cp.font.bold = True

# 3. Sisipkan Gambar Grafik Kurva
doc.add_heading('Tren Pertumbuhan & Proyeksi Data', level=1)
doc.add_picture('chart_tren.png', width=Inches(6.0))
cap = doc.add_paragraph('Gambar 1: Kurva analisis tren pertumbuhan 12 bulan terakhir.')
cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
cap.runs[0].font.size = Pt(9.5)
cap.runs[0].font.italic = True

# 4. Tabel Elegan Berwarna
doc.add_heading('Tabel Rincian Metrik Kuartalan', level=1)
tbl = doc.add_table(rows=1, cols=4)
tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
headers = ['Periode', 'Target', 'Realisasi', 'Pencapaian']
for i, h in enumerate(headers):
    cell = tbl.rows[0].cells[i]
    cell.text = h
    cell._tc.get_or_add_tcPr().append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="0F172A"/>'))
    for r in cell.paragraphs[0].runs:
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

doc.save('dokumen_laporan.docx')
\`\`\`

---

## 📊 KEAHLIAN SUPER #2: PRESENTASI POWERPOINT (.PPTX) MODERN 16:9
Pustaka Python: \`python-pptx\` (SUDAH TERPASANG).

### Standar Kualitas Desain PPTX:
- WAJIB gunakan rasio layar lebar 16:9:
  \`\`\`python
  prs.slide_width = Inches(13.333)
  prs.slide_height = Inches(7.5)
  \`\`\`
- Estetika Desain: Apple Keynote & Pitch Deck Startup Unicorn.
- Tema:
  * Dark Executive Mode: Latar belakang \`#0F172A\` / \`#0B0F19\`, teks putih, aksen \`#EA580C\` / \`#38BDF8\`.
  * Clean Light Mode: Latar belakang \`#F8FAFC\`, kartu putih \`#FFFFFF\` ber-border lembut \`#E2E8F0\`.
- Struktur Slide Profesional:
  1. **Slide 1: Hero Cover**: Judul masif (40-44pt bold), subjudul elegan (18-20pt), tag metadata.
  2. **Slide 2: KPI Scorecard Cards**: 3 atau 4 kartu (\`MSO_SHAPE.ROUNDED_RECTANGLE\`) dengan angka raksasa (36-40pt bold), label metrik, dan penjelasan ringkas.
  3. **Slide 3: Data Visual & Kurva Grafik**: Grafik hasil Matplotlib resolusi tinggi disematkan rapi berdampingan dengan poin insight utama.
  4. **Slide 4: Struktur 3 Kolom / Pilar Strategis**: Kolom kontainer terpisah dengan judul tebal dan bullet point padat.
  5. **Slide 5: Roadmap Milestone / Kesimpulan & Langkah Berikutnya**.

### Cuplikan Kode Referensi PPTX:
\`\`\`python
import pptx
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

prs = pptx.Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank_layout = prs.slide_layouts[6]

# Slide 1: Cover Dark Mode
slide1 = prs.slides.add_slide(blank_layout)
bg1 = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
bg1.fill.solid()
bg1.fill.fore_color.rgb = RGBColor(15, 23, 42)
bg1.line.fill.background()

tb = slide1.shapes.add_textbox(Inches(1.2), Inches(2.2), Inches(11), Inches(3))
tf = tb.text_frame
tf.word_wrap = True
p = tf.paragraphs[0]
p.text = "STRATEGI TRANSFORMASI BISNIS & AI"
p.font.bold = True
p.font.size = Pt(40)
p.font.color.rgb = RGBColor(255, 255, 255)

p2 = tf.add_paragraph()
p2.text = "Rencana Induk Pertumbuhan Skalabilitas 2026 - 2030"
p2.font.size = Pt(20)
p2.font.color.rgb = RGBColor(234, 88, 12) # Aksen Oranye
p2.space_before = Pt(14)

# Slide 2: Data & Chart Slide
slide2 = prs.slides.add_slide(blank_layout)
bg2 = slide2.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
bg2.fill.solid()
bg2.fill.fore_color.rgb = RGBColor(248, 250, 252) # Light Mode
bg2.line.fill.background()

# Judul Slide 2
title_box = slide2.shapes.add_textbox(Inches(1.0), Inches(0.6), Inches(11.3), Inches(0.8))
tp = title_box.text_frame.paragraphs[0]
tp.text = "Analisis Performa & Grafik Pertumbuhan Kuartalan"
tp.font.bold = True
tp.font.size = Pt(26)
tp.font.color.rgb = RGBColor(15, 23, 42)

# Sisipkan Grafik PNG
slide2.shapes.add_picture('chart_tren.png', Inches(1.0), Inches(1.6), width=Inches(7.8))

# KPI Card di sebelah kanan
card = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(9.1), Inches(1.6), Inches(3.2), Inches(4.8))
card.fill.solid()
card.fill.fore_color.rgb = RGBColor(255, 255, 255)
card.line.color.rgb = RGBColor(226, 232, 240)

ctf = card.text_frame
ctf.word_wrap = True
cp1 = ctf.paragraphs[0]
cp1.text = "+48.6%"
cp1.font.bold = True
cp1.font.size = Pt(36)
cp1.font.color.rgb = RGBColor(234, 88, 12)

cp2 = ctf.add_paragraph()
cp2.text = "Pertumbuhan Pendapatan"
cp2.font.bold = True
cp2.font.size = Pt(14)
cp2.font.color.rgb = RGBColor(15, 23, 42)
cp2.space_before = Pt(8)

prs.save('presentasi_eksekutif.pptx')
\`\`\`

---

## 📈 KEAHLIAN SUPER #3: SPREADSHEET EXCEL (.XLSX) TINGKAT KORPORAT
Pustaka Python: \`openpyxl\` (SUDAH TERPASANG).

### Standar Kualitas Desain XLSX:
- JANGAN PERNAH menghasilkan spreadsheet mentah tanpa warna, border, dan format angka!
- Setiap berkas Excel harus terlihat seperti Dashboard Keuangan CFO atau Model SaaS Bloomberg.
- Elemen Wajib dalam Spreadsheet:
  1. **Header Banner Elegan**: Baris 1 dimerge dengan latar belakang gelap (\`#0F172A\`), tinggi 35pt, teks putih tebal (14pt).
  2. **Scorecard KPI Summary**: Baris 3-4 berisi 3-4 kartu metrik utama (Total Pendapatan, Laba Bersih, Margin %, dsb).
  3. **Tabel Terstruktur**:
     - Header baris gelap (\`#1E293B\`), teks putih bold, rata tengah, tinggi baris 25pt.
     - Zebra striping bergantian (\`#FFFFFF\` dan \`#F8FAFC\`).
     - Border tipis (\`#E2E8F0\`) di seluruh sel data.
  4. **Format Angka Tepat (Number Formatting)**:
     - Rupiah: \`Rp #,##0\`
     - Dolar: \`$#,##0.00\`
     - Persentase: \`0.0%\`
     - Angka jumlah: \`#,##0\`
  5. **Auto-fit Lebar Kolom**: Hitung lebar karakter maksimum + 3 padding agar kolom tidak terpotong (\`###\`).
  6. **Freeze Panes**: Kunci baris header (\`ws.freeze_panes = 'A7'\`).
  7. **Gridlines Tetap Aktif**: \`ws.views.sheetView[0].showGridLines = True\`.
  8. **Grafik Interaktif Native (\`openpyxl.chart\`)**:
     - Gunakan \`LineChart\`, \`BarChart\`, atau \`PieChart\` native dari \`openpyxl.chart\`.
     - Tempelkan grafik di samping atau di bawah tabel (\`ws.add_chart(chart, "G3")\`).

### Cuplikan Kode Referensi XLSX:
\`\`\`python
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.chart import LineChart, BarChart, Reference
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Executive Dashboard"
ws.views.sheetView[0].showGridLines = True

# 1. Header Banner
ws.merge_cells('A1:F1')
ws['A1'] = "FINANCIAL KPI & PERFORMANCE DASHBOARD 2026"
ws['A1'].font = Font(name='Segoe UI', size=13, bold=True, color='FFFFFF')
ws['A1'].fill = PatternFill(start_color='0F172A', end_color='0F172A', fill_type='solid')
ws['A1'].alignment = Alignment(horizontal='center', vertical='center')
ws.row_dimensions[1].height = 32

# 2. Scorecard KPI
kpis = [('B', 'TOTAL REVENUE', 'Rp 48.2 M', '2563EB'), ('C', 'NET PROFIT', 'Rp 14.8 M', '10B981'), ('D', 'EBITDA MARGIN', '30.7%', 'EA580C')]
for col, lbl, val, color in kpis:
    ws[f'{col}3'] = lbl
    ws[f'{col}3'].font = Font(name='Segoe UI', size=8, bold=True, color='64748B')
    ws[f'{col}3'].alignment = Alignment(horizontal='center')
    ws[f'{col}4'] = val
    ws[f'{col}4'].font = Font(name='Segoe UI', size=13, bold=True, color=color)
    ws[f'{col}4'].alignment = Alignment(horizontal='center')

# 3. Tabel Data & Format
headers = ['Bulan', 'Pendapatan', 'Beban', 'Laba Bersih', 'Margin']
for c_idx, h in enumerate(headers, start=1):
    cell = ws.cell(row=6, column=c_idx, value=h)
    cell.font = Font(name='Segoe UI', size=10, bold=True, color='FFFFFF')
    cell.fill = PatternFill(start_color='1E293B', end_color='1E293B', fill_type='solid')
    cell.alignment = Alignment(horizontal='center')

data = [
    ['Januari', 3500, 2200, 1300, 0.371],
    ['Februari', 3900, 2300, 1600, 0.410],
    ['Maret', 4200, 2450, 1750, 0.416],
    ['April', 4800, 2600, 2200, 0.458]
]

border_thin = Border(left=Side(style='thin', color='E2E8F0'), right=Side(style='thin', color='E2E8F0'), top=Side(style='thin', color='E2E8F0'), bottom=Side(style='thin', color='E2E8F0'))

for r_idx, row in enumerate(data, start=7):
    bg = 'F8FAFC' if r_idx % 2 == 0 else 'FFFFFF'
    for c_idx, val in enumerate(row, start=1):
        c = ws.cell(row=r_idx, column=c_idx, value=val)
        c.font = Font(name='Segoe UI', size=10)
        c.fill = PatternFill(start_color=bg, end_color=bg, fill_type='solid')
        c.border = border_thin
        if c_idx in [2, 3, 4]:
            c.number_format = 'Rp #,##0'
            c.alignment = Alignment(horizontal='right')
        elif c_idx == 5:
            c.number_format = '0.0%'
            c.alignment = Alignment(horizontal='right')

# 4. Native Chart
chart = LineChart()
chart.title = "Tren Pertumbuhan Pendapatan & Laba"
chart.style = 13
chart.width = 15
chart.height = 8.5
data_ref = Reference(ws, min_col=2, min_row=6, max_col=4, max_row=10)
cats_ref = Reference(ws, min_col=1, min_row=7, max_row=10)
chart.add_data(data_ref, titles_from_data=True)
chart.set_categories(cats_ref)
ws.add_chart(chart, "G3")

# Auto-fit columns & freeze panes
for col in ws.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = get_column_letter(col[0].column)
    ws.column_dimensions[col_letter].width = max(max_len + 3, 14)

ws.freeze_panes = 'A7'
wb.save('dashboard_keuangan.xlsx')
\`\`\`

---

## 📉 KEAHLIAN SUPER #4: KURVA GRAFIK & VISUALISASI DATA TINGGI (MATPLOTLIB)
Pustaka Python: \`matplotlib\`, \`numpy\`, \`pandas\` (SUDAH TERPASANG).

### Standar Kualitas Kurva & Grafik:
- Selalu gunakan mode non-GUI: \`matplotlib.use('Agg')\`.
- Resolusi tajam: \`dpi=300\` dan \`bbox_inches='tight'\`.
- Desain Modern:
  * Palet Warna: \`#2563EB\` (Royal Blue), \`#EA580C\` (Tangerine), \`#10B981\` (Emerald), \`#8B5CF6\` (Violet), \`#F43F5E\` (Rose).
  * Kurva Halus (Smooth Spline Curve): Gunakan \`np.linspace(min, max, 200)\` atau interpolasi spline agar kurva melengkung mulus dan presisi tinggi tanpa patah-patah!
  * Shading Area: Tambahkan gradien/fill halus di bawah kurva (\`ax.fill_between(x, y, alpha=0.15)\`).
  * Hilangkan border yang tidak perlu: \`ax.spines['top'].set_visible(False)\`, \`ax.spines['right'].set_visible(False)\`.
  * Grid halus: \`ax.grid(True, linestyle='--', alpha=0.35, color='#94A3B8')\`.
  * Anotasi Titik Tertinggi: Tandai titik puncak kurva dengan marker dan teks penunjuk nilai.

### Cuplikan Kode Kurva Matplotlib:
\`\`\`python
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

# Data kurva halus
x = np.linspace(1, 12, 150)
y = 120 + 45 * np.log(x) + 10 * np.sin(x * 1.5)

fig, ax = plt.subplots(figsize=(8.5, 4.5), dpi=300)
ax.plot(x, y, color='#EA580C', linewidth=2.8, label='Kurva Pertumbuhan Proyeksi')
ax.fill_between(x, y, color='#EA580C', alpha=0.15)

# Titik Puncak
max_idx = np.argmax(y)
ax.scatter([x[max_idx]], [y[max_idx]], color='#0F172A', s=80, zorder=5)
ax.annotate(f'Puncak: {y[max_idx]:.1f} pt', (x[max_idx], y[max_idx]), textcoords="offset points", xytext=(-20, 14), fontweight='bold', color='#0F172A', arrowprops=dict(arrowstyle="->", color='#0F172A'))

ax.set_title('Analisis Kurva Pertumbuhan Metrik & Proyeksi Kinerja 2026', fontsize=13, fontweight='bold', pad=14, color='#0F172A')
ax.set_xlabel('Bulan ke-', fontsize=10, fontweight='bold', color='#475569')
ax.set_ylabel('Skor Performa', fontsize=10, fontweight='bold', color='#475569')
ax.grid(True, linestyle='--', alpha=0.35, color='#94A3B8')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.legend(frameon=True, facecolor='#FFFFFF', edgecolor='#CBD5E1')
plt.tight_layout()
plt.savefig('chart_kurva.png', dpi=300, bbox_inches='tight')
plt.close()
\`\`\`

---
Setiap kali pengguna meminta berkas Word (.docx), PowerPoint (.pptx), atau Excel (.xlsx), Anda WAJIB menerapkan seluruh standar estetika, tabel bergaya, dan kurva/grafik di atas secara maksimal!`;

/**
 * Helper to safely sanitize sessionId
 */
function sanitizeSessionId(sessionId) {
  if (!sessionId) return 'default_session';
  return String(sessionId).replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Get or create sandbox directory for a session
 */
export function getSandboxDir(sessionId) {
  const safeId = sanitizeSessionId(sessionId);
  const dir = path.join(SANDBOX_ROOT, safeId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    // Initialize default SKILL.md
    const skillPath = path.join(dir, 'SKILL.md');
    fs.writeFileSync(skillPath, DEFAULT_SKILL_MD, 'utf8');
  }
  return dir;
}

/**
 * Safely resolve a path inside the sandbox directory, preventing directory traversal
 */
export function safeResolvePath(sessionId, relativePath) {
  const sandboxDir = getSandboxDir(sessionId);
  const cleanRelative = String(relativePath || '').replace(/^[\\/]+/, '');
  const targetPath = path.resolve(sandboxDir, cleanRelative);

  if (!targetPath.startsWith(sandboxDir)) {
    throw new Error('Akses ditolak: Percobaan path traversal di luar sandbox terdeteksi.');
  }
  return targetPath;
}

/**
 * Write file to sandbox
 */
export function writeFile(sessionId, relativePath, content) {
  let cleanContent = content || '';
  const fenceMatch = cleanContent.trim().match(/^```(?:[a-zA-Z0-9_-]+)?\r?\n([\s\S]*?)\r?\n```$/);
  if (fenceMatch) {
    cleanContent = fenceMatch[1];
  }

  const filePath = safeResolvePath(sessionId, relativePath);
  const parentDir = path.dirname(filePath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
  fs.writeFileSync(filePath, cleanContent, 'utf8');
  const stats = fs.statSync(filePath);
  return {
    path: path.relative(getSandboxDir(sessionId), filePath).replace(/\\/g, '/'),
    size: stats.size,
    updatedAt: stats.mtime
  };
}

/**
 * Read file from sandbox
 */
export function readFile(sessionId, relativePath) {
  const filePath = safeResolvePath(sessionId, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File '${relativePath}' tidak ditemukan di sandbox.`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Delete file or directory from sandbox
 */
export function deleteFile(sessionId, relativePath) {
  const filePath = safeResolvePath(sessionId, relativePath);
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
    return true;
  }
  return false;
}

/**
 * List all files in sandbox
 */
export function listFiles(sessionId) {
  const sandboxDir = getSandboxDir(sessionId);
  const results = [];

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const item of items) {
      if (item.name === '.git' || item.name === 'node_modules' || item.name.startsWith('_runner_temp')) continue;
      const fullPath = path.join(currentDir, item.name);
      const relative = path.relative(sandboxDir, fullPath).replace(/\\/g, '/');
      if (item.isDirectory()) {
        walk(fullPath);
      } else {
        const stat = fs.statSync(fullPath);
        results.push({
          name: item.name,
          path: relative,
          size: stat.size,
          ext: path.extname(item.name).toLowerCase().replace('.', ''),
          updatedAt: stat.mtime
        });
      }
    }
  }

  walk(sandboxDir);
  return results;
}

/**
 * Execute code or command safely inside session sandbox
 */
export async function executeInSandbox(sessionId, { language = 'node', code = '', command = '', timeoutMs = 15000 }) {
  const sandboxDir = getSandboxDir(sessionId);
  const startTime = Date.now();

  let execCommand = '';
  let createdRunnerFile = null;
  const langLower = (language || '').toLowerCase();

  let cleanCode = (code || '').trim();
  const fenceMatch = cleanCode.match(/^```(?:[a-zA-Z0-9_-]+)?\r?\n([\s\S]*?)\r?\n```$/);
  if (fenceMatch) {
    cleanCode = fenceMatch[1].trim();
  }

  if (command && command.trim()) {
    // Sanitize command against dangerous commands
    const dangerousPatterns = [
      /rm\s+-rf\s+\//i,
      /format\s+[a-z]:/i,
      /shutdown/i,
      /reboot/i,
      /powershell\s+-enc/i,
      /:(){ :|:& };:/i,
      /mkfs/i,
      /dd\s+if=/i
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        throw new Error('Perintah ditolak: Terdeteksi perintah sistem berbahaya.');
      }
    }
    execCommand = command.trim();
  } else if (cleanCode) {
    // Check if cleanCode is actually a terminal command like "python generate.py" or "node app.js"
    const pyCmdMatch = cleanCode.match(/^(?:python|py)\s+["']?([a-zA-Z0-9_\-./\\]+\.py)["']?$/i);
    const nodeCmdMatch = cleanCode.match(/^(?:node)\s+["']?([a-zA-Z0-9_\-./\\]+\.(?:js|mjs|cjs))["']?$/i);
    const barePyScript = cleanCode.match(/^([a-zA-Z0-9_\-./\\]+\.py)$/i);

    if (pyCmdMatch) {
      execCommand = `python "${pyCmdMatch[1]}"`;
    } else if (barePyScript) {
      execCommand = `python "${barePyScript[1]}"`;
    } else if (nodeCmdMatch) {
      execCommand = `node "${nodeCmdMatch[1]}"`;
    } else if (langLower === 'python' || langLower === 'py') {
      createdRunnerFile = path.join(sandboxDir, `_runner_temp_${Date.now()}.py`);
      fs.writeFileSync(createdRunnerFile, cleanCode, 'utf8');
      execCommand = `python "${path.basename(createdRunnerFile)}"`;
    } else {
      // Default: Node.js / JavaScript
      createdRunnerFile = path.join(sandboxDir, `_runner_temp_${Date.now()}.mjs`);
      fs.writeFileSync(createdRunnerFile, cleanCode, 'utf8');
      execCommand = `node "${path.basename(createdRunnerFile)}"`;
    }
  }

  return new Promise((resolve) => {
    exec(
      execCommand,
      {
        cwd: sandboxDir,
        timeout: timeoutMs,
        maxBuffer: 1024 * 512, // 512 KB
        env: {
          ...process.env,
          NODE_ENV: 'sandbox',
          SANDBOX_SESSION: sessionId
        }
      },
      (error, stdout, stderr) => {
        if (createdRunnerFile && fs.existsSync(createdRunnerFile)) {
          try { fs.unlinkSync(createdRunnerFile); } catch {}
        }
        const executionTimeMs = Date.now() - startTime;
        const cleanStdout = (stdout || '').toString();
        const cleanStderr = (stderr || '').toString();

        let exitCode = 0;
        let success = true;

        if (error) {
          exitCode = error.code || (error.killed ? 124 : 1);
          success = false;
        }

        resolve({
          command: execCommand,
          stdout: cleanStdout,
          stderr: cleanStderr + (error && error.killed ? '\n[TIMEOUT] Eksekusi dihentikan karena melebihi batas waktu 15 detik.' : ''),
          exitCode,
          executionTimeMs,
          success: success && exitCode === 0
        });
      }
    );
  });
}

/**
 * Parse agent tool tags sequentially from model response
 */
export function extractSequentialActions(text) {
  if (!text) return [];
  const actions = [];
  const writtenPaths = new Set();

  // Unified tag regex matching paired or self-closing action tags
  const tagRegex = /<(thought|read_file|read|search_web|search|run_command|command|terminal|write_file|file|execute_code|run_code|check_file|verify_file|preview|screenshot|take_screenshot)([^>]*)>([\s\S]*?)<\/\1>|<(read_file|read|search_web|search|check_file|verify_file|screenshot|take_screenshot)\s+([^>]*?)\/?>/gi;

  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    const rawMatch = match[0];
    const index = match.index;

    if (match[1]) {
      // Paired tag: <tag attr>body</tag>
      const tagName = match[1].toLowerCase();
      const attrStr = match[2] || '';
      const body = (match[3] || '').trim();

      const getAttr = (name) => {
        const m = attrStr.match(new RegExp(`${name}=["']([^"']+)["']|${name}=([^\\s>]+)`, 'i'));
        return m ? (m[1] || m[2] || '') : '';
      };

      if (tagName === 'thought') {
        actions.push({ type: 'thought', content: body, rawMatch, index });
      } else if (tagName === 'read_file' || tagName === 'read') {
        const filePath = getAttr('path') || getAttr('file') || body.split('\n')[0].trim();
        actions.push({ type: 'read_file', path: filePath, rawMatch, index });
      } else if (tagName === 'search_web' || tagName === 'search') {
        const query = getAttr('query') || getAttr('q') || body;
        actions.push({ type: 'search_web', query, rawMatch, index });
      } else if (tagName === 'run_command' || tagName === 'command' || tagName === 'terminal') {
        actions.push({ type: 'run_command', command: body, rawMatch, index });
      } else if (tagName === 'write_file' || tagName === 'file') {
        const filePath = getAttr('path') || getAttr('file') || getAttr('name');
        actions.push({ type: 'write_file', path: filePath, content: body, rawMatch, index });
        if (filePath) writtenPaths.add(filePath.toLowerCase());
      } else if (tagName === 'execute_code' || tagName === 'run_code') {
        const language = getAttr('language') || getAttr('lang') || 'node';
        actions.push({ type: 'execute_code', language, code: body, rawMatch, index });
      } else if (tagName === 'check_file' || tagName === 'verify_file') {
        const filePath = getAttr('path') || getAttr('file') || body.split('\n')[0].trim();
        actions.push({ type: 'check_file', path: filePath, rawMatch, index });
      } else if (tagName === 'screenshot' || tagName === 'take_screenshot') {
        const targetPath = getAttr('target') || getAttr('path') || body.split('\n')[0].trim() || 'index.html';
        actions.push({ type: 'screenshot', target: targetPath, rawMatch, index });
      } else if (tagName === 'preview') {
        actions.push({ type: 'preview', entryFile: body || 'index.html', rawMatch, index });
      }
    } else if (match[4]) {
      // Self-closing tag: <tag attr />
      const tagName = match[4].toLowerCase();
      const attrStr = match[5] || '';

      const getAttr = (name) => {
        const m = attrStr.match(new RegExp(`${name}=["']([^"']+)["']|${name}=([^\\s>]+)`, 'i'));
        return m ? (m[1] || m[2] || '') : '';
      };

      if (tagName === 'read_file' || tagName === 'read') {
        const filePath = getAttr('path') || getAttr('file');
        actions.push({ type: 'read_file', path: filePath, rawMatch, index });
      } else if (tagName === 'search_web' || tagName === 'search') {
        const query = getAttr('query') || getAttr('q');
        actions.push({ type: 'search_web', query, rawMatch, index });
      } else if (tagName === 'check_file' || tagName === 'verify_file') {
        const filePath = getAttr('path') || getAttr('file');
        actions.push({ type: 'check_file', path: filePath, rawMatch, index });
      } else if (tagName === 'screenshot' || tagName === 'take_screenshot') {
        const targetPath = getAttr('target') || getAttr('path') || 'index.html';
        actions.push({ type: 'screenshot', target: targetPath, rawMatch, index });
      }
    }
  }

  // Fallback: Markdown code blocks if model didn't use XML tags for writing files
  const codeBlockRegex = /```([a-zA-Z0-9_-]+)?(?::|\s+(?:file|filename|path)=["']?([^\s"'>\n]+)["']?)?\n([\s\S]*?)```/g;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const lang = (match[1] || '').toLowerCase();
    let detectedPath = match[2] || '';
    const codeContent = match[3] || '';

    if (!detectedPath) {
      const firstLine = (codeContent.trim().split('\n')[0] || '').trim();
      const commentFileMatch = firstLine.match(/^(?:\/{2}|<!--|#|\/\*)\s*(?:file(?:name)?:\s*)?([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)\s*(?:-->|\*\/)?$/i);
      if (commentFileMatch) {
        detectedPath = commentFileMatch[1].trim();
      }
    }

    if (!detectedPath && !writtenPaths.size && codeContent.trim().length > 30) {
      if (lang === 'html' || codeContent.includes('<!DOCTYPE') || codeContent.includes('<html')) {
        detectedPath = 'index.html';
      } else if (lang === 'css' || codeContent.includes('margin:') || codeContent.includes('padding:')) {
        detectedPath = 'style.css';
      } else if (lang === 'js' || lang === 'javascript') {
        detectedPath = 'app.js';
      } else if (lang === 'py' || lang === 'python') {
        detectedPath = 'main.py';
      } else if (lang === 'json') {
        detectedPath = 'data.json';
      }
    }

    if (detectedPath && !writtenPaths.has(detectedPath.toLowerCase())) {
      actions.push({
        type: 'write_file',
        path: detectedPath,
        content: codeContent.trim(),
        rawMatch: match[0],
        index: match.index
      });
      writtenPaths.add(detectedPath.toLowerCase());
    }
  }

  // Sort chronologically by occurrence in text
  actions.sort((a, b) => a.index - b.index);
  return actions;
}

/**
 * Backward compatibility wrapper
 */
export function extractAgentActions(text) {
  const actions = extractSequentialActions(text);
  const cleanSummary = (text || '')
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/<(?:write_file|file)[\s\S]*?<\/(?:write_file|file)>/gi, '')
    .replace(/<execute_code[\s\S]*?<\/execute_code>/gi, '')
    .replace(/<run_command>[\s\S]*?<\/run_command>/gi, '')
    .replace(/<preview>[\s\S]*?<\/preview>/gi, '')
    .replace(/<read_file[^>]*>(?:[\s\S]*?<\/read_file>)?/gi, '')
    .replace(/<search_web[^>]*>(?:[\s\S]*?<\/search_web>)?/gi, '')
    .trim();

  return { actions, summary: cleanSummary };
}
/**
 * Filter files intelligently based on user prompt and deliverables:
 * 1. Exclude internal system files: SKILL.md, *.pyc, __pycache__, _runner_temp*
 * 2. If prompt asks for "semua" / "all" / "seluruh berkas" -> return all clean files
 * 3. If primary office document exists (.docx, .pptx, .xlsx, .pdf):
 *    -> Only return those documents! (Suppress generator scripts like generate_ppt.py, generate_docx.py, chart.png)
 *    -> Unless the prompt specifically asked for code/script!
 * 4. If web project exists (index.html, style.css, app.js, screenshot.png):
 *    -> Return web files and screenshot
 */
export function getRelevantDeliverables(files = [], userPrompt = '') {
  const promptLower = (userPrompt || '').toLowerCase();
  const wantAll = /\b(semua|all|seluruh|lengkap|arsip|zip|semuanya)\b/i.test(promptLower);
  const wantCode = /\b(script|skrip|kode|codingan|program|python|javascript|node|source\s*code)\b/i.test(promptLower);

  // Exclude system and cache files always
  const cleanFiles = (files || []).filter(f => {
    if (!f || !f.name) return false;
    if (f.name === 'SKILL.md') return false;
    if (f.name.startsWith('_runner_temp')) return false;
    if (f.ext === 'pyc' || (f.path && f.path.includes('__pycache__'))) return false;
    if (f.name === '.DS_Store' || f.name === 'Thumbs.db') return false;
    return true;
  });

  if (wantAll) {
    return cleanFiles;
  }

  // Check if primary office/export documents exist (.docx, .pptx, .xlsx, .pdf, .csv)
  const officeDocs = cleanFiles.filter(f => ['docx', 'pptx', 'xlsx', 'pdf', 'csv'].includes(f.ext));
  if (officeDocs.length > 0) {
    if (wantCode) {
      return cleanFiles;
    }
    // Only return the office documents! (The generator scripts and temp charts are suppressed)
    return officeDocs;
  }

  // Check if web project exists
  const hasHtml = cleanFiles.some(f => f.ext === 'html');
  if (hasHtml) {
    const webFiles = cleanFiles.filter(f => 
      ['html', 'css', 'js', 'json', 'svg', 'png', 'jpg', 'webp'].includes(f.ext) &&
      !f.name.startsWith('generate_') &&
      !f.name.startsWith('buat_')
    );
    return webFiles.length > 0 ? webFiles : cleanFiles;
  }

  // If specific python/node scripts or files were requested
  const outputFiles = cleanFiles.filter(f => !f.name.startsWith('_runner_temp'));
  return outputFiles;
}

export default {
  getSandboxDir,
  safeResolvePath,
  writeFile,
  readFile,
  deleteFile,
  listFiles,
  executeInSandbox,
  extractSequentialActions,
  extractAgentActions,
  getRelevantDeliverables,
  DEFAULT_SKILL_MD
};
