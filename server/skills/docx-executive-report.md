# 📄 SKILL: EXECUTIVE DOCX DOCUMENT SPECIALIST (PYTHON-DOCX)
Category: Office Documents
Keywords: [docx, word, document, report, surat, proposal, whitepaper, laporan, makalah, mckinsey]

## 🎯 TUJUAN & STANDAR KUALITAS
Membuat dokumen Word (.docx) resmi standar konsultan manajemen (McKinsey, BCG, Big 4) menggunakan `python-docx`. Dokumen harus memiliki:
1. Struktur hierarki yang jelas dengan nomor bab dan subbab.
2. Palet warna korporat elegan (Slate 900 `#0F172A`, Orange Accent `#EA580C`, Muted Slate `#64748B`, Border `#E2E8F0`).
3. Executive Callout Box beraksen garis kiri tebal oranye.
4. Tabel zebra-striped dengan header gelap `#0F172A`, teks putih tebal, dan baris selang-seling `#F8FAFC` & `#FFFFFF`.
5. Visualisasi analitis (Matplotlib chart PNG terintegrasi rapi).
6. Rekomendasi strategis dengan bullet points tebal dan actionable steps.

---

## ⚠️ ATURAN ANTI-CRASH & ANTI-ERROR MUTLAK
1. **DILARANG KERAS** menggunakan `table.rows.index(row)` atau `row.table.rows.index()`! Objek `_Rows` di `python-docx` bukan list dan akan melempar `TypeError` fatal!
2. **GUNAKAN SELALU** `enumerate(data_rows)` saat mengisi tabel:
   ```python
   for r_idx, row_data in enumerate(data_rows):
       row_cells = tbl.add_row().cells
       for c_idx, val in enumerate(row_data):
           row_cells[c_idx].text = str(val)
   ```
3. **CALLOUT BOX BORDER ORANYE**: Gunakan tabel 1x1, border kiri `sz="36"` color `EA580C`, dan latar `#F8FAFC`:
   ```python
   callout = doc.add_table(rows=1, cols=1)
   c_cell = callout.rows[0].cells[0]
   c_cell.width = Inches(6.5)
   c_cell._tc.get_or_add_tcPr().append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="F8FAFC"/>'))
   c_cell._tc.get_or_add_tcPr().append(parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="36" w:space="0" w:color="EA580C"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>'))
   ```
4. **INSTALL PUSTAKA OTOMATIS JIKA KURANG**:
   Jika belum terpasang, jalankan terminal:
   `pip install python-docx matplotlib`

---

## 📋 TEMPLATE GENERATOR PYTHON EKSEKUTIF LENGKAP & MANDIRI

