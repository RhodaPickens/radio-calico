# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # production: node server.js
npm run dev      # development: node --watch server.js (auto-restarts on changes)
```

No build step, linter, or test suite — changes to `public/` are served immediately on next browser refresh.

## Architecture

**Single-process Express app** serving both the REST API and static frontend from one `server.js` entry point. No bundler or transpilation.

```
server.js               # Express app, mounts routes, serves public/
src/
  db.js                 # better-sqlite3 singleton; runs schema migrations on startup
  routes/
    tracks.js           # POST / findOrCreate by title+artist; GET / track history
    ratings.js          # GET|POST /:trackId — thumbs up/down, IP-based per-user
public/
  index.html            # Single page; player strip (full-width) + previous tracks below
  app.js                # All client logic: HLS playback, metadata polling, voting
  style.css             # Brand styles; CSS custom properties in :root
data/
  radiocalico.db        # SQLite database (WAL mode)
```

## Key Behaviours

**Metadata polling** starts on page load (not on play), so the current song and vote counts are always visible. Every 15 s it fetches `metadatav2.json` from CloudFront; on a track change it calls `POST /api/tracks` (findOrCreate) to get a stable `track_id`, then fetches votes.

**Ratings** are per-IP per track. `POST /api/ratings/:trackId` handles cast / switch / retract in one endpoint: same vote = DELETE (retract), different vote = UPDATE, no existing = INSERT. The client sends only `{ vote: 1 | -1 }` — user identity comes from `req.ip` / `x-forwarded-for`.

**DB migrations** run synchronously at startup inside `db.js`. The ratings table schema is checked with `PRAGMA table_info(ratings)`; if the old star-rating schema is detected the table is dropped and recreated.

**HLS playback** uses hls.js with a fallback to native HLS for Safari. Fatal errors trigger a 3 s retry loop via `setTimeout(startStream, 3000)`.

## Brand / Styling

Colours, fonts, and component rules are defined in `RadioCalico_Style_Guide.txt`. The CSS custom properties in `:root` (`--mint`, `--forest`, `--teal`, `--orange`, `--charcoal`, `--cream`, `--white`) map directly to that palette. Reference the style guide before changing visual design.

The layout reference image is `RadioCalicoLayout.png`.
