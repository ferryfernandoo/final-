import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, execFile, spawn } from 'child_process';
import JSZip from 'jszip';
import { agentSessionDb, agentMessageDb } from '../database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root path for all user sandboxes and checkpoints
const SANDBOX_ROOT = path.resolve(__dirname, '..', 'temp-files', 'sandbox');
const CHECKPOINTS_ROOT = path.resolve(__dirname, '..', 'temp-files', 'checkpoints');
const KITS_SOURCE_DIR = path.resolve(__dirname, '..', 'kits');
const TEMPLATES_SOURCE_DIR = path.resolve(__dirname, '..', 'templates');

// In-memory process registry for real-time tracking and zombie process killing
const activeProcesses = new Map(); // sessionId -> Set of ChildProcess

if (!fs.existsSync(SANDBOX_ROOT)) {
  fs.mkdirSync(SANDBOX_ROOT, { recursive: true });
}
if (!fs.existsSync(CHECKPOINTS_ROOT)) {
  fs.mkdirSync(CHECKPOINTS_ROOT, { recursive: true });
}

// Default standard SKILL.md template to guide the agent
export const DEFAULT_SKILL_MD = `# ⚡ DEEPERNOVA AGENTIC CODING & WORKFLOW PROTOCOL (SKILL.md)
Role: Senior Autonomous AI Agent, Executive Document Designer & Software Engineer
Language: Indonesian (Direct, Professional, Crisp Executive Summary, Action-First)

---

## 🎯 PRINSIP UTAMA EKSEKUSI & GAYA KERJA AGENTIC (ACTION-FIRST & ANTI-RAMBLE)
1. LANGSUNG KERJAKAN TUGAS DENGAN AKSI AGENTIC NYATA: Mulai langsung dengan tag aksi (<write_file>, <run_command>, <check_file>, <search_web>).
2. DILARANG KERAS NGEDUMEL, CURHAT, ATAU MEMBUANG TOKEN: Jangan mengeluh mengenai kendala teknis, jangan berceramah panjang di sela-sela aksi, dan jangan mengulang-ulang instruksi pengguna.
3. 🌐 SANDBOX MEMILIKI KONEKSI INTERNET LANGSUNG (TIDAK TERISOLASI): Anda dapat menjalankan curl, pip install, python requests, fetch API eksternal, dan scraping data secara bebas melalui terminal sandbox (<run_command>).
4. SISTEM MANIPULASI BERKAS LENGKAP: Anda dapat membaca (<read_file>), mendaftar berkas (<list_files />), mengedit berkas yang ada (<edit_file>), menghapus berkas (<delete_file>), menguji integritas berkas (<test_file>), serta mengirim ulang berkas baru ke deliverable (<send_file>).
5. Tulis kode nyata, lengkap, dan tanpa placeholder. Pastikan eksekusi kode menghasilkan berkas fisik di disk sandbox.
6. Selalu periksa keberadaan dan ukuran berkas dengan \`<check_file path="nama_file.ext" />\` atau uji dengan \`<test_file path="nama_file.ext" />\` sebelum mengabarkan bahwa berkas siap diunduh.
7. KESIMPULAN EKSEKUTIF SAAT SELESAI: Setelah tugas tuntas, berikan HANYA kesimpulan padat: Status pengerjaan (100% Selesai), nama berkas yang terbentuk, 3-4 butir poin pokok intisari, dan akses unduh.

---

## 🛠 DAFTAR TAG AKSI (TOOLS) TERSEDIA:
- \`<read_file path="nama_file.ext" />\`
  Membaca isi berkas dari sandbox atau SKILL.md.
- \`<list_files />\`
  Melihat daftar seluruh berkas yang ada di workspace sandbox beserta ukuran dan statusnya.
- \`<write_file path="nama_file.ext">isi berkas</write_file>\`
  Membuat berkas baru atau menimpa berkas kode/skrip secara utuh.
- \`<edit_file path="nama_file.ext"><target>teks_lama</target><replacement>teks_baru</replacement></edit_file>\`
  Mengedit bagian tertentu dari berkas yang sudah ada tanpa menulis ulang seluruh berkas.
- \`<patch_file path="nama_file.ext" start_line="1" end_line="10"><replacement>kode baru</replacement></patch_file>\`
  Menerapkan patch/diff presisi berbasis nomor baris atau fuzzy block replacement (SOTA Diff Editing).
- \`<grep_search query="simbol atau kata" includes="*.py,*.js" />\`
  Pencarian kode cepat di seluruh workspace sandbox (ripgrep style) dengan info nama berkas & nomor baris.
- \`<revert_file path="nama_file.ext" />\`
  Mengembalikan berkas ke versi checkpoint sebelumnya jika terjadi kesalahan koding (Rollback Protection).
- \`<delete_file path="nama_file.ext" />\`
  Menghapus berkas yang tidak diperlukan dari sandbox.
- \`<test_file path="nama_file.ext" />\`
  Menguji validitas sintaks dan integritas berkas (.py, .js, .json, .pptx, .docx, .xlsx, .html).
- \`<send_file path="nama_file.ext" />\`
  Mengirim atau memperbarui berkas deliverable utama kepada pengguna di obrolan.
- \`<search_web query="kata kunci pencarian" />\`
  Mencari referensi, inspirasi materi/puisi/laporan, atau data aktual di internet.
- \`<run_command>perintah terminal</run_command>\`
  Menjalankan perintah terminal di workspace sandbox dengan akses internet penuh (curl, pip install, python requests, node, git, dll).
- \`<execute_code language="python|node">kode</execute_code>\`
  Mengeksekusi kode langsung di sandbox dan menangkap output stdout/stderr.
- \`<check_file path="nama_file.ext" />\`
  Memverifikasi keberadaan dan ukuran berkas fisik di disk sandbox.
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

# 4. Tabel Elegan Berwarna & Zebra Striping
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

# Mengisi baris data tabel (GUNAKAN enumerate(data_rows), DILARANG KERAS table.rows.index):
data_rows = [
    ['Kuartal I', 'Rp 1.200 M', 'Rp 1.450 M', '+20.8%'],
    ['Kuartal II', 'Rp 1.400 M', 'Rp 1.680 M', '+20.0%'],
    ['Kuartal III', 'Rp 1.600 M', 'Rp 1.950 M', '+21.8%'],
    ['Kuartal IV', 'Rp 1.800 M', 'Rp 2.300 M', '+27.7%'],
]
for r_idx, row in enumerate(data_rows):
    row_cells = tbl.add_row().cells
    for c_idx, val in enumerate(row):
        row_cells[c_idx].text = str(val)
        if r_idx % 2 == 0:
            row_cells[c_idx]._tc.get_or_add_tcPr().append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="F8FAFC"/>'))

# ⚠️ PERINGATAN KERAS DOCX:
# JANGAN PERNAH MENULIS table.rows.index(...) KARENA OBJEK _Rows BUKAN LIST DAN AKAN ERROR!
# GUNAKAN SELALU enumerate(data_rows) SEPERTI CONTOH DI ATAS!

doc.save('dokumen_laporan.docx')
\`\`\`

---

## 📊 KEAHLIAN SUPER #2: PRESENTASI POWERPOINT (.PPTX) MODERN 16:9 (BERSIH & ANTI-TELANJANG)
Pustaka Python: \`python-pptx\` (SUDAH TERPASANG) + Engine: \`kits/pptx_designer.py\`.

### Standar Mutlak Kualitas Desain PPTX:
- SLIDE DILARANG KERAS TAMPIL TELANJANG (DILARANG prs.slide_layouts[1] mentah, DILARANG latar putih polos tanpa kontainer kartu).
- DILARANG menyisipkan grafik placeholder sembarang seperti sinus \`np.sin(x)\`. Gunakan kartu data kuantitatif nyata atau kartu Bento Box.
- WAJIB gunakan rasio layar lebar 16:9 Widescreen:
  * Lebar 13.333 inch, Tinggi 7.5 inch (\`LAYOUT BANDS MATH\` anti-tabrakan).

### JALUR #1 (TERCEPAT & TERBAIK): Gunakan Spec JSON & \`pptx_designer.py\`
Tulis file \`spec.json\` lalu jalankan runner otomatis:
\`\`\`json
{
  "theme": "emerald",
  "title": "Smart Cattle & Modern Agribusiness 4.0",
  "slides": [
    {
      "type": "cover",
      "kicker": "SMART LIVESTOCK 4.0",
      "title": "Transformasi Peternakan Sapi Modern Berbasis IoT & AI",
      "subtitle": "Integrasi Bio-Telemetri, Nutrisi Presisi TMR, dan Biosekuriti Ramah Lingkungan",
      "meta": "DEEPERNOVA AGRI-TECH • 2026"
    },
    {
      "type": "comparison",
      "kicker": "PARADIGMA INDUSTRI",
      "title": "Perbandingan: Sistem Konvensional vs Smart Farm 4.0",
      "col_a": {
        "tag": "SISTEM TRADISIONAL",
        "title": "Pengelolaan Manual",
        "desc": "Pemantauan visual kasat mata dengan pemberian pakan tanpa takaran terukur.",
        "stat": "14-16 L",
        "stat_label": "Produksi harian rata-rata per ekor",
        "bullets": ["Deteksi birahi & penyakit terlambat", "Pemborosan pakan hingga 25%"]
      },
      "col_b": {
        "tag": "SMART CATTLE 4.0",
        "title": "Ekosistem Presisi Berbasis Sensor",
        "desc": "Ear-tag bio-telemetri mendeteksi aktivitas ruminasi dan suhu tubuh 24/7.",
        "stat": "28.5 L",
        "stat_label": "Produksi susu Grade A (+85%)",
        "bullets": ["Pemberian pakan robotik otomatis", "Konversi kotoran menjadi biogas"]
      }
    },
    {
      "type": "kpi",
      "kicker": "METRIK UTAMA",
      "title": "Indikator Kinerja Utama & Efisiensi Terverifikasi",
      "kpis": [
        {"label": "PRODUKSI HARIAN", "value": "28.5 L", "sub": "+78% di atas baseline"},
        {"label": "FEED CONVERSION (FCR)", "value": "1.28", "sub": "Optimalisasi ransum pakan"},
        {"label": "TINGKAT KEBUNTINGAN", "value": "72.4%", "sub": "Akurasi inseminasi buatan"},
        {"label": "MORTALITAS PEDET", "value": "< 1.5%", "sub": "Sistem pencegahan dini"}
      ],
      "bullets": [
        "Ventilasi tunnel otomatis menjaga iklim kandang nyaman dan menekan heat stress.",
        "Formulasi pakan silase jagung meningkatkan kadar protein dan lemak susu secara stabil."
      ]
    },
    {
      "type": "split",
      "kicker": "ARTIKEL MENDALAM",
      "left_card": {
        "tag": "BIO-TELEMETRI SAPI",
        "title": "Arsitektur Sensor Pintar & Pemantauan Kesehatan Sapi",
        "paragraphs": [
          "Setiap ternak dilengkapi ear-tag pintar bersertifikasi IP68 dengan sensor akselerometer 3-sumbu dan termometer inframerah.",
          "Algoritma AI menganalisis pola ruminasi secara real-time untuk mendeteksi potensi penyakit sebelum gejala klinis muncul."
        ],
        "bullets": [
          "Deteksi siklus estrus dengan akurasi 96%",
          "Pemetaan padang gembala anti-kehilangan",
          "Rekam medis digital per ekor sapi terintegrasi QR code"
        ]
      },
      "right_card": {
        "stat_label": "EFISIENSI BIAYA KESEHATAN",
        "stat": "-64%",
        "highlight_title": "Pencegahan Penyakit Proaktif",
        "highlight_desc": "Intervensi dini menekan biaya obat dan mencegah penurunan yield mendadak.",
        "meta_tag": "BIOSEKURITI GRADE A"
      }
    },
    {
      "type": "bento",
      "kicker": "SARANA OTOMASI",
      "title": "Tiga Komponen Fasilitas Kandang Otomatis Berkelanjutan",
      "cards": [
        {"tag": "ROBOTIK", "title": "Rotary Milking Parlour", "stat": "300 Ekor/Jam", "stat_label": "Kapasitas Pemerahan", "desc": "Pemerahan higienis otomatis dengan pendinginan seketika 4°C.", "bullets": ["Zero human touch", "Audit mutu real-time"]},
        {"tag": "PAKAN", "title": "Automatic Feeding TMR", "stat": "±10 gram", "stat_label": "Presisi Takaran", "desc": "Mixer pakan digital mendistribusikan ransum secara teratur.", "bullets": ["Zero pakan tercecer", "Formulasi adaptif"]},
        {"tag": "SIRKULASI", "title": "Smart Climate Control", "stat": "22°C", "stat_label": "Suhu Kandang Terjaga", "desc": "Kipas heksagonal dan misting beroperasi otomatis sesuai indeks THI.", "bullets": ["Bebas bau menyengat", "Matras karet empuk"]}
      ]
    },
    {
      "type": "timeline",
      "kicker": "SIKLUS KEBERLANJUTAN",
      "title": "Penerapan Sirkular Ekonomi: Zero Waste Farm",
      "steps": [
        {"phase": "TAHAP 1", "title": "Pembersihan Otomatis", "desc": "Pengumpulan feses dengan scraper mekanik setiap 2 jam."},
        {"phase": "TAHAP 2", "title": "Reaktor Biodigester", "desc": "Fermentasi menghasilkan gas metana untuk listrik mandiri."},
        {"phase": "TAHAP 3", "title": "Separasi Kompos", "desc": "Pemisahan padatan untuk pupuk organik perkebunan."},
        {"phase": "TAHAP 4", "title": "Pupuk Cair Nutrisi", "desc": "Nutrisi cair menyuburkan lahan rumput gajah odot."}
      ]
    },
    {
      "type": "outro",
      "title": "Membangun Masa Depan Agribisnis Berkelanjutan",
      "subtitle": "Kedaulatan Pangan Mandiri • info@smartfarm.id"
    }
  ]
}
\`\`\`
Lalu jalankan:
\`<run_command>python kits/pptx_designer.py spec.json presentasi.pptx</run_command>\`

### JALUR #2: Skrip Python Langsung (\`from pptx_designer import ModernDeck\`)
\`\`\`python
from pptx_designer import ModernDeck

deck = ModernDeck(theme="emerald", title="Presentasi Sapi Modern")
deck.add_cover("Smart Cattle Farming 4.0", "Peternakan Modern Terintegrasi", "AGRI-TECH", "2026")
deck.add_comparison("Metode Konvensional vs Smart Farm", "PERBANDINGAN", col_a={...}, col_b={...})
deck.add_kpi_showcase("Metrik Kunci Produksi", "PERFORMA", kpis=[...], bullets=[...])
deck.add_split_hero("Arsitektur Sensor Pintar Sapi", "DEEP DIVE", left_card={...}, right_card={...})
deck.add_bento_cards("Tiga Komponen Fasilitas", "FASILITAS", cards=[...])
deck.add_process_steps("Alur Sirkular Zero Waste", "PROSES", steps=[...])
deck.add_outro("Membangun Agribisnis Berkelanjutan", "info@smartfarm.id")
deck.save("presentasi.pptx")
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

## 🌐 KEAHLIAN SUPER #5: APLIKASI WEB & CARA NGODING FRONT END MODERN & INTERAKTIF
### Standar Mutlak Koding Front End:
1. **Struktur Berkas Tunggal Mandiri**:
   - Selalu susun berkas web lengkap di \`index.html\` (HTML5, embedded CSS berkelas, dan interaktivitas JS).
   - Pastikan halaman TIDAK blank putih atau berstatus loading tanpa isi. Konten utama harus langsung tampil dan hidup saat pertama kali dimuat!
2. **Desain Estetika Visual Berkelas (Deepernova Design System)**:
   - Skema Warna:
     * Latar Belakang: Dark Executive Slate (\`#0F172A\`) atau Clean Light (\`#F8FAFC\`).
     * Kartu Konten: Surface Card (\`#1E293B\`) dengan border tipis elegan (\`1px solid #334155\`) dan shadow lembut (\`box-shadow: 0 4px 20px rgba(0,0,0,0.3)\`).
     * Aksen Utama: Vibrant Tangerine (\`#EA580C\` / \`#F97316\`).
     * Aksen Metrik: Emerald Green (\`#10B981\`) untuk positif/sukses, Sky Blue (\`#38BDF8\`) untuk data/angka.
     * Tipografi: Font sistem modern: \`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif\`.
3. **Komponen Wajib Front End**:
   - **Header Area**: Logo/Ikon, Judul Aplikasi yang tegas, Badge status sistem (\`● Live Active\`).
   - **Scorecard KPI Grid**: 3-4 kartu metrik utama dengan angka raksasa bold (30-36px), label abu-abu halus, dan persentase tren.
   - **Tabel Interaktif / Data Grid**: Header gelap (\`#0B0F19\`), teks rapi, zebra border, dan status pill berwarna.
   - **Form / Tombol Aksi**: Tombol dengan hover micro-animation (\`transform: translateY(-2px)\`, \`transition: all 0.2s ease\`).
4. **Interaktivitas JavaScript Nyata**:
   - Tambahkan interaktivitas fungsional (misal: filter pencarian real-time, toggle tab, kalkulator instan, modal popup, atau animasi counter).
5. **Tangkapan Layar Browser Wajib**:
   - Setiap kali menulis \`index.html\`, selalu akhiri dengan tag aksi \`<screenshot target="index.html" />\` agar mesin browser headless Puppeteer otomatis merender halaman, mengeksekusi script, dan mengirimkan hasil tangkapan layarnya ke pengguna!

### Cuplikan Kode Referensi Front-End (\`index.html\`):
\`\`\`html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Analisis & Manajemen Operasional</title>
  <style>
    :root {
      --bg: #0F172A;
      --card-bg: #1E293B;
      --text-main: #F8FAFC;
      --text-muted: #94A3B8;
      --accent: #EA580C;
      --accent-hover: #F97316;
      --border: #334155;
      --success: #10B981;
      --info: #38BDF8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
      background: var(--bg);
      color: var(--text-main);
      padding: 28px;
      min-height: 100vh;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header {
      display: flex; justify-content: space-between; align-items: center;
      padding-bottom: 24px; border-bottom: 1px solid var(--border); margin-bottom: 28px;
    }
    .title-area h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .title-area p { color: var(--text-muted); font-size: 14px; margin-top: 4px; }
    .badge {
      background: rgba(16, 185, 129, 0.15); color: var(--success);
      padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; margin-bottom: 28px; }
    .card {
      background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 14px; padding: 22px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .card:hover { transform: translateY(-3px); border-color: var(--accent); }
    .card-label { font-size: 12px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .card-num { font-size: 32px; font-weight: 800; color: var(--text-main); margin-top: 8px; }
    .card-trend { font-size: 13px; color: var(--success); margin-top: 6px; font-weight: 600; }
    .content-box {
      background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px; padding: 24px; margin-bottom: 24px;
    }
    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; gap: 12px; flex-wrap: wrap; }
    .search-input {
      background: #0B0F19; border: 1px solid var(--border); color: var(--text-main);
      padding: 10px 16px; border-radius: 8px; font-size: 14px; width: 300px; outline: none;
    }
    .search-input:focus { border-color: var(--accent); }
    .btn {
      background: var(--accent); color: #FFF; border: none; padding: 10px 20px;
      border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s ease;
    }
    .btn:hover { background: var(--accent-hover); transform: translateY(-2px); }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background: #0B0F19; padding: 14px 18px; font-size: 13px; color: var(--text-muted); font-weight: 600; border-bottom: 1px solid var(--border); }
    td { padding: 14px 18px; border-bottom: 1px solid var(--border); font-size: 14px; }
    tr:nth-child(even) { background: rgba(255,255,255,0.02); }
    .status-pill {
      display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;
    }
    .status-active { background: rgba(16, 185, 129, 0.15); color: #34D399; }
    .status-pending { background: rgba(234, 88, 12, 0.15); color: #FB923C; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="title-area">
        <h1>Sistem Pemantauan Operasional</h1>
        <p>Ringkasan real-time metrik kinerja dan data terintegrasi</p>
      </div>
      <div class="badge">● Sistem Beroperasi Normal</div>
    </header>

    <div class="grid">
      <div class="card">
        <div class="card-label">Total Aktivitas</div>
        <div class="card-num" id="stat-total">1,280</div>
        <div class="card-trend">↑ +14.8% dari minggu lalu</div>
      </div>
      <div class="card">
        <div class="card-label">Efisiensi Rata-rata</div>
        <div class="card-num" id="stat-eff">94.6%</div>
        <div class="card-trend">↑ +3.2% optimalisasi</div>
      </div>
      <div class="card">
        <div class="card-label">Waktu Respons</div>
        <div class="card-num" id="stat-resp">240 ms</div>
        <div class="card-trend" style="color: var(--info);">⚡ Performa ultra-cepat</div>
      </div>
    </div>

    <div class="content-box">
      <div class="toolbar">
        <input type="text" id="filterInput" class="search-input" placeholder="Cari data atau item..." onkeyup="filterTable()">
        <button class="btn" onclick="addNewItem()">+ Tambah Data</button>
      </div>
      <div style="overflow-x: auto;">
        <table id="dataTable">
          <thead>
            <tr>
              <th>ID Modul</th>
              <th>Nama Komponen</th>
              <th>Status</th>
              <th>Penggunaan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>MOD-01</td>
              <td>Gateway Pembayaran & Verifikasi</td>
              <td><span class="status-pill status-active">Aktif</span></td>
              <td>88.4%</td>
              <td><button class="btn" style="padding: 4px 10px; font-size: 12px;" onclick="alert('Modul Aktif')">Detail</button></td>
            </tr>
            <tr>
              <td>MOD-02</td>
              <td>Sinkronisasi Basis Data & Cache</td>
              <td><span class="status-pill status-active">Aktif</span></td>
              <td>92.1%</td>
              <td><button class="btn" style="padding: 4px 10px; font-size: 12px;" onclick="alert('Modul Aktif')">Detail</button></td>
            </tr>
            <tr>
              <td>MOD-03</td>
              <td>Penjadwal Tugas Latar Belakang</td>
              <td><span class="status-pill status-pending">Proses</span></td>
              <td>45.0%</td>
              <td><button class="btn" style="padding: 4px 10px; font-size: 12px;" onclick="alert('Dalam Proses')">Detail</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    function filterTable() {
      const input = document.getElementById('filterInput').value.toLowerCase();
      const rows = document.querySelectorAll('#dataTable tbody tr');
      rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(input) ? '' : 'none';
      });
    }

    function addNewItem() {
      const table = document.querySelector('#dataTable tbody');
      const count = table.rows.length + 1;
      const tr = document.createElement('tr');
      tr.innerHTML = \`
        <td>MOD-0\${count}</td>
        <td>Layanan Pemrosesan Baru #\${count}</td>
        <td><span class="status-pill status-active">Aktif</span></td>
        <td>100%</td>
        <td><button class="btn" style="padding: 4px 10px; font-size: 12px;" onclick="alert('Detail Baru')">Detail</button></td>
      \`;
      table.appendChild(tr);
      document.getElementById('stat-total').innerText = (1280 + count).toLocaleString();
    }
  </script>
</body>
</html>
\`\`\`

---
Setiap kali pengguna meminta berkas Word (.docx), PowerPoint (.pptx), Excel (.xlsx), atau aplikasi web, Anda WAJIB menerapkan seluruh standar estetika, tabel bergaya, dan kurva/grafik di atas secara maksimal!`;

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
  }
  // Ensure SKILL.md is always up-to-date with latest comprehensive skills
  const skillPath = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(skillPath)) {
    fs.writeFileSync(skillPath, DEFAULT_SKILL_MD, 'utf8');
  } else {
    try {
      const existingSkill = fs.readFileSync(skillPath, 'utf8');
      if (!existingSkill.includes('KEAHLIAN SUPER #5') || !existingSkill.includes('table.rows.index') || !existingSkill.includes('pptx_designer.py')) {
        fs.writeFileSync(skillPath, DEFAULT_SKILL_MD, 'utf8');
      }
    } catch (_) { }
  }

  // Ensure kits/ folder exists in session sandbox for instant Python automation
  const sessionKitsDir = path.join(dir, 'kits');
  if (fs.existsSync(KITS_SOURCE_DIR)) {
    if (!fs.existsSync(sessionKitsDir) || !fs.existsSync(path.join(sessionKitsDir, 'pptx_designer.py'))) {
      try {
        fs.cpSync(KITS_SOURCE_DIR, sessionKitsDir, { recursive: true });
      } catch (_) { }
    }
  }

  // Ensure templates/ folder exists in session sandbox
  const sessionTemplatesDir = path.join(dir, 'templates');
  if (fs.existsSync(TEMPLATES_SOURCE_DIR)) {
    if (!fs.existsSync(sessionTemplatesDir) || !fs.existsSync(path.join(sessionTemplatesDir, 'pptx_agribisnis_sapi_modern_spec.json'))) {
      try {
        fs.cpSync(TEMPLATES_SOURCE_DIR, sessionTemplatesDir, { recursive: true });
      } catch (_) { }
    }
  }

  return dir;
}

