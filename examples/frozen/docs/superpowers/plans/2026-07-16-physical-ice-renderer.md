# Physical Ice Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing fake translucent ice overlay with a sharp, object-masked, HDRI-lit physical ice renderer with triplanar scratch relief and fully adjustable crystals and icicles.

**Architecture:** Keep Toolcraft state and controls in the schema, map flat runtime targets into nested typed renderer settings, and keep uploaded model/texture/HDRI resources outside serializable settings. Delegate lighting to `MeshPhysicalMaterial`; isolate the only app-specific shader work—effect-space masking and triplanar relief—inside one material controller, while environment, texture preparation, instances, preview sizing, and scene orchestration remain focused modules.

**Tech Stack:** React 19, TypeScript, Three.js/WebGL2, `MeshPhysicalMaterial`, `RGBELoader`, `PMREMGenerator`, Toolcraft schema/runtime pipelines, Vitest, Playwright.

---

This standalone folder is not a git repository. Execute the checkpoints below in
the current workspace and record them in `docs/toolcraft/agent-worklog.md`; omit
commit commands rather than inventing version-control evidence. Multi-agent
execution is not authorized for this run, so execute inline.

## File Structure

- Create `src/app/frozen/frozen-environment.ts`: owns Delta 2 HDRI/PMREM and fallback environment lifecycle.
- Create `src/app/frozen/frozen-texture.ts`: owns scratch image decode, luminance conversion, transform application, limits, and disposal.
- Create `src/app/frozen/frozen-material.ts`: owns physical material defaults, shared mask/triplanar shader augmentation, and uniform updates.
- Create `src/app/frozen/frozen-instances.ts`: owns crystal/icicle geometry, deterministic transforms, profile updates, and zero semantics.
- Create `src/app/frozen/frozen-preview-size.ts`: pure preview backing-size policy.
- Create `src/app/frozen/assets/delta_2_1k.hdr`: local CC0 reference environment from Poly Haven.
- Create `THIRD_PARTY_ASSETS.md`: records the HDRI source and license.
- Modify `src/app/frozen/frozen-model.ts`: return effect-space transform data and use a lit OBJ/STL fallback material.
- Modify `src/app/frozen/frozen-values.ts`: replace the flat settings bag with nested typed settings.
- Rewrite `src/app/frozen/frozen-scene.ts`: keep only scene/camera/resource/render orchestration.
- Modify `src/app/frozen/frozen-output.tsx`: prepare model and scratch resources independently and apply one atomic renderer snapshot.
- Delete `src/app/frozen/frozen-ice-material.ts`: custom lighting is superseded by the physical material controller.
- Modify `src/app/app-schema.ts`: add the approved controls and Resolution Scale 2.
- Modify `src/app/app-renderer-pipeline.ts`: add scratch preparation and exact invalidation.
- Modify `src/app/app-performance.ts` and `src/app/app-performance-impact.json`: add scratch pixels and x2 preview coverage.
- Modify `src/app/app-acceptance-data.ts`: cover every new control and texture lifecycle.
- Add focused tests under `src/app/frozen/*.test.ts` and product browser coverage in `e2e/app-controls.spec.ts` / `e2e/frozen-test-helpers.ts`.
- Update `PRODUCT_SPEC.md`, `docs/toolcraft/agent-worklog.md`, and acceptance/performance inventories.

### Task 1: Record Verification Scope And Reference Contract

**Files:**
- Modify: `docs/toolcraft/agent-worklog.md`
- Modify: `PRODUCT_SPEC.md`

- [ ] **Step 1: Add the implementation verification note**

Record exactly:

```md
Verification tier: Tier 4
Reason: broad physical-material, WebGL renderer, media-resource, render-scale,
schema, acceptance, and performance rewrite prompted by a visual-quality issue.
Run: targeted Vitest per task; verify:quick; kernel benchmark; focused browser
mask/HDRI/texture/icicle/x2/export checks; protected performance checkpoint;
direct integrity; verify:final; real local browser.
Skip: timeline, layers, and video checks because the approved product remains a
single still-output scene with no animation transport.
```

- [ ] **Step 2: Add a Decision Trail entry**

Record the Blender material values, Delta 2 environment, screenshot mismatch,
approved physical-material approach, rejected custom-shader extension, exact
control/resource mapping, and signed verification blockers already present.

- [ ] **Step 3: Update the product spec renderer and control inventories**

Replace the old custom-lighting/1.5× statements with the approved nested
sections and x2 policy from the design document.

