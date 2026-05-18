const express = require('express');
const db = require('../db');
const router = express.Router();

// Submit or update a rating for a track
router.post('/:trackId', (req, res) => {
  const trackId = parseInt(req.params.trackId);
  const rating = parseInt(req.body.rating);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be an integer 1–5' });
  }

  const track = db.prepare('SELECT id FROM tracks WHERE id = ?').get(trackId);
  if (!track) return res.status(404).json({ error: 'track not found' });

  // One rating per track — upsert
  const existing = db.prepare('SELECT id FROM ratings WHERE track_id = ?').get(trackId);
  if (existing) {
    db.prepare('UPDATE ratings SET rating = ?, created_at = datetime(\'now\') WHERE track_id = ?')
      .run(rating, trackId);
  } else {
    db.prepare('INSERT INTO ratings (track_id, rating) VALUES (?, ?)').run(trackId, rating);
  }

  res.json({ ok: true, trackId, rating });
});

module.exports = router;
