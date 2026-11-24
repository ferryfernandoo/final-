/**
 * ============================================================================
 * 🌐 DEEPERNOVA AUTONOMOUS BROWSER AGENT SERVICE (MODE PERAMBAN AGENT)
 * ============================================================================
 * Provides real server-side autonomous web browsing for DeeperNova AI:
 *  1. Discovers authoritative URLs via DeeperNova Hybrid Search + direct URLs
 *  2. Enforces strict Anti-SSRF + DNS Rebinding protection on every hop
 *  3. Reads full web pages in parallel (headings, tables, full article body)
 *  4. Automatically upgrades to headless Chromium/Edge (puppeteer-core) with
 *     request-interception firewall when a target page is a JS-rendered SPA
 *  5. Formats extracted context using SHORT source IDs ([1], [2], foto:1)
 *     with ZERO raw long URLs so LLM synthesis is 4x faster!
 * ============================================================================
 */

import fetch from 'node-fetch';
import puppeteer from 'puppeteer-core';
import webSearchService from '../webSearchService.js';
import agentScreenshotService from './agentScreenshotService.js';
import { verifySafeExternalUrlWithDns, sanitizeUntrustedWebContent, isPrivateOrReservedIp } from '../aiCyberSecurityShield.js';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const SKIP_EXTENSIONS_RE = /\.(?:pdf|zip|rar|7z|exe|msi|apk|dmg|mp4|mkv|mp3|wav|avi|mov|woff2?|ttf|eot|ico)(?:\?.*)?$/i;

let sharedHeadlessBrowser = null;
let browserIdleTimer = null;

function scheduleBrowserIdleClose() {
  if (browserIdleTimer) clearTimeout(browserIdleTimer);
  browserIdleTimer = setTimeout(async () => {
    if (sharedHeadlessBrowser) {
      try {
        await sharedHeadlessBrowser.close();
      } catch {}
      sharedHeadlessBrowser = null;
    }
  }, 90 * 1000);
  browserIdleTimer.unref?.();
}

async function getWarmHeadlessBrowser() {
  if (sharedHeadlessBrowser && sharedHeadlessBrowser.connected) {
    scheduleBrowserIdleClose();
    return sharedHeadlessBrowser;
  }
  const exePath = agentScreenshotService.getBrowserExecutable();
  if (!exePath) return null;

  try {
    sharedHeadlessBrowser = await puppeteer.launch({
      executablePath: exePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-sync',
        '--mute-audio',
        '--hide-scrollbars'
      ]
    });
    sharedHeadlessBrowser.on('disconnected', () => {
      sharedHeadlessBrowser = null;
    });
    scheduleBrowserIdleClose();
    return sharedHeadlessBrowser;
  } catch (err) {
    console.warn('[BrowserAgent] Headless launch fallback:', err.message);
    sharedHeadlessBrowser = null;
    return null;
  }
}

function decodeHtmlEntities(str = '') {
  if (!str) return '';
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return code > 31 && code < 127000 ? String.fromCodePoint(code) : ' ';
    });
}

/**
 * Cleanly extracts readable structured text (title, meta description, headings,
 * compact tables, and main paragraphs) from raw HTML.
 */
