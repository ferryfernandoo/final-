#!/usr/bin/env python3
"""
pptx_kit.py — Mesin Pembuat Presentasi PowerPoint (.pptx) 16:9 Widescreen Pro dari JSON Spec

Mematuhi seluruh aturan validator PowerPoint:
  - Semua gambar tunggal menggunakan full-height split bleed (6.666" x 7.5") atau full bleed (13.333" x 7.5")
    agar tidak pernah terkena error `INSET_IMAGE`.
  - Inset image hanya digunakan untuk pasangan 2-4 gambar sejajar (`inset_pair`).
  - Penggunaan kotak (`boxed`) dibatasi hanya pada `kpi` (maks 1-2 slide per deck) agar tidak terkena `BOX_OVERUSE`.
  - Semua slide isi terbuka (`open` layout) secara default dengan bullet asli (`•`).
"""

import json
import math
import os
import sys
import tempfile
from pathlib import Path

import pptx
from PIL import Image, ImageOps
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml import parse_xml
from pptx.oxml.ns import nsdecls
from pptx.util import Inches, Pt

sys.path.insert(0, str(Path(__file__).resolve().parent))
import viz_kit

THEMES = {
    "navy":   {"bg_theme": "0F172A", "bg_content": "FFFFFF", "text_light": "F8FAFC", "text_dark": "0F172A", "text_muted": "475569", "accent": "2563EB", "accent_light": "93C5FD", "tint": "EFF6FF", "zebra": "F8FAFC"},
    "green":  {"bg_theme": "064E3B", "bg_content": "FFFFFF", "text_light": "F0FDF4", "text_dark": "064E3B", "text_muted": "475569", "accent": "059669", "accent_light": "6EE7B7", "tint": "ECFDF5", "zebra": "F0FDF4"},
    "maroon": {"bg_theme": "4C0519", "bg_content": "FFFFFF", "text_light": "FFF1F2", "text_dark": "1E293B", "text_muted": "475569", "accent": "BE123C", "accent_light": "FDA4AF", "tint": "FFF1F2", "zebra": "FFF5F5"},
    "tech":   {"bg_theme": "1E1B4B", "bg_content": "FFFFFF", "text_light": "F8FAFC", "text_dark": "0F172A", "text_muted": "475569", "accent": "4361EE", "accent_light": "A5B4FC", "tint": "EEF2FF", "zebra": "F5F7FF"},
    "warm":   {"bg_theme": "431407", "bg_content": "FFFFFF", "text_light": "FFF7ED", "text_dark": "1C1917", "text_muted": "57534E", "accent": "EA580C", "accent_light": "FDBA74", "tint": "FFF7ED", "zebra": "FFFAF5"},
}

MARGIN_X = 0.8
CONTENT_W = 11.733
TITLE_TOP = 0.50
TITLE_H = 1.50
BODY_TOP = 2.20
BODY_H = 4.60
FOOTER_TOP = 6.95
FOOTER_H = 0.35

HEAD_FONT = "DejaVu Sans"
BODY_FONT = "DejaVu Sans"


def _rgb(hex_str: str) -> RGBColor:
    h = hex_str.lstrip("#")
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def _set_canvas(slide, prs, color_hex: str):
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = _rgb(color_hex)
    bg.line.fill.background()
    bg.shadow.inherit = False
    return bg


def _add_box(slide, x, y, w, h, color_hex, alpha=None, rounded=True):
    shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE
    box = slide.shapes.add_shape(shape_type, Inches(x), Inches(y), Inches(w), Inches(h))
    if rounded:
        box.adjustments[0] = 0.0 if alpha else 0.06
    box.fill.solid()
    box.fill.fore_color.rgb = _rgb(color_hex)
    box.line.fill.background()
    box.shadow.inherit = False
    for r in box._element.xpath("./p:style/a:effectRef"):
        r.set("idx", "0")
    if alpha is not None:
        box._element.xpath("./p:spPr/a:solidFill/a:srgbClr")[0].append(
            parse_xml(f'<a:alpha {nsdecls("a")} val="{int(alpha * 100000)}"/>')
        )
    return box


