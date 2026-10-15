#!/usr/bin/env python3
"""
viz-kit.py — Mesin Grafik Kurva Lanjutan ("Grafik Kurva Gila") & Smart Image Payload Processor (300 DPI)
"""

import json
import math
import os
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps
from scipy.interpolate import make_interp_spline
from scipy.stats import norm

THEMES = {
    "navy":   {"primary": "#1F3A5F", "accent": "#2E75B6", "secondary": "#E07A5F", "success": "#2A9D8F", "warn": "#D97706", "danger": "#DC2626", "bg": "#FFFFFF", "grid": "#E5E7EB", "text": "#1E293B", "muted": "#64748B", "tint": "#EEF4FB"},
    "green":  {"primary": "#1B5E4A", "accent": "#3E9B7A", "secondary": "#F4A261", "success": "#10B981", "warn": "#F59E0B", "danger": "#EF4444", "bg": "#FFFFFF", "grid": "#E5E7EB", "text": "#1E293B", "muted": "#64748B", "tint": "#EDF7F3"},
    "maroon": {"primary": "#7A1F2B", "accent": "#B5485D", "secondary": "#457B9D", "success": "#2A9D8F", "warn": "#E9C46A", "danger": "#D62828", "bg": "#FFFFFF", "grid": "#E5E7EB", "text": "#1E293B", "muted": "#64748B", "tint": "#FBEFF1"},
    "tech":   {"primary": "#1E1B4B", "accent": "#4361EE", "secondary": "#F72585", "success": "#06D6A0", "warn": "#FFD166", "danger": "#EF476F", "bg": "#FFFFFF", "grid": "#E2E8F0", "text": "#0F172A", "muted": "#64748B", "tint": "#EEF0FD"},
    "warm":   {"primary": "#7A3E1D", "accent": "#D97B29", "secondary": "#2A9D8F", "success": "#38B000", "warn": "#FF9F1C", "danger": "#D90429", "bg": "#FFFFFF", "grid": "#E5E7EB", "text": "#222222", "muted": "#666666", "tint": "#FDF3EA"},
    "mono":   {"primary": "#111111", "accent": "#555555", "secondary": "#888888", "success": "#333333", "warn": "#666666", "danger": "#222222", "bg": "#FFFFFF", "grid": "#E0E0E0", "text": "#111111", "muted": "#666666", "tint": "#F2F2F2"},
}


def _apply_base_style(ax, theme, title="", subtitle="", xlabel="", ylabel=""):
    ax.set_facecolor(theme["bg"])
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("#CBD5E1")
    ax.spines["bottom"].set_color("#CBD5E1")
    ax.grid(True, linestyle="--", alpha=0.55, color=theme["grid"], zorder=0)
    ax.tick_params(colors=theme["text"], labelsize=9.5)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=10, fontweight="bold", color=theme["text"], labelpad=8)
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=10, fontweight="bold", color=theme["text"], labelpad=8)
    if title:
        pad = 22 if subtitle else 12
        ax.set_title(title, fontsize=12.5, fontweight="bold", color=theme["primary"], loc="left", pad=pad)
    if subtitle:
        ax.text(0.0, 1.02, subtitle, transform=ax.transAxes, fontsize=9.5, color=theme["muted"], va="bottom", ha="left")


def _smooth_xy(x_idx, y_vals, num_points=300):
    x_arr = np.array(x_idx, dtype=float)
    y_arr = np.array(y_vals, dtype=float)
    if len(x_arr) < 3:
        return x_arr, y_arr
    k = min(3, len(x_arr) - 1)
    x_smooth = np.linspace(x_arr.min(), x_arr.max(), num_points)
    spl = make_interp_spline(x_arr, y_arr, k=k)
    y_smooth = spl(x_smooth)
    return x_smooth, y_smooth