- [ ] **Step 4: Run documentation consistency checks**

Run:

```bash
rg -n "1\.5|512 px|ShaderMaterial|HD/2K|40 icicles|step 20" \
  PRODUCT_SPEC.md docs/toolcraft/agent-worklog.md
```

Expected: no stale product-decision claims remain; historical evidence is
explicitly marked historical if retained.

### Task 2: Define Nested Settings And Schema Controls

**Files:**
- Modify: `src/app/frozen/frozen-values.ts`
- Modify: `src/app/app-schema.ts`
- Create: `src/app/frozen/frozen-values.test.ts`
- Modify: `src/app/app-schema.test.ts`

- [ ] **Step 1: Write failing settings tests**

Add tests that expect this shape and reference defaults:

```ts
const settings = getFrozenSceneSettings(createToolcraftState(appSchema));
expect(settings.surface).toMatchObject({
  color: "#C5EFFF",
  ior: 1.45,
  transmission: 0.9,
});
expect(settings.viewport.renderScale).toBe(2);
expect(settings.icicles).toMatchObject({ density: 20, length: 0.4, radius: 0.2 });
expect(settings.scratch.offset).toEqual({ x: 0, y: 0 });
```

Also assert clamping for every new numeric target and exact zero preservation for
icicle density, length, and radius.

- [ ] **Step 2: Run the new tests and confirm failure**

Run:

```bash
npx vitest run src/app/frozen/frozen-values.test.ts src/app/app-schema.test.ts
```

Expected: FAIL because nested settings and new targets do not exist.

- [ ] **Step 3: Implement the nested type contract**

Replace the flat settings type with:

```ts
export type FrozenSceneSettings = Readonly<{
  background: Readonly<{ color: string; include: boolean }>;
  crystals: Readonly<{ density: number; elongation: number; size: number; variation: number }>;
  icicles: Readonly<{
    density: number;
    length: number;
    radius: number;
    threshold: number;
    variation: number;
  }>;
  lighting: Readonly<{ environmentIntensity: number; environmentRotation: number; exposure: number }>;
  mask: Readonly<{ noiseScale: number; progress: number; transition: number; turbulence: number }>;
  scratch: Readonly<{
    bump: number;
    contrast: number;
    displacement: number;
    invert: boolean;
    offset: Readonly<{ x: number; y: number }>;
    rotation: number;
    roughnessInfluence: number;
    scale: number;
  }>;
  surface: Readonly<{
    color: string;
    ior: number;
    roughness: number;
    roughnessVariation: number;
    shellThickness: number;
    transmission: number;
  }>;
  viewport: Readonly<{
    height: number;
    orientation: ToolcraftOrientationPose;
    renderScale: number;
    width: number;
  }>;
}>;
```

Use explicit readers for finite numbers, colors, and `{x,y}` vectors. Convert
percent controls to normalized values only in this mapper.

- [ ] **Step 4: Implement the approved schema**

Set `canvas.renderScale` to `{ min: 1, max: 2, step: 0.5, defaultValue: 2 }`.
Declare Object, Freeze Mask, Ice Surface, Scratch Texture, Scratch Relief,
Crystals, Icicles, Lighting, Background, Image Export, and sticky actions in the
approved order. Use `fileDrop` with `assetKind: "image"` and
`target: "source.scratchTexture"`; use built-in `vector` for `scratch.offset`.
Keep every resettable control's `defaultValue` identical to the settings mapper.

- [ ] **Step 5: Run focused tests**

Run the Task 2 Vitest command again. Expected: PASS.

### Task 3: Make Mask Mathematics Explicit And Effect-Space Stable

**Files:**
- Modify: `src/app/frozen/frozen-math.ts`
- Create: `src/app/frozen/frozen-math.test.ts`
- Modify: `src/app/frozen/frozen-model.ts`

- [ ] **Step 1: Write failing endpoint and transform tests**

Cover exact full-frozen/full-thawed endpoints and child transforms:

```ts
expect(getRetainedIceMaskAtHeight(1, 0.5, fullFrozen)).toBe(1);
expect(getRetainedIceMaskAtHeight(-1, 0.5, fullThawed)).toBe(0);
expect(maskAtEffectPoint(worldToEffect, transformedWorldPoint, boundary))
  .toBeCloseTo(maskAtEffectPoint(identity, effectPoint, boundary), 6);
```

Assert monotonic thawing at top, middle, and bottom sample heights.

- [ ] **Step 2: Run and confirm the tests fail**

```bash
npx vitest run src/app/frozen/frozen-math.test.ts
```

