# Sticker topology conditioning implementation plan

Verification tier: Tier 3

Reason: The cached model preprocessing and sticker vector-build renderer path
change for preview and isolated exports. Schema, controls, dependencies,
Toolcraft runtime, media state, timeline, layers, and export formats are
unchanged.

Run: `npm run ai:check`; focused sticker geometry/source tests; exact `A.obj`
topology diagnostic; `npm run typecheck`; `npm run verify:quick`; connected
hard-edge browser acceptance; exact `A.obj` plus supplied PNG in the controlled
browser; targeted sticker scale, rotation, and surface-drag performance checks;
saved-server identity verification.

Skip: `npm run verify:final` and the full performance checkpoint because this is
a post-first-working focused renderer correction. The changed topology build and
all affected high-frequency sticker interactions receive targeted coverage.

## Tasks

1. Split the dimensionally unrelated tolerances in
   `src/app/liquid-metal-sticker-geometry.ts` and add a relative triangle-area
   degeneracy check based on the longest edge.
2. Preserve the existing render mesh and quantized sticker-only position weld;
   keep true boundary and non-manifold rules unchanged.
3. Add unit regressions in `src/app/liquid-metal-sticker-geometry.test.ts` for a
   uniformly small valid folded surface and a truly collinear triangle.
4. Strengthen the deterministic folded OBJ browser fixture with a very narrow
   valid bevel so the browser regression exercises the former absolute cutoff.
5. Verify the exact external `A.obj` topology and the supplied sticker pixels in
   the local app without adding user files to the repository.
6. Record the root cause, decisions, checks, and residual topology limits in
   `docs/toolcraft/agent-worklog.md`.
