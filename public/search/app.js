// ==========================================================================
// NexusSearch & Crawler Frontend Controller
// ==========================================================================

let ws = null;
let currentSearchQuery = '';
let currentSearchPage = 1;
let crawlerState = 'IDLE';

// DOM Elements
const searchHero = document.getElementById('searchHero');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const searchResultsArea = document.getElementById('searchResultsArea');
const resultsList = document.getElementById('resultsList');
const resultsCount = document.getElementById('resultsCount');
const resultsLatency = document.getElementById('resultsLatency');
const paginationBar = document.getElementById('paginationBar');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageInfo = document.getElementById('pageInfo');

// Header Telemetry
const headerIndexedCount = document.getElementById('headerIndexedCount');
const headerRps = document.getElementById('headerRps');
const crawlerStateBadge = document.getElementById('crawlerStateBadge');

// View Tabs
const tabSearchBtn = document.getElementById('tabSearchBtn');
const tabCrawlerBtn = document.getElementById('tabCrawlerBtn');
const searchView = document.getElementById('searchView');
const crawlerView = document.getElementById('crawlerView');

// Crawler Control Form
const seedUrlsInput = document.getElementById('seedUrlsInput');
const concurrencyRange = document.getElementById('concurrencyRange');
const concurrencyVal = document.getElementById('concurrencyVal');
const depthRange = document.getElementById('depthRange');
const depthVal = document.getElementById('depthVal');
const maxPagesInput = document.getElementById('maxPagesInput');
const domainDelayInput = document.getElementById('domainDelayInput');

const startCrawlBtn = document.getElementById('startCrawlBtn');
const pauseCrawlBtn = document.getElementById('pauseCrawlBtn');
const resumeCrawlBtn = document.getElementById('resumeCrawlBtn');
const stopCrawlBtn = document.getElementById('stopCrawlBtn');
const recalcPageRankBtn = document.getElementById('recalcPageRankBtn');
const resetDbBtn = document.getElementById('resetDbBtn');

// Presets
const presetWiki = document.getElementById('presetWiki');
const presetTech = document.getElementById('presetTech');
const presetNews = document.getElementById('presetNews');

// Metrics
const metricCrawledCount = document.getElementById('metricCrawledCount');
const metricErrors = document.getElementById('metricErrors');
const metricRps = document.getElementById('metricRps');
const metricQueueSize = document.getElementById('metricQueueSize');
const metricDiscovered = document.getElementById('metricDiscovered');
const metricActiveWorkers = document.getElementById('metricActiveWorkers');
const metricActiveDomains = document.getElementById('metricActiveDomains');
const domainBarsList = document.getElementById('domainBarsList');
const terminalLogStream = document.getElementById('terminalLogStream');
const clearTerminalBtn = document.getElementById('clearTerminalBtn');

// Quick Presets List
const PRESETS = {
  wiki: [
    'https://id.wikipedia.org/wiki/Halaman_Utama',
    'https://en.wikipedia.org/wiki/Main_Page',
    'https://en.wikipedia.org/wiki/Portal:Technology'
  ],
  tech: [
    'https://news.ycombinator.com',
    'https://dev.to',
    'https://techcrunch.com'
  ],
  news: [
    'https://www.bbc.com/indonesia',
    'https://www.theverge.com',
    'https://phys.org'
  ]
};

// ==========================================================================
// Tab Switching Logic
// ==========================================================================
function switchView(targetView) {
  if (targetView === 'search-view') {
    tabSearchBtn.classList.add('active');
    tabCrawlerBtn.classList.remove('active');
    searchView.classList.add('active');
    crawlerView.classList.remove('active');
  } else {
    tabCrawlerBtn.classList.add('active');
    tabSearchBtn.classList.remove('active');
    crawlerView.classList.add('active');
    searchView.classList.remove('active');
  }
}

tabSearchBtn.addEventListener('click', () => switchView('search-view'));
tabCrawlerBtn.addEventListener('click', () => switchView('crawler-view'));
document.getElementById('logoBtn').addEventListener('click', () => switchView('search-view'));

// Range Sliders
concurrencyRange.addEventListener('input', (e) => {
  concurrencyVal.textContent = e.target.value;
});
depthRange.addEventListener('input', (e) => {
  depthVal.textContent = e.target.value;
});

