# Orientation Gizmo And Camera Orbit Parity

## Product decision

Replace the Model-section vector pad and mesh Euler rotation with a screen-fixed orientation gizmo and camera-orbit state. The renderer keeps the existing Toolcraft shell, upload flow, effects, sizing, background, and export behavior. No timeline or layers are added.

The product source of truth is `view.orbit`, represented by the camera position and up vector around the origin. Preview, PNG export, reset, settings transfer, the main-canvas gesture, and the orientation gizmo all read or write the same runtime target.

## Reference evidence

The live reference bundles and runtime were inspected together with the supplied 270×260 @2x still. The reference rotates its perspective camera around the origin; it does not rotate the model root. Its main gesture is OrbitControls-style left drag with `rotateSpeed = 0.5`. The orientation widget is an independent Canvas2D surface.

Exact widget contract:

- 70×70 CSS pixels and 140×140 backing pixels at DPR 2.
- Black circular background at 0.8 alpha.
- Center `(35, 35)`, reach `24.5`, endpoint radius `5.6`, positive-axis line width `2.1` CSS pixels.
- X `#ff215e`, Y `#53ff55`, Z `#3b69ff`.
- Front alpha `0.95`, rear alpha `0.3`, axes depth-sorted rear to front.
- Hover radius `7.28` with a 1px translucent-white outline.
- Click an endpoint to animate to its orthographic axis view over 600ms with quadratic ease-in-out and preserved orbit radius.
- Drag an endpoint to apply the source axis-constrained camera rotation.
- Product override: place the widget 16px from the viewport left and bottom edges instead of centered.

## Control selection

The Model workflow still owns source upload and view orientation. The built-in `vector` control was checked and rejected for orientation: it exposes a direct two-number panel editor, but cannot express a six-axis screen projection, camera up-vector roll, axis snap, or a viewport-fixed editing handle. A custom `orientationGizmo` schema control is therefore the smallest sufficient control. Its renderer portals only the editing handle into the Toolcraft canvas viewport and renders no duplicate panel UI.

The custom control uses Toolcraft runtime value/history/reset semantics, kit visual tokens where applicable, `data-toolcraft-canvas-handle`, and export-exclusion coverage. It does not render product output and remains fixed while the canvas world pans or zooms.

## Interaction mapping

- Plain left drag on the product WebGL canvas: orbit the camera around the origin, stop propagation to the Toolcraft viewport, preserve radius, and merge updates within one history gesture.
- Modifier + left drag outside or over the product surface: leave the Toolcraft viewport gesture available.
- Middle drag: no camera rotation.
- Left drag outside the product WebGL surface: retain Toolcraft pan.
- Gizmo hover: enlarge the nearest endpoint.
- Gizmo click: 600ms camera snap.
- Gizmo drag: constrained camera rotation for the selected ±X/±Y/±Z axis.
- Model-section reset and global reset: restore the default camera pose.

## Renderer pipeline

`view.orbit` invalidates the cached scene raster and downstream effects composite, but it does not invalidate model normalization or environment decoding. The engine applies the camera pose before scene rasterization and leaves the model transform unchanged. The widget is a lightweight main-thread Canvas2D editing-handle pass and is excluded from PNG export.

## Acceptance

- Widget backing/CSS size, colors, placement, front/rear projection, hover styling, snap duration, and axis drag match the inspected source.
- Main-canvas left drag changes `view.orbit` and product output without panning the canvas world.
- Middle drag does not change `view.orbit`; left drag outside the product surface still pans the canvas world.
- Camera radius is preserved and reset restores the schema default.
- Preview and export share the same camera pose; export contains no widget pixels.
- The handle remains 16px from the viewport left/bottom after canvas pan and zoom.
- WebGL reports no errors.

## Verification note

Verification tier: Tier 4

Reason: this pass replaces a product control and broad renderer interaction, changes scene-cache invalidation and camera semantics, adds a custom canvas handle, and neutralizes implementation identifiers across renderer/test surfaces.

Run: `npm run ai:check`; focused unit tests for pose math, state mapping, renderer pipeline, acceptance, and custom-control wiring; `npm run verify:quick`; focused controlled-browser checks for layout/interaction/reset/export/WebGL; the targeted `control-drag` workload scenario for `view.orbit`; `npm run verify:final`; verify or restart the saved dev URL.

Skip: the full browser performance checkpoint is not required because this is a post-first-working feature pass and the user did not request performance optimization in this turn. The touched live-drag workload receives its targeted performance scenario and browser budget instead.
