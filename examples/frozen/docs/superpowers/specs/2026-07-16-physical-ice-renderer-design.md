# Frozen Physical Ice Renderer Design

Date: 2026-07-16
Status: awaiting written-spec review
Verification tier: Tier 4

## Objective

Replace the current flat translucent overlay with a reference-faithful physical
ice renderer for arbitrary uploaded GLB, OBJ, and STL models. The result must
thaw from top to bottom, follow the normalized object rather than the camera or
canvas, support a user-provided grayscale scratch texture, use real HDR image
based lighting, render sharply at Resolution Scale 2, and allow icicles to be
reduced continuously to none.

## Reference Evidence

The visual source of truth is:

- `local-reference://desktop/Geometry Node Freeze Effect.blend`;
- `local-reference://captures/CleanShot 2026-07-16 at 13.04.14@2x.png` as evidence of the current mismatch;
- a headless render of frame 1 from the Blender file;
- the inspected Blender `Ice` material and World nodes.

The Blender material uses:

- Principled BSDF base color approximately `#C5EFFF` in display space;
- transmission `0.9`;
- IOR `1.45`;
- Noise Texture into Bump with Scale `50`, Detail `5.7`, Roughness `0.783`;
- a second noise source driving roughness with Scale `5`, Detail `14`,
  Roughness `0.933`;
- the packed `delta_2_4k.hdr` environment.

The matching public source is Poly Haven's `Delta 2` HDRI, released under CC0.
The application will use a local 1K HDR copy for predictable startup and PMREM
quality; the environment lights and reflects in the model but does not replace
the configurable product background.

## Audit Conclusions And Required Structural Change

The existing custom `ShaderMaterial` is not an acceptable base for this pass.
Its `transmission` is opacity, its `roughness` is a specular exponent, it has no
IOR/refraction/environment BRDF, and its mask affects only the overlay while the
source mesh remains fully visible. OBJ and STL additionally use unlit
`MeshBasicMaterial`. Extending that shader would preserve the wrong lighting
model and create more renderer-specific conditionals.

The code-judo move is to delete the custom lighting equations and delegate the
physical BRDF to Three.js `MeshPhysicalMaterial`. App-owned shader augmentation
is limited to two concerns that Three.js does not own: the shared freeze mask
and triplanar scratch sampling. This removes an entire category of lighting code
instead of reproducing more of Blender's Principled shader by hand.

`FrozenSceneRenderer` will not absorb HDRI loading, texture decoding, material
compilation, and instance-profile logic. The following focused owners are
required:

- `frozen-environment.ts`: RGBE loading, PMREM creation, rotation/intensity,
  and disposal;
- `frozen-texture.ts`: uploaded image decoding, luminance preparation,
  size enforcement, and texture disposal;
- `frozen-material.ts`: physical ice material and one centralized shader
  augmentation contract;
- `frozen-instances.ts`: crystal/icicle geometry and instance transforms;
- `frozen-scene.ts`: camera, scene orchestration, render sizing, hit testing,
  and resource composition only.

No product file may approach 1,000 lines. The renderer orchestrator must stay
below 300 lines after extraction, and dependencies remain acyclic.

## Rendering Model

### Effect Coordinate Space

Every source mesh, shell vertex, crystal anchor, and icicle anchor is evaluated
in the same normalized effect space. The renderer supplies `uWorldToEffect` and
computes:

```text
p = (uWorldToEffect * worldPosition).xyz
h = clamp((p.y - minY) / max(maxY - minY, epsilon), 0, 1)
```

The mask remains attached to the uploaded object across camera orbit, internal
GLB child transforms, preview, and tiled export.

### Top-To-Bottom Freeze Mask

Let `progress` be 0 for fully frozen and 1 for fully thawed. The disturbed front
is extended beyond the bounds at both endpoints so the endpoints are exact:

```text
n = fbm(p * noiseScale) - 0.5
front = mix(1 + halfBand + amplitude/2,
            -halfBand - amplitude/2,
            progress)
iceMask = 1 - smoothstep(front - halfBand,
                         front + halfBand,
                         h + n * amplitude)
```

The same function is compiled once into shell, crystal, and icicle materials.
The thawed source material remains visible. The frozen region adds the physical
ice coating over the source, matching the Blender construction. At progress 1
the generated ice contributes zero pixels; at progress 0 it covers the complete
source surface.

### Physical Ice

The ice coating uses `MeshPhysicalMaterial` with the reference preset:

- tint `#C5EFFF`;
- transmission `0.9`;
- IOR `1.45`;
- non-metallic specular response;
- physical thickness driven by Shell Thickness;
- base roughness plus low-frequency roughness variation;
- ACES filmic tone mapping;
- PMREM-filtered Delta 2 environment reflections.

GLB materials remain intact beneath the ice. OBJ and STL receive a dark glossy
`MeshStandardMaterial` fallback comparable to the visible source material in the
Blender reference, never an unlit white `MeshBasicMaterial`.

### Scratch Texture And Relief

`source.scratchTexture` is an optional image-only `fileDrop`. The image is
decoded once, converted to luminance, and downscaled proportionally to a maximum
2,048 px edge. Media remains runtime-owned and is not mirrored into values.

The texture is sampled in effect-space triplanar projection, so models without
UV coordinates behave identically. Projection Scale, Rotation, Offset, and
Invert transform all three planes through one typed mapping contract. Normal
weights blend the projections without axis seams.

The processed height is:

```text
sample = invert ? 1 - luminance : luminance
height = clamp((sample - 0.5) * contrast + 0.5, 0, 1)
```

Height affects:

- vertex displacement along the shell normal for macro relief;
- fragment normal perturbation for fine scratches;
- roughness modulation for frosted variation.

Vertex displacement fidelity remains bounded by uploaded topology. Fine detail
must remain visible through bump/normal perturbation even on low-poly meshes;
dynamic OpenVDB remeshing is not part of this pass. When no texture is attached,
a deterministic procedural noise fallback reproduces the Blender material's
fine bump and broad roughness variation.

### Crystals And Icicles

Crystals and icicles remain instanced, but their shape profiles are explicit
typed values instead of fixed constants hidden in matrix-building functions.

Icicle count uses step 1. Length, Radius, or Count at zero sets the visible
instance count to zero; no degenerate zero-height cones remain in the scene.
Length, radius, variance, and underside threshold are independent. All icicles
remain gravity-aligned and their mask uses the same effect coordinates as the
shell.

Crystals expose density, size, elongation, and variance. Defaults are reduced
from the current spike-heavy result so the surface reads as frosted ice first
and discrete crystals second.

## Controls And State

All controls use built-in Toolcraft schema components. No custom control is
needed. The exported `appControlSectionInventory` will declare:

### Object

- `source.model`: fileDrop for GLB/OBJ/STL;
- `scene.orientation`: hidden canvas `orientationGizmo` target.

### Freeze Mask

- `effect.progress`: 0–100%, default 0, step 1;
- `effect.transition`: 1–30%, default 12, step 1;
- `effect.noiseScale`: 0.5–12, default 3.5, step 0.1;
- `effect.turbulence`: 0–40%, default 18, step 1.

### Ice Surface

- `ice.color`: default `#C5EFFF`;
- `ice.transmission`: 0–100%, default 90;
- `ice.ior`: 1.0–2.0, default 1.45, step 0.01;
- `ice.roughness`: 0–100%, default 50;
- `ice.roughnessVariation`: 0–100%, default 65;
- `ice.shellThickness`: 0–12%, default 3, step 0.5.

### Scratch Texture

- `source.scratchTexture`: image fileDrop;
- `scratch.scale`: 0.25–20, default 5;
- `scratch.rotation`: 0–360°, default 0;
- `scratch.offset`: built-in Vector, default `{ x: 0, y: 0 }`;
- `scratch.invert`: switch, default false.

### Scratch Relief

- `scratch.contrast`: 0–200%, default 100;
- `scratch.displacement`: 0–100%, default 12;
- `scratch.bump`: 0–100%, default 50;
- `scratch.roughnessInfluence`: 0–100%, default 65.

### Crystals

- `ice.crystalDensity`: 0–2,000, default 400, step 50;
- `ice.crystalSize`: 0–100%, default 20;
- `ice.crystalElongation`: 0–100%, default 60;
- `ice.crystalVariation`: 0–100%, default 50.

### Icicles

- `ice.icicleDensity`: 0–100, default 20, step 1;
- `ice.icicleLength`: 0–100%, default 40, step 1;
- `ice.icicleRadius`: 0–100%, default 20, step 1;
- `ice.icicleVariation`: 0–100%, default 50;
- `ice.icicleThreshold`: 0–100%, default 50, step 1.

### Lighting

- `lighting.environmentIntensity`: 0–300%, default 100;
- `lighting.environmentRotation`: 0–360°, default 0;
- `lighting.exposure`: 25–250%, default 108.

Runtime-owned Background and Image Export sections remain unchanged. Timeline and
Layers remain disabled because the product still edits one static output entity.
Values, canvas, and panel state persist; source model and scratch media do not.