// Presets Click
presetWiki.addEventListener('click', () => {
  seedUrlsInput.value = PRESETS.wiki.join('\n');
});
presetTech.addEventListener('click', () => {
  seedUrlsInput.value = PRESETS.tech.join('\n');
});
presetNews.addEventListener('click', () => {
  seedUrlsInput.value = PRESETS.news.join('\n');
});

// Set default seeds
seedUrlsInput.value = PRESETS.wiki.join('\n');

// ==========================================================================
// WebSocket Real-time Connection
// ==========================================================================
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('⚡ Connected to Nexus Crawler WebSocket');
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleWSMessage(msg);
    } catch (e) {
      console.error('WS Parse error:', e);
    }
  };

  ws.onclose = () => {
    console.log('WS Connection closed. Reconnecting in 2s...');
    setTimeout(initWebSocket, 2000);
  };
}

let lastDomainKey = '';

function handleWSMessage(msg) {
  const { type, data } = msg;

  if (type === 'init' || type === 'telemetry') {
    updateTelemetry(data);
  } else if (type === 'crawler_status') {
    updateCrawlerStatus(data);
  } else if (type === 'crawl_logs_batch') {
    if (Array.isArray(data)) {
      appendTerminalLogsBatch(data);
    }
  } else if (type === 'crawl_log') {
    appendTerminalLogsBatch([data]);
  }
}

function updateTelemetry(data) {
  if (!data) return;

  const { crawler, db } = data;

  if (crawler) {
    updateCrawlerStatus(crawler);
  }

  if (db) {
    const formattedCount = db.totalPages ? db.totalPages.toLocaleString() : '0';
    if (headerIndexedCount.textContent !== formattedCount) {
      headerIndexedCount.textContent = formattedCount;
    }
    renderDomainBars(db.topDomains, db.totalPages);
  }
}

function updateCrawlerStatus(crawler) {
  if (!crawler) return;

  crawlerState = crawler.state || 'IDLE';

  // Badge
  if (crawlerStateBadge.textContent !== crawlerState) {
    crawlerStateBadge.textContent = crawlerState;
    crawlerStateBadge.className = `badge live-badge ${crawlerState.toLowerCase()}`;
  }

  // Metrics
  metricCrawledCount.textContent = (crawler.crawledCount || 0).toLocaleString();
  metricErrors.textContent = `${crawler.errorCount || 0} errors`;
  const rpsVal = (crawler.rps || 0).toFixed(1);
  metricRps.textContent = rpsVal;
  headerRps.textContent = `${rpsVal} req/s`;

  metricQueueSize.textContent = (crawler.queueSize || 0).toLocaleString();
  metricDiscovered.textContent = `${(crawler.uniqueUrlsSeen || 0).toLocaleString()} seen`;

  metricActiveWorkers.textContent = crawler.activeWorkers || 0;
  metricActiveDomains.textContent = `${crawler.activeDomains || 0} active hosts`;

  // Update Action Buttons Visibility
  if (crawlerState === 'RUNNING') {
    startCrawlBtn.classList.add('hidden');
    pauseCrawlBtn.classList.remove('hidden');
    resumeCrawlBtn.classList.add('hidden');
    stopCrawlBtn.classList.remove('hidden');
  } else if (crawlerState === 'PAUSED') {
    startCrawlBtn.classList.add('hidden');
    pauseCrawlBtn.classList.add('hidden');
    resumeCrawlBtn.classList.remove('hidden');
    stopCrawlBtn.classList.remove('hidden');
  } else {
    // IDLE or STOPPED
    startCrawlBtn.classList.remove('hidden');
    pauseCrawlBtn.classList.add('hidden');
    resumeCrawlBtn.classList.add('hidden');
    stopCrawlBtn.classList.add('hidden');
  }
}

