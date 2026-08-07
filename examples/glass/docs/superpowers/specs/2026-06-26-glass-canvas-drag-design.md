# Liquid Glass Canvas Drag Spec

## Request

Let the user press the glass on the canvas and freely move it, while checking performance.

## Product Behavior

- The visible glass lens is directly draggable on the Toolcraft canvas.
- Dragging writes the existing `glass.center` runtime value, so the vector control, reset, persistence, settings transfer, undo/redo history, export, and renderer all keep one source of truth.
- A canvas handle sits exactly over the resolved glass geometry. It has no text and no app UI controls inside the product output.
- Pointer down on the handle stops canvas viewport panning; pointer down outside the lens keeps normal Toolcraft canvas drag/zoom behavior.
- The handle follows shape, width, height, radius, and center changes.
- PNG/JPG export remains clean product output and does not include the handle overlay.

## Renderer And Performance

- Renderer technique remains WebGL pixel output.
- Direct lens drag should render live by coalescing to frame cadence during drag.
- Source texture redraw is cached by source/background/size settings so center-only movement does not redraw the procedural or uploaded source texture on each pointer move.
- The displacement map cache remains keyed to geometry and optical settings; center movement does not regenerate the map.

## Acceptance

- Add a `canvas-handle` acceptance entity for the glass center handle.
- Browser coverage drags the declared handle with `dragCanvasHandle`, verifies product pixels change, checks no forbidden app UI in canvas, checks Toolcraft handle visual language, and verifies export excludes handles.

## Verification Note

Verification tier: Tier 3

Reason: Custom renderer/canvas interaction plus performance-sensitive drag behavior.

Run: `pnpm verify:quick`, targeted browser acceptance for canvas handle drag/export cleanliness, and targeted perf scenario for `glass.center` canvas drag. Because the user explicitly requested performance checking, run the full perf gate after targeted fixes if feasible.

Skip: `pnpm install` because dependencies and lockfile are unchanged.
