---
name: rust-axum-tokio-memory-safety-pro
description: "Skill pemrograman sistem dan backend berkecepatan tinggi menggunakan Rust: Ownership & Borrowing, penanganan error Result<T, E> dengan thiserror/anyhow, runtime async Tokio, dan web framework Axum."
---

# Rust Systems Engineering, Tokio Async & Axum Web API Pro

## Aturan Kode Rust Bersih
- **Hindari `.unwrap()` dan `.expect()` pada Input Eksternal di Kode Produksi:** Gunakan operator `?` dengan tipe `Result<T, AppError>` agar aplikasi tidak pernah mengalami `panic!` saat menerima request cacat.
- Gunakan `#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]` pada struct model data.
