---
name: svg-diagram-flowchart-infografis
description: "Skill pembuatan diagram vektor SVG murni, flowchart, diagram arsitektur, organigram, denah tata letak lini, dan infografis beresolusi tak terbatas untuk disematkan di HTML, Markdown, atau dikonversi ke PNG/PDF."
---

# SVG Vector Diagrams, Flowcharts & Infographics Pro

## 5 Aturan Menggambar SVG yang Tajam & Tidak Pernah Terpotong
1. **Selalu Tetapkan `viewBox="0 0 W H"` dan `width="100%"`:**
   Contoh: `<svg viewBox="0 0 960 420" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">`.
2. **Definisikan Panah Konektor di `<defs>` dengan `<marker>`:**
   Gunakan `<marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">` agar setiap garis `<line>` atau `<path>` otomatis memiliki ujung panah presisi.
3. **Gunakan `text-anchor="middle"` dan `dominant-baseline="central"`:**
   Dengan dua atribut ini, teks `<text x="CX" y="CY">` selalu berada tepat di titik tengah kotak `<rect>` tanpa meleset!
4. **Beri Padding Aman di Sekeliling Kanvas (`>= 24px`):**
   Agar bayangan (`drop-shadow`) atau garis tepi kotak terluar tidak terpotong batas `viewBox`.
5. **Gunakan Palet Kontras Tinggi:** Kotak utama berwarna `#1E3A8A` dengan teks `#FFFFFF`, atau kotak `#EFF6FF` ber-stroke `#2563EB` dengan teks `#0F172A`.
