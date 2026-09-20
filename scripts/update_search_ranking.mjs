import fs from 'fs';

const filePath = 'C:/deepernova-search-main/src/indexer/search.js';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add formatSearchDate helper if not present
if (!code.includes('function formatSearchDate')) {
  const helper = `/**
 * Format timestamp to human-readable date / relative recency string (Indonesian)
 */
function formatSearchDate(timestampMs) {
  if (!timestampMs || isNaN(timestampMs)) return null;
  const time = Number(timestampMs);
  if (time < 946684800000) return null;

  const now = Date.now();
  const diffMs = now - time;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Baru saja';
  if (diffMinutes < 60) return diffMinutes + ' mnt lalu';
  if (diffHours < 24) return diffHours + ' jam lalu';
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 7) return diffDays + ' hr lalu';
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks + ' mgg lalu';
  }

  const dateObj = new Date(time);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return dateObj.getDate() + ' ' + months[dateObj.getMonth()] + ' ' + dateObj.getFullYear();
}

`;
  code = helper + code;
  console.log('✓ Added formatSearchDate function at the top of search.js');
}

// 2. Replace recency block using start and end indices
const startMarker = '// 5. Intelligent Calibrated Freshness Boost';
const endMarker = 'return score;';
const startIdx = code.indexOf(startMarker);
if (startIdx !== -1) {
  const endIdx = code.indexOf(endMarker, startIdx);
  if (endIdx !== -1) {
    const replacement = `// 5. Intelligent Calibrated Freshness Boost & Metadata Elevation
    // User Requirement: "ranking nya ada tiemestamp nya jadi orang tau ini tanggla berapa setiap hasil pencarian makin baru makin relevan makin diatas"
    const now = Date.now();
    const hasExplicitPublishedAt = Boolean(row.published_at && Number(row.published_at) > 946684800000);
    const pubTime = Number(row.published_at || row.crawled_at || 0);

    if (pubTime > 946684800000 && !isGenericChannelOrHub) {
      const diffHours = Math.max(0, (now - pubTime) / (3600 * 1000));
      const hasMetadata = Boolean(
        (row.author && row.author.length > 2) ||
        (row.schema_type && row.schema_type.includes('Article')) ||
        (row.lead_image_url) ||
        (row.reading_time_min && row.reading_time_min > 0)
      );

      const isBreakingNewsQuery = (
        lowerQuery.includes('terbaru') ||
        lowerQuery.includes('terkini') ||
        lowerQuery.includes('hari ini') ||
        lowerQuery.includes('update') ||
        lowerQuery.includes('gempa') ||
        lowerQuery.includes('berita') ||
        lowerQuery.includes('live') ||
        lowerQuery.includes('skor') ||
        lowerQuery.includes('kabar') ||
        lowerQuery.includes('peristiwa')
      );

      const isQueryRelevantToArticle = (isTitlePrefix || isTitleContains || titleCoreTermsMatchedCount > 0);

      // Progressive recency boost: newer content gets significant elevation
      if (diffHours <= 2) {
        // Breaking content within 2 hours: supreme priority
        const multiplier = isBreakingNewsQuery ? 4.0 : (isQueryRelevantToArticle ? 3.0 : 2.0);
        score *= multiplier;
        score += 45000;
        if (hasMetadata) score += 6000;
      } else if (diffHours <= 6) {
        // Very fresh within 6 hours
        const multiplier = isBreakingNewsQuery ? 3.0 : (isQueryRelevantToArticle ? 2.5 : 1.7);
        score *= multiplier;
        score += 32000;
        if (hasMetadata) score += 5000;
      } else if (diffHours <= 12) {
        // Fresh within 12 hours
        const multiplier = isBreakingNewsQuery ? 2.4 : (isQueryRelevantToArticle ? 2.0 : 1.5);
        score *= multiplier;
        score += 24000;
        if (hasMetadata) score += 4000;
      } else if (diffHours <= 24) {
        // Fresh within 24 hours (today)
        const multiplier = isBreakingNewsQuery ? 2.0 : (isQueryRelevantToArticle ? 1.6 : 1.3);
        score *= multiplier;
        score += 16000;
        if (hasMetadata) score += 3000;
      } else if (diffHours <= 72) {
        // Fresh within 3 days
        const multiplier = isBreakingNewsQuery ? 1.5 : (isQueryRelevantToArticle ? 1.3 : 1.15);
        score *= multiplier;
        score += 9000;
        if (hasMetadata) score += 2000;
      } else if (diffHours <= 168) {
        // Fresh within 7 days (this week)
        const multiplier = isBreakingNewsQuery ? 1.3 : (isQueryRelevantToArticle ? 1.15 : 1.08);
        score *= multiplier;
        score += 5000;
        if (hasMetadata) score += 1000;
      } else if (diffHours <= 720) {
        // Fresh within 30 days
        score += 2500;
      } else if (diffHours > 17520) {
        // Over 2 years old: slight decay for fast-moving content, but keep official docs intact
        const isOfficialReference = domain.includes('.wikipedia.org') || domain.endsWith('.gov') || domain.endsWith('.go.id') || domain.endsWith('.edu') || domain.endsWith('.ac.id');
        if (!isOfficialReference) {
          score *= 0.88;
        }
      }

      // Explicit structured article metadata bonus
      if (hasMetadata && hasExplicitPublishedAt && isQueryRelevantToArticle) {
        score += 4000;
      }
    }

    `;
    code = code.slice(0, startIdx) + replacement + code.slice(endIdx);
    console.log('✓ Successfully replaced recency scoring logic in calculateQueryAccuracyScore');
  }
}

