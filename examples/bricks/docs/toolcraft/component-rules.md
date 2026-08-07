# Component Rules

## Control Decision Catalog

Choose controls by product value model before UI appearance.

- Exact owner: if the value model belongs to a built-in, use that built-in.
- Best fit: if multiple built-ins can work, choose one and record the reason.
- Custom escape hatch: use custom controls only after documenting checked built-ins and why the closest one is insufficient.

If a built-in owner is discovered after a custom workaround, replace the workaround with the built-in.

Common exact-owner choices:

- Use `gradient` for adjustable gradients, color transitions, gradient fills, stops, type, and angle. Do not replace it with two `color` controls. The built-in Gradient owns type/angle, the draggable stop track, and the Stops list; the full Gradient control uses content-width internal dividers only when it shares a section with sibling controls, with 18px between each divider and the control content. If Gradient is the first control in that section, only the bottom internal divider renders.
- Use `fontPicker` for typography that includes font family, weight, size, text case, text color/opacity, letter spacing, or line height.
- Use `colorOpacity` when one product entity owns both color and opacity.
- Use `rangeSlider` or `rangeInput` for lower/upper bounds or from/to ranges.
- Use `curves` for editable tone, response, easing, remapping, opacity, depth, mask, or channel curves.
- Use `vector` for position, offset, direction, focus, anchor, light direction, or color-balance pads.
- Use `fileDrop` for source material uploads.
- Use `imagePicker` for choosing one visual option from a set.
- Use `palette` only for constrained design-token color choices with both family and shade: brand palette, Tailwind-like token color, style-guide color scale, semantic palette family, or theme accent token.
- Use `actions` for local section commands that affect only the nearby entity, such as randomize palette, normalize weights, sort glyphs, clear selection, duplicate item, or reset current stop.
- Use `collectionActions` for repeatable product entities whose actual item list can grow or shrink, such as colors, glyphs, symbols, points, rules, variants, or object entries. Use it instead of a count slider when the user edits the actual set. The item list must be runtime state that changes preview/export, not panel-only row chrome. The collection control shows the collection `label` on the left and remove/add icon buttons on the right. Homogeneous repeated items do not show visible per-item labels like `Color 1`, `Color 2`, `Item 1`, or `Item 2` when the collection label already names the group. Item controls should use built-ins such as `color`, `colorOpacity`, `text`, `select`, `segmented`, `slider`, `switch`, `checkbox`, or `rangeInput` before any custom renderer.
- Use `panelActions` for sticky final product actions such as export, copy, generate, apply, or download.

Small action buttons inside custom controls are for item-level actions such as remove, reorder, add stop, or delete stop. Use schema `actions` for section-level local commands. Keep final product actions in `panelActions`, keep timeline transport in the top timeline, and keep global reset in the controls panel header.

For local reset-like `actions`, use product-specific values such as `reset-current-layer`, `reset-palette`, or `reset-current-stop` and handle them through `ToolcraftApp onPanelAction`. Do not use a bare `reset` value unless the action intentionally runs global `controls.reset`.

## Dividers

- Full-width dividers belong only to panel sections.
- Large built-in compound controls inside a section render content-width internal dividers only when their parent section contains more than one visible control item. Keep 18px between each rendered internal divider and the compound control content. If the compound control is the first item in that section, render only its bottom internal divider and remove the top internal padding. This applies to `gradient`, `fontPicker`, RGB `curves`, `channelMixer`, and `palette`. Single `curves` are one labeled control and do not render internal dividers.
- If a section contains exactly one control, whether simple or compound, render only the parent section dividers.
- Do not add full-width borders inside a compound control, and do not put dividers only around an internal subsection such as Gradient Stops.
- Small compound fields such as `colorOpacity` and `rangeInput` stay inline fields without section dividers.
- `collectionActions` is a compound control when it shares a section with generated item controls, so it follows the same content-width divider rules. Place it at the start of the controlled section. Generated item controls still follow normal density rules: plain colors use equal 50% columns when they fit, while color+opacity items stay stacked.