function renderDomainBars(topDomains, totalPages) {
  if (!topDomains || topDomains.length === 0 || !totalPages) {
    if (lastDomainKey !== 'empty') {
      domainBarsList.innerHTML = '<div class="empty-hint">No domain data yet. Start crawling to see distribution.</div>';
      lastDomainKey = 'empty';
    }
    return;
  }

  const domainKey = JSON.stringify(topDomains) + totalPages;
  if (domainKey === lastDomainKey) return; // Skip DOM update if unchanged
  lastDomainKey = domainKey;

  const maxCount = topDomains[0].count || 1;
  const fragment = document.createDocumentFragment();

  topDomains.slice(0, 8).forEach(d => {
    const percent = Math.round((d.count / maxCount) * 100);
    const item = document.createElement('div');
    item.className = 'domain-bar-item';
    item.innerHTML = `
      <div class="domain-bar-header">
        <span class="domain-name">${escapeHtml(d.domain)}</span>
        <span class="domain-count">${d.count.toLocaleString()} pages</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width: ${percent}%"></div>
      </div>
    `;
    fragment.appendChild(item);
  });

  domainBarsList.innerHTML = '';
  domainBarsList.appendChild(fragment);
}

// High performance batched terminal log rendering with DocumentFragment
let pendingLogEntries = [];
let logRenderScheduled = false;

function appendTerminalLogsBatch(logs) {
  if (!logs || logs.length === 0) return;
  pendingLogEntries.push(...logs);

  if (!logRenderScheduled) {
    logRenderScheduled = true;
    requestAnimationFrame(flushTerminalLogs);
  }
}

function flushTerminalLogs() {
  logRenderScheduled = false;
  if (pendingLogEntries.length === 0) return;

  const logsToRender = pendingLogEntries.splice(0, 40); // Process max 40 per frame
  const fragment = document.createDocumentFragment();

  for (const log of logsToRender) {
    const line = document.createElement('div');
    line.className = 'terminal-line';

    let tagClass = 'ok';
    let tagText = '200 OK';

    if (log.type === 'error' || log.status >= 400 || log.status === 0) {
      tagClass = 'err';
      tagText = `${log.status || 'ERR'} ${log.statusText || ''}`;
    } else if (log.type === 'skip') {
      tagClass = 'skip';
      tagText = 'ROBOTS';
    }

    const timeStr = new Date(log.created_at || Date.now()).toLocaleTimeString();
    const latencyStr = log.latencyMs ? `${log.latencyMs}ms` : '';
    const linksStr = log.newQueued !== undefined ? `+${log.newQueued} links` : '';

    line.innerHTML = `
      <span class="term-tag ${tagClass}">${tagText}</span>
      <span class="term-meta">[${timeStr}] ${latencyStr} ${linksStr}</span>
      <span class="term-url">${escapeHtml(log.url)}</span>
    `;
    fragment.appendChild(line);
  }

  terminalLogStream.insertBefore(fragment, terminalLogStream.firstChild);

  // Keep max 50 lines in DOM to ensure zero-lag 60fps rendering
  while (terminalLogStream.children.length > 50) {
    terminalLogStream.removeChild(terminalLogStream.lastChild);
  }

  // If more logs remain, schedule next frame
  if (pendingLogEntries.length > 0) {
    logRenderScheduled = true;
    requestAnimationFrame(flushTerminalLogs);
  }
}

clearTerminalBtn.addEventListener('click', () => {
  pendingLogEntries = [];
  terminalLogStream.innerHTML = '';
});

// ==========================================================================
// Crawler Actions API Calls
// ==========================================================================
startCrawlBtn.addEventListener('click', async () => {
  const seeds = seedUrlsInput.value
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (seeds.length === 0) {
    alert('Silakan masukkan minimal 1 Seed URL untuk memulai crawling.');
    return;
  }

  const payload = {
    seeds,
    concurrency: parseInt(concurrencyRange.value, 10),
    maxDepth: parseInt(depthRange.value, 10),
    maxPages: parseInt(maxPagesInput.value, 10),
    perDomainDelayMs: parseInt(domainDelayInput.value, 10)
  };

  startCrawlBtn.disabled = true;
  updateCrawlerStatus({ state: 'RUNNING', activeWorkers: 1 });

  try {
    const res = await fetch('/api/crawl/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Gagal memulai crawler');
      updateCrawlerStatus({ state: 'IDLE' });
    } else if (data.status) {
      updateCrawlerStatus(data.status);
    }
  } catch (err) {
    alert('Error connecting to crawler API: ' + err.message);
    updateCrawlerStatus({ state: 'IDLE' });
  } finally {
    startCrawlBtn.disabled = false;
  }
});

