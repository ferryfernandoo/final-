Attribute VB_Name = "ModAutoFormat"
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