## Preview And Export Sizing

`canvas.renderScale` becomes 1–2 with default 2 and step 0.5. Full preview
backing size is based on actual CSS display bounds multiplied by the selected
Resolution Scale, not a fixed 512 px cap. Resolution Scale 2 therefore produces
two backing pixels per CSS pixel on the supported preview path.

Selected quality is never silently reduced. Continuous interactions coalesce
renders through requestAnimationFrame and may defer non-essential refinement,
but they do not render a lower backing scale than the user's selected value.
Preview and tiled 2K/4K/8K export use the same scene, materials, environment,
mask, texture mapping, and orientation.

## Resource And Pipeline Ownership

Settings are mapped into a nested typed shape:

```text
FrozenSceneSettings
  viewport
  mask
  surface
  scratch
  crystals
  icicles
  lighting
  background
```

External resources are separate from serializable settings:

```text
FrozenSceneResources
  model
  scratchTexture
  environment
```

The renderer accepts one atomic resource snapshot rather than receiving partial
model/texture mutations. Model and scratch preparation are separate memoized
source-lifecycle passes. HDRI/PMREM is initialized once per renderer and disposed
with it. Control changes update uniforms or instance matrices only; they never
reparse source files or rebuild PMREM.

The canonical renderer pipeline adds the scratch source and invalidation rules.
Environment intensity/rotation, physical surface controls, mask controls, and
instance profiles invalidate preview/export only. Scratch file replacement
invalidates scratch preparation plus preview/export. Image format/resolution
remain export-only settings.

## Workload Model

Existing dimensions remain:

- source triangles, enforced at 3,000;
- crystal instances, enforced at 2,000;
- icicle instances, enforced at 100;
- preview render scale, extended to 2;
- export width, enforced by 2K/4K/8K options.

Add scratch source pixels as an external-input dimension with an enforced
2,048 px maximum edge after proportional preparation. Physical transmission and
triplanar sampling change pass cost but not user-reachable primitive limits.
The render-plan assessment and kernel benchmark receipt must be refreshed before
the implementation is accepted.

## Error Handling

- Unsupported/empty model files fail model preparation without retaining stale
  geometry.
- Scratch decode failure removes only the scratch resource and preserves the
  model with procedural fallback.
- HDRI load failure falls back to a generated neutral room PMREM so physical
  material remains lit rather than becoming black.
- Resource replacement is atomic: the previous valid resource stays active until
  the next resource is fully prepared, then disposal occurs after the first new
  frame.
- WebGL2 initialization errors remain explicit and no Canvas 2D visual fallback
  pretends to provide equivalent ice.

## Acceptance And Verification

Unit coverage must prove:

- exact mask endpoints and monotonic top-to-bottom progression;
- mask invariance under camera orbit and child mesh transforms;
- reference physical defaults and nested value mapping;
- scratch luminance/contrast/invert mapping;
- triplanar transform parameters;
- zero Count, Length, or Radius yields zero visible icicles;
- Resolution Scale 2 produces the expected backing dimensions;
- resource replacement/disposal does not leak model, texture, PMREM, or material
  resources.

Browser coverage must prove with pixels rather than data attributes alone:

- known top and bottom regions change correctly at progress 0, 50, and 100;
- orbit does not move the mask relative to the object;
- HDRI rotation moves physical reflections;
- transmission, IOR, roughness, and environment intensity visibly affect ice;
- attaching, replacing, transforming, and clearing a scratch texture changes and
  restores the surface;
- scratch scale, rotation, displacement, bump, contrast, invert, and roughness
  influence change rendered pixels;
- icicle Count, Length, and Radius reach a true empty/minimal result;
- selected x2 preview backing is sharp and stable during/after interactions;
- PNG/JPG export uses the same material and mask and keeps exact 2K/4K/8K sizes.

Tier 4 verification is required because this is a broad renderer/material/media
rewrite plus an explicit preview-quality change. Run targeted unit/browser checks
during development, targeted performance for media import, scratch replacement,
control drag, orbit, x2 preview, and export, then the protected performance
checkpoint available to this app, direct integrity, `verify:final`, and the real
local browser. Existing signed Toolcraft verification blockers must be reported
separately and must not be worked around by editing protected files.

## Non-Goals

- exact OpenVDB remeshing or volumetric simulation;
- WebGPU-only rendering;
- video export or timeline animation;
- material authoring for the thawed GLB source;
- MTL sidecar or external GLTF dependency packaging in this pass;
- persisting uploaded binary model/texture data across reload.