pauseCrawlBtn.addEventListener('click', async () => {
  pauseCrawlBtn.disabled = true;
  updateCrawlerStatus({ state: 'PAUSED' });
  try {
    const res = await fetch('/api/crawl/pause', { method: 'POST' });
    const data = await res.json();
    if (data.status) {
      updateCrawlerStatus(data.status);
    }
  } catch (err) {
    console.error('Pause failed:', err);
  } finally {
    pauseCrawlBtn.disabled = false;
  }
});

resumeCrawlBtn.addEventListener('click', async () => {
  resumeCrawlBtn.disabled = true;
  updateCrawlerStatus({ state: 'RUNNING' });
  try {
    const res = await fetch('/api/crawl/resume', { method: 'POST' });
    const data = await res.json();
    if (data.status) {
      updateCrawlerStatus(data.status);
    }
  } catch (err) {
    console.error('Resume failed:', err);
  } finally {
    resumeCrawlBtn.disabled = false;
  }
});

stopCrawlBtn.addEventListener('click', async () => {
  stopCrawlBtn.disabled = true;
  updateCrawlerStatus({ state: 'STOPPED', activeWorkers: 0, rps: 0 });
  try {
    const res = await fetch('/api/crawl/stop', { method: 'POST' });
    const data = await res.json();
    if (data.status) {
      updateCrawlerStatus(data.status);
    }
  } catch (err) {
    console.error('Stop failed:', err);
  } finally {
    stopCrawlBtn.disabled = false;
  }
});

recalcPageRankBtn.addEventListener('click', async () => {
  recalcPageRankBtn.disabled = true;
  recalcPageRankBtn.textContent = 'Calculating PageRank...';
  try {
    const res = await fetch('/api/pagerank/calculate', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert(`PageRank selesai dihitung untuk ${data.result.count} halaman dalam ${data.result.durationMs}ms (${data.result.iterations} iterasi).`);
    }
  } catch (e) {
    alert('PageRank error: ' + e.message);
  } finally {
    recalcPageRankBtn.disabled = false;
    recalcPageRankBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
      Recompute PageRank
    `;
  }
});

resetDbBtn.addEventListener('click', async () => {
  if (confirm('Apakah Anda yakin ingin MENGHAPUS SEMUA DATA crawler dan indeks pencarian?')) {
    await fetch('/api/database/reset', { method: 'POST' });
    terminalLogStream.innerHTML = '<div class="terminal-line text-muted">[System] Database reset successfully.</div>';
    headerIndexedCount.textContent = '0';
  }
});

// ==========================================================================
// Search Engine Client
// ==========================================================================
// Debounce helper for instant smooth search
let searchDebounceTimer = null;

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  clearSearchBtn.classList.toggle('hidden', !q);

  clearTimeout(searchDebounceTimer);
  if (q.length >= 2) {
    searchDebounceTimer = setTimeout(() => {
      performSearch(q, 1);
    }, 280);
  } else if (q.length === 0 && searchHero.classList.contains('compact')) {
    searchResultsArea.classList.add('hidden');
    searchHero.classList.remove('compact');
  }
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  clearSearchBtn.classList.add('hidden');
  clearTimeout(searchDebounceTimer);
  searchResultsArea.classList.add('hidden');
  searchHero.classList.remove('compact');
  searchInput.focus();
});

// Quick suggestion chips
document.querySelectorAll('.query-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    clearTimeout(searchDebounceTimer);
    searchInput.value = chip.getAttribute('data-q');
    clearSearchBtn.classList.remove('hidden');
    performSearch(searchInput.value, 1);
  });
});

searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  clearTimeout(searchDebounceTimer);
  const q = searchInput.value.trim();
  if (q) {
    performSearch(q, 1);
  }
});

prevPageBtn.addEventListener('click', () => {
  if (currentSearchPage > 1) {
    performSearch(currentSearchQuery, currentSearchPage - 1);
  }
});

nextPageBtn.addEventListener('click', () => {
  performSearch(currentSearchQuery, currentSearchPage + 1);
});

async function performSearch(query, page = 1) {
  currentSearchQuery = query;
  currentSearchPage = page;

  searchHero.classList.add('compact');
  searchResultsArea.classList.remove('hidden');
  resultsList.innerHTML = '<div class="empty-hint">Searching index...</div>';

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}&limit=15`);
    const data = await res.json();

    renderSearchResults(data);
  } catch (err) {
    resultsList.innerHTML = `<div class="empty-hint text-danger">Search error: ${err.message}</div>`;
  }
}

