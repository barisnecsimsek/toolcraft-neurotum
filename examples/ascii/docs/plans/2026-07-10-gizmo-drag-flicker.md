# Stable orientation-gizmo background during drag

## Goal

Remove the visible flashing of the orientation-gizmo circle while preserving its size, placement, point tracking, axis rendering, click snap, and runtime camera behavior.

## Root cause

Controlled-browser sampling during a slow drag collected 198 samples. The gizmo canvas was never disconnected or replaced and its backing pixel never became transparent, so React remounting and buffer clearing are not the cause. The circle is redrawn into the Canvas2D bitmap with alpha `204/255` (`rgba(..., 0.8)`), allowing the rapidly changing WebGL product frame underneath to modulate the circle's visible brightness during camera movement.

## Behavior contract

- Keep the 70×70 CSS / 140×140 backing size, 16px lower-left placement, axes, dots, hover, direct point tracking, 3px drag threshold, and 600ms click snap unchanged.
- Render the circular backing as one stable, fully opaque CSS background layer on the canvas element.
- Keep the Canvas2D bitmap transparent except for axes, points, and hover strokes.
- Use solid black in dark mode and the existing light neutral color in light mode.
- Keep the handle excluded from PNG export and keep `view.orbit` state/history unchanged.

## Implementation

1. Update `src/app/renderer/orientation-gizmo-control.tsx` so `drawGizmo` no longer clears and redraws the circular backing; apply the solid circular backing through stable element styles.
2. Strengthen `e2e/app-controls.spec.ts` to require an opaque computed background before and after the real drag while retaining direct point-tracking assertions.
3. Record the diagnosis, rejected causes, and verification in `docs/toolcraft/agent-worklog.md`.

## Verification note

Verification tier: Tier 3
Reason: The state shape and product renderer are unchanged, but this corrects a high-frequency custom Canvas2D editing-handle render layer during the `view.orbit` interaction path.
Run: `npm run ai:check`, `npm run verify:quick`, focused camera/effects browser acceptance, targeted `browser perf: view.orbit remains responsive`, and controlled-browser sampling of node continuity, computed background opacity, and backing-buffer transparency during drag.
Skip: `npm run verify:final` and the full performance checkpoint are not required for this post-first-working visual regression fix; export, media, dependencies, runtime architecture, and unrelated renderer workloads are unchanged.
