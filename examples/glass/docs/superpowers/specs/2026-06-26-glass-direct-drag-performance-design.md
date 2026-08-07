# Glass Direct Drag Performance Design

## Request

The glass should drag immediately when the user grabs the glass itself. The circular point is not needed. Drag performance should be optimized so the glass does not lag.

## Root Cause

The previous implementation made the visual center pin the obvious drag affordance and routed every movement through `controls.setValue`. Preview then waited for Toolcraft state, React render, and a scheduled renderer update. Even with source/map caches, the frame was one or more runtime updates behind the pointer.

## Design

The visible circular pin is removed. The existing transparent hit zone remains aligned to the resolved glass geometry, so the user grabs the glass shape directly. It is not product output, contains no text, and remains excluded from export.

During pointer movement, preview rendering no longer waits for runtime state. Pointer deltas update a local normalized center, and the renderer receives an immediate rAF-coalesced render using the cached source frame, texture frame, frost prepass, and displacement map. After each coalesced preview frame, runtime `glass.center` is committed through merged Toolcraft history so the Center setting updates while the pointer is still down; pointer end keeps a final commit as a safety net for persistence, reset, settings transfer, undo history, and export.

## Verification

Verification tier: Tier 3

Reason: This changes a custom canvas interaction, WebGL preview scheduling, the acceptance row for direct manipulation, and the mask-drag performance path. The user explicitly complained about lag, so a full performance checkpoint is required after targeted checks.

Run:

- `pnpm verify:quick`
- targeted browser acceptance for direct glass drag and export cleanliness
- targeted browser performance for `glass-center-canvas-drag`
- `pnpm verify:perf`

Skip:

- `pnpm install`, because dependencies and lockfile are unchanged.