function renderSearchResults(data) {
  const { results, total, durationMs, page, safeSearchBlocked, safeSearchNotice, instantAnswer } = data;

  resultsCount.textContent = `Found ${(total || 0).toLocaleString()} results for "${escapeHtml(data.query)}"`;
  resultsLatency.textContent = `${durationMs} ms`;

  // 1. Check for SafeSearch & Anti-Judol Compliance Alert
  if (safeSearchBlocked || safeSearchNotice?.blocked) {
    const notice = safeSearchNotice || {
      title: 'Peringatan Keamanan & Kepatuhan Hukum (Anti-Judol)',
      message: data.safeSearchMessage || 'Pencarian terkait perjudian online dibatasi sesuai UU ITE dan regulasi Kominfo RI.',
      reportUrl: 'https://aduankonten.id'
    };

    resultsList.innerHTML = `
      <div class="safesearch-shield-card">
        <div class="safesearch-shield-header">
          <span class="safesearch-shield-icon">🛡️</span>
          <span class="safesearch-shield-title">${escapeHtml(notice.title)}</span>
        </div>
        <p class="safesearch-shield-body">${escapeHtml(notice.message)}</p>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <a href="${escapeHtml(notice.reportUrl || 'https://aduankonten.id')}" target="_blank" rel="noopener noreferrer" class="safesearch-report-btn">
            🚨 Laporkan Konten Ilegal (AduanKonten.id)
          </a>
        </div>
      </div>
    `;
    paginationBar.classList.add('hidden');
    return;
  }

  // 2. Render Instant Answer if available
  let instantHtml = '';
  if (instantAnswer && instantAnswer.title) {
    instantHtml = `
      <div class="instant-answer-card">
        <div class="instant-answer-header">
          <span class="instant-badge">⚡ INSTANT ANSWER</span>
          <span class="instant-source">${escapeHtml(instantAnswer.source || 'Knowledge')}</span>
        </div>
        <h3 class="instant-title">${escapeHtml(instantAnswer.title)}</h3>
        <p class="instant-desc">${instantAnswer.description || ''}</p>
      </div>
    `;
  }

  if (!results || results.length === 0) {
    resultsList.innerHTML = instantHtml + `
      <div class="empty-hint">
        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">Tidak ditemukan halaman yang cocok.</p>
        <p style="color: var(--text-dim); font-size: 0.85rem;">Coba gunakan kata kunci yang lebih umum, atau buka tab <strong>Mission Control</strong> untuk mencrawl lebih banyak website.</p>
      </div>
    `;
    paginationBar.classList.add('hidden');
    return;
  }

  resultsList.innerHTML = instantHtml + results.map(item => {
    const prScore = (item.pagerank || 1.0).toFixed(1);
    return `
      <article class="result-item">
        <div class="result-header">
          <div class="result-domain-wrap">
            <span>🌐 ${escapeHtml(item.domain)}</span>
            <span>›</span>
            <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.url)}</a>
          </div>
          <div class="pr-badge" title="PageRank Authority Score (Calculated via Link Graph)">
            ⭐ PR ${prScore}
          </div>
        </div>
        <h2 class="result-title">
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${item.title || 'Untitled Document'}</a>
        </h2>
        <p class="result-snippet">${item.snippet || 'No snippet preview available.'}</p>
        <div class="result-footer">
          <span>Backlinks: ${item.inLinks || 0}</span>
          ${item.crawledAt ? `<span>Crawled: ${new Date(item.crawledAt).toLocaleTimeString()}</span>` : ''}
        </div>
      </article>
    `;
  }).join('');

  // Update pagination
  const totalPages = Math.ceil(total / 15);
  if (totalPages > 1) {
    paginationBar.classList.remove('hidden');
    pageInfo.textContent = `Page ${page} of ${totalPages}`;
    prevPageBtn.disabled = page <= 1;
    nextPageBtn.disabled = page >= totalPages;
  } else {
    paginationBar.classList.add('hidden');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initialize on page load
initWebSocket();
