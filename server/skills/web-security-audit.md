# 🛡️ SKILL: MASTER WEB SECURITY AUDITING, PENTESTING & VULNERABILITY ASSESSMENT
Category: Cybersecurity, Penetration Testing & Defensive Hardening
Keywords: [security, cyber security, pentest, penetration testing, vulnerability, owasp, audit web, tes keamanan, cek keamanan, audit keamanan, headers, ssl, tls, cors, sqli, xss, csrf, vapt, hardening, cookies]

## 🎯 TUJUAN & STANDAR KUALITAS
Memberikan metodologi komprehensif, mendalam, dan teruji bagi AI Agent untuk melakukan **audit keamanan website, ethical penetration testing, dan vulnerability assessment (VAPT)** terhadap target web publik maupun lokal secara otonom, presisi, berbasis data nyata, dan menghasilkan laporan audit bertaraf industri (OWASP Top 10 & ASVS Standard).

---

## 🔍 METODOLOGI AUDIT KEAMANAN WEB KOMPREHENSIF (7 TAHAP)

### 1. Reconnaissance & Surface Mapping
- **DNS & IP Resolution**: Menentukan alamat IP hosting, CDN (Cloudflare, Fastly, Akamai, AWS CloudFront), dan reverse-proxy.
- **Server & Tech Fingerprinting**: Memeriksa header bocor (`Server`, `X-Powered-By`, `X-AspNet-Version`, `X-Generator`, `X-Drupal-Cache`) yang membocorkan versi teknologi server ke publik.

