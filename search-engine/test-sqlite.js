import { DatabaseSync } from 'node:sqlite';

try {
  const db = new DatabaseSync(':memory:');
  console.log('DatabaseSync created successfully.');
  db.exec(`CREATE TABLE pages (id INTEGER PRIMARY KEY, title TEXT);`);
  console.log('Table created successfully.');
  db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS fts_pages USING fts5(title, tokenize='porter unicode61');`);
  console.log('FTS5 table created successfully!');
} catch (e) {
  console.error('Error in SQLite / FTS5 test:', e);
}
