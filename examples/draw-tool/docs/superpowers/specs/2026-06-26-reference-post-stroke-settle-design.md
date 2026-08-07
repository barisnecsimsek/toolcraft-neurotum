# Reference Post-Stroke Settle Design

## Goal

Make post-stroke ink settling closer to the inspected reference: after pointer release, run the real fluid solver for a short wetness-based window, then freeze the painting so hover and stale velocity cannot keep moving pigment.

## Root Cause

The current app uses `previewWetStep()` for ordinary post-release drying. That pass advects dye through the existing velocity field without curl, divergence, pressure projection, gradient subtraction, or velocity advection/dissipation. The reference does not have this separate dye-only settle path; its animation loop calls full `step(dt)` every frame. The local shortcut explains the visible swirl-like motion because pigment can be dragged by an old, unprojected velocity field after the stroke ends.

## Design

Keep `previewWetStep()` only for the held-pointer path, where performance matters most and the user needs immediate wet feedback while drawing. On `pointerup`, restart the wetness-based `dryingUntil` window so release always receives a true post-stroke settle even if the pointer was held still for a while. During that bounded window, run full `step(dt)`, including pressure/vorticity/advection. Shorten the wetness-based drying window to several hundred milliseconds so the release path does not return to the older laggy multi-second phase. When the window expires, call `freezeSettledInk()` to clear velocity and pressure while preserving dye.

Do not change shader math, dye resolution, render scale, or export behavior. This fix changes scheduler behavior, not output quality.

## Verification

Verification tier: Tier 3
Reason: Custom WebGL renderer loop and post-release workload change; the touched path is performance-sensitive and reference-fidelity-sensitive.
Run: direct AI/docs/integrity/script checks, TypeScript, Vitest, Vite build, focused browser checks for held spread, post-release full settle, dry freeze, hover stability, and targeted heavy pointer-up performance.
Skip: full `pnpm verify:perf` during the loop because `pnpm exec` currently fails on ignored `esbuild@0.28.1`; use direct binaries and targeted browser measurements instead.
