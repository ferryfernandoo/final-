---
name: word-docx-pro
description: "Skill lengkap v2.0 untuk membuat, mengedit, dan membaca dokumen Word (.docx) dengan hasil rapi, profesional, dan tidak ngelantur. Mencakup pengaturan mendalam payload gambar (ukuran, rasio, kompresi, letak center/full-banner/split-left/split-right/gallery), penyematan grafik kurva 300-DPI, aturan isi anti-ngelantur, sistem desain, kode python-docx & docx-js yang sudah diuji, serta QA visual wajib."
---

# Word (.docx) Pro v2.0 — Panduan Lengkap & Pengaturan Gambar/Visual Mendalam

Tujuan skill ini ada empat:
1. **Isi tepat sasaran (Anti-Ngelantur).** Padat, konkret, langsung ke inti di halaman pertama.
2. **Desain publikasi profesional.** Hierarki tipografi tegas (lantai font isi 11pt, tabel minimal 10pt), palet harmonis, tanpa halaman yatim (*orphan*).
3. **Pengaturan Payload Gambar & Grafik Kurva Pintar.** Mengatur ukuran piksel/cm, rasio aspek (`16:9`, `4:3`, `1:1`), dan tata letak terbaik (`full-banner`, `center`, `split-left`, `split-right`, `gallery` 2-3 kolom, serta kurva 300-DPI).
4. **Teknis 100% teruji.** Berjalan mulus via `word_kit.py` (Python `python-docx`) maupun `docx-kit.js` (Node.js) dan terbuka sempurna di Microsoft Word, Google Docs, serta LibreOffice.

Urutan kerja wajib: **Pahami permintaan → Rencanakan struktur & letak visual → Tulis isi → Bangun file → Render ke PDF/JPG dan periksa visual → Perbaiki → Serahkan.**

---

## BAGIAN 1 — Aturan Isi (Anti-Ngelantur)

### 1.1 Tentukan 5 Hal Sebelum Menulis
| # | Pertanyaan | Contoh |
|---|---|---|
| 1 | **Jenis dokumen apa?** | Laporan eksekutif, proposal, surat resmi, memo, CV, invoice, SOP |
| 2 | **Siapa pembacanya?** | Direksi, klien, investor, kepala pabrik, instansi |
| 3 | **Apa tujuan satu kalimatnya?** | "Menyetujui investasi lini 2 sebesar Rp450 juta" |
| 4 | **Berapa target halaman?** | 1 halaman (surat/memo/CV/invoice), 3-5 halaman (laporan/proposal) |
| 5 | **Jalur Desain (Path A vs Path B)?** | **Path A** (Surat/Akademik: bersih, tanpa grafik dekoratif) vs **Path B** (Laporan/Proposal/SOP: tabel berwarna, callout, KPI card, grafik kurva & gambar) |

### 1.2 Aturan Emas Penulisan
- **Kesimpulan di halaman pertama.** Buka dengan Ringkasan Eksekutif atau kartu KPI utama.
- **Judul bagian deklaratif (*Action Titles*).** Tulis `"2. Lini 2 Meningkatkan Output 9% Pasca Jadwal Shift Malam"`, bukan sekadar `"2. Hasil"`.
- **Satu paragraf, satu ide (maksimal 4 kalimat).** Kalimat pertama adalah klaim utama, diikuti angka/bukti, lalu implikasi.
- **Jangan pernah mengarang data.** Jika angka atau nomor rekening belum diberikan user, tulis placeholder tegas: `[ISI: nomor rekening]`.
- **Jangan menduplikasi data.** Jika data sudah ada di tabel, jangan tulis ulang seluruh angkanya dalam daftar poin (cukup bahas *insight*-nya).

---

## BAGIAN 2 — Pengaturan Payload Gambar, Ukuran & Tata Letak Pintar

Masalah klasik LLM saat memasukkan gambar ke Word adalah **gambar gepeng (distorsi rasio)**, **ukuran terlalu raksasa hingga mendorong teks ke halaman baru**, atau **gambar ditaruh sembarangan di tengah kalimat**. Ikuti aturan ini:

