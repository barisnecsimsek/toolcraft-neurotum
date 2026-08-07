# Interactive Melt Brush Design

## User outcome

When **Melt brush** is enabled, dragging on the uploaded object deposits heat into the frozen surface instead of orbiting the model. The object pose stays fixed, the brush follows actual visible geometry, and the heated region melts with a clean core, a translucent irregular thermal edge, and optional gradual refreezing. Disabling the mode returns the normal model-orbit interaction without changing the current melt result.

## Video Reference Study

### Reference location

`local-reference://captures/CleanShot 2026-07-16 at 18.55.45.mp4`

### Extraction evidence

`ffprobe` reported H.264, 4096×2078, 6.733 seconds, 378 frames, nominal 60 fps and average 56 fps. The reference was inspected as:

- a 4×4 contact sheet sampled at 2.5 fps;
- a center crop sampled at 5 fps and tiled 6×6 to compare consecutive 0.2-second states;
- individual 2048-pixel-wide frames sampled at 2.5 fps for edge-detail inspection.

Temporary extraction output: `/tmp/frozen-melt-study/contact-sheet.jpg`, `/tmp/frozen-melt-study/temporal-sheet.jpg`, and `/tmp/frozen-melt-study/frame-01.jpg` through `frame-17.jpg`.

### Storyboard

| Frame | Time | Visible state | Behavior observation |
| --- | ---: | --- | --- |
| `reference-rest` | 0.0 s | Almost the entire viewport is covered by pale blue frost. A previous central mark is only faintly translucent. | Untouched regions are opaque/frosted; old heat is already decaying instead of leaving a permanent binary hole. |
| `reference-first-contact` | 1.0 s | New dark, high-contrast openings appear near the upper form and lower-left area. | Contact raises local temperature quickly; the first response is concentrated and much clearer than the surrounding halo. |
| `reference-peak-open` | 1.4 s | The upper panel is broadly readable. The revealed core has broken, speckled boundaries and a wide misty transition. | Heat accumulates across overlapping samples. The melt is multi-scale: clean core, granular breakup, soft low-temperature halo. |
| `reference-cooling` | 2.4 s | Previously open areas become hazier and smaller without new input. | The mask evolves after pointer release. Temperature diffuses slightly and then cools, causing partial refreezing rather than an instantaneous reset. |
| `reference-second-stroke` | 3.6 s | A new lower sweep begins while the older upper reveal continues to soften. | Heat fields are spatially local and additive; a new stroke does not reset older thermal history. |
| `reference-second-peak` | 4.4 s | The lower button becomes cleanly visible with ragged ice islands and a broad translucent edge. | Repeated passes cross a melt threshold, producing a clearer core and structural fragmentation at the boundary. |
| `reference-refrozen` | 6.2 s | Both revealed regions have substantially closed; only a muted, granular trace remains. | Cooling persists for multiple seconds and asymptotically restores ice. The effect is temporal, not a paint-only alpha mask. |

### Transition analysis

1. `reference-rest` → `reference-first-contact`: pointer input deposits local energy and immediately opens small high-temperature cores; untouched ice remains unchanged.
2. `reference-first-contact` → `reference-peak-open`: overlapping pointer samples accumulate rather than overwrite, expanding the opening and increasing clarity. The transition edge stays noisy and spatially heterogeneous.
3. `reference-peak-open` → `reference-cooling`: after input stops, the clean core contracts while the diffuse halo lingers, proving separate melt threshold and cooling/diffusion behavior.
4. `reference-cooling` → `reference-second-stroke`: a new spatially separate heat trail appears while the first trail keeps cooling; thermal state is persistent and local.
5. `reference-second-stroke` → `reference-second-peak`: repeated passes produce a nonlinear threshold crossing, clearer source reveal, and broken frozen islands.
6. `reference-second-peak` → `reference-refrozen`: temperature decays over seconds and the frozen mask returns progressively; there is no abrupt frame reset or reverse playback.

### Behavior decomposition

- Pointer ownership is chosen on pointer-down. A primary hit on visible source geometry starts melt painting; a miss remains available to the Toolcraft canvas.
- While Melt brush is active, source/model orbit is unavailable and the orientation gizmo is hidden, so the model cannot move under the brush.
- Pointer raycasts produce effect-space contact positions on arbitrary uploaded geometry.
- A bounded 3D temperature field stores accumulated heat. Brush samples are interpolated along the drag path to prevent gaps.
- Heat changes deposited energy, the effective melt radius, and how completely frozen structure collapses.
- Radius changes the base world-space brush footprint.
- Structure changes multi-scale irregularity at the melt threshold; the result must not be a perfect circular alpha cutout.
- Refreeze changes the cooling rate. Zero preserves the painted melt; positive values diffuse and cool the field over time.
- The shader combines the original top-down thaw field with the local temperature field, so the brush removes retained shell/crystal/icicle ice without breaking the existing global mask.
- The interaction cursor is a textless, non-exported product editing handle. It previews the geometry hit and footprint.
- Refreeze clears only the local temperature field and leaves model, material, and global thaw controls untouched.

### Acceptance mapping

