---
name: react-tailwind-shadcn-pro
description: "Skill lengkap membangun aplikasi React modern (.jsx / .tsx) satu file maupun multi-komponen dengan Tailwind CSS, Lucide Icons, Recharts, dan manajemen state bersih menggunakan useMemo."
---

# Modern React (`.jsx` / `.tsx`), Tailwind & Recharts Pro

## 5 Aturan Inti Aplikasi React Tanpa Bug
1. **Default Export:** Gunakan `export default function App()` dan jangan panggil `ReactDOM.render()` di file komponen Canvas.
2. **Hitung State Turunan dengan `useMemo` (Jangan Pakai `useEffect` + `setState`):**
   Menyimpan hasil filter atau total di `useState` terpisah lalu mengupdatenya di `useEffect` memicu *infinite re-render*. Gunakan `useMemo`:
   ```jsx
   const filtered = useMemo(() => items.filter(x => status === 'ALL' || x.status === status), [items, status]);
   const totalActual = useMemo(() => filtered.reduce((s, x) => s + x.actual, 0), [filtered]);
   ```
3. **Immutable Updates:** Gunakan `setItems(prev => [...prev, itemBaru])` dan `setItems(prev => prev.filter(x => x.id !== id))`.
4. **Recharts Container:** Selalu bungkus `<ResponsiveContainer width="100%" height="100%">` di dalam `<div className="h-72 w-full">`.
5. **Bebas `alert()`:** Gunakan komponen state `toastMessage` dengan `setTimeout` untuk notifikasi elegan di sudut layar.
