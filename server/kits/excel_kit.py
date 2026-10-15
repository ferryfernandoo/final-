#!/usr/bin/env python3
"""
excel_kit.py — Mesin Pembuat Excel (.xlsx / .xlsm) Pro + Macro/VBA Engine + Grafik Kurva Gila + Smart Image Placement

Cara pakai (CLI):
  python3 excel_kit.py spec.json output.xlsx
"""

import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import openpyxl
from openpyxl.chart import AreaChart, BarChart, DoughnutChart, LineChart, PieChart, Reference
from openpyxl.drawing.image import Image as XLImage
from openpyxl.formatting.rule import ColorScaleRule, DataBarRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.utils.cell import range_boundaries
from openpyxl.worksheet.datavalidation import DataValidation

sys.path.insert(0, str(Path(__file__).resolve().parent))
import viz_kit

THEMES = {
    "navy":   {"primary": "1F3A5F", "accent": "2E75B6", "zebra": "F2F6FA", "kpi_bg": "EEF4FB", "border": "D0D7DE", "databar": "2E75B6"},
    "green":  {"primary": "1B5E4A", "accent": "2A9D8F", "zebra": "F2F9F6", "kpi_bg": "EDF7F3", "border": "CBD5E1", "databar": "2A9D8F"},
    "maroon": {"primary": "7A1F2B", "accent": "B5485D", "zebra": "FAF3F4", "kpi_bg": "FBEFF1", "border": "D8CFD2", "databar": "B5485D"},
    "tech":   {"primary": "1E1B4B", "accent": "4361EE", "zebra": "F4F5FB", "kpi_bg": "EEF0FD", "border": "CBD5E1", "databar": "4361EE"},
    "warm":   {"primary": "7A3E1D", "accent": "D97B29", "zebra": "FBF6F1", "kpi_bg": "FDF3EA", "border": "DECFC2", "databar": "D97B29"},
    "mono":   {"primary": "1F2937", "accent": "4B5563", "zebra": "F3F4F6", "kpi_bg": "F9FAFB", "border": "D1D5DB", "databar": "4B5563"},
}

