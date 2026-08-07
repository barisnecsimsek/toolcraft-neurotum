# Implementation Worklog

This file records product decisions and the evidence behind them. Keep it short, factual, and current. Update it after schema, renderer, timeline, layer, export, performance, or acceptance decisions.

## Status

Mode: product

Frozen is a WebGL product that applies a top-to-bottom thaw effect to one user-uploaded 3D object.

## Decision Trail

### Iteration 1 — Top-to-bottom 3D thaw product plan

- Request: Build an app that thaws any uploaded 3D object from top to bottom with adjustable effect parameters.
- Task type: Fresh generated product app; media upload, custom WebGL renderer, controls, orientation, export, and performance planning.
- User-visible result: One uploaded GLB/OBJ/STL model is auto-fitted and revealed from top to bottom while the remaining region has an ice shell, crystals, and downward icicles.
- Source/reference checked: Inspected the supplied Blender 4.4 Geometry Nodes graph, rendered its default frame, and measured its branch topology and instance counts.
- Reference inputs: `local-reference://desktop/Geometry Node Freeze Effect.blend`; no Figma, video, or reference UI/runtime was supplied.
- Docs/contracts read: `AGENTS.md`, `docs/toolcraft/workflow.md`, Plan phases for reference study, runtime boundary, assembly, control selection, layout, performance, setup/export, and media upload.
- Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `canvas-surface-preserved`, `controls-product-coverage`, `output-export-required`, `controls-section-inventory-required`, `renderer-technique-inventory`, `persistence-policy-explicit`, `performance-coverage-levels`, `workflow-required`.
- Decision: Use a new Toolcraft app with WebGL2/Three.js, schema file upload, built-in orientation gizmo/model orbit, directly authored thaw progress, no timeline/layers, localStorage values/canvas persistence, and PNG export.
- Alternatives rejected: Pure static baked Blender output cannot operate on arbitrary uploads; per-frame WebGL marching cubes is not portable; a custom upload widget would duplicate `fileDrop`; timeline/video export is not requested.
- State/output mapping: `effect.*` drives the thaw field; `ice.*` drives shell, instances, and PBR material; `source.model` owns imported media; `scene.orientation` owns camera/model orbit; background and image-export targets drive preview/export.
- Files changed: `PRODUCT_SPEC.md`, `IMPLEMENTATION_PLAN.md`, and this worklog in the planning pass.
- Verification: Tier 4 selected. Initial `npm run ai:check` reproduced a pre-existing signed-template line-budget failure; direct integrity check passed.
- Skipped checks: No implementation checks yet; timeline, video, and layer checks are outside the declared product.
- Risks: Dynamic shell topology will be a shader-displaced fitted shell rather than Blender OpenVDB remeshing. Source complexity must be bounded. The signed starter health-policy mismatch must be resolved upstream or reported if regeneration is unavailable.

### Iteration 2 — Working WebGL thaw editor

- Request: Implement the planned app with upload, top-to-bottom thaw controls, 3D orientation, and image export.
- Task type: Fresh Tier 4 product implementation across schema, custom WebGL renderer, upload, export, acceptance, and performance.
- User-visible result: GLB/OBJ/STL import drives a retained Three.js scene with a noisy height mask, displaced translucent shell, deterministic surface crystals, downward icicles, direct model orbit, background controls, and PNG/JPG export.
- Source/reference checked: Blender 4.4 Geometry Nodes graph and rendered reference frame from `local-reference://desktop/Geometry Node Freeze Effect.blend`.
- Reference inputs: `local-reference://desktop/Geometry Node Freeze Effect.blend`; no Figma or video reference.
- Docs/contracts read: Toolcraft runtime boundary, controls, media upload, setup/export, renderer, acceptance, and performance routes.
- Contract rules applied: `canvas-no-app-ui`, `controls-product-coverage`, `output-export-required`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`.
- Decision: Bound the interactive prototype at 3,000 source triangles, 2,000 crystals, and 100 icicles; render preview at visible-canvas resolution up to 512 px base width and 1.5× scale; keep selected 2K/4K/8K export independent and full-resolution.
- Performance decision: Keep old shader resources alive through the first replacement frame so Three.js reuses the compiled WebGL program, then dispose retired resources. Use a uniformly tessellated exact-triangle STL fixture instead of coincident triangles that created artificial 2,500× overdraw. Render exports in 512 px tiles across animation frames and restore preview on separate frames.
- Alternatives rejected: Reducing preview to an unreadable fixed thumbnail did not address the fixed shader/resource cost; repeated coincident benchmark triangles did not represent ordinary source meshes; patching protected evidence helpers is outside the app edit surface.
- State/output mapping: Every `effect.*` and `ice.*` value updates the retained scene; root product attributes expose sparse icicle changes for semantic acceptance; `source.model` changes the prepared-model identity; export options select format and output size.
- Verification: TypeScript passed; 44 focused Vitest product/performance/schema/gate tests passed. A final full browser run passed 19/20, with the single sub-millimetric gizmo animation timing flake passing immediately on isolated rerun, covering all 20 scenarios. The real 2K/4K/8K export test passed and decoded exact 2,048/4,096/8,192 px widths. Central maximum-workload tests pass for media import, slider drag, orbit, tiled export, preview options, canvas pan/zoom, and export options. The selected WebGL kernel benchmark passed and recorded a current-source receipt.
- Known framework evidence issue: the signed fixture helper attaches `performance-compiled-fixture` without the path target, while the signed reporter requires targets such as `source.model` and `scene.orientation`. The reporter also applies p95/drop-frame thresholds beyond the central action budget. Product action tests pass, but `npm run verify:perf` returns exit code 1 and cannot record a protected baseline. The signed helpers were not modified.
- Files changed: product schema/composition, retained renderer modules, export provider, acceptance/performance configuration, focused unit and browser tests, and worklog.
- Skipped checks: Timeline, layers, and video export were not enabled by product behavior.
- Risks: The first shader approximates physical ice and the signed template cannot mint its protected performance receipt.

### Iteration 3 — Physical ice renderer rewrite

- Request: Correct the weak visual match: realistic ice, more parameters,
  genuinely minimal icicles, sharp x2 preview, a mask attached to the object,
  uploaded grayscale scratch displacement, and HDRI reflections.
- Task type: Major post-generation renderer, schema, media-resource, acceptance,
  and performance rewrite.
- User-visible result: PBR ice matcap with Delta 2 HDR reflections,
  object-attached thaw, optional grayscale relief, full x2 preview, expanded
  controls, and exact zero/minimal icicles.
- Source/reference checked: supplied Blender file and its rendered frame;
  Principled BSDF values (transmission 0.9, IOR 1.45, fine noise scale 50,
  roughness noise scale 5); packed `delta_2_4k.hdr`; official Poly Haven
  Delta 2 CC0 asset; current WebGL implementation and screenshot.
- Reference inputs: `local-reference://desktop/Geometry Node Freeze Effect.blend`
  and `local-reference://captures/CleanShot 2026-07-16 at 13.04.14@2x.png`.
- Docs/contracts read: full Toolcraft workflow plus reference-study,
  runtime-boundary, assembly, controls, layout, media, setup/export, renderer,
  schema, component, decision, and performance phases; brainstorming,
  writing-plans, thermo-nuclear review, systematic-debugging, and browser skills.
- Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`,
  `controls-product-coverage`, `controls-section-inventory-required`,
  `renderer-technique-inventory`, `acceptance-product-observable`,
  `performance-coverage-levels`, `persistence-policy-explicit`, and
  `workflow-required`.
- Thermo-nuclear findings applied: remove the fake-PBR monolithic shader;
  eliminate the detached overlay-only mask, unlit OBJ/STL fallback, fixed
  512 px preview cap, sparse step-20 icicle control, degenerate zero-length
  instances, and acceptance that proves only `data-*` mutation.
- Decision: Use `MeshPhysicalMaterial` plus minimal shader augmentation for a
  shared effect-space thaw/scratch field, PMREM Delta 2 HDRI, ACES tone mapping,
  retained texture/environment resources, and focused renderer modules for
  environment, texture, material, instances, preview sizing, and orchestration.
- Alternatives rejected: a pure custom fake-lighting shader lacks physical
  IOR/reflection integration; screen-space matcap cannot provide real HDR
  reflections; per-frame volume remeshing is too expensive for arbitrary web
  uploads; UV-only scratch mapping fails on OBJ/STL and inconsistent GLB UVs.
- State/output mapping: `effect.*` drives one `worldToEffect` mask consumed by
  source, shell, crystals, and icicles; `source.scratchTexture` owns the decoded
  luminance resource; `scratch.*` maps it triplanarly; `ice.*` owns physical
  material and generated forms; `lighting.*` owns environment/tone mapping;
  `canvas.renderScale` maps 1.0–2.0 directly to preview backing dimensions.
- Verification tier: Tier 4.
- Reason: broad physical-material, WebGL renderer, media-resource, render-scale,
  schema, acceptance, and performance rewrite prompted by visual-quality issues.
- Run: targeted Vitest; `verify:quick`; required kernel proof; focused real
  browser checks for object-space mask, HDRI response, scratch relief, exact-zero
  icicles, x2 backing resolution, and export; protected performance lifecycle;
  direct integrity; `verify:final`.
- Files changed: product spec, schema/settings, model fitting, physical material,
  environment, texture, instance, preview sizing, scene/output/export, renderer
  pipeline, acceptance/performance inventories, browser coverage, HDR asset, and
  third-party attribution.
- Verification: TypeScript, production build, 29 focused unit tests, 236 of 240
  app tests before required receipt refresh, and targeted Chromium physical-ice
  acceptance pass. Run: pnpm verify:perf.
- Skip: timeline, layers, and video checks because the approved output remains a
  single still scene with directly authored progress.
- Skipped checks: Timeline, layer, and video checks remain outside product scope;
  unrelated full performance refresh is skipped unless the protected lifecycle
  classifies this as the first stable checkpoint.
- Risks: browser raster output approximates Blender Cycles/Eevee and cannot
  reproduce OpenVDB remeshing exactly; transparent matcap quality depends on
  source topology and normals; signed protected-template blockers from
  Iteration 2 remain outside the editable product surface.

### Iteration 4 — Thermonuclear closeout and constant-x2 quality decision

- Request: Finish the realistic ice rewrite and audit every issue named by the
  user without accepting a blurry preview.
- Task type: Tier 4 renderer closeout, acceptance completion, maintainability
  split, performance diagnosis, and final browser verification.
- User-visible result: Constant selected x2 backing, HDRI reflections, a
  responsive PBR transparency control, object-space thaw, uploaded scratch
  relief, exact zero/one icicles, expanded crystal/icicle controls, and working
  OBJ/GLB/STL import and PNG/JPG export.
- Source/reference checked: Blender node/material values, the supplied Blender
  file and screenshot, the final Chromium screenshot, maximum-fixture traces,
  and Poly Haven Delta 2.
- Reference inputs: `local-reference://desktop/Geometry Node Freeze Effect.blend`
  and `local-reference://captures/CleanShot 2026-07-16 at 13.04.14@2x.png`.
- Docs/contracts read: Toolcraft acceptance and performance Verification phases;
  thermonuclear review, systematic debugging, browser verification, and the
  required local workflow routes.
- Contract rules applied: `controls-product-coverage`,
  `controls-section-inventory-required`, `acceptance-product-observable`,
  `performance-coverage-levels`, `renderer-technique-inventory`,
  `output-export-required`, and `workflow-required`.
- Decision: Keep every settled preview render at the selected x2 backing. Remove
  Three.js's second full-resolution transmission pre-pass and map Transmission to
  alpha while `MeshPhysicalMaterial` still supplies IOR/Fresnel, clearcoat,
  roughness, ACES output, and PMREM HDRI reflection. Use dominant-axis triplanar
  sampling and a cheaper continuous boundary field to reduce shader work without
  lowering output resolution.
- Alternatives rejected: x0.25–x1 interaction preview could satisfy the
  software-GPU budget but visibly violated the user's no-blur requirement;
  keeping full physical transmission repeated an 8.3-megapixel scene pass;
  patching signed framework tests or fabricating a performance receipt is outside
  the product edit surface.
- State/output mapping: the Transmission slider maps to PBR ice opacity while IOR
  and HDRI own edge/reflection response; all scratch/mask/geometry/lighting values
  still flow through one retained renderer pipeline and the same export scene.
- Files changed: ice material and scene sizing, performance adapter, exact
  automated acceptance cases, split product browser specs, and this worklog.
- Verification: `npm run typecheck` passed; protected kernel benchmark passed;
  physical-ice Chromium proof passed; the full browser suite passed 130/131 with
  every product scenario green; `npm run verify:perf` was attempted twice and
  the final protected checkpoint remained unrecorded because seven constant-x2
  maximum paths exceeded the central software-GPU frame/action budgets.
- Skipped checks: Timeline, layers, and video remain outside this still-image
  product. No low-resolution interaction mode was retained.
- Risks: constant x2 and 8K PNG encoding exceed strict headless software-GPU
  budgets on this machine; the untouched signed template also contains one
  oversized spec, one strict-locator provenance failure, and one AI-skill
  fallback test mismatch.

### Iteration 5 — Double crystal density

- Request: Increase the number of crystals twofold.
- Task type: Tier 3 schema workload-boundary and retained WebGL instance-capacity change.
- User-visible result: Uploaded models now start with 1,800 crystals instead of 900, and the Crystals control reaches 4,000 instead of 2,000.
- Source/reference checked: Current schema default and limit, deterministic model surface sampler, renderer instance clamping, performance envelope derivation, and browser product observables.
- Reference inputs: None; this pass changes the current app behavior directly from the user's requested multiplier.
- Docs/contracts read: Toolcraft workflow; control selection, layout, runtime boundary, performance, schema, component, and renderer-technique routes; brainstorming and writing-plans skills.
- Contract rules applied: `controls-product-coverage`, `acceptance-product-observable`, `performance-coverage-levels`, `renderer-technique-inventory`, and `workflow-required`.
- Decision: Double both the default and maximum density, and double the deterministic sample pool so the additional range creates real WebGL instances.
- Alternatives rejected: Changing only the displayed default would leave the old upper bound; changing only the slider maximum would clamp actual geometry at 2,000 samples.
- State/output mapping: `ice.crystalDensity` defaults to 1,800 and reaches 4,000; `frozenCrystalSampleLimit` provides the matching 4,000 surface samples; `data-crystal-count` exposes the actual active instance count for browser proof.
- Files changed: crystal schema/settings/model capacity, product unit test, focused browser acceptance, implementation plan, and this worklog.
- Verification: `npm run typecheck` passed; 55 targeted schema/performance/product Vitest cases passed; exact Chromium acceptance `browser: ice.crystalDensity changes frozen product output` passed; live browser inspection observed a ready model with slider/count 4,000 and x2 backing 3,840×2,160; protected WebGL kernel verification and direct 391-file integrity passed. `npm run verify:quick` remains blocked by the untouched signed 558/500-line framework spec. The protected iteration command was attempted with the exact density, model-import, control-drag, orbit, and export cases but stopped before tests because no durable baseline exists.
- Skipped checks: Full performance checkpoint is not triggered by this later feature adjustment; unrelated export, scratch, mask, timeline, layer, and video checks remain outside this pass.
- Risks: At the compiled maximum x2 fixture, the focused model-import path recorded a 325.8 ms frame gap against 80 ms and control-drag took 756.4 ms against 500 ms in headless software WebGL. The full 4,000 range is preserved because the user requested the doubled density and previously rejected reduced preview resolution.

