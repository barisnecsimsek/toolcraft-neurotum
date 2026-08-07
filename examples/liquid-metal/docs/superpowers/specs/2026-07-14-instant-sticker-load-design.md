# Instant Sticker Load Design

## Goal

Make the authored ten-sticker default stack and multi-sticker imports appear as soon as the model is ready, without reducing PNG resolution, decal geometry quality, render scale, or export fidelity.

## Measured Root Cause

An agent-browser cold navigation on the authored default scene measured:

- model ready: about `1.29 s` after navigation;
- first sticker rendered: about `1.54 s`;
- all ten stickers rendered: about `2.71 s`;
- model-ready to ten-sticker-ready delta: about `1.42 s`.

Instrumented `fetch` and `createImageBitmap` calls showed that every default PNG fetch and decode starts only after the previous decode completes. Individual PNG decodes take roughly `58–141 ms`; the final ten-decal projection/render step is about `90 ms`. Network transfer is already locally cached and is not the bottleneck.

## Product Behavior

- Decode every newly attached sticker concurrently.
- Keep installation atomic: preserve runtime media order and add the decoded batch only when every requested texture is ready.
- Cancel stale batches by the existing load-version token.
- Dispose every fulfilled texture when a batch becomes stale or any peer decode fails.
- Keep the existing full-resolution `ImageBitmap`, physical sticker material, wrapped surface geometry, direct manipulation, preview, PNG, and video paths unchanged.
- Keep existing stickers mounted while only new stickers are decoding.

## Control Section Inventory

No control, section, target, grouping, panel, timeline, layer, persistence, settings-transfer, or export behavior changes. The existing `Stickers` section continues to own `media.stickers`, `stickers.scale`, and `stickers.rotation`.

## Renderer Pipeline

`sticker-decode` remains a cached main-thread decode pass, but independent sticker assets are scheduled concurrently instead of serially. `sticker-decal-project` remains one full-quality wrapped-geometry build per changed placement, and `three-surface-composite` remains the shared preview/export composite.

## Acceptance

- Clean load still resolves all ten authored default stickers at their existing placements, scales, transforms, and order.
- Agent-browser before/after measurement uses the same default model, scratch mask, ten PNGs, 3840×2160 backing, and exact orbit.
- Existing authored-default acceptance proves the complete visible stack, and the animation/viewport paths keep their existing quality and cadence.

## Verification Tier

Verification tier: Tier 3

Reason: Sticker media decode scheduling and visible renderer readiness change, but runtime state shape, controls, geometry fidelity, render scale, and export output do not.

Run: focused sticker/source tests, TypeScript, `npm run verify:quick`, authored-default browser acceptance, and an agent-browser before/after measurement.

Skip: After seeing the parallel-decode result, the user confirmed the current speed is sufficient and explicitly asked for a lightweight correctness check instead of deeper performance analysis. Do not widen the workload or run the full checkpoint in this pass.