/**
 * Safely resolve a path inside the sandbox directory, preventing directory traversal
 */
export function safeResolvePath(sessionId, relativePath) {
  const sandboxDir = path.resolve(getSandboxDir(sessionId));
  const cleanRelative = String(relativePath || '').replace(/^[\\/]+/, '');
  const targetPath = path.resolve(sandboxDir, cleanRelative);

  if (targetPath !== sandboxDir && !targetPath.startsWith(sandboxDir + path.sep)) {
    throw new Error('Akses ditolak: Percobaan path traversal di luar sandbox terdeteksi.');
  }
  return targetPath;
}

/**
 * Helper to safely remove an indented python block (e.g. invalid loop)
 */
function removeIndentedBlock(source, pattern) {
  const lines = (source || '').split(/\r?\n/);
  const result = [];
  let skippingIndent = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (skippingIndent >= 0) {
      const matchIndent = (line.match(/^(\s*)/) || ['', ''])[1].length;
      if (line.trim().length === 0 || matchIndent > skippingIndent) {
        continue;
      } else {
        skippingIndent = -1;
      }
    }

    if (pattern.test(line)) {
      const indent = (line.match(/^(\s*)/) || ['', ''])[1];
      result.push(indent + 'pass  # auto-healed unsupported property');
      skippingIndent = indent.length;
      continue;
    }

    result.push(line);
  }
  return result.join('\n');
}

