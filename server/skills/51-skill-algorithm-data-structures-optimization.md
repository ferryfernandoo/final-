---
name: algorithm-data-structures-optimization
description: "Skill optimasi algoritma dan struktur data untuk mempercepat kode lambat O(N^2) menjadi O(N) atau O(N log N) menggunakan hash lookup (set/dict), heapq, bisect, deque, dan memoization."
---

# Algorithm & Data Structure Optimization Pro ($O(N^2) \to O(N)$)

## 4 Pola Optimasi Paling Berdampak
1. **Ganti Pencarian di Dalam List (`if x in big_list:`) dengan `set` atau `dict` ($O(N) \to O(1)$):**
   Mencari 10.000 item di dalam `list` berisi 10.000 elemen butuh 100 juta operasi; mengubah `big_set = set(big_list)` terlebih dahulu memangkasnya menjadi 10.000 operasi (10.000x lebih cepat!).
2. **Gunakan `collections.deque` untuk Antrian FIFO:** `list.pop(0)` berbiaya $O(N)$; `deque.popleft()` berbiaya $O(1)$.
3. **Gunakan `heapq.nlargest(k, data, key=...)`:** Untuk mencari Top-$K$ item tanpa perlu mengurutkan seluruh jutaan baris.
4. **Gunakan ` ''.join(chunks)` untuk Menyusun String Besar:** Jangan menyambung string dengan `s += line` di dalam loop besar.