### Iteration 6 — True volumetric PBR ice

- Request: Replace the remaining matcap-like approximation with real PBR ice and
  determine whether the user must supply a texture.
- Task type: Tier 3 physical-material, shader, renderer workload, acceptance,
  and performance-inventory change.
- User-visible result: The ice shell now uses full-resolution physical
  transmission/refraction, IOR, volume thickness, attenuation, clearcoat, and
  PMREM HDRI reflection at the selected x2 backing. The uploaded grayscale map
  remains optional scratch/displacement input; a sparse procedural scratch field
  supplies relief when no texture is uploaded.
- Source/reference checked: Blender Principled ice values in the supplied `.blend`,
  the existing Delta 2 environment, local Three.js 0.185 physical transmission
  pipeline, and the supplied visual reference.
- Reference inputs: `local-reference://desktop/Geometry Node Freeze Effect.blend`
  and `local-reference://captures/CleanShot 2026-07-16 at 13.04.14@2x.png`.
- Docs/contracts read: Toolcraft workflow; decision, runtime, renderer,
  performance, acceptance, and component routes; brainstorming, writing-plans,
  systematic-debugging, and browser skills.
- Contract rules applied: `renderer-technique-inventory`,
  `controls-product-coverage`, `acceptance-product-observable`,
  `performance-coverage-levels`, and `workflow-required`.
- Decision: Restore nonzero `MeshPhysicalMaterial.transmission` with opacity 1,
  retain the source model as refracted interior geometry, tint its frozen core,
  keep `transmissionResolutionScale = 1`, and retain x2 render scale. Treat
  transmission as an explicit workload dimension for preview, camera, and export.
- Alternatives rejected: Blender material-to-matcap baking cannot reproduce
  view-dependent refraction; alpha transparency is not volume transmission; a
  mandatory texture would fail arbitrary OBJ/STL/GLB uploads without UVs.
- State/output mapping: `ice.transmission`, `ice.ior`, `ice.shellThickness`, and
  `ice.roughness` now drive the physical shader directly; `lighting.*` drives
  HDRI response; `source.scratchTexture` and `scratch.*` optionally override the
  procedural triplanar relief.
- Files changed: physical ice material and shader, renderer scene and pipeline,
  PBR controls/settings, performance inventory and adapters, focused product and
  Chromium tests, implementation plan, and this worklog.
- Verification: TypeScript passed; 56 targeted Vitest cases passed; exact
  Chromium physical-material and Transmission-output cases passed; the x2/HDRI/
  mask/scratch/icicle assertion passed; a production build completed. The
  protected iteration command remains blocked by the pre-existing missing
  performance baseline. Node 20/22/24 also expose a signed reporter JSON-import
  incompatibility before protected Playwright/kernel execution; direct product
  browser verification passed with the reporter disabled.
- Skipped checks: No full performance refresh was run because this was a later
  renderer feature pass rather than a user-requested performance investigation;
  timeline, layers, persistence, and media-format behavior were unchanged.
- Risks: True transmission adds a second full-resolution scene pass and is more
  expensive than the prior alpha approximation. The quality-preserving x2 choice
  remains intentional; headless software WebGL maximum fixtures can exceed the
  central interaction budget.

### Iteration 7 — Geometry-relative crystal and icicle coverage

- Request: Make the density slider geometry-relative: the left edge produces no
  icicles, while the right edge covers the uploaded geometry instead of looking
  sparse even at the previous 4,000-instance maximum.
- Task type: Tier 3 schema workload-boundary, model preprocessing, retained
  instance-capacity, WebGL output, acceptance, and performance-path change.
- User-visible result: `Surface coverage` and `Icicle coverage` now run from
  0–100%. Zero creates no instances; 100% uses dense deterministic surface pools
  derived from the normalized model area. The pools are safely bounded at 48,000
  surface crystals and 12,000 underside icicles.
- Source/reference checked: current normalized model sampler, crystal/icicle
  instance transforms, the live x2 PBR preview, and the user's reported sparse
  4,000-instance result.
- Reference inputs: None; this pass changes current app behavior directly from
  the user's density-control request.
- Docs/contracts read: Toolcraft workflow; decision, runtime boundary, control
  selection, layout, schema, component, renderer, performance, and acceptance
  routes; brainstorming, writing-plans, systematic-debugging, and browser skills.
- Contract rules applied: `controls-product-coverage`,
  `controls-section-inventory-required`, `renderer-technique-inventory`,
  `acceptance-product-observable`, `performance-coverage-levels`, and
  `workflow-required`.
- Decision: Measure post-normalization surface area during model preparation,
  allocate bounded pools at 2,500 surface samples and 600 underside samples per
  unit area with dense minimums, and map each slider percentage to the eligible
  pool fraction. Preserve the separate size, length, radius, variation, and
  underside controls.
- Alternatives rejected: another fixed global count repeats the same mismatch
  across model shapes; an unbounded area formula is unsafe for pathological
  geometry; increasing the visual value without increasing sample capacity would
  leave the renderer clamped and unchanged.
- State/output mapping: `ice.crystalDensity` maps 0–100% to the full model sample
  pool; `ice.icicleDensity` maps 0–100% to candidates surviving
  `ice.icicleUnderside`; actual retained counts are published by the WebGL canvas
  for browser proof. Preview/camera/export paths consume the matching
  `surface-crystal-coverage` and `icicle-coverage` workload dimensions.
- Files changed: product spec and plan; model, values, controls, instances,
  performance model and renderer pipeline; fixture/kernel adapters; focused unit
  and Chromium coverage; worklog.
- Verification: TypeScript passed; 59 focused Vitest cases passed; exact Chromium
  left-zero/right-dense tests passed for both surface and underside coverage; the
  full PBR/HDRI/mask/x2 test passed with the larger pools; the 100% screenshot was
  inspected and shows continuous coverage. Product code-health is within budget.
- Skipped checks: no full performance refresh because this is a later feature
  pass, not explicit performance work; timeline, layers, persistence, media
  formats, and export behavior are unchanged. The protected targeted runner still
  cannot record without the pre-existing durable baseline.
- Risks: Maximum coverage deliberately renders far more transmissive instances
  than before and can be expensive in headless software WebGL. Hard caps keep GPU
  memory bounded without weakening the user's requested right-edge result.

### Iteration 8 — Guaranteed full-surface coverage

- Request: Fix the still-incomplete result at `Surface coverage = 100%`, shown
  on a complex uploaded model with a large uncovered top and bare surface islands.
- Task type: Tier 3 renderer visual-mismatch correction, physical-material mask
  split, adaptive instance-footprint change, and rendered-pixel acceptance.
- User-visible result: At 100%, surface crystals cover the entire uploaded model
  even when thaw `Progress` has removed the shell from the top. Crystal bases use
  an overlapping, geometry-derived footprint so random sample gaps close instead
  of leaving large bare patches.
- Source/reference checked: the user's 100% slider screenshot and complex-model
  output screenshot, current random `MeshSurfaceSampler` pool, shared thaw-mask
  shader, and retained instance transforms.
- Reference inputs:
  `local-reference://captures/CleanShot 2026-07-16 at 16.10.45@2x.png` and
  `local-reference://captures/CleanShot 2026-07-16 at 16.10.51@2x.png`.
- Docs/contracts read: Toolcraft workflow; decision, runtime boundary, renderer,
  component, performance, and acceptance routes; brainstorming, writing-plans,
  systematic-debugging, and browser skills.
- Contract rules applied: `controls-product-coverage`,
  `renderer-technique-inventory`, `acceptance-product-observable`,
  `performance-coverage-levels`, and `workflow-required`.
- Decision: Give surface crystals a material-level `respectThawMask = false`
  uniform while shell and underside icicles keep the thaw mask. Derive crystal
  base radius from `sqrt(surfaceArea / (PI * sampleCapacity))`; ramp overlap from
  sparse at ordinary coverage to 1.95 cell radii at 100%, with the authored size
  retained and a closing floor only at the right edge.
- Alternatives rejected: raising the sample cap again cannot guarantee coverage
  with random sampling; keeping the shared mask always leaves a fully thawed top
  empty; forcing one fixed crystal radius fails across model surface areas.
- State/output mapping: `ice.crystalDensity` controls count and the high-end
  overlap ramp; `ice.crystalSize` remains the authored size multiplier; model
  `surfaceArea` and sample capacity determine the footprint; `effect.progress`
  still controls shell/source thaw but no longer deletes surface crystals.
- Files changed: coverage implementation plan, physical material shader,
  instance footprint math, renderer runtime id, focused unit and Chromium tests,
  and this worklog.
- Verification: TypeScript passed; 60 focused Vitest cases passed. Exact Chromium
  proof sets `Progress = 100%`, compares rendered pixels at coverage 0 and 100,
  and passes only when crystals remain visible on the fully thawed surface. The
  full PBR/HDRI/mask/x2 scenario also passed, and the resulting 100% screenshot
  was inspected without the previous uncovered top.
- Skipped checks: timeline, layers, persistence, media formats, and export
  behavior are unchanged. Full performance refresh is not triggered; the
  instance boundary is unchanged from Iteration 7.
- Risks: Full coverage intentionally overlaps transparent geometry and can create
  a visually solid frost blanket. Users retain `Crystal size`, `Elongation`, and
  coverage controls for less aggressive looks below 100%.

### Iteration 9 — Restore the thaw mask for generated geometry

- Request: Fix the broken mask shown after the full-surface coverage change.
- Task type: Tier 3 WebGL shader regression, instanced-geometry mask semantics,
  rendered-pixel acceptance, and visual mismatch correction.
- User-visible result: Surface crystals and underside icicles now disappear
  top-to-bottom with the same `Progress` mask as the ice shell. A 100% coverage
  value remains dense inside the current frozen region, while `Progress = 100%`
  removes every generated ice instance.
- Source/reference checked: the current physical-ice shader, instance transforms,
  geometry-relative footprint calculation, current Chromium output, and the
  user's screenshot showing crystals and long icicles surviving the thaw front.
- Reference inputs:
  `local-reference://captures/CleanShot 2026-07-16 at 16.17.44@2x.png`.
- Docs/contracts read: Toolcraft workflow; decision, runtime boundary, component,
  renderer, performance, and acceptance routes; brainstorming, writing-plans,
  systematic-debugging, and browser skills.
- Contract rules applied: `controls-product-coverage`,
  `renderer-technique-inventory`, `acceptance-product-observable`,
  `performance-coverage-levels`, and `workflow-required`.
- Decision: Remove the `respectThawMask = false` material escape hatch. Use the
  actual surface vertex for non-instanced shell masking, but use the instance
  anchor for crystals and icicles so each attached element disappears as a whole
  when the thaw front crosses its surface sample. Preserve the adaptive
  overlapping footprint that closes random gaps at high coverage.
- Alternatives rejected: masking each cone vertex leaves tips below the source
  surface after their attachment point has thawed; disabling the mask restores
  density but contradicts `Progress`; reducing instance count only hides the
  regression and recreates sparse coverage.
- State/output mapping: `effect.progress` updates the shared object-space mask;
  shell fragments sample their vertex position, while instanced crystals and
  icicles sample their surface attachment point. `ice.crystalDensity` and
  `ice.icicleDensity` still control geometry-relative instance counts only inside
  that mask.
- Files changed: coverage plan, acceptance description, physical material shader,
  instance material setup, renderer runtime id, focused product/browser tests,
  and this worklog.
- Verification: `npm run typecheck` passed; 65 focused Vitest cases passed;
  exact Chromium crystal and icicle coverage tests passed and compare rendered
  pixels at `Progress = 100%` against zero-density output; the full
  PBR/HDRI/object-mask/scratch/exact-icicle/x2 Chromium scenario passed;
  `npm run build` and direct 391-file integrity passed. `npm run ai:check` and
  `npm run verify:quick` reach only the untouched signed
  `e2e/app-browser-semantic-evidence.spec.ts` 558/500-line framework blocker.
  The protected Tier 3 iteration command was attempted with both exact mask tests
  and stopped because the pre-existing durable performance baseline is missing.
- Skipped checks: no full performance refresh because this is a later correctness
  pass rather than requested performance work. Timeline, layers, persistence,
  media formats, export semantics, workload limits, and renderer pass costs are
  unchanged.
- Risks: High coverage still intentionally overlaps many transmissive instances
  inside the frozen region. The hard 48,000/12,000 caps remain unchanged.

### Iteration 10 — Voronoi blend between transparent ice and current frost

- Request: Keep the current frost material unchanged, add transparent ice as a
  second material, and mix them with an adjustable Voronoi mask and additional
  mask parameters.
- Task type: Tier 3 schema controls, material-mask entity, retained physical
  shader, fragment-cost, renderer output, and rendered-pixel acceptance change.
- User-visible result: A new `Material Mask` section exposes `Frost coverage`,
  `Scale`, `Softness`, `Distortion`, and `Seed`. Zero coverage is transparent
  blue ice, 100% is the previous frost endpoint, and intermediate values produce
  object-space cellular Voronoi islands with softened boundaries.
- Source/reference checked: current PBR shader and current-frost endpoint, current
  Delta 2 PMREM/ACES lighting, a generated smooth-sphere browser fixture, and the
  supplied transparent frosted-ice material screenshot.
- Reference inputs:
  `local-reference://captures/CleanShot 2026-07-16 at 16.40.04@2x.png`.
- Docs/contracts read: Toolcraft workflow; control selection, layout, decision,
  runtime boundary, schema, component, renderer, performance, and acceptance
  routes; brainstorming, writing-plans, systematic-debugging, and browser skills.
- Contract rules applied: `controls-product-coverage`,
  `controls-section-inventory-required`, `renderer-technique-inventory`,
  `acceptance-product-observable`, `performance-coverage-levels`, and
  `workflow-required`.
- Decision: Implement two physical lobes inside one `MeshPhysicalMaterial` shader
  and mix their tint, roughness, relief-normal strength, and transmission with
  one bounded eight-cell object-space Voronoi field. Preserve exact uniform
  branches at coverage 0 and 1 so those endpoints skip the cell loop and the
  frost endpoint retains the previous response.
- Alternatives rejected: overlapping two draw materials would z-fight and double
  transmission cost; a texture mask would require UVs and user assets; F1 radial
  distance produced circular metaball spots rather than coherent Voronoi cells;
  a 27-neighbor Worley loop adds unnecessary fragment cost at x2 and high
  instance coverage.
- State/output mapping: `ice.materialMaskCoverage` selects the two exact endpoint
  lobes; scale changes object-space cell frequency; softness widens threshold and
  cell-boundary blending; distortion jitters cell centers; seed deterministically
  changes centers and per-cell material values. Preview, camera, and export passes
  consume the same settings token and retained shader uniforms.