| Reference behavior | Acceptance id | Frames |
| --- | --- | --- |
| Toggle claims model hits for painting and locks orbit | `melt.enabled` | `reference-first-contact`, `reference-second-stroke` |
| Drag deposits continuous local heat with accumulated, irregular reveal | `melt.paint` | `reference-first-contact`, `reference-peak-open`, `reference-second-peak` |
| Heat and radius change footprint and reveal strength | `melt.heat-radius` | `reference-first-contact`, `reference-peak-open` |
| Structure creates granular thermal breakup rather than a circular cutout | `melt.structure` | `reference-peak-open`, `reference-second-peak` |
| Positive refreeze cools the field over time while zero keeps it | `melt.refreeze` | `reference-cooling`, `reference-refrozen` |
| Local Refreeze action restores the frozen state | `melt.action` | `reference-rest`, `reference-refrozen` |

## Product behavior

### Controls

Add a `Melt Brush` section with six built-in controls:

1. `melt.enabled` — Switch, labelled `Paint melt`.
2. `melt.heat` — Slider, 0–100%, shown only while enabled.
3. `melt.radius` — Slider, 1–100%, shown only while enabled.
4. `melt.structure` — Slider, 0–100%, shown only while enabled.
5. `melt.refreeze` — Slider, 0–100%, shown only while enabled. Zero means persistent melt.
6. `melt.action` — local Actions control with `Refreeze`, shown only while enabled.

The existing orientation gizmo remains the sole owner of model pose, but it is conditionally hidden while `melt.enabled` is true. Direct model orbit is disabled under the same condition.

### Thermal model

The renderer owns a fixed-resolution, unsigned-byte 3D temperature texture in normalized effect space. A brush sample deposits radial energy with a smooth compact falloff:

`T_new = 1 - (1 - T_old) × (1 - heat × falloff)`

Heat also expands the effective radius moderately so a hotter brush affects more neighboring structure. Consecutive raycast samples are interpolated at a fraction of the current radius, preventing holes during fast pointer motion.

For positive Refreeze, each simulation step applies bounded six-neighbor diffusion followed by exponential cooling. The shader samples the temperature trilinearly and converts it to melt coverage through a noisy threshold. Two noise octaves produce a granular core edge and a softer outer halo. The retained ice mask is:

`retained = globalTopDownMask × (1 - localThermalMelt)`

This same mask drives shell, crystal, icicle and source-core shading, so all ice layers disappear consistently at the painted location.

### Interaction lifecycle

- Hovering a geometry hit shows a circular heat cursor sized from the world-space brush radius.
- Primary pointer-down on a hit captures the pointer, begins a stroke, and prevents orbit/pan ownership.
- Pointer-move raycasts and deposits interpolated heat samples.
- Pointer-up releases capture and ends deposition; cooling can continue.
- A pointer-down miss is not claimed by the brush, preserving Toolcraft canvas pan.
- Model/source replacement clears the field because effect-space correspondence has changed.
- Refreeze clears the field immediately.
- Export uses the same live temperature texture but excludes the cursor overlay.

### Persistence, timeline, layers, export

- Brush settings persist through the existing schema persistence policy.
- The high-resolution temperature field is transient renderer state and is intentionally not written to localStorage.
- No Toolcraft timeline is added. Cooling is a bounded simulation response to a pointer edit, not authored or exportable animation transport.
- Layers remain disabled because the result is one composited WebGL product.
- Existing still export remains; it renders the current thermal state at export time.

## Renderer technique decision

| Option | Fit | Decision |
| --- | --- | --- |
| Screen-space 2D alpha mask | Cheap, but breaks on orbit, depth, side faces and arbitrary geometry | Rejected |
| Per-stroke uniform array in fragment shader | Simple but unbounded fragment cost and hard limits on long strokes | Rejected |
| Geometry deletion/remeshing | True topology change, but too expensive and unstable during interactive arbitrary uploads | Rejected |
| Fixed 3D temperature texture + shader threshold | Object-space, bounded memory/upload, affects all ice layers, supports diffusion/cooling | Selected |

## Performance model

- Field resolution is fixed and bounded; it does not become a user workload control.
- `mask-drag` invalidates only retained WebGL preview rendering; source preparation, image decode, scratch preparation, and image geometry preparation remain cached.
- Cooling uses one coalesced animation frame at a bounded cadence only while nonzero temperature remains.
- CPU work per simulation step is bounded by the fixed voxel count; GPU sampling adds one trilinear 3D lookup plus fixed-cost noise.
- Field upload and WebGL redraw are suspended/coalesced while unrelated canvas interaction owns the pointer.
- Image export consumes the existing field texture and does not rebuild source resources.

## Verification tier

Verification tier: Tier 4

Reason: This is a major post-generation renderer and canvas-interaction pass that adds a new temporal mask model, conditional controls, direct pointer ownership, shader behavior, export state, acceptance rows, and performance paths.

Run: targeted thermal-field unit tests; schema/acceptance tests; `npm run verify:quick`; exact browser tests for toggle visibility, orbit lock, hit-only painting, drag continuity, refreeze timing, reset action, and cursor exclusion from export; targeted mask-drag/animation performance scenarios; integrity check; protected iteration receipt; final verification if the current baseline permits it.

Skip: full performance refresh because the user requested a feature and visual behavior, not performance optimization, and this is a later iteration rather than the first stable product checkpoint.

