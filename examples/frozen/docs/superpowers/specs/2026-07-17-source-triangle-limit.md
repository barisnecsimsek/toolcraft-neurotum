# 30,000-triangle source boundary

## Goal

Allow supported GLB, OBJ, and STL sources with up to 30,000 triangles to enter
the existing retained WebGL workflow unchanged. The supplied
`local-reference://desktop/Nigt king.obj` has 8,550 triangles and must load as a
ready model instead of being rejected by the old 3,000-triangle guard.

## Product behavior

- `source.model` accepts geometry from 1 through 30,000 triangles.
- Geometry above 30,000 triangles still fails before normalization and surface
  sampling with an error that reports the actual count and the 30,000 limit.
- No automatic simplification, silent quality reduction, or render-scale clamp.
- OBJ material fallback remains unchanged; a missing `.mtl` does not block OBJ
  geometry because the app assigns its own PBR source material.
- Media UI, canvas empty state, controls, Melt Brush, export, persistence,
  timeline, and layers remain unchanged.

## Performance model

- `source-triangles` remains the enforced external-input dimension used by
  `model-prepare`, preview, camera, Melt Brush projection, and export paths.
- Its interactive and batch maximum becomes exactly 30,000 through the exported
  runtime guard already consumed by `app-performance.ts` and browser fixtures.
- Surface crystal and icicle pools remain independently capped at 48,000 and
  12,000; increasing source triangles does not multiply those caps.
- Source preparation remains discrete and memoized for the active source.
- The projected Melt Brush triangle cache remains source- and camera-keyed.

## Acceptance

- A generated 8,550-triangle fixture loads through the real file control and
  reports ready with the exact triangle count.
- A 30,001-triangle object is rejected by the guard before expensive sampling.
- The workload envelope and maximum fixture resolve to 30,000.
- The supplied Night King OBJ loads in the running app with 8,550 triangles.
- Existing small OBJ upload and source clear/reset behavior do not regress.

## Verification tier

Verification tier: Tier 3

Reason: the change expands the external model workload boundary and affects
media import, model preparation, preview/camera rendering, Melt Brush projection,
and export workload coverage.

Run: focused model-boundary unit tests; exact real-browser 8,550-triangle upload;
existing source media lifecycle; typecheck; render-plan/performance gates;
current-source kernel benchmark; targeted model-import, preview, orbit, brush,
and export performance paths; `npm run verify:quick`; direct integrity.

Skip: full performance refresh because this is a later product capability change,
not a request to optimize performance, and the protected first-stable baseline is
already a separately recorded blocker.
