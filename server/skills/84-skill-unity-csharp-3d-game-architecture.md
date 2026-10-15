---
name: unity-csharp-3d-game-architecture
description: "Skill pemrograman game 3D di Unity menggunakan C#: siklus hidup MonoBehaviour (Awake, Start, Update, FixedUpdate), Rigidbody physics, ScriptableObject data architecture, dan Object Pooling."
---

# Unity 3D (C#) Game Architecture & Performance Pro

## 4 Hukum Performa Game Unity C# (Bebas Stutter / GC Spike)
1. **Pisahkan Input (`Update`) dari Fisika (`FixedUpdate`):**
   Baca input pemain di `Update()`, tetapi terapkan gaya `rb.AddForce()` atau `rb.MovePosition()` di dalam `FixedUpdate()`.
2. **Cache Referensi Komponen di `Awake()`:**
   Jangan pernah memanggil `GetComponent<Rigidbody>()` atau `Camera.main` berulang-ulang di dalam `Update()`.
3. **Gunakan *Object Pooling* untuk Peluru, Musuh, dan Partikel:**
   Memanggil `Instantiate()` dan `Destroy()` puluhan kali per detik memicu *Garbage Collector spike*. Matikan objek dengan `gameObject.SetActive(false)` dan gunakan kembali dari *pool*.
4. **Gunakan `ScriptableObject` untuk Konfigurasi Senjata/Level/Statistik.**
