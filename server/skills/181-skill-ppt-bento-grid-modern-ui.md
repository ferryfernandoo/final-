---
name: ppt-bento-grid-modern-ui
description: "Skill perancangan presentasi modern berarsitektur Bento Grid (Apple/Linear/Notion style) pada PowerPoint 16:9 widescreen. Menggunakan kartu kontainer rounded-corner, micro-badge kicker, bobot kartu asimetris, dan visual hierarchy bertaraf dunia. Bebas slide telanjang."
---

# Bento Grid Modern UI — PowerPoint Widescreen 16:9

## Prinsip Desain Bento Box UI
1. **Containerized Information:** Setiap gagasan dibungkus dalam kartu berlatar kontras dengan sudut melengkung (*rounded rectangle* `adjustment=0.08`, garis tepi lembut `1.5pt`).
2. **Micro-Badges & Tags:** Setiap kartu memiliki pill status (`TAG`, `01`, `FITUR UTAMA`) dengan huruf kapital dan warna aksen tema.
3. **Pita Aksen Dekoratif:** Garis aksen mini (lebar 0.8" tebal 0.08") di atas setiap kartu untuk penanda visual.
4. **Hierarki Tipografi:** Judul kartu 18pt bold, stat besar 24-26pt bold, teks isi 12pt regular dengan kontras tinggi.
5. **Anti-Slide Telanjang:** Dilarang keras menggunakan `slide_layouts[1]` polos atau teks hitam di kanvas putih tanpa kontainer kartu.

## Template Spec JSON Bento Grid
```json
{
  "theme": "navy",
  "title": "Bento Grid System",
  "slides": [
    {
      "type": "cover",
      "kicker": "MODERN ARCHITECTURE",
      "title": "Desain Berbasis Bento Grid 16:9",
      "subtitle": "Kerapian Visual & Tata Letak Kontainer Presisi",
      "meta": "DEEPERNOVA PRO SUITE 2026"
    },
    {
      "type": "bento",
      "kicker": "PENGEMBANGAN FITUR",
      "title": "Tiga Pilar Arsitektur Antarmuka Generasi Baru",
      "cards": [
        {
          "tag": "MODULAR",
          "title": "Komponen Terisolasi",
          "stat": "100%",
          "stat_label": "Independen & Reusable",
          "desc": "Setiap blok kartu dapat dikonfigurasi ulang secara dinamis sesuai kebutuhan modul.",
          "bullets": ["Zero dependency sprawl", "Penyusunan drag-and-drop", "Audit styling terpusat"]
        },
        {
          "tag": "KECEPATAN",
          "title": "Performa Eksekusi",
          "stat": "<50ms",
          "stat_label": "Latensi Rendering",
          "desc": "Optimasi rendering berbasis pipeline komputasi terdistribusi yang sangat responsif.",
          "bullets": ["Cache memory terdistribusi", "Asset compression 300-DPI", "Thread non-blocking"]
        },
        {
          "tag": "SKALABILITAS",
          "title": "Integrasi Terbuka",
          "stat": "99.9%",
          "stat_label": "Ketersediaan Layanan",
          "desc": "Dukungan penuh API terbuka yang siap disambungkan ke berbagai platform analitik.",
          "bullets": ["RESTful & WebSocket hook", "Telemetry log real-time", "Enkripsi tingkat enterprise"]
        }
      ]
    },
    {
      "type": "matrix",
      "kicker": "MATRIKS KAPABILITAS",
      "title": "Pemetaan Kapabilitas Desain Berdasarkan Kuadran",
      "quadrants": [
        {"badge": "KUADRAN 1", "title": "Estetika Premium", "desc": "Warna modern, rasio kontras AA/AAA, dan ritme visual dinamis.", "bullets": ["Palet terkurasi", "Border halus"]},
        {"badge": "KUADRAN 2", "title": "Kerapian Tipografi", "desc": "Ukuran font proporsional yang dapat dibaca jelas dari kejauhan.", "bullets": ["Judul 26-36pt", "Body 11-12pt"]},
        {"badge": "KUADRAN 3", "title": "Struktur Informasi", "desc": "Pemisahan pilar dengan micro-badge dan stat callout.", "bullets": ["Highlight metrik", "Tag kategori"]},
        {"badge": "KUADRAN 4", "title": "Otomasi Generasi", "desc": "Eksekusi cepat via python-pptx kit tanpa human error posisi.", "bullets": ["Spec JSON siap pakai", "Layout bands math"]}
      ]
    },
    {
      "type": "outro",
      "title": "Solusi Elegan & Berkelanjutan",
      "subtitle": "Koleksi Desain Modern DEEPERNOVA AI"
    }
  ]
}
```

## Cara Menjalankan
```bash
python kits/pptx_designer.py spec.json hasil_bento.pptx
```
Atau di dalam skrip Python:
```python
from pptx_designer import ModernDeck

deck = ModernDeck(theme="navy", title="Bento Deck")
deck.add_cover("Arsitektur Bento Modern", "Struktur Elegan", "SISTEM PRO", "2026")
deck.add_bento_cards("Tiga Komponen Inti", "ARSITEKTUR", [...])
deck.add_outro("Transformasi Dimulai", "Hubungi Tim Kami")
deck.save("output.pptx")
```