```python
import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import matplotlib.pyplot as plt

def generate_chart(chart_path="trend_chart.png"):
    """Menghasilkan grafik visual analitis untuk di-embed ke dalam dokumen Word."""
    quarters = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026 (Target)']
    revenue = [18.2, 22.4, 27.8, 34.5, 42.0]
    ebitda = [3.8, 5.2, 6.9, 8.8, 11.2]

    fig, ax = plt.subplots(figsize=(6.5, 3.2), dpi=200)
    fig.patch.set_facecolor('#FFFFFF')
    ax.set_facecolor('#F8FAFC')

    ax.plot(quarters, revenue, marker='o', linewidth=2.5, color='#EA580C', label='Pendapatan (Miliar Rp)')
    ax.plot(quarters, ebitda, marker='s', linewidth=2.0, color='#0F172A', label='EBITDA (Miliar Rp)')

    ax.set_title('Pertumbuhan Kinerja Finansial (QoQ)', fontsize=12, fontweight='bold', color='#0F172A', pad=12)
    ax.set_ylabel('Nominal (Miliar Rp)', fontsize=9, color='#64748B')
    ax.grid(True, linestyle='--', alpha=0.5, color='#E2E8F0')
    ax.legend(frameon=True, facecolor='#FFFFFF', edgecolor='#CBD5E1', fontsize=9)
    ax.tick_params(colors='#334155', labelsize=8.5)

    for spine in ax.spines.values():
        spine.set_color('#CBD5E1')

    plt.tight_layout()
    plt.savefig(chart_path, dpi=200)
    plt.close()
    return chart_path

def create_executive_docx(filename="Laporan_Strategis_Eksekutif.docx"):
    doc = docx.Document()

    # 1. Page Margins (1 inch all sides)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # 2. Header & Subtitle
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(4)
    run_title = title_p.add_run("LAPORAN STRATEGIS & KINERJA BISNIS 2026")
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(15, 23, 42)

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_after = Pt(14)
    run_sub = sub_p.add_run("Dokumen Analisis Resmi | Disiapkan untuk Dewan Direksi & Stakeholder Kunci")
    run_sub.font.name = "Calibri"
    run_sub.font.size = Pt(10.5)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(100, 116, 139)

    # 3. Callout Box (Executive Summary)
    callout = doc.add_table(rows=1, cols=1)
    callout.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_cell = callout.rows[0].cells[0]
    c_cell.width = Inches(6.5)

    c_cell._tc.get_or_add_tcPr().append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="F8FAFC"/>'))
    c_cell._tc.get_or_add_tcPr().append(parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:left w:val="single" w:sz="36" w:space="0" w:color="EA580C"/>'
        f'<w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/>'
        f'</w:tcBorders>'
    ))

    cp = c_cell.paragraphs[0]
    cp.paragraph_format.space_before = Pt(6)
    cp.paragraph_format.space_after = Pt(6)

    c_run_head = cp.add_run("RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY):\n")
    c_run_head.bold = True
    c_run_head.font.color.rgb = RGBColor(234, 88, 12)
    c_run_head.font.size = Pt(11)

    c_run_body = cp.add_run(
        "Transformasi digital terbukti menghasilkan efisiensi biaya operasional sebesar 24.8% "
        "dan percepatan throughput operasional secara terukur. Target ekspansi pasar dan pendapatan "
        "tahunan berada pada lintasan yang melampaui ekspektasi kuartalan sebesar +19.2% YoY."
    )
    c_run_body.font.color.rgb = RGBColor(51, 65, 85)
    c_run_body.font.size = Pt(10)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 4. Heading 1: Metrik & Performa Finansial
    h1 = doc.add_heading("1. Metrik & Performa Finansial Utama", level=1)
    h1.paragraph_format.space_before = Pt(14)
    h1.paragraph_format.space_after = Pt(6)
    h1.runs[0].font.color.rgb = RGBColor(15, 23, 42)
    h1.runs[0].font.size = Pt(15)

    desc1 = doc.add_paragraph(
        "Tabel berikut menyajikan ringkasan indikator kinerja utama (KPI) yang dievaluasi sepanjang tahun berjalan:"
    )
    desc1.paragraph_format.space_after = Pt(8)
    desc1.runs[0].font.color.rgb = RGBColor(71, 85, 105)
    desc1.runs[0].font.size = Pt(10)

    # 5. Table with Zebra Striping
    headers = ["Indikator Kunci", "Target 2026", "Realisasi", "Pertumbuhan", "Status Evaluasi"]
    data = [
        ["Pendapatan Bersih", "Rp 1.200 M", "Rp 1.428 M", "+19.0%", "Optimal / Di Atas Target"],
        ["EBITDA Margin", "22.5%", "26.4%", "+3.9%", "Tercapai Sempurna"],
        ["Customer Retention", "90.0%", "94.8%", "+4.8%", "Stabil & Loyal"],
        ["Biaya Operasional", "Rp 450 M", "Rp 390 M", "-13.3%", "Efisien & Terkendali"]
    ]

    tbl = doc.add_table(rows=1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER

    # Format Header Table
    hdr_cells = tbl.rows[0].cells
    for i, h_text in enumerate(headers):
        hdr_cells[i].text = h_text
        p = hdr_cells[i].paragraphs[0]
        p.runs[0].font.bold = True
        p.runs[0].font.color.rgb = RGBColor(255, 255, 255)
        p.runs[0].font.size = Pt(9.5)
        hdr_cells[i]._tc.get_or_add_tcPr().append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="0F172A"/>'))

    # Format Data Rows
    for r_idx, row in enumerate(data):
        row_cells = tbl.add_row().cells
        bg_color = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row):
            row_cells[c_idx].text = str(val)
            p = row_cells[c_idx].paragraphs[0]
            p.runs[0].font.size = Pt(9.5)
            p.runs[0].font.color.rgb = RGBColor(30, 41, 59)
            row_cells[c_idx]._tc.get_or_add_tcPr().append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="{bg_color}"/>'))

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # 6. Heading 2 & Visual Chart
    h2 = doc.add_heading("2. Analisis Tren Visual Pertumbuhan", level=1)
    h2.paragraph_format.space_before = Pt(14)
    h2.paragraph_format.space_after = Pt(6)
    h2.runs[0].font.color.rgb = RGBColor(15, 23, 42)
    h2.runs[0].font.size = Pt(15)

    chart_file = generate_chart("trend_chart.png")
    if os.path.exists(chart_file):
        chart_p = doc.add_paragraph()
        chart_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        chart_p.paragraph_format.space_before = Pt(4)
        chart_p.paragraph_format.space_after = Pt(8)
        run_img = chart_p.add_run()
        run_img.add_picture(chart_file, width=Inches(6.0))

        caption_p = doc.add_paragraph()
        caption_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        caption_p.paragraph_format.space_after = Pt(14)
        run_cap = caption_p.add_run("Gambar 1.1: Grafik Tren Pertumbuhan Pendapatan dan EBITDA Kuartalan 2025–2026")
        run_cap.font.size = Pt(9)
        run_cap.font.italic = True
        run_cap.font.color.rgb = RGBColor(100, 116, 139)

    # 7. Heading 3: Rekomendasi Strategis (Actionable Points)
    h3 = doc.add_heading("3. Rekomendasi & Langkah Aksi Strategis", level=1)
    h3.paragraph_format.space_before = Pt(14)
    h3.paragraph_format.space_after = Pt(6)
    h3.runs[0].font.color.rgb = RGBColor(15, 23, 42)
    h3.runs[0].font.size = Pt(15)

    bullets = [
        ("Skalasi Solusi AI & Automasi:", "Alokasikan 20% tambahan anggaran R&D untuk memperluas adopsi kecerdasan buatan otonom di seluruh unit kerja."),
        ("Penguatan Kerjasama Strategis:", "Bangun kemitraan strategis dengan ekosistem enterprise tier-1 guna mengamankan pangsa pasar regional."),
        ("Manajemen Risiko & Keamanan Siber:", "Terapkan tata kelola data berbasis Zero Trust dan audit berkala guna menjamin keandalan sistem."),
        ("Pengembangan Kapabilitas SDM:", "Lakukan pelatihan intensif bagi talenta internal untuk mengoptimalkan pemanfaatan teknologi baru.")
    ]

    for b_title, b_desc in bullets:
        bp = doc.add_paragraph(style='List Bullet')
        bp.paragraph_format.space_before = Pt(2)
        bp.paragraph_format.space_after = Pt(4)
        r_btitle = bp.add_run(f"{b_title} ")
        r_btitle.bold = True
        r_btitle.font.color.rgb = RGBColor(15, 23, 42)
        r_btitle.font.size = Pt(10)

        r_bdesc = bp.add_run(b_desc)
        r_bdesc.font.color.rgb = RGBColor(51, 65, 85)
        r_bdesc.font.size = Pt(10)

    # Simpan berkas
    doc.save(filename)
    print(f"✓ Berhasil membuat berkas {filename}")

if __name__ == "__main__":
    create_executive_docx()
```