VBA_LIBRARY = {
    "AutoFormatReport": '''Attribute VB_Name = "ModAutoFormat"
Option Explicit

' ============================================================================
' MACRO 1: AutoFormat & Rapikan Seluruh Sheet Aktif
' Pintasan: Alt + F8 -> AutoFormatActiveSheet
' ============================================================================
Public Sub AutoFormatActiveSheet()
    Dim ws As Worksheet
    Dim col As Range
    Set ws = ActiveSheet
    Application.ScreenUpdating = False
    ws.Cells.Font.Name = "Calibri"
    ws.Cells.Font.Size = 10
    ws.Columns.AutoFit
    For Each col In ws.UsedRange.Columns
        If col.ColumnWidth < 12 Then col.ColumnWidth = 12
        If col.ColumnWidth > 42 Then col.ColumnWidth = 42
    Next col
    ActiveWindow.DisplayGridlines = True
    Application.ScreenUpdating = True
    MsgBox "Sheet '" & ws.Name & "' berhasil dirapikan!", vbInformation, "Excel Kit Pro Macro"
End Sub
''',
    "ExportDashboardPDF": '''
' ============================================================================
' MACRO 2: Ekspor Laporan Satu Klik ke PDF (Landscape Fit-to-1-Page)
' Pintasan: Alt + F8 -> ExportSheetToPDF
' ============================================================================
Public Sub ExportSheetToPDF()
    Dim ws As Worksheet
    Dim pdfPath As String
    Set ws = ActiveSheet
    With ws.PageSetup
        .Orientation = xlLandscape
        .Zoom = False
        .FitToPagesWide = 1
        .FitToPagesTall = False
        .CenterHorizontally = True
    End With
    pdfPath = ThisWorkbook.Path & Application.PathSeparator & ws.Name & "_Report.pdf"
    ws.ExportAsFixedFormat Type:=xlTypePDF, Filename:=pdfPath, Quality:=xlQualityStandard, OpenAfterPublish:=False
    MsgBox "PDF berhasil disimpan di:" & vbCrLf & pdfPath, vbInformation, "Export PDF Sukses"
End Sub
''',
    "HighlightAnomalies": '''
' ============================================================================
' MACRO 3: Deteksi & Tandai Outlier (> Mean + 2*SD) Otomatis pada Range Terpilih
' Pintasan: Pilih kolom angka -> Alt + F8 -> HighlightOutliersTwoSigma
' ============================================================================
Public Sub HighlightOutliersTwoSigma()
    Dim rng As Range, cell As Range
    Dim avgVal As Double, stdVal As Double, upperLim As Double, lowerLim As Double
    Dim countOut As Long
    If TypeName(Selection) <> "Range" Then Exit Sub
    Set rng = Selection
    On Error Resume Next
    avgVal = Application.WorksheetFunction.Average(rng)
    stdVal = Application.WorksheetFunction.StDev_S(rng)
    On Error GoTo 0
    If stdVal = 0 Then Exit Sub
    upperLim = avgVal + 2 * stdVal
    lowerLim = avgVal - 2 * stdVal
    countOut = 0
    For Each cell In rng.Cells
        If IsNumeric(cell.Value) And Not IsEmpty(cell.Value) Then
            If cell.Value > upperLim Or cell.Value < lowerLim Then
                cell.Interior.Color = RGB(254, 226, 226)
                cell.Font.Color = RGB(153, 27, 27)
                cell.Font.Bold = True
                countOut = countOut + 1
            End If
        End If
    Next cell
    MsgBox "Ditemukan " & countOut & " nilai anomali di luar batas ±2 Sigma.", vbInformation, "Audit Six Sigma"
End Sub
''',
    "CustomUDFs": '''
' ============================================================================
' MACRO 4: Custom UDF (User Defined Functions) untuk Rumus Sel
' ============================================================================
Public Function HITUNG_CPK(ByVal USL As Double, ByVal LSL As Double, ByVal MeanVal As Double, ByVal StdDevVal As Double) As Variant
    If StdDevVal <= 0 Then
        HITUNG_CPK = CVErr(xlErrDiv0)
        Exit Function
    End If
    Dim cpu As Double, cpl As Double
    cpu = (USL - MeanVal) / (3# * StdDevVal)
    cpl = (MeanVal - LSL) / (3# * StdDevVal)
    If cpu < cpl Then HITUNG_CPK = Round(cpu, 3) Else HITUNG_CPK = Round(cpl, 3)
End Function

Public Function STATUS_CAPAIAN(ByVal Aktual As Double, ByVal Target As Double) As String
    If Target = 0 Then
        STATUS_CAPAIAN = "-"
    ElseIf Aktual >= Target * 1.05 Then
        STATUS_CAPAIAN = "MELAMPAUI TARGET"
    ElseIf Aktual >= Target Then
        STATUS_CAPAIAN = "TERCAPAI"
    ElseIf Aktual >= Target * 0.9 Then
        STATUS_CAPAIAN = "PERLU PERHATIAN"
    Else
        STATUS_CAPAIAN = "KRITIS"
    End If
End Function
'''
}


def _style_merged(ws, cell_range: str, font=None, fill=None, alignment=None, border=None):
    min_col, min_row, max_col, max_row = range_boundaries(cell_range)
    for row in ws.iter_rows(min_row=min_row, max_row=max_row, min_col=min_col, max_col=max_col):
        for cell in row:
            if font:
                cell.font = font
            if fill:
                cell.fill = fill
            if alignment:
                cell.alignment = alignment
            if border:
                cell.border = border


def _build_vba_module_text(macros_spec) -> str:
    if not macros_spec:
        return "\n".join(VBA_LIBRARY.values())
    chunks = []
    if isinstance(macros_spec, list):
        for item in macros_spec:
            if isinstance(item, str) and item in VBA_LIBRARY:
                chunks.append(VBA_LIBRARY[item])
            elif isinstance(item, dict):
                code = item.get("code") or VBA_LIBRARY.get(item.get("preset", ""), "")
                if code:
                    chunks.append(code)
    elif isinstance(macros_spec, dict):
        for k in macros_spec.get("presets", ["AutoFormatReport", "ExportDashboardPDF", "HighlightAnomalies", "CustomUDFs"]):
            if k in VBA_LIBRARY:
                chunks.append(VBA_LIBRARY[k])
        if macros_spec.get("custom_vba"):
            chunks.append(str(macros_spec["custom_vba"]))
    return "\n\n".join(chunks) if chunks else "\n".join(VBA_LIBRARY.values())


