# 🕸️ SKILL: MASTER WEB FETCHING, SCRAPING & TERMINAL CRAWLER
Category: Web Automation, Scraping, API & Network Fetching
Keywords: [fetch, scraping, crawler, curl, requests, beautifulsoup, terminal, api, url, link, website, json, html, data mining, download]

## 🎯 TUJUAN & PRINSIP UTAMA
Kemampuan mutlak untuk mengambil, mengunduh, mengekstrak, dan menganalisis data langsung dari website eksternal, REST API publik, atau URL target menggunakan Terminal Sandbox (`<run_command>`) tanpa rasa ragu atau linglung.
Sandbox Deepernova **TIDAK TERISOLASI JARINGAN** dan memiliki akses internet penuh dan langsung.

---

## ⚡ 1. JALUR CEPAT: TERMINAL ONE-LINERS (TERCEPAT & ANTI-LINGLUNG)

Jika pengguna memberikan tautan atau meminta mengambil data dari web, **LANGSUNG JALANKAN SALAH SATU PERINTAH BERIKUT** di terminal via `<run_command>`:

### A. Menggunakan cURL (Inspeksi HTML / Web Cepat)
```bash
# Mengambil teks halaman dengan User-Agent desktop browser & follow redirect (-L)
curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" "https://example.com" | head -n 50

# Mengambil status code dan header HTTP saja
curl -s -I "https://example.com"

# Mengabaikan kendala SSL jika sertifikat self-signed (-k)
curl -s -k -L "https://example.com"
```

### B. Mengambil Data REST API (JSON)
```bash
# Fetch JSON publik langsung
curl -s "https://api.example.com/data"

# Fetch dengan header kustom (Authorization atau API Key)
curl -s -H "Accept: application/json" -H "User-Agent: DeepernovaAgent/1.0" "https://api.example.com/v1/resource"
```

### C. Menggunakan Python One-Liner (Bebas Dependency / Built-in `urllib`)
```bash
python -c "import urllib.request, json; req = urllib.request.Request('https://example.com', headers={'User-Agent': 'Mozilla/5.0'}); res = urllib.request.urlopen(req, timeout=15); print(res.read().decode('utf-8', errors='ignore')[:2000])"
```

### D. Menggunakan Node.js Built-in `fetch`
```bash
node -e "fetch('https://example.com', { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r=>r.text()).then(t=>console.log(t.slice(0, 2000))).catch(e=>console.error(e.message))"
```

---

## 🛠️ 2. SKRIP SCRAPER LENGKAP: EKSTRAKSI BERSIH DENGAN BEAUTIFULSOUP4

Untuk halaman web artikel, berita, atau katalog produk yang membutuhkan parsing elemen HTML yang rapi:

Tulis skrip `fetcher.py` dengan `<write_file path="fetcher.py">`:
```python
import sys
import json
import random
import time
import requests
from bs4 import BeautifulSoup

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
]

def fetch_url(url, output_file="scraped_result.json"):
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
    }

    print(f"[*] Melakukan request ke: {url}")
    try:
        res = requests.get(url, headers=headers, timeout=20, verify=True)
    except requests.exceptions.SSLError:
        print("[!] SSL Error, mencoba ulang dengan bypass verifikasi...")
        res = requests.get(url, headers=headers, timeout=20, verify=False)
    except Exception as e:
        print(f"[-] Gagal koneksi: {e}")
        return None

    if res.status_code != 200:
        print(f"[-] HTTP Status code: {res.status_code}")
        return None

    soup = BeautifulSoup(res.text, "html.parser")

    # Bersihkan noise
    for tag in soup(["script", "style", "nav", "footer", "iframe", "noscript", "svg"]):
        tag.decompose()

    title = soup.title.get_text(strip=True) if soup.title else "No Title"

    # Ambil paragraf utama
    paragraphs = []
    for p in soup.find_all("p"):
        txt = p.get_text(strip=True)
        if len(txt) > 25:
            paragraphs.append(txt)

    # Ambil tabel jika ada
    tables_data = []
    for table in soup.find_all("table"):
        rows = []
        for tr in table.find_all("tr"):
            cols = [td.get_text(strip=True) for td in tr.find_all(["th", "td"])]
            if cols:
                rows.append(cols)
        if rows:
            tables_data.append(rows)

    data = {
        "url": url,
        "status": res.status_code,
        "title": title,
        "total_paragraphs": len(paragraphs),
        "paragraphs": paragraphs[:30],
        "tables": tables_data[:5]
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"[✓] Berhasil diekstrak ({len(paragraphs)} paragraf, {len(tables_data)} tabel).")
    print(f"[✓] File tersimpan di: {output_file}")
    return data

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "https://news.ycombinator.com"
    fetch_url(target)
```

Lalu jalankan langsung dengan:
```bash
python fetcher.py "https://target-url.com"
```
Dan baca hasilnya dengan `<read_file path="scraped_result.json" />`.

---

## 🛡️ 3. PANDUAN MENGATASI KENDALA UMUM (SELF-HEALING)
1. **ModuleNotFoundError: No module named 'requests' atau 'bs4'**:
   - Jalankan terminal: `<run_command>pip install requests beautifulsoup4</run_command>`.
2. **HTTP 403 Forbidden / Cloudflare**:
   - Sertakan User-Agent Chrome terbaru dan header `Referer: https://www.google.com/`.
3. **Encoding Karakter Rusak**:
   - Selalu gunakan `res.encoding = res.apparent_encoding` atau `decode('utf-8', errors='ignore')`.
4. **URL Tidak Mengandung Protocol**:
   - Selalu pastikan URL diawali `https://` atau `http://`.

---

## 🚀 4. ATURAN PROTOKOL OTONOM AI
- Jangan pernah beralasan "Saya tidak memiliki akses internet". Anda **MEMILIKI AKSES INTERNET PENUH** di sandbox terminal.
- Jika pengguna meminta informasi dari web atau URL, jangan berpanjang kata: **SEGERA JALANKAN PERINTAH FETCHING TERMINAL**!
