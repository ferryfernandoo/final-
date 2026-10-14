# 📄 SKILL: EXECUTIVE DOCX DOCUMENT SPECIALIST (PYTHON-DOCX)
Category: Office Documents
Keywords: [docx, word, document, report, surat, proposal, whitepaper, laporan, makalah]

## 🎯 TUJUAN & STANDAR KUALITAS
Membuat dokumen Word (.docx) resmi standar konsultan manajemen (McKinsey, BCG, Big 4) menggunakan `python-docx`. Dokumen harus memiliki struktur hierarki yang jelas, palet warna elegan, callout box beraksen, tabel zebra-striped dengan shading XML, dan metrik KPI.

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
3. **CALLOUT BOX BORDER ORANYE**: Gunakan tabel 1x1, border kiri sz="36" color="EA580C", dan latar `#F8FAFC`:
   ```python
   callout = doc.add_table(rows=1, cols=1)
   c_cell = callout.rows[0].cells[0]
   c_cell._tc.get_or_add_tcPr().append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="F8FAFC"/>'))
   c_cell._tc.get_or_add_tcPr().append(parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="36" w:space="0" w:color="EA580C"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>'))
   ```

---

## 📋 TEMPLATE GENERATOR PYTHON BATTLE-TESTED

```python
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def create_executive_docx(filename="laporan_eksekutif.docx"):
    doc = docx.Document()

    # 1. Page Margins (1 inch all sides)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # 2. Header & Subtitle
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run_title = title_p.add_run("LAPORAN STRATEGIS & KINERJA BISNIS 2026")
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(15, 23, 42)

    sub_p = doc.add_paragraph()
    run_sub = sub_p.add_run("Dokumen Analisis Resmi | Deepernova Enterprise Advisory")
    run_sub.font.name = "Calibri"
    run_sub.font.size = Pt(11)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(100, 116, 139)

    doc.add_paragraph() # Spacer

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
    c_run_head = cp.add_run("RINGKASAN EKSEKUTIF:\n")
    c_run_head.bold = True
    c_run_head.font.color.rgb = RGBColor(234, 88, 12)
    c_run_head.font.size = Pt(10.5)

    c_run_body = cp.add_run(
        "Transformasi digital terbukti menghasilkan efisiensi biaya sebesar 24.8% "
        "dan percepatan throughput operasional secara terukur. Seluruh inisiatif "
        "strategis berjalan sesuai target kuartalan."
    )
    c_run_body.font.color.rgb = RGBColor(51, 65, 85)
    c_run_body.font.size = Pt(10)

    doc.add_paragraph() # Spacer

    # 4. Heading 1
    h1 = doc.add_heading("1. Metrik & Performa Finansial", level=1)
    h1.runs[0].font.color.rgb = RGBColor(15, 23, 42)
    h1.runs[0].font.size = Pt(15)

    # 5. Table with Zebra Striping
    headers = ["Indikator Kunci", "Target 2026", "Realisasi", "Pertumbuhan", "Status"]
    data = [
        ["Pendapatan Bersih", "Rp 1.200 M", "Rp 1.428 M", "+19.0%", "Optimal"],
        ["EBITDA Margin", "22.5%", "26.4%", "+3.9%", "Tercapai"],
        ["Customer Retention", "90.0%", "94.8%", "+4.8%", "Stabil"],
        ["Biaya Operasional", "Rp 450 M", "Rp 390 M", "-13.3%", "Efisien"]
    ]

    tbl = doc.add_table(rows=1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER

    # Format Header
    hdr_cells = tbl.rows[0].cells
    for i, h_text in enumerate(headers):
        hdr_cells[i].text = h_text
        hdr_cells[i].paragraphs[0].runs[0].font.bold = True
        hdr_cells[i].paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        hdr_cells[i].paragraphs[0].runs[0].font.size = Pt(9.5)
        hdr_cells[i]._tc.get_or_add_tcPr().append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="0F172A"/>'))

    # Format Data Rows
    for r_idx, row in enumerate(data):
        row_cells = tbl.add_row().cells
        bg_color = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row):
            row_cells[c_idx].text = str(val)
            row_cells[c_idx].paragraphs[0].runs[0].font.size = Pt(9.5)
            row_cells[c_idx].paragraphs[0].runs[0].font.color.rgb = RGBColor(30, 41, 59)
            row_cells[c_idx]._tc.get_or_add_tcPr().append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="{bg_color}"/>'))

    # Simpan berkas
    doc.save(filename)
    print(f"✓ Berhasil membuat berkas {filename}")

if __name__ == "__main__":
    create_executive_docx()
```
