# Image Slab Source Implementation Plan

## Product behavior

- Add a `Source` mode selector with `3D` and `Image` branches.
- Keep the current GLB/OBJ/STL flow unchanged in `3D` mode.
- In `Image` mode, accept one PNG, JPEG, WebP, or AVIF and build a centered volumetric rounded rectangular slab whose front and back display the uploaded image at its transformed aspect ratio.
- Expose `Thickness` and `Bevel` sliders only in `Image` mode. Thickness controls real Z depth. Bevel controls a real rounded-box radius clamped below half of the shortest slab dimension, so the mesh cannot self-intersect.
- Consume Toolcraft-owned rotate and flip media transforms when baking the image texture and geometry aspect ratio.
- Feed the generated slab through the same thaw mask, PBR ice shell, crystal/icicle sampling, model orbit, hit testing, preview, and still export paths as uploaded 3D models.
- Preserve the neutral empty canvas when the selected source branch has no upload. Do not add layers or timeline.

## Control section inventory

- `Source`: `source.mode`, conditional `source.model`, conditional `source.image`, conditional `source.imageThickness`, and conditional `source.imageBevel`. These targets jointly choose and construct the active source object.
- Existing Thaw Front, Ice Geometry, Ice Surface, Material Mask, Surface Relief, Lighting, Background, and Image Export sections remain semantically unchanged.

## Implementation

1. Update `src/app/frozen/frozen-controls.ts` with built-in segmented, fileDrop, and slider controls plus typed `visibleWhen` conditions.
2. Add `src/app/frozen/frozen-image-model.ts` to decode and bound the source image, bake Toolcraft rotate/flip transforms, create a six-material `RoundedBoxGeometry`, and prepare it through the shared source-normalization/sampling path.
3. Refactor `src/app/frozen/frozen-model.ts` just enough to expose a shared prepared-object function and dispose source textures safely.
4. Extend `src/app/frozen/frozen-values.ts` with bounded source-mode and image-geometry readers.
5. Update `src/app/frozen/frozen-output.tsx` to prepare both source branches independently, select only the active branch, expose image geometry observables, and preserve renderer/export/orbit behavior.
6. Extend `src/app/app-renderer-pipeline.ts` with bounded image decode and fixed-cost image geometry preparation passes and exact invalidation for image upload, mode, thickness, bevel, and media transforms.
7. Update `src/app/app-performance.ts`, `src/app/app-performance-impact.json`, and browser fixture adapters for the bounded source-image pixel workload and the two new geometry-response controls.
8. Update `src/app/app-acceptance-data.ts`, focused product tests, Playwright helpers/specs, and `docs/toolcraft/agent-worklog.md` for mode visibility, image media lifecycle/transform behavior, thickness, bevel, rendered pixels, and existing 3D regression coverage.

## Verification tier

Verification tier: Tier 3

Reason: this changes media upload routing, prepared 3D geometry, WebGL renderer invalidation, source texture lifetime, hit testing, and export-visible canvas output.

Run: focused Vitest for schema, geometry math, texture transform, pipeline assessment, acceptance, and impact inventory; `npm run verify:quick`; exact browser tests for 3D/Image conditional visibility, image upload/remove/reset, rotate/flip, thickness, bevel, orbit, and rendered output; targeted image-import and image-geometry performance paths; direct integrity check; production build; keep the existing dev server available.

Skip: no timeline/layer/video checks because this remains a single-source still product; no full performance refresh because this is a later feature iteration rather than a first-stable milestone or an explicit performance request.

