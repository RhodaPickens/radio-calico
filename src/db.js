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

  CREATE TABLE IF NOT EXISTS ratings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id   INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    rating     INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tracks_played_at ON tracks(played_at DESC);
  CREATE INDEX IF NOT EXISTS idx_ratings_track_id ON ratings(track_id);
`);

module.exports = db;
