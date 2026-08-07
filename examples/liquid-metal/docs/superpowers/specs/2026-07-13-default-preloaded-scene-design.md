# Default preloaded scene

## Goal

Make the user's exported Liquid Metal scene the initial application state. The
app must open with a real editable model, scratch mask, and sticker stack rather
than an empty upload state. Users may remove or replace every default asset, and
runtime Reset must continue to restore schema-owned media defaults.

## Source evidence and recovery limits

The supplied `liquid-metal-3d-settings (1).json` is authoritative for canvas,
camera, shader, lighting, scratch parameters, sticker transform proxy,
background, and export values. Toolcraft settings transfer intentionally exports
only schema control targets; the payload contains `media.model: null`,
`media.scratches: null`, and `media.stickers: []`, and it does not contain the
internal `stickers.placements` map.

The adjacent final export `liquid-metal-3d (8).png` plus local source files are
used to reconstruct the missing media portion:

- model: `/Users/kusnizza/Desktop/A.obj`;
- sticker artwork: Click Club, Wow, Fast Mode, yellow smile star, Go, Stick It,
  Keep It Moving, Play Loud, Pizza, and blue flower from the local sticker set;
- scratch source: the local `Noise Scratches Black Background.jpg`; its access
  time falls inside the scene-authoring session and its directional marks match
  the final export, so the original source is bundled instead of a synthetic
  substitute;
- initial sticker positions: raycast seeds measured from the final 4096×2304
  composition and resolved against the normalized model with the authored 16:9
  camera, independent of the live editor viewport shape.

The authored default decal scale is `0.82` for all ten recovered stickers. This
is both the saved `stickers.scale` value and the scale required to match the
colored sticker footprints in `liquid-metal-3d (8).png`. A first reconstruction
used the older generic `0.4` import default, making every decal exactly
`0.4 / 0.82` of the authored projector size. Measured NDC centers for the Go
and blue-flower decals match the export within roughly `0.02`, so the recovered
positions and camera remain unchanged.

The bundled sticker copies keep the same artwork at practical source sizes so
the default app does not download the 39 MB AI-upscaled set before first paint.

## Product behavior

- Root application load starts with the complete scene attached through
  `media.defaultAssets`.
- FileDrop controls show every default asset as ordinary removable media.
- Uploading a replacement model or scratch mask uses the existing single-source
  behavior; new sticker uploads extend the editable sticker collection.
- Sticker seed positions are used only when a default sticker has no serialized
  placement. Once initialized, the existing runtime `stickers.placements` map,
  direct manipulation, selection, ordering, undo/redo, preview, PNG, and video
  paths remain authoritative.
- Every recovered seed starts at scale `0.82`; the visible `Sticker scale`
  control therefore agrees with the selected default decal instead of silently
  shrinking the preloaded batch to the obsolete generic scale.
- JSON control values become schema `defaultValue`s, so section/global reset and
  settings transfer use the supplied scene values.
- Timeline duration stays the existing seamless `10 / 3` seconds. The exported
  current time and forced `isPlaying: false` snapshot are transfer metadata, not
  new product defaults; normal playback startup remains unchanged.

## Schema and runtime decisions

- Controls/sections: unchanged; only their defaults change.
- Media: add model, one scratch mask, and ten ordered stickers through
  `media.defaultAssets` with matching `sourceTarget`s.
- Canvas: remains editable 1920×1080 at render scale 2.
- Timeline: unchanged playback timeline.
- Layers: remain disabled; fileDrop owns media collection ordering/selection.
- Persistence: remains `storage: "none"`; every reload intentionally returns to
  the authored default scene rather than the previous editing session.
- Renderer: keep the existing WebGL pipeline and add only default-sticker seed
  lookup before the current fallback placement.
- Export: unchanged and consumes the same runtime state as preview.

## Acceptance

- A clean root load shows `A.obj`, the scratch source, and ten sticker media
  items without user upload.
- Product pixels are non-empty and visibly contain the preloaded scene.
- All ten initial sticker placements resolve at scale `0.82`; their centers
  keep the export-derived NDC seeds and their footprints match the authored
  overlapping composition.
- Supplied shader/camera/lighting/scratch/background defaults are observable in
  controls and renderer attributes.
- Removing default media works; Reset restores the default files.
- A default sticker can still be selected and dragged on the model.
- PNG export uses the preloaded scene without a prior upload.
- Default startup remains responsive with bundled assets and render scale 2.

## Verification note

Verification tier: Tier 3

Reason: Schema defaults, startup media flow, model/scratch/sticker decoding, and
initial renderer workload change, while the Toolcraft runtime, dependencies,
timeline mode, layers, persistence, and export architecture remain unchanged.

Run: `npm run ai:check`; focused schema/default-media/renderer tests; TypeScript;
`npm run verify:quick`; dedicated clean-load/remove/reset/drag/PNG browser
acceptance; targeted startup media performance; controlled-browser reload and
visual inspection.

Skip: `npm run verify:final` and the full browser performance checkpoint are not
required for this post-first-working default-scene feature. The touched startup
media path receives targeted functional and workload coverage.