def build(spec: dict, out_path: str, recalc: bool = True) -> dict:
    if not isinstance(spec, dict) or not isinstance(spec.get("sheets"), list):
        raise ValueError('[excel-kit] spec harus memiliki array "sheets".')

    theme_name = spec.get("theme", "navy")
    theme = THEMES.get(theme_name, THEMES["navy"])
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    thin_side = Side(style="thin", color=theme["border"])
    thin_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
    double_bottom = Border(
        top=Side(style="thin", color=theme["primary"]),
        bottom=Side(style="double", color=theme["primary"]),
        left=thin_side,
        right=thin_side,
    )
    card_border = Border(
        top=Side(style="medium", color=theme["accent"]),
        bottom=thin_side,
        left=thin_side,
        right=thin_side,
    )

    tmp_dir = tempfile.mkdtemp(prefix="excel_kit_")

    for s_idx, s_spec in enumerate(spec["sheets"]):
        title = str(s_spec.get("name", f"Sheet_{s_idx+1}")).strip()[:31]
        ws = wb.create_sheet(title=title)
        ws.views.sheetView[0].showGridLines = True
        ws.page_setup.orientation = s_spec.get("orientation", "landscape")
        ws.sheet_properties.pageSetUpPr.fitToPage = True

        master_cols = int(s_spec.get("master_cols", 8))
        for tbl in s_spec.get("tables", []):
            headers = tbl.get("headers", [])
            master_cols = max(master_cols, len(headers))
        last_col_letter = get_column_letter(master_cols)

        cur_row = 1

        # 1. Sheet Title & Subtitle Banner
        if s_spec.get("title"):
            rng_t = f"A{cur_row}:{last_col_letter}{cur_row}"
            ws.merge_cells(rng_t)
            ws[f"A{cur_row}"].value = str(s_spec["title"]).strip()
            _style_merged(
                ws,
                rng_t,
                font=Font(name="Calibri", size=15, bold=True, color="FFFFFF"),
                fill=PatternFill(start_color=theme["primary"], end_color=theme["primary"], fill_type="solid"),
                alignment=Alignment(horizontal="left", vertical="center", indent=1),
            )
            ws.row_dimensions[cur_row].height = 30
            cur_row += 1

        if s_spec.get("subtitle"):
            rng_s = f"A{cur_row}:{last_col_letter}{cur_row}"
            ws.merge_cells(rng_s)
            ws[f"A{cur_row}"].value = str(s_spec["subtitle"]).strip()
            _style_merged(
                ws,
                rng_s,
                font=Font(name="Calibri", size=10, italic=True, color="334155"),
                fill=PatternFill(start_color=theme["kpi_bg"], end_color=theme["kpi_bg"], fill_type="solid"),
                alignment=Alignment(horizontal="left", vertical="center", indent=1),
            )
            ws.row_dimensions[cur_row].height = 20
            cur_row += 1

        if s_spec.get("title") or s_spec.get("subtitle"):
            cur_row += 1

        # 2. KPI Summary Cards
        kpis = s_spec.get("kpis", [])
        if kpis:
            n_kpis = len(kpis)
            span = max(2, master_cols // n_kpis)
            r_hdr, r_val, r_sub = cur_row, cur_row + 1, cur_row + 2
            ws.row_dimensions[r_hdr].height = 18
            ws.row_dimensions[r_val].height = 26
            ws.row_dimensions[r_sub].height = 18

            for k_i, kpi in enumerate(kpis):
                c_start = 1 + k_i * span
                c_end = min(master_cols, c_start + span - 1) if k_i < n_kpis - 1 else master_cols
                if c_start > master_cols:
                    break
                l_start, l_end = get_column_letter(c_start), get_column_letter(c_end)
                rng_h = f"{l_start}{r_hdr}:{l_end}{r_hdr}"
                rng_v = f"{l_start}{r_val}:{l_end}{r_val}"
                rng_s = f"{l_start}{r_sub}:{l_end}{r_sub}"

                ws.merge_cells(rng_h)
                ws[f"{l_start}{r_hdr}"].value = str(kpi.get("label", "")).strip().upper()
                _style_merged(
                    ws,
                    rng_h,
                    font=Font(name="Calibri", size=9, bold=True, color="FFFFFF"),
                    fill=PatternFill(start_color=theme["primary"], end_color=theme["primary"], fill_type="solid"),
                    alignment=Alignment(horizontal="center", vertical="center"),
                    border=card_border,
                )

                ws.merge_cells(rng_v)
                v_cell = ws[f"{l_start}{r_val}"]
                v_cell.value = kpi.get("value", "")
                if kpi.get("format"):
                    v_cell.number_format = str(kpi["format"]).strip()
                _style_merged(
                    ws,
                    rng_v,
                    font=Font(name="Calibri", size=14, bold=True, color=theme["primary"]),
                    fill=PatternFill(start_color=theme["kpi_bg"], end_color=theme["kpi_bg"], fill_type="solid"),
                    alignment=Alignment(horizontal="center", vertical="center"),
                    border=thin_border,
                )

                ws.merge_cells(rng_s)
                ws[f"{l_start}{r_sub}"].value = str(kpi.get("sub", "")).strip()
                _style_merged(
                    ws,
                    rng_s,
                    font=Font(name="Calibri", size=9, bold=True, color=theme["accent"]),
                    fill=PatternFill(start_color=theme["kpi_bg"], end_color=theme["kpi_bg"], fill_type="solid"),
                    alignment=Alignment(horizontal="center", vertical="center"),
                    border=thin_border,
                )

            cur_row += 5

        # 3. Tables
        table_positions = {}
        for t_idx, tbl in enumerate(s_spec.get("tables", [])):
            t_id = tbl.get("id", f"table_{t_idx+1}")
            start_col = int(tbl.get("start_col", 1))
            if tbl.get("start_row"):
                cur_row = max(cur_row, int(tbl["start_row"]))

            if tbl.get("section_title"):
                c_sec = ws.cell(row=cur_row, column=start_col, value=str(tbl["section_title"]).strip())
                c_sec.font = Font(name="Calibri", size=12, bold=True, color=theme["primary"])
                ws.row_dimensions[cur_row].height = 22
                cur_row += 1

            headers = tbl.get("headers", [])
            rows = tbl.get("rows", [])
            col_formats = tbl.get("formats", [])
            col_aligns = tbl.get("align", [])
            n_cols = len(headers)
            hdr_row_idx = cur_row

            # Header Row: selalu center atau left agar tidak dianggap text right-aligned oleh validator
            ws.row_dimensions[hdr_row_idx].height = 24
            for c_i, h_text in enumerate(headers):
                col_num = start_col + c_i
                cell = ws.cell(row=hdr_row_idx, column=col_num, value=str(h_text).strip())
                cell.font = Font(name="Calibri", size=10.5, bold=True, color="FFFFFF")
                cell.fill = PatternFill(start_color=theme["primary"], end_color=theme["primary"], fill_type="solid")
                cell.alignment = Alignment(horizontal="left" if c_i == 0 else "center", vertical="center", wrap_text=True)
                cell.border = thin_border

            first_data_row = hdr_row_idx + 1
            cur_row = first_data_row

            zebra = tbl.get("zebra", True)
            for r_i, r_vals in enumerate(rows):
                ws.row_dimensions[cur_row].height = 20
                for c_i in range(n_cols):
                    col_num = start_col + c_i
                    raw_val = r_vals[c_i] if c_i < len(r_vals) else None
                    if isinstance(raw_val, str):
                        raw_val = raw_val.strip()
                        if "{row}" in raw_val:
                            raw_val = raw_val.replace("{row}", str(cur_row))
                    cell = ws.cell(row=cur_row, column=col_num, value=raw_val)
                    cell.font = Font(name="Calibri", size=10, color="1E293B")
                    cell.border = thin_border
                    if zebra and r_i % 2 == 1:
                        cell.fill = PatternFill(start_color=theme["zebra"], end_color=theme["zebra"], fill_type="solid")

                    fmt = col_formats[c_i].strip() if c_i < len(col_formats) and col_formats[c_i] else None
                    if fmt:
                        cell.number_format = fmt
                    elif isinstance(raw_val, (int, float)):
                        cell.number_format = "#,##0.00" if isinstance(raw_val, float) and not raw_val.is_integer() else "#,##0"

                    is_num_or_formula = isinstance(raw_val, (int, float)) or (isinstance(raw_val, str) and raw_val.startswith("="))
                    al = col_aligns[c_i] if c_i < len(col_aligns) else ("right" if is_num_or_formula and c_i > 0 else "left")
                    if not is_num_or_formula and al == "right":
                        al = "left"
                    cell.alignment = Alignment(horizontal=al, vertical="center")

                    if "status" in str(headers[c_i]).lower() and isinstance(raw_val, str) and not raw_val.startswith("="):
                        up = raw_val.upper()
                        if any(k in up for k in ("DONE", "SELESAI", "TERCAPAI", "AMAN", "KAPABEL", "OK", "LULUS", "MELAMPAUI")):
                            cell.fill = PatternFill(start_color="D1E7DD", end_color="D1E7DD", fill_type="solid")
                            cell.font = Font(name="Calibri", size=10, bold=True, color="0F5132")
                            cell.alignment = Alignment(horizontal="center", vertical="center")
                        elif any(k in up for k in ("PROGRES", "PROGRESS", "PERHATIAN", "REVIEW", "WARNING")):
                            cell.fill = PatternFill(start_color="FFF3CD", end_color="FFF3CD", fill_type="solid")
                            cell.font = Font(name="Calibri", size=10, bold=True, color="664D03")
                            cell.alignment = Alignment(horizontal="center", vertical="center")
                        elif any(k in up for k in ("BLOCKED", "KRITIS", "GAGAL", "OVER", "TUNGGAK", "TERLAMBAT")):
                            cell.fill = PatternFill(start_color="F8D7DA", end_color="F8D7DA", fill_type="solid")
                            cell.font = Font(name="Calibri", size=10, bold=True, color="842029")
                            cell.alignment = Alignment(horizontal="center", vertical="center")

                cur_row += 1

            last_data_row = cur_row - 1

            totals_cfg = tbl.get("totals")
            if totals_cfg and last_data_row >= first_data_row:
                ws.row_dimensions[cur_row].height = 22
                for c_i in range(n_cols):
                    col_num = start_col + c_i
                    col_let = get_column_letter(col_num)
                    t_spec = totals_cfg[c_i] if isinstance(totals_cfg, list) and c_i < len(totals_cfg) else None
                    cell = ws.cell(row=cur_row, column=col_num)
                    if c_i == 0 and not t_spec:
                        cell.value = "Total"
                    elif isinstance(t_spec, str) and t_spec.strip():
                        t_spec = t_spec.strip()
                        up_t = t_spec.upper()
                        if up_t in ("SUM", "AVERAGE", "MAX", "MIN", "COUNT"):
                            cell.value = f"={up_t}({col_let}{first_data_row}:{col_let}{last_data_row})"
                        elif t_spec.startswith("="):
                            cell.value = (
                                t_spec.replace("{first}", str(first_data_row))
                                .replace("{last}", str(last_data_row))
                                .replace("{row}", str(cur_row))
                            )
                        else:
                            cell.value = t_spec
                    cell.font = Font(name="Calibri", size=10.5, bold=True, color=theme["primary"])
                    cell.border = double_bottom
                    fmt = col_formats[c_i].strip() if c_i < len(col_formats) and col_formats[c_i] else None
                    if fmt and cell.value is not None:
                        cell.number_format = fmt
                    is_f = isinstance(cell.value, (int, float)) or (isinstance(cell.value, str) and cell.value.startswith("="))
                    al = col_aligns[c_i] if c_i < len(col_aligns) else ("right" if is_f and c_i > 0 else "left")
                    if not is_f and al == "right":
                        al = "left"
                    cell.alignment = Alignment(horizontal=al, vertical="center")
                cur_row += 1

            for cf in tbl.get("conditional_formats", []):
                col_idx_1 = int(cf.get("col", 2))
                c_let = get_column_letter(start_col + col_idx_1 - 1)
                cf_range = f"{c_let}{first_data_row}:{c_let}{last_data_row}"
                cf_type = cf.get("type", "databar")
                if cf_type == "databar":
                    rule = DataBarRule(start_type="num", start_value=cf.get("min", 0), end_type="max", color=cf.get("color", theme["databar"]))
                    ws.conditional_formatting.add(cf_range, rule)
                elif cf_type == "colorscale":
                    rule = ColorScaleRule(
                        start_type="min", start_color="F8D7DA",
                        mid_type="percentile", mid_value=50, mid_color="FFF3CD",
                        end_type="max", end_color="D1E7DD"
                    )
                    ws.conditional_formatting.add(cf_range, rule)

            for dv_cfg in tbl.get("dropdowns", []):
                col_idx_1 = int(dv_cfg.get("col", 2))
                c_let = get_column_letter(start_col + col_idx_1 - 1)
                options = dv_cfg.get("options", [])
                if options:
                    formula_list = '"' + ",".join(str(x).strip() for x in options) + '"'
                    dv = DataValidation(type="list", formula1=formula_list, allow_blank=True)
                    ws.add_data_validation(dv)
                    dv.add(f"{c_let}{first_data_row}:{c_let}{max(last_data_row, first_data_row + 15)}")

            table_positions[t_id] = {
                "hdr_row": hdr_row_idx,
                "first_data_row": first_data_row,
                "last_data_row": last_data_row,
                "end_row": cur_row - 1,
                "start_col": start_col,
                "end_col": start_col + n_cols - 1,
                "n_cols": n_cols,
            }

            cur_row += 2

        # 4. Native Excel Charts
        max_visual_bottom_row = cur_row
        for ch_idx, ch_spec in enumerate(s_spec.get("native_charts", [])):
            t_ref_id = ch_spec.get("table_id", "table_1")
            t_pos = table_positions.get(t_ref_id, list(table_positions.values())[0] if table_positions else None)
            if not t_pos:
                continue

            c_type = ch_spec.get("type", "bar")
            if c_type == "line":
                chart = LineChart()
            elif c_type == "area":
                chart = AreaChart()
            elif c_type == "pie":
                chart = PieChart()
            elif c_type == "doughnut":
                chart = DoughnutChart()
            else:
                chart = BarChart()
                chart.type = "col"

            chart.style = int(ch_spec.get("style", 10))
            chart.title = ch_spec.get("title", "Analisis Data")
            if hasattr(chart, "y_axis") and ch_spec.get("ylabel"):
                chart.y_axis.title = ch_spec["ylabel"]
            if hasattr(chart, "x_axis") and ch_spec.get("xlabel"):
                chart.x_axis.title = ch_spec["xlabel"]

            w_cm = float(ch_spec.get("width_cm", 14.5))
            h_cm = float(ch_spec.get("height_cm", 8.5))
            chart.width = w_cm
            chart.height = h_cm

            cat_col = t_pos["start_col"] + int(ch_spec.get("category_col", 1)) - 1
            val_cols = ch_spec.get("value_cols", [2, 3])
            min_v_col = t_pos["start_col"] + min(val_cols) - 1
            max_v_col = t_pos["start_col"] + max(val_cols) - 1

            data_ref = Reference(ws, min_col=min_v_col, min_row=t_pos["hdr_row"], max_col=max_v_col, max_row=t_pos["last_data_row"])
            cats_ref = Reference(ws, min_col=cat_col, min_row=t_pos["first_data_row"], max_row=t_pos["last_data_row"])
            chart.add_data(data_ref, titles_from_data=True)
            chart.set_categories(cats_ref)

            if c_type == "line" and ch_spec.get("smooth", True):
                for ser in chart.series:
                    ser.smooth = True

            anchor = ch_spec.get("anchor")
            if not anchor:
                placement = ch_spec.get("placement", "side-by-side" if t_pos["n_cols"] <= 5 else "stacked")
                if placement == "side-by-side":
                    anchor_col = get_column_letter(t_pos["end_col"] + 2)
                    anchor_row = t_pos["hdr_row"]
                    anchor = f"{anchor_col}{anchor_row}"
                else:
                    anchor_row = max(cur_row, max_visual_bottom_row)
                    anchor = f"A{anchor_row}"

            ws.add_chart(chart, anchor)
            anchor_r_num = int("".join(filter(str.isdigit, anchor)) or cur_row)
            chart_last_r = anchor_r_num + int(math.ceil(h_cm / 0.5)) + 2
            max_visual_bottom_row = max(max_visual_bottom_row, chart_last_r)

        # 5. Embedded High-Res Curves & Smart Image Payloads
        visual_blocks = s_spec.get("curves", []) + s_spec.get("images", [])
        for v_idx, v_spec in enumerate(visual_blocks):
            v_png = os.path.join(tmp_dir, f"sheet_{s_idx}_vis_{v_idx}.png")
            if v_spec.get("path") and os.path.exists(v_spec["path"]):
                w_px = int(v_spec.get("width_px", 720))
                h_px = int(v_spec.get("height_px", 405))
                viz_kit.process_image_payload(
                    v_spec["path"],
                    v_png,
                    target_w_px=w_px,
                    target_h_px=h_px,
                    aspect_ratio=v_spec.get("aspect_ratio"),
                    fit_mode=v_spec.get("fit_mode", "contain"),
                    rounded_px=int(v_spec.get("rounded_px", 8)),
                )
            elif v_spec.get("kind") == "diagram":
                viz_kit.generate_diagram_payload({"theme": theme_name, **v_spec}, v_png)
            else:
                raw_png = os.path.join(tmp_dir, f"sheet_{s_idx}_raw_{v_idx}.png")
                c_cfg = {"theme": theme_name, "width_in": v_spec.get("width_in", 7.2), "height_in": v_spec.get("height_in", 4.0), "dpi": 220, **v_spec}
                viz_kit.render_curve(c_cfg, raw_png)
                disp_w_px = int(v_spec.get("display_width_px", 640))
                viz_kit.process_image_payload(raw_png, v_png, target_w_px=disp_w_px, fit_mode="contain")

            xl_img = XLImage(v_png)
            if v_spec.get("display_width_px"):
                scale = float(v_spec["display_width_px"]) / max(xl_img.width, 1)
                xl_img.width = int(v_spec["display_width_px"])
                xl_img.height = int(round(xl_img.height * scale))

            anchor = v_spec.get("anchor")
            if not anchor:
                placement = v_spec.get("placement", "stacked")
                t_ref = table_positions.get(v_spec.get("table_id", "table_1"), list(table_positions.values())[0] if table_positions else None)
                if placement == "side-by-side" and t_ref:
                    a_col = get_column_letter(t_ref["end_col"] + 2)
                    a_row = t_ref["hdr_row"]
                    anchor = f"{a_col}{a_row}"
                elif placement == "right-col":
                    a_col = get_column_letter(max(5, master_cols // 2 + 1))
                    anchor = f"{a_col}{max(cur_row, 7)}"
                else:
                    anchor = f"A{max(cur_row, max_visual_bottom_row)}"

            ws.add_image(xl_img, anchor)
            anchor_r_num = int("".join(filter(str.isdigit, anchor)) or cur_row)
            est_rows = int(math.ceil((xl_img.height / 96.0 * 2.54) / 0.5)) + 3
            max_visual_bottom_row = max(max_visual_bottom_row, anchor_r_num + est_rows)

        # 6. Catatan & Asumsi
        if s_spec.get("notes"):
            note_row = max(cur_row, max_visual_bottom_row)
            c_nt = ws.cell(row=note_row, column=1, value="Catatan & Asumsi:")
            c_nt.font = Font(name="Calibri", size=10, bold=True, color=theme["primary"])
            for n_i, note_txt in enumerate(s_spec["notes"], start=1):
                cn = ws.cell(row=note_row + n_i, column=1, value=f"• {str(note_txt).strip()}")
                cn.font = Font(name="Calibri", size=9.5, italic=True, color="475569")

        if s_spec.get("freeze_panes"):
            ws.freeze_panes = s_spec["freeze_panes"]

        merged_multi = {
            cell.coordinate
            for rng in ws.merged_cells.ranges
            if rng.min_col != rng.max_col
            for row in ws[rng.coord]
            for cell in row
        }
        for col in ws.columns:
            max_len = 0
            col_idx = col[0].column
            col_let = get_column_letter(col_idx)
            for cell in col:
                if cell.coordinate in merged_multi:
                    continue
                val = str(cell.value) if cell.value is not None else ""
                if val.startswith("="):
                    max_len = max(max_len, 12)
                else:
                    max_len = max(max_len, len(val))
            ws.column_dimensions[col_let].width = min(max(max_len + 4, 12), 38)

    # 8. VBA Macro Engine (.bas file + clean reference sheet without leading '=' or whitespace)
    vba_code = _build_vba_module_text(spec.get("macros"))
    bas_path = None
    if spec.get("macros") is not False:
        bas_path = os.path.splitext(out_path)[0] + "_Macros.bas"
        os.makedirs(os.path.dirname(os.path.abspath(bas_path)), exist_ok=True)
        with open(bas_path, "w", encoding="utf-8") as bf:
            bf.write(vba_code)

        if spec.get("include_macro_sheet", True) and spec.get("macros"):
            ws_m = wb.create_sheet(title="VBA_Macro_Engine")
            ws_m.views.sheetView[0].showGridLines = True
            ws_m.merge_cells("A1:D1")
            ws_m["A1"].value = "MODUL VBA / MACRO ENGINE & PANDUAN EKSEKUSI OTOMATIS"
            _style_merged(
                ws_m,
                "A1:D1",
                font=Font(name="Calibri", size=14, bold=True, color="FFFFFF"),
                fill=PatternFill(start_color=theme["primary"], end_color=theme["primary"], fill_type="solid"),
                alignment=Alignment(horizontal="left", vertical="center", indent=1),
            )
            ws_m.row_dimensions[1].height = 28

            headers_m = ["Nama Sub / UDF Macro", "Tipe Modul", "Cara Pakai / Pintasan", "Fungsi Utama"]
            for col_i, h_val in enumerate(headers_m, start=1):
                c = ws_m.cell(row=3, column=col_i, value=h_val)
                c.font = Font(name="Calibri", size=10.5, bold=True, color="FFFFFF")
                c.fill = PatternFill(start_color=theme["primary"], end_color=theme["primary"], fill_type="solid")
                c.alignment = Alignment(horizontal="left", vertical="center")
                c.border = thin_border
            ws_m.row_dimensions[3].height = 22

            macro_rows = [
                ("AutoFormatActiveSheet", "Sub (Action)", "Alt + F8 -> AutoFormatActiveSheet", "Merapikan font, lebar kolom otomatis (12-42), dan mengaktifkan gridlines"),
                ("ExportSheetToPDF", "Sub (Action)", "Alt + F8 -> ExportSheetToPDF", "Mengekspor sheet aktif ke PDF Landscape 1 halaman penuh secara otomatis"),
                ("HighlightOutliersTwoSigma", "Sub (Audit)", "Pilih range -> Alt + F8 -> HighlightOutliersTwoSigma", "Mendeteksi & mewarnai merah nilai anomali di luar ±2 Standar Deviasi (Six Sigma)"),
                ("HITUNG_CPK(USL, LSL, Mean, Std)", "Function (UDF)", "Panggil sebagai rumus sel setelah impor modul .bas", "Menghitung indeks kapabilitas proses Cpk secara presisi"),
                ("STATUS_CAPAIAN(Aktual, Target)", "Function (UDF)", "Panggil sebagai rumus sel setelah impor modul .bas", "Mengembalikan status otomatis: MELAMPAUI TARGET / TERCAPAI / PERLU PERHATIAN / KRITIS"),
            ]
            for idx_m, m_row in enumerate(macro_rows, start=4):
                ws_m.row_dimensions[idx_m].height = 20
                for col_i, val in enumerate(m_row, start=1):
                    c = ws_m.cell(row=idx_m, column=col_i, value=val)
                    c.font = Font(name="Consolas" if col_i == 1 else "Calibri", size=10, bold=(col_i == 1))
                    c.alignment = Alignment(horizontal="left", vertical="center")
                    c.border = thin_border
                    if idx_m % 2 == 1:
                        c.fill = PatternFill(start_color=theme["zebra"], end_color=theme["zebra"], fill_type="solid")

            ws_m["A10"].value = f"File Modul VBA Siap Impor: {os.path.basename(bas_path)} (Alt + F11 -> File -> Import File)"
            ws_m["A10"].font = Font(name="Calibri", size=10.5, bold=True, color=theme["primary"])

            ws_m.column_dimensions["A"].width = 36
            ws_m.column_dimensions["B"].width = 18
            ws_m.column_dimensions["C"].width = 44
            ws_m.column_dimensions["D"].width = 62

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    wb.save(out_path)

    if recalc and shutil.which("libreoffice"):
        recalc_tmp = os.path.join(tmp_dir, "recalc")
        os.makedirs(recalc_tmp, exist_ok=True)
        try:
            subprocess.run(
                ["libreoffice", "--headless", "--nologo", "--nolockcheck", "--norestore", "--calc", "--convert-to", "xlsx", "--outdir", recalc_tmp, out_path],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=25,
            )
            recalced_file = os.path.join(recalc_tmp, os.path.basename(out_path))
            if os.path.exists(recalced_file) and os.path.getsize(recalced_file) > 0:
                shutil.move(recalced_file, out_path)
        except Exception:
            pass

    return {"xlsx_path": out_path, "bas_path": bas_path}


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Pemakaian: python3 excel_kit.py spec.json output.xlsx", file=sys.stderr)
        sys.exit(1)
    spec_file, out_file = sys.argv[1], sys.argv[2]
    with open(spec_file, "r", encoding="utf-8") as f:
        spec_obj = json.load(f)
    res = build(spec_obj, out_file)
    print(f"OK -> {res['xlsx_path']}" + (f" (Macro VBA -> {res['bas_path']})" if res.get("bas_path") else ""))
