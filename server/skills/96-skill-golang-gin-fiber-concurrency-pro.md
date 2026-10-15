---
name: golang-gin-fiber-concurrency-pro
description: "Skill pengembangan layanan backend berkinerja tinggi menggunakan Go (Golang): Gin/Fiber/net-http, Goroutines, Channels, sync.WaitGroup, context.Context timeout, dan penanganan error eksplisit."
---

# Go (Golang) High-Performance Backend & Concurrency Pro

## 4 Hukum Emas Kode Go Produksi
1. **Selalu Teruskan `ctx context.Context` sebagai Parameter Pertama:** Agar request database atau HTTP keluar otomatis dibatalkan jika klien memutus koneksi.
2. **Jangan Pernah Meluncurkan Goroutine Tanpa Jalur Berhenti yang Jelas:** Mencegah *goroutine leak*.
3. **Bungkus Error dengan Konteks (`fmt.Errorf("gagal simpan lini %s: %w", lini, err)`).**
4. **Konfigurasi `http.Server` dengan `ReadTimeout`, `WriteTimeout`, dan `IdleTimeout` eksplisit.**
