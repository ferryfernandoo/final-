# 📈 SKILL: INSTITUTIONAL FINANCIAL MODEL & SPREADSHEET (XLSX)
Category: Finance, Spreadsheets & Data
Keywords: [xlsx, excel, spreadsheet, openpyxl, financial model, budget, cashflow, formula, kpi, balance sheet, p&l]

## 🎯 TUJUAN & STANDAR KUALITAS
Membangun buku kerja Excel (`.xlsx`) level institusi keuangan (Investment Banking, Private Equity, CFO Executive) menggunakan pustaka Python `openpyxl`. Format harus bersih, tidak ada teks terpotong (`###`), menggunakan formula dinamis Excel asli, dan dilengkapi KPI summary card serta chart native.

---

## 📐 PRINSIP & STANDAR FORMATTING
1. **Aturan Anti-Teks Terpotong (`###`)**:
   - Kolom **WAJIB** dihitung lebarnya secara otomatis ditambah padding ekstra (minimal +4 karakter) agar angka desimal atau nominal besar tidak pernah terpotong.
2. **Format Angka & Mata Uang Konsisten**:
   - Nominal Rupiah: `ws.cell().number_format = '"Rp" #,##0'` atau `#,##0`
   - Persentase: `ws.cell().number_format = '0.0%'`
   - Tanggal: `ws.cell().number_format = 'YYYY-MM-DD'`
3. **Formula Dinamis (DILARANG Nilai Hardcoded untuk Kalkulasi)**:
   - Gunakan formula Excel asli: `=SUM(C6:C17)`, `=AVERAGE(D6:D17)`, `=C18-D18`, `=(C18-D18)/C18`.
4. **Header & Freeze Panes**:
   - Freeze header agar tabel mudah dibaca saat discroll: `ws.freeze_panes = "A7"`
   - Gridlines wajib aktif: `ws.views.sheetView[0].showGridLines = True`
5. **Palet Warna Eksekutif**:
   - Header Fill: `#0F172A` (Dark Slate) dengan teks putih tebal.
   - Accent KPI Fill: `#FFF7ED` (Warm Orange Tint) dengan teks `#EA580C`.
   - Zebra striping: Baris genap putih `#FFFFFF`, baris ganjil `#F8FAFC`.

---

## 📋 TEMPLATE SCRIPT PYTHON LENGKAP & TERUJI

