# Acceptance Testing

Every visible product entity must prove it works. A control is not accepted because it renders; it is accepted only when tests prove user interaction changes runtime state and the final product output, command side effect, timeline frame, layer result, media lifecycle, or canvas viewport.

## Required Files

- `src/app/app-acceptance.ts`
- `src/app/app-acceptance.test.ts`
- `src/app/app-performance.ts`
- `src/app/app-performance.test.ts`
- `docs/toolcraft/agent-worklog.md`
- `e2e/app-browser-acceptance.spec.ts`
- `e2e/app-controls.spec.ts`
- `e2e/app-performance.spec.ts`
- `e2e/product-observable-helpers.ts`

`pnpm verify:final` must pass before final delivery. Incremental edits use the verification tier classifier from `assembly-workflow.md`: run targeted browser acceptance for the changed entity, and add full `pnpm verify:perf` only for the first working app version or an explicit performance complaint.

A full performance checkpoint is triggered only by the first working app version, or by a user request to optimize performance, fix lag, remove jank, speed up animation, stabilize drag/zoom, or otherwise investigate poor performance.

## Product Readiness

The exported starter may keep `appProductReadiness.mode: "starter"` only while it is still a neutral template. A real product must switch it to `mode: "product"` and fill:

- `productName`;
- `productSummary`;
- `requestedBehavior`.

Product readiness also requires product surface: controls, layers, timeline, `canvasContent`, or acceptance coverage. A renamed product folder must not pass tests as a neutral starter.

## Implementation Worklog

Product apps must update `docs/toolcraft/agent-worklog.md` before final delivery. The file records why the app chose its renderer, timeline mode, layer policy, control grouping, export behavior, and performance strategy.

The worklog must declare `Mode: product`. Every `Decision Trail` iteration must include `Request:`, `Task type:`, `User-visible result:`, `Source/reference checked:`, `Docs/contracts read:`, `Contract rules applied:`, `Decision:`, `Alternatives rejected:`, `State/output mapping:`, `Files changed:`, `Verification:`, `Skipped checks:`, and `Risks:`. `State/output mapping:` names how controls, commands, timeline, layers, media, or renderer state reaches the visible product or export. Each decision section (`Renderer`, `Timeline`, `Layers`, `Controls`, `Export`, `Performance`) must include `Decision:`, `Reason:`, and `Evidence:` entries. `Evidence` should name files, reference behavior, contract rules, browser checks, performance checks, or exact commands. `Verification` must list concrete checks such as `pnpm verify:quick`, `pnpm verify:perf`, browser tests, or Playwright scenarios. `Risks` must include either `Risk:` entries or `None:` with a reason.

The acceptance gate fails if the worklog is missing, still says `Mode: starter`, or lacks concrete decision evidence.

## Acceptance Rows

Every visible schema control, custom renderer feature, media lifecycle, timeline behavior, layer behavior, canvas sizing behavior, toolbar command, sticky action, and product editing handle needs an acceptance row.

Each row should name:

- stable `id`;
- `kind`;
- runtime `target` when the entity edits state;
- `componentType`;
- fixture data;
- real user action;
- expected product-level observable;
- evidence type;
- exact `automatedTestName`;
- exact `browserTestName`.
- `controlPartCoverage` when the control is compound.
- `canvasSizingCoverage: "fixed-output-size"` when `canvas.sizing.mode` is `fixed-output`.
- `persistenceCoverage: "reload"` when schema `persistence.storage` is `"localStorage"`.

The test gate rejects rows without matching automated and browser test names.

`fixed-output` canvas sizing must be deliberate. Its runtime acceptance row must explain why width, height, and aspect ratio are non-editable. A default size from the prompt should use `editable-output`, which keeps the runtime Aspect ratio, Canvas width, and Canvas height controls.

When localStorage persistence is enabled, add a runtime acceptance row that proves reload behavior. The browser test must change a real user-facing setting, wait for persistence to write, call a real page reload, and verify the restored control value or product output. Importing a settings JSON file is not persistence coverage.

