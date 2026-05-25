const express = require('express');
const db = require('../db');
const router = express.Router();

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return (forwarded ? forwarded.split(',')[0].trim() : null) || req.ip || '';
}

function getVoteTotals(trackId) {
  return db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN vote =  1 THEN 1 ELSE 0 END), 0) AS thumbsUp,
      COALESCE(SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END), 0) AS thumbsDown
    FROM ratings WHERE track_id = ?
  `).get(trackId);
}

// GET /api/ratings/:trackId — vote totals + whether this IP has voted
router.get('/:trackId', (req, res) => {
  const trackId = parseInt(req.params.trackId);
  if (!Number.isInteger(trackId)) return res.status(400).json({ error: 'invalid trackId' });

  const totals  = getVoteTotals(trackId);
  const ip      = clientIp(req);
  const userRow = db.prepare('SELECT vote FROM ratings WHERE track_id = ? AND user_id = ?').get(trackId, ip);

  res.json({
    thumbsUp:   totals.thumbsUp,
    thumbsDown: totals.thumbsDown,
    userVote:   userRow ? userRow.vote : 0,
  });
});

// POST /api/ratings/:trackId — cast, switch, or retract a vote
router.post('/:trackId', (req, res) => {
  const trackId = parseInt(req.params.trackId);
  const vote    = parseInt(req.body.vote);

  if (vote !== 1 && vote !== -1) {
    return res.status(400).json({ error: 'vote must be 1 or -1' });
  }

  const track = db.prepare('SELECT id FROM tracks WHERE id = ?').get(trackId);
  if (!track) return res.status(404).json({ error: 'track not found' });

  const ip       = clientIp(req);
  const existing = db.prepare('SELECT id, vote FROM ratings WHERE track_id = ? AND user_id = ?').get(trackId, ip);

  let userVote;
  if (!existing) {
    db.prepare('INSERT INTO ratings (track_id, vote, user_id) VALUES (?, ?, ?)').run(trackId, vote, ip);
    userVote = vote;
  } else if (existing.vote === vote) {
    // Same button clicked again — retract
    db.prepare('DELETE FROM ratings WHERE id = ?').run(existing.id);
    userVote = 0;
  } else {
    // Different button — switch vote
    db.prepare('UPDATE ratings SET vote = ?, created_at = datetime(\'now\') WHERE id = ?').run(vote, existing.id);
    userVote = vote;
  }

  const totals = getVoteTotals(trackId);
  res.json({ ok: true, thumbsUp: totals.thumbsUp, thumbsDown: totals.thumbsDown, userVote });
});

module.exports = router;