// 3. Update sorting to break ties using timestamp
const sortMarker = 'scoredRows.sort((a, b) => b.accuracyScore - a.accuracyScore);';
if (code.includes(sortMarker)) {
  const replacementSort = `scoredRows.sort((a, b) => {
      const scoreDiff = b.accuracyScore - a.accuracyScore;
      const avgScore = (a.accuracyScore + b.accuracyScore) / 2;
      const relativeDiff = avgScore > 0 ? Math.abs(scoreDiff) / avgScore : 0;

      const timeA = Number(a.published_at || a.crawled_at || 0);
      const timeB = Number(b.published_at || b.crawled_at || 0);

      // If scores are competitive (within 15%) and one is noticebly newer (> 1 hour difference), rank newer first
      if (relativeDiff < 0.15 && timeA > 0 && timeB > 0 && Math.abs(timeB - timeA) > 3600000) {
        return timeB - timeA;
      }

      return scoreDiff;
    });`;
  code = code.replace(sortMarker, replacementSort);
  console.log('✓ Successfully updated scoredRows sorting');
}

// 4. Map date, formattedDate, timestampMs in results
const mappingMarker = `publishedAt: row.published_at || row.crawled_at,
        published_at: row.published_at || row.crawled_at,
        crawledAt: row.crawled_at`;

const replacementMapping = `date: formatSearchDate(row.published_at || row.crawled_at),
        formattedDate: formatSearchDate(row.published_at || row.crawled_at),
        timestampMs: Number(row.published_at || row.crawled_at || 0),
        publishedAt: row.published_at || row.crawled_at,
        published_at: row.published_at || row.crawled_at,
        crawledAt: row.crawled_at`;

// Normalize CRLF to LF temporarily for replacement if needed
let normalized = code.replace(/\r\n/g, '\n');
if (normalized.includes(mappingMarker)) {
  normalized = normalized.replaceAll(mappingMarker, replacementMapping);
  code = normalized;
  console.log('✓ Successfully mapped formattedDate and timestampMs in search results');
}

// 5. Attach formatSearchDate to SearchEngine class / exports
if (!code.includes('SearchEngine.formatSearchDate = formatSearchDate;')) {
  code += '\nSearchEngine.formatSearchDate = formatSearchDate;\n';
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('✓ Updated C:/deepernova-search-main/src/indexer/search.js successfully!');
