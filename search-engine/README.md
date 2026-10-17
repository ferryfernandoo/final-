# 🚀 DeeperNova Search Engine & Autonomous Web Crawler

> Mesin pencari mandiri berkecepatan tinggi (sub-20ms) dengan algoritma BM25, PageRank, SQLite WAL FTS5, dan API Publik terintegrasi.

---

## 🌐 Akses Publik & URL API

| Layanan | URL Publik | Deskripsi |
|---|---|---|
| **Web Search UI** | [https://auto-sales-time-places.trycloudflare.com](https://auto-sales-time-places.trycloudflare.com) | Portal pencarian web interaktif, berita nasional, gambar, dan DeeperNova Economics |
| **API Base URL** | `https://drops-lots-tunnel-world.trycloudflare.com/api/v1` | Endpoint RESTful API untuk klien web, backend, dan AI Agent |
| **Status Engine** | `https://drops-lots-tunnel-world.trycloudflare.com/api/tunnel/info` | Status konektivitas tunnel dan engine |

> **Kunci API Demo Gratis**: `dn_live_free_public_demo`  
> *(Atau buat kunci API khusus di menu **Developer & AI API -> Generate API Key** pada Web UI)*

---

## 📚 Dokumentasi Endpoint API

### 1. Web Search API (`GET` / `POST`)
Pencarian teks lengkap dokumen web terindeks dengan pembobotan PageRank dan BM25.

* **Endpoint**: `/api/v1/search`
* **Method**: `GET` atau `POST`
* **Headers**:
  * `Authorization`: `Bearer dn_live_free_public_demo` (atau `X-API-Key`)
  * `Bypass-Tunnel-Reminder`: `true` *(Opsional untuk browser fetch)*

#### Query Parameters (GET):
* `q` *(string, wajib)*: Kata kunci pencarian.
* `limit` *(integer, default: 10, maks: 50)*: Jumlah dokumen per halaman.
* `page` *(integer, default: 1)*: Halaman hasil pencarian.
* `timeFilter` *(string, default: 'all')*: Filter waktu (`all`, `24h`, `7d`, `30d`, `1y`).

#### Contoh Request cURL:
```bash
curl -X GET "https://drops-lots-tunnel-world.trycloudflare.com/api/v1/search?q=Presiden%20Indonesia&limit=5" \
  -H "Authorization: Bearer dn_live_free_public_demo"
```

#### Contoh Request JSON (POST):
```bash
curl -X POST "https://drops-lots-tunnel-world.trycloudflare.com/api/v1/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dn_live_free_public_demo" \
  -d '{
    "query": "mobil listrik indonesia",
    "limit": 5
  }'
```

---

### 2. Breaking News API (`GET`)
Pencarian berita terkini yang dikumpulkan secara live dari 50+ media nasional dan RSS feed.

* **Endpoint**: `/api/v1/news`
* **Method**: `GET`
* **Parameter**:
  * `q` *(string)*: Kata kunci berita.
  * `limit` *(integer, default: 10)*: Jumlah berita.
  * `sort` *(string, default: 'latest')*: Urutan hasil (`latest` atau `relevance`).

#### Contoh Request:
```bash
curl -X GET "https://drops-lots-tunnel-world.trycloudflare.com/api/v1/news?q=gempa+bumi&limit=5" \
  -H "Authorization: Bearer dn_live_free_public_demo"
```

---

### 3. Image Search API (`GET`)
Pencarian jutaan gambar web terindeks dengan metadata resolusi dan domain asal.

* **Endpoint**: `/api/v1/images`
* **Method**: `GET`
* **Parameter**:
  * `q` *(string, wajib)*: Kata kunci gambar.
  * `limit` *(integer, default: 24, maks: 60)*: Jumlah gambar yang diambil.

#### Contoh Request:
```bash
curl -X GET "https://drops-lots-tunnel-world.trycloudflare.com/api/v1/images?q=teknologi+ai&limit=8" \
  -H "Authorization: Bearer dn_live_free_public_demo"
```

---

### 4. Health & QoS Governor Status (`GET`)
* **Endpoint**: `/api/v1/health`
* **Method**: `GET`
* **Deskripsi**: Memberikan telemetry real-time mesin pencari, status SQLite WAL, dan prioritas governor.

---

## 💻 Contoh Kode Integrasi

### Browser JavaScript (Frontend CORS Direct Hit)
```javascript
const API_BASE = "https://drops-lots-tunnel-world.trycloudflare.com/api/v1";
const API_KEY = "dn_live_free_public_demo";

async function cariWeb(query) {
  const url = `${API_BASE}/search?q=${encodeURIComponent(query)}&limit=5`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  });
  const data = await res.json();
  console.log(`⚡ Selesai dalam ${data.duration_ms}ms:`, data.results);
  return data;
}

cariWeb("Indonesia 2026");
```

### Python (Requests)
```python
import requests

API_KEY = "dn_live_free_public_demo"
URL = "https://drops-lots-tunnel-world.trycloudflare.com/api/v1/search"

headers = {"Authorization": f"Bearer {API_KEY}"}
params = {"q": "Kecerdasan Buatan AI", "limit": 5}

response = requests.get(URL, headers=headers, params=params)
data = response.json()

print(f"⚡ Latensi: {data.get('duration_ms')}ms | Total: {data.get('total_results')}")
for item in data.get("results", []):
    print(f"-> {item['title']} ({item['url']})")
```

### AI Agent Tool Schema (OpenAI / DeepSeek / LangChain)
```json
{
  "type": "function",
  "function": {
    "name": "deepernova_web_search",
    "description": "Lakukan pencarian web Indonesia real-time berkecepatan sub-20ms dengan peringkat PageRank + BM25 untuk mendapatkan fakta terkini, berita, dan referensi.",
    "parameters": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "Kata kunci pencarian atau pertanyaan faktual"
        },
        "limit": {
          "type": "integer",
          "description": "Jumlah hasil yang diinginkan (default 5, maks 20)",
          "default": 5
        }
      },
      "required": ["query"]
    }
  }
}
```

---

## 🛡️ Kunci URL Permanen (Custom Domain)
Jika Anda ingin menggunakan domain Anda sendiri (misal: `https://api.deepernova.com`):
1. Buka Cloudflare Dashboard -> **Zero Trust** -> **Networks** -> **Tunnels**.
2. Buat Tunnel baru yang mengarah ke `http://localhost:3000`.
3. Buka file `.env` dan masukkan:
   ```env
   PUBLIC_API_URL=https://api.deepernova.com
   CLOUDFLARE_TUNNEL_TOKEN=eyJhbGciOi...
   ```
4. Server dan portal dokumentasi akan otomatis mengunci ke domain permanen tersebut selamanya.