- Files changed: product spec and Tier 3 plan; mask controls/settings, section
  inventory, acceptance rows, renderer inputs/runtime id, physical shader,
  product/schema/browser tests and smooth-sphere fixture, and this worklog.
- Verification: `npm run typecheck` passed; 74 focused schema, acceptance,
  performance, material, preview, and texture Vitest cases passed. All five exact
  protected Chromium control tests passed; the clear/50%/seeded/100% Voronoi
  material proof passed without shader/WebGL errors; crystal/icicle thaw-mask and
  full PBR/HDRI/scratch/exact-icicle/x2 scenarios passed. The production build
  and direct 391-file Toolcraft integrity check passed. `npm run ai:check` and
  `npm run verify:quick` stop only at the pre-existing signed
  `e2e/app-browser-semantic-evidence.spec.ts` 558/500-line blocker.
- Skipped checks: no full performance refresh because this is a later visual
  feature pass, not requested performance work. The protected browser-performance
  listing still hits the pre-existing signed JSON-import incompatibility, and the
  protected iteration runner cannot record without the pre-existing durable
  baseline. Timeline, layers, persistence, upload formats, geometry limits,
  canvas sizing, render scale, and export semantics are unchanged.
- Risks: The default intermediate blend executes a fixed eight-cell Voronoi loop
  per visible fragment. Exact 0% and 100% endpoints branch around that work; x2
  quality and all existing hard geometry caps remain unchanged.

### Iteration 11 — Image source as rounded volumetric geometry

- Request: Allow images to be loaded as the model itself, with adjustable depth
  and bevel, so the image becomes a 3D object that receives the existing ice and
  top-to-bottom thaw effect.
- Task type: Tier 3 source-media flow, conditional schema controls, retained
  WebGL geometry/resource lifecycle, renderer pipeline, acceptance, and
  performance-path change.
- User-visible result: The `Source` section now switches between `3D` and
  `Image`. Image mode accepts PNG, JPEG, WebP, and AVIF, preserves image aspect
  ratio on both broad faces, builds a real rounded slab, and exposes independent
  `Thickness` and `Bevel` controls. Orbit, thaw mask, frost/transparent-ice mix,
  crystals, icicles, HDRI, x2 preview, and PNG export operate on either source.
- Source/reference checked: the existing retained model preparation and thaw
  pipeline, Toolcraft single-image upload/transform semantics, Three.js rounded
  box material groups, a generated asymmetric 320×160 fixture, and live browser
  inspection with the previously supplied CleanShot image.
- Reference inputs: no new design reference; live QA also used
  `local-reference://captures/CleanShot 2026-07-16 at 16.40.04@2x.png` as arbitrary image content.
- Docs/contracts read: Toolcraft workflow; control selection, layout, runtime
  boundary, performance, setup/export, media upload, schema, component,
  renderer, acceptance, brainstorming, writing-plans, browser, and
  systematic-debugging routes.
- Contract rules applied: `controls-product-coverage`,
  `controls-section-inventory-required`, `canvas-no-app-ui`,
  `renderer-technique-inventory`, `acceptance-product-observable`,
  `performance-coverage-levels`, `persistence-policy-explicit`, and
  `workflow-required`.
- Decision: Decode a bounded image once, bake runtime rotate/flip transforms into
  a retained sRGB canvas texture, create a fixed-complexity `RoundedBoxGeometry`,
  and pass that object through the same canonical model normalization and frozen
  renderer. The face long edge is 2 units; thickness maps to 4–62% of the short
  face; bevel is clamped below half of the minimum width/height/depth so all
  slider combinations remain mathematically valid.
- Alternatives rejected: a flat plane has no meaningful thickness or rounded
  silhouette; CSS/DOM extrusion cannot participate in WebGL depth, PBR, mask,
  orbit, and export; image-driven displacement would alter the artwork rather
  than create the requested cuboid; regenerating crystals independently would
  duplicate and desynchronize the existing thaw pipeline.
- State/output mapping: `source.mode` selects the retained model or image branch;
  `source.image` owns the image plus rotate/flip transform; image dimensions set
  slab aspect; `source.imageThickness` sets depth; `source.imageBevel` sets the
  bounded radius. Exact pipeline invalidations cover decode, image geometry
  preparation, preview/camera, and export. Uploaded binary and GPU resources are
  not persisted; scalar mode/geometry settings keep the existing localStorage
  policy.
- Files changed: product specification and Tier 3 plan; source controls and
  inventory; image decode/geometry module; shared model preparation/disposal;
  source-value mapping; renderer pipeline/runtime id; retained output branch;
  acceptance and performance matrices/impact inventory; focused unit, browser,
  media, and performance adapters; and this worklog.
- Verification: TypeScript passed. Seventy-seven focused schema, product,
  performance, and kernel-gate Vitest cases passed. Five exact Chromium source
  tests passed for conditional 3D/Image controls, upload/clear/reset, real pixel
  changes after rotate/flip, source switching, thickness, and bevel. Live browser
  QA confirmed a 2:1 image slab, a safe maximum radius of 0.2976 at depth 0.62,
  visible side faces, orbit, and partial thaw/ice geometry. The protected kernel
  benchmark, production build, and direct 391-file integrity check passed.
  `npm run ai:check` now reports only the pre-existing signed 558/500-line
  semantic-evidence file after product-owned browser/performance files were split
  below their line budgets.
- Skipped checks: no full performance refresh because this is a later feature
  pass and performance optimization was not requested. Both new compiled image
  paths were exercised directly at the protected maximum fixture; after fixing
  exact `aria-valuenow` observation and conditional fixture ordering, they reach
  the real action but exceed the central five-second outcome-change window under
  x2, near-maximum transmission/coverage, and combined maximum workload. The
  pre-existing absent durable baseline still prevents a targeted iteration
  receipt. Timeline, layers, video export, canvas sizing, and the existing x2
  quality decision are unchanged.
- Risks: A 2048-pixel image combined with near-maximum crystals, icicles,
  transmission, and x2 preview can take more than five seconds to replace or
  rebuild in software WebGL. Interactive image decode is bounded to a 2048-pixel
  long edge and slab topology is constant, but the existing 48,000/12,000
  generated-geometry caps remain the dominant maximum-fixture cost.

### Iteration 12 — Surface-normal icicles for image cards

- Request: On image cards, orient icicles from surface normals because the
  current gravity-only bottom curtain looks flat.
- Task type: Tier 3 visual mismatch, image-source surface sampling, retained
  instance-matrix behavior, conditional control visibility, renderer output,
  and reachable image workload change.
- User-visible result: Image slabs now distribute icicle candidates across the
  complete rounded volume and point every cone outward along its sampled normal.
  Front, side, bevel, and bottom faces therefore read as one volumetric object
  instead of one flat vertical curtain. Imported 3D models keep the existing
  gravity-aligned underside behavior, and `Underside` is hidden in Image mode.
- Source/reference checked: current image-card screenshot, existing
  underside-weighted sampler, cone local-axis transform, rounded slab normals,
  live 3/4 browser output, and the retained 3D model path.
- Reference inputs:
  `local-reference://captures/CleanShot 2026-07-16 at 18.28.15@2x.png`.
- Docs/contracts read: Toolcraft workflow, decision contract, runtime boundary,
  core and focused performance contracts, component rules, renderer technique,
  acceptance testing, brainstorming, writing-plans, systematic-debugging, and
  browser workflows.
- Contract rules applied: `controls-product-coverage`,
  `controls-section-inventory-required`, `renderer-technique-inventory`,
  `acceptance-product-observable`, `performance-coverage-levels`, and
  `workflow-required`.
- Decision: For `sourceKind === "image"`, sample icicle candidates from the
  complete surface and construct `q = fromUnitVectors((0,-1,0), normalize(n))`
  for every instance. For 3D sources, retain downward-weighted sampling,
  `normalY <= -Underside`, and identity gravity orientation. Keep density,
  length, radius, variation, thaw mask, and the 12,000 hard cap unchanged.
- Alternatives rejected: keeping global gravity preserves the flat curtain;
  applying full-surface normals to arbitrary 3D models changes established
  behavior; adding a new direction slider is unnecessary for the explicit
  source-specific request; a gravity/normal blend still groups most card
  instances into one downward sheet instead of following the actual surface.
- State/output mapping: `source.mode` selects the prepared source kind. Image
  preparation uses all surface records for `icicleSamples`; the retained preview,
  camera, and export paths rotate local cone `-Y` to each sampled normal. The
  existing icicle controls still change matrices and mask visibility;
  `ice.icicleUnderside` is conditionally visible only when `source.mode=model`.
- Files changed: Tier 3 plan and product spec; model sampling; retained icicle
  eligibility/direction/matrices; source output diagnostic; renderer runtime id;
  conditional schema control; acceptance language/visibility coverage; focused
  unit and browser tests; and this worklog.
- Verification: TypeScript passed. Sixty-eight focused product/schema/performance
  tests passed, including full-surface image normals, quaternion direction, and
  unchanged 3D eligibility; the ten Toolcraft product gates also passed. The
  exact image normal-alignment Chromium scenario passed; the exact 3D
  `Underside` output/conditional-visibility scenario passed in an isolated WebGL
  worker. Live visual QA at x2 with the supplied screenshot, 38% progress, zero
  crystals, and a rotated 3/4 card showed visible front/side/bottom normal
  divergence and reported `data-icicle-direction=surface-normal`. The protected
  WebGL kernel benchmark and production build passed with a current-source
  receipt; the final focused gate passed all 78 cases and direct integrity passed
  all 391 signed files. `npm run verify:quick` reaches only the pre-existing
  signed `e2e/app-browser-semantic-evidence.spec.ts` 558/500-line blocker.
- Skipped checks: no full performance refresh because this is visual-correctness
  work, not requested performance optimization. The first combined two-worker
  browser run timed out in the pre-existing heavy 3D `Underside` drag; the same
  exact scenario passed alone in 55.1 seconds, separating worker contention from
  behavior. The targeted canonical maximum image-import path reached the real
  upload/rebuild action but retained the Iteration 11 five-second outcome-change
  timeout under the combined software-WebGL fixture; geometry and x2 quality
  were not reduced to mask that limit. The protected targeted iteration runner
  was attempted and stopped on the pre-existing missing durable baseline.
  Timeline, layers, persistence, media formats, x2 quality, canvas sizing, and
  export semantics are unchanged.
- Risks: At high image coverage and length, front-face normals intentionally aim
  cones toward the viewer and can produce a dense radial/porcupine appearance.
  Existing density, length, and radius sliders provide direct control without a
  hidden quality fallback.

### Iteration 13 — Lighting-independent source-image color

- Request: Stop scene lighting from making uploaded images look faded; keep the
  image visually identical to its source.
- Task type: Tier 3 renderer visual-correctness change affecting the retained
  image material in preview, camera rendering, and still export.
- User-visible result: The front and back image faces now preserve their sRGB
  pixels regardless of HDR environment intensity or ACES exposure. The rounded
  edge, ice shell, frost, crystals, and icicles remain physically lit.
- Source/reference checked: current image-card material construction, the shared
  thaw source shader, Three.js color-space/tone-mapping behavior, and a generated
  asymmetric PNG rendered at the minimum and maximum lighting endpoints.
- Reference inputs: None; the browser proof uses the app-owned exact-color PNG
  fixture.
- Docs/contracts read: Toolcraft workflow, decision contract, runtime boundary,
  core/focused performance contracts, component rules, renderer technique,
  acceptance testing, brainstorming, writing-plans, systematic-debugging, and
  browser workflows.
- Contract rules applied: `renderer-technique-inventory`,
  `acceptance-product-observable`, `performance-coverage-levels`, and
  `workflow-required`.
- Decision: Keep the decoded texture tagged `SRGBColorSpace`, render image faces
  with `MeshBasicMaterial`, set `toneMapped=false`, and mark those materials to
  bypass the shared frozen-core source tint. Keep `MeshStandardMaterial` on the
  slab edge and `MeshPhysicalMaterial` on all generated ice.
- Alternatives rejected: increasing ambient/HDR intensity still changes the
  pixels and cannot guarantee source fidelity; compensating exposure is
  scene-dependent; emissive PBR still participates in tone mapping; disabling
  all scene lighting would flatten the ice the user is trying to improve.
- State/output mapping: `source.image` decodes to one retained sRGB texture. Image
  model preparation binds it to unlit front/back materials; lighting controls
  continue to invalidate and render the scene but cannot alter those fragments.
  The same retained scene is used by preview, orbit, and still export.
- Files changed: Tier 3 plan; product spec; image material construction; source
  shader augmentation filter; renderer runtime id; Lighting help copy;
  acceptance description; focused unit/browser proof; and this worklog.
- Verification: TypeScript and all 79 focused schema/product/performance/gate
  cases pass. Exact Chromium proof passes and reads the uploaded fixture colors
  as `#F43B30` and `#146CFF` at both
  `Environment 0% / Exposure 25%` and `Environment 300% / Exposure 200%`.
  The protected WebGL kernel benchmark, production build, and direct 391-file
  integrity check pass with a current-source receipt. `npm run verify:quick`
  reaches only the pre-existing signed 558/500-line framework-spec blocker.
- Skipped checks: no full performance checkpoint because this later pass changes
  visual shading semantics without adding a workload dimension, resource, pass,
  boundary, or interaction, and the user did not request optimization. Timeline,
  layers, persistence, media lifecycle, canvas sizing, and export dimensions are
  unchanged. The targeted canonical image-import performance path was rerun and
  retains the existing five-second combined-fixture outcome timeout. The
  protected Tier 3 iteration command was attempted and stops on the pre-existing
  missing durable baseline before running its selected checks.
- Risks: Frost and transparent ice intentionally remain visible over the original
  image in frozen regions, so the composite can still look icy; the underlying
  image texture itself is no longer faded, tone-mapped, lit, or core-tinted.

### Iteration 14 — Image round corners

- Request: Add adjustable round corners that round the uploaded image together
  with its volumetric card.
- Task type: Tier 3 Source schema, image-model preparation, retained WebGL
  geometry, surface sampling, preview/export output, and responsive control path.
- User-visible result: Image mode now exposes `Round corners` from 0–100%.
  Zero produces a rectangular card; 100% reaches half the shorter face and can
  create a pill/circle silhouette regardless of card thickness. The image cap and
  side wall share the same outline, while `Bevel` remains a separate 3D edge.
- Source/reference checked: current depth-limited `RoundedBoxGeometry` behavior,
  exact slab dimensions at default thickness, current Source control grouping,
  image UV/material ownership, and live 100% capsule output in Chromium.
- Reference inputs: None; visual QA uses the app-owned asymmetric exact-color PNG
  fixture.
- Docs/contracts read: Toolcraft workflow; control selection and layout; runtime
  boundary; core/focused performance; decision contract; schema reference;
  component rules; renderer technique; brainstorming, writing-plans,
  systematic-debugging, and browser workflows.
- Contract rules applied: `controls-product-coverage`,
  `controls-section-inventory-required`, `controls-component-layout-invariants`,
  `renderer-technique-inventory`, `acceptance-product-observable`,
  `performance-coverage-levels`, and `workflow-required`.