### 2. TLS/SSL & Cryptographic Transport Layer Audit
- **Certificate Validity**: Memverifikasi validitas sertifikat X.509, CA Issuer (Let's Encrypt, DigiCert, Sectigo), dan masa berlaku (expiry alert jika < 30 hari).
- **Protocol & Cipher Suite Check**: Memastikan target menggunakan minimal **TLS 1.2 / TLS 1.3**. Mendeteksi protokol usang dan rentan (SSLv2, SSLv3, TLS 1.0, TLS 1.1) serta weak ciphers (RC4, 3DES, CBC).

### 3. HTTP Security Headers Benchmark (OWASP ASVS)
Setiap website modern **WAJIB** menerapkan 7 header keamanan esensial:
1. `Strict-Transport-Security` (HSTS): Mencegah SSL Striping (`max-age=31536000; includeSubDomains; preload`).
2. `Content-Security-Policy` (CSP): Mitigasi utama serangan XSS (Cross-Site Scripting) dan data injection.
3. `X-Frame-Options`: Mencegah Clickjacking / UI Redressing (`DENY` atau `SAMEORIGIN`).
4. `X-Content-Type-Options`: Mencegah MIME-type sniffing (`nosniff`).
5. `Referrer-Policy`: Melindungi kebocoran token atau data sensitif di query string URL (`strict-origin-when-cross-origin` atau `no-referrer`).
6. `Permissions-Policy`: Membatasi akses sensor, mikrofon, kamera, dan geolocation.
7. `Cross-Origin-Opener-Policy` (COOP) & `Cross-Origin-Resource-Policy` (CORP): Isolasi proses peramban terhadap serangan Spectre/XS-Leaks.

### 4. CORS (Cross-Origin Resource Sharing) Misconfiguration Audit
- Mengirim request dengan header `Origin: https://attacker.com` atau `Origin: null`.
- **Rentan Kritis**: Jika target merespons dengan `Access-Control-Allow-Origin: *` atau merefleksikan origin sembarang bersamaan dengan `Access-Control-Allow-Credentials: true`.

### 5. Cookie Security & Session Flags Audit
- Memeriksa setiap cookie session yang diterbitkan server:
  - `Secure`: Cookie hanya dikirim melalui enkripsi HTTPS.
  - `HttpOnly`: Mencegah akses cookie oleh JavaScript berbahaya (anti pencurian sesi via XSS).
  - `SameSite`: Membatasi pengiriman cookie lintas origin (`Strict` atau `Lax`) untuk mitigasi CSRF.

### 6. Information Disclosure & Public Exposure Scanning (Non-Destructive)
- Memeriksa keterpaparan berkas sensitif yang sering tidak sengaja terbuka ke publik:
  - `robots.txt` & `sitemap.xml` (informasi direktori internal atau tersembunyi).
  - `/.well-known/security.txt` (kontak pelaporan keamanan resmi RFC 9116).
  - `/.git/HEAD` atau `/.env` (kebocoran fatal source code dan environment credentials).
  - `/phpinfo.php`, `/swagger-ui.html`, `/openapi.json`, `/actuator/health` (dokumentasi internal).

### 7. HTTP Verb Tampering & Dangerous Methods
- Mengirim request `OPTIONS` dan `TRACE`. Jika `TRACE` diizinkan, website rentan terhadap Cross-Site Tracing (XST).

---

## 🐍 MESIN AUDIT KEAMANAN OTOMATIS (RUNNABLE PYTHON SCANNER)
AI Agent dapat langsung menulis dan menjalankan skrip `audit_scanner.py` berikut di sandbox untuk memindai target URL dan menghasilkan laporan JSON & Markdown secara instan:

```python
import sys
import os
import socket
import ssl
import json
import urllib.parse
from datetime import datetime
import requests

def run_security_audit(target_url):
    print(f"[*] Memulai Web Security Audit untuk: {target_url}")
    if not target_url.startswith("http://") and not target_url.startswith("https://"):
        target_url = "https://" + target_url

    parsed = urllib.parse.urlparse(target_url)
    hostname = parsed.hostname
    port = parsed.port or (443 if parsed.scheme == "https" else 80)

    report = {
        "target": target_url,
        "hostname": hostname,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S WIB"),
        "score": 100,
        "grade": "A",
        "ip_address": None,
        "ssl_tls": {},
        "missing_headers": [],
        "present_headers": {},
        "leaked_fingerprints": [],
        "cors_issue": None,
        "cookie_issues": [],
        "sensitive_paths": [],
        "remediation_plan": []
    }

    # 1. IP & DNS Resolution
    try:
        ip = socket.gethostbyname(hostname)
        report["ip_address"] = ip
        print(f"[+] Hostname resolved: {hostname} -> {ip}")
    except Exception as e:
        print(f"[-] Gagal resolve hostname: {e}")
        report["ip_address"] = "Resolution Failed"

    # 2. SSL/TLS Audit (Jika HTTPS)
    if parsed.scheme == "https":
        try:
            ctx = ssl.create_default_context()
            with socket.create_connection((hostname, port), timeout=6) as sock:
                with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    cipher = ssock.cipher()
                    version = ssock.version()
                    
                    not_after = cert.get("notAfter", "")
                    expire_date = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z") if not_after else None
                    days_left = (expire_date - datetime.utcnow()).days if expire_date else None

                    issuer_dict = dict(x[0] for x in cert.get("issuer", []))
                    issuer_org = issuer_dict.get("organizationName") or issuer_dict.get("commonName", "Unknown CA")

                    report["ssl_tls"] = {
                        "protocol": version,
                        "cipher": cipher[0] if cipher else "Unknown",
                        "issuer": issuer_org,
                        "expires_at": not_after,
                        "days_remaining": days_left,
                        "status": "VALID" if days_left and days_left > 0 else "EXPIRED"
                    }

                    if days_left and days_left < 30:
                        report["score"] -= 10
                        report["remediation_plan"].append(f"Perbarui sertifikat SSL (sisa {days_left} hari).")
        except Exception as ssl_err:
            report["score"] -= 25
            report["ssl_tls"] = {"error": str(ssl_err), "status": "INVALID / UNTRUSTED"}
            report["remediation_plan"].append("Perbaiki konfigurasi SSL/TLS atau gunakan sertifikat terpercaya.")

    # 3. HTTP Request & Headers Audit
    headers_req = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) DeepernovaSecurityAudit/3.0",
        "Accept": "*/*"
    }

    try:
        session = requests.Session()
        res = session.get(target_url, headers=headers_req, timeout=8, verify=False, allow_redirects=True)
        res_headers = {k.lower(): v for k, v in res.headers.items()}
        report["http_status"] = res.status_code

        # Audit 7 Security Headers
        req_headers = [
            ("strict-transport-security", 15, "HIGH", "HSTS tidak aktif. Serangan MITM & SSL Stripping dimungkinkan.", "Tambahkan header: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload"),
            ("content-security-policy", 20, "CRITICAL", "CSP absen. Aplikasi rentan terhadap Cross-Site Scripting (XSS).", "Konfigurasikan Content-Security-Policy ketat yang membatasi script source."),
            ("x-frame-options", 15, "HIGH", "X-Frame-Options tidak ditemukan. Rentan terhadap Clickjacking.", "Setel X-Frame-Options: DENY atau SAMEORIGIN."),
            ("x-content-type-options", 10, "MEDIUM", "X-Content-Type-Options: nosniff tidak ada. Berisiko MIME-sniffing.", "Tambahkan header: X-Content-Type-Options: nosniff"),
            ("referrer-policy", 10, "MEDIUM", "Referrer-Policy tidak disetel. URL query sensitif dapat bocor.", "Setel Referrer-Policy: strict-origin-when-cross-origin"),
            ("permissions-policy", 5, "LOW", "Permissions-Policy tidak membatasi fitur browser (kamera/geo).", "Setel Permissions-Policy: camera=(), microphone=(), geolocation=()"),
            ("cross-origin-opener-policy", 5, "LOW", "COOP tidak ada. Rentan isolasi cross-origin.", "Setel Cross-Origin-Opener-Policy: same-origin")
        ]

        for h_name, penalty, sev, risk, fix in req_headers:
            if h_name in res_headers:
                report["present_headers"][h_name] = res_headers[h_name]
            else:
                report["score"] -= penalty
                report["missing_headers"].append({
                    "header": h_name,
                    "severity": sev,
                    "risk": risk,
                    "solution": fix
                })
                report["remediation_plan"].append(fix)

        # Audit Information Leaks
        leak_headers = ["server", "x-powered-by", "x-aspnet-version", "x-generator"]
        for lh in leak_headers:
            if lh in res_headers:
                report["score"] -= 5
                val = res_headers[lh]
                report["leaked_fingerprints"].append({"header": lh, "value": val})
                report["remediation_plan"].append(f"Hapus header banner '{lh}: {val}' dari konfigurasi web server.")

        # Audit Cookies
        for cookie in session.cookies:
            c_issues = []
            if not cookie.secure:
                c_issues.append("Missing 'Secure' flag")
            if not cookie.has_nonstandard_attr("httponly") and not cookie._rest.get("HttpOnly"):
                c_issues.append("Missing 'HttpOnly' flag")
            
            samesite = cookie._rest.get("SameSite", "")
            if not samesite:
                c_issues.append("Missing 'SameSite' attribute")

            if c_issues:
                report["score"] -= 10
                report["cookie_issues"].append({
                    "name": cookie.name,
                    "issues": c_issues
                })
                report["remediation_plan"].append(f"Amankan cookie '{cookie.name}' dengan flag Secure, HttpOnly, dan SameSite=Lax/Strict.")

        # 4. CORS Audit
        try:
            cors_res = requests.get(target_url, headers={"Origin": "https://attacker-domain.xyz"}, timeout=5, verify=False)
            acao = cors_res.headers.get("access-control-allow-origin")
            acac = cors_res.headers.get("access-control-allow-credentials")
            if acao == "https://attacker-domain.xyz" or (acao == "*" and acac == "true"):
                report["score"] -= 20
                report["cors_issue"] = f"CORS Misconfiguration Terdeteksi: merefleksikan Origin asing ({acao}) dengan Credentials={acac}"
                report["remediation_plan"].append("Batasi Access-Control-Allow-Origin hanya untuk domain whitelist yang sah.")
        except Exception:
            pass

        # 5. Sensitive File Exposure Audit (Passive)
        sensitive_paths = ["/robots.txt", "/.well-known/security.txt", "/.git/HEAD", "/.env", "/sitemap.xml"]
        for p in sensitive_paths:
            test_path_url = urllib.parse.urljoin(target_url, p)
            try:
                p_res = requests.get(test_path_url, timeout=4, verify=False, headers=headers_req)
                if p_res.status_code == 200 and len(p_res.text) > 0:
                    is_critical = p in ["/.git/HEAD", "/.env"]
                    report["sensitive_paths"].append({
                        "path": p,
                        "status": p_res.status_code,
                        "risk": "KRITIS: Kebocoran repositori/rahasia!" if is_critical else "Informatif: Direktori publik terdeteksi"
                    })
                    if is_critical:
                        report["score"] -= 30
                        report["remediation_plan"].append(f"Blokir akses publik ke {p} di web server secepatnya!")
            except Exception:
                pass

    except Exception as net_err:
        print(f"[-] Network connection error: {net_err}")
        report["error"] = str(net_err)

    # Calculate Final Score & Grade
    report["score"] = max(0, min(100, report["score"]))
    s = report["score"]
    report["grade"] = "A (SANGAT AMAN / HARDENED)" if s >= 90 else "B (BAIK / CUKUP AMAN)" if s >= 75 else "C (RENTAN / BUTUH PERBAIKAN)" if s >= 50 else "F (KRITIS / BERBAHAYA)"

    # Output JSON Report
    with open("security_audit_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    # Output Markdown Report
    md_content = f"""# 🛡️ LAPORAN AUDIT KEAMANAN WEB & VAPT
**Target:** `{report['target']}`  
**Waktu Audit:** {report['timestamp']}  
**IP Server:** `{report['ip_address']}`  
**Skor Keamanan:** **{report['score']} / 100** [{report['grade']}]

---

### 1. Status Enkripsi TLS/SSL
- **Protokol:** {report['ssl_tls'].get('protocol', 'N/A')}
- **Cipher Suite:** {report['ssl_tls'].get('cipher', 'N/A')}
- **Otoritas Penerbit (CA):** {report['ssl_tls'].get('issuer', 'N/A')}
- **Sisa Masa Berlaku:** {report['ssl_tls'].get('days_remaining', 'N/A')} hari

---

### 2. Temuan Header Keamanan yang Absen ({len(report['missing_headers'])} Temuan)
"""
    for m in report['missing_headers']:
        md_content += f"- **[{m['severity']}] `{m['header']}`**: {m['risk']}\n"

    if report['leaked_fingerprints']:
        md_content += "\n### 3. Kebocoran Informasi Server\n"
        for lk in report['leaked_fingerprints']:
            md_content += f"- Header `{lk['header']}` membocorkan: `{lk['value']}`\n"

    if report['cookie_issues']:
        md_content += "\n### 4. Masalah Cookie Tanpa Perlindungan\n"
        for ck in report['cookie_issues']:
            md_content += f"- Cookie `{ck['name']}`: {', '.join(ck['issues'])}\n"

    if report['sensitive_paths']:
        md_content += "\n### 5. Keterpaparan Berkas Sensitif\n"
        for sp in report['sensitive_paths']:
            md_content += f"- Path `{sp['path']}` (HTTP {sp['status']}): {sp['risk']}\n"

    md_content += "\n---\n### 🚀 Langkah Mitigasi & Rekomendasi Hardening\n"
    for idx, rem in enumerate(report['remediation_plan'], 1):
        md_content += f"{idx}. {rem}\n"

    with open("security_audit_report.md", "w", encoding="utf-8") as f:
        f.write(md_content)

    print("\n" + "="*60)
    print("✅ AUDIT KEAMANAN SELESAI DILAKUKAN")
    print(f"Target: {report['target']}")
    print(f"Skor: {report['score']}/100 [{report['grade']}]")
    print(f"Berkas Laporan: security_audit_report.json & security_audit_report.md")
    print("="*60)

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "https://google.com"
    run_security_audit(target)
```

---

## 📋 PROTOKOL EKSEKUSI OTONOM BAGI AI AGENT (WAJIB DIIKUTI)
Ketika pengguna memberikan instruksi untuk **menguji, mengetes, atau mengaudit keamanan suatu website**:
1. **DILARANG BINGUNG ATAU BERTEORI**: Jangan menolak atau hanya menulis penjelasan teoritis. Sandbox Anda memiliki akses terminal dan koneksi internet penuh!
2. **TULIS SKRIP AUDIT**: Buat berkas scanner di sandbox:
   `<write_file path="audit.py">...kode scanner python di atas...</write_file>`
3. **JALANKAN DENGAN TERMINAL**:
   `<run_command>python audit.py "TARGET_URL"</run_command>`
4. **VERIFIKASI HASIL**:
   `<check_file path="security_audit_report.json" />`
   `<check_file path="security_audit_report.md" />`
5. **BERIKAN KESIMPULAN EKSEKUTIF PADAT**:
   Tampilkan skor keamanan, grade (A/B/C/F), temuan kritis (missing headers, SSL status, cookies, info leaks), dan berkas deliverable laporan di sandbox.
