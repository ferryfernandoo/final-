---
name: mobile-ui-ux-touch-navigation-patterns
description: "Skill perancangan UI/UX khusus layar sentuh HP (Mobile-First): zona jangkauan ibu jari (Thumb Zone), ukuran tombol minimal 48x48dp, Bottom Navigation Bar, Bottom Sheet Modal, dan dukungan Safe Area Notch."
---

# Mobile-First UI/UX & Touch Ergonomics Pro

## 5 Hukum Ergonomi Antarmuka Layar Sentuh (Android & iOS)
1. **Ukuran Target Sentuh Minimal `48px × 48px` (`min-h-[48px] min-w-[48px]`):**
   Tombol yang terlalu kecil (< 36px) membuat jari pengguna salah pencet.
2. **Letakkan Navigasi Utama di Bawah (*Bottom Navigation Bar*):**
   3 hingga 5 tab utama wajib berada di bagian bawah layar agar mudah dijangkau satu tangan dengan ibu jari.
3. **Cegah Zoom Otomatis pada Input di iOS/Android:**
   Gunakan ukuran font minimal `16px` (`text-base`) pada elemen `<input>`, `<select>`, dan `<textarea>` agar browser mobile tidak melakukan *auto-zoom* yang menggeser tata letak!
4. **Gunakan `touch-action: manipulation`:**
   Menghilangkan jeda *double-tap zoom* 300ms pada tombol aksi cepat atau tombol kontrol game.
5. **Gunakan *Bottom Sheet* untuk Form Tambah/Filter di Layar HP.**