/**
 * Write file to sandbox
 */
export function writeFile(sessionId, relativePath, content) {
  let cleanContent = content || '';

  // 1. If wrapped in standard markdown code fences, extract the inner code
  const fullFenceMatch = cleanContent.trim().match(/^```(?:[a-zA-Z0-9_-]+)?\r?\n([\s\S]*?)\r?\n```$/);
  if (fullFenceMatch) {
    cleanContent = fullFenceMatch[1];
  } else {
    // 2. Or if there is an embedded code fence inside:
    const embeddedMatch = cleanContent.match(/```(?:[a-zA-Z0-9_-]+)?\r?\n([\s\S]*?)\r?\n```/);
    if (embeddedMatch) {
      cleanContent = embeddedMatch[1];
    } else {
      // 3. Strip leading code fences (e.g. ```python, ```js, ```) at the start
      cleanContent = cleanContent.replace(/^\s*```[a-zA-Z0-9_-]*\r?\n?/, '');
      // 4. Strip trailing code fence at the end
      cleanContent = cleanContent.replace(/\r?\n?```\s*$/, '');
    }
  }

  // 5. Line-by-line inspection to guarantee no orphan code fence remains on line 1 or last line
  const lines = cleanContent.split(/\r?\n/);
  while (lines.length > 0 && /^\s*```[a-zA-Z0-9_-]*\s*$/.test(lines[0])) {
    lines.shift();
  }
  while (lines.length > 0 && /^\s*```\s*$/.test(lines[lines.length - 1])) {
    lines.pop();
  }
  cleanContent = lines.join('\n');

  // Preventative auto-healing for code / data files
  if (!relativePath.endsWith('.md')) {
    // Remove any remaining stray ``` inside any code / data files
    cleanContent = cleanContent.split(/\r?\n/).filter(line => !/^\s*```/.test(line)).join('\n');
  }

  // Preventative auto-healing for common python docx/pptx document generation scripts only
  if ((cleanContent.includes('docx') || cleanContent.includes('pptx')) && (relativePath.endsWith('.py') || cleanContent.includes('Document()') || cleanContent.includes('Presentation()'))) {
    // Fix hallucinated .lstStyle loop on tcPr
    if (cleanContent.includes('.lstStyle')) {
      cleanContent = removeIndentedBlock(cleanContent, /\.lstStyle/);
    }
    // Replace table.rows.index(...) in python-docx with 0 safely without touching pandas/user columns.index
    cleanContent = cleanContent.replace(/\b(?:tbl|table)\.rows\.index\s*\([^)]*\)/g, '0');
    // Fix font.color.rgb = parse_xml(...)
    cleanContent = cleanContent.replace(/\.font\.color\.rgb\s*=\s*parse_xml\([^)]*\)/g, '.font.color.rgb = RGBColor(255, 255, 255)');
    // Fix truncated WD_ALIGN_PARAGR
    cleanContent = cleanContent.replace(/\bWD_ALIGN_PARAGR\b/g, 'WD_ALIGN_PARAGRAPH');
    // Fix hallucinated .paragraph_format.shading
    cleanContent = cleanContent.replace(/\bparagraph_format\.shading(?:\.\w+)?\s*=\s*[^;\r\n]+/g, 'pass');
    cleanContent = cleanContent.replace(/\.shading\.\w+\s*=\s*[^;\r\n]+/g, 'pass');
    // Fix hallucinated .add_pPr
    cleanContent = cleanContent.replace(/\b(?:tag\s*=\s*)?[a-zA-Z0-9_.]+\.add_pPr\([^\)]*\)/g, 'pass');
    // Fix hallucinated get_or_add_tblBorders
    cleanContent = cleanContent.replace(/[^\n]*\.get_or_add_tblBorders\(\)[^\n]*/g, 'pass');
    cleanContent = cleanContent.replace(/for\s+\w+\s+in\s+\[['"]top['"],[\s\S]*?(?=\n\s*(?:[a-zA-Z_#]|$))/g, 'pass\n');
    // Fix openpyxl tuple range styling ws['A1:D1'].font = ...
    if (cleanContent.includes('openpyxl') || cleanContent.includes('Workbook')) {
      cleanContent = cleanContent.replace(/([a-zA-Z0-9_]+)\s*\[([^\]\r\n]*:[^\]\r\n]*)\]\.(font|fill|alignment|border|number_format)\s*=\s*([^;\r\n]+)/g, (match, wsVar, rangeExpr, prop, val) => {
        return `for _r in ${wsVar}[${rangeExpr}]:\n    for _c in (_r if isinstance(_r, (tuple, list)) else [_r]):\n        setattr(_c, '${prop}', ${val})`;
      });
    }
    // Fix hallucinated .paragraphProperties on CT_P element
    cleanContent = cleanContent.replace(/\.paragraphProperties/g, '');
  }

  const cleanRelativePath = (relativePath || 'script.js').replace(/^["']|["']$/g, '').trim();
  const filePath = safeResolvePath(sessionId, cleanRelativePath);

  // Automatic Checkpoint: snapshot existing file before overwrite
  if (fs.existsSync(filePath)) {
    try {
      createCheckpoint(sessionId, cleanRelativePath, 'Sebelum overwrite writeFile');
    } catch (_) { }
  }

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
      if (item.name === '.git' || item.name === 'node_modules' || item.name === 'kits' || item.name === 'templates' || item.name === 'macros' || item.name.startsWith('_runner_temp') || item.name.startsWith('.')) continue;
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
 * Create a snapshot checkpoint of a file before mutation
 */
export function createCheckpoint(sessionId, relativePath, description = '') {
  try {
    const sourcePath = safeResolvePath(sessionId, relativePath);
    if (!fs.existsSync(sourcePath)) return null;

    const sessionCkDir = path.join(CHECKPOINTS_ROOT, sanitizeSessionId(sessionId));
    if (!fs.existsSync(sessionCkDir)) fs.mkdirSync(sessionCkDir, { recursive: true });

    const timestamp = Date.now();
    const backupName = `${timestamp}__${path.basename(relativePath)}`;
    const backupPath = path.join(sessionCkDir, backupName);
    fs.copyFileSync(sourcePath, backupPath);

    return {
      timestamp,
      file: relativePath,
      backupFile: backupName,
      description
    };
  } catch (e) {
    return null;
  }
}

/**
 * Rollback file to latest saved checkpoint
 */
export function rollbackFile(sessionId, relativePath) {
  const sessionCkDir = path.join(CHECKPOINTS_ROOT, sanitizeSessionId(sessionId));
  if (!fs.existsSync(sessionCkDir)) {
    throw new Error('Tidak ada riwayat checkpoint tersimpan untuk sesi ini.');
  }

  const base = path.basename(relativePath);
  const backups = fs.readdirSync(sessionCkDir)
    .filter(f => f.endsWith(`__${base}`))
    .sort()
    .reverse();

  if (backups.length === 0) {
    throw new Error(`Tidak ada checkpoint tersimpan untuk berkas '${relativePath}'.`);
  }

  const latestBackup = path.join(sessionCkDir, backups[0]);
  const targetPath = safeResolvePath(sessionId, relativePath);
  fs.copyFileSync(latestBackup, targetPath);

  return {
    success: true,
    file: relativePath,
    restoredFrom: backups[0]
  };
}

/**
 * SOTA Diff & Patch File with Line-Anchored and Fuzzy Block Matching
 */
export function patchFile(sessionId, relativePath, { startLine, endLine, target, replacement, content } = {}) {
  const filePath = safeResolvePath(sessionId, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Berkas '${relativePath}' tidak ditemukan di sandbox.`);
  }

  // Create automatic checkpoint before applying patch
  createCheckpoint(sessionId, relativePath, 'Sebelum patch_file');

  let raw = fs.readFileSync(filePath, 'utf8');
  let lines = raw.split(/\r?\n/);
  let summary = '';

  const parsedStart = typeof startLine === 'number' ? startLine : parseInt(startLine, 10);
  const parsedEnd = typeof endLine === 'number' ? endLine : parseInt(endLine, 10);

  if (!isNaN(parsedStart) && !isNaN(parsedEnd) && parsedStart >= 1 && parsedEnd <= lines.length) {
    // 1. Line-anchored patch (Claude / Codex standard)
    const beforeLines = lines.slice(0, parsedStart - 1);
    const afterLines = lines.slice(parsedEnd);
    const replContent = replacement !== undefined ? replacement : (content || '');
    const replLines = replContent.split(/\r?\n/);
    lines = [...beforeLines, ...replLines, ...afterLines];
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    summary = `Baris ${parsedStart}-${parsedEnd} pada '${relativePath}' berhasil di-patch (${replLines.length} baris baru).`;
  } else if (target && typeof target === 'string') {
    // 2. Exact string match
    if (raw.includes(target)) {
      raw = raw.replace(target, replacement || '');
      fs.writeFileSync(filePath, raw, 'utf8');
      summary = `Target teks pada '${relativePath}' berhasil diganti (${target.length} karakter diubah).`;
    } else {
      // 3. Fuzzy line-trimmed match (tolerant to indentation differences)
      const targetLines = target.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      let matchedIdx = -1;
      for (let i = 0; i <= lines.length - targetLines.length; i++) {
        let allMatch = true;
        for (let j = 0; j < targetLines.length; j++) {
          if (lines[i + j].trim() !== targetLines[j]) {
            allMatch = false;
            break;
          }
        }
        if (allMatch) {
          matchedIdx = i;
          break;
        }
      }
      if (matchedIdx !== -1) {
        const replLines = (replacement || '').split(/\r?\n/);
        lines.splice(matchedIdx, targetLines.length, ...replLines);
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
        summary = `Target blok pada '${relativePath}' berhasil dicocokkan (fuzzy) dan diperbarui.`;
      } else {
        throw new Error(`Target teks yang ingin di-patch tidak ditemukan di dalam '${relativePath}'.`);
      }
    }
  } else if (typeof content === 'string') {
    fs.writeFileSync(filePath, content, 'utf8');
    summary = `Konten '${relativePath}' berhasil diperbarui (${content.length} karakter).`;
  } else {
    throw new Error('Instruksi patch tidak memiliki target teks atau rentang baris.');
  }

  const stat = fs.statSync(filePath);
  return {
    path: relativePath,
    size: stat.size,
    summary
  };
}

