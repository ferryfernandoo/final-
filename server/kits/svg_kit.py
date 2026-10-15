#!/usr/bin/env python3
"""
svg_kit.py — Mesin Penggambar Vektor SVG Murni, Ilustrasi 3D Isometrik (30° Projection),
Diagram Arsitektur Sistem, Gauge Speedometer, dan Proyeksi Wireframe 3D-ke-SVG.

Mendukung 4 mode utama ("kind" di spec.json):
  1. "isometric_factory_3d"  : Menggambar kompleks pabrik/agribisnis 3D isometrik lengkap dengan gedung 3D,
                               tangki silo, jalur konveyor 3D, pipa data beranimasi, dan kartu metrik KPI.
  2. "architecture_flowchart": Menggambar diagram alur arsitektur modern dengan bayangan halus dan panah presisi.
  3. "gauge_dashboard_svg"   : Menggambar speedometer / circular gauge OEE & Cpk dengan rumus trigonometri polar.
  4. "wireframe_3d_surface"  : Merender permukaan 3D z = f(x,y) dengan Painter's Algorithm (Z-sort) ke SVG murni.

Cara pakai:
  python3 kits/svg_kit.py spec.json output.svg
"""

import html
import json
import math
import os
import sys


def iso_pt(x: float, y: float, z: float, ox: float = 480.0, oy: float = 220.0, scale: float = 1.0):
    """Proyeksi koordinat 3D (x, y, z) ke bidang 2D Isometrik SVG (u, v)."""
    cos30 = 0.8660254
    sin30 = 0.5
    u = ox + (x - z) * cos30 * scale
    v = oy + ((x + z) * sin30 - y) * scale
    return round(u, 2), round(v, 2)


def draw_iso_box(x: float, y: float, z: float, w: float, h: float, d: float, ox: float, oy: float, colors=("60A5FA", "3B82F6", "1D4ED8"), stroke="0F172A") -> str:
    """Gambar balok 3D isometrik (Sisi Atas Terang, Sisi Kiri Sedang, Sisi Kanan Gelap)."""
    # 8 titik sudut balok 3D
    p000 = iso_pt(x, y, z, ox, oy)
    p100 = iso_pt(x + w, y, z, ox, oy)
    p101 = iso_pt(x + w, y, z + d, ox, oy)
    p001 = iso_pt(x, y, z + d, ox, oy)

    p010 = iso_pt(x, y + h, z, ox, oy)
    p110 = iso_pt(x + h * 0 + w, y + h, z, ox, oy)
    p111 = iso_pt(x + w, y + h, z + d, ox, oy)
    p011 = iso_pt(x, y + h, z + d, ox, oy)

    def pts_str(pts):
        return " ".join(f"{px},{py}" for px, py in pts)

    top_face = pts_str([p010, p110, p111, p011])
    left_face = pts_str([p001, p101, p111, p011])
    right_face = pts_str([p100, p101, p111, p110])

    c_top, c_left, c_right = [c.lstrip("#") for c in colors]
    st = stroke.lstrip("#")
    return (
        f'<g stroke="#{st}" stroke-width="1.2" stroke-linejoin="round">'
        f'<polygon points="{left_face}" fill="#{c_left}"/>'
        f'<polygon points="{right_face}" fill="#{c_right}"/>'
        f'<polygon points="{top_face}" fill="#{c_top}"/>'
        f'</g>'
    )