- Decision: Add one built-in continuous `source.imageCornerRadius` slider in the
  existing Source section. Map its normalized value to 0–49.75% of the shorter
  face, independent of depth. Replace the thin rounded box with a constant-detail
  rounded `Shape` extrusion, normalize its bounds, generate full-image planar
  UVs, and assign unlit image material to caps and lit edge material to sides.
- Alternatives rejected: reusing `Bevel` retains the depth/2 limit and cannot
  produce round corners on a thin card; a fragment-only alpha mask leaves square
  geometry, sampling, shadows, and side walls; increasing thickness changes the
  requested object rather than solving its corner radius.
- State/output mapping: `source.imageCornerRadius` is persisted/reset through the
  schema, included in the image-model pipeline cache/invalidation key, converted
  to physical radius during image preparation, sampled as real geometry, and
  consumed unchanged by preview, orbit, mask, generated ice, and PNG export.
- Files changed: Tier 3 plan; product spec; Source schema/value mapping;
  rounded-extrusion geometry and prepared metadata; renderer pipeline/runtime id;
  output diagnostics; acceptance/inventory/performance descriptions; focused
  unit/browser tests and visual helper; and this worklog.
- Verification: TypeScript and all 80 focused schema/product/performance/gate
  tests pass. Exact Chromium round-corner acceptance passes, including
  conditional visibility and live slider output; exact image RGB, Thickness,
  and Bevel regressions also pass. Visual QA at 100% shows a clean 2:1 capsule
  with the uploaded image clipped by the same geometric outline and physical
  radius `0.4975`. Protected kernel, production build, and direct 391-file
  integrity pass with a current-source receipt. `npm run verify:quick` reaches
  only the pre-existing signed 558/500-line framework-spec blocker.
- Skipped checks: no full performance checkpoint because curve/bevel segment
  counts are constant, no workload dimension or input boundary was added, and
  the user did not request optimization. Timeline, layers, persistence policy,
  media lifecycle, canvas sizing, and export dimensions are unchanged. The
  exact compiled image-geometry path was rerun and retains its known five-second
  combined software-WebGL outcome timeout. The protected Tier 3 iteration runner
  was attempted and stops on the pre-existing missing durable baseline.
- Risks: At 100%, wide images intentionally become capsules and square images
  approach circles. The existing `Bevel` can add a small lit rim inside that
  silhouette, but it no longer limits the 2D corner radius.

### Iteration 15 — Interactive thermal melt brush

- Request: Study the supplied screen recording and add a toggle that locks the
  model while a held pointer melts ice directly on the object, with realistic
  heat, radius, structure, and refreezing behavior.
- Task type: Tier 4 video-reference transfer, editing-mode controls, WebGL
  raycast interaction, volumetric state field, physical-shader mask, autonomous
  cooling loop, acceptance, and renderer-performance path change.
- User-visible result: `Paint melt` switches the canvas from orbit to a
  geometry-bound heat brush. A glowing radius cursor follows actual raycast
  hits; a held drag deposits a continuous irregular melt trail; `Heat` controls
  deposited energy, `Radius` controls footprint, `Structure` breaks up the edge,
  `Refreeze` controls recovery speed, and the local `Refreeze` action clears the
  field. Releasing the pointer resumes cooling but never changes the authored
  top-down `Progress` value.
- Source/reference checked: the complete 6.733-second H.264 reference recording
  at 4096×2078, a 2.5 fps full-frame contact sheet, a 5 fps temporal center crop,
  and seventeen extracted frames. The study identified a clear hot core,
  granular threshold boundary, broad soft halo, additive overlapping strokes,
  and roughly two-to-three-second local recovery rather than a binary eraser.
- Reference inputs:
  `local-reference://captures/CleanShot 2026-07-16 at 18.55.45.mp4`,
  `/tmp/frozen-melt-study/contact-sheet.jpg`,
  `/tmp/frozen-melt-study/temporal-sheet.jpg`, and
  `/tmp/frozen-melt-study/frame-01.jpg` through `frame-17.jpg`.
- Docs/contracts read: `AGENTS.md`, `docs/toolcraft/workflow.md`; Plan,
  Implementation, and Verification phases for reference study, runtime
  boundary, assembly, control selection, layout, renderer technique,
  acceptance, and performance; brainstorming, writing-plans,
  systematic-debugging, and browser skills.
- Contract rules applied: `video-reference-analysis`,
  `controls-product-coverage`, `controls-section-inventory-required`,
  `canvas-handle-placement`, `renderer-technique-inventory`,
  `acceptance-product-observable`, `performance-coverage-levels`,
  `timeline-mode-choice`, and `workflow-required`.
- Decision: Represent heat by a retained 48³ object-space scalar field with
  nonlinear additive deposition, segment interpolation at 0.28 brush radii,
  six-neighbor diffusion, and exponential cooling. Upload the field as one
  trilinearly sampled red `Data3DTexture`; combine it with two deterministic
  noise octaves and the existing top-down mask in the shared physical material.
  Raycast the prepared source geometry for every captured pointer sample and
  coalesce preview redraws to animation frames. Keep `Refreeze = 0` persistent.
- Alternatives rejected: screen-space alpha painting detaches after orbit;
  binary fragment erasure has no heat accumulation or refreezing; per-stroke
  geometry booleans/remeshing are too expensive for a continuous arbitrary-mesh
  browser tool; a 2D UV texture fails OBJ/STL and card side faces; continuing
  orbit while painting makes pointer ownership ambiguous.
- State/output mapping: `melt.enabled` selects brush ownership and hides the
  orientation gizmo; `melt.heat`, `melt.radius`, `melt.structure`, and
  `melt.refreeze` map through runtime values to deposition, shader threshold,
  and cooling; pointer raycasts write `melt.temperatureField`; the retained 3D
  texture feeds shell, source core, crystals, and icicles in preview and export;
  `melt.refreeze-all` clears the same retained field.
- Files changed: product/video study and implementation plan; Melt Brush schema,
  values, section inventory, and action bridge; thermal field, shader uniforms,
  scene raycast API, pointer/cursor output, renderer pipeline, acceptance and
  performance inventories/adapters/tests; focused melt-shader and performance-
  fixture helper modules; worklog.
- Verification: TypeScript passed; 24 focused melt/schema/performance tests
  passed; all seven exact Melt Brush Chromium scenarios passed across the full
  and focused runs; live x2 inspection on an uploaded OBJ reported a nonzero
  thermal maximum and showed an irregular local reveal with no WebGL/shader
  errors. The two canonical performance adapters now execute real mask drag and
  120-frame thermal cooling paths. The required first-stable automated
  checkpoint remains `pnpm verify:perf`; this pass also runs the two changed
  paths directly at their protected development fixture before final delivery.
- Verification: `pnpm verify:perf` completed twice during first-stable delivery;
  central constant-x2 software-GPU thresholds were exceeded, so no durable
  baseline was minted.
- Verification: the development-fixture `mask-drag` path reached the real
  thermal outcome but measured 2206.8 ms against 500 ms with a 2318.6 ms
  maximum frame gap; the 120-frame `animation-frame` path reached real cooling
  but measured a 3308.4 ms maximum gap against 80 ms. The protected Tier 4
  iteration command was attempted with both exact path titles and stopped at the
  pre-existing missing-baseline guard. The current-source WebGL kernel benchmark
  and receipt pass. After the maintainability split, the exact Chromium
  Structure and continuous-geometry-drag scenarios pass again, direct integrity
  passes all 391 signed files, and the production build succeeds.
- Skipped checks: no full performance refresh because this is a later feature
  pass and the user did not request optimization; the protected targeted
  iteration remains subject to the pre-existing absent durable baseline.
  Timeline, layers, video export, media formats, canvas sizing, and still-export
  dimensions are unchanged.
- Risks: A fixed 48³ field is intentionally topology-independent and bounded but
  cannot reproduce fluid runoff, changing shell thickness, or OpenVDB surface
  tension. The current shader produces a convincing thermal reveal/refreeze
  rather than physically simulating water mass.

### Iteration 16 — Melt cursor coordinate alignment

- Request: Fix the Melt Brush circle because it does not stay under the mouse
  cursor.
- Task type: Tier 3 visible editing-handle coordinate regression affecting the
  fitted/zoomed Toolcraft canvas and WebGL melt interaction.
- User-visible result: The heat circle is centered directly beneath the pointer
  at the fitted canvas scale and remains centered after canvas zoom, while its
  displayed radius keeps the same screen-space meaning.
- Source/reference checked: current pointer handlers, scene raycast contact,
  absolute cursor overlay, Toolcraft fitted canvas transform, and the exact
  Chromium Radius scenario before and after the fix.
- Reference inputs: None; this pass corrects the live app behavior reported by
  the user.
- Docs/contracts read: existing Toolcraft workflow and renderer/acceptance routes;
  systematic-debugging, writing-plans, and browser skills; focused Tier 3 plan
  `docs/superpowers/plans/2026-07-16-melt-cursor-alignment.md`.
- Contract rules applied: `canvas-handle-placement`,
  `acceptance-product-observable`, `canvas-surface-preserved`,
  `renderer-technique-inventory`, and `workflow-required`.
- Decision: Keep raycasting in viewport client coordinates, then convert the
  contact position and projected brush radius from the post-transform
  `getBoundingClientRect()` space back into local canvas CSS coordinates using
  `clientWidth / bounds.width` and `clientHeight / bounds.height`.
- Alternatives rejected: positioning the overlay as `fixed` would escape the
  product output and export/viewport hierarchy; subtracting only the canvas
  origin leaves the parent zoom applied twice; hardcoded offsets fail across
  fit, zoom, viewport sizes, and output aspect ratios.
- State/output mapping: pointer `clientX/clientY` still drives the same source-
  geometry raycast and thermal deposit. Only `FrozenMeltContact` overlay
  coordinates and local radius are normalized before `frozen-output.tsx`
  positions the non-exported DOM cursor.
- Files changed: focused Tier 3 plan, scene contact conversion, Melt Brush
  Chromium alignment assertion, and this worklog.
- Verification: The new assertion reproduced a 105.6 px horizontal error before
  the fix. Exact Chromium `browser: Radius changes melt footprint` passes after
  the fix and proves cursor-center error ≤2 px both at fitted scale and after
  `Zoom in`. TypeScript, 33 focused worklog/thermal/performance cases, the
  current-source WebGL kernel benchmark, production build, and direct integrity
  for all 391 signed files pass. `npm run ai:check` reaches only the unchanged
  signed 558/500-line framework-spec blocker.
- Skipped checks: no full performance checkpoint because pointer normalization
  adds no workload, resource, renderer pass, invalidation, or boundary. Schema,
  persistence, timeline, layers, thermal math, material, upload, and export are
  unchanged.
- Risks: Browser rectangle measurements are fractional; the 2 px tolerance
  covers subpixel rounding while remaining far below a visible misalignment.

### Iteration 17 — Melt brush silhouette overlap

- Request: Let Melt Brush remove ice when the pointer is outside the object but
  the circular brush still overlaps part of its visible silhouette.
- Task type: Tier 3 WebGL editing-interaction, projected-geometry query,
  acceptance, and targeted renderer-performance-path change.
- User-visible result: A held brush can now approach from empty canvas and melt
  the intersecting edge of the model. The brush center stays under the actual
  pointer outside the silhouette, so only the overlapping part affects the
  object; a brush with no overlap still does nothing.
- Source/reference checked: current source-geometry raycast, fitted-canvas
  pointer conversion, object-space thermal deposition, prepared 3,000-triangle
  source boundary, and the exact browser behavior at minimum, overlapping, and
  fully missed brush radii.
- Reference inputs: None; this pass implements the user's requested interaction
  directly against the current Melt Brush behavior.
- Docs/contracts read: `AGENTS.md`, `docs/toolcraft/workflow.md`; Plan,
  Implementation, and Verification phases for runtime boundary, renderer
  technique, acceptance, and performance; brainstorming, writing-plans,
  systematic-debugging, and browser skills.
- Contract rules applied: `canvas-handle-placement`,
  `acceptance-product-observable`, `renderer-technique-inventory`,
  `performance-coverage-levels`, `canvas-surface-preserved`, and
  `workflow-required`.
- Decision: Preserve the fast direct raycast. On a direct miss, query a
  camera-keyed cache of projected source triangles, retain at most the eight
  closest screen-space candidates, raycast those candidates for visible depth,
  and unproject the real off-object pointer at that depth. Compare the
  pointer-to-silhouette distance with the exact projected brush radius, then let
  the existing 3D spherical thermal field determine the partial intersection.
- Alternatives rejected: snapping the center onto the silhouette would melt a
  full centered footprint instead of the intersecting fringe; screen-space mask
  painting would detach after orbit; raycasting every triangle on every pointer
  move would repeat projection work and weaken the bounded retained renderer.
- State/output mapping: `melt.radius` projects the object-space thermal radius
  into canvas pixels; pointer client coordinates query the cached projected
  source surface; an accepted overlap becomes an outside object-space
  `FrozenMeltContact`; the unchanged `melt.temperatureField` deposits heat only
  into voxels inside the intersecting sphere. Leaving all overlap resets stroke
  continuity so a later re-entry cannot bridge across empty space.
- Files changed: product design/spec and Tier 3 plan; projected-triangle query
  and unit test; scene contact resolution; pointer continuity; Melt acceptance
  row and exact Chromium scenario; renderer runtime/performance impact metadata;
  performance fixture observer repair; and this worklog.
- Verification: `npm run typecheck`; 16 focused projection/thermal/acceptance
  tests; 32 performance/acceptance gates; current-source protected WebGL kernel
  benchmark and production build all pass. Exact Chromium
  `browser: brush fringe melts the intersecting object edge` passes and proves
  minimum-radius rejection, large-radius partial overlap, centered cursor,
  nonzero thermal output, and far-miss stability. Existing Radius and continuous
  geometry-drag Chromium regressions also pass. The targeted development
  `mask-drag` path reaches the real action after fixing its missing source-limit
  observer reference, but the constant-x2 software-WebGL cold measurement is
  4261.3 ms against 500 ms with a 2249.6 ms maximum frame gap against 80 ms.
  The required first-stable automated checkpoint remains `pnpm verify:perf`;
  its pre-existing no-baseline result is recorded in Iteration 15.
- Verification: `pnpm verify:perf` automated checkpoint execution and measured
  central-budget outcome are recorded in Iteration 15.
- Verification: `pnpm verify:perf:record-iteration -- --tier=3` was executed
  with the exact projection unit, fringe browser, and canonical mask-drag titles.
  The protected runner exits at its existing missing-baseline guard before it
  can record a current receipt; the same three checks were therefore run
  directly and their outcomes are recorded above.
- Verification: direct Toolcraft integrity passes for all 391 signed files; the
  saved Frozen server identity and title resolve at `http://127.0.0.1:3003/`.
  `npm run ai:check` and `npm run verify:quick` reach only the unchanged signed
  558/500-line semantic-evidence framework-spec blocker.
- Skipped checks: no full performance checkpoint or refresh because this is a
  later interaction feature, not a request to optimize performance. Timeline,
  layers, schema controls, persistence, media formats, and export behavior are
  unchanged.
