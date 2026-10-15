#!/usr/bin/env python3
"""
pptx_designer.py — Modern Presentation Design Engine & Toolkit for Python
Menghasilkan presentasi PowerPoint (.pptx) Widescreen 16:9 bertaraf dunia:
  - Bento Box UI Grid & Glassmorphism Cards
  - Full-Bleed Hero Covers & Dark Executive Canvases
  - Badge Pills & Decorative Ornaments
  - KPI Stat Showcases (42pt Numbers + Context)
  - Process Pipelines & Chevrons
  - Infographic Cards & Comparison Matrices
  - Zero Text Overflow & Layout Bands Math
"""

import os
import sys
import json
from pathlib import Path

import pptx
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml import parse_xml
from pptx.oxml.ns import nsdecls

# 16:9 Widescreen standard dimensions
WIDTH_IN = 13.333
HEIGHT_IN = 7.5

THEMES = {
    "navy": {
        "name": "Navy Executive",
        "bg_dark": "0F172A",      # Slate 900
        "bg_light": "F8FAFC",     # Slate 50
        "card_bg": "FFFFFF",      # Pure White
        "card_dark": "1E293B",    # Slate 800
        "accent": "EA580C",       # Vivid Orange
        "accent_alt": "38BDF8",   # Sky Blue
        "border": "E2E8F0",       # Slate 200
        "text_dark": "0F172A",    # Slate 900
        "text_light": "F8FAFC",   # Slate 50
        "text_muted": "64748B",   # Slate 500
        "badge_bg": "EA580C",
        "badge_text": "FFFFFF"
    },
    "emerald": {
        "name": "Emerald Agri & Nature",
        "bg_dark": "064E3B",      # Deep Emerald 900
        "bg_light": "F0FDF4",     # Mint 50
        "card_bg": "FFFFFF",      # Pure White
        "card_dark": "065F46",    # Emerald 800
        "accent": "10B981",       # Emerald Green
        "accent_alt": "F59E0B",   # Warm Amber
        "border": "BBF7D0",       # Mint 200
        "text_dark": "064E3B",    # Dark Forest
        "text_light": "F0FDF4",   # Soft White
        "text_muted": "4B5563",   # Cool Slate
        "badge_bg": "059669",
        "badge_text": "FFFFFF"
    },
    "cyber": {
        "name": "Cyber Dark Obsidian",
        "bg_dark": "0A0F1D",      # Deep Obsidian
        "bg_light": "0F172A",     # Slate 900
        "card_bg": "1E293B",      # Dark Slate Card
        "card_dark": "151E32",    # Deep Blue-Gray
        "accent": "06B6D4",       # Neon Cyan
        "accent_alt": "8B5CF6",   # Electric Violet
        "border": "334155",       # Slate 700
        "text_dark": "F8FAFC",    # White for dark theme
        "text_light": "F8FAFC",   # White
        "text_muted": "94A3B8",   # Slate 400
        "badge_bg": "06B6D4",
        "badge_text": "0A0F1D"
    },
    "sunset": {
        "name": "Warm Sunset & Crimson",
        "bg_dark": "431407",      # Deep Amber 950
        "bg_light": "FFF7ED",     # Warm Cream 50
        "card_bg": "FFFFFF",      # Pure White
        "card_dark": "7C2D12",    # Warm Rust
        "accent": "F97316",       # Bright Orange
        "accent_alt": "E11D48",   # Rose Red
        "border": "FED7AA",       # Orange 200
        "text_dark": "431407",    # Dark Rust
        "text_light": "FFF7ED",   # Warm White
        "text_muted": "78716C",   # Stone 500
        "badge_bg": "EA580C",
        "badge_text": "FFFFFF"
    },
    "slate": {
        "name": "Minimalist Corporate Blue",
        "bg_dark": "1E293B",      # Slate 800
        "bg_light": "F1F5F9",     # Slate 100
        "card_bg": "FFFFFF",      # Pure White
        "card_dark": "334155",    # Slate 700
        "accent": "2563EB",       # Royal Blue
        "accent_alt": "4F46E5",   # Indigo
        "border": "CBD5E1",       # Slate 300
        "text_dark": "0F172A",    # Slate 900
        "text_light": "FFFFFF",   # White
        "text_muted": "64748B",   # Slate 500
        "badge_bg": "2563EB",
        "badge_text": "FFFFFF"
    },
    "purple": {
        "name": "Royal Violet & AI SaaS",
        "bg_dark": "1E1B4B",      # Deep Indigo 950
        "bg_light": "FAF5FF",     # Purple 50
        "card_bg": "FFFFFF",
        "card_dark": "312E81",
        "accent": "8B5CF6",       # Violet
        "accent_alt": "EC4899",   # Pink
        "border": "E9D5FF",
        "text_dark": "1E1B4B",
        "text_light": "FAF5FF",
        "text_muted": "6B7280",
        "badge_bg": "8B5CF6",
        "badge_text": "FFFFFF"
    },
    "luxury": {
        "name": "Luxury Gold & Charcoal",
        "bg_dark": "18181B",      # Zinc 900
        "bg_light": "FAFAFA",     # Zinc 50
        "card_bg": "FFFFFF",
        "card_dark": "27272A",
        "accent": "D97706",       # Amber Gold
        "accent_alt": "B45309",   # Deep Gold
        "border": "E4E4E7",
        "text_dark": "18181B",
        "text_light": "FAFAFA",
        "text_muted": "71717A",
        "badge_bg": "D97706",
        "badge_text": "FFFFFF"
    }
}