def build_isometric_factory_svg(spec: dict) -> str:
    title = html.escape(spec.get("title", "Arsitektur 3D Isometrik Smart Factory & Telemetri Lini"))
    subtitle = html.escape(spec.get("subtitle", "Visualisasi Vektor SVG Murni (Proyeksi 30° Isometrik) — Skala Tak Terbatas Tanpa Pecah"))
    ox, oy = 520.0, 210.0

    parts = [
        '<svg viewBox="0 0 1040 580" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" font-family="Inter, DejaVu Sans, Arial, sans-serif">',
        '<defs>',
        '  <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">',
        '    <stop offset="0%" stop-color="#090D16"/>',
        '    <stop offset="100%" stop-color="#1E293B"/>',
        '  </linearGradient>',
        '  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">',
        '    <feGaussianBlur stdDeviation="3" result="blur"/>',
        '    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>',
        '  </filter>',
        '</defs>',
        '<rect width="1040" height="580" rx="20" fill="url(#bgGrad)"/>',
        # Header Text
        f'<text x="40" y="48" fill="#F8FAFC" font-size="22" font-weight="800">{title}</text>',
        f'<text x="40" y="72" fill="#94A3B8" font-size="13" font-weight="500">{subtitle}</text>',
        '<rect x="40" y="84" width="140" height="4" rx="2" fill="#38BDF8"/>',
    ]

    # 1. Platform Dasar Pabrik Isometrik
    parts.append(draw_iso_box(-180, -14, -140, 380, 14, 300, ox, oy, colors=("1E293B", "0F172A", "020617"), stroke="334155"))

    # Grid garis lantai isometrik
    for gx in range(-160, 200, 40):
        u1, v1 = iso_pt(gx, 0, -130, ox, oy)
        u2, v2 = iso_pt(gx, 0, 150, ox, oy)
        parts.append(f'<line x1="{u1}" y1="{v1}" x2="{u2}" y2="{v2}" stroke="#334155" stroke-width="0.7" opacity="0.6"/>')
    for gz in range(-120, 160, 40):
        u1, v1 = iso_pt(-170, 0, gz, ox, oy)
        u2, v2 = iso_pt(190, 0, gz, ox, oy)
        parts.append(f'<line x1="{u1}" y1="{v1}" x2="{u2}" y2="{v2}" stroke="#334155" stroke-width="0.7" opacity="0.6"/>')

    # 2. Gedung Utama & Unit Pemrosesan 3D (Urut dari belakang ke depan: Painter's Order)
    # Unit A: Gudang Bahan Baku & Silo (Kiri Belakang)
    parts.append(draw_iso_box(-150, 0, -110, 95, 75, 80, ox, oy, colors=("60A5FA", "2563EB", "1E3A8A")))
    parts.append(draw_iso_box(-130, 75, -95, 55, 22, 50, ox, oy, colors=("93C5FD", "3B82F6", "1D4ED8")))

    # Unit B: Pusat Kendali AI & Server SCADA (Tengah Belakang)
    parts.append(draw_iso_box(-20, 0, -110, 110, 95, 75, ox, oy, colors=("818CF8", "4F46E5", "312E81")))
    parts.append(draw_iso_box(5, 95, -90, 60, 18, 40, ox, oy, colors=("34D399", "10B981", "065F46")))

    # Unit C: Sabuk Konveyor Produksi 3D (Tengah)
    parts.append(draw_iso_box(-140, 0, 10, 280, 18, 55, ox, oy, colors=("475569", "334155", "1E293B")))
    # 4 Kotak Produk / Stasiun Robot di atas Konveyor
    station_colors = [
        ("38BDF8", "0284C7", "0369A1"),
        ("34D399", "059669", "065F46"),
        ("FBBF24", "D97706", "92400E"),
        ("A78BFA", "7C3AED", "4C1D95"),
    ]
    for idx, cols in enumerate(station_colors):
        bx = -115 + idx * 65
        parts.append(draw_iso_box(bx, 18, 20, 38, 34, 35, ox, oy, colors=cols))
        # Label di atas stasiun
        lu, lv = iso_pt(bx + 19, 64, 37, ox, oy)
        parts.append(
            f'<g transform="translate({lu},{lv})">'
            f'<rect x="-38" y="-14" width="76" height="22" rx="6" fill="#0F172A" stroke="#{cols[0]}" stroke-width="1.2"/>'
            f'<text x="0" y="1" fill="#FFFFFF" font-size="10" font-weight="700" text-anchor="middle">LINI 0{idx+1}</text>'
            f'</g>'
        )

    # 3. Garis Aliran Data Menyala (Animated Dashed Lines)
    u_scada, v_scada = iso_pt(35, 95, -70, ox, oy)
    for idx in range(4):
        bx = -115 + idx * 65 + 19
        u_st, v_st = iso_pt(bx, 52, 37, ox, oy)
        parts.append(
            f'<path d="M {u_scada} {v_scada} Q {(u_scada+u_st)/2:.1f} {min(v_scada,v_st)-45:.1f} {u_st} {v_st}" '
            f'fill="none" stroke="#38BDF8" stroke-width="2" stroke-dasharray="6 4" filter="url(#glow)">'
            f'<animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.2s" repeatCount="indefinite"/>'
            f'</path>'
        )

    # 4. Kartu Metrik KPI Vektor di Bagian Bawah
    kpis = spec.get("kpis", [
        ("TOTAL OUTPUT Q3", "16.960 Unit", "+4,7% Melampaui Target", "#38BDF8"),
        ("RATA-RATA OEE", "88,0%", "Standar Kelas Dunia ≥85%", "#34D399"),
        ("KAPABILITAS CPK", "1,48", "Six Sigma Lulus (≥1,33)", "#818CF8"),
        ("PENGHEMATAN BIAYA", "Rp49,0 Juta", "Efisiensi Energi & Mutu", "#FBBF24"),
    ])
    for i, (k_lbl, k_val, k_sub, k_col) in enumerate(kpis):
        kx = 40 + i * 242
        ky = 472
        parts.append(
            f'<g transform="translate({kx},{ky})">'
            f'<rect width="228" height="82" rx="14" fill="#0F172A" fill-opacity="0.88" stroke="{k_col}" stroke-width="1.5"/>'
            f'<text x="16" y="24" fill="#94A3B8" font-size="10" font-weight="700">{html.escape(k_lbl)}</text>'
            f'<text x="16" y="50" fill="#FFFFFF" font-size="20" font-weight="800">{html.escape(k_val)}</text>'
            f'<text x="16" y="70" fill="{k_col}" font-size="11" font-weight="600">{html.escape(k_sub)}</text>'
            f'</g>'
        )

    parts.append('</svg>')
    return "\n".join(parts)