/**
 * Fast search in sandbox files (Ripgrep style)
 */
export function grepSearch(sessionId, { query, includes = '', caseInsensitive = true, maxResults = 40 } = {}) {
  const sandboxDir = getSandboxDir(sessionId);
  if (!query || typeof query !== 'string') return [];

  const results = [];
  const flags = caseInsensitive ? 'i' : '';
  let regex;
  try {
    regex = new RegExp(query, flags);
  } catch (_) {
    regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
  }

  const includePatterns = includes
    ? includes.split(',').map(p => p.trim().replace(/\*/g, '.*'))
    : null;

  function walkAndSearch(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.name === '.git' || item.name === 'node_modules' || item.name === 'kits' || item.name === 'templates' || item.name === 'macros' || item.name.startsWith('_runner_temp') || item.name.startsWith('.')) continue;
      const fullPath = path.join(dir, item.name);
      const relative = path.relative(sandboxDir, fullPath).replace(/\\/g, '/');

      if (item.isDirectory()) {
        walkAndSearch(fullPath);
      } else if (item.isFile()) {
        if (includePatterns && !includePatterns.some(pat => new RegExp(pat, 'i').test(item.name))) {
          continue;
        }
        const ext = path.extname(item.name).toLowerCase();
        const textExts = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.json', '.html', '.css', '.md', '.txt', '.sql', '.env', '.csv', '.xml', '.yml', '.yaml'];
        if (!textExts.includes(ext)) continue;

        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const fileLines = content.split(/\r?\n/);
          for (let lineNum = 0; lineNum < fileLines.length; lineNum++) {
            const line = fileLines[lineNum];
            if (regex.test(line)) {
              results.push({
                file: relative,
                line: lineNum + 1,
                content: line.trim()
              });
              if (results.length >= maxResults) return;
            }
          }
        } catch (_) { }
      }
    }
  }

  walkAndSearch(sandboxDir);
  return results;
}