## Sliders

Slider `step` means numeric snapping only. It does not make a slider visually discrete by itself.

Classify every stepped slider as either `stepped continuous` or `visual discrete` in the spec and schema tests.

Use `variant: "discrete"` for semantic integer domains where markers help choose positions: counts, rows, columns, levels, bands, passes, points, tiles, segments, finite position choices, and finite animation-step controls such as flip depth, character count, glyph steps, or frame steps.

Keep large or precision stepped ranges visually continuous, even with `step`: speed, FPS, rate, duration, seconds, milliseconds, density, size, intensity, quality, and other ranges with many positions.

Visual discrete sliders must declare `step`; the runtime derives one marker per value position from `min`, `max`, and `step`. Visual discrete sliders with too many positions are invalid because they produce marker noise.

Schema sliders always render stacked at full width. Do not put `slider` or `rangeSlider` controls in two-column inline rows. The only built-in exception is `fontPicker`, whose letter-spacing and line-height footer sliders stay paired inside that component.

Use slider `unit` only for measurement or scale suffixes: `%`, `px`, `°`, `x`, `s`, `ms`, `fps`, `rows`, `cols`, or a similarly useful domain unit. Do not use `unit` to repeat the entity already named by the section or label. Avoid `Letters` + `letters`, `Shape Density / Count` + `shapes`, `Words` + `words`, `Symbols` + `symbols`, `Items` + `items`, `Particles` + `particles`, and `Layers` + `layers`. If the numeric value needs an entity noun to make sense, rename the label or section instead of appending the noun to the value. Compact units render tight (`70%`, `24px`, `1.2x`, `8s`); word or acronym units render with a space (`5 cols`, `17 fps`) only when they are truly needed.

Slider value labels are editable only when they contain a numeric value. Textual state labels such as `Normal` are display-only and must not expose hover or click editing affordances.

Range sliders are always full-width two-thumb controls. Do not put a `rangeSlider` in an inline row. Its `defaultValue` must start with different lower and upper values, such as `[20, 80]`, so the control does not collapse into a single-value slider.

Range slider value editing accepts common range separators such as `20/80`, `20-80`, `20 - 80`, `20 80`, and en-dash ranges. Use the built-in parser instead of adding custom label parsing.

Discrete sliders must still drag smoothly. Heavy preview work must be debounced, coalesced, or deferred.

When a slider or range slider is intentionally unavailable, use schema `disabled: true`. Do not draw custom disabled-looking slider rows or disable only the renderer response while leaving the control active.

When a slider is meaningful only in some mode values, keep it visible and use `disabledWhen`:

```ts
fillAmount: {
  type: "slider",
  label: "Fill level",
  target: "distribution.fillAmount",
  disabledWhen: {
    target: "distribution.fillMode",
    equals: "full",
  },
}
```

The disabled value is preserved. When the user switches back to a mode where the control is meaningful, the slider becomes active with its previous value.

Use `visibleWhen` instead of `disabledWhen` when a control or section belongs only to another template, type, mode, variant, or count. Example: in a co-brand lockup, `Partner` belongs to text identity mode and `Partner logo` belongs to logo identity mode. For count-controlled banks, hide inactive siblings: if `Shades` is `2`, `Shade 3`, `Shade 4`, and `Shade 5` are not visible. Do not keep inactive controls visible and enabled while making the renderer ignore them.

## Palette

Use `palette` only when the product needs a constrained token palette: family plus shade. It is for design-system color tokens, not for arbitrary color entry.

Use `color` for free hex colors, `colorOpacity` when opacity belongs to the same color entity, `gradient` for color transitions, and `fontPicker` when the color belongs to typography. Browser acceptance must change both `palette.family` and `palette.shade` and prove the rendered/exported output consumes both parts.

