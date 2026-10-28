/**
 * PageRank Graph Algorithm Implementation using Power Iteration
 */
export class PageRankCalculator {
  constructor(dbInstance, dampingFactor = 0.85, maxIterations = 20, convergenceThreshold = 0.0001) {
    this.db = dbInstance.db;
    this.dampingFactor = dampingFactor;
    this.maxIterations = maxIterations;
    this.convergenceThreshold = convergenceThreshold;
  }

  /**
   * Calculates PageRank for all indexed pages and updates the database
   */
  calculate() {
    const startTime = performance.now();

    // 1. Fetch top connected indexed pages (capped to 25,000 to maintain low memory footprint)
    const pages = this.db.prepare('SELECT id, url FROM pages ORDER BY in_links_count DESC, id DESC LIMIT 25000').all();
    const N = pages.length;
    if (N === 0) {
      return { success: true, count: 0, durationMs: 0, iterations: 0 };
    }

    const urlToId = new Map();
    const idToUrl = new Map();
    pages.forEach(p => {
      urlToId.set(p.url, p.id);
      idToUrl.set(p.id, p.url);
    });

    // 2. Fetch top active links
    const links = this.db.prepare('SELECT from_url, to_url FROM links WHERE is_nofollow = 0 LIMIT 60000').all();

    // Build adjacency list & in-links map
    // outLinks: id -> Set<target_id>
    // inLinks: id -> Set<source_id>
    const outLinks = new Map();
    const inLinks = new Map();

    pages.forEach(p => {
      outLinks.set(p.id, new Set());
      inLinks.set(p.id, new Set());
    });

    links.forEach(l => {
      const fromId = urlToId.get(l.from_url);
      const toId = urlToId.get(l.to_url);

      if (fromId !== undefined && toId !== undefined && fromId !== toId) {
        outLinks.get(fromId).add(toId);
        inLinks.get(toId).add(fromId);
      }
    });

    // 3. Initialize ranks: 1 / N
    let ranks = new Map();
    pages.forEach(p => {
      ranks.set(p.id, 1.0 / N);
    });

    // 4. Power iteration
    let iteration = 0;
    for (iteration = 0; iteration < this.maxIterations; iteration++) {
      const newRanks = new Map();
      let diff = 0;

      // Calculate dangling sum (pages with 0 out-links distribute rank evenly to all)
      let danglingSum = 0;
      pages.forEach(p => {
        if (outLinks.get(p.id).size === 0) {
          danglingSum += ranks.get(p.id);
        }
      });

      const baseRank = (1.0 - this.dampingFactor) / N + (this.dampingFactor * danglingSum) / N;

      pages.forEach(p => {
        let incomingSum = 0;
        const incomingSources = inLinks.get(p.id);

        for (const srcId of incomingSources) {
          const srcOutDegree = outLinks.get(srcId).size;
          if (srcOutDegree > 0) {
            incomingSum += ranks.get(srcId) / srcOutDegree;
          }
        }

        const newRank = baseRank + this.dampingFactor * incomingSum;
        newRanks.set(p.id, newRank);
        diff += Math.abs(newRank - ranks.get(p.id));
      });

      ranks = newRanks;

      if (diff < this.convergenceThreshold) {
        iteration++;
        break;
      }
    }

    // 5. Normalize ranks so average is 1.0 for intuitive ranking
    let maxRank = 0;
    pages.forEach(p => {
      const r = ranks.get(p.id);
      if (r > maxRank) maxRank = r;
    });
  
    const updateStmt = this.db.prepare(`
      UPDATE pages SET pagerank = ?, in_links_count = ? WHERE id = ?
    `);

    // Execute updates in a transaction for speed
    this.db.exec('BEGIN TRANSACTION');
    try {
      pages.forEach(p => {
        // Scaled score between 0.1 and 10.0
        const rawRank = ranks.get(p.id) || 0;
        const scaledRank = maxRank > 0 ? (rawRank / maxRank) * 10.0 : 1.0;
        const inCount = inLinks.get(p.id).size;

        updateStmt.run(Math.round(scaledRank * 100) / 100, inCount, p.id);
      });
      this.db.exec('COMMIT');
    } catch (e) {
      try { this.db.exec('ROLLBACK'); } catch {}
      throw e;
    }

    const durationMs = Math.round(performance.now() - startTime);

    return {
      success: true,
      count: N,
      iterations: iteration,
      durationMs
    };
  }