/**
 * Intelligent Observation Trimming (Observation Masking)
 * Preserves the beginning context and end stack traces while compressing noisy middle output.
 */
export function trimObservation(text, maxChars = 2500) {
  if (!text || text.length <= maxChars) return text;
  const lines = text.split(/\r?\n/);
  if (lines.length <= 40) {
    return text.slice(0, 1000) + '\n\n... [output panjang dipangkas untuk efisiensi context window] ...\n\n' + text.slice(-1000);
  }
  const headLines = lines.slice(0, 20);
  const tailLines = lines.slice(-25);
  const omitted = lines.length - 45;
  return `${headLines.join('\n')}\n\n... [${omitted} baris output observasi dipangkas untuk efisiensi context window] ...\n\n${tailLines.join('\n')}`;
}

/**
 * Edit file in sandbox by target replacement or new content
 */
export function editFile(sessionId, relativePath, { target, replacement, content } = {}) {
  // Delegate to patchFile which supports auto-checkpointing and fuzzy matching
  return patchFile(sessionId, relativePath, { target, replacement, content });
}

/**
 * Test file integrity & syntax inside session sandbox
 */
export async function testFile(sessionId, relativePath) {
  const filePath = safeResolvePath(sessionId, relativePath);
  if (!fs.existsSync(filePath)) {
    return { success: false, message: `Berkas '${relativePath}' tidak ditemukan di sandbox.`, detail: '' };
  }
  const ext = path.extname(relativePath).toLowerCase().replace('.', '');
  const stat = fs.statSync(filePath);
  if (stat.size === 0) {
    return { success: false, message: `Berkas '${relativePath}' kosong (0 byte).`, detail: 'File size is 0 bytes.' };
  }

  if (ext === 'py') {
    return new Promise((resolve) => {
      execFile('python', ['-m', 'py_compile', filePath], { timeout: 15000, env: getSterileEnv(sessionId) }, (err, stdout, stderr) => {
        if (err) {
          resolve({ success: false, message: `Sintaks Python error pada '${relativePath}'.`, detail: stderr || stdout || err.message });
        } else {
          resolve({ success: true, message: `Sintaks Python valid dan bebas error kompilasi.`, detail: `Ukuran berkas: ${(stat.size / 1024).toFixed(1)} KB` });
        }
      });
    });
  }

  if (ext === 'js' || ext === 'mjs' || ext === 'cjs') {
    return new Promise((resolve) => {
      execFile('node', ['--check', filePath], { timeout: 15000, env: getSterileEnv(sessionId) }, (err, stdout, stderr) => {
        if (err) {
          resolve({ success: false, message: `Sintaks JavaScript error pada '${relativePath}'.`, detail: stderr || stdout || err.message });
        } else {
          resolve({ success: true, message: `Sintaks JavaScript valid dan bebas error parsing.`, detail: `Ukuran berkas: ${(stat.size / 1024).toFixed(1)} KB` });
        }
      });
    });
  }

  if (ext === 'json') {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      JSON.parse(raw);
      return { success: true, message: `Format JSON valid.`, detail: `Ukuran berkas: ${(stat.size / 1024).toFixed(1)} KB` };
    } catch (jsonErr) {
      return { success: false, message: `Format JSON tidak valid: ${jsonErr.message}`, detail: jsonErr.message };
    }
  }

  if (ext === 'pptx' || ext === 'docx' || ext === 'xlsx') {
    try {
      const buf = fs.readFileSync(filePath);
      if (buf.length < 500) {
        return { success: false, message: `Ukuran berkas Office terlalu kecil (${buf.length} byte). Kemungkinan corrupt.`, detail: `Hanya ${buf.length} bytes.` };
      }
      const zip = await JSZip.loadAsync(buf);
      const fileCount = Object.keys(zip.files).length;
      if (fileCount > 0) {
        return { success: true, message: `Struktur arsip ${ext.toUpperCase()} valid (${fileCount} part internal).`, detail: `Ukuran berkas: ${(stat.size / 1024).toFixed(1)} KB` };
      } else {
        return { success: false, message: `Arsip berkas ${ext.toUpperCase()} kosong.`, detail: '' };
      }
    } catch (zipErr) {
      return { success: false, message: `Gagal memvalidasi struktur arsip ${ext.toUpperCase()}: ${zipErr.message}`, detail: zipErr.message };
    }
  }

  if (ext === 'html') {
    const htmlContent = fs.readFileSync(filePath, 'utf8');
    const hasTags = /<html|<head|<body|<!doctype/i.test(htmlContent);
    if (hasTags) {
      return { success: true, message: `Dokumen HTML memiliki struktur valid.`, detail: `Ukuran berkas: ${(stat.size / 1024).toFixed(1)} KB` };
    } else {
      return { success: false, message: `Dokumen HTML tidak memiliki tag HTML standar.`, detail: '' };
    }
  }

  return { success: true, message: `Berkas '${relativePath}' terverifikasi ada dan memiliki integritas normal.`, detail: `Ukuran berkas: ${(stat.size / 1024).toFixed(1)} KB` };
}

