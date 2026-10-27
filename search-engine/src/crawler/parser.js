import * as cheerio from 'cheerio';
import { canonicalizeUrl, getDomain, fnv1a64 } from './urlUtils.js';
import { TrustGatekeeper } from './trustGatekeeper.js';

export class HTMLParser {
  /**
   * Parses raw HTML into structured document representation and outgoing links
   */
  static parse(html, baseUrl) {
    if (!html || typeof html !== 'string') {
      return null;
    }

    try {
      const safeHtml = html.length > 350000 ? html.slice(0, 350000) : html;

      // 0. Auto-Detect XML Sitemaps & RSS/Atom Feeds
      const isXml = safeHtml.trim().startsWith('<?xml') ||
                    safeHtml.includes('<urlset') ||
                    safeHtml.includes('<sitemapindex') ||
                    safeHtml.includes('<rss') ||
                    safeHtml.includes('<feed xmlns=');

      if (isXml) {
        const $xml = cheerio.load(safeHtml, { xmlMode: true, decodeEntities: false });
        const outgoingLinks = [];
        const seen = new Set();

        // 0a. Parse standard XML Sitemap (<url><loc>...</loc></url> or <sitemap><loc>...</loc></sitemap>)
        $xml('loc').each((_, el) => {
          if (outgoingLinks.length >= 200) return false;
          const rawLoc = $xml(el).text().trim();
          const resolved = canonicalizeUrl(rawLoc, baseUrl);
          if (resolved && !seen.has(resolved) && !TrustGatekeeper.isSpamUrl(resolved) && !TrustGatekeeper.isCompromisedGovEduSpam(resolved)) {
            seen.add(resolved);
            outgoingLinks.push({ url: resolved, anchorText: 'Sitemap Link', isNoFollow: false });
          }
        });

        // 0b. Parse RSS / Atom Feeds (<item><link>...</link></item> or <entry><link href="..."/></entry>)
        $xml('item > link, item > guid, entry > link').each((_, el) => {
          if (outgoingLinks.length >= 250) return false;
          const rawLink = $xml(el).attr('href') || $xml(el).text().trim();
          const resolved = canonicalizeUrl(rawLink, baseUrl);
          if (resolved && !seen.has(resolved) && !TrustGatekeeper.isSpamUrl(resolved) && !TrustGatekeeper.isCompromisedGovEduSpam(resolved)) {
            seen.add(resolved);
            outgoingLinks.push({ url: resolved, anchorText: 'RSS Feed Link', isNoFollow: false });
          }
        });

        const feedTitle = $xml('channel > title, feed > title').first().text().trim() || 'Sitemap & Feed Index';
        return {
          title: feedTitle.slice(0, 255),
          description: `Discovered XML Sitemap & Real-Time Feed containing ${outgoingLinks.length} target pages.`,
          headings: 'XML Sitemap RSS Feed Direct Ingestion',
          content: `XML Sitemap and feed containing ${outgoingLinks.length} URLs for crawler frontier.`,
          wordCount: outgoingLinks.length,
          contentHash: fnv1a64(feedTitle + outgoingLinks.length),
          canonicalUrl: baseUrl,
          lang: 'en',
          logoUrl: null,
          leadImageUrl: null,
          images: [],
          publishedAt: Date.now(),
          outgoingLinks
        };
      }

      const $ = cheerio.load(safeHtml, { decodeEntities: false });

      // 1. Extract Language
      const lang = ($('html').attr('lang') || 'id').slice(0, 10).toLowerCase();

      // 2. Extract Canonical URL if specified in <link rel="canonical">
      const canonicalTag = $('link[rel="canonical"]').attr('href');
      const canonicalUrl = canonicalTag ? canonicalizeUrl(canonicalTag, baseUrl) : null;

      // 3. Extract Title
      let title = $('title').first().text().trim();
      if (!title) {
        title = $('meta[property="og:title"]').attr('content') ||
                $('meta[name="twitter:title"]').attr('content') ||
                $('h1').first().text().trim() ||
                '';
      }
      // Clean excessive whitespace in title
      title = title.replace(/\s+/g, ' ').slice(0, 255);

      // 4. Extract Structured Data (JSON-LD), Author, Schema Type & Publication Date
      let publishedAt = null;
      let hasMetaPublishedDate = false;
      let author = $('meta[name="author"]').attr('content') ||
                   $('meta[property="article:author"]').attr('content') ||
                   $('.author, .byline, [rel="author"]').first().text().trim() ||
                   '';
      let schemaType = 'WebPage';

      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const raw = $(el).text();
          if (!raw) return;
          const json = JSON.parse(raw);
          const items = Array.isArray(json) ? json : (Array.isArray(json['@graph']) ? json['@graph'] : [json]);
          for (const item of items) {
            if (!item || typeof item !== 'object') continue;
            const t = item['@type'];
            if (t && typeof t === 'string' && schemaType === 'WebPage') {
              schemaType = t.slice(0, 50);
            }
            const candDate = item.datePublished || item.dateModified || item.dateCreated;
            if (candDate && !publishedAt) {
              const pt = Date.parse(candDate);
              if (!isNaN(pt) && pt > 946684800000 && pt <= Date.now() + 86400000) {
                publishedAt = pt;
                hasMetaPublishedDate = true;
              }
            }
            if (!author && item.author) {
              const a = Array.isArray(item.author) ? item.author[0] : item.author;
              if (typeof a === 'string') author = a;
              else if (a && typeof a === 'object' && a.name) author = String(a.name);
            }
          }
        } catch {}
      });

      if (!publishedAt) {
        const dateStr = $('meta[property="article:published_time"]').attr('content') ||
                        $('meta[property="article:modified_time"]').attr('content') ||
                        $('meta[name="pubdate"]').attr('content') ||
                        $('meta[name="publishdate"]').attr('content') ||
                        $('meta[name="date"]').attr('content') ||
                        $('meta[name="dc.date"]').attr('content') ||
                        $('meta[name="sailthru.date"]').attr('content') ||
                        $('meta[property="og:updated_time"]').attr('content') ||
                        $('time[datetime]').first().attr('datetime') ||
                        '';
        if (dateStr) {
          const parsedTime = Date.parse(dateStr);
          if (!isNaN(parsedTime) && parsedTime > 946684800000 && parsedTime <= Date.now() + 86400000) {
            publishedAt = parsedTime;
            hasMetaPublishedDate = true;
          }
        }
      }

      // Fallback: Check date pattern in URL (e.g. /2026/03/18/ or /2026-03-18/)
      if (!publishedAt && baseUrl) {
        const urlDateMatch = baseUrl.match(/\/(202[0-9])[\/\-_](0[1-9]|1[0-2])[\/\-_](0[1-9]|[12][0-9]|3[01])/);
        if (urlDateMatch) {
          const year = parseInt(urlDateMatch[1], 10);
          const month = parseInt(urlDateMatch[2], 10) - 1;
          const day = parseInt(urlDateMatch[3], 10);
          const d = new Date(Date.UTC(year, month, day));
          if (!isNaN(d.getTime())) {
            publishedAt = d.getTime();
            hasMetaPublishedDate = true;
          }
        }
      }

      author = author.replace(/\s+/g, ' ').slice(0, 100);

      // 5. Extract Meta Description
      let description = $('meta[name="description"]').attr('content') ||
                        $('meta[property="og:description"]').attr('content') ||
                        $('meta[name="twitter:description"]').attr('content') ||
                        '';
      description = description.replace(/\s+/g, ' ').trim().slice(0, 500);

      // 6. Extract Headings (H1, H2, H3)
      const headings = [];
      $('h1, h2, h3').each((_, el) => {
        const hText = $(el).text().replace(/\s+/g, ' ').trim();
        if (hText.length > 2 && hText.length < 150) {
          headings.push(hText);
        }
      });
      const headingsStr = headings.slice(0, 15).join(' | ');

      // 7. Extract Favicon & Logo & Lead Image
      let logoUrl = null;
      const faviconHref = $('link[rel="apple-touch-icon"]').attr('href') ||
                          $('link[rel="icon"]').attr('href') ||
                          $('link[rel="shortcut icon"]').attr('href') ||
                          $('meta[property="og:logo"]').attr('content');
      if (faviconHref) {
        logoUrl = canonicalizeUrl(faviconHref, baseUrl);
      }

      let leadImageUrl = $('meta[property="og:image"]').attr('content') ||
                         $('meta[name="twitter:image"]').attr('content') ||
                         $('meta[property="twitter:image"]').attr('content') ||
                         $('meta[name="thumbnail"]').attr('content');
      if (leadImageUrl) {
        leadImageUrl = canonicalizeUrl(leadImageUrl, baseUrl);
      }

      // 8. Extract Images from HTML
      const extractedImages = [];
      const seenImageUrls = new Set();

      $('img').each((_, el) => {
        if (extractedImages.length >= 6) return false;

        const rawSrc = $(el).attr('src') ||
                       $(el).attr('data-src') ||
                       $(el).attr('data-original') ||
                       $(el).attr('data-lazy-src') ||
                       $(el).attr('srcset')?.split(',')[0]?.trim()?.split(' ')[0];

        if (!rawSrc || rawSrc.startsWith('data:') || rawSrc.length < 5) return;

        const imgUrl = canonicalizeUrl(rawSrc, baseUrl);
        if (!imgUrl || seenImageUrls.has(imgUrl)) return;

        // Skip ad tracking pixels and tiny icons
        const lowerUrl = imgUrl.toLowerCase();
        if (
          lowerUrl.includes('pixel') ||
          lowerUrl.includes('1x1') ||
          lowerUrl.includes('tracker') ||
          lowerUrl.includes('doubleclick') ||
          lowerUrl.includes('analytics') ||
          lowerUrl.includes('advert')
        ) {
          return;
        }

        const alt = ($(el).attr('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 200);
        const imgTitle = ($(el).attr('title') || '').replace(/\s+/g, ' ').trim().slice(0, 200);
        
        const context = (alt || imgTitle || title || description).slice(0, 160);

        const className = ($(el).attr('class') || '').toLowerCase();
        const idName = ($(el).attr('id') || '').toLowerCase();
        const isLogo = (
          lowerUrl.includes('logo') || 
          lowerUrl.includes('favicon') || 
          lowerUrl.includes('brand') || 
          className.includes('logo') || 
          idName.includes('logo') || 
          alt.toLowerCase().includes('logo')
        ) ? 1 : 0;

        if (isLogo && !logoUrl) {
          logoUrl = imgUrl;
        }
        if (!leadImageUrl && !isLogo && (alt || imgTitle || $(el).attr('width') > 150)) {
          leadImageUrl = imgUrl;
        }

        const width = parseInt($(el).attr('width') || '0', 10) || 0;
        const height = parseInt($(el).attr('height') || '0', 10) || 0;

        seenImageUrls.add(imgUrl);
        extractedImages.push({
          url: imgUrl,
          alt_text: alt,
          title: imgTitle,
          context_text: context,
          is_logo: isLogo,
          width,
          height
        });
      });

      // Fallback: If leadImageUrl is missing from meta tags, pick the first valid content image
      if (!leadImageUrl && extractedImages.length > 0) {
        const candidate = extractedImages.find(img => !img.is_logo && img.url && !img.url.includes('favicon') && !img.url.includes('icon.png'));
        if (candidate) {
          leadImageUrl = candidate.url;
        }
      }

      // 9. Extract Outgoing Links before stripping tags
      const outgoingLinks = [];
      const seenLinksOnPage = new Set();

      // Auto-discover RSS / Atom feeds and Sitemaps in <link> tags
      $('link[rel="alternate"][type*="xml"], link[rel="alternate"][type*="rss"], link[rel="alternate"][type*="atom"], link[rel="sitemap"]').each((_, el) => {
        const href = $(el).attr('href');
        const resolved = canonicalizeUrl(href, baseUrl);
        if (resolved && !seenLinksOnPage.has(resolved) && !TrustGatekeeper.isSpamUrl(resolved) && !TrustGatekeeper.isCompromisedGovEduSpam(resolved)) {
          seenLinksOnPage.add(resolved);
          outgoingLinks.push({
            url: resolved,
            anchorText: 'Discovered Feed/Sitemap',
            isNoFollow: false
          });
        }
      });

      $('a[href]').each((_, el) => {
        if (outgoingLinks.length >= 120) return false;
        const href = $(el).attr('href');
        const anchorText = $(el).text().replace(/\s+/g, ' ').trim().slice(0, 100);
        const rel = ($(el).attr('rel') || '').toLowerCase();

        // Skip nofollow links for indexing weight, but keep track
        const isNoFollow = rel.includes('nofollow');

        const resolved = canonicalizeUrl(href, baseUrl);
        if (resolved && !seenLinksOnPage.has(resolved) && !TrustGatekeeper.isSpamUrl(resolved) && !TrustGatekeeper.isCompromisedGovEduSpam(resolved)) {
          seenLinksOnPage.add(resolved);
          outgoingLinks.push({
            url: resolved,
            anchorText: anchorText || '',
            isNoFollow
          });
        }
      });



      // 11. Strip non-content elements for clean text body extraction
      $('script, style, noscript, svg, iframe, nav, footer, header, form, aside, .ad, .ads, .sidebar, .menu').remove();

      // Extract text
      let bodyText = $('body').text();
      // If body tag wasn't present, take root text
      if (!bodyText) {
        bodyText = $.text();
      }

      // Normalize and sanitize body text
      bodyText = bodyText.replace(/\s+/g, ' ').trim();

      // If description was empty, create snippet from first 200 chars of body
      if (!description && bodyText) {
        description = bodyText.slice(0, 200) + '...';
      }

      // 12b. Extract Geo Coordinates from Microdata / Meta tags
      let geoData = null;
      const geoMeta = $('meta[name="geo.position"]').attr('content') ||
                      $('meta[name="ICBM"]').attr('content') ||
                      $('meta[property="place:location:latitude"]').attr('content');
      if (geoMeta) {
        const parts = geoMeta.split(/[,;\s]+/).map(p => parseFloat(p)).filter(p => !isNaN(p));
        if (parts.length >= 2) {
          geoData = { lat: parts[0], lng: parts[1] };
        }
      } else {
        const geoSpan = $('.geo').first().text() || ($('.latitude').first().text() + ' ' + $('.longitude').first().text());
        if (geoSpan && geoSpan.trim()) {
          const m = geoSpan.match(/(-?\d+(?:\.\d+)?)[,\s;]+(-?\d+(?:\.\d+)?)/);
          if (m) {
            geoData = { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
          }
        }
      }

      // 12. Calculate word count, reading time & content fingerprint
      const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;
      const contentHash = fnv1a64(bodyText.slice(0, 1000)); // Hash first 1000 chars
      const readingTimeMin = TrustGatekeeper.calculateReadingTime(wordCount);

      const domain = getDomain(baseUrl) || '';
      const category = TrustGatekeeper.classifyCategory(baseUrl, domain, title, bodyText);
      const quality = TrustGatekeeper.evaluateContentQuality({
        wordCount,
        title,
        content: bodyText,
        headings: headingsStr,
        leadImageUrl,
        publishedAt
      }, domain);

      // Discard junk/spam if evaluated as spam
      if (quality.isSpam) {
        return null;
      }

      return {
        title: title || 'Untitled Document',
        description,
        headings: headingsStr,
        content: bodyText.slice(0, 50000), // Max 50KB text per page
        wordCount,
        contentHash,
        canonicalUrl,
        lang,
        logoUrl,
        leadImageUrl,
        images: extractedImages,
        publishedAt,
        hasMetaPublishedDate,
        outgoingLinks,
        author: author || null,
        schemaType,
        category,
        trustScore: quality.score,
        isVerifiedTrust: quality.isVerifiedTrust,
        readingTimeMin,
        geoData
      };
    } catch {
      return null;
    }
  }
}
