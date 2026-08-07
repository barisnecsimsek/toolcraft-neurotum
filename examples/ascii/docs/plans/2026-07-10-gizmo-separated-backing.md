# Physically separated orientation-gizmo backing

## Goal

Eliminate the remaining circle flicker by ensuring the circular backing never belongs to the frequently updated Canvas2D element.

## Corrected diagnosis

The previous pass made the canvas element's CSS background opaque, but the background and dynamic bitmap still shared one composited element. Computed CSS samples can remain constant while the browser replaces that element's canvas surface during high-frequency redraws. The user's clarification confirms that the backing circle itself still flickers, so style stability on the same canvas is insufficient evidence.

## Behavior contract

- Render the 70px circular backing as a dedicated, pointer-inert DOM sibling at bottom 16px / left 16px.
- Render the transparent 140×140-backing Canvas2D axes surface as a separate sibling immediately above it.
- Keep both layers at the same 70×70 CSS bounds without layout movement.
- Keep all pointer capture and `data-toolcraft-canvas-handle` semantics on the Canvas2D layer.
- Keep dark/light backing colors fully opaque.
- Preserve click snap, direct point tracking, hover, history, reset, export exclusion, and `view.orbit` behavior.

## Implementation

1. Update `src/app/renderer/orientation-gizmo-control.tsx` to portal two sibling layers: a stable circle backing and the existing transparent interactive canvas.
2. Update `e2e/app-controls.spec.ts` to measure both layers, require identical bounds, require a transparent canvas background plus opaque backing, and assert the backing remains unchanged across drag.
3. Update acceptance metadata and `docs/toolcraft/agent-worklog.md` with the corrected diagnosis and evidence.

## Verification note

Verification tier: Tier 3
Reason: This changes the compositing structure of a high-frequency custom canvas handle while leaving runtime state shape and the product WebGL renderer unchanged.
Run: `npm run ai:check`, `npm run verify:quick`, focused camera/effects browser acceptance, targeted `browser perf: view.orbit remains responsive`, and controlled-browser slow-drag sampling of sibling identity, bounds, opacity, and canvas transparency.
Skip: `npm run verify:final` and the full performance checkpoint are not required for this post-first-working visual regression correction; exports, media, dependencies, Toolcraft runtime architecture, and unrelated renderer workloads are unchanged.