### 2.1 Tabel Keputusan: Gambar Enaknya Ditaruh di Mana?

| Jenis Visual / Payload Gambar | Mode Penempatan (`placement`) | Ukuran Ideal (A4 Margin 2,54 cm -> Lebar Area Tulis 15,92 cm / 6,27") | Rasio & Pemotongan (`aspect_ratio` + `fit_mode`) |
|---|---|---|---|
| **Banner Hero / Foto Fasilitas Utama / Arsitektur Lebar** | `full-banner` (di bawah judul bab utama) | Lebar **15,5 - 15,9 cm** (`6.1" - 6.25"`) | `16:9` atau `21:9` (`fit_mode: "cover"`) |
| **Grafik Kurva (`spline_band`, `pareto_80_20`, `six_sigma_bell`, `s_curve`)** | `center` (di bawah paragraf pengantar analisis data) | Lebar **13,0 - 14,5 cm** (`5.1" - 5.7"`) — menyisakan ruang napas kiri-kanan | `16:9` atau `16:10` (`fit_mode: "contain"`, 300 DPI) |
| **Foto Produk / Mesin / Bukti Lapangan + Penjelasan Poin** | `split-left` (Gambar di kiri, teks & poin di kanan) atau `split-right` | Tabel 2 kolom tanpa border: Gambar **45% (7,1 cm)**, Teks **55% (8,8 cm)** | `4:3` atau `1:1` (`fit_mode: "cover"`, `rounded_px: 12`) |
| **Perbandingan Sebelum vs Sesudah / 2-3 Foto Dokumentasi** | `gallery` (Grid 2 atau 3 kolom sejajar) | 2 kolom: **@ 7,6 cm**; 3 kolom: **@ 5,0 cm** | Wajib seragam `4:3` atau `1:1` (`ImageOps.fit` center-crop) |
| **Logo Kop / Stempel / QR Code** | `left` atau `right` atau di dalam kop | Lebar **2,2 - 3,5 cm** (`0.9" - 1.4"`) | Rasio asli (`fit_mode: "contain"`) |

### 2.2 Tiga Hukum Mutlak Payload Gambar di Word
1. **Hanya berikan `width` saat menyisipkan ke `python-docx` (`run.add_picture(path, width=Cm(w))`).** Jangan pernah memberikan `width` dan `height` sekaligus ke `add_picture` kecuali gambar sudah di-*crop* terlebih dahulu dengan `PIL.ImageOps.fit`, agar gambar tidak pernah gepeng.
2. **Jangan pernah memanggil `doc.add_picture()` langsung di level dokumen.** Selalu buat paragraf khusus (`p = doc.add_paragraph()`), atur `p.alignment = WD_ALIGN_PARAGRAPH.CENTER`, set `p.paragraph_format.keep_with_next = True` (agar gambar tidak terpisah dari *caption* di bawahnya), lalu panggil `p.add_run().add_picture(...)`.
3. **Optimalkan resolusi payload sebelum disisipkan.** Gunakan `viz_kit.process_image_payload()` untuk membatasi lebar gambar maksimal `1600 px` (untuk full-banner) atau `900 px` (untuk split/gallery) dengan format PNG teroptimasi agar ukuran file `.docx` tetap ringan (< 2 MB) namun tajam saat dicetak (300 DPI).

### 2.3 Kode Python (`python-docx` + `Pillow`) untuk Penempatan Gambar Pintar

```python
from docx.shared import Cm, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from PIL import Image, ImageOps

def prepare_payload(src_path, out_path, target_w_px=1200, aspect_ratio=None, fit_mode="contain"):
    """Siapkan payload gambar agar tajam, ukurannya pas, dan rasionya terjaga."""
    with Image.open(src_path).convert("RGB") as im:
        if aspect_ratio and ":" in aspect_ratio:
            aw, ah = [float(x) for x in aspect_ratio.split(":")]
            target_h_px = int(round(target_w_px / (aw / ah)))
            im = ImageOps.fit(im, (target_w_px, target_h_px), method=Image.Resampling.LANCZOS)
        else:
            scale = min(1.0, target_w_px / float(im.width))
            if scale < 1.0:
                im = im.resize((int(im.width * scale), int(im.height * scale)), Image.Resampling.LANCZOS)
        im.save(out_path, "PNG", optimize=True)
    return out_path

def add_centered_figure(doc, img_path, caption_text, width_cm=13.8):
    """Taruh gambar/kurva di tengah dengan caption yang terkunci (anti-orphan)."""
    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(6)
    p_img.paragraph_format.space_after = Pt(3)
    p_img.paragraph_format.keep_with_next = True
    p_img.add_run().add_picture(img_path, width=Cm(width_cm))

    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_after = Pt(8)
    r = p_cap.add_run(caption_text)
    r.font.size = Pt(9.5)
    r.font.italic = True
```

---

## BAGIAN 3 — Standar Tipografi & Lantai Ukuran Font (Wajib Dipatuhi)

Jangan pernah mengecilkan font di bawah batas ini (dokumen yang baik dipadatkan dengan mengedit kalimat, **bukan** mengecilkan huruf):

| Elemen | Ukuran Font | Spasi (`before` / `after`) | Aturan Tambahan |
|---|---|---|---|
| **Judul Dokumen (`Title`)** | `22 - 24 pt` Bold | `0 pt` / `12 pt` | Warna Primer |
| **Heading 1 (`h1`)** | `16 pt` Bold | `14 pt` / `5 pt` | `keep_with_next = True`, Warna Primer |
| **Heading 2 (`h2`)** | `13 pt` Bold | `11 pt` / `4 pt` | `keep_with_next = True`, Warna Aksen |
| **Heading 3 (`h3`)** | `11,5 pt` Bold | `8 pt` / `3 pt` | `keep_with_next = True`, Warna Teks |
| **Paragraf Isi & Poin Daftar** | **`11 pt`** Regular | `0 pt` / `6 pt` (`line = 1.15 - 1.20`) | **Lantai mutlak 11 pt** (atau 12 pt untuk surat/akademik) |
| **Kotak Callout / Ringkasan** | **`10,5 - 11 pt`** | `0 pt` / `3 pt` | Border kiri 24 (`3 pt`), latar lembut, `w:cantSplit` |
| **Sel Tabel Data (`table`)** | **`10 - 10,5 pt`** | `2 pt` / `2 pt` | **Dilarang keras `< 10 pt`** (jangan pakai 8pt/9pt!). Header `w:tblHeader`, baris `w:cantSplit` |
| **Caption Gambar & Footer** | **`9,5 - 10 pt`** Italic | `3 pt` / `8 pt` | Hanya untuk caption dan header/footer |

### Aturan Paginasi & Anti-Halaman Yatim (*Anti-Orphan*)
1. **Jangan pernah menaruh `doc.add_page_break()` di antara bab biasa atau sebelum tabel.** Biarkan mengalir alami; gunakan `page_break` hanya setelah halaman cover.
2. **Tabel pendek ($\le 5$ baris) & blok tanda tangan ($\le 6$ baris):** Set `keep_with_next = True` pada semua baris/paragraf kecuali baris terakhir agar tidak terpotong menyisakan 1 baris sendirian di halaman terakhir.
3. **Aturan Halaman Akhir (< 50 kata):** Jika halaman terakhir hanya berisi tanda tangan atau 2-3 baris teks, padatkan kalimat di halaman sebelumnya agar muat utuh.

---

## BAGIAN 4 — Akselerasi dengan `word_kit.py` & `viz_kit.py`

Baik model besar maupun model kecil sangat disarankan membangun dokumen lewat `word_kit.py` karena seluruh aturan XML (`w:tblHeader`, `w:cantSplit`, `keep_with_next`, penempatan gambar `split-left`/`split-right`/`gallery`, dan kurva 300-DPI) sudah diotomatisasi:

```bash
python3 kits/word_kit.py spec.json output.docx
```

### Blok Visual Baru di `word_kit.py` v2.0:
1. **`kpi_row`**: Baris kartu metrik KPI (2-4 kartu sejajar dengan garis atas warna aksen):
   ```json
   {
     "t": "kpi_row",
     "cards": [
       { "label": "Total Output", "value": "12.450 Unit", "sub": "+8,4% vs Q2" },
       { "label": "Efisiensi OEE", "value": "87,4%", "sub": "Target 85,0%" },
       { "label": "Kapabilitas Cpk", "value": "1,48", "sub": "Six Sigma Lulus" }
     ]
   }
   ```
2. **`curve` / `chart`**: Merender grafik kurva 300-DPI langsung ke dalam Word (`spline_band`, `six_sigma_bell`, `pareto_80_20`, `s_curve`, `waterfall`, `heatmap`, `fan_forecast`, `combo_dual`, `radar_kpi`):
   ```json
   {
     "t": "curve",
     "kind": "spline_band",
     "title": "Kurva Tren Output Mingguan & Rentang Deviasi (±1σ)",
     "labels": ["M-1", "M-2", "M-3", "M-4", "M-5", "M-6", "M-7", "M-8"],
     "series": [
       { "name": "Realisasi Lini 2", "values": [1420, 1490, 1510, 1560, 1595, 1610, 1645, 1680], "band": 35 }
     ],
     "target": 1500,
     "target_label": "Target Standar (1.500)",
     "placement": "center",
     "width_cm": 14.2,
     "caption": "Gambar 1. Kurva interpolasi spline output mingguan dengan pita kepercayaan ±1σ."
   }
   ```
3. **`image` dengan `placement: "split-left"` / `"split-right"` / `"full-banner"`**:
   ```json
   {
     "t": "image",
     "placement": "split-left",
     "aspect_ratio": "4:3",
     "rounded_px": 16,
     "diagram_spec": {
       "title": "Alur Otomasi Lini Produksi",
       "subtitle": "Sensor -> Kontroler -> QC -> Gudang"
     },
     "side_title": "Integrasi Sensor & Kendali Mutu",
     "side_text": "Pemasangan sensor optik pada konveyor menurunkan cacat lolos hingga **64%** selama triwulan III.",
     "side_bullets": [
       "Deteksi dini deviasi dimensi dalam 0,2 detik",
       "Pencatatan otomatis ke database kualitas harian"
     ],
     "caption": "Gambar 2. Skema integrasi kendali mutu."
   }
   ```
4. **`gallery`**: Grid 2 atau 3 gambar sejajar dengan ukuran seragam:
   ```json
   {
     "t": "gallery",
     "cols": 2,
     "aspect_ratio": "16:9",
     "rounded_px": 12,
     "items": [
       { "path": "foto_lini_1.png", "caption": "Gambar 3a. Kondisi Lini 1" },
       { "path": "foto_lini_2.png", "caption": "Gambar 3b. Kondisi Lini 2" }
     ]
   }
   ```

---

## BAGIAN 5 — Verifikasi Visual Wajib (Render & Lihat)

Setelah file `.docx` dibuat, selalu konversi ke PDF lalu ke PNG untuk memeriksa tata letak setiap halaman:

```bash
libreoffice --headless --convert-to pdf output.docx
pdftoppm -png -r 150 output.pdf page_preview
```

Periksa setiap `page_preview-*.png`:
- [ ] Tidak ada tabel atau gambar yang melewati margin kanan/kiri.
- [ ] Tidak ada gambar gepeng atau bertabrakan dengan teks.
- [ ] Tidak ada judul bab (`h1`/`h2`) yang terdampar sendirian di dasar halaman.
- [ ] Tidak ada halaman terakhir yang hanya berisi 1-3 baris yatim.