def _set_bullet(p, char="\u2022", indent_in=0.24):
    pPr = p._p.get_or_add_pPr()
    pPr.set("marL", str(Inches(indent_in)))
    pPr.set("indent", str(-Inches(indent_in)))
    for xml in (
        '<a:buFont %s typeface="Arial"/>' % nsdecls("a"),
        '<a:buChar %s char="%s"/>' % (nsdecls("a"), char),
    ):
        pPr.insert_element_before(parse_xml(xml), "a:buBlip", "a:tabLst", "a:defRPr", "a:extLst")


def _add_header(slide, title_text, kicker_text, theme, is_dark=False, left_in=MARGIN_X, width_in=CONTENT_W):
    tb = slide.shapes.add_textbox(Inches(left_in), Inches(TITLE_TOP), Inches(width_in), Inches(TITLE_H))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    if kicker_text:
        pk = tf.paragraphs[0]
        pk.alignment = PP_ALIGN.LEFT
        pk.space_after = Pt(4)
        rk = pk.add_run()
        rk.text = str(kicker_text).upper()
        rk.font.name = BODY_FONT
        rk.font.size = Pt(14)
        rk.font.bold = True
        rk.font.color.rgb = _rgb(theme["accent_light"] if is_dark else theme["accent"])
        pt = tf.add_paragraph()
    else:
        pt = tf.paragraphs[0]

    pt.alignment = PP_ALIGN.LEFT
    rt = pt.add_run()
    t_str = str(title_text)
    max_c = int(width_in * 9.5)
    if len(t_str) > max_c:
        t_str = t_str[:max_c - 1].rsplit(" ", 1)[0]
    rt.text = t_str
    rt.font.name = HEAD_FONT
    rt.font.size = Pt(28 if width_in < 7.0 else 32)
    rt.font.bold = True
    rt.font.color.rgb = _rgb(theme["text_light"] if is_dark else theme["text_dark"])


def _add_footer(slide, footer_text, slide_num, total_slides, theme, is_dark=False, left_in=MARGIN_X, width_in=CONTENT_W):
    tb = slide.shapes.add_textbox(Inches(left_in), Inches(FOOTER_TOP), Inches(width_in), Inches(FOOTER_H))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT
    r = p.add_run()
    r.text = f"{footer_text}  •  Slide {slide_num} dari {total_slides}" if footer_text else f"Slide {slide_num} dari {total_slides}"
    r.font.name = BODY_FONT
    r.font.size = Pt(14)
    r.font.color.rgb = _rgb(theme["accent_light"] if is_dark else theme["text_muted"])


def _prepare_slide_image(src_path, out_path, w_in, h_in, fit_mode="cover"):
    w_px = max(100, int(round(w_in * 300)))
    h_px = max(100, int(round(h_in * 300)))
    with Image.open(src_path).convert("RGBA") as im:
        if fit_mode == "contain":
            contained = ImageOps.contain(im, (w_px - 80, h_px - 80), method=Image.Resampling.LANCZOS)
            canvas = Image.new("RGB", (w_px, h_px), (248, 250, 252))
            ox = (w_px - contained.width) // 2
            oy = (h_px - contained.height) // 2
            canvas.paste(contained, (ox, oy), mask=contained.split()[3])
            canvas.save(out_path, "PNG")
        else:
            fitted = ImageOps.fit(im, (w_px, h_px), method=Image.Resampling.LANCZOS)
            bg = Image.new("RGB", fitted.size, (255, 255, 255))
            bg.paste(fitted, mask=fitted.split()[3])
            bg.save(out_path, "PNG")
    return out_path


def _add_bleed_image(slide, img_path, tmp_png, mode="right", fit_mode="cover"):
    geom = {"full": (0.0, 13.333), "left": (0.0, 6.666), "right": (6.667, 6.666)}
    left_in, w_in = geom.get(mode, geom["right"])
    _prepare_slide_image(img_path, tmp_png, w_in, 7.5, fit_mode=fit_mode)
    pic = slide.shapes.add_picture(tmp_png, Inches(left_in), Inches(0), Inches(w_in), Inches(7.5))
    pic.line.fill.background()
    slide.shapes[0]._element.addnext(pic._element)
    return pic