## Compound Controls

Compound controls have multiple semantic value parts inside one visible control. Their acceptance row must declare `controlPartCoverage`, and the browser test must explicitly exercise each required part against product output.

Required parts:

| Control | Required `controlPartCoverage` |
| --- | --- |
| `anchorGrid` | `anchorGrid.position` |
| `channelMixer` | `channelMixer.activeChannel`, `channelMixer.values`; only for RGB channel matrix behavior |
| `collectionActions` | `collectionActions.add`, `collectionActions.remove`, `collectionActions.items` |
| `colorOpacity` | `colorOpacity.hex`, `colorOpacity.opacity` |
| `curves` | RGB variant: `curves.activeChannel`, `curves.points`; `variant: "single"`: `curves.points` |
| `fontPicker` | `fontPicker.fontId`, `fontPicker.fontWeight`, `fontPicker.fontSize`, `fontPicker.letterSpacing`, `fontPicker.lineHeight`, `fontPicker.textCase`, `fontPicker.color`, `fontPicker.opacity` |
| `gradient` | `gradient.gradientType`, `gradient.angle`, `gradient.stops.position`, `gradient.stops.color`, `gradient.stops.opacity` |
| `palette` | `palette.family`, `palette.shade` |
| `rangeInput` | `rangeInput.start`, `rangeInput.end` |
| `rangeSlider` | `rangeSlider.lower`, `rangeSlider.upper` |
| `vector` | `vector.x`, `vector.y` |

Testing only one sub-control is not enough. For example, a `gradient` test that changes only a stop color must fail if the app also renders Gradient type, Angle, Position, or Opacity controls.

For `curves`, the acceptance row must match the intended variant. Semantic one-dimensional curves such as acceleration, bend, easing, response, depth, mask, opacity, threshold, or remap curves must set `variant: "single"` and prove `curves.points`; RGB active-channel coverage is reserved for color-correction or channel-specific curves.

For `fontPicker`, product output evidence must come from actual rendered/exported product text after changing the font, weight, size, letter spacing, line height, text case, color, and opacity. Runtime value changes, selected labels, or popup font previews are preflight checks, not final acceptance.

## Control Selection Gates

Acceptance must catch wrong-substitution failures. If the prompt, spec, or app behavior needs a value model owned by a built-in control, the schema must use that built-in or include a documented built-in fit check.

High-confidence wrong-substitution cases:

- gradient, stops, angle, fill transition, or adjustable gradient without `gradient`;
- typography without `fontPicker`;
- sibling typography controls that split case, color, opacity, size, weight, letter spacing, or line height away from `fontPicker`;
- color plus opacity without `colorOpacity`;
- repeatable user-editable item sets without `collectionActions` or another justified collection owner;
- from/to range without `rangeSlider` or `rangeInput`;
- curve, remap, easing, or response without `curves`;
- position, direction, focus, or vector without `vector`;
- source upload without `fileDrop`;
- app-wide transport in the controls panel instead of timeline;
- segmented choices that clip instead of falling back to `select`;
- custom controls recreating built-ins.

`fileDrop` media-lifecycle rows must prove upload/import, clear/remove, thumbnail reorder for `multiple: true`, and global or section reset. A test that only clicks the clear button is not enough because Reset controls must also return uploaded source material to `defaultValue`.

Rows that use custom controls must include `customControlCoverage` and typed `builtInFitCheck`.

```ts
builtInFitCheck: {
  checkedBuiltIns: ["fileDrop", "collectionActions", "imagePicker"],
  closestBuiltIn: "fileDrop",
  whyInsufficient:
    "FileDrop imports, previews, orders, and removes source files, but this product also needs per-glyph density thresholds stored with each item.",
  productObservable:
    "Changing a glyph density threshold changes which uploaded glyph renders for the same depth-map tone.",
}
```

The fit check names real checked built-ins, the closest built-in or `"none"`, why it is insufficient, and the product-observable evidence that proves the custom control works.