- Risks: projected-silhouette fallback is bounded to eight candidates and the
  prepared 3,000-triangle source, so pathological self-overlapping silhouettes
  resolve to the nearest recoverable visible depth rather than volumetric hidden
  geometry. Existing constant-x2 headless software-WebGL budget failures remain.

### Iteration 18 — Gravity-driven image-card icicles

- Request: Stop PNG-card icicles from standing rigidly out of side faces; allow
  physically plausible ice growth while making hanging bodies obey gravity.
- Task type: Tier 3 renderer/canvas behavior correction.
- User-visible result: Image slabs now grow full icicles from downward-facing
  sites, short bent drips from eligible lower-wall sites, and no icicles from
  upward-facing sites. Imported 3D models retain their previous underside and
  gravity behavior. Surface frost crystals remain normal-aligned and distinct
  from icicles.
- Source/reference checked: Current retained image-slab sampler, instance
  transforms, physical ice shader, exact PNG-card browser output, and the supplied
  `CleanShot 2026-07-16 at 18.28.15@2x.png` card image at x2 preview scale.
- Reference inputs: `local-reference://captures/CleanShot 2026-07-16 at 18.28.15@2x.png`.
- Docs/contracts read: `docs/toolcraft/workflow.md`, Plan routes in
  `decision-contract.md`, `core/runtime-boundary.md`, and
  `core/performance.md`; Implementation routes in `component-rules.md`,
  `renderer-technique.md`, and `performance.md`; Verification routes in
  `acceptance-testing.md` and `performance.md`; brainstorming,
  systematic-debugging, writing-plans, and browser workflow skills.
- Contract rules applied: `workflow-required`, `renderer-technique-inventory`,
  `controls-product-coverage`, `acceptance-product-observable`, and
  `performance-coverage-levels`.
- Decision: Classify image-card samples with
  `d = dot(normal, gravity)`: downward sites hang at full length, only a
  deterministic lower-card subset of wall sites creates shortened drips, and
  upward sites are rejected. Keep one 12,000-capacity `InstancedMesh`; add a
  bounded five-segment taper plus per-instance root direction and bend attributes
  so the vertex shader curves the root toward world down without per-frame mesh
  allocation.
- Alternatives rejected: Keeping surface-normal cones preserves the side-spike
  defect; deleting all wall ice removes plausible accretion; building individual
  curve meshes multiplies draw/resource cost; rotating every cone directly down
  loses the attached root transition.
- State/output mapping: `ice.icicleDensity` selects a percentage of physically
  eligible drainage samples; `ice.icicleLength`, radius, and variation still
  update retained instance matrices; source normal and profile bend feed fixed
  instanced attributes; the same material/shader path renders preview and PNG
  export. Canvas observables publish hanging, wall, and horizontal counts for
  diagnostic browser assertions while rendered-pixel change proves output.
- Files changed: product spec, gravity-icicle design and Tier 3 plan; image sample
  preparation; icicle profile, matrices, segmented geometry, and shader bend;
  control/acceptance copy; renderer runtime and performance declaration; canvas
  observables; focused unit/browser coverage; and this worklog.
- Verification: `npm run typecheck` passes; 61 focused image-source, instance,
  and product tests pass; 27 of 28 focused acceptance/performance gates pass
  before refreshing the deliberately stale kernel receipt; exact Chromium
  `browser: image source icicles bend toward gravity` passes on real WebGL. Live
  x2 visual QA with the supplied card reports 2,485 hanging drips, 186 shortened
  wall drips, and 0 horizontal bodies; isolating `Surface coverage = 0` confirms
  that remaining long side-normal needles belong to the separately controlled
  frost crystals. Current-source protected kernel verification and production
  build pass after the final source update; the refreshed performance gate then
  passes.
- Verification: Targeted development performance paths were executed without
  reducing x2 fidelity. The existing software-WebGL combined fixture remains
  above central budgets: export frame gap 2,375 ms versus 80 ms, preview control
  drag 2,622.1 ms versus 500 ms, and orbit 16,862.2 ms versus 500 ms; the image
  import adapter also times out because its observed media identity is unchanged
  across the prepared action. These are pre-existing checkpoint constraints, not
  introduced instance-count or topology growth.
- Verification: `npm run verify:perf:record-iteration -- --tier=3` is attempted
  with the exact gravity browser test and affected image-import, preview-drag,
  orbit, and export paths; the protected runner stops at the existing missing
  durable baseline guard. Direct Toolcraft integrity passes for all signed files;
  `npm run verify:quick` reaches only the unchanged signed 558/500-line semantic
  evidence framework-spec blocker.
- Verification: `pnpm verify:perf` automated checkpoint execution and its
  central-budget outcome are recorded in Iteration 15; this later renderer
  correction does not silently refresh it.
- Skipped checks: No full performance checkpoint or refresh because this is a
  later renderer correction and the user did not request performance work.
  Timeline, layers, persistence, media formats, thermal brush behavior, and
  export semantics are unchanged.
- Risks: At extreme frost-crystal elongation the separate normal-aligned crystal
  layer can still read as side needles; turning down `Surface coverage` or
  `Elongation` isolates the now gravity-driven icicle layer. The unchanged x2
  software-WebGL and absent-baseline blockers remain.

### Iteration 19 — 30,000-triangle source models

- Request: Allow larger polygon counts so the supplied `Nigt king.obj` can load
  instead of being rejected by the 3,000-triangle guard.
- Task type: Tier 3 external-model workload-boundary, media-import,
  acceptance, and targeted performance-path change.
- User-visible result: GLB, OBJ, and STL sources up to and including 30,000
  triangles now load without automatic decimation. The supplied 8,550-triangle
  Night King OBJ reaches ready state and renders in the x2 WebGL preview.
- Source/reference checked: exact OBJ parse result, current early triangle
  guard, source-model preparation, external-input workload envelope, generated
  8,550/30,001-triangle fixtures, and the real browser upload flow.
- Reference inputs: `local-reference://desktop/Nigt king.obj`.
- Docs/contracts read: `AGENTS.md`, `docs/toolcraft/workflow.md`; Plan,
  Implementation, and Verification phases for setup/export, media upload,
  runtime boundary, schema, controls, renderer technique, acceptance, and
  performance; brainstorming, systematic-debugging, and writing-plans skills.
- Contract rules applied: `workflow-required`, `controls-product-coverage`,
  `acceptance-product-observable`, `renderer-technique-inventory`, and
  `performance-coverage-levels`.
- Decision: Raise the single authoritative source-triangle guard and its
  `source-triangles` external-input envelope from 3,000 to 30,000. Accept the
  source unchanged at or below the boundary and reject 30,001 before
  normalization or sampling. Keep surface-crystal and icicle pools independently
  capped at 48,000 and 12,000.
- Alternatives rejected: silent decimation would alter the user's source;
  removing the guard entirely would make preprocessing and projected-silhouette
  work unbounded; lowering x2 render scale, PBR transmission, or ice coverage
  would trade away previously approved output quality; a worker/LOD system is a
  separate optimization rather than necessary for this 8,550-triangle source.
- State/output mapping: runtime `source.model` media enters the unchanged model
  parser; `prepareFrozenModel` enforces `frozenSourceTriangleLimit`, publishes
  the accepted triangle count, normalizes the full geometry, and supplies the
  retained WebGL scene, Melt Brush projection cache, and PNG export. The same
  exported limit owns performance fixtures and the source-model control copy.
- Files changed: product spec and focused Tier 3 design/plan; source triangle
  constant; model boundary unit coverage; Source control/acceptance copy;
  performance boundary assertions; exact browser upload scenario; and this
  worklog.
- Verification: The exact supplied OBJ parses as two meshes and 8,550 triangles.
  In the running app its real file input reaches `status="ready"`, publishes
  `data-triangle-count="8550"`, keeps the `Nigt king.obj` label, and renders a
  nonempty x2 product signature. The generated 8,550-triangle browser test and
  existing upload/clear/reset regression pass. Focused Vitest initially failed
  against the old 3,000 boundary, then passes both acceptance and 30,001 early-
  rejection cases after the implementation; TypeScript and 70 related model,
  schema, product, and performance cases pass.
- Verification: The current-source protected WebGL kernel benchmark passes at
  the new exact 30,000-triangle maximum and records a fresh receipt. The canonical
  development source-model import path reaches the real action but records a
  4,075 ms maximum frame gap against the central 80 ms software-WebGL budget.
- Verification: `npm run verify:perf:record-iteration -- --tier=3` was attempted
  with the exact model unit, 8,550-triangle browser test, and canonical
  model-prepare/preview-render performance title; the protected runner stops at
  the pre-existing missing first-stable baseline guard.
- Verification: `pnpm verify:perf` automated checkpoint execution and its
  central-budget outcome are recorded in Iteration 15; this later capability
  change does not silently refresh it.
- Verification: A post-kernel focused gate passes 48 of 49 worklog,
  performance, acceptance, and boundary cases; its only failure is the
  pre-existing missing durable performance receipt. `npm run typecheck` and the
  direct Toolcraft integrity check for all 391 signed files pass.
- Verification: `npm run verify:quick` reaches only the unchanged signed
  `e2e/app-browser-semantic-evidence.spec.ts` 558/500-line code-health blocker;
  no product-owned code-health violation is reported.
- Skipped checks: No full performance refresh because this is a later source
  capability change, not a performance-optimization request. Timeline, layers,
  persistence, image-card generation, ice material, thermal math, and export
  semantics are unchanged.
- Risks: The 30,000 boundary makes cold preprocessing and the Melt Brush
  projected-silhouette cache ten times larger than the former limit. Normal
  models such as the supplied 8,550-triangle OBJ load interactively, while the
  combined 30,000-triangle/x2/full-coverage software-WebGL fixture can visibly
  stall; worker preprocessing, BVH projection, or explicit LOD would be the next
  optimization if users routinely approach the ceiling.

### Iteration 20 — Textured packages and automatic preview LOD

- Request: Load the supplied Night King with textures, reduce its polygons so
  preview does not lag, decide whether a folder upload is needed, and compare
  the app with the linked Sketchfab viewer.
- Task type: Tier 4 media-import, source-material, topology preparation,
  generated-instance topology, schema workload, renderer cost-model, dependency,
  acceptance, browser, and explicit performance-optimization pass.
- User-visible result: `Model package` accepts a textured GLB or ZIP containing
  glTF/OBJ plus BIN/MTL/textures. `Mesh budget` selects 3,000–30,000 rendered
  triangles with a 6,000 default. Eligible static meshes are simplified while
  preserving their vertex streams; full 30,000 keeps every accepted triangle.
- Source/reference checked: Sketchfab model page and public model metadata;
  Sketchfab upload, multires-texture, and viewer-quality documentation; supplied
  Blender scene and texture folder; exact generated GLB; current import,
  sampling, instance, PBR, performance, and browser paths.
- Reference inputs: `local-reference://desktop/Night King 3D Model (2)/`,
  `local-reference://desktop/Night King 3D Model (2)/source/Nigt king.blend`, and
  `https://sketchfab.com/3d-models/night-king-9660679402de481e9284970c856bb7dc`.
- Docs/contracts read: `AGENTS.md`, complete Toolcraft workflow; Plan,
  Implementation, and Verification phases for reference study, runtime,
  assembly, controls, layout, media, setup/export, renderer, schema, decision,
  acceptance, and performance; brainstorming, systematic-debugging,
  writing-plans, and browser skills.
- Contract rules applied: `workflow-required`, `controls-product-coverage`,
  `controls-section-inventory-required`, `acceptance-product-observable`,
  `renderer-technique-inventory`, `performance-coverage-levels`,
  `persistence-policy-explicit`, and `output-export-required`.
- Decision: Prefer one embedded GLB. Use one ZIP for loose glTF/OBJ packages so
  a built-in single `fileDrop` can resolve relative BIN/MTL/texture paths without
  nonportable directory-upload semantics. Keep the 30,000 accepted-source guard,
  but prepare static geometry to a separate rendered budget using WebAssembly
  `meshoptimizer`. Keep x2, transmission, full instance capacities, and export
  fidelity while lowering dominant crystal topology to four sides and icicle
  topology to five radial by three height segments with frustum culling.
- Alternatives rejected: browsers cannot parse `.blend`; raw folder selection
  is inconsistent and would require a custom/runtime upload surface; plain OBJ
  cannot carry embedded textures; Three.js `SimplifyModifier` preserved detail
  but blocked the main thread; lowering x2 or reducing the 0–100% coverage ranges
  violates previously approved quality/capability.
- State/output mapping: `source.model` owns GLB/ZIP bytes and package-relative
  resources; `source.modelTriangleBudget` invalidates `model-prepare` and
  `preview-render`; prepared model identity includes the budget; original and
  rendered triangle counts plus material/texture counts are exposed on the
  canvas; the retained prepared mesh feeds preview, Melt Brush, and export.
- Files changed: product spec plus dated spec/plan; package dependencies and
  lockfile; package importer, simplifier, Blender GLB helper, model/value/output,
  source controls, low-topology instances, renderer pipeline, acceptance and
  performance inventories/adapters/impact, focused Vitest and browser specs,
  and this worklog.
- Verification: Supplied Blend contains 8,550 triangles, three 2,048² present
  normal/displacement images, and references two missing albedo BMP files. The
  exported `local-reference://desktop/Night King 3D Model (2)/Night King textured.glb`
  is about 1 MB, reimports as 8,550 triangles with three embedded images, and in
  the real x2 app reaches ready in about 1,777 ms as 5,999 rendered triangles,
  three materials, and three textures. Focused TypeScript and 88 importer,
  simplifier, topology, model, schema, product, and performance tests pass;
  exact ZIP lifecycle, 8,550 acceptance, and mesh-budget browser scenarios pass
  3/3. The protected render-plan gates pass 10/10, and the protected WebGL
  kernel benchmark records a current-source receipt.
- Verification: `verify:perf:refresh` correctly refuses because no durable first
  baseline exists. The required initial `verify:perf` was then attempted against
  the production bundle; its first maximum 8K/full-coverage/transmission export
  path exceeded the three-minute timeout, so no baseline could be recorded and
  the remaining redundant maximum paths were stopped. Development 30k combined
  model paths still show 1,925–2,425 ms software-WebGL frame gaps against 80 ms.
- Verification: Direct Toolcraft integrity passes for all 391 signed files and
  the saved app identity is live at `http://127.0.0.1:3003/`. Both
  `verify:quick` and `verify:final` stop at the unchanged protected
  `e2e/app-browser-semantic-evidence.spec.ts` 558/500-line health violation;
  no product-owned line-budget violation remains.
- Skipped checks: Timeline, layers, and video remain outside the still-product
  behavior. Remaining maximum checkpoint cases were stopped only after the
  first definitive three-minute failure made baseline creation impossible.
- Risks: The supplied directory lacks the two original base-color BMPs, so its
  original skin color cannot be reconstructed from the three remaining maps.
  Eligible static meshes simplify; skinned, morph, shared, and multi-material
  geometry may stay above the selected budget to preserve semantics. The full
  x2/30k/48k-crystal/12k-icicle/8K software-WebGL envelope remains too expensive
  even though the real 8.55k Night King workflow is bounded and functional.

