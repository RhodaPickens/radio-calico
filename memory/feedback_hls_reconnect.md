---
name: feedback-hls-reconnect
description: When HLS.js reconnects it starts a few seconds behind the live edge — guard timeupdate to never go backwards
metadata:
  type: feedback
---

When displaying elapsed time from `audio.currentTime` on an HLS live stream, track `lastDisplayedTime` and skip any `timeupdate` where `t < lastDisplayedTime`.

**Why:** HLS.js buffers from slightly before the live edge on reconnect, causing `currentTime` to briefly dip below the last value. Without the guard the display jumps back a few seconds each time the user stops and restarts.

**How to apply:** Any time `audio.currentTime` is displayed or used for UI state in this project, apply the monotonic guard.