For collection-like custom controls, the fit check must include `collectionActions` and `actions`. Collection-like is decided from the runtime value model and workflow: arrays, `{ items: [...] }` objects, selected-item state, grow/shrink item sets, ordering, add, remove, delete, or reorder behavior. Acceptance should fail if the row compares only unrelated built-ins such as `vector` or `select` while the actual value model is a collection.

Custom controls cannot be justified by icons, layout, styling, compactness, or custom buttons alone. `whyInsufficient` must name the product interaction or value model that built-ins cannot express.

## Valid Evidence

Valid acceptance evidence includes:

- rendered product pixels;
- exported image/video bytes;
- canvas hash or DOM-visible product result;
- clipboard, file, or blob payload;
- cleared media preview and canvas;
- selected layer output;
- changed canvas viewport;
- changed timeline playback state plus rendered frame.
- restored persisted value or product output after browser reload.

Product apps must include output delivery acceptance. Still-output apps need `Export PNG` evidence. Animated apps need both `Export Video` evidence and `Export PNG` evidence. Clipboard copy can be tested as an additional behavior, but it cannot replace export coverage.

Every app with `Export PNG` must exercise the separate `Image Export` section: choose at least two `export.image.format` values, choose at least two `export.image.resolution` values, export the image, and decode the result to prove file type and actual pixel dimensions changed. Animated apps with both `Export PNG` and `Export Video` still need this image-export coverage; `Video Export` does not replace it.

Async Export, Download, Copy, Generate, or Apply acceptance must prove the sticky footer top accent indicator is visible while the returned `onPanelAction` Promise is pending, advances when `reportProgress(0..1)` is called, and hides after it settles. Video export acceptance must prove frame-based progress updates during render/encode instead of only toggling a pending state.

Animated app acceptance must also exercise the separate `Video Export` section: choose at least two `export.video.format` values, choose at least two `export.video.resolution` values, verify unsupported MIME/container choices fall back safely, and assert exported video bytes, dimensions, MIME/container, and duration match runtime timeline state. The duration assertion must load the exported blob as a video, wait for metadata, and compare `video.duration` with the edited timeline duration; `blobSize > 0`, `blobType`, WebM parser fallback, or assigning the expected duration when metadata is missing are not enough.

Footer action acceptance must not include Reset. Reset is already available in the controls panel header and uses schema `defaultValue`; duplicating it in sticky `panelActions` fails acceptance.

Local `actions` acceptance must click every visible action and prove the nearby entity changed through runtime state or product output. A section-level `Randomize palette` must change palette output, `Normalize weights` must change weights/output, and `Clear selection` must clear only the scoped selection. Do not accept a test that only proves the button rendered.

`collectionActions` acceptance must click plus and minus in the real panel, prove the runtime target array length changes, prove `minItems` prevents invalid removal, prove `recommendedMaxItems` is not a hidden hard limit, and prove preview/export consumes the changed item list.

PNG export tests must prove runtime background behavior: changing the background color affects preview/export, turning `export.includeBackground` off hides the live preview product background and creates transparent PNG output, video export still keeps the background, turning Include on includes the current background color in PNG, and exported pixel dimensions are retina size, at least `state.canvas.size * 2`.

Invalid final acceptance evidence:

- control exists;
- `data-*` attribute changed;
- runtime state was mutated directly;
- DOM text changed but product output did not;
- shader uniform changed without output proof;
- helper fixture proves a function but not the app behavior.

If a behavior cannot be proven through product output or a side effect, remove the entity or ask whether it is required.

## Browser Gate

Browser tests must open the running app and interact with the real UI by pointer, keyboard, file upload, canvas drag, toolbar click, timeline scrub, or layer drag.

Do not dispatch runtime commands directly for browser acceptance unless the entity is itself a command API. Browser tests must exercise what the user actually sees.

Every browser test should prove:

- the interaction is possible;
- runtime state changes through the expected target;
- product output or command side effect changes;
- canvas zoom, offset, and output dimensions do not jump unexpectedly.