/**
 * Generate sterile environment variables, stripping all host server secrets (API keys, DB secrets, etc.)
 */
export function getSterileEnv(sessionId, customEnv = {}) {
  const safeKeys = [
    'PATH', 'Path', 'PATHEXT', 'SYSTEMROOT', 'SystemRoot', 'TEMP', 'TMP',
    'COMSPEC', 'ComSpec', 'OS', 'WINDIR', 'windir', 'PROGRAMFILES', 'ProgramFiles',
    'PROGRAMFILES(X86)', 'ProgramFiles(x86)', 'LOCALAPPDATA', 'APPDATA', 'USERPROFILE',
    'HOMEDRIVE', 'HOMEPATH', 'LANG', 'LC_ALL'
  ];
  const safeEnv = {};
  for (const key of safeKeys) {
    if (process.env[key]) safeEnv[key] = process.env[key];
  }
  const sandboxDir = getSandboxDir(sessionId);
  return {
    ...safeEnv,
    NODE_ENV: 'sandbox',
    SANDBOX_SESSION: sessionId,
    PYTHONPATH: [
      path.join(sandboxDir, 'kits'),
      KITS_SOURCE_DIR,
      sandboxDir
    ].filter(Boolean).join(path.delimiter),
    ...customEnv
  };
}

/**
 * Kill all running child processes for a session (prevents zombie processes on abort)
 */
export function killSessionProcesses(sessionId) {
  const procs = activeProcesses.get(sessionId);
  if (!procs || procs.size === 0) return 0;
  let killed = 0;
  for (const proc of procs) {
    try {
      if (proc && proc.pid) {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F']);
        } else {
          try {
            process.kill(-proc.pid, 'SIGKILL');
          } catch (_) {
            proc.kill('SIGKILL');
          }
        }
        killed++;
      }
    } catch (_) { }
  }
  activeProcesses.delete(sessionId);
  return killed;
}

/**
 * Execute code or command safely inside session sandbox
 */
