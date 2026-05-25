---
name: feedback_svg_icons
description: SVG icon fix — use transform rotation to derive paired icons rather than hand-writing paths
metadata:
  type: feedback
---

When using paired SVG icons (thumbs up / thumbs down), derive one from the other using `transform="rotate(180 cx cy)"` rather than writing a separate hand-crafted path. Hand-written paths are error-prone (missing bezier control points, etc.). The Material Design thumb_up and thumb_down icons are exact 180° rotations of each other.

**Why:** The original thumbs-up path had a malformed cubic bezier (missing a control point), causing it to render incorrectly. Rotating the verified thumbs-down 180° around the SVG center (12,12) gave a pixel-perfect thumbs-up.

**How to apply:** Any time two icons are symmetric variants of each other, use SVG `transform` on the same path rather than sourcing a second path independently.
