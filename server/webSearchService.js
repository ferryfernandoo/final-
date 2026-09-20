/**
 * Web Search Service
 * Integrates Google Search results via SerpAPI with DeepSeek
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
const DEEPERNOVA_SEARCH_API_URL = process.env.DEEPERNOVA_SEARCH_API_URL || 'http://127.0.0.1:3000/api/v1';
const DEEPERNOVA_SEARCH_API_KEY = process.env.DEEPERNOVA_SEARCH_API_KEY || 'dn_live_d69468b9c25451f3b7cd8482e96cbcf7';

function cleanText(str) {
  if (!str) return '';
  return str.replace(/<\/?mark[^>]*>/gi, '').trim();
}

class WebSearchService {
  constructor() {
    console.log(`[WebSearchService] Initialized with Deepernova High-Speed Search Engine (${DEEPERNOVA_SEARCH_API_URL})`);
  }

  /**
   * Search via Deepernova BM25 Search Engine with SerpAPI fallback
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum results to return (default 5)
   * @param {string} language - Language code (default 'id')
   * @returns {Promise<{success: boolean, results: Array, error?: string}>}
   */
  async searchGoogle(query, maxResults = 5, language = 'id') {
    // 1. Primary Engine: Deepernova High-Speed Search API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${DEEPERNOVA_SEARCH_API_URL}/search?q=${encodeURIComponent(query)}&limit=${maxResults}`, {
        headers: {
          'Authorization': `Bearer ${DEEPERNOVA_SEARCH_API_KEY}`,
          'X-API-Key': DEEPERNOVA_SEARCH_API_KEY
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
          const results = data.results.slice(0, maxResults).map((r, idx) => ({
            title: cleanText(r.title) || 'Untitled',
            url: r.url || '',
            snippet: cleanText(r.snippet) || '',
            position: idx + 1
          }));

          console.log(`[WebSearchService] ✓ Deepernova Search found ${results.length} results for: "${query}" (${data.duration_ms || 0}ms)`);
          return {
            success: true,
            results,
            query,
            engine: 'deepernova_bm25'
          };
        }
      }
    } catch (dnErr) {
      console.warn(`[WebSearchService] Deepernova search error (${dnErr.message}), checking fallback...`);
    }

    // 2. Fallback: SerpAPI (Google)
    if (!SERPAPI_KEY) {
      return {
        success: false,
        error: 'Search engine tidak merespons',
        results: []
      };
    }

    // Determine language code for SerpAPI
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
      num: maxResults,
      gl: langConfig.gl,
      hl: langConfig.hl
    });

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);  // 15 second timeout

    try {
      const response = await fetch(`${SERPAPI_URL}?${params.toString()}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`[WebSearchService] SerpAPI error: ${response.status}`);
        return {
          success: false,
          error: `SerpAPI returned status ${response.status}`,
          results: []
        };
      }

      const data = await response.json();

      // Check for error in response body (API limit, invalid key, etc)
      if (data.error) {
        console.error(`[WebSearchService] SerpAPI error in response: ${data.error}`);
        return {
          success: false,
          error: `SerpAPI error: ${data.error}`,
          results: []
        };
      }

      // Extract organic search results
      const results = [];

      if (data.organic_results && Array.isArray(data.organic_results)) {
        for (const result of data.organic_results.slice(0, maxResults)) {
          results.push({
            title: result.title || '',
            url: result.link || '',
            snippet: result.snippet || '',
            position: result.position || results.length + 1
          });
        }
      }

      // If no results found
      if (results.length === 0) {
        return {
          success: false,
          error: 'Tidak ada hasil pencarian ditemukan',
          results: []
        };
      }

      console.log(`[WebSearchService] ✓ Found ${results.length} results for query: "${query}"`);

      return {
        success: true,
        results,
        query
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('[WebSearchService] SerpAPI request timeout (15s)');
        return {
          success: false,
          error: 'Search timeout - SerpAPI tidak merespons',
          results: []
        };
      }
      console.error('[WebSearchService] Error during search:', error.message);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Format search results into context string for DeepSeek
   * @param {Array} results - Search results from searchGoogle()
   * @returns {string} Formatted context
   */
  formatSearchResultsForPrompt(results) {
    if (!results || results.length === 0) {
      return '';
    }

    let context = '📊 **HASIL PENCARIAN WEB:**\n\n';

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      context += `${i + 1}. **${result.title}**\n`;
      if (result.snippet) {
        context += `   ${result.snippet}\n`;
      }
      if (result.url) {
        context += `   📌 ${result.url}\n`;
      }
      context += '\n';
    }

    context += '---\n\nGunakan informasi di atas untuk memperkaya jawaban jika relevan. Jika hasil pencarian kurang relevan atau tidak memuat seluruh jawaban, gunakan pengetahuan dan penalaran internal Anda untuk menjawab pertanyaan pengguna secara tuntas dan komprehensif tanpa pernah mengatakan bahwa hasil pencarian tidak relevan atau meminta maaf.\n\n';

    return context;
  }

  /**
   * Process web search and inject into system prompt
   * @param {string} userQuery - User's question
   * @param {string} currentSystemPrompt - Existing system prompt
   * @returns {Promise<{systemPrompt: string, searchResults: Array, searchPerformed: boolean}>}
   */
  async augmentPromptWithWebSearch(userQuery, currentSystemPrompt) {
    try {
      // Perform the search
      const searchResult = await this.searchGoogle(userQuery, 5);

      if (searchResult.success) {
        // Format results and inject into system prompt
        const searchContext = this.formatSearchResultsForPrompt(searchResult.results);
        const augmentedPrompt = currentSystemPrompt + '\n\n' + searchContext;

        return {
          systemPrompt: augmentedPrompt,
          searchResults: searchResult.results,
          searchPerformed: true,
          query: userQuery
        };
      } else {
        // Search failed - return original prompt
        console.log(`[WebSearchService] Search failed: ${searchResult.error}`);
        return {
          systemPrompt: currentSystemPrompt,
          searchResults: [],
          searchPerformed: false,
          error: searchResult.error
        };
      }
    } catch (error) {
      console.error('[WebSearchService] Error in augmentPromptWithWebSearch:', error.message);
      return {
        systemPrompt: currentSystemPrompt,
        searchResults: [],
        searchPerformed: false,
        error: error.message
      };
    }
  }

  /**
   * Get error message for user (in Indonesian)
   * @returns {string} Indonesian error message
   */
  getErrorMessage() {
    return 'Maaf, search web gagal tidak tersedia untuk saat ini. Silahkan coba bertanya tanpa web search atau coba lagi nanti.';
  }
}

// Export singleton instance
const webSearchService = new WebSearchService();

export default webSearchService;
