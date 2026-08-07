# Orientation-gizmo boundary stability implementation plan

Verification tier: Tier 3

Reason: This changes high-frequency camera math and the Canvas2D editing-handle
output on the `view.orbit` renderer path. Schema shape, renderer architecture,
dependencies, timeline, layers, media, and export formats are unchanged.

Run: focused orbit unit tests; `npm run typecheck`; `npm run verify:quick`;
focused canvas/timeline/orbit Playwright acceptance; targeted
`browser perf: view.orbit remains responsive`; controlled-browser boundary drag
and console verification.

Skip: `npm run verify:final` and the full performance checkpoint because this
is a post-first-working, narrowly scoped visual interaction correction. The
directly affected functional and performance paths receive targeted coverage.

## Tasks

1. Update `src/app/liquid-metal-orbit.ts` to preserve a minimum signed local Z
   magnitude and clamp radial length consistently with the updated ASCII source.
2. Extend `src/app/liquid-metal-orbit.test.ts` with repeated boundary projection
   checks for both captured hemispheres.
3. Extend `e2e/app-controls.spec.ts` with held-point alpha sampling at the real
   sphere boundary before the existing snap/direct-drag assertions.
4. Align acceptance and performance wording with stable boundary behavior.
5. Record diagnosis, implementation evidence, verification, and remaining risk
   in `docs/toolcraft/agent-worklog.md`.
6. Run the Tier 3 verification set and inspect the live app in a real browser.
