---
name: ppt-pptx-pro
description: "Skill lengkap untuk membuat, menata letak, dan memvalidasi presentasi Microsoft PowerPoint (.pptx) Widescreen 16:9 yang rapi, tajam, dan bebas tabrakan teks. Mencakup kontrak pita tata letak (Layout Bands), matematika kapasitas teks (Capacity Math), pengaturan payload gambar 300-DPI anti-gepeng (Full Bleed, Split Left/Right, Inset Grid), penyematan grafik kurva 300-DPI, arsitektur palet Bookend, serta inspeksi visual wajib."
---

# PowerPoint (.pptx) Pro — Panduan Lengkap & Tata Letak Gambar/Kurva 16:9

Tujuan skill ini ada empat:
1. **Bebas teks bertabrakan atau meluber (*Zero Overflow*).** Menggunakan pita koordinat Y tetap (*Layout Bands*) dan perhitungan kapasitas karakter (*Capacity Math*).
2. **Tipografi jarak jauh (*Projection Legibility*).** Semua teks mudah dibaca dari jauh (judul 30-34pt, angka KPI 44pt, sub-header 22pt, bullet 15-18pt; lantai mutlak 12pt).
3. **Payload Gambar 300-DPI Anti-Gepeng & Tata Letak Pintar.** Gambar di-*crop* ke ukuran *frame* dengan `PIL.ImageOps.fit` pada 300 DPI sebelum dimasukkan ke slide (tidak pernah ditarik paksa), ditempatkan sebagai *Full Bleed*, *Split Bleed* kiri/kanan, atau *Inset Grid*.
4. **Narasi Tajam (*Assertion-Evidence*).** Judul slide berupa kalimat kesimpulan aktif, poin berupa fragmen singkat (`**Kata Kunci:** Penjelasan padat maks 10 kata`), dan Slide Terakhir adalah *Terminal Outro* bersih.

---

## BAGIAN 1 — Kontrak Tata Letak 16:9 (`13.333" x 7.5"`)

Kotak teks di `python-pptx` **tidak memotong teks otomatis**; teks yang kepanjangan akan tumpah menimpa elemen di bawahnya. Karena itu, **patuhi 3 Pita Horizontal (Layout Bands)** ini di setiap slide isi:

| Pita (*Band*) | Posisi `Top` | Tinggi `Height` | Batas Bawah `Bottom` | Isi yang Diizinkan |
|---|---|---|---|---|
| **Title Band** | `0.50"` | `1.50"` | `2.00"` | Kicker (`14pt` bold) + Judul Aksi (`30-34pt` bold, maks 2 baris) |
| **Body Band** | `2.20"` | `4.60"` | `6.80"` | Kolom pilar, kartu KPI, grafik kurva, tabel, atau gambar inset |
| **Footer Band** | `6.95"` | `0.35"` | `7.30"` | Sumber data / nama dokumen + nomor slide (`14pt`) |

Jarak `0.20"` di antara pita adalah sabuk pengaman anti-tabrakan. Margin kiri dan kanan standar: `MARGIN_X = 0.8"` (`CONTENT_W = 11.733"`).

### Batas Kapasitas Teks per Slide
- **Judul Aksi (H1):** Maksimal **2 baris** (~75-84 karakter pada `32-34pt`).
- **Header Kolom Pilar:** Maksimal **1 baris** (~20-24 karakter pada `22pt`).
- **Poin Bullet:** Format `**Kata Kunci:** Fragmen singkat` — maksimal **3 baris per poin**, maksimal **3 poin per kolom**, dan maksimal **6 poin per slide**.
- **Target Kata per Slide:** **35 - 50 kata** (batas keras 65 kata). Jika materi lebih banyak, **pecah menjadi 2 slide**, jangan mengecilkan font!

---

## BAGIAN 2 — Pengaturan Payload Gambar & Grafik Kurva di PowerPoint

### 2.1 Tabel Keputusan: Gambar & Kurva Enaknya Ditaruh di Mana?