def render_curve(spec: dict, out_path: str) -> str:
    """Render 1 dari 9 grafik kurva profesional beresolusi tinggi (300 DPI)."""
    kind = spec.get("kind", "spline_band")
    theme_name = spec.get("theme", "navy")
    theme = THEMES.get(theme_name, THEMES["navy"])
    w_in = float(spec.get("width_in", 8.0))
    h_in = float(spec.get("height_in", 4.5))
    dpi = int(spec.get("dpi", 300))

    plt.rcParams["font.sans-serif"] = ["DejaVu Sans", "Arial", "Calibri"]
    plt.rcParams["axes.unicode_minus"] = False

    if kind == "radar_kpi":
        fig, ax = plt.subplots(figsize=(w_in, h_in), subplot_kw=dict(polar=True), dpi=dpi)
        labels = spec.get("labels", ["Kualitas", "Kecepatan", "Efisiensi", "K3", "Biaya", "Inovasi"])
        actual = spec.get("actual", [88, 92, 85, 95, 80, 84])
        target = spec.get("target", [85, 85, 85, 90, 85, 80])
        angles = np.linspace(0, 2 * np.pi, len(labels), endpoint=False).tolist()
        actual_c = list(actual) + [actual[0]]
        target_c = list(target) + [target[0]]
        angles_c = angles + [angles[0]]

        ax.plot(angles_c, target_c, "--", linewidth=1.8, color=theme["secondary"], label=spec.get("target_label", "Target"))
        ax.fill(angles_c, target_c, color=theme["secondary"], alpha=0.10)
        ax.plot(angles_c, actual_c, "o-", linewidth=2.5, color=theme["accent"], label=spec.get("actual_label", "Realisasi"))
        ax.fill(angles_c, actual_c, color=theme["accent"], alpha=0.25)
        ax.set_xticks(angles)
        ax.set_xticklabels(labels, fontsize=9.5, fontweight="bold", color=theme["text"])
        ax.set_ylim(0, max(max(actual), max(target), 100))
        ax.set_title(spec.get("title", "Radar Performa Multi-Dimensi"), fontsize=13, fontweight="bold", color=theme["primary"], pad=18)
        ax.legend(loc="upper right", bbox_to_anchor=(1.2, 1.1), frameon=True, fontsize=9)

    elif kind == "spline_band":
        fig, ax = plt.subplots(figsize=(w_in, h_in), dpi=dpi)
        labels = spec.get("labels", [f"M-{i}" for i in range(1, 9)])
        series = spec.get("series", [{"name": "Output Aktual", "values": [110, 118, 115, 129, 136, 133, 145, 152], "band": 6}])
        x_idx = np.arange(len(labels))
        palette = [theme["accent"], theme["primary"], theme["secondary"], theme["success"]]

        for s_i, s in enumerate(series):
            vals = np.array(s["values"], dtype=float)
            color = s.get("color", palette[s_i % len(palette)])
            xs, ys = _smooth_xy(x_idx, vals)
            ax.plot(xs, ys, linewidth=2.6, color=color, label=s.get("name", f"Seri {s_i+1}"), zorder=4)
            ax.scatter(x_idx, vals, color=color, s=42, zorder=5, edgecolors="white", linewidth=1.2)
            band = s.get("band")
            if band is not None:
                b_arr = np.array(band, dtype=float) if isinstance(band, list) else np.full_like(vals, float(band))
                _, b_smooth = _smooth_xy(x_idx, b_arr)
                ax.fill_between(xs, ys - b_smooth, ys + b_smooth, color=color, alpha=0.16, label=s.get("band_label", "Rentang ±1σ"))
            else:
                ax.fill_between(xs, np.min(vals) * 0.92, ys, color=color, alpha=0.10)

            if spec.get("annotate_peaks", True) and s_i == 0:
                max_i = int(np.argmax(vals))
                ax.annotate(
                    f"Puncak: {vals[max_i]:,.1f}",
                    xy=(max_i, vals[max_i]),
                    xytext=(-10, 12),
                    textcoords="offset points",
                    ha="center",
                    fontsize=8.5,
                    fontweight="bold",
                    color=theme["primary"],
                    bbox=dict(boxstyle="round,pad=0.25", fc=theme["tint"], ec=theme["accent"], lw=1),
                )

        if "target" in spec:
            t_val = float(spec["target"])
            ax.axhline(t_val, linestyle="--", linewidth=1.6, color=theme["danger"], label=spec.get("target_label", f"Target ({t_val:g})"), zorder=3)

        ax.set_xticks(x_idx)
        ax.set_xticklabels(labels)
        _apply_base_style(ax, theme, spec.get("title", "Kurva Tren & Interval Kepercayaan"), spec.get("subtitle", ""), spec.get("xlabel", ""), spec.get("ylabel", "Nilai"))
        ax.legend(frameon=True, facecolor="white", edgecolor="#E2E8F0", fontsize=9, loc="upper left")

    elif kind == "six_sigma_bell":
        fig, ax = plt.subplots(figsize=(w_in, h_in), dpi=dpi)
        mean = float(spec.get("mean", 100.0))
        std = float(spec.get("std", 2.5))
        lsl = float(spec.get("lsl", mean - 3.5 * std))
        usl = float(spec.get("usl", mean + 3.5 * std))
        target = float(spec.get("target", mean))
        samples = spec.get("samples")
        if samples:
            data = np.array(samples, dtype=float)
            mean = float(np.mean(data))
            std = float(np.std(data, ddof=1)) if len(data) > 1 else std
        else:
            rng = np.random.default_rng(42)
            data = rng.normal(mean, std, 400)

        cp = (usl - lsl) / (6.0 * std) if std > 0 else 0.0
        cpk = min((usl - mean) / (3.0 * std), (mean - lsl) / (3.0 * std)) if std > 0 else 0.0

        ax.hist(data, bins=22, density=True, color=theme["accent"], alpha=0.28, edgecolor="white", label="Distribusi Sampel")
        x_vals = np.linspace(min(lsl, mean - 4.2 * std), max(usl, mean + 4.2 * std), 400)
        y_vals = norm.pdf(x_vals, mean, std)
        ax.plot(x_vals, y_vals, color=theme["primary"], linewidth=2.8, label=f"Kurva Normal (μ={mean:.2f}, σ={std:.2f})")
        ax.fill_between(x_vals, 0, y_vals, where=(x_vals >= lsl) & (x_vals <= usl), color=theme["accent"], alpha=0.12)
        ax.fill_between(x_vals, 0, y_vals, where=(x_vals < lsl) | (x_vals > usl), color=theme["danger"], alpha=0.25, label="Area Reject (Out of Spec)")

        ax.axvline(lsl, color=theme["danger"], linestyle="--", linewidth=1.8, label=f"LSL ({lsl:g})")
        ax.axvline(usl, color=theme["danger"], linestyle="--", linewidth=1.8, label=f"USL ({usl:g})")
        ax.axvline(target, color=theme["success"], linestyle="-.", linewidth=1.8, label=f"Target ({target:g})")

        stats_txt = f"Kapabilitas Proses\nCp  = {cp:.2f}\nCpk = {cpk:.2f}\nStatus: {'KAPABEL (≥1.33)' if cpk >= 1.33 else 'PERLU PERBAIKAN'}"
        ax.text(0.98, 0.95, stats_txt, transform=ax.transAxes, va="top", ha="right", fontsize=8.5, fontweight="bold",
                color=theme["primary"], bbox=dict(boxstyle="round,pad=0.4", fc=theme["tint"], ec=theme["accent"], lw=1.2))
        _apply_base_style(ax, theme, spec.get("title", "Analisis Kapabilitas Six Sigma & Kurva Distribusi Normal"), spec.get("subtitle", ""), spec.get("xlabel", "Dimensi / Parameter"), spec.get("ylabel", "Kerapatan Probabilitas"))
        ax.legend(frameon=True, facecolor="white", edgecolor="#E2E8F0", fontsize=8.5, loc="upper left")

    elif kind == "pareto_80_20":
        fig, ax1 = plt.subplots(figsize=(w_in, h_in), dpi=dpi)
        labels = spec.get("labels", ["Mesin Macet", "Bahan Baku", "Setting Awal", "Listrik Padam", "Operator", "Lainnya"])
        values = spec.get("values", [145, 92, 48, 25, 18, 12])
        pairs = sorted(zip(labels, values), key=lambda x: x[1], reverse=True)
        s_labels = [p[0] for p in pairs]
        s_vals = np.array([p[1] for p in pairs], dtype=float)
        cum_pct = np.cumsum(s_vals) / np.sum(s_vals) * 100.0
        x_idx = np.arange(len(s_labels))

        bars = ax1.bar(x_idx, s_vals, color=theme["primary"], width=0.58, zorder=3, label=spec.get("bar_label", "Frekuensi / Jam Henti"))
        for b_i, bar in enumerate(bars):
            if b_i == 0 or cum_pct[b_i - 1] < 80.0:
                bar.set_color(theme["primary"])
            else:
                bar.set_color("#94A3B8")
            ax1.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + max(s_vals) * 0.02, f"{s_vals[b_i]:g}", ha="center", va="bottom", fontsize=8.5, fontweight="bold", color=theme["text"])

        ax1.set_xticks(x_idx)
        ax1.set_xticklabels(s_labels, rotation=15 if len(s_labels) > 5 else 0, ha="right" if len(s_labels) > 5 else "center")
        ax1.set_ylim(0, max(s_vals) * 1.18)
        _apply_base_style(ax1, theme, spec.get("title", "Analisis Pareto 80/20 Faktor Dominan"), spec.get("subtitle", ""), spec.get("xlabel", "Kategori Penyebab"), spec.get("ylabel", "Jumlah Kejadian"))

        ax2 = ax1.twinx()
        ax2.spines["top"].set_visible(False)
        xs, ys = _smooth_xy(x_idx, cum_pct)
        ax2.plot(xs, np.clip(ys, 0, 100), color=theme["secondary"], linewidth=2.6, label="Kumulatif (%)", zorder=5)
        ax2.scatter(x_idx, cum_pct, color=theme["secondary"], s=45, zorder=6, edgecolors="white", linewidth=1.2)
        ax2.axhline(80, color=theme["danger"], linestyle="--", linewidth=1.4, label="Batas 80% (Vital Few)")
        ax2.set_ylim(0, 108)
        ax2.yaxis.set_major_formatter(mticker.PercentFormatter())
        ax2.set_ylabel("Persentase Kumulatif (%)", fontsize=10, fontweight="bold", color=theme["secondary"])
        for i, pct in enumerate(cum_pct):
            ax2.annotate(f"{pct:.0f}%", (x_idx[i], cum_pct[i]), xytext=(0, 7), textcoords="offset points", ha="center", fontsize=8, fontweight="bold", color=theme["secondary"])

        lines1, labels1 = ax1.get_legend_handles_labels()
        lines2, labels2 = ax2.get_legend_handles_labels()
        ax1.legend(lines1 + lines2, labels1 + labels2, loc="center right", frameon=True, facecolor="white", fontsize=8.5)

    elif kind == "s_curve":
        fig, ax = plt.subplots(figsize=(w_in, h_in), dpi=dpi)
        labels = spec.get("labels", ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"])
        planned = np.array(spec.get("planned", [5, 14, 28, 48, 68, 84, 94, 100]), dtype=float)
        actual = np.array(spec.get("actual", [4, 13, 27, 50, 71, 86, 96, 100]), dtype=float)
        x_idx = np.arange(len(labels))
        xs_p, ys_p = _smooth_xy(x_idx, planned)
        xs_a, ys_a = _smooth_xy(np.arange(len(actual)), actual)

        ax.plot(xs_p, np.clip(ys_p, 0, 100), "--", linewidth=2.2, color=theme["muted"], label="Baseline Rencana (%)")
        ax.plot(xs_a, np.clip(ys_a, 0, 100), "-", linewidth=2.8, color=theme["accent"], label="Realisasi Aktual (%)")
        ax.scatter(np.arange(len(actual)), actual, color=theme["accent"], s=45, zorder=5, edgecolors="white")
        ax.fill_between(xs_a, 0, np.clip(ys_a, 0, 100), color=theme["accent"], alpha=0.12)
        ax.set_xticks(x_idx)
        ax.set_xticklabels(labels)
        ax.set_ylim(0, 110)
        ax.yaxis.set_major_formatter(mticker.PercentFormatter())
        _apply_base_style(ax, theme, spec.get("title", "Kurva-S Progres Kumulatif (Baseline vs Realisasi)"), spec.get("subtitle", ""), spec.get("xlabel", "Periode"), spec.get("ylabel", "Progres Kumulatif (%)"))
        ax.legend(loc="upper left", frameon=True, facecolor="white", fontsize=9)

    elif kind == "waterfall":
        fig, ax = plt.subplots(figsize=(w_in, h_in), dpi=dpi)
        labels = spec.get("labels", ["Awal", "Volume+", "Efisiensi+", "Bahan Baku-", "Lembur-", "Akhir"])
        deltas = spec.get("values", [500, 120, 65, -80, -35, 570])
        is_total = spec.get("is_total", [True, False, False, False, False, True])

        bottoms, heights, colors = [], [], []
        running = 0.0
        for val, tot in zip(deltas, is_total):
            if tot:
                bottoms.append(0.0)
                heights.append(val)
                colors.append(theme["primary"])
                running = float(val)
            else:
                if val >= 0:
                    bottoms.append(running)
                    heights.append(val)
                    colors.append(theme["success"])
                else:
                    bottoms.append(running + val)
                    heights.append(abs(val))
                    colors.append(theme["danger"])
                running += float(val)

        x_idx = np.arange(len(labels))
        bars = ax.bar(x_idx, heights, bottom=bottoms, color=colors, width=0.55, zorder=3)
        for i, (bar, val, tot) in enumerate(zip(bars, deltas, is_total)):
            y_top = bottoms[i] + heights[i]
            prefix = "" if tot or val < 0 else "+"
            ax.text(bar.get_x() + bar.get_width() / 2, y_top + max(heights) * 0.02, f"{prefix}{val:,.0f}", ha="center", va="bottom", fontsize=8.5, fontweight="bold", color=theme["text"])
            if i < len(labels) - 1:
                conn_y = val if tot else (bottoms[i] + heights[i] if val >= 0 else bottoms[i])
                ax.plot([x_idx[i] + 0.275, x_idx[i + 1] - 0.275], [conn_y, conn_y], ":", color=theme["muted"], linewidth=1.2)

        ax.set_xticks(x_idx)
        ax.set_xticklabels(labels)
        ax.set_ylim(0, max(b + h for b, h in zip(bottoms, heights)) * 1.18)
        _apply_base_style(ax, theme, spec.get("title", "Analisis Jembatan Varians (Waterfall Bridge)"), spec.get("subtitle", ""), spec.get("xlabel", ""), spec.get("ylabel", spec.get("ylabel", "Nilai")))

    elif kind == "heatmap":
        fig, ax = plt.subplots(figsize=(w_in, h_in), dpi=dpi)
        row_labels = spec.get("row_labels", ["Shift 1", "Shift 2", "Shift 3"])
        col_labels = spec.get("col_labels", ["Lini 1", "Lini 2", "Lini 3", "Lini 4"])
        matrix = np.array(spec.get("matrix", [[94, 91, 88, 95], [89, 93, 85, 90], [86, 88, 82, 87]]), dtype=float)
        im = ax.imshow(matrix, cmap=spec.get("cmap", "YlGnBu"), aspect="auto")
        ax.set_xticks(np.arange(len(col_labels)))
        ax.set_yticks(np.arange(len(row_labels)))
        ax.set_xticklabels(col_labels, fontweight="bold")
        ax.set_yticklabels(row_labels, fontweight="bold")
        mid = (matrix.max() + matrix.min()) / 2.0
        for i in range(matrix.shape[0]):
            for j in range(matrix.shape[1]):
                val = matrix[i, j]
                ax.text(j, i, f"{val:g}{spec.get('unit', '%')}", ha="center", va="center",
                        color="white" if val > mid else "#0F172A", fontsize=10, fontweight="bold")
        ax.set_title(spec.get("title", "Peta Panas (Heatmap) Matriks Performa"), fontsize=13, fontweight="bold", color=theme["primary"], loc="left", pad=14)
        fig.colorbar(im, ax=ax, shrink=0.85)

    elif kind == "fan_forecast":
        fig, ax = plt.subplots(figsize=(w_in, h_in), dpi=dpi)
        hist_labels = spec.get("hist_labels", ["Q1-25", "Q2-25", "Q3-25", "Q4-25", "Q1-26", "Q2-26"])
        hist_vals = np.array(spec.get("hist_values", [100, 108, 115, 124, 130, 138]), dtype=float)
        fc_labels = spec.get("forecast_labels", ["Q3-26", "Q4-26", "Q1-27", "Q2-27"])
        fc_median = np.array(spec.get("forecast_median", [146, 155, 165, 176]), dtype=float)
        fc_spread = np.array(spec.get("forecast_spread", [5, 9, 14, 20]), dtype=float)

        all_labels = hist_labels + fc_labels
        x_hist = np.arange(len(hist_labels))
        x_fc = np.arange(len(hist_labels) - 1, len(all_labels))
        fc_med_full = np.concatenate([[hist_vals[-1]], fc_median])
        fc_sp_full = np.concatenate([[0.0], fc_spread])

        ax.plot(x_hist, hist_vals, "o-", color=theme["primary"], linewidth=2.6, label="Realisasi Historis")
        ax.plot(x_fc, fc_med_full, "s--", color=theme["accent"], linewidth=2.4, label="Proyeksi Median (P50)")
        ax.fill_between(x_fc, fc_med_full - fc_sp_full, fc_med_full + fc_sp_full, color=theme["accent"], alpha=0.28, label="Rentang Probabilitas 80%")
        ax.fill_between(x_fc, fc_med_full - 1.65 * fc_sp_full, fc_med_full + 1.65 * fc_sp_full, color=theme["accent"], alpha=0.14, label="Rentang Probabilitas 95%")
        ax.axvline(len(hist_labels) - 1, color=theme["muted"], linestyle=":", linewidth=1.4)
        ax.set_xticks(np.arange(len(all_labels)))
        ax.set_xticklabels(all_labels)
        _apply_base_style(ax, theme, spec.get("title", "Proyeksi Tren & Kipas Probabilitas (Forecast Fan Chart)"), spec.get("subtitle", ""), spec.get("xlabel", "Periode"), spec.get("ylabel", spec.get("ylabel", "Nilai")))
        ax.legend(loc="upper left", frameon=True, facecolor="white", fontsize=8.5)

    else:  # combo_dual
        fig, ax1 = plt.subplots(figsize=(w_in, h_in), dpi=dpi)
        labels = spec.get("labels", ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"])
        bar_vals = np.array(spec.get("bar_values", [4100, 4250, 4180, 4420, 4590, 4750]), dtype=float)
        line_vals = np.array(spec.get("line_values", [82.0, 84.5, 83.8, 86.2, 88.0, 90.4]), dtype=float)
        x_idx = np.arange(len(labels))

        bars = ax1.bar(x_idx, bar_vals, color=theme["primary"], alpha=0.88, width=0.52, label=spec.get("bar_label", "Output (Unit)"), zorder=3)
        for bar in bars:
            ax1.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + max(bar_vals) * 0.015, f"{bar.get_height():,.0f}", ha="center", va="bottom", fontsize=8, fontweight="bold", color=theme["primary"])
        ax1.set_xticks(x_idx)
        ax1.set_xticklabels(labels)
        ax1.set_ylim(0, max(bar_vals) * 1.2)
        _apply_base_style(ax1, theme, spec.get("title", "Grafik Kombinasi Volume Output vs Efisiensi (%)"), spec.get("subtitle", ""), spec.get("xlabel", "Periode"), spec.get("ylabel", spec.get("bar_label", "Output (Unit)")))

        ax2 = ax1.twinx()
        ax2.spines["top"].set_visible(False)
        xs, ys = _smooth_xy(x_idx, line_vals)
        ax2.plot(xs, ys, color=theme["secondary"], linewidth=2.8, label=spec.get("line_label", "Efisiensi (%)"), zorder=5)
        ax2.scatter(x_idx, line_vals, color=theme["secondary"], s=45, zorder=6, edgecolors="white")
        ax2.set_ylabel(spec.get("line_label", "Efisiensi (%)"), fontsize=10, fontweight="bold", color=theme["secondary"])
        ax2.set_ylim(min(line_vals) * 0.85, max(line_vals) * 1.12)

        l1, lb1 = ax1.get_legend_handles_labels()
        l2, lb2 = ax2.get_legend_handles_labels()
        ax1.legend(l1 + l2, lb1 + lb2, loc="upper left", frameon=True, facecolor="white", fontsize=8.5)

    plt.tight_layout()
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    fig.savefig(out_path, dpi=dpi, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    return out_path


def generate_diagram_payload(spec: dict, out_path: str) -> str:
    """
    Buat payload gambar diagram arsitektur bersih beresolusi tinggi.
    Otomatis memilih grid 2x2 bila rasio kanvas portrait/persegi (`w_px <= h_px * 1.15`)
    atau 1 baris horizontal bila rasio kanvas lebar (`16:9`), sehingga teks kartu tidak pernah terpotong!
    """
    theme = THEMES.get(spec.get("theme", "navy"), THEMES["navy"])
    w_px = int(spec.get("width_px", 1400))
    h_px = int(spec.get("height_px", 900))
    title = spec.get("title", "Arsitektur Sistem & Alur Operasional")
    subtitle = spec.get("subtitle", "Integrasi End-to-End: Input -> Pemrosesan -> Kontrol Kualitas -> Output")
    steps = spec.get("steps", [
        {"code": "01", "title": "Akuisisi Data", "desc": "Sensor IoT, Log Operator & Database ERP"},
        {"code": "02", "title": "Pemrosesan", "desc": "Validasi Otomatis, Kalkulasi & Optimasi"},
        {"code": "03", "title": "Kontrol Mutu", "desc": "Verifikasi Six Sigma, Pareto & Audit"},
        {"code": "04", "title": "Pelaporan", "desc": "Dashboard Real-Time & Tindak Lanjut"},
    ])

    img = Image.new("RGBA", (w_px, h_px), (244, 247, 251, 255))
    draw = ImageDraw.Draw(img)

    def hex_rgb(h):
        h = h.lstrip("#")
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

    p_rgb = hex_rgb(theme["primary"])
    a_rgb = hex_rgb(theme["accent"])
    s_rgb = hex_rgb(theme["secondary"])

    hdr_h = int(h_px * 0.19)
    draw.rectangle([0, 0, w_px, hdr_h], fill=p_rgb)
    draw.rectangle([0, hdr_h - 8, w_px, hdr_h], fill=a_rgb)

    use_grid_2x2 = (w_px <= h_px * 1.25 and len(steps) >= 4)

    try:
        f_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(min(w_px, h_px) * 0.045))
        f_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", int(min(w_px, h_px) * 0.025))
        f_num = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(min(w_px, h_px) * 0.042))
        f_card_t = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(min(w_px, h_px) * 0.028))
        f_card_d = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", int(min(w_px, h_px) * 0.022))
    except Exception:
        f_title = f_sub = f_num = f_card_t = f_card_d = ImageFont.load_default()

    draw.text((int(w_px * 0.05), int(hdr_h * 0.22)), title, fill=(255, 255, 255), font=f_title)
    draw.text((int(w_px * 0.05), int(hdr_h * 0.62)), subtitle, fill=(203, 213, 225), font=f_sub)

    margin_x = int(w_px * 0.05)
    body_top = int(h_px * 0.25)
    body_bot = int(h_px * 0.92)

    if use_grid_2x2:
        cols, rows = 2, 2
        gap_x = int(w_px * 0.04)
        gap_y = int(h_px * 0.04)
        card_w = (w_px - 2 * margin_x - gap_x) // 2
        card_h = (body_bot - body_top - gap_y) // 2
        positions = [
            (margin_x + (i % 2) * (card_w + gap_x), body_top + (i // 2) * (card_h + gap_y))
            for i in range(min(len(steps), 4))
        ]
    else:
        n = max(len(steps), 1)
        gap_x = int(w_px * 0.025)
        card_w = (w_px - 2 * margin_x - (n - 1) * gap_x) // n
        card_h = body_bot - body_top
        positions = [(margin_x + i * (card_w + gap_x), body_top) for i in range(n)]

    for i, (x0, y0) in enumerate(positions):
        st = steps[i]
        x1, y1 = x0 + card_w, y0 + card_h
        draw.rounded_rectangle([x0 + 5, y0 + 6, x1 + 5, y1 + 6], radius=18, fill=(203, 213, 225, 180))
        draw.rounded_rectangle([x0, y0, x1, y1], radius=18, fill=(255, 255, 255, 255), outline=a_rgb, width=3)
        badge_h = int(card_h * 0.24)
        draw.rounded_rectangle([x0, y0, x1, y0 + badge_h], radius=18, fill=p_rgb if i % 2 == 0 else a_rgb)
        draw.rectangle([x0, y0 + badge_h // 2, x1, y0 + badge_h], fill=p_rgb if i % 2 == 0 else a_rgb)
        draw.text((x0 + 20, y0 + int(badge_h * 0.18)), f"TAHAP {st.get('code', f'0{i+1}')}", fill=(255, 255, 255), font=f_num)

        ct = str(st.get("title", f"Tahap {i+1}"))
        cd = str(st.get("desc", ""))
        draw.text((x0 + 20, y0 + badge_h + 20), ct, fill=p_rgb, font=f_card_t)

        max_chars = max(18, int(card_w / 14))
        words = cd.split()
        lines, cur = [], ""
        for w in words:
            test = (cur + " " + w).strip()
            if len(test) <= max_chars:
                cur = test
            else:
                lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        y_text = y0 + badge_h + 72
        for ln in lines[:4]:
            draw.text((x0 + 20, y_text), ln, fill=(71, 85, 105), font=f_card_d)
            y_text += int(min(w_px, h_px) * 0.034)

        draw.rounded_rectangle([x0 + 20, y1 - 22, x1 - 20, y1 - 12], radius=5, fill=s_rgb if i == len(positions) - 1 else a_rgb)

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    img.convert("RGB").save(out_path, "PNG", optimize=True)
    return out_path


def process_image_payload(
    src_path: str,
    out_path: str,
    target_w_px: int = None,
    target_h_px: int = None,
    aspect_ratio: str = None,
    fit_mode: str = "contain",
    rounded_px: int = 0,
) -> dict:
    if not os.path.exists(src_path):
        raise FileNotFoundError(f"[viz-kit] File gambar tidak ditemukan: {src_path}")

    with Image.open(src_path) as im:
        im = im.convert("RGBA")
        orig_w, orig_h = im.size

        if aspect_ratio and ":" in str(aspect_ratio) and fit_mode == "cover":
            aw, ah = [float(x) for x in str(aspect_ratio).split(":")]
            target_ratio = aw / ah
            if target_w_px and not target_h_px:
                target_h_px = int(round(target_w_px / target_ratio))
            elif target_h_px and not target_w_px:
                target_w_px = int(round(target_h_px * target_ratio))
            elif not target_w_px and not target_h_px:
                target_w_px = orig_w
                target_h_px = int(round(orig_w / target_ratio))

        if target_w_px and target_h_px:
            if fit_mode == "cover":
                im = ImageOps.fit(im, (int(target_w_px), int(target_h_px)), method=Image.Resampling.LANCZOS)
            else:
                im = ImageOps.contain(im, (int(target_w_px), int(target_h_px)), method=Image.Resampling.LANCZOS)
        elif target_w_px and not target_h_px:
            scale = target_w_px / float(orig_w)
            im = im.resize((int(target_w_px), int(round(orig_h * scale))), Image.Resampling.LANCZOS)
        elif target_h_px and not target_w_px:
            scale = target_h_px / float(orig_h)
            im = im.resize((int(round(orig_w * scale)), int(target_h_px)), Image.Resampling.LANCZOS)

        if rounded_px > 0:
            mask = Image.new("L", im.size, 0)
            m_draw = ImageDraw.Draw(mask)
            m_draw.rounded_rectangle([0, 0, im.size[0], im.size[1]], radius=int(rounded_px), fill=255)
            out_im = Image.new("RGBA", im.size, (255, 255, 255, 0))
            out_im.paste(im, (0, 0), mask=mask)
            im = out_im

        os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
        if rounded_px > 0:
            im.save(out_path, "PNG")
        else:
            bg = Image.new("RGB", im.size, (255, 255, 255))
            bg.paste(im, mask=im.split()[3])
            bg.save(out_path, "PNG", optimize=True)

        w, h = im.size
        return {"path": out_path, "width_px": w, "height_px": h, "aspect": round(w / max(h, 1), 4)}


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Pemakaian: python3 viz-kit.py spec.json output.png", file=sys.stderr)
        sys.exit(1)
    spec_file, out_file = sys.argv[1], sys.argv[2]
    with open(spec_file, "r", encoding="utf-8") as f:
        spec_data = json.load(f)
    if spec_data.get("kind") == "diagram":
        res = generate_diagram_payload(spec_data, out_file)
    else:
        res = render_curve(spec_data, out_file)
    print(f"OK -> {res}")
