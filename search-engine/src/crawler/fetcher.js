export class HTTPFetcher {
  constructor(options = {}) {
    this.userAgent = options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
    this.timeoutMs = options.timeoutMs ?? 3200; // 3.2s ultra-snappy timeout for hyper-speed crawling
    this.maxBytes = options.maxBytes ?? (2.5 * 1024 * 1024); // 2.5 MB snappy limit
  }

  async fetch(urlStr) {
    return this.fetchPage(urlStr);
  }

  /**
   * Fetches an HTML/RSS page with performance optimizations & safety limits
   */
  async fetchPage(urlStr) {
    const startTime = performance.now();
    let timeoutId = null;

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const err = new Error('Request Timeout (Snappy Limit)');
        err.name = 'TimeoutError';
        reject(err);
      }, this.timeoutMs + 800);
    });

    try {
      const fetchPromise = (async () => {
        const response = await fetch(urlStr, {
          signal: AbortSignal.timeout(this.timeoutMs),
          redirect: 'follow',
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/xml,application/rss+xml,application/atom+xml,text/plain,*/*;q=0.8',
            'Accept-Language': 'id,id-ID;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Sec-Ch-Ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
          }
        });

        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        const contentLengthHeader = response.headers.get('content-length');

        // Verify Content-Type (HTML, XHTML, XML, RSS, Atom, Plain text)
        const isAcceptable = contentType.includes('text/html') ||
          contentType.includes('application/xhtml+xml') ||
          contentType.includes('xml') ||
          contentType.includes('text/plain') ||
          contentType === '';

        if (!isAcceptable) {
          return {
            success: false,
            status: response.status,
            statusText: 'Non-HTML/XML Content Type',
            contentType,
            latencyMs: Math.round(performance.now() - startTime),
            url: response.url || urlStr
          };
        }

        // Check Content-Length header early
        if (contentLengthHeader) {
          const clen = parseInt(contentLengthHeader, 10);
          if (clen > this.maxBytes) {
            return {
              success: false,
              status: response.status,
              statusText: `Payload too large (${clen} bytes)`,
              latencyMs: Math.round(performance.now() - startTime),
              url: response.url || urlStr
            };
          }
        }

        if (!response.ok) {
          return {
            success: false,
            status: response.status,
            statusText: response.statusText,
            latencyMs: Math.round(performance.now() - startTime),
            url: response.url || urlStr
          };
        }

        // Read response body safely with native response.text() (capped at 500KB for ultra-fast non-blocking DOM parsing)
        const rawHtml = await response.text();
        const html = rawHtml.length > 500000 ? rawHtml.slice(0, 500000) : rawHtml;
        const totalBytes = Buffer.byteLength(html, 'utf8');

        return {
          success: true,
          status: response.status,
          url: response.url || urlStr,
          finalUrl: response.url,
          html,
          bytes: totalBytes,
          contentType,
          latencyMs: Math.round(performance.now() - startTime)
        };
      })();

      const result = await Promise.race([fetchPromise, timeoutPromise]);
      clearTimeout(timeoutId);
      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        status: 0,
        statusText: err.name === 'AbortError' || err.name === 'TimeoutError' ? 'Request Timeout' : (err.message || 'Fetch Failed'),
        latencyMs,
        url: urlStr
      };
    }
  }
}
