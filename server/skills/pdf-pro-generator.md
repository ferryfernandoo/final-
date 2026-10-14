# 📄 SKILL: ENTERPRISE PDF GENERATION & PUBLISHING (REPORTLAB)
Category: Document Publishing & PDF Engineering
Keywords: [pdf, reportlab, print, document, invoice, report, vector, typography, python]

## 🎯 TUJUAN & STANDAR KUALITAS
Menghasilkan dokumen PDF berstandar cetak komersial dan korporat (Invoice Resmi, Whitepaper, Audit Eksekutif) menggunakan pustaka Python `reportlab`. PDF harus memiliki tata letak halaman yang presisi, nomor halaman dinamis ("Halaman X dari Y"), header korporat, tabel terbungkus rapi (tanpa teks terpotong), dan palet warna modern Deepernova.

---

## 📐 ARSITEKTUR DESAIN & REPORTLAB FLOWABLES
1. **Aturan Anti-Teks Bertumpuk**:
   - Selalu tentukan `leading` yang proporsional setiap kali mengubah `fontSize` (rumus: `leading = fontSize * 1.25`).
2. **Tabel dengan Teks Dinamis**:
   - Isi sel tabel dengan objek `Paragraph` (bukan string polos mentah) agar teks otomatis melakukan word-wrap di dalam lebar kolom (`colWidths`).
3. **NumberedCanvas Pattern (Page X of Y)**:
   - Gunakan kanvas kustom dua putaran (two-pass canvas) untuk menghitung total halaman dokumen secara akurat.

---

## 📋 TEMPLATE SCRIPT PYTHON LENGKAP & TERUJI

```python
import sys
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Kanvas kustom untuk menghitung total halaman (Page X of Y) secara presisi."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8.5)
        self.setFillColor(colors.HexColor("#64748B"))

        # Running Header (Hanya di halaman > 1)
        if self._pageNumber > 1:
            self.drawString(54, 800, "DEEPERNOVA AI | EXECUTIVE STRATEGIC AUDIT 2026")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.8)
            self.line(54, 792, 540, 792)

        # Running Footer (Semua halaman)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.8)
        self.line(54, 45, 540, 45)

        self.drawString(54, 32, "Kerahasiaan: Dokumen Terbatas | Hak Cipta Dilindungi")
        page_str = f"Halaman {self._pageNumber} dari {page_count}"
        self.drawRightString(540, 32, page_str)
        self.restoreState()

def generate_executive_pdf(filename="Executive_Strategic_Audit.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Styles
    style_title = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=6
    )

    style_subtitle = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#EA580C"),
        spaceAfter=20
    )

    style_heading = ParagraphStyle(
        'DocH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=14,
        spaceAfter=8
    )

    style_body = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14.5,
        textColor=colors.HexColor("#334155"),
        spaceAfter=8
    )

    style_table_cell = ParagraphStyle(
        'DocCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#1E293B")
    )

    style_table_header = ParagraphStyle(
        'DocCellH',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white
    )

    story = []

    # 1. Judul & Header Dokumen
    story.append(Paragraph("DEEPERNOVA STRATEGIC AUDIT", style_title))
    story.append(Paragraph("Evaluasi Kinerja Sistem & Modernisasi Arsitektur AI Enterprise FY26", style_subtitle))
    story.append(Spacer(1, 10))

    # 2. Executive Summary Callout Box
    summary_text = (
        "<b>Ringkasan Eksekutif:</b> Evaluasi komprehensif terhadap infrastruktur cerdas menunjukkan efisiensi operasional "
        "yang meningkat sebesar 38.4% YoY. Penerapan autonomous self-healing loop dan integrasi multi-agent workflows "
        "telah memangkas tingkat error hingga di bawah 0.02% dengan kepatuhan audit standar industri."
    )
    callout_data = [[Paragraph(summary_text, style_body)]]
    callout_table = Table(callout_data, colWidths=[486])
    callout_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FFF7ED")), # Orange-50
        ('BOX', (0, 0), (-1, -1), 1.5, colors.HexColor("#EA580C")),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
    ]))
    story.append(callout_table)
    story.append(Spacer(1, 16))

    # 3. Heading & Tabel Temuan
    story.append(Paragraph("1. Matriks Evaluasi & Alokasi Sumber Daya", style_heading))
    story.append(Paragraph("Tabel di bawah menyajikan distribusi prioritas pengerjaan modul dan status kesiapan rilis:", style_body))

    headers = [Paragraph("Komponen Sistem", style_table_header),
               Paragraph("Kategori", style_table_header),
               Paragraph("Prioritas", style_table_header),
               Paragraph("Status Eksekusi", style_table_header)]

    rows = [
        headers,
        [Paragraph("Autonomous Retry Engine", style_table_cell), Paragraph("Agentic Flow", style_table_cell), Paragraph("Critical", style_table_cell), Paragraph("Selesai (100%)", style_table_cell)],
        [Paragraph("Dynamic Skill Catalog", style_table_cell), Paragraph("Memory & Tokens", style_table_cell), Paragraph("High", style_table_cell), Paragraph("Selesai (100%)", style_table_cell)],
        [Paragraph("Executive PPTX & XLSX Engine", style_table_cell), Paragraph("Reporting", style_table_cell), Paragraph("High", style_table_cell), Paragraph("Selesai (100%)", style_table_cell)],
        [Paragraph("Cybersecurity Hardening Matrix", style_table_cell), Paragraph("Infra Security", style_table_cell), Paragraph("Critical", style_table_cell), Paragraph("Selesai (100%)", style_table_cell)],
    ]

    table = Table(rows, colWidths=[160, 110, 100, 116])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))

    story.append(table)
    story.append(Spacer(1, 16))

    # 4. Rekomendasi
    story.append(Paragraph("2. Rekomendasi Tindak Lanjut", style_heading))
    recomms = [
        "Lanjutkan pengawasan otomatis melalui scheduler berkala untuk memantau performa server secara real-time.",
        "Pertahankan batas token minimal dengan memuat dokumen panduan hanya saat dieksekusi oleh agen.",
        "Lakukan audit berkala terhadap sertifikat SSL dan header keamanan web secara terjadwal."
    ]
    for r in recomms:
        story.append(Paragraph(f"• {r}", style_body))

    # Render PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] Enterprise PDF berhasil dibuat: {filename}")
    return filename

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "Executive_Strategic_Audit.pdf"
    generate_executive_pdf(out_file)
```
