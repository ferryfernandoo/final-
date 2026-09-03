import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'deepernova.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT,
      picture TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add rate limiting columns for existing databases
  try {
    db.exec(`ALTER TABLE users ADD COLUMN tokenLimitResetTime DATETIME`);
  } catch {
    // Column already exists
  }

  try {
    db.exec(`ALTER TABLE users ADD COLUMN lastMessageTime DATETIME`);
  } catch {
    // Column already exists
  }

  try {
    db.exec(`ALTER TABLE users ADD COLUMN messageCountInMinute INTEGER DEFAULT 0`);
  } catch {
    // Column already exists
  }

  // Chat sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Chat messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      userId TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      personality TEXT DEFAULT 'mentor',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sessionId) REFERENCES chat_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Alter chat_messages to add search columns if they don't exist
  try {
    db.exec(`ALTER TABLE chat_messages ADD COLUMN searchQuery TEXT`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE chat_messages ADD COLUMN searchSources TEXT`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE chat_messages ADD COLUMN searchImages TEXT`);
  } catch {
    // Column already exists
  }

  // API keys table
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      key TEXT NOT NULL UNIQUE,
      isActive INTEGER DEFAULT 1,
      lastUsed DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Document artifacts table (session-persistent)
  db.exec(`
    CREATE TABLE IF NOT EXISTS doc_artifacts (
      id TEXT PRIMARY KEY,
      userId TEXT,
      sessionId TEXT NOT NULL,
      prompt TEXT NOT NULL,
      response TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'docx',
      title TEXT DEFAULT 'Untitled Document',
      content TEXT,
      excelSheets TEXT,
      activeSheet INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Index for faster session-based queries
  db.exec(`CREATE INDEX IF NOT EXISTS idx_artifacts_session ON doc_artifacts(sessionId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_artifacts_user ON doc_artifacts(userId)`);

  // Generated images table (persistent storage for all generated images)
  db.exec(`
    CREATE TABLE IF NOT EXISTS generated_images (
      id TEXT PRIMARY KEY,
      userId TEXT,
      sessionId TEXT,
      prompt TEXT NOT NULL,
      imageUrl TEXT NOT NULL,
      model TEXT DEFAULT 'imagen-4-fast',
      size TEXT DEFAULT '1024x1024',
      reasoningUrl TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (sessionId) REFERENCES chat_sessions(id) ON DELETE SET NULL
    )
  `);

  // Index for faster queries on generated images
  db.exec(`CREATE INDEX IF NOT EXISTS idx_images_session ON generated_images(sessionId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_images_user ON generated_images(userId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_images_created ON generated_images(createdAt)`);

  // Uploaded images table (persistent storage for user-uploaded images in chat)
  db.exec(`
    CREATE TABLE IF NOT EXISTS uploaded_images (
      id TEXT PRIMARY KEY,
      messageId TEXT,
      sessionId TEXT NOT NULL,
      userId TEXT,
      fileName TEXT NOT NULL,
      imageData TEXT NOT NULL,
      mimeType TEXT DEFAULT 'image/jpeg',
      size INTEGER,
      analysis TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sessionId) REFERENCES chat_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Index for faster queries on uploaded images
  db.exec(`CREATE INDEX IF NOT EXISTS idx_uploaded_images_session ON uploaded_images(sessionId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_uploaded_images_user ON uploaded_images(userId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_uploaded_images_message ON uploaded_images(messageId)`);

  // Long-term memory table (stores knowledge/conclusions about user across sessions)
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_long_term (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      summary TEXT NOT NULL,
      category TEXT,
      sourceSessionId TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_memory_user ON memory_long_term(userId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_memory_created ON memory_long_term(createdAt)`);

  // Research memory table (stores cached search results & sources)
  db.exec(`
    CREATE TABLE IF NOT EXISTS research_memory (
      id TEXT PRIMARY KEY,
      userId TEXT,
      query TEXT NOT NULL,
      searchResults TEXT NOT NULL,
      sources TEXT NOT NULL,
      summary TEXT,
      category TEXT,
      confidence INTEGER DEFAULT 80,
      searchEngine TEXT DEFAULT 'serpapi',
      totalTime INTEGER,
      queryHash TEXT UNIQUE,
      lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
      expiresAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_research_user ON research_memory(userId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_research_query ON research_memory(queryHash)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_research_expires ON research_memory(expiresAt)`);

  // User Global Memory table (persistent knowledge base for each user across all sessions)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_global_memory (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL UNIQUE,
      globalMemory TEXT NOT NULL DEFAULT '',
      messageCount INTEGER DEFAULT 0,
      lastUpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_global_memory_user ON user_global_memory(userId)`);

  // Cloud Explorer files & folders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cloud_files (
      id TEXT PRIMARY KEY,
      userId TEXT,
      parentId TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'folder', 'docx', 'excel', 'pptx'
      path TEXT NOT NULL DEFAULT '/',
      content TEXT, -- JSON payload of the document contents
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parentId) REFERENCES cloud_files(id) ON DELETE CASCADE
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_cloud_parent ON cloud_files(parentId)`);
  try { db.exec(`ALTER TABLE cloud_files ADD COLUMN size INTEGER DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE cloud_files ADD COLUMN category TEXT DEFAULT 'other'`); } catch {}
  try { db.exec(`ALTER TABLE cloud_files ADD COLUMN fileData TEXT`); } catch {}
  try { db.exec(`ALTER TABLE cloud_files ADD COLUMN ownerEmail TEXT`); } catch {}
  try { db.exec(`ALTER TABLE cloud_files ADD COLUMN folderType TEXT DEFAULT 'company'`); } catch {}
  try { db.exec(`ALTER TABLE cloud_files ADD COLUMN founder TEXT`); } catch {}
  try { db.exec(`ALTER TABLE cloud_files ADD COLUMN founderEmail TEXT`); } catch {}
  try { db.exec(`ALTER TABLE cloud_files ADD COLUMN ceo TEXT`); } catch {}
  try { db.exec(`ALTER TABLE cloud_files ADD COLUMN ceoEmail TEXT`); } catch {}
  try { db.exec(`ALTER TABLE cloud_files ADD COLUMN employeeEmails TEXT`); } catch {}
  try { db.exec(`ALTER TABLE cloud_files ADD COLUMN folderCreator TEXT`); } catch {}
  try { db.exec(`ALTER TABLE cloud_files ADD COLUMN folderCreatorRole TEXT`); } catch {}
  try { db.exec(`ALTER TABLE cloud_files ADD COLUMN thumbnail TEXT`); } catch {}

  console.log('✅ Database initialized');
}

// User operations
export const userDb = {
  create: (id, email, name, password, picture) => {
    const stmt = db.prepare(`
      INSERT INTO users (id, email, name, password, picture)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, email, name, password, picture);
    return userDb.findById(id);
  },

  findById: (id) => {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  },

  findByEmail: (email) => {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  },

  update: (id, data) => {
    const set = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = Object.values(data);
    const stmt = db.prepare(`
      UPDATE users 
      SET ${set}, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(...values, id);
    return userDb.findById(id);
  }
};

// Chat session operations
export const sessionDb = {
  create: (id, userId, title) => {
    const stmt = db.prepare(`
      INSERT INTO chat_sessions (id, userId, title)
      VALUES (?, ?, ?)
    `);
    stmt.run(id, userId, title || null);
    return sessionDb.findById(id);
  },

  findById: (id) => {
    const stmt = db.prepare('SELECT * FROM chat_sessions WHERE id = ?');
    return stmt.get(id);
  },

  findByUserId: (userId) => {
    const stmt = db.prepare(`
      SELECT * FROM chat_sessions 
      WHERE userId = ? 
      ORDER BY updatedAt DESC
    `);
    return stmt.all(userId);
  },

  update: (id, data) => {
    const set = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = Object.values(data);
    const stmt = db.prepare(`
      UPDATE chat_sessions 
      SET ${set}, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(...values, id);
    return sessionDb.findById(id);
  },

  delete: (id) => {
    const stmt = db.prepare('DELETE FROM chat_sessions WHERE id = ?');
    stmt.run(id);
  }
};

// Chat message operations
export const messageDb = {
  create: (id, sessionId, userId, role, content, personality, searchQuery, searchSources) => {
    const stmt = db.prepare(`
      INSERT INTO chat_messages (id, sessionId, userId, role, content, personality, searchQuery, searchSources)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, sessionId, userId, role, content, personality || 'mentor', searchQuery || null, searchSources ? JSON.stringify(searchSources) : null);
    return messageDb.findById(id);
  },

  findById: (id) => {
    const stmt = db.prepare('SELECT * FROM chat_messages WHERE id = ?');
    const row = stmt.get(id);
    if (row && row.searchSources) {
      try {
        row.searchSources = JSON.parse(row.searchSources);
      } catch (e) {
        row.searchSources = [];
      }
    }
    return row;
  },

  findBySessionId: (sessionId) => {
    const stmt = db.prepare(`
      SELECT rowid, * FROM chat_messages 
      WHERE sessionId = ? 
      ORDER BY createdAt ASC, rowid ASC
    `);
    const rows = stmt.all(sessionId);
    return rows.map(row => {
      if (row && row.searchSources) {
        try {
          row.searchSources = JSON.parse(row.searchSources);
        } catch (e) {
          row.searchSources = [];
        }
      }
      return row;
    });
  },

  deleteBySessionId: (sessionId) => {
    const stmt = db.prepare('DELETE FROM chat_messages WHERE sessionId = ?');
    stmt.run(sessionId);
  }
};

// API key operations
export const apiKeyDb = {
  create: (id, userId, name, key) => {
    const stmt = db.prepare(`
      INSERT INTO api_keys (id, userId, name, key, isActive)
      VALUES (?, ?, ?, ?, 1)
    `);
    stmt.run(id, userId, name, key);
    return apiKeyDb.findById(id);
  },

  findById: (id) => {
    const stmt = db.prepare('SELECT * FROM api_keys WHERE id = ?');
    return stmt.get(id);
  },

  findByUserId: (userId) => {
    const stmt = db.prepare(`
      SELECT id, userId, name, key, isActive, lastUsed, createdAt, updatedAt
      FROM api_keys 
      WHERE userId = ? 
      ORDER BY createdAt DESC
    `);
    return stmt.all(userId);
  },

  findByKey: (key) => {
    const stmt = db.prepare('SELECT * FROM api_keys WHERE key = ?');
    return stmt.get(key);
  },

  update: (id, data) => {
    const set = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = Object.values(data);
    const stmt = db.prepare(`
      UPDATE api_keys 
      SET ${set}, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(...values, id);
    return apiKeyDb.findById(id);
  },

  updateLastUsed: (id) => {
    const stmt = db.prepare(`
      UPDATE api_keys 
      SET lastUsed = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(id);
  },

  delete: (id) => {
    const stmt = db.prepare('DELETE FROM api_keys WHERE id = ?');
    stmt.run(id);
  },

  deleteByUserId: (userId) => {
    const stmt = db.prepare('DELETE FROM api_keys WHERE userId = ?');
    stmt.run(userId);
  }
};

// Document artifact operations (session-persistent)
export const artifactDb = {
  create: (id, sessionId, prompt, response, type, title, content, excelSheets, activeSheet, userId) => {
    const stmt = db.prepare(`
      INSERT INTO doc_artifacts (id, userId, sessionId, prompt, response, type, title, content, excelSheets, activeSheet)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, userId || null, sessionId, prompt, response, type, title || 'Untitled Document',
      content ? JSON.stringify(content) : null,
      excelSheets ? JSON.stringify(excelSheets) : null,
      activeSheet ?? 0);
    return artifactDb.findById(id);
  },

  findById: (id) => {
    const stmt = db.prepare('SELECT * FROM doc_artifacts WHERE id = ?');
    const row = stmt.get(id);
    return row ? artifactDb._parse(row) : null;
  },

  findBySessionId: (sessionId) => {
    const stmt = db.prepare(`
      SELECT * FROM doc_artifacts 
      WHERE sessionId = ? 
      ORDER BY createdAt DESC
      LIMIT 50
    `);
    return stmt.all(sessionId).map(artifactDb._parse);
  },

  findByUserId: (userId) => {
    const stmt = db.prepare(`
      SELECT * FROM doc_artifacts 
      WHERE userId = ? 
      ORDER BY createdAt DESC
      LIMIT 50
    `);
    return stmt.all(userId).map(artifactDb._parse);
  },

  delete: (id) => {
    const stmt = db.prepare('DELETE FROM doc_artifacts WHERE id = ?');
    stmt.run(id);
  },

  deleteBySessionId: (sessionId) => {
    const stmt = db.prepare('DELETE FROM doc_artifacts WHERE sessionId = ?');
    stmt.run(sessionId);
  },

  _parse: (row) => {
    if (!row) return null;
    return {
      ...row,
      content: row.content ? JSON.parse(row.content) : null,
      excelSheets: row.excelSheets ? JSON.parse(row.excelSheets) : null,
    };
  }
};

// Generated images operations
export const imageDb = {
  create: (id, userId, sessionId, prompt, imageUrl, model, size, reasoningUrl) => {
    const stmt = db.prepare(`
      INSERT INTO generated_images (id, userId, sessionId, prompt, imageUrl, model, size, reasoningUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, userId || null, sessionId || null, prompt, imageUrl, model, size, reasoningUrl || null);
    return imageDb.findById(id);
  },

  findById: (id) => {
    const stmt = db.prepare('SELECT * FROM generated_images WHERE id = ?');
    return stmt.get(id);
  },

  findBySessionId: (sessionId) => {
    const stmt = db.prepare(`
      SELECT * FROM generated_images 
      WHERE sessionId = ? 
      ORDER BY createdAt DESC
    `);
    return stmt.all(sessionId);
  },

  findByUserId: (userId) => {
    const stmt = db.prepare(`
      SELECT * FROM generated_images 
      WHERE userId = ? 
      ORDER BY createdAt DESC
      LIMIT 100
    `);
    return stmt.all(userId);
  },

  findRecent: (limit = 50) => {
    const stmt = db.prepare(`
      SELECT * FROM generated_images 
      ORDER BY createdAt DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  },

  delete: (id) => {
    const stmt = db.prepare('DELETE FROM generated_images WHERE id = ?');
    stmt.run(id);
  },

  deleteBySessionId: (sessionId) => {
    const stmt = db.prepare('DELETE FROM generated_images WHERE sessionId = ?');
    stmt.run(sessionId);
  }
};

// Long-term memory operations
export const memoryDb = {
  create: (id, userId, summary, category = null, sourceSessionId = null) => {
    const stmt = db.prepare(`
      INSERT INTO memory_long_term (id, userId, summary, category, sourceSessionId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    stmt.run(id, userId, summary, category, sourceSessionId);
    return memoryDb.findById(id);
  },

  findById: (id) => {
    const stmt = db.prepare('SELECT * FROM memory_long_term WHERE id = ?');
    return stmt.get(id);
  },

  findByUser: (userId, limit = 100) => {
    const stmt = db.prepare(`
      SELECT * FROM memory_long_term 
      WHERE userId = ? 
      ORDER BY updatedAt DESC 
      LIMIT ?
    `);
    return stmt.all(userId, limit);
  },

  findByCategory: (userId, category) => {
    const stmt = db.prepare(`
      SELECT * FROM memory_long_term 
      WHERE userId = ? AND category = ? 
      ORDER BY updatedAt DESC
    `);
    return stmt.all(userId, category);
  },

  update: (id, data) => {
    const set = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = Object.values(data);
    const stmt = db.prepare(`
      UPDATE memory_long_term 
      SET ${set}, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(...values, id);
    return memoryDb.findById(id);
  },

  delete: (id) => {
    const stmt = db.prepare('DELETE FROM memory_long_term WHERE id = ?');
    stmt.run(id);
    return true;
  },

  deleteByUser: (userId) => {
    const stmt = db.prepare('DELETE FROM memory_long_term WHERE userId = ?');
    stmt.run(userId);
    return true;
  },

  getAsText: (userId) => {
    const memories = memoryDb.findByUser(userId, 500);
    if (!memories || memories.length === 0) {
      return 'No long-term memories recorded yet.';
    }

    let text = `=== LONG-TERM MEMORY FOR USER ${userId} ===\n`;
    text += `Generated: ${new Date().toISOString()}\n`;
    text += `Total Memories: ${memories.length}\n\n`;

    const grouped = {};
    memories.forEach(mem => {
      const cat = mem.category || 'General';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(mem);
    });

    for (const [category, mems] of Object.entries(grouped)) {
      text += `\n## ${category}\n`;
      mems.forEach((mem, idx) => {
        text += `\n${idx + 1}. ${mem.summary}\n`;
        text += `   (Updated: ${mem.updatedAt})\n`;
      });
    }

    return text;
  }
};

// Research memory operations (cached search results)
export const researchMemoryDb = {
  create: (id, userId, query, searchResults, sources, options = {}) => {
    const queryHash = crypto.createHash('sha256').update(query.toLowerCase()).digest('hex');
    const expiresAt = new Date(Date.now() + (options.ttl || 7 * 24 * 60 * 60 * 1000)); // 7 days default
    
    const stmt = db.prepare(`
      INSERT INTO research_memory 
      (id, userId, query, searchResults, sources, summary, category, confidence, searchEngine, totalTime, queryHash, lastUpdated, expiresAt, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(
      id,
      userId,
      query,
      JSON.stringify(searchResults),
      JSON.stringify(sources),
      options.summary || null,
      options.category || 'general',
      options.confidence || 80,
      options.searchEngine || 'serpapi',
      options.totalTime || null,
      queryHash,
      expiresAt.toISOString()
    );
    
    return researchMemoryDb.findById(id);
  },

  findById: (id) => {
    const stmt = db.prepare('SELECT * FROM research_memory WHERE id = ?');
    const result = stmt.get(id);
    if (result) {
      result.searchResults = JSON.parse(result.searchResults);
      result.sources = JSON.parse(result.sources);
    }
    return result;
  },

  findByQueryHash: (queryHash) => {
    const stmt = db.prepare('SELECT * FROM research_memory WHERE queryHash = ? AND expiresAt > CURRENT_TIMESTAMP');
    const result = stmt.get(queryHash);
    if (result) {
      result.searchResults = JSON.parse(result.searchResults);
      result.sources = JSON.parse(result.sources);
    }
    return result;
  },

  findByUser: (userId, limit = 100) => {
    const stmt = db.prepare(`
      SELECT * FROM research_memory 
      WHERE userId = ? AND expiresAt > CURRENT_TIMESTAMP
      ORDER BY lastUpdated DESC 
      LIMIT ?
    `);
    const results = stmt.all(userId, limit);
    return results.map(r => ({
      ...r,
      searchResults: JSON.parse(r.searchResults),
      sources: JSON.parse(r.sources)
    }));
  },

  findByCategory: (userId, category) => {
    const stmt = db.prepare(`
      SELECT * FROM research_memory 
      WHERE userId = ? AND category = ? AND expiresAt > CURRENT_TIMESTAMP
      ORDER BY lastUpdated DESC
    `);
    const results = stmt.all(userId, category);
    return results.map(r => ({
      ...r,
      searchResults: JSON.parse(r.searchResults),
      sources: JSON.parse(r.sources)
    }));
  },

  update: (id, data) => {
    const set = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = Object.values(data);
    const stmt = db.prepare(`
      UPDATE research_memory 
      SET ${set}, lastUpdated = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(...values, id);
    return researchMemoryDb.findById(id);
  },

  delete: (id) => {
    const stmt = db.prepare('DELETE FROM research_memory WHERE id = ?');
    stmt.run(id);
    return true;
  },

  cleanExpired: () => {
    const stmt = db.prepare('DELETE FROM research_memory WHERE expiresAt < CURRENT_TIMESTAMP');
    const result = stmt.run();
    return result.changes;
  },

  updateConfidence: (id, confidence) => {
    const stmt = db.prepare('UPDATE research_memory SET confidence = ?, lastUpdated = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(confidence, id);
    return researchMemoryDb.findById(id);
  }
};

// Uploaded images operations (user-uploaded images in chat)
export const uploadedImageDb = {
  create: (id, messageId, sessionId, userId, fileName, imageData, mimeType, size) => {
    const stmt = db.prepare(`
      INSERT INTO uploaded_images 
      (id, messageId, sessionId, userId, fileName, imageData, mimeType, size, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(id, messageId || null, sessionId, userId || null, fileName, imageData, mimeType, size);
    return uploadedImageDb.findById(id);
  },

  findById: (id) => {
    const stmt = db.prepare('SELECT * FROM uploaded_images WHERE id = ?');
    return stmt.get(id);
  },

  findByMessageId: (messageId) => {
    const stmt = db.prepare('SELECT * FROM uploaded_images WHERE messageId = ? ORDER BY createdAt ASC');
    return stmt.all(messageId);
  },

  findBySessionId: (sessionId) => {
    const stmt = db.prepare(`
      SELECT * FROM uploaded_images 
      WHERE sessionId = ? 
      ORDER BY createdAt DESC
    `);
    return stmt.all(sessionId);
  },

  findByUserId: (userId, limit = 100) => {
    const stmt = db.prepare(`
      SELECT * FROM uploaded_images 
      WHERE userId = ? 
      ORDER BY createdAt DESC 
      LIMIT ?
    `);
    return stmt.all(userId, limit);
  },

  updateAnalysis: (id, analysis) => {
    const stmt = db.prepare('UPDATE uploaded_images SET analysis = ? WHERE id = ?');
    stmt.run(analysis, id);
    return uploadedImageDb.findById(id);
  },

  delete: (id) => {
    const stmt = db.prepare('DELETE FROM uploaded_images WHERE id = ?');
    stmt.run(id);
    return true;
  },

  deleteByMessageId: (messageId) => {
    const stmt = db.prepare('DELETE FROM uploaded_images WHERE messageId = ?');
    const result = stmt.run(messageId);
    return result.changes;
  }
};

export function checkRateLimiting(userId) {
  const user = userDb.findById(userId);
  if (!user) return { isRateLimited: false };
  
  const now = new Date();
  const lastMessageTime = user.lastMessageTime ? new Date(user.lastMessageTime) : null;
  const messageCount = user.messageCountInMinute || 0;
  
  // Reset counter if more than 1 minute has passed
  if (!lastMessageTime || (now - lastMessageTime) > 60000) {
    const stmt = db.prepare(`
      UPDATE users 
      SET lastMessageTime = ?,
          messageCountInMinute = 1,
          updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(now.toISOString(), userId);
    return { isRateLimited: false, messageCount: 1 };
  }
  
  // Increment message count
  const newCount = messageCount + 1;
  const stmt = db.prepare(`
    UPDATE users 
    SET messageCountInMinute = ?,
        updatedAt = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);
  stmt.run(newCount, userId);
  
  // Check if rate limit exceeded (100 messages in 1 minute)
  if (newCount > 100) {
    return { isRateLimited: true, messageCount: newCount };
  }
  
  return { isRateLimited: false, messageCount: newCount };
}

// Global Memory operations
export const globalMemoryDb = {
  getOrCreate: (userId) => {
    const stmt = db.prepare(`
      SELECT * FROM user_global_memory WHERE userId = ?
    `);
    let record = stmt.get(userId);
    
    if (!record) {
      const id = crypto.randomUUID();
      const insertStmt = db.prepare(`
        INSERT INTO user_global_memory (id, userId, globalMemory, messageCount)
        VALUES (?, ?, '', 0)
      `);
      insertStmt.run(id, userId);
      record = stmt.get(userId);
    }
    
    return record;
  },

  get: (userId) => {
    const stmt = db.prepare(`
      SELECT * FROM user_global_memory WHERE userId = ?
    `);
    return stmt.get(userId);
  },

  update: (userId, globalMemory) => {
    const stmt = db.prepare(`
      UPDATE user_global_memory 
      SET globalMemory = ?, lastUpdatedAt = CURRENT_TIMESTAMP
      WHERE userId = ?
    `);
    stmt.run(globalMemory, userId);
    return globalMemoryDb.get(userId);
  },

  incrementMessageCount: (userId) => {
    const stmt = db.prepare(`
      UPDATE user_global_memory 
      SET messageCount = messageCount + 1
      WHERE userId = ?
    `);
    stmt.run(userId);
    return globalMemoryDb.get(userId);
  },

  resetMessageCount: (userId) => {
    const stmt = db.prepare(`
      UPDATE user_global_memory 
      SET messageCount = 0
      WHERE userId = ?
    `);
    stmt.run(userId);
    return globalMemoryDb.get(userId);
  },

  delete: (userId) => {
    const stmt = db.prepare('DELETE FROM user_global_memory WHERE userId = ?');
    stmt.run(userId);
    return true;
  }
};





// Cloud Explorer database operations
export const cloudDb = {
  createFolder: (id, parentId, name, userId, ownerEmail = null, folderType = 'company', founder = null, founderEmail = null, ceo = null, ceoEmail = null, employeeEmails = null) => {
    const empStr = Array.isArray(employeeEmails) ? JSON.stringify(employeeEmails) : (typeof employeeEmails === 'string' ? employeeEmails : null);
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO cloud_files (id, parentId, name, type, path, content, userId, ownerEmail, folderType, founder, founderEmail, ceo, ceoEmail, employeeEmails, updatedAt)
      VALUES (?, ?, ?, 'folder', '/', NULL, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(id, parentId || null, name, userId || null, ownerEmail || null, folderType || 'company', founder || null, founderEmail || null, ceo || null, ceoEmail || null, empStr);
    return cloudDb.findById(id);
  },

  saveFolder: (id, parentId, name, userId, ownerEmail = null, folderType = 'company', founder = null, founderEmail = null, ceo = null, ceoEmail = null, employeeEmails = null) => {
    return cloudDb.createFolder(id, parentId, name, userId, ownerEmail, folderType, founder, founderEmail, ceo, ceoEmail, employeeEmails);
  },

  save: (id, userId, ownerEmail, name, content, size, mimeType = 'code', category = 'code', parentId = null) => {
    return cloudDb.saveFile(
      id,
      parentId,
      name,
      mimeType,
      category,
      size || (typeof content === 'string' ? content.length : JSON.stringify(content || '').length),
      content,
      null,
      userId,
      ownerEmail,
      'company'
    );
  },

  saveFile: (id, parentId, name, type, category = 'other', size = 0, content = null, fileData = null, userId = null, ownerEmail = null, folderType = null, founder = null, founderEmail = null, ceo = null, ceoEmail = null, employeeEmails = null, folderCreator = null, folderCreatorRole = null, thumbnail = null) => {
    const empStr = Array.isArray(employeeEmails) ? JSON.stringify(employeeEmails) : (typeof employeeEmails === 'string' ? employeeEmails : null);

    let safeParentId = parentId || null;
    if (safeParentId) {
      try {
        const parentExists = db.prepare('SELECT id FROM cloud_files WHERE id = ?').get(safeParentId);
        if (!parentExists) {
          db.prepare(`
            INSERT OR IGNORE INTO cloud_files (id, parentId, name, type, category, folderType, ownerEmail, folderCreator, folderCreatorRole, updatedAt)
            VALUES (?, NULL, 'Folder Cloud', 'folder', 'folder', ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `).run(safeParentId, folderType || 'company', ownerEmail || null, folderCreator || null, folderCreatorRole || null);
        }
      } catch (_err) {
        safeParentId = null;
      }
    }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO cloud_files (id, parentId, name, type, category, size, path, content, fileData, thumbnail, userId, ownerEmail, folderType, founder, founderEmail, ceo, ceoEmail, employeeEmails, folderCreator, folderCreatorRole, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, '/', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    try {
      stmt.run(id, safeParentId, name, type, category, size, typeof content === 'object' ? JSON.stringify(content) : content, fileData, thumbnail || null, userId || null, ownerEmail || null, folderType || null, founder || null, founderEmail || null, ceo || null, ceoEmail || null, empStr, folderCreator || null, folderCreatorRole || null);
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || (err.message && err.message.includes('FOREIGN KEY'))) {
        console.warn('[cloudDb.saveFile] SQLITE_CONSTRAINT_FOREIGNKEY caught! Retrying with parentId = NULL for id:', id);
        stmt.run(id, null, name, type, category, size, typeof content === 'object' ? JSON.stringify(content) : content, fileData, thumbnail || null, userId || null, ownerEmail || null, folderType || null, founder || null, founderEmail || null, ceo || null, ceoEmail || null, empStr, folderCreator || null, folderCreatorRole || null);
      } else {
        throw err;
      }
    }
    return cloudDb.findById(id);
  },

  findById: (id) => {
    const stmt = db.prepare('SELECT * FROM cloud_files WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;
    let emps = row.employeeEmails;
    if (typeof emps === 'string' && (emps.startsWith('[') || emps.startsWith('{'))) {
      try { emps = JSON.parse(emps); } catch (_e) {}
    }
    return {
      ...row,
      employeeEmails: emps,
      content: row.content ? (row.content.startsWith('{') || row.content.startsWith('[') ? JSON.parse(row.content) : row.content) : null
    };
  },

  listAll: () => {
    const stmt = db.prepare(`
      SELECT * FROM cloud_files ORDER BY createdAt DESC, name ASC
    `);
    const rows = stmt.all();
    return rows.map(r => {
      let emps = r.employeeEmails;
      if (typeof emps === 'string' && (emps.startsWith('[') || emps.startsWith('{'))) {
        try { emps = JSON.parse(emps); } catch (_e) {}
      }
      return {
        ...r,
        employeeEmails: emps,
        content: r.content ? (r.content.startsWith('{') || r.content.startsWith('[') ? JSON.parse(r.content) : r.content) : null
      };
    });
  },

  listByUser: (userId) => {
    return cloudDb.listAll();
  },

  getTotalUsage: (userId) => {
    const stmt = userId 
      ? db.prepare('SELECT SUM(size) as totalSize FROM cloud_files WHERE userId = ?')
      : db.prepare('SELECT SUM(size) as totalSize FROM cloud_files');
    const row = userId ? stmt.get(userId) : stmt.get();
    return row && row.totalSize ? Number(row.totalSize) : 0;
  },

  delete: (id, userId, fileName) => {
    try {
      if (fileName) {
        db.prepare('DELETE FROM cloud_files WHERE id = ? OR parentId = ? OR name = ?').run(id, id, fileName);
        db.prepare('DELETE FROM uploaded_images WHERE id = ? OR fileName = ?').run(id, fileName);
        db.prepare('DELETE FROM generated_images WHERE id = ? OR imageUrl LIKE ?').run(id, `%${fileName}%`);
        db.prepare('DELETE FROM doc_artifacts WHERE id = ? OR title = ?').run(id, fileName);
      } else {
        db.prepare('DELETE FROM cloud_files WHERE id = ? OR parentId = ?').run(id, id);
        db.prepare('DELETE FROM uploaded_images WHERE id = ?').run(id);
        db.prepare('DELETE FROM generated_images WHERE id = ?').run(id);
        db.prepare('DELETE FROM doc_artifacts WHERE id = ?').run(id);
      }
    } catch (err) {
      console.warn('[cloudDb.delete] Error deleting from database:', err.message);
    }
    return true;
  }
};

export default db;
