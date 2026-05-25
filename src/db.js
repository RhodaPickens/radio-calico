const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../data/radiocalico.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS tracks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT,
    artist      TEXT,
    album       TEXT,
    played_at   TEXT NOT NULL DEFAULT (datetime('now')),
    stream_url  TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_tracks_played_at ON tracks(played_at DESC);
`);

// Migrate ratings table to thumbs up/down schema with per-user tracking
const ratingsCols = db.prepare('PRAGMA table_info(ratings)').all().map(c => c.name);
if (!ratingsCols.includes('vote')) {
  db.exec('DROP TABLE IF EXISTS ratings');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS ratings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id   INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    vote       INTEGER NOT NULL CHECK(vote IN (-1, 1)),
    user_id    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(track_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_ratings_track_id ON ratings(track_id);
`);

module.exports = db;
