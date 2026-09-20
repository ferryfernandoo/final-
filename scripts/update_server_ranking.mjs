import fs from 'fs';

const filePath = 'C:/deepernova-search-main/src/server.js';
let code = fs.readFileSync(filePath, 'utf8');

// Update formatAiContext to emphasize human-readable date and freshness
const oldAiContext = `function formatAiContext(query, results) {
  if (!results || results.length === 0) {
    return \`### Search Results for "\${query}"\\nNo relevant web results found in index.\`;
  }
  let md = \`### Web Search Results for "\${query}" (Source: DeeperNova Engine):\\n\`;
  results.forEach((r, idx) => {
    const rawTitle = (r.title || r.domain || 'Untitled').replace(/<[^>]+>/g, '').trim();
    const snippet = (r.snippet || r.description || '').replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ').trim();
    md += \`\\n[\${idx + 1}] **\${rawTitle}**\\n\`;
    md += \`URL: \${r.url}\\n\`;
    md += \`Domain: \${r.domain}\\n\`;
    if (r.published_at) md += \`Tanggal: \${r.published_at}\\n\`;
    if (snippet) md += \`Ringkasan: \${snippet}\\n\`;
  });
  return md.trim();
}`;

const newAiContext = `function formatAiContext(query, results) {
  if (!results || results.length === 0) {
    return \`### Search Results for "\${query}"\\nNo relevant web results found in index.\`;
  }
  let md = \`### Web Search Results for "\${query}" (Source: DeeperNova Engine):\\n\`;
  results.forEach((r, idx) => {
    const rawTitle = (r.title || r.domain || 'Untitled').replace(/<[^>]+>/g, '').trim();
    const snippet = (r.snippet || r.description || '').replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ').trim();
    md += \`\\n[\${idx + 1}] **\${rawTitle}**\\n\`;
    md += \`URL: \${r.url}\\n\`;
    md += \`Domain: \${r.domain}\\n\`;
    if (r.formatted_date || r.published_at) md += \`Waktu/Tanggal: \${r.formatted_date || r.published_at}\\n\`;
    if (snippet) md += \`Ringkasan: \${snippet}\\n\`;
  });
  return md.trim();
}`;

let normalized = code.replace(/\r\n/g, '\n');
if (normalized.includes(oldAiContext)) {
  normalized = normalized.replace(oldAiContext, newAiContext);
  console.log('✓ Updated formatAiContext in server.js');
}

// Update handleV1Search formattedResults
const oldV1Mapping = `    const rawTitle = (r.rawTitle || r.title || '').replace(/<[^>]+>/g, '').trim();
    const snippet = (r.snippet || r.description || r.content || '').replace(/<[^>]+>/g, '').trim();
    const pubDate = r.publishedAt || r.published_at;
    return {
      title: rawTitle,
      url: r.url || '',
      domain: r.domain || '',
      snippet: snippet,
      description: snippet,
      author: r.author || null,
      published_at: pubDate ? new Date(pubDate).toISOString() : null,
      pagerank: r.pagerank || 0,
      trust_score: r.trust_score || r.trustScore || 0,
      logo_url: r.logo_url || r.logoUrl || null,
      lead_image_url: r.lead_image_url || r.leadImageUrl || null
    };`;

const newV1Mapping = `    const rawTitle = (r.rawTitle || r.title || '').replace(/<[^>]+>/g, '').trim();
    const snippet = (r.snippet || r.description || r.content || '').replace(/<[^>]+>/g, '').trim();
    const pubDate = r.publishedAt || r.published_at || r.crawledAt;
    const formattedDate = r.formattedDate || r.date || SearchEngine.formatSearchDate?.(pubDate) || null;
    return {
      title: rawTitle,
      url: r.url || '',
      domain: r.domain || '',
      snippet: snippet,
      description: snippet,
      author: r.author || null,
      published_at: pubDate ? new Date(pubDate).toISOString() : null,
      formatted_date: formattedDate,
      date: formattedDate,
      timestamp_ms: Number(pubDate || 0),
      pagerank: r.pagerank || 0,
      trust_score: r.trust_score || r.trustScore || 0,
      logo_url: r.logo_url || r.logoUrl || null,
      lead_image_url: r.lead_image_url || r.leadImageUrl || null
    };`;

if (normalized.includes(oldV1Mapping)) {
  normalized = normalized.replace(oldV1Mapping, newV1Mapping);
  console.log('✓ Updated handleV1Search mapping in server.js');
}

fs.writeFileSync(filePath, normalized, 'utf8');
console.log('✓ server.js updated successfully');