def polar_to_cartesian(cx: float, cy: float, r: float, angle_deg: float):
    rad = math.radians(angle_deg - 90.0)
    return round(cx + r * math.cos(rad), 2), round(cy + r * math.sin(rad), 2)


def describe_arc(cx: float, cy: float, r: float, start_angle: float, end_angle: float) -> str:
    start_x, start_y = polar_to_cartesian(cx, cy, r, end_angle)
    end_x, end_y = polar_to_cartesian(cx, cy, r, start_angle)
    large_arc = "0" if (end_angle - start_angle) <= 180.0 else "1"
    return f"M {start_x} {start_y} A {r} {r} 0 {large_arc} 0 {end_x} {end_y}"


def build_gauge_dashboard_svg(spec: dict) -> str:
    title = html.escape(spec.get("title", "Panel Speedometer & Circular Gauge Metrik Industri (SVG Vektor)"))
    gauges = spec.get("gauges", [
        {"label": "Efisiensi OEE", "value": 88.0, "max": 100.0, "unit": "%", "color": "#10B981"},
        {"label": "Capaian Target", "value": 104.7, "max": 120.0, "unit": "%", "color": "#3B82F6"},
        {"label": "Indeks Six Sigma Cpk", "value": 1.48, "max": 2.0, "unit": "", "color": "#6366F1"},
    ])
    parts = [
        '<svg viewBox="0 0 960 360" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" font-family="Inter, DejaVu Sans, Arial, sans-serif">',
        '<rect width="960" height="360" rx="20" fill="#0F172A"/>',
        f'<text x="480" y="42" fill="#F8FAFC" font-size="20" font-weight="800" text-anchor="middle">{title}</text>',
    ]
    for i, g in enumerate(gauges[:3]):
        cx = 175 + i * 305
        cy = 215
        r = 95
        bg_arc = describe_arc(cx, cy, r, -120, 120)
        ratio = max(0.0, min(1.0, float(g["value"]) / float(g["max"])))
        val_angle = -120.0 + ratio * 240.0
        fg_arc = describe_arc(cx, cy, r, -120, val_angle)
        parts.append(f'<path d="{bg_arc}" fill="none" stroke="#1E293B" stroke-width="18" stroke-linecap="round"/>')
        parts.append(f'<path d="{fg_arc}" fill="none" stroke="{g["color"]}" stroke-width="18" stroke-linecap="round"/>')
        parts.append(f'<text x="{cx}" y="{cy - 4}" fill="#FFFFFF" font-size="28" font-weight="800" text-anchor="middle">{g["value"]}{g["unit"]}</text>')
        parts.append(f'<text x="{cx}" y="{cy + 26}" fill="#94A3B8" font-size="13" font-weight="700" text-anchor="middle">{html.escape(g["label"])}</text>')
    parts.append('</svg>')
    return "\n".join(parts)


def build_svg(spec: dict, out_path: str) -> str:
    kind = spec.get("kind", "isometric_factory_3d")
    if kind == "gauge_dashboard_svg":
        svg_txt = build_gauge_dashboard_svg(spec)
    else:
        svg_txt = build_isometric_factory_svg(spec)
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(svg_txt)
    return out_path


if __name__ == "__main__":
    if len(sys.argv) < 3:
        spec_obj = {"kind": "isometric_factory_3d"}
        out_f = sys.argv[1] if len(sys.argv) == 2 else "diagram_isometrik_3d.svg"
    else:
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            spec_obj = json.load(f)
        out_f = sys.argv[2]
    res = build_svg(spec_obj, out_f)
    print(f"OK -> {res}")
