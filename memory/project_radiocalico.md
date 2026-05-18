---
name: project-radiocalico
description: Radio Calico — HLS lossless internet radio player; Node/Express + SQLite backend, vanilla JS/CSS/HTML frontend
metadata:
  type: project
---

Radio Calico is a lossless internet radio web app (24-bit / 48 kHz HLS stream via CloudFront). Stack: Node.js + Express server (`server.js`), SQLite database (`src/db.js`, `data/`), vanilla HTML/CSS/JS frontend (`public/`).

**Why:** Personal audiophile radio project, ad-free.

**How to apply:** Keep changes to vanilla JS/CSS/HTML — no framework. The stream uses HLS.js for non-Safari browsers and native HLS for Safari. Player state lives in `public/app.js`; styles in `public/style.css`; markup in `public/index.html`.