## Segmented Controls

Use segmented controls only for compact mode choices that preserve every cell's internal padding.

Limits:

- at most four options;
- no option label longer than nine characters;
- no more than twenty-four total option-label characters.

If cells clip, collide, lose padding, or force labels into adjacent cells, shorten labels first. If compact labels still fail, use `select`.

## Sections

Build controls-panel sections from product entities and workflow stages, not component types. Keep sections discrete: two to seven product controls is the normal size. When a section grows past seven controls or mixes several meanings, split it into specific sections such as `Flow Motion`, `Flow Geometry`, `Letter Burst`, `Shape Colors`, `Logo Glow`, `Logo Plate`, or `Text Block`. Do not reuse the same section title for multiple sections.

Every app-authored controls-panel body section must have a short meaningful visible title. Runtime-created setup/settings sections use the technical title `Setup` but render without a visible heading; sticky footer action sections use the technical title `Export` but render without a visible heading. Do not omit a title on app-authored body sections to avoid naming decisions; choose the nearest honest product context instead.

Every visible section title renders through the standard 36px collapsible header row with vertically centered text and the runtime collapse icon. Do not hand-build section headers in generated apps.

Section expand/collapse uses the standard runtime height/opacity animation. Do not replace it with instant custom section visibility.

Ordinary section collapsed/expanded state persists as a per-app runtime UI preference. It is not undo/redo state, not settings import/export state, and `Reset controls` must not clear it. Runtime technical `Setup` / settings sections and sticky footer `Export` sections are not collapsible.

Ordinary section headers expose the runtime section reset action before the collapse button. It dispatches `controls.resetTargets` and restores only that section's control targets to their schema `defaultValue`.

Ordinary controls-panel body sections use 8px top spacing and 24px bottom spacing for their control content. Runtime technical `Setup` / settings sections use 12px top and bottom spacing to match side padding. Sticky footer action sections keep their dedicated spacing.

## Colors

First identify the semantic entity the color belongs to: background, object, connector, glow, tone mapping, brand, export, or a named product object.

Keep color inside a section when it configures the same entity as nearby controls. Use a standalone color section only when color is the whole semantic section.

Standalone color section titles must describe product role. Never generate a section titled `Color` or `Colors`. If no meaningful role exists, use a neutral title such as `Appearance` instead of omitting the title.

Show visible field labels for `color` and `colorOpacity` controls when the section also contains any non-color controls. Omit visible color labels only when the whole section is made of color controls.

Multiple related plain colors stay in the same section and render at most two per row. If any color control has opacity, keep it stacked instead of placing it in a two-column row.

Use `colorOpacity` when one product entity owns both color and opacity, such as text color, shadow color, glow color, overlay color, or stroke color. Do not split that into a separate `color` plus opacity slider/input.

When one short numeric/text field and one plain `color` field configure the same entity, they can share a two-column inline row. Example: `Mask size` and `Color` belong in the same `Mask` row instead of two stacked rows. Do not put `colorOpacity` in inline rows.

Mixed inline rows require label parity: every field in that row has a visible label. The required `Background` section row is the only section-title-owned exception: use the switch label `Include` beside the background color parameter with `label: false`. Color fields in other mixed rows must not be unlabeled.

Renderer-owned output background is a base product control. Use a schema `color` target such as `appearance.background` or `scene.background`, add an `export.includeBackground` control for PNG transparency, and make preview/export read those runtime values. Keep them in one required `Background` section directly before the first export settings section. With PNG export, that first section is `Image Export`; with video-only export, it is `Video Export`. Use one equal-width inline row with `export.includeBackground` on the left and `appearance.background` on the right when no other fit rule is violated. The switch label is `Include`, not `Include background`; the background color control uses `label: false`. Each control occupies one half of the row; do not shrink the toggle column to intrinsic width. `export.includeBackground` controls live preview product-background visibility and PNG alpha; it must not make the Toolcraft canvas shell/backing or video output transparent. Do not hardcode a configurable background in CSS, Canvas `fillStyle`, or WebGL clear color.

