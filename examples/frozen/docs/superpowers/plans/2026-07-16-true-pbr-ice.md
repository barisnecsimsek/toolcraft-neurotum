# True PBR Ice Implementation Plan

## Product decision

- Replace the current opacity-based ice approximation with Three.js physically based transmission.
- Keep the selected x2 preview backing and use a full-resolution transmission pre-pass.
- Reuse the existing optional grayscale scratch upload; no source texture is required for the default procedural material.
- Keep the current Ice Surface, Ice Geometry, Surface Relief, and Lighting control sections. No new control is needed because Transmission, IOR, Roughness, Shell thickness, HDR intensity, and HDR rotation already own the requested behavior.
- Keep the still-image export, no timeline, no layers, existing persistence, and settings transfer unchanged.

## Runtime and renderer mapping

1. In `src/app/frozen/frozen-material.ts`, map `ice.transmission` to `MeshPhysicalMaterial.transmission`, keep opacity at one, preserve physical reflections, enable volume thickness/attenuation, and remove the alpha-matcap fallback.
2. Keep the uploaded source mesh rendered beneath the masked ice shell so the transmission pass has real object detail to refract instead of sampling only the flat background.
3. In `src/app/frozen/frozen-scene.ts`, explicitly keep the Three.js transmission render target at full resolution and expose renderer status for focused diagnostics.
4. In `src/app/app-renderer-pipeline.ts`, `src/app/app-performance.ts`, and the fixture adapter, classify transmission as a schema-backed workload boundary because any non-zero physical transmission activates an additional full-resolution scene pass.
5. In product unit and browser tests, prove the material receives real transmission and that transmission plus HDR rotation change rendered pixels while x2 backing remains intact.
6. Record the material decision, evidence, verification, and maximum-fixture risk in `docs/toolcraft/agent-worklog.md`.

## Verification

Verification tier: Tier 3

Reason: a physical material feature changes the WebGL preview/export pass cost and visible output, but schema, media flow, timeline, layers, persistence, and runtime boundaries remain unchanged.

Run:

- `npm run typecheck`;
- focused material, renderer, schema, and performance Vitest cases;
- exact Chromium physical-ice and transmission acceptance;
- `npm run verify:quick`;
- protected kernel verification if its source receipt becomes stale;
- targeted preview/control-drag and image-export performance scenarios required by the impact inventory;
- direct Toolcraft integrity check;
- real local browser inspection at x2 backing.

Skip:

- full performance checkpoint because this is a later visual feature pass, not a request to optimize performance;
- unrelated media-format, timeline, layer, and video scenarios.