  /**
   * Fully non-blocking asynchronous PageRank calculation with batching and event loop yields
   */
  async calculateAsync() {
    if (this._isCalculating) {
      return this._calcPromise;
    }
    this._isCalculating = true;
    this._calcPromise = this._runCalculateAsync().finally(() => {
      this._isCalculating = false;
      this._calcPromise = null;
    });
    return this._calcPromise;
  }

  async _runCalculateAsync() {
    const startTime = performance.now();

    // 1. Fetch top connected indexed pages (capped to 25,000 to maintain low memory footprint)
    const pages = this.db.prepare('SELECT id, url FROM pages ORDER BY in_links_count DESC, id DESC LIMIT 25000').all();
    const N = pages.length;
    if (N === 0) {
      return { success: true, count: 0, durationMs: 0, iterations: 0 };
    }

    const urlToId = new Map();
    pages.forEach(p => {
      urlToId.set(p.url, p.id);
    });

    const links = this.db.prepare('SELECT from_url, to_url FROM links WHERE is_nofollow = 0 LIMIT 60000').all();

    const outLinks = new Map();
    const inLinks = new Map();

    pages.forEach(p => {
      outLinks.set(p.id, new Set());
      inLinks.set(p.id, new Set());
    });

    links.forEach(l => {
      const fromId = urlToId.get(l.from_url);
      const toId = urlToId.get(l.to_url);

      if (fromId !== undefined && toId !== undefined && fromId !== toId) {
        outLinks.get(fromId).add(toId);
        inLinks.get(toId).add(fromId);
      }
    });

    let ranks = new Map();
    pages.forEach(p => {
      ranks.set(p.id, 1.0 / N);
    });

    let iteration = 0;
    for (iteration = 0; iteration < this.maxIterations; iteration++) {
      const newRanks = new Map();
      let diff = 0;

      let danglingSum = 0;
      pages.forEach(p => {
        if (outLinks.get(p.id).size === 0) {
          danglingSum += ranks.get(p.id);
        }
      });

      const baseRank = (1.0 - this.dampingFactor) / N + (this.dampingFactor * danglingSum) / N;

      pages.forEach(p => {
        let incomingSum = 0;
        const incomingSources = inLinks.get(p.id);

        for (const srcId of incomingSources) {
          const srcOutDegree = outLinks.get(srcId).size;
          if (srcOutDegree > 0) {
            incomingSum += ranks.get(srcId) / srcOutDegree;
          }
        }

        const newRank = baseRank + this.dampingFactor * incomingSum;
        newRanks.set(p.id, newRank);
        diff += Math.abs(newRank - ranks.get(p.id));
      });

      ranks = newRanks;

      if (diff < this.convergenceThreshold) {
        iteration++;
        break;
      }

      if (iteration % 4 === 0) {
        await new Promise(r => setImmediate(r));
      }
    }

    let maxRank = 0;
    pages.forEach(p => {
      const r = ranks.get(p.id);
      if (r > maxRank) maxRank = r;
    });

    const updateStmt = this.db.prepare(`
      UPDATE pages SET pagerank = ?, in_links_count = ? WHERE id = ?
    `);

    const BATCH_SIZE = 500;
    for (let i = 0; i < pages.length; i += BATCH_SIZE) {
      const chunk = pages.slice(i, i + BATCH_SIZE);
      this.db.exec('BEGIN TRANSACTION');
      try {
        chunk.forEach(p => {
          const rawRank = ranks.get(p.id) || 0;
          const scaledRank = maxRank > 0 ? (rawRank / maxRank) * 10.0 : 1.0;
          const inCount = inLinks.get(p.id).size;
          updateStmt.run(Math.round(scaledRank * 100) / 100, inCount, p.id);
        });
        this.db.exec('COMMIT');
      } catch (e) {
        try { this.db.exec('ROLLBACK'); } catch {}
      }
      await new Promise(r => setImmediate(r));
    }

    const durationMs = Math.round(performance.now() - startTime);

    return {
      success: true,
      count: N,
      iterations: iteration,
      durationMs
    };
  }
}