## File Upload

Use `fileDrop` for source material uploads in the controls panel. Do not place upload UI on the canvas.

In single-layer apps, the runtime shows uploaded image preview and clear button in the file control. Clearing removes source material from the renderer and canvas.

Use `multiple: true` when the app needs several uploaded images as one source set. The runtime appends media, switches to a four-column thumbnail grid when more than one image is present, puts the add-more tile last, and keeps per-image removal inside the file control.

In multi-layer apps, deletion and visibility belong to the Layers panel; `fileDrop` stays an upload target.

## Image Picker

Every visible `ImagePicker` item must be actionable in the current product context. Do not show choices that sanitize to fallback or no-op behavior.

Sizing:

- two options: large tiles;
- three or six options: medium tiles;
- larger sets: small tiles.

Filter or split choices by template, mode, or selected object when only some choices are valid.

## Font Picker

Use `fontPicker` for typography choices that need font preview plus weight, size, text-case, text color/opacity, letter-spacing, and line-height controls. Do not recreate it with a plain `select`, custom font list, or separate typography inputs.

The value is one object: `{ fontId, fontWeight, fontSize, letterSpacing, lineHeight, textCase, color, opacity }`. Typography renderers and exports must consume all eight parts.

If `fontPicker` controls product text, the preview renderer and export renderer must apply the selected `fontId`, `fontWeight`, `fontSize`, `letterSpacing`, `lineHeight`, `textCase`, `color`, and `opacity` to that actual text. Do not stop at updating runtime state, the select label, or the popup preview.

The component owns search, category filters, virtualized scrolling, font preview loading, selected-row behavior, the font-weight select, the font-size input, the text-case select, the color/opacity control, and the two footer sliders. Browser acceptance must choose a different font, change weight, change size, change text case, change color/opacity, move Letter spacing, and move Line height.

`fontPicker` is an atomic typography block. Do not place sibling schema controls for `Case`, `Weight`, `Size`, `Letter spacing`, `Line height`, `Color`, or `Opacity` when they affect the same product text entity. If a typography part is missing from the built-in value model, extend `fontPicker` in the kit instead of composing a neighboring control.

Do not add `description` to `fontPicker` just to list these owned fields. If the section title and visible field labels already make the text target clear, omit `description`; use it only for non-obvious product scope.

## Vector

One vector control in the controls panel uses the square X/Y pad. Multiple vector controls use compact pads so the sidebar does not become too tall.

Use variants by product meaning:

- default: position, offset, direction, focus, anchor, light direction;
- `whiteBalance`: temperature and tint;
- `colorBalance`: paired color-balance axes;
- `chromaOffset`: RGB or chromatic offset;
- `toneBias`: split-tone, duotone, or color-grading bias.

Do not add custom vector sizing props. Choose the right number, variant, and section grouping, then let runtime sizing handle the pad.

## Curves

Use `curves` for editable remapping curves. First decide the curve variant by product meaning; do not rely on the runtime default.

Use `variant: "single"` for one standalone curve without channel tabs, such as acceleration, bend, easing, opacity response, depth response, mask response, threshold response, tone response, or another single mapping curve. Do not create a custom curve UI just to remove RGB tabs.

RGB Curves is the color-correction or channel-specific case. Use RGB/R/G/B tabs only when the product edits RGB channels, color correction, color grading, or channel curves. Do not force RGB/R/G/B tabs onto products that need only one response, bend, depth, or easing curve.

Single Curves is one labeled control and does not use internal dividers. RGB Curves is the compound variant because it contains channel tabs plus curve points, so it follows the compound divider rules when mixed with sibling controls.

Choose interpolation by product meaning:

