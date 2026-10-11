import Store from 'express-session';

// SQLite Session Store untuk express-session
export class SQLiteSessionStore extends Store.Store {
  constructor(db) {
    super();
    this.db = db;
    this.initializeTable();
  }

  initializeTable() {
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          sid TEXT PRIMARY KEY,
          sess TEXT NOT NULL,
          expire INTEGER NOT NULL
        )
      `);
    } catch (error) {
      console.error('Error creating sessions table:', error);
    }
  }

  get(sid, callback) {
    try {
      const stmt = this.db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expire > ?');
      const row = stmt.get(sid, Math.floor(Date.now() / 1000));

      if (!row) {
        return callback(null, null);
      }

      try {
        const session = JSON.parse(row.sess);
        callback(null, session);
      } catch (err) {
        callback(err);
      }
    } catch (error) {
      callback(error);
    }
  }

  set(sid, session, callback) {
    try {
      const defaultDuration = 30 * 24 * 60 * 60; // 30 days in seconds
      let expire;

      if (session && session.cookie) {
        const maxAge = session.cookie.originalMaxAge || session.cookie.maxAge;
        if (typeof maxAge === 'number' && !isNaN(maxAge) && maxAge > 0) {
          expire = Math.floor(Date.now() / 1000) + Math.floor(maxAge / 1000);
        } else if (session.cookie.expires) {
          const expTime = new Date(session.cookie.expires).getTime();
          if (!isNaN(expTime)) {
            expire = Math.floor(expTime / 1000);
          }
        }
      }

      if (!expire || isNaN(expire)) {
        expire = Math.floor(Date.now() / 1000) + defaultDuration;
      }

      const sess = JSON.stringify(session);

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO sessions (sid, sess, expire)
        VALUES (?, ?, ?)
      `);

      stmt.run(sid, sess, expire);

      if (callback) callback(null);
    } catch (error) {
      if (callback) callback(error);
    }
  }

  destroy(sid, callback) {
    try {
      const stmt = this.db.prepare('DELETE FROM sessions WHERE sid = ?');
      stmt.run(sid);

      if (callback) callback(null);
    } catch (error) {
      if (callback) callback(error);
    }
  }

  // Optional: cleanup expired sessions
  cleanup() {
    try {
      const stmt = this.db.prepare('DELETE FROM sessions WHERE expire < ?');
      stmt.run(Math.floor(Date.now() / 1000));
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
    }
  }

  // Optional: get all sessions
  all(callback) {
    try {
      const stmt = this.db.prepare(`
        SELECT sid, sess FROM sessions WHERE expire > ?
      `);
      const rows = stmt.all(Math.floor(Date.now() / 1000));

      const sessions = {};
      rows.forEach(row => {
        try {
          sessions[row.sid] = JSON.parse(row.sess);
        } catch {
          // Skip invalid sessions
        }
      });

      if (callback) callback(null, sessions);
    } catch (error) {
      if (callback) callback(error);
    }
  }

  // Optional: get count of sessions
  length(callback) {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM sessions WHERE expire > ?');
      const result = stmt.get(Math.floor(Date.now() / 1000));

      if (callback) callback(null, result.count);
    } catch (error) {
      if (callback) callback(error);
    }
  }
}

export default SQLiteSessionStore;