| Kondisi Visual | Mode Tata Letak | Koordinat `(left, top, width, height)` | Aturan Teks Pendamping |
|---|---|---|---|
| **Foto Sampul / Pernyataan Visual Kuat** | **Full Bleed** (`mode="full"`) | `(0.0", 0.0", 13.333", 7.5")` | Wajib pasang *scrim* gelap transparan (`alpha=0.68`) di atas gambar sebelum menaruh teks putih |
| **Foto Produk / Fasilitas / Diagram Alur + Poin Penjelasan** | **Split Bleed Kanan** (`mode="right"`) | Gambar: `(6.667", 0.0", 6.666", 7.5")` | Seluruh judul, poin, dan footer berada di paruh kiri: `left = 0.8"`, `width = 5.4"` |
| **Studi Kasus / Profil Tim + Narasi** | **Split Bleed Kiri** (`mode="left"`) | Gambar: `(0.0", 0.0", 6.666", 7.5")` | Seluruh judul, poin, dan footer berada di paruh kanan: `left = 7.25"`, `width = 5.3"` |
| **Grafik Kurva 300-DPI (`spline_band`, `pareto_80_20`, `six_sigma_bell`)** | **Chart + Insight Split** (`chart_slide`) | Kurva: `(0.8", 2.2", 7.1", 4.4")` | Panel Kartu Insight di kanan: `left = 8.25"`, `top = 2.2"`, `width = 4.25"`, `height = 4.6"` |
| **Set 2-3 Gambar Sejajar (Produk/Tahap)** | **Inset Row** (`inset`) | Di dalam Body Band (`top = 2.2"`, `height = 2.2"`) | Teks penjelasan ditaruh tepat di bawah masing-masing gambar (`top = 4.55"`) |

### 2.2 Cara Memproses Payload Gambar Anti-Gepeng (`PIL.ImageOps.fit`)
Jangan pernah langsung memanggil `slide.shapes.add_picture(path, left, top, width, height)` pada gambar mentah yang rasionya berbeda dari kotak target! Potong (*center-crop*) dulu pada resolusi 300 DPI:

```python
from PIL import Image, ImageOps
from pptx.util import Inches

def add_smart_bleed_image(slide, src_path, tmp_png, mode="right"):
    geom = {"full": (0.0, 13.333), "left": (0.0, 6.666), "right": (6.667, 6.666)}
    left_in, w_in = geom[mode]
    h_in = 7.5
    with Image.open(src_path).convert("RGB") as im:
        fitted = ImageOps.fit(im, (round(w_in * 300), round(h_in * 300)), method=Image.Resampling.LANCZOS)
        fitted.save(tmp_png, "PNG")
    pic = slide.shapes.add_picture(tmp_png, Inches(left_in), Inches(0), Inches(w_in), Inches(h_in))
    pic.line.fill.background()
    # Letakkan tepat di atas background canvas agar tidak menutupi teks!
    slide.shapes[0]._element.addnext(pic._element)
    return pic
```

---

## BAGIAN 3 — Arsitektur Palet Bookend & Aturan Slide

1. **Bookend Canvas:**
   - **Slide 1 (Cover)** dan **Slide N (Outro)** menggunakan latar gelap elegan (`BG_THEME`, misal Navy `#0F172A` atau Emerald `#064E3B`) dengan teks putih/terang.
   - **Slide 2 s/d N-1 (Isi)** menggunakan latar terang bersih (`#FFFFFF`) tetapi **wajib membawa warna tema** melalui *kicker* (`ACCENT`), sub-header kolom (`ACCENT`), kartu berlatar *tint* lembut (`#EFF6FF`), atau grafik berwarna senada.
2. **Slide N adalah *Terminal Outro*:**
   - Hanya berisi 1 kalimat tesis penutup yang kuat (4-10 kata) + ucapan terima kasih / kontak.
   - **DILARANG** menaruh daftar bullet, tabel, atau grafik baru di slide penutup.
3. **Bullet Asli (`•`) di `python-pptx`:**
   - `python-pptx` tidak memunculkan simbol bullet secara otomatis. Gunakan injeksi XML `<a:buChar char="•"/>` atau jalankan **`pptx_kit.py`** yang sudah menangani bullet secara otomatis.

---

## BAGIAN 4 — Akselerasi dengan `pptx_kit.py` & Verifikasi Visual Wajib

Bangun presentasi dengan cepat dan bebas error koordinat menggunakan `pptx_kit.py`:

```bash
python3 kits/pptx_kit.py spec.json presentasi.pptx
libreoffice --headless --convert-to pdf presentasi.pptx
pdftoppm -png -r 150 presentasi.pdf slide_preview
```

Periksa setiap `slide_preview-*.png`:
- [ ] Semua teks terbaca tajam dan memiliki kontras tinggi terhadap latar.
- [ ] Tidak ada teks yang menabrak garis, kotak, atau footer.
- [ ] Gambar proporsional (tidak gepeng) dan tidak menutupi teks.
- [ ] Minimal 50% slide isi memiliki elemen visual (grafik kurva, gambar split-bleed, diagram, atau kartu KPI).