### Iteration 21 — Supplied scene as the startup default

- Request: Make the supplied current Night King scene the default scene using
  the exported settings, optimized model package, and wall texture.
- Task type: Tier 3 schema-default, predefined-media, persistence, acceptance,
  and initial WebGL-output change without renderer-algorithm changes.
- User-visible result: A clean browser profile opens directly on the configured
  Night King frost scene; the model and scratch map appear as ordinary attached
  files, can be replaced or removed, and Reset restores the same scene.
- Source/reference checked: `local-reference://downloads/frozen-settings.json`,
  `local-reference://desktop/Night King Game of Thrones 3D Model optimized 28k.zip`,
  `local-reference://textures/Black Painted Wall Texture.jpg`, the
  clean-start WebGL output, and the real file controls after Reset/reload.
- Reference inputs: `local-reference://downloads/frozen-settings.json`,
  `local-reference://desktop/Night King Game of Thrones 3D Model optimized 28k.zip`,
  and `local-reference://textures/Black Painted Wall Texture.jpg`.
- Docs/contracts read: `AGENTS.md`; complete Toolcraft workflow; Plan,
  Implementation, and Verification phases for controls/defaults/persistence and
  media; control selection, layout, setup/export, media upload, performance,
  schema, component, and acceptance references; brainstorming, writing-plans,
  systematic-debugging, and browser skills.
- Contract rules applied: `workflow-required`, `controls-product-coverage`,
  `controls-section-inventory-required`, `acceptance-product-observable`,
  `persistence-policy-explicit`, `performance-coverage-levels`, and
  `output-export-required`.
- Decision: Declare the optimized ZIP and a 2,048 px web-prepared copy of the
  wall texture through `media.defaultAssets`; centralize every exported setting
  as the schema Reset default; persist media; and bump persistence to v3 so old
  v2 local state cannot hide the new startup scene.
- Alternatives rejected: hidden renderer constants would bypass `fileDrop` and
  Reset; base64 source imports break direct Node/Playwright schema loading and
  inflate JavaScript; shipping the original 21 MB/6,890 px JPEG adds startup
  weight above the renderer's enforced 2,048 px texture boundary.
- State/output mapping: `media.defaultAssets` feeds `source.model` and
  `source.scratchTexture`; the centralized values feed schema defaults and
  renderer fallbacks; persistence v3 restores user media/values after reload;
  Reset recreates the exact model, texture, camera, melt, material, and lighting
  state.
- Files changed: default-scene assets and values, schema, source/effect/output
  defaults, value fallbacks, persistence, performance impact, acceptance data,
  focused unit/browser tests, implementation plan, and this worklog.
- Verification: `npm run typecheck`, production build, 77 focused Vitest cases,
  300/301 full source Vitest cases, refreshed protected WebGL kernel receipt,
  direct 391-file integrity, exact clean-start/default-Reset browser proof,
  model and scratch lifecycle, persistence reload, and live WebGL inspection
  passed. `npm run verify:perf:record-iteration -- --tier=3` was invoked and
  confirmed the pre-existing absence of the durable first-stable baseline.
- Skipped checks: Full performance checkpoint is not required for this
  post-first-working non-performance feature loop; timeline, layers, and video
  remain outside the still-scene product.
- Risks: The predefined ZIP adds about 8.8 MB to the deployed static assets and
  clean startup now performs the existing bounded model preparation immediately;
  the browser cache amortizes repeat loads.

### Iteration 22 — Melt refreeze timing modes

- Request: Add two Melt modes: refreeze while drawing, and refreeze only after
  releasing the mouse as in the existing first-stroke behavior.
- Task type: Tier 3 schema-control, persisted-settings, pointer-lifecycle, and
  retained thermal animation-frame behavior change.
- User-visible result: Melt Brush now has a full-width `Refreeze mode`
  segmented control with `Drawing` and `Release`. `Drawing` restores ice while
  the pointer remains held; `Release` holds the painted temperature stable and
  starts restoration only after pointer-up/cancel/lost capture.
- Source/reference checked: The current Melt Brush schema, retained 48³ thermal
  field, requestAnimationFrame cooling loop, pointer-capture handlers, existing
  nine-scenario Melt Brush Playwright suite, and the live app at
  `http://127.0.0.1:3003/`.
- Reference inputs: None; this pass implements the user's explicit interaction
  semantics against the existing thermal renderer.
- Docs/contracts read: `AGENTS.md`; `docs/toolcraft/workflow.md`; Plan-phase
  control selection, layout, runtime boundary, and core performance modules;
  Implementation-phase schema, component, renderer-technique, and performance
  modules; Verification-phase acceptance testing; brainstorming,
  writing-plans, systematic-debugging, Toolcraft browser, and in-app Browser
  skills.
- Contract rules applied: `workflow-required`, `controls-product-coverage`,
  `controls-section-inventory-required`, `acceptance-product-observable`,
  `persistence-policy-explicit`, and `performance-coverage-levels`.
- Decision: Use the built-in segmented value model, default to
  `after-release`, explicitly cancel the cooling RAF only after a real geometry
  contact claims the pointer, and gate each cooling tick with the active pointer
  plus mode. Resume through every stroke-ending path. The fixed field, cooling
  equation, 30 fps bound, renderer, layers, timeline, and export stay unchanged.
- Alternatives rejected: A second Refreeze slider would not represent a finite
  mode; cooling both modes during later strokes would preserve the current
  accidental ambiguity; pausing on empty-canvas pointer-down would incorrectly
  make a miss affect the simulation; isolated React state would bypass Reset,
  settings transfer, and persistence.
- State/output mapping: `melt.refreezeMode` is schema state parsed into
  `FrozenSceneSettings`; `shouldCoolFrozenMelt` combines it with captured-pointer
  state; `FrozenOutput` cancels, starts, or retains the bounded thermal RAF; each
  step updates the same object-space texture and visible ice mask. The active
  mode is exposed on product output for semantic proof and is included in the
  preview pipeline's real control-change invalidation.
- Files changed: focused Tier 3 plan; default scene; Melt Brush controls, values,
  output lifecycle, pipeline inputs, acceptance inventory/rows, schema and melt
  unit tests, Melt Brush browser tests, and this worklog. The existing impact
  inventory already classifies every touched production module with its exact
  functional or preview-render ownership, so no new module entry was required.
- Verification: TypeScript and 26 focused schema/thermal/pipeline tests passed.
  Production build and the protected current-source WebGL kernel benchmark
  passed, recording a fresh kernel receipt.
  The exact `browser: Refreeze mode controls cooling start time` Chromium proof
  passed, including segmented layout evidence and both held-pointer semantics.
  Eight other Melt Brush scenarios passed in the full file; the ninth exposed a
  stale default-off test precondition, then passed after it was made explicit.
  In-app browser inspection confirmed both labels fit and switch product output
  between `during-stroke` and `after-release`; `Release` was restored afterward.
  The protected `npm run verify:perf:record-iteration -- --tier=3` command was
  invoked with the exact melt unit, browser, and thermal-frame performance tests
  and stopped at the pre-existing missing durable-baseline guard before test
  selection.
- Skipped checks: The full performance checkpoint is not a later feature-loop
  trigger and the request is not performance optimization. The protected Tier 3
  iteration receipt remains unavailable without the pre-existing durable
  baseline; timeline, layers, video, model preprocessing, and export are outside
  this change.
- Risks: The immutable generated `e2e/app-browser-semantic-evidence.spec.ts`
  still exceeds its signed 500-line code-health budget (558 lines), the signed
  skill-fallback Node fixture still has an environment-dependent expectation,
  and no durable performance baseline exists. These pre-existing blockers keep
  `verify:quick`/`verify:final` from becoming green without changing this melt
  behavior.

### Iteration 23 — Model texture exposure

- Request: Add an exposure slider for the model and its textures so the user can
  darken or brighten the imported model.
- Task type: Tier 3 schema, retained WebGL shader, persisted-settings, preview,
  export, acceptance, and renderer-performance mapping change.
- User-visible result: The 3D branch of Source now exposes an `Exposure` slider
  from -3 to +3 EV in 0.1 EV steps. Negative values darken the source model and
  positive values brighten it while ice, HDRI lighting, canvas size, and the
  lighting-independent Image card remain unchanged.
- Source/reference checked: The current source-material augmentation, ACES Filmic
  renderer order, preserved-color image-face material, shared preview/export
  renderer path, default textured Night King scene, and real x2 WebGL output.
- Reference inputs: None; this pass implements the user's explicit model/texture
  exposure requirement against the existing default scene.
- Docs/contracts read: `AGENTS.md`; `docs/toolcraft/workflow.md`; Plan-phase
  control-selection, layout, runtime-boundary, and core-performance modules;
  Implementation-phase schema, component, renderer-technique, and performance
  modules; Verification-phase acceptance testing; brainstorming, writing-plans,
  systematic-debugging, and Toolcraft browser skills.
- Contract rules applied: `workflow-required`, `controls-product-coverage`,
  `controls-section-inventory-required`, `acceptance-product-observable`,
  `persistence-policy-explicit`, and `performance-coverage-levels`.
- Decision: Store exposure as EV and apply `2^EV` to final source-material linear
  radiance immediately before Three.js opaque output and ACES tone mapping. Keep
  the multiplier at one for Image geometry and leave global renderer exposure,
  physical ice materials, HDRI intensity, and imported texture resources intact.
  The typed uniform set was split into a focused module so the existing material
  shader module remains below the product code-health boundary.
- Alternatives rejected: Global `toneMappingExposure` would also change ice and
  the environment; multiplying texture pixels on the CPU would destroy dynamic
  range, require texture rebuilds, and miss non-textured material response;
  changing material base color would not scale authored emissive/specular light;
  applying exposure after ACES would be display gain rather than scene exposure.
- State/output mapping: `source.modelExposure` is a persisted Source slider parsed
  into `FrozenSceneSettings.sourceMaterial.exposure`; every retained imported
  source material receives the shared linear-radiance uniform; the same shader
  renders live preview and PNG export. Conditional visibility removes the control
  from Image mode, and Reset restores 0 EV.
- Files changed: default scene, Source schema and inventory, values, renderer
  pipeline inputs, acceptance data/tests, source material shader and focused
  uniform module, WebGL output observables, source browser acceptance, performance
  adapter preconditions, performance impact inventory, implementation plan, and
  this worklog.
- Verification: TypeScript passed; 30 focused schema, acceptance, exposure, and
  performance Vitest cases passed; exact Chromium
  `browser: Model exposure changes source brightness` passed twice and proves
  foreground luminance direction, conditional 3D/Image visibility, stable output
  dimensions, and rendered-pixel change. Production build, current-source
  protected WebGL kernel benchmark, and direct integrity for all 391 signed files
  passed. The touched canonical control-drag path reached the real action after
  repairing stale default-scene and render-size adapter assumptions; its maximum
  software-WebGL fixture then reproduced the existing 4.6-second/full-coverage
  central-budget overrun. The protected Tier 3 iteration command was invoked with
  exact unit, functional browser, and canonical performance selections and stopped
  at the pre-existing missing durable-baseline guard. The prior first-stable
  `pnpm verify:perf` checkpoint attempt remains recorded below and was not rerun
  because this later fixed-cost feature does not trigger a full refresh.
- Skipped checks: A full performance checkpoint is not triggered by this later
  fixed-cost feature loop. `verify:quick` was attempted and now reports only the
  unchanged signed 558/500-line semantic-evidence spec; timeline, layers, video,
  geometry preparation, and media decoding are outside this change.
- Risks: ACES intentionally compresses very bright positive EV values, so +3 EV
  is perceptually less than an eightfold display-code increase even though linear
  scene radiance is exactly 8x. The immutable signed semantic-evidence file and
  absent durable performance baseline remain pre-existing final-gate blockers.

### Iteration 24 — Isolate model exposure from retained ice

- Request: Exposure currently changes the apparent lighting of the ice; restrict
  it to the model only.
- Task type: Tier 3 retained source-shader visual-regression correction.
- User-visible result: Exposure now affects only revealed or Melt-Brush-cleared
  model pixels. Fully frozen ice remains visually identical at -3, 0, and +3 EV,
  while fully thawed model textures retain the requested EV response.
- Source/reference checked: The live fully frozen Night King output at -3/+3 EV,
  source-material shader augmentation, object-space retained-ice/melt mask,
  transparent physical ice overlay, ACES output order, and exact source browser
  acceptance.
- Reference inputs: None; this pass corrects the user's reported live-app visual
  regression.
- Docs/contracts read: `AGENTS.md`; `docs/toolcraft/workflow.md`; Plan-phase
  decision contract and runtime boundary; Implementation-phase component rules
  and renderer technique; Verification-phase acceptance and performance docs;
  systematic-debugging and writing-plans skills.
- Contract rules applied: `workflow-required`, `controls-product-coverage`,
  `acceptance-product-observable`, `renderer-technique-inventory`, and
  `performance-coverage-levels`.
- Decision: Reuse `frozenCoreMask` in the source fragment shader and interpolate
  the exposure multiplier from exactly one under retained ice to `2^EV` on the
  revealed model. Local melt naturally enters the exposed branch because it
  already subtracts from the same retained-ice mask.
- Alternatives rejected: Changing the PBR ice material would treat the symptom;
  disabling transmission would destroy the intended ice look; globally removing
  the source beneath ice would make transmission black/empty; a second mask or
  render pass would duplicate the authoritative thaw field and add avoidable cost.
- State/output mapping: `source.modelExposure` still supplies one retained uniform;
  `frozenRetainedIceMask` now gates that uniform inside the existing source shader.
  Preview and PNG export share this path; no schema, persistence, resource, or
  invalidation change is required.
- Files changed: source material shader, exact source-exposure browser proof,
  focused Tier 3 implementation plan, and this worklog.
- Verification: The bug was reproduced before editing with different SHA-256
  screenshots for a fully frozen -3/+3 EV scene. TypeScript and 15 focused
  exposure/performance Vitest cases passed. Exact Chromium
  `browser: Model exposure changes source brightness` passed and now proves both
  identical fully frozen pixel hashes and directional fully thawed luminance with
  stable output dimensions. Production build, current-source protected WebGL
  kernel, and direct integrity for all 391 signed files passed.
- Skipped checks: No new performance path or workload dimension exists; the same
  fixed-cost shader path changes one mix factor. Full performance checkpoint is
  not triggered by this later visual bug fix. `npm run verify:quick` reaches the
  unchanged signed 558/500-line semantic-evidence blocker, and the exact protected
  Tier 3 iteration command reaches the pre-existing missing-baseline guard.
- Risks: The transition band intentionally receives a smooth partial EV response
  as ice recedes; this prevents a visible exposure seam at the thaw boundary.

### Iteration 25 — Melt Brush physical M shortcut

- Request: Fix the non-working `M` shortcut.
- Task type: Tier 2 existing-control keyboard behavior correction.
- User-visible result: Pressing the physical M key now toggles Paint melt in
  either keyboard layout. It switches both directions, immediately follows the
  same UI/output path as the switch, ignores held-key repeats, and does not fire
  while the user is editing a control or composing text.
