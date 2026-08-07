# Zoom Source Dirty Rect Design

Verification tier: Tier 3
Reason: Fixes a custom WebGL renderer dirty-rect bug triggered by runtime viewport zoom and adds browser coverage for uploaded source pixels across zoom.
Run: `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm verify:quick`, targeted browser acceptance for toolbar viewport/source zoom, and targeted browser performance for viewport zoom stress.
Skip: Full `pnpm verify:perf` is not required because this is a focused viewport/render bug, not the first product delivery or an explicit performance complaint.

## Goal

Zooming the Toolcraft canvas viewport must not make the uploaded source/background image look cropped or transparent. Product pixels should remain the same; only the viewport transform should change.

## Root Cause

`LiquidGlassWebGLRenderer.render` clears the whole default framebuffer on every render:

```ts
gl.clearColor(0, 0, 0, 0);
gl.clear(gl.COLOR_BUFFER_BIT);
```

After a zoom command, Toolcraft changes `state.canvas.zoom`, which causes the app renderer to run again even though source pixels are unchanged. The dirty-rect path then restores only the union of the previous/current lens bounds. Because the whole framebuffer was cleared first, every pixel outside that dirty rect becomes transparent.

## Renderer

Remove the unconditional full-canvas clear from the WebGL render path. Full redraws already blit the entire source texture. Partial redraws should preserve existing framebuffer pixels outside the dirty rect and restore the source texture only under the dirty rect before drawing the lens.

## Acceptance

Extend the toolbar viewport browser test with an uploaded portrait source fixture. The test samples a known background-bar pixel and a source-image pixel before and after Zoom in/out/center/drag. The sampled product pixels must remain stable and non-transparent.

## Performance

Keep existing viewport-zoom-stress coverage. Removing the extra full clear should not increase workload; targeted zoom perf is still run because the changed path is viewport zoom.

## Risks

The fix relies on the existing `preserveDrawingBuffer: true` preview context, which the app already uses for observable checks and dirty-rect rendering. If that setting changes later, dirty-rect rendering must be revisited.
