# 🕸️ SKILL: RESILIENT WEB SCRAPING & CRAWLING ENGINE
Category: Web Automation, Scraping & Data Extraction
Keywords: [scraping, crawler, beautifulsoup, cheerio, python, requests, data mining, json, csv, parsing, extract]

## 🎯 TUJUAN & STANDAR KUALITAS
Membangun web scraper dan data extractor otomatis berketahanan tinggi menggunakan Python (`BeautifulSoup4` + `requests`) atau Node.js (`cheerio`). Scraper harus kebal terhadap pemblokiran sementara (anti-bot headers, user-agent rotation, exponential backoff) dan menghasilkan output data terstruktur (`.json` / `.csv`) yang bersih tanpa noise tag HTML.

---

## 🛡️ ATURAN ANTI-PEMBLOKIRAN & RETRY LOGIC
1. **Header Browser Realistis**:
   - Selalu sertakan `User-Agent`, `Accept`, `Accept-Language`, dan `Referer` yang menyerupai browser Chrome/Firefox desktop.
2. **Backoff Eksponensial**:
   - Jika menerima respons HTTP 429 (Too Many Requests) atau 503, tunggu jeda waktu `2 ** attempt` detik sebelum mencoba kembali.
3. **Pembersihan Konten Bersih**:
   - Buang tag `<script>`, `<style>`, `<nav>`, `<footer>` agar teks yang diekstraksi murni berupa konten artikel atau data tabel.

---

## 📋 TEMPLATE SCRIPT PYTHON LENGKAP & TERUJI

```python
import sys
import time
import json
import random
import requests
from bs4 import BeautifulSoup

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
]

def fetch_with_retry(url, max_retries=3):
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
        "DNT": "1",
        "Upgrade-Insecure-Requests": "1"
    }

    for attempt in range(1, max_retries + 1):
        try:
            res = requests.get(url, headers=headers, timeout=10)
            if res.status_code == 200:
                return res.text
            elif res.status_code in [429, 500, 502, 503]:
                wait = (2 ** attempt) + random.uniform(0.5, 1.5)
                print(f"[!] Status {res.status_code}. Melakukan retry ke-{attempt} dalam {wait:.1f} detik...")
                time.sleep(wait)
            else:
                print(f"[-] Gagal fetch ({res.status_code}) untuk: {url}")
                return None
        except requests.RequestException as e:
            wait = (2 ** attempt)
            print(f"[!] Request error: {e}. Retry dalam {wait} detik...")
            time.sleep(wait)

    return None

def scrape_and_extract_content(url, output_json="scraped_data.json"):
    print(f"[*] Menjelajahi halaman: {url}")
    html = fetch_with_retry(url)
    if not html:
        print("[-] Ekstraksi dibatalkan karena gagal mengambil konten.")
        return None

    soup = BeautifulSoup(html, "html.parser")

    # Bersihkan elemen noise
    for noise in soup(["script", "style", "nav", "footer", "iframe", "noscript"]):
        noise.decompose()

    # Ekstraksi Metadata Dasar
    page_title = soup.title.string.strip() if soup.title and soup.title.string else "No Title"
    
    meta_desc = ""
    desc_tag = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
    if desc_tag and desc_tag.get("content"):
        meta_desc = desc_tag["content"].strip()

    # Ekstraksi Heading Utama
    headings = []
    for h in soup.find_all(["h1", "h2", "h3"]):
        text = h.get_text(strip=True)
        if text:
            headings.append({"tag": h.name, "text": text})

    # Ekstraksi Paragraf Konten Inti
    paragraphs = []
    for p in soup.find_all("p"):
        p_text = p.get_text(strip=True)
        if len(p_text) > 30: # Abaikan snippet kecil
            paragraphs.append(p_text)

    # Ekstraksi Tautan Penting
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        anchor_text = a.get_text(strip=True)
        if href.startswith("http") and anchor_text:
            links.append({"text": anchor_text, "url": href})

    result = {
        "source_url": url,
        "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "title": page_title,
        "description": meta_desc,
        "total_headings": len(headings),
        "total_paragraphs": len(paragraphs),
        "total_links": len(links),
        "headings": headings[:15],
        "paragraphs": paragraphs[:25],
        "external_links": links[:20]
    }

    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"[SUCCESS] Scraping selesai. Data tersimpan di: {output_json}")
    print(f"-> Judul: {page_title}")
    print(f"-> Jumlah Paragraf Konten: {len(paragraphs)}")
    return result

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "https://news.ycombinator.com"
    scrape_and_extract_content(target)
```