- Source/reference checked: Live clean-profile reproduction on the saved server,
  the existing `melt.enabled` switch/conditional controls, product-output melt
  ownership, and the signed Toolcraft Undo/Redo keyboard-listener pattern.
- Reference inputs: None; this pass fixes the user's reported live-app control.
- Docs/contracts read: `AGENTS.md`; `docs/toolcraft/workflow.md`; Plan-phase
  decision contract and runtime boundary; Implementation-phase component rules
  and renderer technique; Verification-phase acceptance and performance docs;
  brainstorming, writing-plans, systematic-debugging, and browser skills.
- Contract rules applied: `workflow-required`, `controls-product-coverage`,
  `acceptance-product-observable`, `persistence-policy-explicit`, and
  `performance-coverage-levels`.
- Decision: Listen for unmodified, non-repeating `KeyboardEvent.code === "KeyM"`
  in a focused product hook and dispatch the normal `controls.setValue` command
  for `melt.enabled`. Ignore input/select/textarea/contenteditable targets and
  IME composition. Keep the signed runtime and the renderer unchanged.
- Alternatives rejected: `event.key === "m"` breaks under the Russian layout;
  local React state would desynchronize the switch, persistence, reset,
  conditional controls, and model-orbit ownership; editing the signed Toolcraft
  root would turn a product shortcut into an app-runtime fork.
- State/output mapping: The document keydown reaches the product hook, which
  toggles `melt.enabled` through the runtime command bus. Existing state mapping
  reveals/hides brush settings, hides/restores the orientation gizmo, changes
  pointer ownership, persists the value, and updates the WebGL output.
- Files changed: focused melt-shortcut hook and tests, output hook mount, Melt
  Brush description/acceptance text, exact melt browser scenario, performance-
  impact inventory, implementation plan, and this worklog.
- Verification: Pre-fix browser diagnosis proved that a physical M key left
  `data-melt-enabled="true"` unchanged with BODY focused. TypeScript and six
  focused shortcut/melt-control Vitest cases passed. Exact Chromium
  `browser: Melt brush locks model orbit and reveals settings` passed with
  switch-on, M-off, M-on, dependent settings/gizmo, editable-slider exclusion,
  paint ownership, and stable orientation assertions. Production build and
  direct integrity for all 391 signed files passed.
- Skipped checks: No performance path is affected: this is a fixed-cost second
  input for the existing switch and adds no renderer pass, workload dimension,
  resource invalidation, viewport operation, or export work. Full performance
  checkpoint is therefore not triggered. `npm run verify:quick` was attempted
  and stops at the unchanged signed 558/500-line semantic-evidence spec before
  product tests.
- Risks: None in the shortcut path; modified shortcuts remain deliberately free
  for browser, OS, and future product commands.

### Iteration 26 — Refresh startup defaults from exported settings

- Request: Replace the app's default settings with the supplied
  `frozen-settings.json` and perform no checks.
- Task type: Tier 3 schema-default, persistence-identity, and default-workload
  update with verification explicitly skipped by the user.
- User-visible result: A clean startup and Reset now use the supplied scene:
  fully frozen Progress 0, Melt off, 14,000 rendered model triangles, -1.1 EV
  model exposure, 9.75 shell thickness, 56% refreeze, the supplied orientation,
  dark `#242C32` included background, and the remaining exported values.
- Source/reference checked: `local-reference://downloads/frozen-settings.json`, the
  centralized default-scene map, schema persistence, renderer fallback values,
  and default-scene expectations.
- Reference inputs: `local-reference://downloads/frozen-settings.json` exported at
  `2026-07-17T12:39:09.655Z`.
- Docs/contracts read: `AGENTS.md`; `docs/toolcraft/workflow.md`; Plan-phase
  control-selection and layout docs; Implementation-phase schema reference and
  component rules; brainstorming and writing-plans skills.
- Contract rules applied: `workflow-required`, `controls-product-coverage`,
  `persistence-policy-explicit`, and `performance-coverage-levels`.
- Decision: Map every exported product value into
  `frozenDefaultSceneValues`, normalize the exported Background `{ hex }` object
  to the existing color control's hex-string default, align the mesh fallback and
  future test expectations, and bump persistence from v3 to v4. Preserve the
  bundled Night King and scratch texture because settings transfer does not embed
  media bytes and therefore exports those file targets as null.
- Alternatives rejected: Importing the JSON at runtime would create a hidden
  startup side effect instead of schema defaults; keeping persistence v3 would
  let old localStorage mask the new scene; treating null media values as deletion
  would remove the intended bundled default model and relief texture.
- State/output mapping: Centralized defaults feed every schema control, Reset,
  renderer fallback, canvas render scale, background/export settings, and the
  derived `model-render-triangles` performance default. Persistence v4 creates a
  clean state boundary while later user edits still persist normally.
- Files changed: default-scene values, schema persistence identity, model-budget
  fallback, aligned unit/performance/browser expectations, implementation plan,
  and this worklog.
- Verification: None, by the user's explicit instruction to make the update
  without checks.
- Skipped checks: All TypeScript, Vitest, browser, build, integrity, quick,
  targeted performance, and final verification commands were intentionally not
  run. No new performance dimension or renderer pass was added, but the existing
  default mesh workload increased from 6,000 to 14,000 triangles.
- Risks: The requested no-checks path leaves compilation, default-state parity,
  clean-start persistence, and the heavier startup render unverified for this
  iteration.

### Iteration 27 — Reapply the second exported scene without HMR seeding

- Request: The previous defaults did not appear; apply
  `frozen-settings (1).json` again.
- Task type: Tier 3 clean-start default correction with explicit persistence and
  dev-server lifecycle handling.
- User-visible result: A fresh startup now targets the second exported scene:
  x1 render scale, maximum 30,000-triangle model mesh, Progress 20, and Paint
  melt enabled, with all other values retained from that export.
- Source/reference checked: `local-reference://downloads/frozen-settings (1).json`,
  current v4 defaults, saved-port dev server, persistence wiring, model-budget
  fallback, and future clean-start expectations.
- Reference inputs: `local-reference://downloads/frozen-settings (1).json` exported
  at `2026-07-17T12:45:52.506Z`.
- Docs/contracts read: `AGENTS.md`; `docs/toolcraft/workflow.md`; Plan-phase
  decision contract/runtime boundary plus the immediately preceding default-
  settings control/layout review; Implementation-phase renderer technique plus
  the immediately preceding schema/component review; systematic-debugging and
  writing-plans workflow.
- Contract rules applied: `workflow-required`, `controls-product-coverage`,
  `persistence-policy-explicit`, and `performance-coverage-levels`.
- Decision: Stop the live dev server before introducing the v5 persistence key,
  then align the centralized defaults, model fallback, and future expectations
  with the second JSON. This prevents an HMR-connected tab holding the old state
  from immediately writing that state into the newly introduced key.
- Alternatives rejected: Another live HMR key bump could reproduce the same
  masking race; clearing all Toolcraft localStorage would destroy unrelated user
  state; importing the JSON at every startup would bypass schema Reset defaults.
- State/output mapping: Persistence v5 starts from centralized schema defaults;
  those values feed Setup render scale, model preparation budget, thaw mask,
  Melt pointer ownership, Reset, renderer fallback, and the existing
  `model-render-triangles` workload dimension.
- Files changed: second-export default values, schema persistence identity,
  model-budget fallback, aligned unit/performance/browser expectations,
  implementation plan, and this worklog.
- Verification: No automated or browser verification was run, continuing the
  user's explicit no-check instruction for this settings update. The server was
  intentionally stopped before editing and will be started fresh afterward.
- Skipped checks: TypeScript, Vitest, browser, build, integrity, quick, targeted
  performance, and final verification were not run. Only the server's mandatory
  identity startup handshake is allowed when restarting the app.
- Risks: The default preview now requests the maximum accepted/rendered triangle
  workload and is unverified in this pass; an already open page must reconnect or
  reload after the fresh server starts to read persistence v5.

### Iteration 28 — Canonical Toolcraft demo deployment

- Request: audit the uploaded Frozen folder for repository leaks, publish the
  intentional app payload, and serve it with the other examples at
  `toolcraft.sh/demos/frozen`.
- Task type: generated-app route structure and production deployment; Tier 4
  final integration. Product controls, renderer behavior, exports, persistence,
  layers, and timeline are unchanged.
- User-visible result: Frozen builds with `/demos/frozen/` as its production
  base, loads its signed Toolcraft route at that path, and exposes its bundled
  HDR plus default model and texture beneath the same canonical prefix.
- Source/reference checked: the five existing example Vite/router/Vercel
  configurations, website demo-route registry/tests, Frozen's uploaded ignore
  rules and exact unignored payload, the public Vercel production alias, and the
  live HDR-ready Frozen WebGL canvas.
- Explicit reference inputs: the bundled
  `night-king-optimized-28k.zip`, `black-painted-wall-texture.jpg`, and
  `delta_2_1k.hdr`; no new Figma, video, or reference-runtime input.
- Docs/contracts read: root and local `AGENTS.md`,
  `docs/toolcraft/workflow.md`, `core/runtime-boundary.md`,
  `assembly-workflow.md`, and `decision-contract.md`.
- Contract rules applied: `runtime-shell-required`, `workflow-required`,
  `canvas-surface-preserved`, and the signed generated-app integrity boundary.
- Decision: preserve Frozen as an independently deployed Vite project, derive
  public media from `import.meta.env.BASE_URL`, configure TanStack Router from
  that same base, order static Vercel rewrites before the SPA fallback, and
  route the website only to Frozen's public project alias.
- Alternatives rejected: root-relative media because it escapes the demo
  prefix; the protected team alias because it redirects public visitors to
  Vercel Login; bundling Frozen into the website because it couples independent
  builds and large product assets; weakening deployment protection because the
  public project alias already provides the intended boundary.
- State/output mapping: all existing schema targets, runtime commands, media
  assets, renderer passes, and export behavior remain identical. Only the URL
  used to fetch the existing default assets and the router's deployment
  basepath change; the verified canvas still reports HDR and scratch media ready.
- Repository hygiene: dependencies, build output, test output, local Toolcraft
  state, Vercel metadata, skills lock, logs, and OS files remain ignored. Local
  workstation paths were rewritten as portable `local-reference://` evidence;
  credential-pattern and oversized-file scans found no publishable leak.
- Files changed: `src/router.tsx`,
  `src/app/frozen/frozen-default-scene.ts`, its product test,
  `src/toolcraft/.toolcraft-manifest.json`, `.gitignore`, `vercel.json`, and this
  worklog. The owning `starter/src/router.tsx` receives the same basepath fix.
- Verification: targeted Frozen product tests pass; the production-base build
  passes; website route and router-contract tests pass; generated-app integrity
  accepts the re-signed protected router; the live production canvas reports
  1920×1080, HDR ready, scratch ready, and `200` for JavaScript, CSS, fonts, HDR,
  model package, texture, and orientation-gizmo chunk. Final protected and
  website gates remain recorded below when complete.
- Skipped performance work: no renderer pass, workload dimension, canvas
  interaction, or product output changed. The existing missing durable baseline
  remains a protected final-gate risk and is not bypassed or refreshed by this
  deployment-only pass.
- Risk: the app still requests the website-level `/favicon.ico`, which may return
  a non-blocking 404 until the website provides a shared icon.

## Decisions

### Renderer

- Decision: Retained Three.js/WebGL2 renderer using a volumetric
  `MeshPhysicalMaterial` with full-resolution physical transmission/refraction,
  PMREM HDRI environment, minimal shared mask/scratch shader augmentation,
  lighting-independent sRGB `MeshBasicMaterial` image faces,
  constant-detail rounded-rectangle extrusion for image caps and side walls,
  geometry-derived overlapping surface-crystal footprints, an object-space
  Voronoi blend between transparent-ice and current-frost physical lobes, and a
  canonical Toolcraft renderer pipeline. A retained object-space thermal volume
  locally subtracts from the same frozen mask and diffuses/refreezes without
  rebuilding source resources. Shell vertices and instanced
  crystal/icicle attachment points share the thaw mask, so 100% means dense
  coverage of the current frozen region rather than an override of `Progress`.
  Image-card icicles use downward, wall, and upward physical regions: downward
  instances hang with gravity, shortened lower-wall roots bend into gravity, and
  upward sites are excluded; imported 3D sources retain gravity-aligned underside
  instances. Melt Brush keeps direct
  source raycasts for on-object hits and uses a camera-keyed projected-triangle
  cache plus at most eight candidate raycasts only on pointer misses, preserving
  the pointer center outside the silhouette. Authored GLB/glTF and packaged OBJ
  materials/textures remain on the thawed source; a model-only EV uniform scales
  their final linear radiance before ACES only where the shared thaw/melt mask
  reveals the source, without changing retained ice or Image faces.
  Static source geometry uses a retained meshoptimizer LOD; crystal and icicle
  instances use reduced primitive topology plus frustum culling without reducing
  their capacity.
- Reason: Arbitrary 3D uploads, physically meaningful IOR/Fresnel reflection,
  object-space masking, instancing, orbit, and high-resolution raster export
  require retained GPU resources and environment lighting.
- Evidence: Blender research identified a scalar thaw field, Principled ice,
  two-scale surface noise, Delta 2 HDRI, crystal instances, and icicle instances.

### Timeline

- Decision: No timeline.
- Reason: Thaw progress is directly authored, the melt brush is a direct editing
  interaction, and its bounded recovery is autonomous material state rather than
  user-facing playback; no video export is requested.
- Evidence: `effect.progress` is explicit transport and the reference-mapped
  `melt.refreeze` loop has dedicated browser and animation-frame coverage.

### Layers

- Decision: No layers.
- Reason: One active uploaded model and its generated ice form one output entity.
- Evidence: File replacement/clear belongs to the runtime file uploader, not a layer stack.

### Controls

- Decision: Source, Thaw Front, Melt Brush, Ice Detail, Ice Surface, Material
  Mask, Surface Relief, Lighting, Background, and Image Export sections using built-in
  controls. Source switches conditional textured GLB/ZIP or image-to-rounded-slab
  flows and exposes a separate 3,000–30,000 static `Mesh budget`; its 3D branch
  also exposes model-only -3..+3 EV `Exposure` while Image preserves source color;
  Image mode separates `Round corners` silhouette radius from physical `Bevel`;
  surface and icicle density are geometry-relative 0–100% coverage sliders,
  `Underside` appears only for 3D gravity mode, while the five Material Mask
  sliders author one two-lobe Voronoi mix. Melt Brush conditionally groups its
  four thermal parameters, a two-choice refreeze-timing mode, and local clear
  action under one brush switch; unmodified physical M toggles that same target
  outside editable controls in any keyboard layout.
- Reason: Sections follow product entities and workflow stages; `fileDrop`, sliders, color, switch, selects, and `orientationGizmo` exactly own the requested values.
- Evidence: `PRODUCT_SPEC.md` contains the exported control-section inventory plan.

### Export

- Decision: Still-image export with required background and 2K/4K/8K image settings plus sticky Export PNG.
- Reason: The requested output is directly authored, not timeline-driven; still export is the mandatory product action.
- Evidence: The export path uses the standard Toolcraft PNG helper, selected resolution, tiled WebGL rendering, and current canvas/output state.

