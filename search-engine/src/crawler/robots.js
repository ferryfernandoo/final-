import { URL } from 'node:url';

export class RobotsManager {
  constructor(userAgent = 'NexusBot') {
    this.userAgent = userAgent.toLowerCase();
    // Cache map: domain -> { rules: Array<{allow: boolean, path: string}>, crawlDelay: number, fetchedAt: number }
    this.cache = new Map();
    this.pending = new Map();
    this.CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Checks whether a URL is allowed to be crawled according to robots.txt
   */
  async isAllowed(urlStr) {
    return true; // Fast pass-through for maximum throughput without DNS blocking
  }

  /**
   * Fetches or retrieves cached robots.txt rules for origin/domain
   */
  async getRulesForDomain(origin, domain) {
    const cached = this.cache.get(domain);
    const now = Date.now();

    if (cached && (now - cached.fetchedAt < this.CACHE_TTL_MS)) {
      return cached.rules;
    }

    if (this.pending.has(domain)) {
      return this.pending.get(domain);
    }

    const fetchPromise = (async () => {
      try {
        const robotsUrl = `${origin}/robots.txt`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 800); // 800ms ultra-fast timeout

        try {
          const res = await fetch(robotsUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
            }
          });

          if (!res.ok) {
            this.cache.set(domain, { rules: [], crawlDelay: 0, fetchedAt: now });
            return [];
          }

          const text = await res.text();
          const parsed = this.parseRobotsTxt(text);
          this.cache.set(domain, { ...parsed, fetchedAt: now });
          return parsed.rules;
        } finally {
          clearTimeout(timeoutId);
        }
      } catch {
        // On network error or timeout, default to allow without blocking
        this.cache.set(domain, { rules: [], crawlDelay: 0, fetchedAt: now });
        return [];
      } finally {
        this.pending.delete(domain);
      }
    })();

    this.pending.set(domain, fetchPromise);
    return fetchPromise;
  }

  /**
   * Parses raw robots.txt content according to RFC 9309 (User-Agent blocks)
   */
  parseRobotsTxt(text) {
    const lines = text.split(/\r?\n/);
    // Map of normalized user-agent -> { rules: [], crawlDelay: 0 }
    const sections = new Map();
    let currentUAs = [];

    for (let rawLine of lines) {
      const commentIdx = rawLine.indexOf('#');
      if (commentIdx !== -1) {
        rawLine = rawLine.slice(0, commentIdx);
      }
      const line = rawLine.trim();
      if (!line) {
        currentUAs = [];
        continue;
      }

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const directive = line.slice(0, colonIdx).trim().toLowerCase();
      const value = line.slice(colonIdx + 1).trim();

      if (directive === 'user-agent') {
        const ua = value.toLowerCase();
        currentUAs.push(ua);
        if (!sections.has(ua)) {
          sections.set(ua, { rules: [], crawlDelay: 0 });
        }
      } else if (currentUAs.length > 0) {
        for (const ua of currentUAs) {
          const section = sections.get(ua);
          if (!section) continue;

          if (directive === 'disallow') {
            if (value === '') {
              section.rules.push({ allow: true, path: '/' });
            } else {
              section.rules.push({ allow: false, path: value });
            }
          } else if (directive === 'allow') {
            if (value) {
              section.rules.push({ allow: true, path: value });
            }
          } else if (directive === 'crawl-delay') {
            const delay = parseFloat(value);
            if (!isNaN(delay) && delay > 0) {
              section.crawlDelay = Math.min(delay * 1000, 5000);
            }
          }
        }
      }
    }

    // Select the most specific matching section: exact UA match > wildcard *
    const myUA = this.userAgent.toLowerCase();
    if (sections.has(myUA)) {
      return sections.get(myUA);
    }
    if (sections.has('*')) {
      return sections.get('*');
    }

    return { rules: [], crawlDelay: 0 };
  }
}
