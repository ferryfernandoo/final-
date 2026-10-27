/**
 * Web Search Service
 * Integrates Deepernova Search Engine (BM25 + Live Crawl) with SerpAPI & Wikipedia fallback
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SERPAPI_URL = 'https://serpapi.com/search';
const DEEPERNOVA_SEARCH_API_URL = process.env.DEEPERNOVA_SEARCH_API_URL || 'http://127.0.0.1:4000/api/v1';
const DEEPERNOVA_SEARCH_API_KEY = process.env.DEEPERNOVA_SEARCH_API_KEY || 'dn_live_d69468b9c25451f3b7cd8482e96cbcf7';

function cleanText(str) {
  if (!str) return '';
  return str.replace(/<\/?mark[^>]*>/gi, '').replace(/<[^>]+>/g, '').trim();
}

class WebSearchService {
  constructor() {
    console.log(`[WebSearchService] Initialized with Deepernova High-Speed Search Engine (${DEEPERNOVA_SEARCH_API_URL})`);
  }

  /**
   * Search via Deepernova BM25 Search Engine (with automatic live-crawl retry) + SerpAPI + Wikipedia fallback
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum results to return (default 5)
   * @param {string} language - Language code (default 'id')
   * @returns {Promise<{success: boolean, results: Array, error?: string}>}
   */
  async searchGoogle(query, maxResults = 5, language = 'id') {
    const searchBases = [
      'http://127.0.0.1:4000/api/v1',
      process.env.DEEPERNOVA_SEARCH_API_URL?.includes('/api/v1') ? process.env.DEEPERNOVA_SEARCH_API_URL : (process.env.DEEPERNOVA_SEARCH_API_URL ? `${process.env.DEEPERNOVA_SEARCH_API_URL}/api/v1` : null),
      'https://www.deepernova.com/api/v1',
      'http://localhost:4000/api/v1'
    ].filter(Boolean);

    const mapResults = (rawList) => rawList.slice(0, maxResults).map((r, idx) => {
      let domain = r.domain || '';
      if (!domain && r.url) {
        try { domain = new URL(r.url).hostname.replace(/^www\./i, ''); } catch (e) {}
      }
      const logoUrl = r.logo_url || r.logoUrl || (domain ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : null);
      const leadImg = r.lead_image_url || r.leadImageUrl || null;
      return {
        title: cleanText(r.title) || 'Untitled',
        url: r.url || '',
        link: r.url || '',
        snippet: cleanText(r.snippet) || cleanText(r.description) || '',
        description: cleanText(r.description) || '',
        domain: domain,
        published_at: r.published_at || null,
        trust_score: r.trust_score || null,
        pagerank: r.pagerank || null,
        logo_url: logoUrl,
        lead_image_url: leadImg,
        thumbnail: leadImg || logoUrl,
        position: idx + 1
      };
    });

    // Pass 1: Fast BM25 Cache (crawl=0&fast=1), then Pass 2: Live Web Crawl (crawl=1)
    for (const crawlParam of ['crawl=0&fast=1', 'crawl=1']) {
      for (const sBase of searchBases) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 7000);

          const response = await fetch(`${sBase}/search?q=${encodeURIComponent(query)}&limit=${maxResults}&${crawlParam}`, {
            headers: {
              'Authorization': `Bearer ${DEEPERNOVA_SEARCH_API_KEY}`,
              'X-API-Key': DEEPERNOVA_SEARCH_API_KEY
            },
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          const contentType = response.headers.get('content-type') || '';
          if (response.ok && contentType.includes('application/json')) {
            const data = await response.json();
            if (data.results && Array.isArray(data.results) && data.results.length > 0) {
              const results = mapResults(data.results);
              console.log(`[WebSearchService] ✓ Deepernova Search (${crawlParam}) found ${results.length} results from ${sBase} (${data.duration_ms || 0}ms)`);
              return {
                success: true,
                results,
                query,
                engine: 'deepernova_search',
                ai_context: data.ai_context || ''
              };
            }
          }
        } catch (dnErr) {
          console.warn(`[WebSearchService] Deepernova search error on ${sBase} (${dnErr.message})`);
        }
      }
    }

    // 2. Fallback: SerpAPI (Google) if configured
    if (SERPAPI_KEY) {
      const languageMap = {
        'id': { gl: 'id', hl: 'id' },
        'en': { gl: 'us', hl: 'en' },
        'ja': { gl: 'jp', hl: 'ja' },
        'zh': { gl: 'cn', hl: 'zh-cn' }
      };
      const langConfig = languageMap[language] || languageMap['id'];

      const params = new URLSearchParams({
        q: query,
        api_key: SERPAPI_KEY,
        engine: 'google',
        num: String(maxResults),
        gl: langConfig.gl,
        hl: langConfig.hl
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(`${SERPAPI_URL}?${params.toString()}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.organic_results && Array.isArray(data.organic_results) && data.organic_results.length > 0) {
            const results = data.organic_results.slice(0, maxResults).map((result, idx) => {
              let domain = '';
              try { domain = new URL(result.link).hostname.replace(/^www\./i, ''); } catch (e) {}
              return {
                title: result.title || '',
                url: result.link || '',
                link: result.link || '',
                snippet: result.snippet || '',
                domain,
                logo_url: domain ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : null,
                thumbnail: domain ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : null,
                position: result.position || idx + 1
              };
            });
            return {
              success: true,
              results,
              query
            };
          }
        }
      } catch (error) {
        clearTimeout(timeoutId);
      }
    }

    // 3. Fallback: Wikipedia Open Search API (ID + EN) so `/api/search` never returns empty
    try {
      const wikiResults = [];
      for (const lang of ['id', 'en']) {
        if (wikiResults.length >= maxResults) break;
        const wikiUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=4`;
        const res = await fetch(wikiUrl, { timeout: 4000 });
        if (res.ok) {
          const data = await res.json();
          const items = data?.query?.search || [];
          for (const item of items) {
            if (wikiResults.length >= maxResults) break;
            const title = cleanText(item.title);
            const url = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, '_'))}`;
            const domain = `${lang}.wikipedia.org`;
            wikiResults.push({
              title: `${title} — Wikipedia (${lang.toUpperCase()})`,
              url,
              link: url,
              snippet: cleanText(item.snippet) || title,
              domain,
              logo_url: `https://www.google.com/s2/favicons?sz=64&domain=${domain}`,
              thumbnail: `https://www.google.com/s2/favicons?sz=64&domain=${domain}`,
              position: wikiResults.length + 1
            });
          }
        }
      }
      if (wikiResults.length > 0) {
        return {
          success: true,
          results: wikiResults,
          query,
          engine: 'wikipedia_fallback'
        };
      }
    } catch (_wikiErr) {}

    return {
      success: false,
      error: 'Tidak ada hasil pencarian ditemukan',
      results: []
    };
  }

  formatSearchResultsForPrompt(results, aiContext = '') {
    if (aiContext && aiContext.trim()) {
      return `${aiContext.trim()}\n\n---\nGunakan data pencarian Deepernova Search Engine di atas sebagai acuan fakta utama dalam jawaban Anda.\n\n`;
    }
    if (!results || results.length === 0) {
      return '';
    }

    let context = '📊 **HASIL PENCARIAN DEEPERNOVA SEARCH ENGINE:**\n\n';

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      context += `${i + 1}. **${result.title}**\n`;
      if (result.domain) {
        context += `   🌐 Sumber: ${result.domain}\n`;
      }
      if (result.published_at) {
        context += `   📅 Tanggal: ${result.published_at}\n`;
      }
      if (result.snippet) {
        context += `   Ringkasan: ${result.snippet}\n`;
      }
      if (result.url) {
        context += `   📌 URL: ${result.url}\n`;
      }
      context += '\n';
    }

    context += '---\n\nGunakan fakta dan informasi terverifikasi dari Deepernova Search Engine di atas untuk menjawab pertanyaan pengguna secara akurat dan sertakan rujukan sumbernya.\n\n';

    return context;
  }

  async augmentPromptWithWebSearch(userQuery, currentSystemPrompt) {
    try {
      const searchResult = await this.searchGoogle(userQuery, 5);
      if (searchResult.success) {
        const searchContext = this.formatSearchResultsForPrompt(searchResult.results);
        const augmentedPrompt = currentSystemPrompt + '\n\n' + searchContext;
        return {
          systemPrompt: augmentedPrompt,
          searchResults: searchResult.results,
          searchPerformed: true,
          query: userQuery
        };
      } else {
        return {
          systemPrompt: currentSystemPrompt,
          searchResults: [],
          searchPerformed: false,
          error: searchResult.error
        };
      }
    } catch (error) {
      return {
        systemPrompt: currentSystemPrompt,
        searchResults: [],
        searchPerformed: false,
        error: error.message
      };
    }
  }

  getErrorMessage() {
    return 'Maaf, search web gagal tidak tersedia untuk saat ini. Silahkan coba bertanya tanpa web search atau coba lagi nanti.';
  }
}

export default new WebSearchService();