- [ ] **Step 3: Implement one canonical boundary model**

Keep `FrozenBoundary` as normalized front/half-band/amplitude values and make the
CPU function match the GLSL formula in the design exactly. Extend
`FrozenPreparedModel` with `effectBounds` and `worldToEffect: THREE.Matrix4` so
all child meshes and samples share one normalized coordinate system.

- [ ] **Step 4: Replace unlit fallback materials**

For OBJ/STL only, assign:

```ts
new THREE.MeshStandardMaterial({
  color: 0x101722,
  metalness: 0,
  roughness: 0.1,
});
```

Preserve GLB materials. Do not add a format branch anywhere outside model
preparation.

- [ ] **Step 5: Run math and model tests**

Run the Task 3 test plus `src/app/frozen-product.test.ts`. Expected: PASS after
updating old flat-setting references to the nested contract.

### Task 4: Add The HDRI Environment Owner

**Files:**
- Create: `src/app/frozen/assets/delta_2_1k.hdr`
- Create: `src/app/frozen/frozen-environment.ts`
- Create: `src/app/frozen/frozen-environment.test.ts`
- Create: `THIRD_PARTY_ASSETS.md`

- [ ] **Step 1: Acquire and verify the exact CC0 asset**

Download:

```bash
curl -fL \
  https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/delta_2_1k.hdr \
  -o src/app/frozen/assets/delta_2_1k.hdr
```

Verify it is non-empty and begins with an RGBE header:

```bash
test -s src/app/frozen/assets/delta_2_1k.hdr
head -c 10 src/app/frozen/assets/delta_2_1k.hdr
```

Expected header contains `#?RADIANCE`.

- [ ] **Step 2: Record provenance**

`THIRD_PARTY_ASSETS.md` must name `Delta 2`, author Greg Zaal, source
`https://polyhaven.com/a/delta_2`, and CC0 license.

- [ ] **Step 3: Write failing environment lifecycle tests**

Test the public contract using injected loader/PMREM dependencies:

```ts
const environment = await createFrozenEnvironment(renderer, { loadHdr });
environment.apply(scene, { environmentIntensity: 1.5, environmentRotation: Math.PI });
expect(scene.environment).toBe(environment.texture);
expect(scene.environmentIntensity).toBe(1.5);
environment.dispose();
expect(disposeTexture).toHaveBeenCalledOnce();
```

Also test that HDR failure installs a `RoomEnvironment` PMREM rather than a null
environment.

- [ ] **Step 4: Implement environment lifecycle**

Use `RGBELoader.loadAsync`, `PMREMGenerator.fromEquirectangular`, and
`RoomEnvironment` fallback. Expose only:

```ts
export type FrozenEnvironment = Readonly<{
  apply(scene: THREE.Scene, settings: FrozenSceneSettings["lighting"]): void;
  dispose(): void;
  texture: THREE.Texture;
}>;

export async function createFrozenEnvironment(
  renderer: THREE.WebGLRenderer,
): Promise<FrozenEnvironment>;
```

Do not expose loader or render-target internals to `FrozenSceneRenderer`.

- [ ] **Step 5: Run the environment tests**

Expected: PASS with both HDR and fallback branches.

### Task 5: Add Scratch Texture Preparation

**Files:**
- Create: `src/app/frozen/frozen-texture.ts`
- Create: `src/app/frozen/frozen-texture.test.ts`
- Modify: `src/app/frozen/frozen-output.tsx`

- [ ] **Step 1: Write failing luminance and transform tests**

Test pure helpers with a 2×2 RGBA fixture. Assert Rec.709 luminance, invert,
90/180/270-degree runtime transforms, flips, proportional 2,048 px limiting,
and deterministic source identity.

```ts
expect(toLuminance(255, 0, 0)).toBeCloseTo(0.2126, 4);
expect(limitScratchSize(4096, 1024)).toEqual({ width: 2048, height: 512 });
expect(transformScratchPoint({ x: 0, y: 0 }, { rotationDeg: 90 }))
  .toEqual({ x: 1, y: 0 });
```

- [ ] **Step 2: Run and confirm failure**

```bash
npx vitest run src/app/frozen/frozen-texture.test.ts
```

- [ ] **Step 3: Implement the prepared resource**

Expose:

```ts
export type FrozenPreparedTexture = Readonly<{
  height: number;
  sourceId: string;
  texture: THREE.CanvasTexture;
  width: number;
}>;

export async function loadFrozenScratchTexture(
  asset: ToolcraftMediaAsset,
): Promise<FrozenPreparedTexture>;

export function disposeFrozenScratchTexture(resource: FrozenPreparedTexture): void;
```

