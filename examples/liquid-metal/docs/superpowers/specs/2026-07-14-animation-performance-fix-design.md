# Liquid Metal animation performance fix

## Goal

Restore a visibly smooth full-quality animated preview for the authored default
scene without lowering the selected render scale, changing shader appearance,
removing stickers, or changing export output.

## Diagnosed behavior

- The real `1920x1080` scene at render scale `2` advances at roughly 20
  product frames per second with ten stickers.
- Removing all stickers while preserving the model, scratch mask, shader, and
  `3840x2160` backing leaves the cadence at roughly 20 fps.
- Sticker projection is invalidated only by sticker/model changes; it is not
  rebuilt by timeline frames.
- The preview loop compares a 60 Hz `requestAnimationFrame` timestamp against
  an exact `1000 / 30` threshold and assigns `lastRenderAt = now`. Near the
  threshold this can skip every second eligible callback and settle near 20
  fps instead of the intended 30 fps.
- `preserveDrawingBuffer: true` is required by the current cross-frame scissor
  path. It cannot be disabled while partial sticker redraw remains enabled,
  because default-framebuffer pixels outside the scissor are not guaranteed to
  survive browser compositing.

## Product decisions

- Keep the existing Toolcraft playback timeline, canvas size, render scale,
  controls, media defaults, sticker arrangement, layers policy, persistence,
  image export, and video export unchanged.
- Keep the persistent Three.js preview renderer and current scissored sticker
  interaction for the first pass.
- Replace the lossy last-render timestamp throttle with a deadline-based 30 fps
  scheduler. The scheduler carries its ideal deadline forward, tolerates small
  display-timestamp jitter, skips missed deadlines without burst rendering,
  and retimes explicitly when viewport interaction switches between the normal
  30 fps interval and the 120 ms interaction interval.
- Add pure scheduler tests for 60 Hz cadence, missed frames, long tab gaps, and
  interaction retiming.
- Change the animation performance browser probe to observe actual
  `data-liquid-metal-surface-frame` progress. Generic browser rAF callbacks are
  not evidence that the WebGL product rendered.
- Add a real authored-default-scene animation scenario with `A.obj`, the real
  scratch mask, ten stickers, `1920x1080`, and render scale `2`.
- Only replace the drawing-buffer/scissor strategy if the scheduler correction
  does not meet the real-scene checkpoint. The safe fallback is full-frame
  sticker interaction with `preserveDrawingBuffer: false`; the preferred
  longer-term retained-region strategy is an explicit render target, not an
  undefined default framebuffer.

## Control Section Inventory

No control sections change. Setup, Model, Model Size, Scratch Mask, Surface
Scratches, Stickers, Sticker Transform, Presets, Metal Color, Metal Pattern,
Projection, Offset, Environment, Background, Image Export, and Video Export
retain their current targets and grouping.

## Animation intent

The app remains a seamless forward playback-timeline product. The preview
scheduler only decides when to draw the current runtime timeline frame; it does
not change play/pause, scrub, duration, loop phase, or export timing.

## Verification tier

Verification tier: Tier 3

Reason: The change affects the custom WebGL animation loop, viewport
interaction throttle, and performance coverage, but does not change shared
Toolcraft runtime architecture or product controls.

Run: focused scheduler tests, renderer-source tests, `npm run verify:quick`,
targeted animation/default-scene/viewport/sticker performance scenarios, real
agent-browser measurement of actual product frames, and the full performance
checkpoint required by the explicit lag-fix request.

Skip: no quality, export, schema, layer, or persistence behavior may be skipped;
unchanged broad functional export scenarios only need rerun if renderer output
or context strategy changes.

