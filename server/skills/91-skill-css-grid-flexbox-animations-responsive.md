---
name: css-grid-flexbox-animations-responsive
description: "Skill penguasaan CSS3 modern: CSS Grid auto-fit/minmax, Flexbox, Fluid Typography clamp(), Container Queries, animasi transisi 60fps (transform & opacity), serta @media print."
---

# Modern CSS Grid, Fluid Typography & Print Layout Pro

## 3 Pola CSS Paling Berguna Tanpa Media Query Rumit
1. **Grid Kartu Otomatis Responsif:**
   `grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));`
2. **Tipografi Fluid (`clamp`):**
   `font-size: clamp(1.25rem, 2.5vw + 0.5rem, 2.25rem);`
3. **Animasi Mulus 60 FPS:** Hanya animasikan properti `transform` dan `opacity` (jangan meng-animasikan `width`, `height`, atau `top`/`left` karena memicu *layout reflow* berat).