Fetch the asset data URL, decode with `createImageBitmap`, apply
`asset.transform`, draw to a bounded canvas, convert RGB to grayscale, create a
linear non-color `CanvasTexture`, set RepeatWrapping, and close the bitmap in a
`finally` block.

- [ ] **Step 4: Wire a separate scratch preparation pass in output**

Filter `state.mediaAssets` by `source.scratchTexture`; never overload
`getModelAsset`. Keep the previous valid prepared texture until the new pass
succeeds, then include model and texture in one renderer resource update.

- [ ] **Step 5: Run focused tests and typecheck**

```bash
npx vitest run src/app/frozen/frozen-texture.test.ts
npm run typecheck
```

Expected: PASS.

### Task 6: Replace Custom Lighting With The Physical Material Controller

**Files:**
- Create: `src/app/frozen/frozen-material.ts`
- Create: `src/app/frozen/frozen-material.test.ts`
- Delete: `src/app/frozen/frozen-ice-material.ts`

- [ ] **Step 1: Write failing reference-preset tests**

```ts
const controller = createFrozenMaterialController();
expect(controller.material).toBeInstanceOf(THREE.MeshPhysicalMaterial);
expect(controller.material.ior).toBe(1.45);
expect(controller.material.transmission).toBe(0.9);
expect(controller.material.color.getHexString().toUpperCase()).toBe("C5EFFF");
expect(controller.material.customProgramCacheKey()).toContain("frozen-physical-v2");
```

Test that `update()` writes mask, world-to-effect, scratch mapping, relief, and
roughness uniforms to every compiled shader variant.

- [ ] **Step 2: Run and confirm failure**

```bash
npx vitest run src/app/frozen/frozen-material.test.ts
```

- [ ] **Step 3: Implement a centralized shader augmentation**

Construct `MeshPhysicalMaterial` with the reference defaults and one
`onBeforeCompile` function. The injected vertex/fragment chunks must:

- compute `vEffectPosition` from `uWorldToEffect * worldPosition`;
- evaluate the exact canonical freeze mask;
- discard only when `iceMask` is below epsilon;
- triplanar-sample the prepared luminance texture or deterministic procedural
  fallback;
- offset shell vertices by `normal * displacement * height * iceMask`;
- perturb fragment normal from height derivatives;
- modulate `roughnessFactor` without replacing Three.js physical lighting.

Expose a typed controller:

```ts
export type FrozenMaterialController = Readonly<{
  dispose(): void;
  material: THREE.MeshPhysicalMaterial;
  update(input: Readonly<{
    model: FrozenPreparedModel;
    settings: FrozenSceneSettings;
    texture: FrozenPreparedTexture | null;
  }>): void;
}>;
```

Track every compiled shader variant in a `Set` so instanced and non-instanced
programs receive the same uniforms. Set `customProgramCacheKey` explicitly.

- [ ] **Step 4: Remove the old shader module**

Delete `frozen-ice-material.ts` and all imports. Do not preserve its diffuse,
specular, fake transmission, or world-space mask branches.

- [ ] **Step 5: Run material tests and typecheck**

Expected: PASS with no references to `createFrozenIceMaterial` or
`applyFrozenIceUniforms`.

### Task 7: Make Crystal And Icicle Profiles Explicit

**Files:**
- Create: `src/app/frozen/frozen-instances.ts`
- Create: `src/app/frozen/frozen-instances.test.ts`
- Modify: `src/app/frozen/frozen-scene.ts`

- [ ] **Step 1: Write failing zero/profile tests**

```ts
expect(getVisibleIcicleCount({ density: 20, length: 0, radius: 0.2 })).toBe(0);
expect(getVisibleIcicleCount({ density: 20, length: 0.4, radius: 0 })).toBe(0);
expect(getVisibleIcicleCount({ density: 1, length: 0.01, radius: 0.01 })).toBe(1);
```

Assert radius, length, variance, and threshold change instance matrices
independently; assert crystal size and elongation are separate axes.

- [ ] **Step 2: Run and confirm failure**

```bash
npx vitest run src/app/frozen/frozen-instances.test.ts
```

- [ ] **Step 3: Implement instance resource ownership**

Move deterministic `variation`, crystal transforms, icicle transforms, geometry,
and disposal out of `frozen-scene.ts`. Expose:

