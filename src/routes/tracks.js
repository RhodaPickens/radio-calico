const express = require('express');
const db = require('../db');
const router = express.Router();

// Log a track play (called when a new track starts)
router.post('/', (req, res) => {
  const { title, artist, album, stream_url } = req.body;
  const stmt = db.prepare(
    'INSERT INTO tracks (title, artist, album, stream_url) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(title ?? null, artist ?? null, album ?? null, stream_url ?? null);
  res.json({ id: result.lastInsertRowid });
});

// Get recent track history (with their ratings if any)
router.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const rows = db.prepare(`
    SELECT t.id, t.title, t.artist, t.album, t.played_at, t.stream_url,
           r.rating
    FROM   tracks t
    LEFT JOIN ratings r ON r.track_id = t.id
    ORDER BY t.played_at DESC
    LIMIT ?
  `).all(limit);
  res.json(rows);
});

module.exports = router;
