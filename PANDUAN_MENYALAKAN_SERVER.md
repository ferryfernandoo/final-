# 🚀 Panduan Lengkap Menyalakan Semua Server DeeperNova

Dokumen ini berisi panduan resmi, terstruktur, dan siap pakai untuk menyalakan, memantau, serta mengelola seluruh ekosistem server DeeperNova.

---

## ⚡ Cara 1: Sekali Perintah (Paling Cepat & Otomatis)

Ekosistem DeeperNova telah dilengkapi dengan skrip orkestrasi master otomatis: [`scripts/auto_start_all.mjs`](file:///f:/a%20final%20deepernova%20ai/deepernova%20ai/scripts/auto_start_all.mjs).

### Langkah Menjalankan:
1. Buka terminal (PowerShell atau Command Prompt) di folder proyek:
   ```powershell
   cd "f:\a final deepernova ai\deepernova ai"
   ```
2. Jalankan perintah:
   ```powershell
   npm run start:all
   ```

### Yang Dijalankan Secara Otomatis oleh Skrip:
1. Membersihkan port lama jika ada proses macet (*auto port cleaner*).
2. Menyalakan **DeeperNova Search Engine** (Port 4000 di `C:\deepernova-search-main`).
3. Menyalakan **Backend AI DeeperNova** (Port 3001 di `f:\a final deepernova ai\deepernova ai`).
4. Menyalakan **Order DTE Backend** (Port 5000 di `F:\order dte\server`).
5. Menyalakan **Frontend User Vite** (Port 5173 di `F:\order dte\user`).
6. Menjalankan **Cloudflare Tunnel** (`bin\cloudflared.exe`) untuk masing-masing port.
7. Menangkap URL publik `https://*.trycloudflare.com` secara otomatis.
8. Memperbarui file konfigurasi `.env`, `active_tunnel.json`, dan `vercel.json`.
9. Mengompilasi build produksi dan memicu sinkronisasi otomatis ke Vercel bila diperlukan.

---

## 🛠️ Cara 2: Menyalakan Server Secara Manual / Terpisah

Jika Anda ingin menjalankan layanan tertentu saja secara mandiri, gunakan panduan berikut:

### 1. Backend Utama DeeperNova AI (Port 3001)
- **Fungsi**: Mesin chat AI, streaming respon, autentikasi, API marketplace, RAG, dan persistence store.
- **Direktori**: `f:\a final deepernova ai\deepernova ai`
- **Perintah Jalankan**:
  ```powershell
  cd "f:\a final deepernova ai\deepernova ai"
  node server/server.js
  ```
- **Tunnel Publik (Opsional)**:
  ```powershell
  & ".\bin\cloudflared.exe" tunnel --url http://127.0.0.1:3001
  ```

---

### 2. DeeperNova Search Engine & Web Crawler (Port 4000)
- **Fungsi**: Mesin pencari mandiri berkecepatan tinggi, PageRank, BM25 indexing, dan multi-worker crawler.
- **Direktori**: `C:\deepernova-search-main`
- **Perintah Jalankan**:
  ```powershell
  cd "C:\deepernova-search-main"
  node --env-file=.env --max-old-space-size=2048 src/server.js
  ```
- **Tunnel Publik (Opsional)**:
  ```powershell
  cd "f:\a final deepernova ai\deepernova ai"
  & ".\bin\cloudflared.exe" tunnel --url http://127.0.0.1:4000
  ```

---

### 3. Server Python API / AI Inference (Port 8000)
- **Fungsi**: Endpoint Python untuk pipeline pemrosesan dokumen, embedding, atau model lokal.
- **Direktori**: `f:\a final deepernova ai\deepernova ai`
- **Perintah Jalankan**:
  ```powershell
  cd "f:\a final deepernova ai\deepernova ai"
  python -u start_api_server.py
  ```
- **Tunnel Publik (Opsional)**:
  ```powershell
  & ".\bin\cloudflared.exe" tunnel --url http://127.0.0.1:8000
  ```

---

### 4. Server Order DTE Backend (Port 5000)
- **Fungsi**: Layanan backend pengelolaan order & transaksi.
- **Direktori**: `F:\order dte\server`
- **Perintah Jalankan**:
  ```powershell
  cd "F:\order dte\server"
  node server.js
  ```

---

### 5. Frontend User Vite (Port 5173)
- **Fungsi**: Antarmuka web pengguna / dev server lokal.
- **Direktori**: `F:\order dte\user`
- **Perintah Jalankan**:
  ```powershell
  cd "F:\order dte\user"
  npm run dev
  # atau
  npx vite
  ```
- **Tunnel Publik (Opsional)**:
  ```powershell
  cd "f:\a final deepernova ai\deepernova ai"
  & ".\bin\cloudflared.exe" tunnel --url http://127.0.0.1:5173
  ```

---

## 🔍 Pemeriksaan Status & Health Check

Untuk mengecek port mana saja yang sedang aktif dan mendengarkan koneksi:

```powershell
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 3001, 4000, 5000, 5173, 8000 } | Format-Table LocalAddress, LocalPort, OwningProcess
```

Untuk mengecek proses Cloudflare Tunnel yang sedang online:

```powershell
Get-Process cloudflared -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, CPU
```

---

## 🛑 Cara Mematikan Semua Server Sekaligus (Total Shutdown)

Jika Anda ingin mematikan semua proses server, worker, dan tunnel agar RAM kembali lega:

```powershell
# Matikan semua Node server dan Cloudflared tunnel
Stop-Process -Name node, cloudflared -Force -ErrorAction SilentlyContinue

# (Opsional) Matikan proses Python server tertentu
Stop-Process -Name python -Force -ErrorAction SilentlyContinue
```

---

## 🧹 Cara Membersihkan RAM (Memory Trimmer)

Untuk membersihkan sisa memori kerja Windows tanpa harus restart PC:

```powershell
cd "f:\a final deepernova ai\deepernova ai"
powershell -ExecutionPolicy Bypass -File scratch/clean_ram.ps1
```

Skrip ini akan memanggil API Windows `EmptyWorkingSet` untuk melepaskan cache tidak terpakai dari seluruh proses ke memori fisik, menghemat 1.0 – 2.0+ GB RAM seketika.

---

## 📌 Ringkasan Port Ekosistem

| Layanan | Port Lokal | Direktori Utama | Perintah Utama |
|---|---|---|---|
| **Backend AI** | `3001` | `f:\a final deepernova ai\deepernova ai` | `node server/server.js` |
| **Search Engine** | `4000` | `C:\deepernova-search-main` | `node --env-file=.env --max-old-space-size=2048 src/server.js` |
| **Order DTE API** | `5000` | `F:\order dte\server` | `node server.js` |
| **User Frontend** | `5173` | `F:\order dte\user` | `npx vite` |
| **Python API** | `8000` | `f:\a final deepernova ai\deepernova ai` | `python -u start_api_server.py` |
| **Master All** | *Semua* | `f:\a final deepernova ai\deepernova ai` | `npm run start:all` |