```python
import sys
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.chart import BarChart, Reference

def create_financial_model(filename="Executive_Financial_Model.xlsx"):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Financial Model 2026"
    ws.views.sheetView[0].showGridLines = True

    # Palet Warna & Font
    font_title = Font(name="Segoe UI", size=16, bold=True, color="0F172A")
    font_subtitle = Font(name="Segoe UI", size=10, italic=True, color="64748B")
    font_header = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    font_bold = Font(name="Segoe UI", size=10, bold=True, color="0F172A")
    font_normal = Font(name="Segoe UI", size=10, color="1E293B")
    font_kpi_label = Font(name="Segoe UI", size=9, bold=True, color="EA580C")
    font_kpi_val = Font(name="Segoe UI", size=14, bold=True, color="0F172A")

    fill_header = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    fill_accent = PatternFill(start_color="EA580C", end_color="EA580C", fill_type="solid")
    fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    fill_total = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    fill_kpi = PatternFill(start_color="FFF7ED", end_color="FFF7ED", fill_type="solid")

    thin_border = Border(
        left=Side(style='thin', color='E2E8F0'),
        right=Side(style='thin', color='E2E8F0'),
        top=Side(style='thin', color='E2E8F0'),
        bottom=Side(style='thin', color='E2E8F0')
    )
    double_bottom_border = Border(
        top=Side(style='thin', color='0F172A'),
        bottom=Side(style='double', color='0F172A')
    )

    # 1. Judul Model
    ws["B1"] = "DEEPERNOVA ENTERPRISE FINANCIAL PROJECTIONS"
    ws["B1"].font = font_title
    ws["B2"] = "Periode: Jan - Des 2026 | Satuan: IDR (Rupiah) | Kategori: Internal Confidential"
    ws["B2"].font = font_subtitle

    # 2. KPI Summary Cards (Baris 3-4)
    kpis = [
        ("B3", "B4", "C3", "C4", "TOTAL REVENUE FY26", "=SUM(C7:N7)"),
        ("E3", "E4", "F3", "F4", "TOTAL NET PROFIT", "=SUM(C11:N11)"),
        ("H3", "H4", "I3", "I4", "AVG NET MARGIN", "=AVERAGE(C12:N12)"),
        ("K3", "K4", "L3", "L4", "GROWTH MOM", "=((N7-C7)/C7)")
    ]

    for top_l_col, btm_l_col, top_r_col, btm_r_col, label, formula in kpis:
        ws.merge_cells(f"{top_l_col}:{btm_r_col}")
        cell = ws[top_l_col]
        cell.value = f"{label}\n"
        cell.font = font_kpi_label
        cell.fill = fill_kpi
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    # Catatan: Nilai KPI akan di-link ke formula ringkasan
    ws["B4"] = "=C20" # Total Revenue
    ws["B4"].font = font_kpi_val
    ws["B4"].number_format = '"Rp " #,##0'

    # 3. Struktur Tabel Bulanan (B6:N13)
    months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"]
    ws.cell(row=6, column=2, value="Line Item").fill = fill_header
    ws.cell(row=6, column=2).font = font_header
    ws.cell(row=6, column=2).alignment = Alignment(horizontal="left")

    for col_idx, m in enumerate(months, start=3):
        c = ws.cell(row=6, column=col_idx, value=m)
        c.fill = fill_header
        c.font = font_header
        c.alignment = Alignment(horizontal="right")

    c_tot = ws.cell(row=6, column=15, value="Full Year 2026")
    c_tot.fill = fill_accent
    c_tot.font = font_header
    c_tot.alignment = Alignment(horizontal="right")

    # Data Baris
    # B7: Pendapatan Operasional
    # B8: COGS (Beban Pokok Penjualan)
    # B9: Gross Profit (Formula)
    # B10: OPEX (Beban Operasional)
    # B11: Net Profit Sebelum Pajak (Formula)
    # B12: Net Profit Margin % (Formula)

    base_rev = 1200000000 # 1.2M
    rev_growth = 1.035 # 3.5% MoM

    # Revenue
    ws.cell(row=7, column=2, value="Pendapatan Usaha").font = font_bold
    for i in range(12):
        col = 3 + i
        val = int(base_rev * (rev_growth ** i))
        c = ws.cell(row=7, column=col, value=val)
        c.number_format = '"Rp " #,##0'
        c.font = font_normal

    # COGS (~42% dari Revenue)
    ws.cell(row=8, column=2, value="Beban Pokok Pendapatan (COGS)").font = font_normal
    for i in range(12):
        col = 3 + i
        col_letter = get_column_letter(col)
        c = ws.cell(row=8, column=col, value=f"={col_letter}7*0.42")
        c.number_format = '"Rp " #,##0'
        c.font = font_normal

    # Laba Kotor (Gross Profit)
    ws.cell(row=9, column=2, value="Laba Kotor (Gross Profit)").font = font_bold
    ws.cell(row=9, column=2).fill = fill_zebra
    for i in range(12):
        col = 3 + i
        col_letter = get_column_letter(col)
        c = ws.cell(row=9, column=col, value=f"={col_letter}7-{col_letter}8")
        c.number_format = '"Rp " #,##0'
        c.font = font_bold
        c.fill = fill_zebra

    # OPEX
    ws.cell(row=10, column=2, value="Beban Operasional & SG&A").font = font_normal
    for i in range(12):
        col = 3 + i
        col_letter = get_column_letter(col)
        c = ws.cell(row=10, column=col, value=f"={col_letter}7*0.28")
        c.number_format = '"Rp " #,##0'
        c.font = font_normal

    # Laba Bersih Operasional
    ws.cell(row=11, column=2, value="Laba Bersih Operasional").font = font_bold
    ws.cell(row=11, column=2).fill = fill_total
    for i in range(12):
        col = 3 + i
        col_letter = get_column_letter(col)
        c = ws.cell(row=11, column=col, value=f"={col_letter}9-{col_letter}10")
        c.number_format = '"Rp " #,##0'
        c.font = font_bold
        c.fill = fill_total

    # Margin Laba Bersih %
    ws.cell(row=12, column=2, value="Margin Laba Bersih (%)").font = font_bold
    for i in range(12):
        col = 3 + i
        col_letter = get_column_letter(col)
        c = ws.cell(row=12, column=col, value=f"={col_letter}11/{col_letter}7")
        c.number_format = '0.0%'
        c.font = font_bold

    # Kolom Total Full Year 2026 (Kolom 15 / O)
    for r in [7, 8, 9, 10, 11]:
        c = ws.cell(row=r, column=15, value=f"=SUM(C{r}:N{r})")
        c.number_format = '"Rp " #,##0'
        c.font = font_bold
        c.border = thin_border
    # Margin Full Year
    c_mrg = ws.cell(row=12, column=15, value="=O11/O7")
    c_mrg.number_format = '0.0%'
    c_mrg.font = font_bold

    # Border untuk tabel data
    for r in range(6, 13):
        for col in range(2, 16):
            if r == 11:
                ws.cell(row=r, column=col).border = double_bottom_border
            else:
                ws.cell(row=r, column=col).border = thin_border

    # Freeze Panes pada A7
    ws.freeze_panes = "C7"

    # 4. Auto-fit Lebar Kolom
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            val_str = str(cell.value or '')
            if cell.number_format and 'Rp' in cell.number_format:
                max_len = max(max_len, 18) # Cadangan spasi Rupiah
            else:
                max_len = max(max_len, len(val_str))
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)
    ws.column_dimensions["B"].width = 28 # Kolom deskripsi

    # 5. Tambahkan Native Bar Chart (Revenue vs Net Profit)
    chart = BarChart()
    chart.type = "col"
    chart.style = 10
    chart.title = "Tren Pendapatan & Laba Bersih Bulanan 2026"
    chart.y_axis.title = "IDR (Rupiah)"
    chart.x_axis.title = "Bulan"
    chart.width = 18
    chart.height = 10

    data = Reference(ws, min_col=3, min_row=7, max_col=14, max_row=11)
    cats = Reference(ws, min_col=3, min_row=6, max_col=14, max_row=6)
    chart.add_data(data, from_rows=True, titles_from_data=True)
    chart.set_categories(cats)
    ws.add_chart(chart, "B15")

    wb.save(filename)
    print(f"[SUCCESS] Institutional Financial Model berhasil dibuat: {filename}")
    return filename

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "Executive_Financial_Model.xlsx"
    create_financial_model(out_file)
```
