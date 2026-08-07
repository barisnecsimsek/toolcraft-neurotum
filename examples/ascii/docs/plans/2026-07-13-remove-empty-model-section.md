# Remove Empty Model Section

## Goal

Remove the empty `Model` controls-panel section while preserving 3D upload, the viewport-fixed orientation gizmo, runtime-backed `view.orbit`, undo/history, reset, preview, and export behavior.

## Implementation

1. Update `src/app/app-schema.ts` so the file upload and orientation custom control remain in one explicitly standalone `3D model` section instead of being normalized into separate `3D model` and `Model` sections.
2. Update `src/app/acceptance/defaults.ts` so the Control Section Inventory describes the combined source-and-view workflow.
3. Update schema and browser assertions that currently target the removed `Model` section reset.
4. Record the decision and verification in `docs/toolcraft/agent-worklog.md`.

## Unchanged Surfaces

- The orientation gizmo renderer and camera math.
- Canvas placement, left-button orbit, axis dragging, and click snapping.
- Renderer, effects, export, media formats, timeline, layers, persistence, and settings transfer.

## Verification

Verification tier: Tier 2

Reason: controls-panel section normalization and reset grouping change, with no renderer or interaction-workload change.

Run:

- Focused schema and acceptance tests.
- `npm run verify:quick`.
- Focused Playwright camera/gizmo acceptance.
- Controlled-browser check that `3D model` remains visible, `Model` is absent, the gizmo remains visible, reset works, and the console has no errors.

Skip:

- Full performance and final gates because this is a post-first-working panel grouping fix that does not change renderer workload, viewport interaction math, export, dependencies, or runtime source.