- `interpolation: "smooth"` for photo/editor-like visual tone, color, and RGB curves where the curve should feel like a creative spline;
- `interpolation: "monotone"` for depth, response, mask, opacity, threshold, and data-mapping curves where order must be preserved and overshoot is unsafe.

Single curves default to monotone. If a single curve is still a creative visual tone curve, set `interpolation: "smooth"` explicitly.

Acceptance for curves should include an off-center control point near an edge so smooth-vs-monotone interpolation mistakes are visible in the actual product output, not only in the curve UI.

## Text And Code

Use `text` for short single-line strings: names, small values, compact prompts, titles, and tokens.

For `text`, separate content from settings. `commitMode` defaults to `"content"`: content strings such as prompts, names, titles, tokens, and short text update while the user types. Use `commitMode: "setting"` for text inputs that edit settings such as font size, numeric-like style values, dimensions, ids, or configuration fields; setting text commits on blur or Enter. Canvas width and Canvas height are runtime-owned editable-size fields and always commit on blur or Enter.

Use `code` / `CodeTextarea` as the base multiline content editor for any potentially long value: prompts, instructions, JSON, CSS, shader code, scripts, templates, or other structured text. It applies while typing, is capped at 12 visible lines, and long content scrolls inside the textarea instead of making the controls panel taller. Do not name a section `Code` unless the product value is actually code.

## Labels

Visible control labels should be short UI names, usually one to three words. Do not put explanations, formulas, units, parenthetical hints, or usage instructions in field labels.

Short labels must still be semantically sufficient with nearby context. `Animation` / `Speed` is fine because the section names the entity; `Settings` / `Speed` should become `Animation speed`, and mixed visual buckets should use labels such as `Symbol color` or `Background opacity`.

Visible control labels can get a runtime-owned filled Phosphor question tooltip icon. Put a concise product-specific explanation in `description` only when it adds meaning beyond the label. Do not write recaps like `Adjusts Opacity`, and do not build custom help icons beside built-in labels.

Do not add `description` to obvious color clusters. If a section title already names the palette/color context, sequential labels such as `Color 1`, `Color 2`, or simple palette controls such as `Spread` do not need help icons. Keep the whole obvious group clean unless the tooltip explains a non-obvious product behavior.

For compound controls such as `fontPicker`, `description` must not enumerate owned fields like font, weight, size, case, color, opacity, letter spacing, or line height. The component already labels those fields.

If a source label is unavoidably long, keep the visible label concise and rely on native `title` for the full text.

Switch and checkbox labels name the setting context, not the action. Do not prefix them with `Enable` or `Disable`; use `CRT`, `Glow`, `Loop`, or `Guides` instead of `Enable CRT` or `Disable guides`. If the section title already names the setting context, do not repeat that title as the visible toggle label; use a short contextual label such as `Include` or, only for icon-only visual toggles, `label: false` with the meaning in `target` and `description`.

Two adjacent `switch` or `checkbox` controls for the same product entity must share one inline row when every visible label fits without truncation. Use short one- or two-word labels such as `Snap X` and `Snap Y`, or `Glow` and `Loop`. The runtime auto-pairs safe adjacent toggles by target entity; use explicit layout groups only when pairing a toggle with a non-toggle parameter. If either label would truncate in half-width, remove the inline group and let the toggles stack.

A single `switch` or `checkbox` may share an inline row with one related parameter control when the toggle label fits and the controls edit the same entity. This row is always equal-width: each control occupies one half. Example: `Loop` plus `Duration`, or `Include` plus unlabeled background color inside the required `Background` section. If the section title already names the toggle context, shorten the label instead of repeating the title.

## Layers

Enable layers only when the app has multiple editable objects, media objects, groups, visibility, selection, reorder, or selected-layer controls.

Do not show Layers for a single-layer app. Do not use `selectedLayer.*` targets when Layers are disabled.

When Layers are enabled, browser tests must use the real LayersPanel UI: select, visibility, reorder, grouping, and media lifecycle when uploads/deletes create or remove layers.