```ts
export type FrozenInstanceResources = Readonly<{
  crystals: THREE.InstancedMesh;
  dispose(): void;
  icicles: THREE.InstancedMesh;
  update(settings: Pick<FrozenSceneSettings, "crystals" | "icicles">): void;
}>;
```

Use count step 1. Apply underside threshold during prepared sample selection or
instance visibility, not through scattered render-time conditionals.

- [ ] **Step 4: Run instance tests**

Expected: PASS and `frozen-scene.ts` no longer contains cone construction or
matrix loops.

### Task 8: Rebuild Scene Orchestration And Crisp Preview Sizing

**Files:**
- Create: `src/app/frozen/frozen-preview-size.ts`
- Create: `src/app/frozen/frozen-preview-size.test.ts`
- Rewrite: `src/app/frozen/frozen-scene.ts`
- Modify: `src/app/frozen/frozen-output.tsx`
- Modify: `src/app/frozen/frozen-export.ts`

- [ ] **Step 1: Write failing preview-size tests**

```ts
expect(getFrozenPreviewSize({
  cssHeight: 450,
  cssWidth: 800,
  outputHeight: 1080,
  outputWidth: 1920,
  renderScale: 2,
})).toEqual({ height: 900, width: 1600 });
```

Also prove scale 1 and 1.5, output-aspect preservation, and no 512 px cap.

- [ ] **Step 2: Run and confirm failure**

```bash
npx vitest run src/app/frozen/frozen-preview-size.test.ts
```

- [ ] **Step 3: Implement the sizing policy**

Calculate from actual CSS bounds and selected render scale. Preserve the selected
quality during control/model drag. Coalesce renders through one requestAnimationFrame
queue; remove the 256 px interaction LOD and 250 ms low-to-high quality branch.

- [ ] **Step 4: Rewrite the scene as an orchestrator**

`FrozenSceneRenderer.create(canvas)` asynchronously creates WebGL, environment,
and fallback resources. `setResources({ model, scratchTexture })` swaps the
complete resource snapshot atomically, creates shell/material/instances, retains
the old snapshot through the first valid new frame, then disposes it.

`renderFrame` may configure only clear/background, camera/view offset, environment,
material controllers, instance profiles, and renderer invocation. Keep
`frozen-scene.ts` below 300 lines.

- [ ] **Step 5: Keep preview and export on one scene path**

`renderPreview`, `render`, and `renderTile` call the same `renderFrame`. Export
must not substitute a lower material, disable HDRI, ignore scratch, or change
mask coordinates. Restore preview once after tiled export.

- [ ] **Step 6: Run focused tests and typecheck**

```bash
npx vitest run \
  src/app/frozen/frozen-preview-size.test.ts \
  src/app/frozen/frozen-material.test.ts \
  src/app/frozen/frozen-instances.test.ts
npm run typecheck
```

Expected: PASS and `wc -l src/app/frozen/frozen-scene.ts` reports at most 300.

### Task 9: Update Canonical Pipeline, Performance, And Impact Ownership

**Files:**
- Modify: `src/app/app-renderer-pipeline.ts`
- Modify: `src/app/app-performance.ts`
- Modify: `src/app/app-performance-impact.json`
- Modify: `e2e/app-performance-path-adapters.ts`
- Modify: `e2e/app-performance.spec.ts`
- Modify: `e2e/app-kernel-benchmarks.ts`

- [ ] **Step 1: Write failing pipeline/performance assertions**

Assert a memoized `scratch-prepare` pass keyed by `source.scratchTexture`, x2
preview maximum, one bounded `scratch-source-pixels` dimension, and ownership for
every new production module.

- [ ] **Step 2: Run focused performance gates and confirm failure**

```bash
npx vitest run src/app/app-performance.test.ts src/app/app-performance.gates.test.ts
```

- [ ] **Step 3: Implement exact pipeline invalidation**

Add `scratch-prepare` to pass types. `media-import` for the model invalidates
model/preview; scratch replacement invalidates scratch/preview. Surface, mask,
scratch mapping, crystal, icicle, lighting, background, and x2 controls invalidate
preview only. Orientation invalidates camera render. Export settings remain
export-only.

- [ ] **Step 4: Extend the workload envelope**

Add scratch prepared pixels with a bounded external-input adapter and extend
preview render scale entries through 2. Update cost descriptions for physical
transmission/triplanar sampling without inventing authored timing thresholds.

- [ ] **Step 5: Refresh kernel candidates and impact ownership**

