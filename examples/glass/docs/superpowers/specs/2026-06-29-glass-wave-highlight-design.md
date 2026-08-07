# Glass Wave Highlight Design

## Verification Note

Verification tier: Tier 3
Reason: Adds animated WebGL shader behavior, schema controls, acceptance/performance coverage, and preview scheduling for a custom canvas renderer without changing Toolcraft runtime or export architecture.
Run: `pnpm verify:quick`, targeted browser acceptance for wave controls/animation, and targeted browser perf for wave sliders/animation.
Skip: Full final gate and full performance suite unless targeted checks expose broader renderer regressions; no dependencies or lockfile changes.

## Product Intent

Add a glass-local wave highlight similar to the provided reference image: a glossy dark upper lens, a bright horizontal caustic band, subtle RGB fringe, and soft curved white wave lines inside the existing glass shape.

## Animation Intent Inventory

- Mode: decorative preview drift inside the glass shader.
- Transport: no user-facing timeline, play/pause, scrub, loop, duration, or export-at-time controls.
- Output: PNG export renders a deterministic static wave phase so exported bytes are stable.
- Interaction policy: wave animation is non-essential; renderer skips wave rAF frames while pointer interactions, canvas drag, or scheduled state renders are active, then resumes from wall-clock time without changing user settings.

## Control Section Inventory

- `Wave Highlight`: owns the glass-local caustic/wave effect.
  - `Include` toggles the wave shader branch.
  - `Drift` enables preview movement only.
  - `Intensity`, `Position`, `Width`, `Frequency`, and `Speed` tune the caustic band and animation.

## Renderer Decision

Wave parameters are shader uniforms in the `lens-composite` pass. They do not rebuild the source frame, texture frame, text frame, displacement map, or frost prepass. The animation loop updates `timeSeconds` and reuses the existing WebGL runtime caches.

## State Mapping

`glass.wave.*` schema targets normalize through `getLiquidGlassSettings`. `LiquidGlassRenderRuntime` maps them to `LiquidGlassLensDescriptor` fields and computes `wavePhase` from `timeSeconds * speed` only when preview motion is enabled. Export does not pass time, so it uses phase 0.