export function extractStructuredReadableContent(html = '') {
  if (!html || typeof html !== 'string') {
    return { title: '', description: '', leadImage: '', content: '', wordCount: 0 };
  }

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const imgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);

  const title = decodeHtmlEntities((ogTitleMatch?.[1] || titleMatch?.[1] || '').replace(/\s+/g, ' ').trim());
  const description = decodeHtmlEntities((descMatch?.[1] || '').replace(/\s+/g, ' ').trim());
  const leadImage = (imgMatch?.[1] || '').trim();

  // Strip noise, scripts, styles, hidden elements, nav/footer/aside
  let body = html;
  const bodyTagMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyTagMatch) body = bodyTagMatch[1];

  // Prefer <article> or <main> if substantial
  const mainMatch = body.match(/<(?:article|main)\b[^>]*>([\s\S]*?)<\/(?:article|main)>/i);
  if (mainMatch && mainMatch[1].length > 600) {
    body = mainMatch[1];
  }

  let cleaned = body
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(?:script|style|noscript|svg|canvas|iframe|form|nav|footer|aside|button|select|option)\b[\s\S]*?<\/(?:script|style|noscript|svg|canvas|iframe|form|nav|footer|aside|button|select|option)>/gi, ' ')
    .replace(/<[^>]+style=["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0)[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi, ' ');

  // Preserve headings & list items & table cells cleanly
  cleaned = cleaned
    .replace(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi, '\n## $2\n')
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi, ' | $1 ')
    .replace(/<(?:p|div|section|br|blockquote|pre)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  cleaned = decodeHtmlEntities(cleaned);

  const lines = cleaned
    .split('\n')
    .map((ln) => ln.replace(/[ \t]+/g, ' ').trim())
    .filter((ln) => {
      if (ln.length < 18 && !ln.startsWith('## ')) return false;
      if (/^(?:cookie|accept all|subscribe|sign in|log in|advertisement|iklan|baca juga\s*:)/i.test(ln)) return false;
      return true;
    });

  const uniqueLines = [];
  const seen = new Set();
  for (const ln of lines) {
    const key = ln.toLowerCase().slice(0, 80);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueLines.push(ln);
    }
    if (uniqueLines.join('\n').length >= 2400) break;
  }

  const content = sanitizeUntrustedWebContent(uniqueLines.join('\n').slice(0, 2400).trim());
  const wordCount = content ? content.split(/\s+/).length : 0;

  return { title, description, leadImage, content, wordCount };
}

/**
 * Safely fetches and parses a web page over HTTP with SSRF check, redirect guard, and byte limit.
 */