## Timeline

Before choosing timeline mode for an animated product, write an Animation Intent Inventory:

- `timeline-playback`: user-facing play, pause, scrub, duration, loop, restart, progress, or export-at-time.
- `timeline-keyframes`: editable diamonds, rows, easing, or keyframe evaluation.
- `autonomous`: decorative or self-running output with no user-facing transport.

User-requested product animation defaults to playback timeline. Use no timeline only for autonomous decorative/self-running animation, and declare `appTransferMode.animationIntent.mode = "autonomous"` with coverage proving no play/pause, scrub, duration, loop, or export-at-time behavior.

Use playback timeline for play, pause, scrub, duration, loop, restart, or export-at-time.

Playback renderers must read `state.timeline.currentTimeSeconds`, `state.timeline.durationSeconds`, `state.timeline.isPlaying`, and loop state from the runtime. The full animation cycle must span `state.timeline.durationSeconds`; do not hard-code a separate local animation duration such as 3s or 8s inside the renderer.

Renderers may compute an initial duration default during app initialization or reset, but they must not watch `state.timeline.durationSeconds` and dispatch `timeline.setDuration` back to a computed local value. Once the user edits the timeline duration, that runtime value is the source of truth and renderer progress must map into it.

Use keyframes timeline for diamonds, editable rows, easing, or keyframe evaluation. In keyframes mode, Toolcraft infers capable controls; do not manually hide diamonds on controls that can be keyframed.

Keyframe state stores typed control values. `valueLabel` is display-only for the timeline UI; renderers and tests must never parse it as the source of truth. Custom renderers must read keyframed settings through `evaluateToolcraftTimelineValues`, `evaluateToolcraftTimelineValue`, `useToolcraftEvaluatedValues`, or `useToolcraftEvaluatedValue` instead of reading raw `state.values` for keyframed targets.

Playback-only timelines stay collapsed and must not show control diamonds or expanded keyframe rows.

When non-looping playback reaches the end, pressing Play again must restart from time 0. Do not require users to scrub back manually before replaying.

App-wide Play, Pause, Animate, and Restart controls do not belong in the right panel.

Right-panel animation controls may tune renderer parameters such as mode, intensity, speed, or stagger only after the animation intent is declared. They must not replace top timeline transport.

Do not replace `TimelinePanel` with an app-level playback, transport, or timeline panel to avoid runtime performance issues. Keep the runtime panel design and fix the Toolcraft runtime clock/state path. Use custom timeline UI only for explicit `custom-reference-timeline` transfers with browser-backed reference timeline coverage.

## Panel Actions

Use `panelActions` only for sticky footer product actions such as Generate, Apply, Export, Copy, or Download.

Use schema `settingsTransfer` for settings import/export. Do not add Import Settings or Export Settings to sticky footer `panelActions`; when enabled, the runtime inserts a first technical `Setup` settings-transfer section without a visible heading and imports/exports control values, canvas size, and timeline state.

Recalculate settings-transfer eligibility after adding, removing, or reorganizing controls, sections, timeline, or layers. The runtime threshold is 12 product controls, 5 product sections, or weighted score 18. If the threshold is reached, use `settingsTransfer: "auto"` / `true` or document a product-specific opt-out through `runtime.settingsTransfer` acceptance evidence.

When settings transfer and editable-output canvas sizing are both enabled, the first technical `Setup` runtime section is mandatory and contains `Export Settings`, `Import Settings`, `Aspect ratio`, `Canvas width`, `Canvas height`, and optional `Resolution scale` in that order. Do not split these into separate app-authored sections, rename the controls, or rebuild the block by hand.

If only `Export Settings` and `Import Settings` appear in that section, the schema is not using `editable-output` canvas sizing or already owns `canvas.size.width` / `canvas.size.height` controls. For product-output apps, prefer fixing the canvas sizing decision over adding hand-built size fields.