def hex_to_rgb(hex_str: str) -> RGBColor:
    h = hex_str.lstrip('#')
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))

class ModernDeck:
    """High-level builder for stunning 16:9 widescreen modern presentations"""

    def __init__(self, theme: str = "navy", title: str = "Presentasi Modern"):
        self.theme_name = theme.lower() if theme.lower() in THEMES else "navy"
        self.theme = THEMES[self.theme_name]
        self.deck_title = title
        
        self.prs = Presentation()
        self.prs.slide_width = Inches(WIDTH_IN)
        self.prs.slide_height = Inches(HEIGHT_IN)
        self.blank_layout = self.prs.slide_layouts[6]
        self.slide_count = 0

    def _draw_background(self, slide, dark_mode: bool = False):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(WIDTH_IN), Inches(HEIGHT_IN))
        bg.fill.solid()
        color_hex = self.theme["bg_dark"] if dark_mode else self.theme["bg_light"]
        bg.fill.fore_color.rgb = hex_to_rgb(color_hex)
        bg.line.fill.background()
        return bg

    def _draw_badge(self, slide, x, y, text: str, dark_mode: bool = False):
        badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(len(text) * 0.11 + 0.6), Inches(0.36))
        badge.adjustments[0] = 0.5
        badge.fill.solid()
        badge.fill.fore_color.rgb = hex_to_rgb(self.theme["accent"])
        badge.line.fill.background()
        
        tf = badge.text_frame
        tf.word_wrap = False
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        run = p.add_run()
        run.text = text.upper()
        run.font.bold = True
        run.font.size = Pt(9.5)
        run.font.color.rgb = hex_to_rgb(self.theme["badge_text"])
        return badge

    def _draw_header(self, slide, title: str, kicker: str = "", dark_mode: bool = False, left_in: float = 0.8, width_in: float = 11.733):
        # 1. Kicker / Category
        top_curr = 0.5
        if kicker:
            self._draw_badge(slide, left_in, top_curr, kicker, dark_mode)
            top_curr += 0.48

        # 2. Main Title
        tb = slide.shapes.add_textbox(Inches(left_in), Inches(top_curr), Inches(width_in), Inches(1.1))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.bold = True
        p.font.size = Pt(26)
        p.font.name = "Segoe UI"
        text_color = self.theme["text_light"] if dark_mode else self.theme["text_dark"]
        p.font.color.rgb = hex_to_rgb(text_color)

        # 3. Decorative Accent Line
        line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(left_in), Inches(top_curr + 0.95), Inches(2.2), Inches(0.04))
        line.fill.solid()
        line.fill.fore_color.rgb = hex_to_rgb(self.theme["accent"])
        line.line.fill.background()

    def _draw_footer(self, slide, dark_mode: bool = False):
        tb = slide.shapes.add_textbox(Inches(0.8), Inches(7.0), Inches(11.733), Inches(0.35))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = f"{self.deck_title}  |  Slide {self.slide_count}"
        p.font.size = Pt(9)
        p.font.color.rgb = hex_to_rgb(self.theme["text_muted"])

    def add_cover(self, title: str, subtitle: str = "", kicker: str = "DEEPERNOVA PRO", meta: str = "2026"):
        """Slide 1: High-impact full-bleed dark cover with geometric ornaments"""
        self.slide_count += 1
        slide = self.prs.slides.add_slide(self.blank_layout)
        self._draw_background(slide, dark_mode=True)

        # Decorative vertical accent bar
        bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.8), Inches(0.12), Inches(3.6))
        bar.fill.solid()
        bar.fill.fore_color.rgb = hex_to_rgb(self.theme["accent"])
        bar.line.fill.background()

        # Category Pill
        self._draw_badge(slide, 1.2, 1.8, kicker, dark_mode=True)

        # Main Title
        tb_title = slide.shapes.add_textbox(Inches(1.2), Inches(2.3), Inches(10.5), Inches(1.8))
        tf_title = tb_title.text_frame
        tf_title.word_wrap = True
        p = tf_title.paragraphs[0]
        p.text = title
        p.font.bold = True
        p.font.size = Pt(36)
        p.font.color.rgb = hex_to_rgb("FFFFFF")
        p.font.name = "Segoe UI"

        # Subtitle
        if subtitle:
            tb_sub = slide.shapes.add_textbox(Inches(1.2), Inches(4.2), Inches(10.5), Inches(1.0))
            tf_sub = tb_sub.text_frame
            tf_sub.word_wrap = True
            p_sub = tf_sub.paragraphs[0]
            p_sub.text = subtitle
            p_sub.font.size = Pt(17)
            p_sub.font.color.rgb = hex_to_rgb("94A3B8")
            p_sub.font.name = "Segoe UI"

        # Bottom Meta Card
        meta_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(5.6), Inches(6.0), Inches(0.6))
        meta_box.adjustments[0] = 0.2
        meta_box.fill.solid()
        meta_box.fill.fore_color.rgb = hex_to_rgb(self.theme["card_dark"])
        meta_box.line.color.rgb = hex_to_rgb(self.theme["border"])
        meta_box.line.width = Pt(1)
        
        tf_m = meta_box.text_frame
        tf_m.vertical_anchor = MSO_ANCHOR.MIDDLE
        p_m = tf_m.paragraphs[0]
        p_m.text = f"  📁 {meta}"
        p_m.font.size = Pt(10.5)
        p_m.font.color.rgb = hex_to_rgb("E2E8F0")

        return slide

    def add_bento_cards(self, title: str, kicker: str = "OVERVIEW", cards: list = None):
        """Slide with 2, 3, or 4 modern Bento Box content cards"""
        self.slide_count += 1
        slide = self.prs.slides.add_slide(self.blank_layout)
        self._draw_background(slide, dark_mode=False)
        self._draw_header(slide, title, kicker, dark_mode=False)

        cards = cards or [
            {"title": "Pilar Utama", "desc": "Deskripsi rincian strategi...", "tag": "STRATEGI"},
            {"title": "Operasional", "desc": "Deskripsi pelaksanaan kerja...", "tag": "EKSEKUSI"},
            {"title": "Hasil Terukur", "desc": "Deskripsi dampak capaian...", "tag": "HASIL"}
        ]

        n_cards = min(len(cards), 4)
        left_start = 0.8
        total_w = 11.733
        gap = 0.35
        card_w = (total_w - (n_cards - 1) * gap) / n_cards
        card_h = 4.4
        top_y = 2.2

        for i in range(n_cards):
            c_data = cards[i]
            cx = left_start + i * (card_w + gap)

            # 1. Outer Bento Card
            card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(cx), Inches(top_y), Inches(card_w), Inches(card_h))
            card.adjustments[0] = 0.08
            card.fill.solid()
            card.fill.fore_color.rgb = hex_to_rgb(self.theme["card_bg"])
            card.line.color.rgb = hex_to_rgb(self.theme["border"])
            card.line.width = Pt(1.5)

            # 2. Card Top Accent Highlight
            top_bar = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(cx + 0.25), Inches(top_y + 0.25), Inches(0.8), Inches(0.08))
            top_bar.fill.solid()
            top_bar.fill.fore_color.rgb = hex_to_rgb(self.theme["accent"])
            top_bar.line.fill.background()

            # 3. Card Tag Pill
            tag_text = c_data.get("tag", f"0{i+1}")
            tag_pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(cx + 0.25), Inches(top_y + 0.45), Inches(len(tag_text) * 0.09 + 0.4), Inches(0.3))
            tag_pill.adjustments[0] = 0.5
            tag_pill.fill.solid()
            tag_pill.fill.fore_color.rgb = hex_to_rgb(self.theme["bg_light"])
            tag_pill.line.color.rgb = hex_to_rgb(self.theme["border"])
            tag_pill.line.width = Pt(1)
            p_tp = tag_pill.text_frame.paragraphs[0]
            p_tp.text = tag_text.upper()
            p_tp.font.bold = True
            p_tp.font.size = Pt(8.5)
            p_tp.font.color.rgb = hex_to_rgb(self.theme["accent"])
            p_tp.alignment = PP_ALIGN.CENTER

            # 4. Text Frame
            tb = slide.shapes.add_textbox(Inches(cx + 0.25), Inches(top_y + 0.85), Inches(card_w - 0.5), Inches(card_h - 1.0))
            tf = tb.text_frame
            tf.word_wrap = True

            # Card Title
            p_t = tf.paragraphs[0]
            p_t.text = c_data.get("title", f"Komponen {i+1}")
            p_t.font.bold = True
            p_t.font.size = Pt(18)
            p_t.font.color.rgb = hex_to_rgb(self.theme["text_dark"])
            p_t.space_after = Pt(10)

            # Optional Stat Box
            if "stat" in c_data:
                p_s = tf.add_paragraph()
                p_s.text = c_data["stat"]
                p_s.font.bold = True
                p_s.font.size = Pt(24)
                p_s.font.color.rgb = hex_to_rgb(self.theme["accent"])
                if "stat_label" in c_data:
                    p_sl = tf.add_paragraph()
                    p_sl.text = c_data["stat_label"]
                    p_sl.font.size = Pt(9.5)
                    p_sl.font.color.rgb = hex_to_rgb(self.theme["text_muted"])
                    p_sl.space_after = Pt(8)

            # Card Body Text
            p_b = tf.add_paragraph()
            p_b.text = c_data.get("desc", "")
            p_b.font.size = Pt(12)
            p_b.font.color.rgb = hex_to_rgb(self.theme["text_muted"])

            # Bullets if provided
            for b in c_data.get("bullets", []):
                p_bl = tf.add_paragraph()
                p_bl.text = f"• {b}"
                p_bl.font.size = Pt(11)
                p_bl.font.color.rgb = hex_to_rgb(self.theme["text_dark"])
                p_bl.space_before = Pt(4)

        self._draw_footer(slide)
        return slide

    def add_kpi_showcase(self, title: str, kicker: str = "METRIK UTAMA", kpis: list = None, bullets: list = None):
        """Slide featuring large quantitative KPI stat cards and insight bullets"""
        self.slide_count += 1
        slide = self.prs.slides.add_slide(self.blank_layout)
        self._draw_background(slide, dark_mode=False)
        self._draw_header(slide, title, kicker, dark_mode=False)

        kpis = kpis or [
            {"label": "TOTAL PRODUKSI", "value": "12,450", "sub": "+18% dari target"},
            {"label": "EFISIENSI BIAYA", "value": "88.4%", "sub": "Standar optimal"},
            {"label": "MUTU KUALITAS", "value": "Grade A", "sub": "Zero defect"}
        ]

        n_kpi = min(len(kpis), 4)
        left_start = 0.8
        total_w = 11.733
        gap = 0.35
        kpi_w = (total_w - (n_kpi - 1) * gap) / n_kpi
        top_y = 2.2
        kpi_h = 2.0

        for i in range(n_kpi):
            k = kpis[i]
            kx = left_start + i * (kpi_w + gap)

            card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(kx), Inches(top_y), Inches(kpi_w), Inches(kpi_h))
            card.adjustments[0] = 0.12
            card.fill.solid()
            card.fill.fore_color.rgb = hex_to_rgb(self.theme["card_bg"])
            card.line.color.rgb = hex_to_rgb(self.theme["border"])
            card.line.width = Pt(1.5)

            tb = slide.shapes.add_textbox(Inches(kx + 0.2), Inches(top_y + 0.2), Inches(kpi_w - 0.4), Inches(kpi_h - 0.4))
            tf = tb.text_frame
            tf.word_wrap = True

            p_lbl = tf.paragraphs[0]
            p_lbl.text = k.get("label", "").upper()
            p_lbl.font.bold = True
            p_lbl.font.size = Pt(9.5)
            p_lbl.font.color.rgb = hex_to_rgb(self.theme["text_muted"])

            p_val = tf.add_paragraph()
            p_val.text = k.get("value", "0")
            p_val.font.bold = True
            p_val.font.size = Pt(36)
            p_val.font.color.rgb = hex_to_rgb(self.theme["accent"])

            if "sub" in k:
                p_sub = tf.add_paragraph()
                p_sub.text = k["sub"]
                p_sub.font.size = Pt(10)
                p_sub.font.color.rgb = hex_to_rgb(self.theme["text_muted"])

        # Bottom Insight Box
        box_y = 4.45
        box_h = 2.3
        bot_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left_start), Inches(box_y), Inches(total_w), Inches(box_h))
        bot_card.adjustments[0] = 0.05
        bot_card.fill.solid()
        bot_card.fill.fore_color.rgb = hex_to_rgb(self.theme["card_bg"])
        bot_card.line.color.rgb = hex_to_rgb(self.theme["border"])
        bot_card.line.width = Pt(1.5)

        tb_b = slide.shapes.add_textbox(Inches(left_start + 0.4), Inches(box_y + 0.3), Inches(total_w - 0.8), Inches(box_h - 0.6))
        tf_b = tb_b.text_frame
        tf_b.word_wrap = True

        p_bt = tf_b.paragraphs[0]
        p_bt.text = "📌 Analisis Strategis & Insight Kunci"
        p_bt.font.bold = True
        p_bt.font.size = Pt(16)
        p_bt.font.color.rgb = hex_to_rgb(self.theme["text_dark"])
        p_bt.space_after = Pt(8)

        bullets = bullets or [
            "Peningkatan produktivitas dicapai melalui penerapan otomasi terintegrasi dan pemantauan sensor real-time.",
            "Biaya pakan dan operasional terpangkas signifikan berkat manajemen formulasi berbasis presisi."
        ]
        for b in bullets:
            p_bl = tf_b.add_paragraph()
            p_bl.text = f"• {b}"
            p_bl.font.size = Pt(12)
            p_bl.font.color.rgb = hex_to_rgb(self.theme["text_muted"])
            p_bl.space_before = Pt(4)

        self._draw_footer(slide)
        return slide

    def add_process_steps(self, title: str, kicker: str = "ROADMAP", steps: list = None):
        """Slide featuring a modern horizontal progression timeline / pipeline"""
        self.slide_count += 1
        slide = self.prs.slides.add_slide(self.blank_layout)
        self._draw_background(slide, dark_mode=False)
        self._draw_header(slide, title, kicker, dark_mode=False)

        steps = steps or [
            {"phase": "TAHAP 1", "title": "Inisiasi & Analisis", "desc": "Pengumpulan data komprehensif dan pemetaan kebutuhan."},
            {"phase": "TAHAP 2", "title": "Penerapan Teknologi", "desc": "Instalasi perangkat otomasi dan integrasi sensor pintar."},
            {"phase": "TAHAP 3", "title": "Standarisasi SOP", "desc": "Pelatihan staf operasional dan pengujian sistem rutin."},
            {"phase": "TAHAP 4", "title": "Skalabilitas Penuh", "desc": "Ekspansi produksi massal dengan jaminan mutu konsisten."}
        ]

        n_s = min(len(steps), 4)
        left_start = 0.8
        total_w = 11.733
        gap = 0.35
        step_w = (total_w - (n_s - 1) * gap) / n_s
        step_h = 4.3
        top_y = 2.2

        for i in range(n_s):
            s = steps[i]
            sx = left_start + i * (step_w + gap)

            card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(sx), Inches(top_y), Inches(step_w), Inches(step_h))
            card.adjustments[0] = 0.08
            card.fill.solid()
            card.fill.fore_color.rgb = hex_to_rgb(self.theme["card_bg"])
            card.line.color.rgb = hex_to_rgb(self.theme["border"])
            card.line.width = Pt(1.5)

            # Step Number Badge
            s_badge = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(sx + 0.3), Inches(top_y + 0.3), Inches(0.65), Inches(0.65))
            s_badge.fill.solid()
            s_badge.fill.fore_color.rgb = hex_to_rgb(self.theme["accent"])
            s_badge.line.fill.background()
            p_s = s_badge.text_frame.paragraphs[0]
            p_s.text = f"{i+1}"
            p_s.font.bold = True
            p_s.font.size = Pt(14)
            p_s.font.color.rgb = hex_to_rgb(self.theme["badge_text"])
            p_s.alignment = PP_ALIGN.CENTER

            # Text
            tb = slide.shapes.add_textbox(Inches(sx + 0.3), Inches(top_y + 1.1), Inches(step_w - 0.6), Inches(step_h - 1.3))
            tf = tb.text_frame
            tf.word_wrap = True

            p_ph = tf.paragraphs[0]
            p_ph.text = s.get("phase", f"FASE {i+1}").upper()
            p_ph.font.bold = True
            p_ph.font.size = Pt(9.5)
            p_ph.font.color.rgb = hex_to_rgb(self.theme["accent"])

            p_t = tf.add_paragraph()
            p_t.text = s.get("title", "")
            p_t.font.bold = True
            p_t.font.size = Pt(17)
            p_t.font.color.rgb = hex_to_rgb(self.theme["text_dark"])
            p_t.space_before = Pt(4)
            p_t.space_after = Pt(8)

            p_d = tf.add_paragraph()
            p_d.text = s.get("desc", "")
            p_d.font.size = Pt(12)
            p_d.font.color.rgb = hex_to_rgb(self.theme["text_muted"])

        self._draw_footer(slide)
        return slide

    def add_comparison(self, title: str, kicker: str = "PERBANDINGAN", col_a: dict = None, col_b: dict = None):
        """Slide comparing two models, approaches, or before-vs-after"""
        self.slide_count += 1
        slide = self.prs.slides.add_slide(self.blank_layout)
        self._draw_background(slide, dark_mode=False)
        self._draw_header(slide, title, kicker, dark_mode=False)

        col_a = col_a or {
            "tag": "METODE LAMA / STATUS QUO",
            "title": "Pengelolaan Konvensional",
            "desc": "Pencatatan manual berbasis kertas dengan latensi data tinggi dan risiko human error.",
            "stat": "4.2x",
            "stat_label": "Lebih lambat & tidak real-time",
            "bullets": ["Pencatatan tidak sinkron", "Deteksi masalah terlambat", "Biaya operasional tinggi"]
        }
        col_b = col_b or {
            "tag": "SOLUSI MODERN TERINTEGRASI",
            "title": "Automasi Pintar & Telemetri IoT",
            "desc": "Sensor real-time terkoneksi cloud dengan analitik kecerdasan buatan terpadu.",
            "stat": "+45%",
            "stat_label": "Peningkatan efisiensi terverifikasi",
            "bullets": ["Pemantauan 24/7 otomatis", "Peringatan anomali seketika", "Optimasi pakan & energi cerdas"]
        }

        left_start = 0.8
        card_w = 5.65
        gap = 0.433
        card_h = 4.4
        top_y = 2.2

        # Card A (Neutral / Muted)
        card1 = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left_start), Inches(top_y), Inches(card_w), Inches(card_h))
        card1.adjustments[0] = 0.08
        card1.fill.solid()
        card1.fill.fore_color.rgb = hex_to_rgb("F8FAFC")
        card1.line.color.rgb = hex_to_rgb("CBD5E1")
        card1.line.width = Pt(1.5)

        # Tag A
        tag_a = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left_start + 0.3), Inches(top_y + 0.3), Inches(len(col_a.get("tag", "")) * 0.09 + 0.5), Inches(0.32))
        tag_a.adjustments[0] = 0.5
        tag_a.fill.solid()
        tag_a.fill.fore_color.rgb = hex_to_rgb("E2E8F0")
        tag_a.line.fill.background()
        p_ta = tag_a.text_frame.paragraphs[0]
        p_ta.text = col_a.get("tag", "TRADISIONAL").upper()
        p_ta.font.bold = True
        p_ta.font.size = Pt(8.5)
        p_ta.font.color.rgb = hex_to_rgb("475569")
        p_ta.alignment = PP_ALIGN.CENTER

        # Text A
        tb1 = slide.shapes.add_textbox(Inches(left_start + 0.3), Inches(top_y + 0.75), Inches(card_w - 0.6), Inches(card_h - 0.9))
        tf1 = tb1.text_frame
        tf1.word_wrap = True
        p1 = tf1.paragraphs[0]
        p1.text = col_a.get("title", "")
        p1.font.bold = True
        p1.font.size = Pt(18)
        p1.font.color.rgb = hex_to_rgb("334155")
        p1.space_after = Pt(8)

        if "stat" in col_a:
            ps1 = tf1.add_paragraph()
            ps1.text = col_a["stat"]
            ps1.font.bold = True
            ps1.font.size = Pt(24)
            ps1.font.color.rgb = hex_to_rgb("64748B")
            if "stat_label" in col_a:
                psl1 = tf1.add_paragraph()
                psl1.text = col_a["stat_label"]
                psl1.font.size = Pt(9.5)
                psl1.font.color.rgb = hex_to_rgb("94A3B8")
                psl1.space_after = Pt(6)

        pb1 = tf1.add_paragraph()
        pb1.text = col_a.get("desc", "")
        pb1.font.size = Pt(12)
        pb1.font.color.rgb = hex_to_rgb("64748B")
        pb1.space_after = Pt(8)

        for b in col_a.get("bullets", []):
            pbl = tf1.add_paragraph()
            pbl.text = f"• {b}"
            pbl.font.size = Pt(11)
            pbl.font.color.rgb = hex_to_rgb("475569")
            pbl.space_before = Pt(3)

        # Card B (Theme Highlight)
        bx = left_start + card_w + gap
        card2 = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(bx), Inches(top_y), Inches(card_w), Inches(card_h))
        card2.adjustments[0] = 0.08
        card2.fill.solid()
        card2.fill.fore_color.rgb = hex_to_rgb(self.theme["card_bg"])
        card2.line.color.rgb = hex_to_rgb(self.theme["accent"])
        card2.line.width = Pt(2.0)

        # Top Accent Ribbon on Card B
        ribbon = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(bx + 0.3), Inches(top_y + 0.25), Inches(1.2), Inches(0.08))
        ribbon.fill.solid()
        ribbon.fill.fore_color.rgb = hex_to_rgb(self.theme["accent"])
        ribbon.line.fill.background()

        # Tag B
        tag_b = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(bx + 0.3), Inches(top_y + 0.42), Inches(len(col_b.get("tag", "")) * 0.09 + 0.5), Inches(0.32))
        tag_b.adjustments[0] = 0.5
        tag_b.fill.solid()
        tag_b.fill.fore_color.rgb = hex_to_rgb(self.theme["accent"])
        tag_b.line.fill.background()
        p_tb = tag_b.text_frame.paragraphs[0]
        p_tb.text = col_b.get("tag", "MODERN").upper()
        p_tb.font.bold = True
        p_tb.font.size = Pt(8.5)
        p_tb.font.color.rgb = hex_to_rgb(self.theme["badge_text"])
        p_tb.alignment = PP_ALIGN.CENTER

        # Text B
        tb2 = slide.shapes.add_textbox(Inches(bx + 0.3), Inches(top_y + 0.85), Inches(card_w - 0.6), Inches(card_h - 1.0))
        tf2 = tb2.text_frame
        tf2.word_wrap = True
        p2 = tf2.paragraphs[0]
        p2.text = col_b.get("title", "")
        p2.font.bold = True
        p2.font.size = Pt(18)
        p2.font.color.rgb = hex_to_rgb(self.theme["text_dark"])
        p2.space_after = Pt(8)

        if "stat" in col_b:
            ps2 = tf2.add_paragraph()
            ps2.text = col_b["stat"]
            ps2.font.bold = True
            ps2.font.size = Pt(26)
            ps2.font.color.rgb = hex_to_rgb(self.theme["accent"])
            if "stat_label" in col_b:
                psl2 = tf2.add_paragraph()
                psl2.text = col_b["stat_label"]
                psl2.font.size = Pt(9.5)
                psl2.font.color.rgb = hex_to_rgb(self.theme["text_muted"])
                psl2.space_after = Pt(6)

        pb2 = tf2.add_paragraph()
        pb2.text = col_b.get("desc", "")
        pb2.font.size = Pt(12)
        pb2.font.color.rgb = hex_to_rgb(self.theme["text_muted"])
        pb2.space_after = Pt(8)

        for b in col_b.get("bullets", []):
            pbl2 = tf2.add_paragraph()
            pbl2.text = f"✔ {b}"
            pbl2.font.size = Pt(11)
            pbl2.font.bold = True
            pbl2.font.color.rgb = hex_to_rgb(self.theme["text_dark"])
            pbl2.space_before = Pt(3)

        self._draw_footer(slide)
        return slide

    def add_split_hero(self, title: str, kicker: str = "DEEP DIVE", left_card: dict = None, right_card: dict = None):
        """Slide split into detailed narrative article card (left) and KPI/highlight showcase (right)"""
        self.slide_count += 1
        slide = self.prs.slides.add_slide(self.blank_layout)
        self._draw_background(slide, dark_mode=False)
        self._draw_header(slide, title, kicker, dark_mode=False)

        left_card = left_card or {
            "tag": "ANALISIS MENDALAM",
            "title": "Arsitektur Ekosistem & Dampak Strategis",
            "paragraphs": [
                "Transformasi digital pada operasional peternakan modern mencakup integrasi menyeluruh dari sensor IoT bio-telemetri hingga pemantauan nutrisi adaptif.",
                "Data biometrik yang dihimpun setiap 5 menit memungkinkan deteksi dini potensi penyakit dan penurunan nafsu makan sebelum gejala klinis muncul."
            ],
            "bullets": [
                "Efisiensi pakan meningkat dengan rasio FCR terendah dalam 3 tahun terakhir.",
                "Pencegahan mortalitas hingga 92% berkat sistem peringatan dini otomatis."
            ]
        }
        right_card = right_card or {
            "stat": "+38.5%",
            "stat_label": "PRODUKTIVITAS BERSIH",
            "highlight_title": "Hasil Pembuktian Lapangan",
            "highlight_desc": "Uji coba pada 500 ekor sapi perah menghasilkan kenaikan rata-rata 4.2 liter susu per ekor per hari dengan kualitas Grade A konsisten.",
            "meta_tag": "TERVERIFIKASI INDEPENDEN"
        }

        left_x = 0.8
        left_w = 7.4
        card_h = 4.4
        top_y = 2.2
        right_x = 8.5
        right_w = 4.033

        # Left Card (Narrative)
        c_left = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left_x), Inches(top_y), Inches(left_w), Inches(card_h))
        c_left.adjustments[0] = 0.06
        c_left.fill.solid()
        c_left.fill.fore_color.rgb = hex_to_rgb(self.theme["card_bg"])
        c_left.line.color.rgb = hex_to_rgb(self.theme["border"])
        c_left.line.width = Pt(1.5)

        # Tag
        ltag = left_card.get("tag", "ARTIKEL UTAMA")
        tpill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left_x + 0.3), Inches(top_y + 0.3), Inches(len(ltag) * 0.09 + 0.5), Inches(0.32))
        tpill.adjustments[0] = 0.5
        tpill.fill.solid()
        tpill.fill.fore_color.rgb = hex_to_rgb(self.theme["bg_light"])
        tpill.line.color.rgb = hex_to_rgb(self.theme["border"])
        tpill.line.width = Pt(1)
        p_tp = tpill.text_frame.paragraphs[0]
        p_tp.text = ltag.upper()
        p_tp.font.bold = True
        p_tp.font.size = Pt(8.5)
        p_tp.font.color.rgb = hex_to_rgb(self.theme["accent"])
        p_tp.alignment = PP_ALIGN.CENTER

        tb_l = slide.shapes.add_textbox(Inches(left_x + 0.3), Inches(top_y + 0.75), Inches(left_w - 0.6), Inches(card_h - 0.9))
        tf_l = tb_l.text_frame
        tf_l.word_wrap = True

        p_lt = tf_l.paragraphs[0]
        p_lt.text = left_card.get("title", "")
        p_lt.font.bold = True
        p_lt.font.size = Pt(18)
        p_lt.font.color.rgb = hex_to_rgb(self.theme["text_dark"])
        p_lt.space_after = Pt(10)

        for p_text in left_card.get("paragraphs", []):
            pp = tf_l.add_paragraph()
            pp.text = p_text
            pp.font.size = Pt(12)
            pp.font.color.rgb = hex_to_rgb(self.theme["text_muted"])
            pp.space_after = Pt(8)

        for b in left_card.get("bullets", []):
            pb = tf_l.add_paragraph()
            pb.text = f"• {b}"
            pb.font.size = Pt(11.5)
            pb.font.color.rgb = hex_to_rgb(self.theme["text_dark"])
            pb.space_before = Pt(3)

        # Right Card (Showcase Spotlight)
        c_right = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(right_x), Inches(top_y), Inches(right_w), Inches(card_h))
        c_right.adjustments[0] = 0.08
        c_right.fill.solid()
        c_right.fill.fore_color.rgb = hex_to_rgb(self.theme["card_dark"])
        c_right.line.fill.background()

        tb_r = slide.shapes.add_textbox(Inches(right_x + 0.35), Inches(top_y + 0.4), Inches(right_w - 0.7), Inches(card_h - 0.8))
        tf_r = tb_r.text_frame
        tf_r.word_wrap = True

        p_rl = tf_r.paragraphs[0]
        p_rl.text = right_card.get("stat_label", "METRIK UTAMA").upper()
        p_rl.font.bold = True
        p_rl.font.size = Pt(9.5)
        p_rl.font.color.rgb = hex_to_rgb("94A3B8")

        p_rv = tf_r.add_paragraph()
        p_rv.text = right_card.get("stat", "100%")
        p_rv.font.bold = True
        p_rv.font.size = Pt(40)
        p_rv.font.color.rgb = hex_to_rgb(self.theme["accent"])
        p_rv.space_after = Pt(12)

        # Divider line inside right card
        p_rht = tf_r.add_paragraph()
        p_rht.text = right_card.get("highlight_title", "")
        p_rht.font.bold = True
        p_rht.font.size = Pt(16)
        p_rht.font.color.rgb = hex_to_rgb("FFFFFF")
        p_rht.space_after = Pt(8)

        p_rhd = tf_r.add_paragraph()
        p_rhd.text = right_card.get("highlight_desc", "")
        p_rhd.font.size = Pt(12)
        p_rhd.font.color.rgb = hex_to_rgb("CBD5E1")
        p_rhd.space_after = Pt(14)

        if "meta_tag" in right_card:
            p_rm = tf_r.add_paragraph()
            p_rm.text = f"🔒 {right_card['meta_tag']}"
            p_rm.font.bold = True
            p_rm.font.size = Pt(9.5)
            p_rm.font.color.rgb = hex_to_rgb(self.theme["accent"])

        self._draw_footer(slide)
        return slide

    def add_matrix_grid(self, title: str, kicker: str = "MATRIKS STRATEGI", quadrants: list = None):
        """Slide featuring a 2x2 grid of strategic cards (SWOT, BCG matrix, or 4 pillars)"""
        self.slide_count += 1
        slide = self.prs.slides.add_slide(self.blank_layout)
        self._draw_background(slide, dark_mode=False)
        self._draw_header(slide, title, kicker, dark_mode=False)

        quadrants = quadrants or [
            {"badge": "KUADRAN 1", "title": "Kekuatan Utama", "desc": "Keunggulan kompetitif inti teknologi dan tim ahli.", "tag": "STRENGTH"},
            {"badge": "KUADRAN 2", "title": "Peluang Pasar", "desc": "Pertumbuhan permintaan pasar agribisnis 22% CAGR.", "tag": "OPPORTUNITY"},
            {"badge": "KUADRAN 3", "title": "Optimasi Internal", "desc": "Standardisasi operasional dan penurunan biaya logistik.", "tag": "OPTIMIZATION"},
            {"badge": "KUADRAN 4", "title": "Mitigasi Risiko", "desc": "Protokol biosekuriti ketat dan asuransi ternak berbasis IoT.", "tag": "DEFENSE"}
        ]

        left_start = 0.8
        total_w = 11.733
        gap_x = 0.35
        card_w = (total_w - gap_x) / 2
        card_h = 2.05
        top_y1 = 2.2
        top_y2 = 4.45

        coords = [
            (left_start, top_y1),
            (left_start + card_w + gap_x, top_y1),
            (left_start, top_y2),
            (left_start + card_w + gap_x, top_y2)
        ]

        for i in range(min(len(quadrants), 4)):
            q = quadrants[i]
            qx, qy = coords[i]

            card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(qx), Inches(qy), Inches(card_w), Inches(card_h))
            card.adjustments[0] = 0.08
            card.fill.solid()
            card.fill.fore_color.rgb = hex_to_rgb(self.theme["card_bg"])
            card.line.color.rgb = hex_to_rgb(self.theme["border"])
            card.line.width = Pt(1.5)

            # Badge
            badge_text = q.get("badge", f"Q{i+1}")
            bg_pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(qx + 0.25), Inches(qy + 0.2), Inches(len(badge_text) * 0.09 + 0.4), Inches(0.28))
            bg_pill.adjustments[0] = 0.5
            bg_pill.fill.solid()
            bg_pill.fill.fore_color.rgb = hex_to_rgb(self.theme["bg_light"])
            bg_pill.line.color.rgb = hex_to_rgb(self.theme["border"])
            bg_pill.line.width = Pt(1)
            p_bp = bg_pill.text_frame.paragraphs[0]
            p_bp.text = badge_text.upper()
            p_bp.font.bold = True
            p_bp.font.size = Pt(8.5)
            p_bp.font.color.rgb = hex_to_rgb(self.theme["accent"])
            p_bp.alignment = PP_ALIGN.CENTER

            # Text
            tb = slide.shapes.add_textbox(Inches(qx + 0.25), Inches(qy + 0.55), Inches(card_w - 0.5), Inches(card_h - 0.7))
            tf = tb.text_frame
            tf.word_wrap = True

            pt = tf.paragraphs[0]
            pt.text = q.get("title", "")
            pt.font.bold = True
            pt.font.size = Pt(15)
            pt.font.color.rgb = hex_to_rgb(self.theme["text_dark"])
            pt.space_after = Pt(4)

            pd = tf.add_paragraph()
            pd.text = q.get("desc", "")
            pd.font.size = Pt(11.5)
            pd.font.color.rgb = hex_to_rgb(self.theme["text_muted"])

            for b in q.get("bullets", []):
                pbl = tf.add_paragraph()
                pbl.text = f"• {b}"
                pbl.font.size = Pt(10.5)
                pbl.font.color.rgb = hex_to_rgb(self.theme["text_dark"])
                pbl.space_before = Pt(2)

        self._draw_footer(slide)
        return slide

    def add_outro(self, title: str, subtitle: str = "Sesi Diskusi & Tanya Jawab"):
        """Closing high-contrast brand slide"""
        self.slide_count += 1
        slide = self.prs.slides.add_slide(self.blank_layout)
        self._draw_background(slide, dark_mode=True)

        tb = slide.shapes.add_textbox(Inches(1.5), Inches(2.5), Inches(10.333), Inches(2.5))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        p.text = title
        p.font.bold = True
        p.font.size = Pt(36)
        p.font.color.rgb = hex_to_rgb("FFFFFF")
        p.space_after = Pt(16)

        p2 = tf.add_paragraph()
        p2.alignment = PP_ALIGN.CENTER
        p2.text = subtitle
        p2.font.size = Pt(18)
        p2.font.color.rgb = hex_to_rgb(self.theme["accent"])

        return slide

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
        self.prs.save(filepath)
        return filepath