Acceptance rows with `product-output`, `rendered-pixels`, or `timeline-output` evidence must use `expectToolcraftProductObservableToChange` or explicit before/after snapshots from `getToolcraftProductObservableSnapshot` in `e2e/product-observable-helpers.ts`. Runtime state, selected labels, row counts, canvas existence, or generic hashes without the shared product observable helper are not final proof.

Animated viewport tests must also prove that canvas drag, pan, pinch, zoom, and radar/center interactions suspend or coalesce non-essential animation preview work without changing the user's play/pause state. After the interaction, the renderer must resume from the correct timeline or autonomous time and keep canvas zoom/offset stable.

## Timeline And Layers

When animation controls exist without `panels.timeline`, acceptance validation requires `appTransferMode.animationIntent.mode = "autonomous"`. That intent must explain why the animation is decorative/self-running and must cover no user-facing transport, no play/pause, no scrub, no duration control, no loop control, and no export-at-time.

Playback timeline coverage must prove play/pause, scrub, duration, loop, restart when exposed, non-looping Play at the end restarts from 0, and export/copy at selected time when relevant. Duration coverage must edit the real `Edit timeline duration` control, prove the playback range changes, and prove the renderer maps one full product animation cycle to `state.timeline.durationSeconds`. Tests should compare visible or exported output at 0, midpoint, and end after changing the timeline duration. Do not accept a renderer that uses a separate fixed local duration while the timeline displays another duration, and do not accept a renderer effect that watches `state.timeline.durationSeconds` only to dispatch `timeline.setDuration` back to a computed local value.

Keyframe timeline coverage must prove diamond creation, expanded rows, keyframe updates on control change, scrub/playback evaluation, and product output changes for every inferred keyframe-capable control. Tests must prove renderers consume typed evaluated values from the Toolcraft keyframe evaluator; checking `valueLabel`, row count, or source strings is not enough.

Layer browser coverage must use the real LayersPanel UI: click rows, toggle visibility, drag rows to reorder, and drag rows into groups.

## Component Variants

Component variants are acceptance requirements.

- Discrete sliders must render `[data-slot="slider"][data-variant="discrete"]`, show the expected full-width markers, and remain smooth while dragging.
- Schema sliders must stay full-width and stacked; only `fontPicker` may pair its internal letter-spacing and line-height footer sliders.
- Continuous stepped sliders must not render discrete markers.
- Range sliders must stay full-width, start with different lower and upper defaults, and accept built-in manual range separators such as slash, hyphen, spaces, and dashes.
- Segmented controls must preserve cell padding and avoid label collision.
- Select, segmented, and image-picker controls should cover every visible option unless options come from separately tested runtime data.
- Custom controls must declare `customControlCoverage` and `builtInFitCheck`. Coverage proves the custom control is not a built-in replacement, uses kit chrome, keeps only necessary UI, writes through runtime state, and changes product output; the fit check proves which built-ins were considered and why the custom interaction is necessary.

Performance browser tests must assert budgets through `expectToolcraftScenarioPerformanceBudget(..., appPerformance, scenarioId)`. Workload browser tests must apply values from `getToolcraftPerformanceStressValue(appPerformance, scenarioId)`. If the scenario declares `workloadFixture`, apply it first with `getToolcraftPerformanceWorkloadValue` or `applyToolcraftPerformanceWorkloadFixture`. Do not hardcode budget numbers, toy control values, or toy baseline app states in e2e tests; `app-performance.ts` is the single source of truth.

## Fixtures

Use fixtures that make each behavior visible. For example, background character-size controls need visible background characters, transparency needs alpha-sensitive pixels, selected-layer controls need multiple layers, timeline controls need deterministic playback or keyframe fixtures, and mode-specific controls need fixtures for every mode branch. Conditional coverage must prove visible controls, hidden controls, disabled controls, preserved values after switching away and back, and renderer output for the active branch. Count-controlled control banks must test both the low-count UI state and the expanded-count UI state; the test fails if inactive controls remain visible while the renderer ignores them.

Generic hash differences are not enough for semantic controls. If a control promises a direction, test that direction.