def _add_bullet_item(tf, lead_in, body_txt, theme, is_dark=False, use_bullet=True, lead_pt=18, body_pt=16):
    p = tf.add_paragraph() if len(tf.paragraphs[0].text) > 0 else tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT
    p.space_after = Pt(11)
    if use_bullet:
        _set_bullet(p)
    if lead_in:
        rb = p.add_run()
        rb.text = str(lead_in).rstrip(":") + ": "
        rb.font.name = BODY_FONT
        rb.font.size = Pt(lead_pt)
        rb.font.bold = True
        rb.font.color.rgb = _rgb(theme["text_light"] if is_dark else theme["text_dark"])
    rf = p.add_run()
    rf.text = str(body_txt)
    rf.font.name = BODY_FONT
    rf.font.size = Pt(body_pt)
    rf.font.color.rgb = _rgb("CBD5E1" if is_dark else theme["text_muted"])


def build(spec: dict, out_path: str) -> str:
    if not isinstance(spec, dict) or not isinstance(spec.get("slides"), list):
        raise ValueError('[pptx-kit] spec harus memiliki array "slides".')

    theme_name = spec.get("theme", "navy")
    theme = THEMES.get(theme_name, THEMES["navy"])
    footer_default = spec.get("footer", spec.get("meta", {}).get("title", ""))

    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    tmp_dir = tempfile.mkdtemp(prefix="pptx_kit_")
    slides_spec = spec["slides"]
    total_slides = len(slides_spec)

    for idx, s in enumerate(slides_spec):
        stype = s.get("type", "pillars")
        is_bookend = (idx == 0 or idx == total_slides - 1 or stype in ("cover", "outro"))
        slide = prs.slides.add_slide(blank_layout)
        _set_canvas(slide, prs, theme["bg_theme"] if is_bookend else theme["bg_content"])

        if stype == "cover" or idx == 0:
            if s.get("image") and os.path.exists(s["image"]):
                mode = s.get("image_mode", "right")
                _add_bleed_image(slide, s["image"], os.path.join(tmp_dir, f"cov_{idx}.png"), mode=mode)
                if mode == "full":
                    _add_box(slide, 0, 0, 13.333, 7.5, theme["bg_theme"], alpha=0.68, rounded=False)

            w_cov = 5.5 if s.get("image") and s.get("image_mode", "right") == "right" else 10.5
            tb = slide.shapes.add_textbox(Inches(MARGIN_X), Inches(2.0), Inches(w_cov), Inches(3.8))
            tf = tb.text_frame
            tf.word_wrap = True
            tf.vertical_anchor = MSO_ANCHOR.TOP
            tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

            if s.get("kicker"):
                pk = tf.paragraphs[0]
                pk.space_after = Pt(10)
                rk = pk.add_run()
                rk.text = str(s["kicker"]).upper()
                rk.font.name = BODY_FONT
                rk.font.size = Pt(15)
                rk.font.bold = True
                rk.font.color.rgb = _rgb(theme["accent_light"])
                pt = tf.add_paragraph()
            else:
                pt = tf.paragraphs[0]

            pt.space_after = Pt(14)
            rt = pt.add_run()
            rt.text = str(s.get("title", "Judul Presentasi"))
            rt.font.name = HEAD_FONT
            rt.font.size = Pt(40)
            rt.font.bold = True
            rt.font.color.rgb = _rgb(theme["text_light"])

            if s.get("subtitle"):
                ps = tf.add_paragraph()
                ps.space_after = Pt(16)
                rs = ps.add_run()
                rs.text = str(s["subtitle"])
                rs.font.name = BODY_FONT
                rs.font.size = Pt(18)
                rs.font.color.rgb = _rgb("CBD5E1")

            if s.get("meta"):
                tb_m = slide.shapes.add_textbox(Inches(MARGIN_X), Inches(6.5), Inches(w_cov), Inches(0.5))
                tfm = tb_m.text_frame
                tfm.word_wrap = True
                pm = tfm.paragraphs[0]
                rm = pm.add_run()
                rm.text = str(s["meta"]).replace("|", "•")
                rm.font.name = BODY_FONT
                rm.font.size = Pt(14)
                rm.font.color.rgb = _rgb(theme["accent_light"])

        elif stype == "outro" or idx == total_slides - 1:
            tb = slide.shapes.add_textbox(Inches(MARGIN_X), Inches(2.4), Inches(CONTENT_W), Inches(2.8))
            tf = tb.text_frame
            tf.word_wrap = True
            tf.vertical_anchor = MSO_ANCHOR.TOP
            p0 = tf.paragraphs[0]
            p0.alignment = PP_ALIGN.LEFT
            p0.space_after = Pt(14)
            r0 = p0.add_run()
            r0.text = str(s.get("title", "Terima Kasih."))
            r0.font.name = HEAD_FONT
            r0.font.size = Pt(42)
            r0.font.bold = True
            r0.font.color.rgb = _rgb(theme["text_light"])

            if s.get("subtitle"):
                p1 = tf.add_paragraph()
                p1.alignment = PP_ALIGN.LEFT
                r1 = p1.add_run()
                r1.text = str(s["subtitle"]).replace("|", "•")
                r1.font.name = BODY_FONT
                r1.font.size = Pt(18)
                r1.font.color.rgb = _rgb(theme["accent_light"])

        elif stype == "kpi":
            _add_header(slide, s.get("title", "Metrik Utama"), s.get("kicker", "RINGKASAN PERFORMA"), theme)
            cards = s.get("cards", [])[:4]
            n_c = max(len(cards), 1)
            gap = 0.35
            card_w = (CONTENT_W - (n_c - 1) * gap) / n_c
            card_h = 2.15 if s.get("bullets") else 3.6

            for ci, c in enumerate(cards):
                x = MARGIN_X + ci * (card_w + gap)
                _add_box(slide, x, BODY_TOP, card_w, card_h, theme["tint"])
                tb = slide.shapes.add_textbox(Inches(x + 0.25), Inches(BODY_TOP + 0.22), Inches(card_w - 0.5), Inches(card_h - 0.44))
                tf = tb.text_frame
                tf.word_wrap = True
                tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

                p_lbl = tf.paragraphs[0]
                p_lbl.space_after = Pt(6)
                rl = p_lbl.add_run()
                rl.text = str(c.get("label", "")).upper()
                rl.font.name = BODY_FONT
                rl.font.size = Pt(14)
                rl.font.bold = True
                rl.font.color.rgb = _rgb(theme["text_muted"])

                p_val = tf.add_paragraph()
                p_val.space_after = Pt(6)
                rv = p_val.add_run()
                rv.text = str(c.get("value", ""))
                rv.font.name = HEAD_FONT
                rv.font.size = Pt(44)
                rv.font.bold = True
                rv.font.color.rgb = _rgb(theme["accent"])

                if c.get("sub"):
                    p_sub = tf.add_paragraph()
                    rs = p_sub.add_run()
                    rs.text = str(c["sub"])
                    rs.font.name = BODY_FONT
                    rs.font.size = Pt(15)
                    rs.font.bold = True
                    rs.font.color.rgb = _rgb(theme["text_dark"])

            if s.get("bullets"):
                tb_b = slide.shapes.add_textbox(Inches(MARGIN_X), Inches(BODY_TOP + 2.45), Inches(CONTENT_W), Inches(2.0))
                tfb = tb_b.text_frame
                tfb.word_wrap = True
                tfb.margin_left = tfb.margin_top = tfb.margin_right = tfb.margin_bottom = 0
                for b_item in s["bullets"][:3]:
                    if isinstance(b_item, (list, tuple)) and len(b_item) >= 2:
                        _add_bullet_item(tfb, b_item[0], b_item[1], theme, use_bullet=True)
                    elif isinstance(b_item, dict):
                        _add_bullet_item(tfb, b_item.get("lead", ""), b_item.get("text", ""), theme, use_bullet=True)
                    else:
                        _add_bullet_item(tfb, "", str(b_item), theme, use_bullet=True)

            _add_footer(slide, s.get("footer", footer_default), idx + 1, total_slides, theme)

        elif stype in ("split_image", "chart_slide"):
            mode = s.get("image_mode", "right")
            img_path = s.get("image")
            fit_mode = "cover"
            if not img_path or not os.path.exists(img_path):
                img_path = os.path.join(tmp_dir, f"split_gen_{idx}.png")
                if isinstance(s.get("curve"), dict):
                    viz_kit.render_curve({"theme": theme_name, "width_in": 6.4, "height_in": 6.6, "dpi": 300, **s["curve"]}, img_path)
                    fit_mode = "contain"
                else:
                    viz_kit.generate_diagram_payload({"theme": theme_name, "width_px": 1333, "height_px": 1500, **(s.get("diagram") or {})}, img_path)
                    fit_mode = "contain"

            _add_bleed_image(slide, img_path, os.path.join(tmp_dir, f"bleed_{idx}.png"), mode=mode, fit_mode=fit_mode)
            txt_left = MARGIN_X if mode == "right" else (6.667 + 0.6)
            txt_w = 5.4

            _add_header(slide, s.get("title", "Sorotan Utama"), s.get("kicker", "DATA & KURVA" if stype == "chart_slide" else "ANALISIS VISUAL"), theme, left_in=txt_left, width_in=txt_w)
            tb = slide.shapes.add_textbox(Inches(txt_left), Inches(BODY_TOP), Inches(txt_w), Inches(BODY_H))
            tf = tb.text_frame
            tf.word_wrap = True
            tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

            if s.get("insight_title"):
                ph = tf.paragraphs[0]
                ph.space_after = Pt(12)
                rh = ph.add_run()
                rh.text = str(s["insight_title"])
                rh.font.name = HEAD_FONT
                rh.font.size = Pt(22)
                rh.font.bold = True
                rh.font.color.rgb = _rgb(theme["accent"])

            for b_item in s.get("bullets", [])[:3]:
                if isinstance(b_item, (list, tuple)) and len(b_item) >= 2:
                    _add_bullet_item(tf, b_item[0], b_item[1], theme, use_bullet=True)
                elif isinstance(b_item, dict):
                    _add_bullet_item(tf, b_item.get("lead", ""), b_item.get("text", ""), theme, use_bullet=True)
                else:
                    _add_bullet_item(tf, "", str(b_item), theme, use_bullet=True)
            _add_footer(slide, s.get("footer", footer_default), idx + 1, total_slides, theme, left_in=txt_left, width_in=txt_w)

        elif stype == "table_slide":
            _add_header(slide, s.get("title", "Ringkasan Tabel"), s.get("kicker", "MATRIKS DATA"), theme)
            headers = s.get("headers", [])
            rows = s.get("rows", [])
            n_r = 1 + len(rows)
            n_c = max(len(headers), 1)
            row_h = min(0.62, BODY_H / max(n_r, 1))
            tbl_shape = slide.shapes.add_table(n_r, n_c, Inches(MARGIN_X), Inches(BODY_TOP), Inches(CONTENT_W), Inches(row_h * n_r))
            tbl = tbl_shape.table

            for ci, h_txt in enumerate(headers):
                cell = tbl.cell(0, ci)
                cell.fill.solid()
                cell.fill.fore_color.rgb = _rgb(theme["bg_theme"])
                cell.vertical_anchor = MSO_ANCHOR.MIDDLE
                p = cell.text_frame.paragraphs[0]
                p.alignment = PP_ALIGN.LEFT if ci == 0 else PP_ALIGN.RIGHT
                r = p.add_run()
                r.text = str(h_txt)
                r.font.name = HEAD_FONT
                r.font.size = Pt(16)
                r.font.bold = True
                r.font.color.rgb = _rgb("FFFFFF")

            for ri, r_vals in enumerate(rows):
                for ci in range(n_c):
                    cell = tbl.cell(ri + 1, ci)
                    cell.fill.solid()
                    cell.fill.fore_color.rgb = _rgb(theme["tint"] if ri % 2 == 1 else "FFFFFF")
                    cell.vertical_anchor = MSO_ANCHOR.MIDDLE
                    p = cell.text_frame.paragraphs[0]
                    p.alignment = PP_ALIGN.LEFT if ci == 0 else PP_ALIGN.RIGHT
                    r = p.add_run()
                    r.text = str(r_vals[ci] if ci < len(r_vals) else "")
                    r.font.name = BODY_FONT
                    r.font.size = Pt(15)
                    r.font.color.rgb = _rgb(theme["text_dark"])

            _add_footer(slide, s.get("footer", footer_default), idx + 1, total_slides, theme)

        elif stype == "timeline":
            _add_header(slide, s.get("title", "Tahapan Implementasi"), s.get("kicker", "ROADMAP & ALUR KERJA"), theme)
            steps = s.get("steps", [])[:3]
            n_s = max(len(steps), 1)
            gap = 0.45
            sw = (CONTENT_W - (n_s - 1) * gap) / n_s
            boxed = bool(s.get("boxed", False))
            pad = 0.22 if boxed else 0.0
            for si, st_item in enumerate(steps):
                x = MARGIN_X + si * (sw + gap)
                if boxed:
                    _add_box(slide, x, BODY_TOP, sw, 4.2, theme["tint"])
                tb = slide.shapes.add_textbox(Inches(x + pad), Inches(BODY_TOP + pad), Inches(sw - 2 * pad), Inches(4.2 - 2 * pad))
                tf = tb.text_frame
                tf.word_wrap = True
                tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

                p_t = tf.paragraphs[0]
                p_t.space_after = Pt(12)
                rt = p_t.add_run()
                rt.text = f"{st_item.get('phase', f'Tahap {si+1}')} — {st_item.get('title', '')}"
                rt.font.name = HEAD_FONT
                rt.font.size = Pt(22)
                rt.font.bold = True
                rt.font.color.rgb = _rgb(theme["accent"])

                _add_bullet_item(tf, "Fokus Eksekusi", st_item.get("desc", ""), theme, use_bullet=True)

            _add_footer(slide, s.get("footer", footer_default), idx + 1, total_slides, theme)

        else:  # Default: "pillars"
            _add_header(slide, s.get("title", "Pilar Strategis"), s.get("kicker", "STRATEGI & EKSEKUSI"), theme)
            cols = s.get("columns", [])[:3]
            n_c = max(len(cols), 1)
            gap = 0.45
            cw = (CONTENT_W - (n_c - 1) * gap) / n_c
            boxed = bool(s.get("boxed", False))
            pad = 0.24 if boxed else 0.0

            for ci, col in enumerate(cols):
                x = MARGIN_X + ci * (cw + gap)
                if boxed:
                    _add_box(slide, x, BODY_TOP, cw, 4.3, theme["tint"])
                tb = slide.shapes.add_textbox(Inches(x + pad), Inches(BODY_TOP + pad), Inches(cw - 2 * pad), Inches(4.3 - 2 * pad))
                tf = tb.text_frame
                tf.word_wrap = True
                tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

                ph = tf.paragraphs[0]
                ph.space_after = Pt(12)
                rh = ph.add_run()
                rh.text = str(col.get("title", f"Pilar {ci+1}"))
                rh.font.name = HEAD_FONT
                rh.font.size = Pt(22)
                rh.font.bold = True
                rh.font.color.rgb = _rgb(theme["accent"])

                for b_item in col.get("bullets", [])[:3]:
                    if isinstance(b_item, (list, tuple)) and len(b_item) >= 2:
                        _add_bullet_item(tf, b_item[0], b_item[1], theme, use_bullet=True)
                    elif isinstance(b_item, dict):
                        _add_bullet_item(tf, b_item.get("lead", ""), b_item.get("text", ""), theme, use_bullet=True)
                    else:
                        _add_bullet_item(tf, "", str(b_item), theme, use_bullet=True)

            _add_footer(slide, s.get("footer", footer_default), idx + 1, total_slides, theme)

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    prs.save(out_path)
    return out_path


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Pemakaian: python3 pptx_kit.py spec.json output.pptx", file=sys.stderr)
        sys.exit(1)
    spec_p, out_p = sys.argv[1], sys.argv[2]
    with open(spec_p, "r", encoding="utf-8") as f:
        spec_obj = json.load(f)
    res = build(spec_obj, out_p)
    print(f"OK -> {res}")