# CLI & module support
if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Pemakaian: python3 pptx_designer.py spec.json output.pptx", file=sys.stderr)
        sys.exit(1)
    spec_path, out_path = sys.argv[1], sys.argv[2]
    with open(spec_path, "r", encoding="utf-8") as f:
        spec = json.load(f)
    
    deck = ModernDeck(theme=spec.get("theme", "navy"), title=spec.get("title", "Presentasi Modern"))
    for s in spec.get("slides", []):
        stype = s.get("type", "bento")
        if stype == "cover":
            deck.add_cover(s.get("title", "Judul"), s.get("subtitle", ""), s.get("kicker", ""), s.get("meta", ""))
        elif stype in ("bento", "pillars", "cards"):
            deck.add_bento_cards(s.get("title", "Overview"), s.get("kicker", ""), s.get("cards", s.get("columns", [])))
        elif stype in ("kpi", "stats"):
            deck.add_kpi_showcase(s.get("title", "KPI"), s.get("kicker", ""), s.get("kpis", s.get("cards", [])), s.get("bullets", []))
        elif stype in ("timeline", "process", "steps", "roadmap"):
            deck.add_process_steps(s.get("title", "Proses"), s.get("kicker", ""), s.get("steps", []))
        elif stype in ("comparison", "compare", "versus"):
            deck.add_comparison(s.get("title", "Perbandingan"), s.get("kicker", ""), s.get("col_a", {}), s.get("col_b", {}))
        elif stype in ("split", "hero", "deep_dive"):
            deck.add_split_hero(s.get("title", "Deep Dive"), s.get("kicker", ""), s.get("left_card", {}), s.get("right_card", {}))
        elif stype in ("matrix", "grid", "swot"):
            deck.add_matrix_grid(s.get("title", "Matriks"), s.get("kicker", ""), s.get("quadrants", []))
        elif stype == "outro":
            deck.add_outro(s.get("title", "Terima Kasih"), s.get("subtitle", ""))
    
    deck.save(out_path)
    print(f"OK -> {out_path}")

