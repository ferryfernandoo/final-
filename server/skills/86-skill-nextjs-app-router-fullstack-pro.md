---
name: nextjs-app-router-fullstack-pro
description: "Skill pengembangan aplikasi web Full-Stack menggunakan Next.js 14/15 App Router (TypeScript): React Server Components (RSC), Client Components ('use client'), Server Actions, Route Handlers, dan optimasi SEO/performa."
---

# Next.js App Router Full-Stack Engineering Pro

## Aturan Emas Next.js App Router (`app/`)
1. **Server Components secara Default:** Komponen di `app/` adalah *Server Component* kecuali diberi `'use client'` di baris pertama. Ambil data database langsung dengan `async/await` di Server Component, lalu kirim data sebagai props ke komponen anak interaktif yang memakai `'use client'`.
2. **Validasi Input di *Server Actions* dan *Route Handlers* (`app/api/.../route.ts`):** Jangan pernah mempercayai input dari form client tanpa validasi skema (misal dengan `zod`).
3. **Panggil `revalidatePath('/dashboard')`** setelah mutasi data di Server Action agar UI langsung menampilkan data terbaru.
