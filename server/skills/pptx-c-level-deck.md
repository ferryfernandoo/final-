# 📊 SKILL: EXECUTIVE C-LEVEL PRESENTATION DECK (PPTX)
Category: Presentations & Slide Decks
Keywords: [pptx, powerpoint, presentation, slides, c-level, executive, pitch deck, widescreen, python-pptx]

## 🎯 TUJUAN & STANDAR KUALITAS
Menghasilkan slide presentasi PowerPoint (`.pptx`) standar konsultansi papan atas (McKinsey, BCG, Goldman Sachs) menggunakan pustaka `python-pptx`. Slide harus tampil profesional, bersih, tidak tumpang tindih (zero text collision), dan berformat 16:9 widescreen modern.

---

## 📐 PRINSIP DESAIN & TATA LETAK
1. **Widescreen 16:9 Mandatori**:
   ```python
   prs.slide_width = Inches(13.333)
   prs.slide_height = Inches(7.5)
   ```
2. **Palet Warna Eksekutif**:
   - `PRIMARY_DARK` = `RGBColor(15, 23, 42)` (#0F172A - Slate 900)
   - `BRAND_ACCENT` = `RGBColor(234, 88, 12)` (#EA580C - Vibrant Tangerine / Deepernova Orange)
   - `BG_LIGHT` = `RGBColor(248, 250, 252)` (#F8FAFC - Off White)
   - `CARD_BG` = `RGBColor(255, 255, 255)` (#FFFFFF)
   - `TEXT_MUTED` = `RGBColor(100, 116, 139)` (#64748B)
   - `SUCCESS_GREEN` = `RGBColor(16, 185, 129)` (#10B981)
3. **Tipografi Hirarki**:
   - Slide Title: 26pt - 30pt (Bold, Slate 900)
   - Subtitle / Tracker: 11pt - 13pt (Caps, Brand Accent)
   - KPI Big Numbers: 36pt - 44pt (Bold, Slate 900 atau Brand Accent)
   - Body & Bullet points: 12pt - 14pt (Slate 700, 1.2 line spacing)
   - Font family konsisten: `'Calibri'`, `'Segoe UI'`, atau `'Arial'` (selalu ada di semua OS).

---

## 🛡️ ATURAN ANTI-CRASH & ANTI-TUMPANG TINDIH
- **Selalu atur `word_wrap = True`** pada semua `tf = shape.text_frame`.
- **Gunakan kontainer kartu persegi (Rectangle shape)** dengan `line.color` halus dan `fill.solid()` untuk menampung KPI atau pilar strategi.
- **Hitung koordinat `left` secara dinamis** saat membuat multi-kolom agar spasi antar kartu simetris dan presisi.
- **Selalu panggil `Inches`** dari `pptx.util`, jangan gunakan nilai float mentah.

---

## 📋 TEMPLATE SCRIPT PYTHON LENGKAP & TERUJI

```python
import sys
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_executive_deck(filename="Executive_Strategic_Brief.pptx"):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6] # Blank slide layout

    # Warna
    COLOR_BG = RGBColor(248, 250, 252)
    COLOR_SLATE_900 = RGBColor(15, 23, 42)
    COLOR_ORANGE = RGBColor(234, 88, 12)
    COLOR_WHITE = RGBColor(255, 255, 255)
    COLOR_MUTED = RGBColor(100, 116, 139)
    COLOR_BORDER = RGBColor(226, 232, 240)
    COLOR_GREEN = RGBColor(16, 185, 129)

    def set_slide_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = COLOR_BG
        bg.line.fill.background()
        return bg

    def add_header(slide, tracker, title):
        tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.6), Inches(11.733), Inches(1.2))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_top = Inches(0)
        tf.margin_left = Inches(0)

        p_track = tf.paragraphs[0]
        p_track.text = tracker.upper()
        p_track.font.size = Pt(11)
        p_track.font.bold = True
        p_track.font.color.rgb = COLOR_ORANGE

        p_title = tf.add_paragraph()
        p_title.text = title
        p_title.font.size = Pt(24)
        p_title.font.bold = True
        p_title.font.color.rgb = COLOR_SLATE_900

    # ==========================================
    # SLIDE 1: COVER SLIDE EKSEKUTIF (DARK THEME)
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    bg1 = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), prs.slide_width, prs.slide_height)
    bg1.fill.solid()
    bg1.fill.fore_color.rgb = COLOR_SLATE_900
    bg1.line.fill.background()

    # Accent Stripe
    stripe = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(2.2), Inches(0.15), Inches(3.2))
    stripe.fill.solid()
    stripe.fill.fore_color.rgb = COLOR_ORANGE
    stripe.line.fill.background()

    # Title Box
    title_box = s1.shapes.add_textbox(Inches(1.2), Inches(2.1), Inches(11.0), Inches(3.4))
    tf1 = title_box.text_frame
    tf1.word_wrap = True

    p0 = tf1.paragraphs[0]
    p0.text = "STRATEGIC TRANSFORMATION REPORT"
    p0.font.size = Pt(13)
    p0.font.bold = True
    p0.font.color.rgb = COLOR_ORANGE

    p1 = tf1.add_paragraph()
    p1.text = "Akselerasi Pertumbuhan Bisnis & Modernisasi AI 2026"
    p1.font.size = Pt(36)
    p1.font.bold = True
    p1.font.color.rgb = COLOR_WHITE

    p2 = tf1.add_paragraph()
    p2.text = "Executive Summary, KPI Architecture & Road to Scale"
    p2.font.size = Pt(18)
    p2.font.color.rgb = RGBColor(148, 163, 184)

    p3 = tf1.add_paragraph()
    p3.text = "\nDisiapkan oleh: Strategic Advisory Group | Kerahasiaan: Strictly Confidential"
    p3.font.size = Pt(11)
    p3.font.color.rgb = RGBColor(100, 116, 139)

    # ==========================================
    # SLIDE 2: 3-CARD KPI SCORECARD
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2)
    add_header(s2, "Performa & Metrik Utama", "Pertumbuhan Kuartal Q3 Menunjukkan Traksi Signifikan")

    cards = [
        {"val": "Rp 48.2 M", "lbl": "Annual Recurring Revenue", "badge": "+38.4% YoY", "desc": "Didorong oleh penetrasi enterprise dan efisiensi produk baru."},
        {"val": "99.98%", "lbl": "Service Reliability", "badge": "Level Tier-4", "desc": "Zero critical incident sepanjang 90 hari operasional berjalan."},
        {"val": "4.2x", "lbl": "Efisiensi Operasional", "badge": "Target Terlampaui", "desc": "Automasi alur kerja agen cerdas menghemat 12.000+ jam kerja tim."}
    ]

    card_w = Inches(3.7)
    card_h = Inches(4.5)
    card_gap = Inches(0.3)
    start_x = Inches(0.8)
    card_y = Inches(2.0)

    for i, c in enumerate(cards):
        cx = start_x + i * (card_w + card_gap)
        card = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, card_y, card_w, card_h)
        card.fill.solid()
        card.fill.fore_color.rgb = COLOR_WHITE
        card.line.color.rgb = COLOR_BORDER
        card.line.width = Pt(1)

        tb = s2.shapes.add_textbox(cx + Inches(0.3), card_y + Inches(0.35), card_w - Inches(0.6), card_h - Inches(0.7))
        tf = tb.text_frame
        tf.word_wrap = True

        p_b = tf.paragraphs[0]
        p_b.text = c["badge"].upper()
        p_b.font.size = Pt(10)
        p_b.font.bold = True
        p_b.font.color.rgb = COLOR_ORANGE

        p_v = tf.add_paragraph()
        p_v.text = c["val"]
        p_v.font.size = Pt(36)
        p_v.font.bold = True
        p_v.font.color.rgb = COLOR_SLATE_900

        p_l = tf.add_paragraph()
        p_l.text = c["lbl"]
        p_l.font.size = Pt(13)
        p_l.font.bold = True
        p_l.font.color.rgb = COLOR_MUTED

        p_d = tf.add_paragraph()
        p_d.text = "\n" + c["desc"]
        p_d.font.size = Pt(11)
        p_d.font.color.rgb = COLOR_SLATE_900

    # ==========================================
    # SLIDE 3: 2-COLUMN STRATEGY & ROADMAP
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3)
    add_header(s3, "Rencana Strategis & Eksekusi", "Fokus Prioritas Roadmap Menuju Skalabilitas Global")

    col_w = Inches(5.7)
    col_h = Inches(4.5)
    col_y = Inches(2.0)

    # Kolom 1: Fondasi Teknis
    c1 = s3.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), col_y, col_w, col_h)
    c1.fill.solid()
    c1.fill.fore_color.rgb = COLOR_WHITE
    c1.line.color.rgb = COLOR_BORDER

    tb1 = s3.shapes.add_textbox(Inches(1.1), col_y + Inches(0.3), col_w - Inches(0.6), col_h - Inches(0.6))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    p = tf1.paragraphs[0]
    p.text = "PILAR 1: TEKNOLOGI & INFRASTRUKTUR"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = COLOR_ORANGE

    p_items_1 = [
        ("Desentralisasi Arsitektur Server", "Migrasi ke sistem multi-region untuk menjamin zero-latency."),
        ("Keamanan Enkripsi End-to-End", "Implementasi AES-256 dan kepatuhan standar ISO/IEC 27001."),
        ("Optimasi Autonomous Agent", "Pemberdayaan loop self-healing untuk mitigasi otomatis kegagalan sistem.")
    ]
    for title, desc in p_items_1:
        pt = tf1.add_paragraph()
        pt.text = f"\n• {title}"
        pt.font.bold = True
        pt.font.size = Pt(12)
        pt.font.color.rgb = COLOR_SLATE_900
        pd = tf1.add_paragraph()
        pd.text = f"   {desc}"
        pd.font.size = Pt(11)
        pd.font.color.rgb = COLOR_MUTED

    # Kolom 2: Eksekusi Bisnis
    c2 = s3.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.8), col_y, col_w, col_h)
    c2.fill.solid()
    c2.fill.fore_color.rgb = COLOR_WHITE
    c2.line.color.rgb = COLOR_BORDER

    tb2 = s3.shapes.add_textbox(Inches(7.1), col_y + Inches(0.3), col_w - Inches(0.6), col_h - Inches(0.6))
    tf2 = tb2.text_frame
    tf2.word_wrap = True
    p = tf2.paragraphs[0]
    p.text = "PILAR 2: PENETRASI PASAR & TALENTA"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = COLOR_SLATE_900

    p_items_2 = [
        ("Ekspansi Segmen Enterprise Tier-1", "Fokus akuisisi 25 korporasi multinasional pada Q4."),
        ("Program Sertifikasi & Aliansi", "Kemitraan strategis dengan penyedia solusi cloud global."),
        ("Akselerasi Onboarding Mandiri", "Penyederhanaan alur pendaftaran produk hingga di bawah 3 menit.")
    ]
    for title, desc in p_items_2:
        pt = tf2.add_paragraph()
        pt.text = f"\n• {title}"
        pt.font.bold = True
        pt.font.size = Pt(12)
        pt.font.color.rgb = COLOR_SLATE_900
        pd = tf2.add_paragraph()
        pd.text = f"   {desc}"
        pd.font.size = Pt(11)
        pd.font.color.rgb = COLOR_MUTED

    prs.save(filename)
    print(f"[SUCCESS] Executive Presentation Deck berhasil dibuat: {filename}")
    return filename

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "Executive_Strategic_Brief.pptx"
    create_executive_deck(out_file)
```
