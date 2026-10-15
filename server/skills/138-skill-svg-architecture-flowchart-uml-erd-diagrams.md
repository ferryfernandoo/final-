---
name: svg-architecture-flowchart-uml-erd-diagrams
description: "Skill menggambar diagram arsitektur perangkat lunak, flowchart, sequence diagram, ERD database, dan mindmap di SVG: penempatan kartu grid, panah ortogonal berlengkung Q, marker arrowhead, dan teks terpusat."
---

# SVG System Architecture, Flowcharts & ERD Diagrams Pro

## Rumus Menaruh Teks Tepat di Tengah Kotak SVG
Jangan menebak offset piksel huruf! Gunakan:
```xml
<rect x="100" y="80" width="180" height="60" rx="12" fill="#1E293B" stroke="#38BDF8" stroke-width="2"/>
<text x="190" y="110" fill="#FFFFFF" font-size="14" font-weight="700" text-anchor="middle" dominant-baseline="central">
  Mesin Pemrosesan
</text>
```
Dengan `x = rect.x + rect.width / 2`, `y = rect.y + rect.height / 2`, `text-anchor="middle"`, dan `dominant-baseline="central"`, teks dijamin 100% berada tepat di titik tengah kotak!