Manual `Canvas width` or `Canvas height` edits are exact output-size edits. They keep the other dimension unchanged, switch `Aspect ratio` to `Custom`, and update the custom ratio inputs to the reduced current ratio. Do not recreate the old behavior where typing one size field stays locked to the previous aspect preset.

Enable `canvas.renderScale: true` for non-vector raster previews such as Canvas 2D, WebGL, or WebGPU output. Runtime adds a `Resolution scale` slider after canvas sizing; it defaults to `2x` and lets users trade preview quality/performance without changing output size. Adding or enabling this slider requires targeted browser evidence that the canvas stays responsive while dragging sliders or other high-frequency controls at the selected scale. Full `pnpm verify:perf` is required only for the first working app version or explicit performance complaints. Performance fixes must preserve the selected scale and keep canvas preview responsive. Diagnose the actual bottleneck before lowering quality; do not silently downsample, stretch a lower-resolution backing canvas, blur output, or clamp `canvas.renderScale` below the user's chosen value. Do not enable it for DOM/SVG/vector-native previews.

Reset belongs to the controls panel header reset button. Do not add a footer action with `label`, `value`, or `command` containing reset; acceptance treats that as a duplicate Reset.

Still-output product apps include one primary `Export PNG` action.

Animated product apps include `Export Video` as the primary action and `Export PNG` as the secondary action.

Every product app with `Export PNG` includes a separate `Image Export` section. That section must contain:

- `export.image.format` as a `select`, with default value `png` and baseline options `png` and `jpg`;
- `export.image.resolution` as a `select`, with default value `4k` and baseline options `2k`, `4k`, and `8k`.

Place `Image Export` directly above sticky footer export buttons for still-output apps. For animated apps with both PNG and video export, place `Image Export` immediately before `Video Export`. `Format` and `Resolution` are one compact workflow pair: render them in a two-column inline row by default. Do not use `segmented` for this pair; it must visually match the Video Export dropdown structure.

Animated product apps with `Export Video` include a separate `Video Export` section. That section must contain:

- `export.video.format` as a `select`, with default value `mp4` and baseline options `mp4` and `webm`;
- `export.video.resolution` as a `select`, with default value `current` and options such as `current` and `4k`.

Place `Video Export` as the final authored controls section directly above sticky footer export buttons. `Format` and `Resolution` are one compact workflow pair: render them in a two-column inline row by default. Use stacked rows only when a label or selected value would clip, truncate, or lose internal padding, and record that fallback reason in the spec or worklog. Do not use `segmented` for this pair unless the product has a deliberately tiny fixed output menu and browser tests prove every cell keeps padding.

Do not put video export format/resolution controls inside effect, renderer, animation, or output-background sections. `MOV` and `ProRes` are not baseline browser outputs; use them only with an explicit encoder/transcoder and dedicated acceptance plus performance coverage.

Add `Copy PNG` only when clipboard output is part of the product. Copy never replaces export. If two footer actions are needed, secondary/outline goes left and primary goes right. Footer actions must be one compact horizontal group, not stacked full-width rows. If an odd number of actions leaves one action alone in the final row, that final action spans the full row.

Async footer actions return the real Promise from `ToolcraftApp onPanelAction`. Export, download, copy, generate, and apply must not run as fire-and-forget work; the runtime uses the returned Promise to show the sticky footer top accent indicator only while the operation is pending. Use `reportProgress(0..1)` from `onPanelAction` for determinate progress. Video export reports frame-based render/encode progress, and PNG export reports phase progress when render/blob/handoff are asynchronous.

Do not place product action buttons on the canvas or in the renderer.

## Canvas Handles

Use product editing handles only when direct manipulation is better than panel-only editing: gradient stops, focus points, light vectors, crop bounds, mask points, transforms, bezier anchors, or perspective corners.

Handles are visual overlays, not app UI. They must be textless, tokenized, bound to runtime state, and excluded from export/copy output.
