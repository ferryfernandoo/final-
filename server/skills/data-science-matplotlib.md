# 📊 SKILL: PUBLICATION-GRADE DATA VISUALIZATION (MATPLOTLIB / SEABORN)
Category: Data Science, Visualizations & Analytics
Keywords: [matplotlib, seaborn, charts, plots, data visualization, 300 dpi, publication, analytics, python, pandas]

## 🎯 TUJUAN & STANDAR KUALITAS
Menghasilkan visualisasi data statistik, grafik performa, dan chart analitik tingkat publikasi (Harvard Business Review, Nature, Bloomberg Intelligence) menggunakan Python `matplotlib`. Dilarang menghasilkan chart default yang kusam. Gambar harus tajam (300 DPI), memiliki hirarki tipografi elegan, palet warna berkelas, dan label langsung pada data point.

---

## 🎨 PALET WARNA & PRINSIP TATA GRAFIK
1. **Palet Warna Eksekutif Deepernova**:
   - `PRIMARY` = `#EA580C` (Vivid Tangerine / Accent)
   - `SECONDARY` = `#0F172A` (Deep Slate / Dark Base)
   - `SUCCESS` = `#10B981` (Emerald Green)
   - `MUTED` = `#94A3B8` (Slate Grey)
   - `GRID_COLOR` = `#E2E8F0`
2. **Aturan Bersih (Minimalist Spines)**:
   - Buang garis bingkai atas dan kanan (top & right spines):
     ```python
     ax.spines['top'].set_visible(False)
     ax.spines['right'].set_visible(False)
     ax.spines['left'].set_color('#CBD5E1')
     ax.spines['bottom'].set_color('#CBD5E1')
     ```
   - Grid hanya pada sumbu Y horizontal dengan transparansi halus:
     ```python
     ax.yaxis.grid(True, linestyle='--', alpha=0.5, color='#E2E8F0')
     ax.set_axisbelow(True) # Grid berada di belakang bar/line
     ```
3. **Ekspor Resolusi Tinggi**:
   - Wajib gunakan: `plt.savefig(filename, dpi=300, bbox_inches='tight')`

---

## 📋 TEMPLATE SCRIPT PYTHON LENGKAP & TERUJI

```python
import sys
import numpy as np
import matplotlib.pyplot as plt

def generate_executive_chart(filename="Executive_Analytics_Chart.png"):
    # Atur resolusi dan ukuran kanvas
    fig, ax = plt.subplots(figsize=(12, 6.5), dpi=300)
    fig.patch.set_facecolor('#FFFFFF')
    ax.set_facecolor('#FFFFFF')

    # Data
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']
    revenue_actual = [12.4, 13.1, 14.8, 15.6, 17.2, 18.5, 20.1, 21.8, 23.4, 25.0, 27.2, 29.8] # Miliar IDR
    target = [12.0, 12.8, 14.0, 15.0, 16.5, 17.8, 19.0, 20.5, 22.0, 23.5, 25.5, 28.0]

    x = np.arange(len(months))
    width = 0.55

    # Bar Actual
    bars = ax.bar(x, revenue_actual, width=width, color='#EA580C', alpha=0.92, label='Realisasi Pendapatan (M IDR)', zorder=3)
    
    # Target Line
    ax.plot(x, target, color='#0F172A', linewidth=2.5, linestyle='--', marker='o', markersize=5, label='Target Rencana Kerja', zorder=4)

    # Tambahkan Label Angka di Atas Bar
    for bar in bars:
        h = bar.get_height()
        ax.annotate(f"{h:.1f}",
                    xy=(bar.get_x() + bar.get_width() / 2, h),
                    xytext=(0, 4),
                    textcoords="offset points",
                    ha='center', va='bottom',
                    fontsize=9, fontweight='bold', color='#1E293B')

    # Desain Spines & Grid
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#94A3B8')
    ax.spines['bottom'].set_color('#94A3B8')

    ax.yaxis.grid(True, linestyle='--', alpha=0.6, color='#E2E8F0', zorder=0)
    ax.set_axisbelow(True)

    # Label & Tipografi
    ax.set_xticks(x)
    ax.set_xticklabels(months, fontsize=10, fontweight='600', color='#334155')
    ax.set_ylabel('Miliar IDR (Rp)', fontsize=11, fontweight='600', color='#0F172A', labelpad=10)
    ax.set_ylim(0, max(revenue_actual) * 1.18)

    # Judul & Subtitle yang Berwibawa
    plt.title('Tinjauan Pertumbuhan Pendapatan Bulanan FY2026',
              fontsize=16, fontweight='bold', color='#0F172A', loc='left', pad=25)
    plt.suptitle('Realisasi melampaui target tahunan sebesar +6.4% didukung peningkatan retensi enterprise',
                 fontsize=10.5, color='#64748B', x=0.125, y=0.93, ha='left')

    # Legend yang Bersih
    legend = ax.legend(frameon=True, facecolor='#FFFFFF', edgecolor='#E2E8F0', fontsize=9.5, loc='upper left')
    legend.get_frame().set_linewidth(1.0)

    # Simpan Gambar 300 DPI
    plt.tight_layout()
    plt.savefig(filename, dpi=300, bbox_inches='tight', facecolor='#FFFFFF')
    plt.close()
    print(f"[SUCCESS] High-DPI Executive Chart tersimpan: {filename}")
    return filename

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "Executive_Analytics_Chart.png"
    generate_executive_chart(out_file)
```