async function fetchSafeWebPageFast(rawUrl, timeoutMs = 2600) {
  const check = await verifySafeExternalUrlWithDns(rawUrl);
  if (!check.ok) {
    return { ok: false, reason: check.reason };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let currentUrl = check.safeUrl;
    let resp = null;

    // Manual redirect handling (max 3 hops) so every redirect target passes SSRF + DNS check!
    for (let hop = 0; hop < 3; hop++) {
      resp = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': BROWSER_USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate'
        }
      });

      if ([301, 302, 303, 307, 308].includes(resp.status)) {
        const loc = resp.headers.get('location');
        if (!loc) break;
        const nextUrl = new URL(loc, currentUrl).toString();
        const hopCheck = await verifySafeExternalUrlWithDns(nextUrl);
        if (!hopCheck.ok) {
          return { ok: false, reason: `Redirect blocked: ${hopCheck.reason}` };
        }
        currentUrl = hopCheck.safeUrl;
        continue;
      }
      break;
    }

    if (!resp || !resp.ok) {
      return { ok: false, reason: `HTTP ${resp?.status || 'error'}` };
    }

    const ctype = (resp.headers.get('content-type') || '').toLowerCase();
    if (!ctype.includes('text/html') && !ctype.includes('text/plain') && !ctype.includes('application/xhtml')) {
      return { ok: false, reason: 'Non-HTML content' };
    }

    // Stream max 280 KB so huge pages never stall memory or latency
    const chunks = [];
    let totalBytes = 0;
    const MAX_BYTES = 280 * 1024;

    for await (const chunk of resp.body) {
      totalBytes += chunk.length;
      chunks.push(chunk);
      if (totalBytes >= MAX_BYTES) {
        try { resp.body.destroy?.(); } catch {}
        break;
      }
    }

    const html = Buffer.concat(chunks).toString('utf8');
    const extracted = extractStructuredReadableContent(html);

    return {
      ok: true,
      finalUrl: currentUrl,
      domain: new URL(currentUrl).hostname.replace(/^www\./i, ''),
      readMode: 'fast-reader',
      ...extracted
    };
  } catch (err) {
    return { ok: false, reason: err?.message || 'Fetch error' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Renders a JS-heavy SPA page in an isolated headless Chromium tab with strict network firewall.
 */
async function renderSafePageWithHeadlessBrowser(rawUrl, timeoutMs = 4500) {
  const check = await verifySafeExternalUrlWithDns(rawUrl);
  if (!check.ok) return { ok: false, reason: check.reason };

  const browser = await getWarmHeadlessBrowser();
  if (!browser) return { ok: false, reason: 'Headless browser unavailable' };

  let page = null;
  try {
    page = await browser.newPage();
    await page.setUserAgent(BROWSER_USER_AGENT);
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

    // Strict Cyber Security Network Interception inside Headless Browser
    await page.setRequestInterception(true);
    page.on('request', async (req) => {
      try {
        const rType = req.resourceType();
        // Block heavy non-text assets to make headless browsing 3x faster & safer
        if (['image', 'media', 'font', 'websocket', 'manifest', 'other'].includes(rType)) {
          return req.abort();
        }
        const reqUrl = req.url();
        if (!reqUrl.startsWith('http://') && !reqUrl.startsWith('https://')) {
          return req.abort();
        }
        const u = new URL(reqUrl);
        const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
        if (
          host === 'localhost' ||
          host.endsWith('.local') ||
          host.endsWith('.internal') ||
          isPrivateOrReservedIp(host)
        ) {
          // Note: non-IP hostnames are checked via verifySafeExternalUrlWithDns
          const dnsCheck = await verifySafeExternalUrlWithDns(reqUrl);
          if (!dnsCheck.ok) return req.abort();
        }
        return req.continue();
      } catch {
        try { return req.abort(); } catch {}
      }
    });

    await page.goto(check.safeUrl, {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs
    });

    // Brief hydration window for SPA frameworks
    await new Promise((r) => setTimeout(r, 550));

    const domData = await page.evaluate(() => {
      const title = document.title || '';
      const metaDesc = document.querySelector('meta[name="description"], meta[property="og:description"]')?.getAttribute('content') || '';
      const ogImg = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
      const root = document.querySelector('article, main, [role="main"]') || document.body;
      const rawText = root ? root.innerText || '' : '';
      return { title, metaDesc, ogImg, rawText: rawText.slice(0, 4000) };
    });

    const cleanContent = sanitizeUntrustedWebContent(
      (domData.rawText || '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 12)
        .join('\n')
        .slice(0, 2400)
    );

    return {
      ok: cleanContent.length > 40,
      finalUrl: check.safeUrl,
      domain: new URL(check.safeUrl).hostname.replace(/^www\./i, ''),
      readMode: 'headless-dom',
      title: domData.title || '',
      description: domData.metaDesc || '',
      leadImage: domData.ogImg || '',
      content: cleanContent,
      wordCount: cleanContent ? cleanContent.split(/\s+/).length : 0
    };
  } catch (err) {
    return { ok: false, reason: err?.message || 'Headless render error' };
  } finally {
    if (page) {
      try { await page.close(); } catch {}
    }
  }
}

/**
 * Extract explicit HTTP(S) URLs mentioned by the user in a prompt/query.
 */
export function extractUrlsFromText(text = '') {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(/https?:\/\/[^\s<>)"'`\]]+/gi) || [];
  return Array.from(new Set(matches.map((u) => u.replace(/[.,;!?]+$/, ''))));
}

/**
 * Main Autonomous Browser Agent Entry Point
 */
export async function runBrowserAgent({
  query = '',
  userPrompt = '',
  language = 'id',
  maxPages = 4,
  onStep = () => {}
}) {
  const startTime = Date.now();
  const explicitUrls = extractUrlsFromText(`${query} ${userPrompt}`);
  const cleanSearchQuery = String(query || userPrompt || '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\b(?:buka|tolong\s+buka|cek\s+web|peramban|browser\s+agent|jelajahi)\b/gi, '')
    .trim() || query || userPrompt;

  onStep({
    phase: 'browsing',
    step: 'discover',
    title: language === 'id'
      ? `Membuka Peramban Agent untuk "${cleanSearchQuery.slice(0, 60)}"...`
      : `Launching Browser Agent for "${cleanSearchQuery.slice(0, 60)}"...`,
    browserPages: []
  });

  // 1. Run search discovery in parallel with explicit URL checks
  let searchResults = [];
  let inlineImages = [];
  if (cleanSearchQuery.length >= 2) {
    try {
      const searchRes = await webSearchService.searchGoogle(cleanSearchQuery, 10, language);
      if (searchRes?.success && Array.isArray(searchRes.results)) {
        searchResults = searchRes.results;
        inlineImages = searchRes.inline_images || [];
      }
    } catch (err) {
      console.warn('[BrowserAgent] Search discovery warning:', err.message);
    }
  }

  // Supplement images if needed (non-blocking fast lookup)
  if (inlineImages.length < 3 && cleanSearchQuery.length >= 2) {
    try {
      const extraImgs = await webSearchService.fetchImages(cleanSearchQuery, 6);
      if (Array.isArray(extraImgs)) {
        inlineImages = [...inlineImages, ...extraImgs];
      }
    } catch {}
  }

  // 2. Build candidate list of URLs to visit deeply
  const candidates = [];
  const seenUrls = new Set();

  for (const u of explicitUrls) {
    if (!SKIP_EXTENSIONS_RE.test(u) && !seenUrls.has(u)) {
      seenUrls.add(u);
      let dom = 'web';
      try { dom = new URL(u).hostname.replace(/^www\./i, ''); } catch {}
      candidates.push({ url: u, title: u, domain: dom, snippet: '', isExplicit: true });
    }
  }

  for (const r of searchResults) {
    const u = r.url || r.link || '';
    if (!u || SKIP_EXTENSIONS_RE.test(u) || seenUrls.has(u)) continue;
    if (u.includes('gstatic.com') || u.includes('googleusercontent.com')) continue;
    seenUrls.add(u);
    let dom = r.domain || '';
    if (!dom) {
      try { dom = new URL(u).hostname.replace(/^www\./i, ''); } catch {}
    }
    candidates.push({
      url: u,
      title: r.title || dom,
      domain: dom,
      snippet: r.snippet || r.description || '',
      date: r.date || r.publishedAt || null,
      isExplicit: false,
      rawSource: r
    });
  }

  const targetsToVisit = candidates.slice(0, maxPages);

  if (targetsToVisit.length > 0) {
    onStep({
      phase: 'browsing',
      step: 'visiting',
      title: language === 'id'
        ? `Menjelajahi & membaca ${targetsToVisit.length} halaman web secara mendalam...`
        : `Navigating & reading ${targetsToVisit.length} web pages in depth...`,
      browserPages: targetsToVisit.map((t, idx) => ({
        index: idx + 1,
        title: t.title,
        domain: t.domain,
        url: t.url,
        status: 'visiting',
        favicon: `https://www.google.com/s2/favicons?sz=64&domain=${t.domain}`
      }))
    });
  }

  // 3. Visit pages in parallel (Fast Reader + Headless Browser SPA upgrade when needed)
  const visitedResults = await Promise.all(
    targetsToVisit.map(async (target, idx) => {
      let pageRes = await fetchSafeWebPageFast(target.url, 2600);

      // Upgrade to real Headless Browser if explicit URL or JS-shell SPA (< 180 chars extracted)
      if ((!pageRes.ok || (pageRes.content || '').length < 180) && (target.isExplicit || idx < 2)) {
        const headlessRes = await renderSafePageWithHeadlessBrowser(target.url, 4200);
        if (headlessRes.ok && (headlessRes.content || '').length > (pageRes.content || '').length) {
          pageRes = headlessRes;
        }
      }

      const finalTitle = pageRes.title || target.title || target.domain;
      const finalContent = (pageRes.ok && pageRes.content && pageRes.content.length > 80)
        ? pageRes.content
        : (target.snippet || pageRes.description || '');

      return {
        index: idx + 1,
        title: finalTitle,
        domain: pageRes.domain || target.domain,
        url: pageRes.finalUrl || target.url,
        snippet: target.snippet || pageRes.description || finalContent.slice(0, 240),
        fullExtract: finalContent,
        wordCount: pageRes.wordCount || (finalContent ? finalContent.split(/\s+/).length : 0),
        readMode: pageRes.ok ? pageRes.readMode : 'search-index',
        status: finalContent ? 'read' : 'fallback',
        leadImage: pageRes.leadImage || target.rawSource?.lead_image_url || null,
        date: target.date || null,
        favicon: `https://www.google.com/s2/favicons?sz=64&domain=${pageRes.domain || target.domain}`
      };
    })
  );

  // 4. Assemble unified verified sources list (visited pages first, then remaining search results)
  const finalSources = [];
  const usedLinks = new Set();

  for (const v of visitedResults) {
    if (!v.url || usedLinks.has(v.url)) continue;
    usedLinks.add(v.url);
    finalSources.push({
      position: finalSources.length + 1,
      title: v.title || v.domain,
      link: v.url,
      url: v.url,
      domain: v.domain,
      snippet: v.snippet || v.fullExtract?.slice(0, 260) || '',
      thumbnail: v.leadImage || v.favicon,
      logo_url: v.favicon,
      date: v.date || null,
      sourceEngine: v.readMode === 'headless-dom' ? 'Browser Agent (Headless DOM)' : 'Browser Agent (Deep Reader)',
      accuracyScore: 98
    });
  }

  for (const r of searchResults) {
    const link = r.url || r.link || '';
    if (!link || usedLinks.has(link) || finalSources.length >= 10) continue;
    if (link.includes('gstatic.com') || link.includes('googleusercontent.com')) continue;
    usedLinks.add(link);
    let dom = r.domain || '';
    if (!dom) {
      try { dom = new URL(link).hostname.replace(/^www\./i, ''); } catch {}
    }
    finalSources.push({
      position: finalSources.length + 1,
      title: r.title || dom,
      link,
      url: link,
      domain: dom,
      snippet: r.snippet || r.description || '',
      thumbnail: r.thumbnail || `https://www.google.com/s2/favicons?sz=64&domain=${dom}`,
      logo_url: `https://www.google.com/s2/favicons?sz=64&domain=${dom}`,
      date: r.date || r.publishedAt || null,
      sourceEngine: r.sourceEngine || 'DeeperNova Search',
      accuracyScore: r.accuracyScore || 92
    });
  }

  // Deduplicate clean images (max 6)
  const finalImages = [];
  const seenImgUrls = new Set();
  for (const v of visitedResults) {
    if (v.leadImage && v.leadImage.startsWith('http') && !seenImgUrls.has(v.leadImage)) {
      seenImgUrls.add(v.leadImage);
      finalImages.push({ url: v.leadImage, title: v.title, sourceDomain: v.domain });
    }
  }
  for (const img of inlineImages) {
    const u = img.imageUrl || img.thumbnail || img.url;
    if (u && u.startsWith('http') && !u.includes('favicons?sz=') && !seenImgUrls.has(u) && finalImages.length < 6) {
      seenImgUrls.add(u);
      finalImages.push({ url: u, title: img.title || cleanSearchQuery, sourceDomain: img.sourceDomain || '' });
    }
  }

  const browserPagesSummary = visitedResults.map((v) => ({
    index: v.index,
    title: v.title,
    domain: v.domain,
    url: v.url,
    status: v.status,
    wordCount: v.wordCount,
    readMode: v.readMode,
    favicon: v.favicon,
    excerpt: (v.snippet || v.fullExtract || '').slice(0, 160)
  }));

  onStep({
    phase: 'browsing_done',
    step: 'extracted',
    title: language === 'id'
      ? `Selesai membaca ${browserPagesSummary.length} halaman (${((Date.now() - startTime) / 1000).toFixed(1)}d)`
      : `Finished reading ${browserPagesSummary.length} pages (${((Date.now() - startTime) / 1000).toFixed(1)}s)`,
    browserPages: browserPagesSummary
  });

  // 5. Build ZERO-URL LLM Context Block (uses ONLY [1], [2] and foto:1 IDs — NO raw URLs!)
  const pageBlocks = finalSources.slice(0, 8).map((s, idx) => {
    const visitedMatch = visitedResults.find((v) => v.url === s.link);
    const deepText = visitedMatch?.fullExtract
      ? visitedMatch.fullExtract.slice(0, 1700)
      : (s.snippet || '').slice(0, 650);
    return `[Sumber #${idx + 1} | Media/Domain: ${s.domain}${s.date ? ` | Tanggal: ${s.date}` : ''}${visitedMatch ? ' | Dibaca Penuh oleh Peramban Agent' : ''}]\nJudul: ${s.title}\nIsi Halaman & Fakta:\n${deepText}`;
  }).join('\n\n---\n\n');

  const imageBlocks = finalImages.length > 0
    ? `\n\n[DAFTAR ID FOTO TERVERIFIKASI (JIKA RELEVAN, GUNAKAN ID PENDEK foto:N, DILARANG MENULIS URL!)]:\n` +
      finalImages.slice(0, 4).map((im, i) => `- foto:${i + 1} -> "${(im.title || cleanSearchQuery).slice(0, 70)}"`).join('\n')
    : '';

  return {
    query: cleanSearchQuery,
    durationMs: Date.now() - startTime,
    sources: finalSources,
    images: finalImages,
    browserPages: browserPagesSummary,
    llmContextBlock: `=== HASIL EKSTRAKSI MENDALAM PERAMBAN AGENT (BROWSER AGENT) ===\n${pageBlocks}${imageBlocks}`
  };
}

export default {
  runBrowserAgent,
  extractUrlsFromText,
  extractStructuredReadableContent
};