Keep WebGL as the selected canonical technique, add every new production module
to `app-performance-impact.json`, and name exact pass ids for performance-owned
modules.

- [ ] **Step 6: Run the protected kernel benchmark**

```bash
NODE_OPTIONS='--loader=/tmp/toolcraft-json-module-loader.mjs' npm run verify:kernel
```

Expected: current-source WebGL kernel receipt recorded.

### Task 10: Add Fidelity-Meaningful Acceptance

**Files:**
- Modify: `src/app/app-acceptance-data.ts`
- Modify: `src/app/frozen-product.test.ts`
- Modify: `e2e/frozen-test-helpers.ts`
- Modify: `e2e/app-controls.spec.ts`
- Add: `e2e/fixtures/frozen-scratch.png` if a binary fixture is preferable to an in-memory PNG.

- [ ] **Step 1: Add acceptance rows for every visible target**

Cover IOR, roughness variation, scratch media lifecycle and every scratch mapping
target, crystal profile, icicle radius/variation/threshold, lighting controls,
and x2 backing resolution. Maintain compound Vector X/Y semantic coverage.

- [ ] **Step 2: Add pixel-region helpers**

Use WebGL canvas readback/downsampling to return hashes and luminance/alpha counts
for explicit top, middle, and bottom regions. Do not count `data-*` attribute
changes as mask/material evidence.

- [ ] **Step 3: Write failing reference-behavior browser tests**

Using a known asymmetric OBJ and deterministic scratch PNG, prove:

```text
progress 0: top and bottom contain ice contribution
progress 50: top is thawed and bottom remains ice
progress 100: generated ice contribution is absent
orbit: the same object-space regions retain their classification
scratch attach/replace/clear: pixels change, change again, then restore fallback
icicle count/length/radius 0: no icicle-region pixels remain
x2: canvas.width equals round(cssWidth * 2)
```

Also prove environment rotation moves highlights and 2K/4K/8K exports retain the
same mask/material behavior.

- [ ] **Step 4: Run targeted browser acceptance**

```bash
TOOLCRAFT_TEST_PORT=3010 \
NODE_OPTIONS='--loader=/tmp/toolcraft-json-module-loader.mjs' \
npx playwright test e2e/app-controls.spec.ts --workers=1 \
  --grep 'mask|HDRI|scratch|icicle|resolution scale|export'
```

Expected: all selected tests pass without evidence-reporter errors.

### Task 11: Final Verification And Delivery

**Files:**
- Modify: `docs/toolcraft/agent-worklog.md`

- [ ] **Step 1: Run the quick functional gate**

```bash
npm run verify:quick
```

Expected: product source, schema, typecheck, and unit gates pass.

- [ ] **Step 2: Run the complete browser acceptance suite**

```bash
TOOLCRAFT_TEST_PORT=3010 \
NODE_OPTIONS='--loader=/tmp/toolcraft-json-module-loader.mjs' \
npm run test:browser
```

Expected: all product browser acceptance passes. If the signed JSON-import issue
recurs, retain the documented temporary loader and do not edit signed config.

- [ ] **Step 3: Run targeted/full performance evidence required by lifecycle**

Because this pass changes renderer cost and explicitly raises selected preview
quality, run the protected checkpoint available to the missing-baseline app:

```bash
NODE_OPTIONS='--loader=/tmp/toolcraft-json-module-loader.mjs' npm run verify:perf
```

Expected product outcome: media import, scratch replacement, slider drag, orbit,
x2 preview, and export scenarios pass. If the already documented signed
reporter/helper mismatch still prevents receipt creation, record exact passing
product tests and exact protected rejection without modifying signed files.

- [ ] **Step 4: Run final integrity and final gate**

```bash
node scripts/check-toolcraft-integrity.mjs
NODE_OPTIONS='--loader=/tmp/toolcraft-json-module-loader.mjs' npm run verify:final
```

Expected: integrity passes. Report any unchanged signed-template blockers
separately from product failures.

- [ ] **Step 5: Verify the real local app**

Start or reuse the saved server:

```bash
npm run dev
```

Use the browser workflow on the verified URL. Upload real OBJ and GLB files,
attach a grayscale scratch map, inspect progress 0/50/100 from multiple angles,
set icicle count/length/radius to zero and minimum nonzero values, check x2
sharpness, rotate HDRI, and export one PNG.

- [ ] **Step 6: Finalize worklog evidence**

Record files changed, exact verification outputs, visual comparison against the
Blender render, performance evidence or protected blockers, remaining OpenVDB
fidelity limits, and the verified local URL.
