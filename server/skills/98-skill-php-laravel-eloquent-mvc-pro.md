---
name: php-laravel-eloquent-mvc-pro
description: "Skill pengembangan aplikasi web dan API menggunakan PHP 8.2/8.3 dan Laravel 10/11: Eloquent ORM, FormRequest Validation, DB Transactions, Blade/Inertia, dan Queue Jobs."
---

# Modern PHP 8.3 & Laravel Full-Stack Engineering Pro

## 4 Aturan Keamanan & Performa Laravel
1. Gunakan `declare(strict_types=1);` di bagian atas setiap file PHP.
2. Definisikan `$fillable` secara eksplisit pada setiap model Eloquent untuk mencegah celah *Mass Assignment*.
3. Gunakan `DB::transaction(function () { ... });` saat menyimpan data ke beberapa tabel sekaligus (misal header Invoice + detail item).
4. Gunakan Eager Loading `Model::with(['items', 'customer'])->paginate(25)` untuk mencegah *N+1 Query*.