export async function executeInSandbox(sessionId, { language = 'node', code = '', command = '', timeoutMs = 60000 }) {
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
    // Sanitize command against dangerous commands and parent traversal / secret access
    const dangerousPatterns = [
      /rm\s+-rf\s+\//i,
      /format\s+[a-z]:/i,
      /del\s+\/[sfq]/i,
      /rmdir\s+\/s/i,
      /shutdown/i,
      /reboot/i,
      /powershell\s+-(?:e|enc|encodedcommand)/i,
      /:(){ :|:& };:/i,
      /mkfs/i,
      /dd\s+if=/i,
      /\.\.[\\/]/,
      /\.env\b/i,
      /deepernova\.db/i
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
    const runProcess = (cmdToRun, retryCount = 0) => {
      const childProc = exec(
        cmdToRun,
        {
          cwd: sandboxDir,
          timeout: timeoutMs,
          maxBuffer: 1024 * 512, // 512 KB
          env: getSterileEnv(sessionId)
        },
        (error, stdout, stderr) => {
          if (activeProcesses.has(sessionId)) {
            activeProcesses.get(sessionId).delete(childProc);
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

          // Reactive Auto-Healing for Python docx errors, NameErrors, and syntax issues (up to 3 retries)
          if (!success && retryCount < 3) {
            const scriptMatch = cmdToRun.match(/python\s+["']?([^"'\s]+\.py)["']?/i);
            const scriptFile = scriptMatch ? scriptMatch[1] : (createdRunnerFile ? path.basename(createdRunnerFile) : null);
            if (scriptFile) {
              const fullScriptPath = path.isAbsolute(scriptFile) ? scriptFile : path.join(sandboxDir, scriptFile);
              if (fs.existsSync(fullScriptPath)) {
                try {
                  let scriptContent = fs.readFileSync(fullScriptPath, 'utf8');
                  let patched = false;

                  // 0. SyntaxError due to markdown backticks (``` or ```python)
                  if ((cleanStderr.includes('SyntaxError') || cleanStderr.includes('invalid syntax')) && (scriptContent.includes('```') || cleanStderr.includes('`'))) {
                    const cleanLines = scriptContent.split(/\r?\n/).filter(line => !/^\s*```/.test(line));
                    scriptContent = cleanLines.join('\n');
                    patched = true;
                  }

                  // 1. Python "Did you mean: '...'" auto-healing
                  const didYouMeanMatch = cleanStderr.match(/NameError:\s*name\s*['"](\w+)['"]\s*is not defined[^\n]*Did you mean:\s*['"](\w+)['"]/i);
                  if (didYouMeanMatch) {
                    const wrongName = didYouMeanMatch[1];
                    const rightName = didYouMeanMatch[2];
                    scriptContent = scriptContent.replace(new RegExp(`\\b${wrongName}\\b`, 'g'), rightName);
                    patched = true;
                  }

                  // 2. Missing common imports (NameError auto-healing)
                  const isPptxScript = scriptContent.includes('pptx') || (scriptFile && /ppt|presentation/i.test(scriptFile));
                  const isDocxScript = scriptContent.includes('docx') || (scriptFile && /doc|word/i.test(scriptFile));

                  if (cleanStderr.includes("NameError: name 'RGBColor' is not defined") || cleanStderr.includes('assigned value must be type RGBColor')) {
                    if (isPptxScript) {
                      scriptContent = "from pptx.dml.color import RGBColor\n" + scriptContent;
                    } else {
                      scriptContent = "from docx.shared import RGBColor\n" + scriptContent;
                    }
                    patched = true;
                  }
                  if (cleanStderr.includes("NameError: name 'Inches' is not defined") || cleanStderr.includes("NameError: name 'Pt' is not defined")) {
                    if (isPptxScript) {
                      scriptContent = "from pptx.util import Inches, Pt\n" + scriptContent;
                    } else {
                      scriptContent = "from docx.shared import Inches, Pt\n" + scriptContent;
                    }
                    patched = true;
                  }
                  if (cleanStderr.includes("NameError: name 'MSO_SHAPE' is not defined")) {
                    scriptContent = "from pptx.enum.shapes import MSO_SHAPE\n" + scriptContent;
                    patched = true;
                  }
                  if (cleanStderr.includes("NameError: name 'MSO_THEME_COLOR' is not defined")) {
                    scriptContent = "from pptx.enum.dml import MSO_THEME_COLOR\n" + scriptContent;
                    patched = true;
                  }
                  if (cleanStderr.includes("NameError: name 'PP_ALIGN' is not defined")) {
                    scriptContent = "from pptx.enum.text import PP_ALIGN\n" + scriptContent;
                    patched = true;
                  }
                  if (cleanStderr.includes("NameError: name 'WD_ALIGN_PARAGRAPH' is not defined")) {
                    scriptContent = "from docx.enum.text import WD_ALIGN_PARAGRAPH\n" + scriptContent;
                    patched = true;
                  }
                  if (cleanStderr.includes("NameError: name 'parse_xml' is not defined")) {
                    if (isDocxScript) {
                      scriptContent = "from docx.oxml import parse_xml\n" + scriptContent;
                    } else {
                      scriptContent = "from pptx.oxml import parse_xml\n" + scriptContent;
                    }
                    patched = true;
                  }
                  if (cleanStderr.includes("NameError: name 'nsdecls' is not defined")) {
                    scriptContent = "from docx.oxml.ns import nsdecls\n" + scriptContent;
                    patched = true;
                  }
                  if (cleanStderr.includes("NameError: name 'OxmlElement' is not defined")) {
                    scriptContent = "from docx.oxml import OxmlElement\n" + scriptContent;
                    patched = true;
                  }
                  if (cleanStderr.includes("NameError: name 'plt' is not defined")) {
                    scriptContent = "import matplotlib.pyplot as plt\n" + scriptContent;
                    patched = true;
                  }
                  if (cleanStderr.includes("NameError: name 'np' is not defined")) {
                    scriptContent = "import numpy as np\n" + scriptContent;
                    patched = true;
                  }
                  if (cleanStderr.includes("NameError: name 'Workbook' is not defined")) {
                    scriptContent = "from openpyxl import Workbook\n" + scriptContent;
                    patched = true;
                  }

                  // 3. Truncated WD_ALIGN_PARAGR
                  if (cleanStderr.includes('WD_ALIGN_PARAGR') || scriptContent.includes('WD_ALIGN_PARAGR.')) {
                    scriptContent = scriptContent.replace(/\bWD_ALIGN_PARAGR\b/g, 'WD_ALIGN_PARAGRAPH');
                    patched = true;
                  }

                  // 4. CT_P object has no attribute 'paragraphProperties'
                  if (cleanStderr.includes("paragraphProperties") || scriptContent.includes('.paragraphProperties')) {
                    scriptContent = scriptContent.replace(/\.paragraphProperties/g, '');
                    patched = true;
                  }

                  // 5. AttributeError on rows.index or columns.index
                  if (cleanStderr.includes("AttributeError: '_Rows' object has no attribute 'index'") || cleanStderr.includes("object has no attribute 'index'")) {
                    scriptContent = scriptContent.replace(/\b(?:\w+\.)?(?:rows|columns)\.index\s*\([^)]*\)/g, '0');
                    patched = true;
                  }

                  // 6. XMLSyntaxError on font.color.rgb
                  if (cleanStderr.includes('XMLSyntaxError') || cleanStderr.includes('font.color.rgb')) {
                    scriptContent = scriptContent.replace(/\.font\.color\.rgb\s*=\s*parse_xml\([^)]*\)/g, '.font.color.rgb = RGBColor(255, 255, 255)');
                    patched = true;
                  }

                  // 7. AttributeError on lstStyle
                  if (cleanStderr.includes("object has no attribute 'lstStyle'") || scriptContent.includes('.lstStyle')) {
                    scriptContent = removeIndentedBlock(scriptContent, /\.lstStyle/);
                    patched = true;
                  }

                  // 8. AttributeError on shading in paragraph_format
                  if (cleanStderr.includes("object has no attribute 'shading'") || scriptContent.includes('.shading')) {
                    scriptContent = scriptContent.replace(/\bparagraph_format\.shading(?:\.\w+)?\s*=\s*[^;\r\n]+/g, 'pass');
                    scriptContent = scriptContent.replace(/\.shading\.\w+\s*=\s*[^;\r\n]+/g, 'pass');
                    patched = true;
                  }

                  // 9. AttributeError on get_or_add_tblBorders
                  if (cleanStderr.includes("get_or_add_tblBorders") || scriptContent.includes('get_or_add_tblBorders')) {
                    scriptContent = scriptContent.replace(/[^\n]*\.get_or_add_tblBorders\(\)[^\n]*/g, 'pass');
                    scriptContent = removeIndentedBlock(scriptContent, /for\s+\w+\s+in\s+\[['"]top['"],/);
                    patched = true;
                  }

                  // 10. AttributeError on add_pPr
                  if (cleanStderr.includes("add_pPr") || scriptContent.includes('add_pPr')) {
                    scriptContent = scriptContent.replace(/\b(?:tag\s*=\s*)?[a-zA-Z0-9_.]+\.add_pPr\([^\)]*\)/g, 'pass');
                    patched = true;
                  }

                  // 11. AttributeError on tuple range in openpyxl
                  if (cleanStderr.includes("'tuple' object has no attribute") || (cleanStderr.includes("AttributeError") && scriptContent.includes("openpyxl"))) {
                    scriptContent = scriptContent.replace(/([a-zA-Z0-9_]+)\s*\[([^\]\r\n]*:[^\]\r\n]*)\]\.(font|fill|alignment|border|number_format)\s*=\s*([^;\r\n]+)/g, (match, wsVar, rangeExpr, prop, val) => {
                      return `for _r in ${wsVar}[${rangeExpr}]:\n    for _c in (_r if isinstance(_r, (tuple, list)) else [_r]):\n        setattr(_c, '${prop}', ${val})`;
                    });
                    patched = true;
                  }

                  if (patched) {
                    fs.writeFileSync(fullScriptPath, scriptContent, 'utf8');
                    return runProcess(cmdToRun, retryCount + 1);
                  }
                } catch (_) { }
              }
            }
          }

          if (createdRunnerFile && fs.existsSync(createdRunnerFile)) {
            try { fs.unlinkSync(createdRunnerFile); } catch { }
          }

          resolve({
            command: cmdToRun,
            stdout: cleanStdout,
            stderr: cleanStderr + (error && error.killed ? '\n[TIMEOUT] Eksekusi dihentikan karena melebihi batas waktu 15 detik.' : ''),
            exitCode,
            executionTimeMs,
            success: success && exitCode === 0
          });
        }
      );

      if (!activeProcesses.has(sessionId)) {
        activeProcesses.set(sessionId, new Set());
      }
      activeProcesses.get(sessionId).add(childProc);
    };

    runProcess(execCommand);
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
  const tagRegex = /<(thought|read_file|read|read_skill|search_skill|search_web|search|run_command|command|terminal|write_file|file|edit_file|patch_file|delete_file|remove_file|delete|test_file|validate_file|send_file|deliver_file|resend_file|list_files|dir|execute_code|run_code|check_file|verify_file|preview|screenshot|take_screenshot|grep_search|grep|revert_file|rollback_file)([^>]*)>([\s\S]*?)<\/\1>|<(read_file|read|read_skill|search_skill|search_web|search|delete_file|remove_file|delete|test_file|validate_file|send_file|deliver_file|resend_file|list_files|dir|check_file|verify_file|screenshot|take_screenshot|grep_search|grep|revert_file|rollback_file)\s*([^>]*?)\/?>/gi;

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
      } else if (tagName === 'read_skill') {
        const skillName = getAttr('name') || getAttr('skill') || body.split('\n')[0].trim();
        actions.push({ type: 'read_skill', name: skillName, rawMatch, index });
      } else if (tagName === 'search_skill') {
        const query = getAttr('query') || getAttr('q') || body;
        actions.push({ type: 'search_skill', query, rawMatch, index });
      } else if (tagName === 'read_file' || tagName === 'read') {
        const filePath = getAttr('path') || getAttr('file') || body.split('\n')[0].trim();
        actions.push({ type: 'read_file', path: filePath, rawMatch, index });
      } else if (tagName === 'list_files' || tagName === 'dir') {
        actions.push({ type: 'list_files', rawMatch, index });
      } else if (tagName === 'search_web' || tagName === 'search') {
        const query = getAttr('query') || getAttr('q') || body;
        actions.push({ type: 'search_web', query, rawMatch, index });
      } else if (tagName === 'run_command' || tagName === 'command' || tagName === 'terminal') {
        actions.push({ type: 'run_command', command: body, rawMatch, index });
      } else if (tagName === 'edit_file' || tagName === 'patch_file') {
        const filePath = getAttr('path') || getAttr('file');
        const startLine = getAttr('start_line') || getAttr('startline');
        const endLine = getAttr('end_line') || getAttr('endline');
        const targetMatch = body.match(/<target>([\s\S]*?)<\/target>/i);
        const replMatch = body.match(/<replacement>([\s\S]*?)<\/replacement>/i);
        if (targetMatch && replMatch) {
          actions.push({ type: 'patch_file', path: filePath, startLine: startLine ? parseInt(startLine, 10) : undefined, endLine: endLine ? parseInt(endLine, 10) : undefined, target: targetMatch[1], replacement: replMatch[1], rawMatch, index });
        } else if (startLine && endLine) {
          actions.push({ type: 'patch_file', path: filePath, startLine: parseInt(startLine, 10), endLine: parseInt(endLine, 10), content: body, rawMatch, index });
        } else {
          actions.push({ type: 'patch_file', path: filePath, content: body, rawMatch, index });
        }
      } else if (tagName === 'grep_search' || tagName === 'grep') {
        const query = getAttr('query') || getAttr('q') || body;
        const includes = getAttr('includes') || getAttr('include') || '';
        actions.push({ type: 'grep_search', query, includes, rawMatch, index });
      } else if (tagName === 'revert_file' || tagName === 'rollback_file') {
        const filePath = getAttr('path') || getAttr('file') || body.split('\n')[0].trim();
        actions.push({ type: 'revert_file', path: filePath, rawMatch, index });
      } else if (tagName === 'delete_file' || tagName === 'remove_file' || tagName === 'delete') {
        const filePath = getAttr('path') || getAttr('file') || body.split('\n')[0].trim();
        actions.push({ type: 'delete_file', path: filePath, rawMatch, index });
      } else if (tagName === 'test_file' || tagName === 'validate_file') {
        const filePath = getAttr('path') || getAttr('file') || body.split('\n')[0].trim();
        actions.push({ type: 'test_file', path: filePath, rawMatch, index });
      } else if (tagName === 'send_file' || tagName === 'deliver_file' || tagName === 'resend_file') {
        const filePath = getAttr('path') || getAttr('file') || body.split('\n')[0].trim();
        actions.push({ type: 'send_file', path: filePath, rawMatch, index });
      } else if (tagName === 'write_file' || tagName === 'file') {
        let filePath = getAttr('path') || getAttr('file') || getAttr('name');
        if (!filePath) {
          const attrFileMatch = attrStr.trim().match(/^["']?([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)["']?$/i);
          if (attrFileMatch) {
            filePath = attrFileMatch[1].trim();
          }
        }
        if (!filePath) {
          const firstLine = (body.split('\n')[0] || '').trim();
          const commentFileMatch = firstLine.match(/^(?:\/{2}|<!--|#|\/\*)\s*(?:file(?:name)?:\s*)?([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)\s*(?:-->|\*\/)?$/i);
          if (commentFileMatch) {
            filePath = commentFileMatch[1].trim();
          }
        }
        if (!filePath) {
          if (body.includes('import pptx') || body.includes('from pptx') || body.includes('Presentation()')) {
            filePath = 'generate_ppt.py';
          } else if (body.includes('import docx') || body.includes('from docx') || body.includes('Document()')) {
            filePath = 'generate_docx.py';
          } else if (body.includes('import openpyxl') || body.includes('from openpyxl') || body.includes('Workbook()')) {
            filePath = 'generate_excel.py';
          } else if (body.includes('<!DOCTYPE html') || body.includes('<html')) {
            filePath = 'index.html';
          } else {
            filePath = 'script.py';
          }
        }
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

      if (tagName === 'read_skill') {
        const skillName = getAttr('name') || getAttr('skill');
        actions.push({ type: 'read_skill', name: skillName, rawMatch, index });
      } else if (tagName === 'search_skill') {
        const query = getAttr('query') || getAttr('q');
        actions.push({ type: 'search_skill', query, rawMatch, index });
      } else if (tagName === 'read_file' || tagName === 'read') {
        const filePath = getAttr('path') || getAttr('file');
        actions.push({ type: 'read_file', path: filePath, rawMatch, index });
      } else if (tagName === 'list_files' || tagName === 'dir') {
        actions.push({ type: 'list_files', rawMatch, index });
      } else if (tagName === 'search_web' || tagName === 'search') {
        const query = getAttr('query') || getAttr('q');
        actions.push({ type: 'search_web', query, rawMatch, index });
      } else if (tagName === 'grep_search' || tagName === 'grep') {
        const query = getAttr('query') || getAttr('q');
        const includes = getAttr('includes') || getAttr('include') || '';
        actions.push({ type: 'grep_search', query, includes, rawMatch, index });
      } else if (tagName === 'revert_file' || tagName === 'rollback_file') {
        const filePath = getAttr('path') || getAttr('file');
        actions.push({ type: 'revert_file', path: filePath, rawMatch, index });
      } else if (tagName === 'delete_file' || tagName === 'remove_file' || tagName === 'delete') {
        const filePath = getAttr('path') || getAttr('file');
        actions.push({ type: 'delete_file', path: filePath, rawMatch, index });
      } else if (tagName === 'test_file' || tagName === 'validate_file') {
        const filePath = getAttr('path') || getAttr('file');
        actions.push({ type: 'test_file', path: filePath, rawMatch, index });
      } else if (tagName === 'send_file' || tagName === 'deliver_file' || tagName === 'resend_file') {
        const filePath = getAttr('path') || getAttr('file');
        actions.push({ type: 'send_file', path: filePath, rawMatch, index });
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

  // Fallback for unclosed write_file tag (e.g. if model output was truncated)
  const unclosedWrite = text.match(/<(?:write_file|file)([^>]*)>([\s\S]*)$/i);
  if (unclosedWrite && !unclosedWrite[0].includes('</write_file>') && !unclosedWrite[0].includes('</file>')) {
    const attrStr = unclosedWrite[1] || '';
    const body = (unclosedWrite[2] || '').trim();
    let filePath = '';
    const m = attrStr.match(/path=["']([^"']+)["']|path=([^\s>]+)|file=["']([^"']+)["']|name=["']([^"']+)["']/i);
    if (m) filePath = m[1] || m[2] || m[3] || m[4] || '';
    if (!filePath) {
      const attrFileMatch = attrStr.trim().match(/^["']?([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)["']?$/i);
      if (attrFileMatch) filePath = attrFileMatch[1].trim();
    }
    if (!filePath) {
      if (body.includes('import pptx') || body.includes('from pptx')) filePath = 'generate_ppt.py';
      else if (body.includes('import docx') || body.includes('from docx')) filePath = 'generate_docx.py';
      else if (body.includes('import openpyxl') || body.includes('from openpyxl')) filePath = 'generate_excel.py';
      else if (body.includes('<!DOCTYPE html') || body.includes('<html')) filePath = 'index.html';
    }
    if (filePath && !writtenPaths.has(filePath.toLowerCase()) && body.length > 20) {
      actions.push({
        type: 'write_file',
        path: filePath,
        content: body,
        rawMatch: unclosedWrite[0],
        index: unclosedWrite.index
      });
      writtenPaths.add(filePath.toLowerCase());
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
  editFile,
  patchFile,
  grepSearch,
  createCheckpoint,
  rollbackFile,
  trimObservation,
  killSessionProcesses,
  getSterileEnv,
  deleteFile,
  testFile,
  listFiles,
  executeInSandbox,
  extractSequentialActions,
  extractAgentActions,
  getRelevantDeliverables,
  DEFAULT_SKILL_MD
};
