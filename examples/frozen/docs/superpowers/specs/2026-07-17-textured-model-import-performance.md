# Textured Model Import And Preview Performance

## Goal

Load portable textured models without manually reconnecting material files and
make the frozen preview materially lighter while preserving the approved x2
backing scale, full 0–100% ice coverage controls, and final export fidelity.

## Reference study

- Reference: <https://sketchfab.com/3d-models/night-king-9660679402de481e9284970c856bb7dc>
- The public Sketchfab model metadata reports 8,550 triangles, 4,308 vertices,
  three materials, and three textures. This is the same topology as the supplied
  OBJ, so its smooth reference preview is not evidence that the source mesh
  needs aggressive reduction.
- Sketchfab recommends glTF as its preferred portable format and supports
  OBJ+MTL after FBX. Its viewer exposes multiple texture-quality levels and
  progressively serves texture resolution.
- Frozen additionally draws a duplicate shell plus up to 48,000 crystal and
  12,000 icicle instances with physical transmission. Current crystal/icicle
  primitive topology contributes roughly 1.5 million generated triangles at
  maximum coverage, which dominates the 8.55k source mesh.

## Supplied source audit

- `local-reference://desktop/Night King 3D Model (2)/source/Nigt king.blend`
  contains two static UV-mapped mesh objects totaling 8,550 triangulated faces.
- `local-reference://desktop/Night King 3D Model (2)/textures/` contains two normal
  maps and one displacement map at 2048×2048.
- The Blend file also references two missing BMP base-color images. Therefore
  the supplied folder cannot reconstruct those missing colors, although its
  present normal maps can be preserved in an exported GLB.

## Product behavior

### Model source

- Keep one built-in `fileDrop` target, renamed from `Model` to `Model package`.
- Direct files: GLB, OBJ, and STL remain supported.
- Add ZIP packages. A package may contain:
  - GLB;
  - glTF + BIN + texture images;
  - OBJ + MTL + texture images;
  - STL.
- Resolve resources by normalized relative path first and unique basename as a
  compatibility fallback. Prefer GLB, then glTF, OBJ, and STL when a package
  contains more than one model source.
- Preserve GLB/glTF materials and OBJ MTL materials. STL or OBJ without a usable
  MTL keeps the neutral fallback PBR material.
- A ZIP containing only `.blend` fails with a specific instruction to export a
  GLB with embedded textures. A browser-only WebGL app does not parse Blender's
  native database format.

### Mesh budget

- Add one model-only `Mesh budget` slider in Source.
- Range: 3,000–30,000 triangles; default: 6,000; step: 1,000.
- Sources at or below the budget remain unchanged.
- Larger static single-material meshes are simplified proportionally with UV,
  normal, tangent, and color attributes retained. Multi-material, skinned, and
  morph geometry is retained and deducted from the remaining budget before
  simplifying eligible geometry.
- The hard accepted-source ceiling remains 30,000 triangles. The UI reports
  both source and rendered triangle counts for browser evidence.
- Simplification is source-bound and memoized. Changing the budget rebuilds the
  prepared source once; orbit, material controls, Melt Brush, and export reuse it.

### Generated ice optimization

- Preserve maximum crystal/icicle instance capacities and coverage semantics.
- Reduce crystal cone radial segments from 5 to 4.
- Reduce bent icicle topology from 7 radial × 5 height segments to 5 radial × 3
  height segments.
- Keep the same dimensions, matrices, gravity bend, shader, material, and
  footprint coverage. Recompute instance bounding spheres and enable frustum
  culling instead of forcing every pool to draw when outside the camera.
- This targets the actual dominant preview geometry without lowering x2 or
  changing selected density.

## Control section inventory delta

| Section | Entity/stage | Targets | Grouping reason |
| --- | --- | --- | --- |
| Source | Textured 3D source preparation | `source.model`, `source.modelTriangleBudget` | The upload package and its render topology budget describe one source-preparation step. |

Timeline, layers, persistence, background, material controls, image mode, Melt
Brush, and export controls remain unchanged.

## Performance model

- `source-triangles` remains an external-input dimension consumed by
  `model-prepare` at the 30,000 accepted-source boundary.
- Add `model-render-triangles`, sourced from `source.modelTriangleBudget`, for
  preview, camera, Melt Brush projection, and export GPU work.
- `model-prepare` invalidates on the package asset or mesh budget; all other
  source-bound resources remain retained.
- Lower ice primitive topology is full-quality structural optimization, not a
  render-scale or coverage fallback.

## Acceptance

- Direct GLB retains a non-null texture-backed material.
- ZIP glTF/OBJ package resolves its dependent texture and reaches ready state.
- ZIP with only Blend shows the explicit GLB-export instruction.
- An 8,550-triangle source with the 6,000 budget produces a lower rendered count
  while retaining UV and normal attributes; setting 30,000 preserves all 8,550.
- The supplied Night King GLB renders with its present normal maps.
- Maximum crystal/icicle coverage keeps its instance counts while using the
  reduced primitive triangle counts.
- Targeted source import, preview drag, orbit, Melt Brush, and export performance
  paths are rerun; explicit user-reported lag triggers the protected performance
  refresh lifecycle, subject to the existing baseline constraints.