### Performance

- Decision: Model-package parsing, WebAssembly source LOD, and bounded
  image/scratch decoding are source-bound;
  rounded image slabs use constant-detail extrusion topology; HDRI/PMREM and prepared textures are
  retained; preview is retained WebGL at the exact selected 1.0–2.0 scale;
  crystals/icicles are instanced; export is an explicit batch pass.
  Interactive limits are 30,000 accepted source triangles, 30,000 default
  rendered source triangles, plus geometry-derived pools
  capped at 48,000 surface crystals and 12,000 underside icicles; both coverage
  percentages and physical transmission are declared preview/camera/export cost
  dimensions. The material mask adds fixed shader instructions rather than a new
  workload magnitude, and exact endpoint branches skip the Voronoi loop.
  Image slabs retain the existing 12,000-candidate icicle boundary while physical
  eligibility rejects upward/high-wall samples; fixed per-instance root/bend
  attributes add bounded vertex work inside the same draw. Thermal painting adds
  one fixed 48³ CPU/GPU field, coalesces drag
  redraws to one animation frame, and cools at a bounded approximately 30 fps
  only while nonzero heat remains and its selected timing mode permits the
  current pointer phase; it adds canonical `mask-drag` and
  `animation-frame` preview paths without a new unbounded workload dimension.
  Off-silhouette overlap reuses a camera-keyed projection of the source geometry,
  now bounded at 30,000 triangles, and performs at most eight fallback raycasts
  per direct miss. Model exposure adds one fixed-cost source-material multiply
  and uniform update on the existing preview-render path; it does not rebuild
  geometry, decode textures, or add a workload dimension.
- Reason: Source triangles, instance counts, physical transmission, render scale,
  rendered model triangles, and output pixels are the real cost dimensions.
- Evidence: Tier 4 plan requires render-plan assessment before renderer code and a first-stable protected checkpoint.
  The doubled-density Tier 3 pass derives 1,800 default/4,000 maximum directly
  from schema, preserves x2 backing, passes functional Chromium proof, and
  truthfully records the focused software-WebGL maximum-budget failures.
  Iteration 20 separates `source-triangles` from `model-render-triangles`, proves
  the real 8,550→5,999 textured GLB flow, and records the protected maximum 8K
  timeout instead of manufacturing a performance baseline.

## Evidence

- Source reviewed: supplied Blender node graph and image references, neutral
  starter schema, local Toolcraft docs, and current package/runtime public APIs.
- Contract applied: product state stays in schema/runtime commands and product output stays in `canvasContent`.
- Browser acceptance: 3D/image upload, replace/clear/reset, image rotate/flip,
  thickness/bevel, orientation drag and gizmo, all effect/material controls,
  background semantics, persistence, PNG/JPG settings, output dimensions, clean
  export, and viewport ownership.
- Browser visual acceptance: image-card icicles hang from downward sites, use
  only short gravity-bent lower-wall drips, reject upward sites, and report no
  horizontal bodies; `Underside` is absent in Image and restored in 3D. Source
  image RGB remains exact and invariant across minimum/maximum scene lighting.
  Model Exposure proves -3 EV to +3 EV foreground-luminance direction on the
  bundled textured Night King while preserving canvas dimensions and Image mode.
- Video Reference Study: the 6.733-second melt recording was decomposed into
  timecoded storyboard frames, transition deltas, thermal behavior, and seven
  mapped automated/browser acceptance rows in `appTransferMode.videoReferenceStudy`.
- Melt browser acceptance: mode locking, dependent-control visibility, heat,
  radius, edge structure, timed refreeze, during-drawing versus after-release
  cooling, explicit clear, continuous hit-bound drag, partial silhouette
  overlap, miss rejection, and stable model orientation all pass on the real
  WebGL output.
- Performance: WebGL kernel benchmark passed and all maximum-fixture inputs are
  reachable, including the current 30,000 source-triangle boundary; the
  protected full checkpoint truthfully reports seven
  constant-x2/8K paths above central software-GPU budgets, so no baseline exists.

## Verification

- Run: pnpm verify:perf
- Required protected first-stable command: `pnpm verify:perf` (the package alias
  may invoke the same checkpoint; signed reporter limitations are recorded below).

- Passed: `npm run typecheck`, focused renderer tests, and exact automated tests
  for every new runtime acceptance row.
- Passed: all product browser scenarios in the 131-test browser run; overall
  result was 130/131 because one signed provenance helper used a strict locator
  after adding a second synthetic product-output element.
- Passed: real PNG/JPG delivery and exact 2K/4K/8K decoded output dimensions in Chromium.
- Passed: `npm run verify:kernel` with the selected WebGL candidates.
- Attempted: `npm run verify:perf` twice. Fixture application reached every
  dimension, but seven maximum paths exceeded central duration/frame-gap budgets
  at constant x2 or during 8K encoding, so no protected baseline was recorded.
- Attempted: `pnpm verify:perf` as the required first-stable automated Playwright
  checkpoint; the same maximum-path failures prevented a durable baseline receipt.
- Passed: direct integrity check for all 391 signed files; production build; saved local server identity at `http://127.0.0.1:3003/`.
- Attempted: `npm run verify:final`; it stops at the signed 558-line semantic-evidence file exceeding its own 500-line template budget. A separate signed-script run passed 123/125 Node checks and failed only the two AI-skill discovery expectations. The protected performance receipt remains unavailable for the reporter/helper reason above.
- Passed for Iteration 5: `npm run typecheck`; 55 focused Vitest cases; exact
  crystal-density Chromium acceptance; live 4,000-instance/x2 browser inspection;
  `npm run verify:kernel`; direct integrity for 391 signed files.
- Attempted for Iteration 5: `npm run verify:perf:record-iteration -- --tier=3 ...`
  stopped on the pre-existing missing baseline; maximum targeted model-import and
  control-drag scenarios executed separately and exposed the recorded headless
  software-WebGL budget overruns without reducing output quality.
- Passed for Iteration 6: `npm run typecheck`; 56 focused Vitest cases; exact
  Chromium physical-ice and Transmission-output tests; production build; direct
  integrity. The clean procedural PBR screenshot was inspected at x2.
- Attempted for Iteration 6: protected kernel and iteration runners. Kernel
  execution reaches a successful production build but its signed reporter imports
  `font-catalog.json` without the JSON attribute required by current Node; the
  iteration runner stops earlier because the protected baseline is absent.
- Passed for Iteration 7: `npm run typecheck`; 59 focused Vitest cases; exact
  Chromium zero/100% surface and icicle coverage; complete PBR/x2 browser test;
  direct production build and integrity. The inspected 100% output exceeds the
  old 4,000/100 limits and visibly blankets the uploaded geometry.
- Attempted for Iteration 7: the protected targeted iteration remains blocked by
  the pre-existing absent baseline; direct performance-spec loading also reaches
  the signed JSON-import incompatibility recorded in Iteration 6.
- Passed for Iteration 8: `npm run typecheck`; 60 focused Vitest cases; exact
  Chromium fully-thawed 0→100 rendered-pixel coverage; complete PBR/x2 browser
  regression; inspected full-coverage screenshot.
- Attempted for Iteration 8: the Tier 3 protected iteration command stops before
  its selected tests because the pre-existing durable performance baseline is
  absent. No full refresh was run for this output-only correction.
- Passed for Iteration 11: TypeScript; 77 focused Vitest cases; five exact image
  source Chromium scenarios; protected kernel benchmark and production build;
  direct 391-file integrity; live x2 visual QA with generated and supplied images.
- Attempted for Iteration 11: both exact compiled image performance paths apply
  every dimension and reach the real upload/geometry action, then exceed the
  central five-second outcome-change window at the maximum combined fixture. The
  protected iteration receipt remains unavailable without the durable baseline.
- Passed for Iteration 12: TypeScript; 68 focused Vitest cases; exact image-normal
  and isolated 3D `Underside` Chromium scenarios; x2 3/4 visual inspection with
  the supplied screenshot; ten Toolcraft product gates; protected WebGL kernel
  benchmark and production build; direct integrity for 391 signed files. The
  saved server identity and `toolcraft-app-title` marker both resolve as Frozen
  at `http://127.0.0.1:3003/`.
- Attempted for Iteration 12: the exact compiled maximum image-import performance
  path reaches the real action but exceeds the central five-second outcome-change
  window under the combined software-WebGL fixture. The protected Tier 3
  iteration runner stops before its selected tests because the first-stable
  durable performance baseline is still absent.
- Passed for Iteration 13: TypeScript; 79 focused Vitest cases; exact Chromium
  unlit-image RGB proof; protected WebGL kernel benchmark and production build;
  direct integrity for 391 signed files.
- Attempted for Iteration 13: `npm run verify:quick` reaches the unchanged signed
  558/500-line framework-spec blocker. The canonical combined image-import path
  retains its five-second outcome timeout, and the protected Tier 3 iteration
  runner stops on the pre-existing absent durable baseline.
- Passed for Iteration 14: TypeScript; 80 focused Vitest cases; exact round-corner,
  image RGB, Thickness, and Bevel Chromium scenarios; 100% capsule visual QA;
  protected WebGL kernel and production build; direct integrity for 391 signed
  files.
- Attempted for Iteration 14: `npm run verify:quick` reaches the unchanged signed
  558/500-line framework-spec blocker. The exact compiled image-geometry drag
  path retains the central five-second combined-fixture timeout, and the
  protected Tier 3 iteration runner stops on the pre-existing absent baseline.
- Passed for Iteration 15: `npm run typecheck`; 24 focused thermal, schema, and
  performance tests; 74 of 75 focused acceptance/worklog tests with the only
  failure being the absent baseline receipt; all seven exact Melt Brush Chromium
  scenarios across the full and focused runs; live x2 OBJ visual QA; current-
  source protected WebGL kernel benchmark and production build.
- Passed after Iteration 15 maintainability split: 51 focused schema, melt,
  video-study, orientation, and performance cases; all ten performance gates;
  exact Chromium Structure and continuous-geometry-drag regressions; current-
  source kernel receipt; production build; direct integrity for 391 signed files.
- Attempted final gates for Iteration 15: `npm run verify:quick` and
  `npm run verify:final` stop only at the untouched signed
  `e2e/app-browser-semantic-evidence.spec.ts` 558/500-line template violation.
- Attempted for Iteration 15: both new canonical development performance paths.
  Real mask drag and thermal cooling execute, but the same combined x2/software-
  GPU maximum scene exceeds the central 500 ms interaction and 80 ms frame-gap
  budgets. `npm run verify:perf:record-iteration -- --tier=4 ...` stops at the
  pre-existing missing first-stable baseline before selecting its exact tests.
- Passed for Iteration 17: TypeScript; 16 focused projection, thermal, and
  acceptance cases; 32 performance/acceptance gates; exact Chromium fringe,
  Radius, and continuous-drag scenarios; current-source protected WebGL kernel
  benchmark and production build; direct integrity for all 391 signed files;
  saved Frozen server identity at `http://127.0.0.1:3003/`.
- Attempted for Iteration 17: the exact development mask-drag path reaches its
  real thermal action after the fixture observer repair, then exceeds the
  existing constant-x2 software-WebGL central budget at 4261.3 ms. The protected
  Tier 3 iteration runner stops at the pre-existing missing-baseline guard;
  `npm run verify:quick` stops at the untouched signed 558/500-line framework
  spec before product tests.
- Passed for Iteration 23: TypeScript; 30 focused schema, acceptance, exposure,
  and performance cases; exact Chromium model-exposure rendered-pixel and
  luminance-direction proof; production build; current-source protected WebGL
  kernel benchmark; direct integrity for all 391 signed files. The material
  module was split to 654 lines plus a focused 69-line uniform module.
- Attempted for Iteration 23: `npm run verify:quick` reaches only the unchanged
  signed 558/500-line semantic-evidence blocker. The canonical maximum
  control-drag path executes the real live slider but retains the known
  constant-x2/full-coverage software-WebGL budget failure (4606.2 ms versus
  500 ms). The protected Tier 3 iteration runner stops at the pre-existing
  missing durable-baseline guard.
- Passed for Iteration 24: pre-fix fully frozen screenshot reproduction;
  TypeScript; 15 focused exposure/performance cases; exact Chromium fully-frozen
  invariance plus fully-thawed EV direction; production build; current-source
  protected WebGL kernel; and direct integrity for all 391 signed files.
- Attempted for Iteration 24: `npm run verify:quick` reaches only the unchanged
  signed 558/500-line semantic-evidence blocker. The exact protected Tier 3
  iteration command stops at the pre-existing missing durable-baseline guard
  before selecting the already-passed functional browser check.
- Passed for Iteration 25: TypeScript; six focused Melt shortcut/control cases;
  exact Chromium Melt Brush acceptance including M off/on and editable-control
  exclusion; production build; and direct integrity for all 391 signed files.
- Attempted for Iteration 25: `npm run verify:quick` reaches only the unchanged
  signed 558/500-line semantic-evidence blocker before product tests. No
  performance receipt is required for this Tier 2 fixed-cost input mapping.

## Risks

- Risk: The untouched signed starter currently fails its own 500-line e2e health budget while passing integrity; the protected file cannot be patched locally.
- Risk: The current interactive version enforces a 30,000-triangle ceiling;
  larger arbitrary meshes require decimation, LOD, or worker-based preprocessing.
- Risk: WebGL2 approximates Blender's OpenVDB ice shell with a displaced overlay; exact dynamic volume remeshing is out of scope.
- Risk: The protected full-performance receipt remains unavailable because the
  quality-preserving constant-x2/8K maximum checkpoint exceeds central budgets;
  true physical transmission intentionally adds the full-resolution pre-pass,
  and maximum geometry-relative coverage now increases the instanced workload.
- Risk: The signed provenance spec creates a second product-output node and then
  addresses the selector in strict mode; the full browser suite therefore ends
  130/131 despite every product-owned scenario passing.
- Risk: The maximum combined image fixture can exceed the protected five-second
  response window under software WebGL; the normal interactive image path is
  bounded, but no quality-reducing fallback was introduced in this pass.
- Risk: Normal-aligned frost crystals can read as side needles at extreme
  coverage/elongation, but they remain a separate explicit surface-crystal layer;
  image-card icicles now obey gravity and remain under the existing 12,000-instance
  cap.

### Iteration 29 — Shared Toolcraft social preview

- User-visible result: Social shares of the app now use the main Toolcraft 1200×630 preview image through Open Graph and Twitter metadata.
- Source and contract: `apps/website/public/social-previews/og-toolcraft-v2.jpg` remains the single asset source. The metadata uses its absolute `https://toolcraft.sh/` URL so neither the `/demos/frozen/` Vite base nor a direct Vercel hostname can rewrite it incorrectly. The owning starter template was updated and Frozen's protected `index.html` hash was re-signed with the repository signing authority.
- Verification tier: Tier 0. Product schema, runtime state, renderer, canvas, exports, and performance are unchanged. The repository metadata contract, production build, built-HTML base-path inspection, website typecheck/build, starter tests/typecheck, CLI generation tests, and direct integrity for all 391 signed files passed; production verification follows the pushed commit.
