const express = require('express');
const db = require('../db');
const router = express.Router();

// Find or create a track by title+artist so votes accumulate across sessions
router.post('/', (req, res) => {
  const { title, artist, album, stream_url } = req.body;

  if (title && artist) {
    const existing = db.prepare(
      'SELECT id FROM tracks WHERE title = ? AND artist = ? LIMIT 1'
    ).get(title, artist);
    if (existing) return res.json({ id: existing.id });
  }

  const result = db.prepare(
    'INSERT INTO tracks (title, artist, album, stream_url) VALUES (?, ?, ?, ?)'
  ).run(title ?? null, artist ?? null, album ?? null, stream_url ?? null);
  res.json({ id: result.lastInsertRowid });
});

// Get recent track history (with their ratings if any)
router.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const rows = db.prepare(`
    SELECT t.id, t.title, t.artist, t.album, t.played_at, t.stream_url,
           COALESCE(SUM(CASE WHEN r.vote =  1 THEN 1 ELSE 0 END), 0) AS thumbs_up,
           COALESCE(SUM(CASE WHEN r.vote = -1 THEN 1 ELSE 0 END), 0) AS thumbs_down
    FROM   tracks t
    LEFT JOIN ratings r ON r.track_id = t.id
    GROUP BY t.id
    ORDER BY t.played_at DESC
    LIMIT ?
  `).all(limit);
  res.json(rows);
});

module.exports = router;
