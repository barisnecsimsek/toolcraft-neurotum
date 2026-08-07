import type {
  ToolcraftComponentContract,
  ToolcraftControlDecisionCatalog,
  ToolcraftLabelPolicy,
  ToolcraftPanelPlacement,
  ToolcraftPanelSnapEdge,
  ToolcraftSectionLayout,
} from "./types";

export type * from "./types";

export const TOOLCRAFT_COMPONENT_CONTRACTS = {
  slider: {
    ...control("slider", "Slider", "grouped", "required"),
    decisionCatalog: decisionCatalog({
      strictness: "best-fit",
      ownsValueModel: [
        "single numeric value",
        "bounded continuous range",
        "bounded stepped range",
        "small semantic integer range",
      ],
      useWhen: [
        "Use Slider for one numeric value inside fixed min and max bounds.",
        "Use Slider when dragging through approximate values is useful and every intermediate value is valid.",
        "Use variant discrete only for small semantic integer domains where markers help choose positions.",
      ],
      doNotReplaceWith: [
        "Do not use Slider for finite named options; use Select or Segmented.",
        "Do not use two Slider controls for a lower/upper range; use RangeSlider or RangeInput.",
        "Do not use Slider as a detached opacity field for a color entity; use ColorOpacity.",
      ],
      acceptableAlternatives: [
        "Use Select for small named option sets.",
        "Use RangeSlider or RangeInput for from/to ranges.",
      ],
      layoutConstraints: [
        "Schema sliders stay stacked at full width.",
        "Only FontPicker may pair its internal letter-spacing and line-height sliders.",
      ],
      requiredAcceptance: [
        "Prove changing the slider changes product output or the intended runtime side effect.",
        "For discrete sliders, prove the discrete variant renders markers and dragging remains smooth.",
      ],
    }),
    aiUsageRules: [
      "Slider step means numeric snapping only; it does not make the slider visually discrete by itself.",
      "Classify every stepped slider as stepped continuous or visual discrete before writing the schema.",
      'Small semantic integer domains such as rows, cols, gaps, jitter, counts, levels, bands, passes, points, tiles, and segments must use variant: "discrete".',
      'Finite animation step domains such as flip depth, character count, glyph steps, and frame steps must use variant: "discrete" when the marker count stays within the Toolcraft visual budget.',
      "Large or precision stepped ranges such as speed, FPS, rate, duration, density, size, and intensity stay visually continuous even when they declare step.",
      "Use slider unit only for measurement or scale suffixes such as %, px, °, x, s, ms, fps, rows/cols, or similar domain units.",
      "Do not use unit for repeated entity nouns already named by the section or label, such as Letters + letters, Shape Density / Count + shapes, Words + words, Symbols + symbols, Items + items, Particles + particles, or Layers + layers.",
      "When the value needs an entity noun to make sense, improve the label or section title instead of appending that noun as the value unit.",
      "Compact symbol/CSS units render tight, such as 70%, 24px, 1.2x, and 8s; word units render with a space, such as 5 cols, when they are truly needed.",
      "Slider valueLabel is editable only when it contains a numeric value; textual state labels such as Normal are display-only and must not expose hover or click editing affordances.",
      "Schema sliders render stacked at full width; do not put sliders in two-column inline layout groups.",
      "The fontPicker component is the only built-in exception with two internal footer sliders for letter spacing and line height.",
      "For a small named option set, prefer Select or Segmented instead of forcing a discrete Slider.",
      'Specs, plans, and app-schema tests must assert explicit discrete sliders render as variant: "discrete" with markers derived from min, max, and step.',
      'Browser verification can inspect [data-slot="slider"][data-variant="discrete"] plus slider markers to prove the Toolcraft component variant rendered.',
      "Visual discrete sliders must still drag smoothly; browser performance tests should use expectToolcraftDiscreteSliderDragSmoothness for real pointer drag.",
      "Use schema disabled: true for unavailable sliders; do not recreate a disabled-looking slider with custom markup.",
      "Use disabledWhen for sliders that are only meaningful in some mode values, such as Fill level and Islands being disabled when Fill mode is Full.",
      "Do not leave a mode-dependent slider active while making the renderer ignore it; the UI must expose the unavailable state.",
    ],
  },
  rangeSlider: {
    ...control("rangeSlider", "RangeSlider", "grouped", "required"),
    decisionCatalog: decisionCatalog({
      strictness: "exact-owner",
      ownsValueModel: [
        "numeric lower and upper bounds",
        "from/to numeric range",
        "two-thumb bounded interval",
      ],
      useWhen: [
        "Use RangeSlider when users edit lower and upper bounds on the same numeric scale.",
        "Use RangeSlider when the relationship between the two values matters visually.",
      ],
      doNotReplaceWith: [
        "Do not replace RangeSlider with two independent Slider controls.",
        "Do not place RangeSlider beside another slider in an inline row.",
      ],
      acceptableAlternatives: [
        "Use RangeInput when manual exact text entry matters more than dragging handles.",
      ],
      layoutConstraints: [
        "RangeSlider is always full-width and stacked.",
        "Default lower and upper values must be different.",
      ],
      requiredAcceptance: [
        "Prove rangeSlider.lower and rangeSlider.upper both affect product output.",
      ],
    }),
    aiUsageRules: [
      "Range slider step means numeric snapping only; it does not make the range slider visually discrete by itself.",
      "Classify every stepped range slider as stepped continuous or visual discrete before writing the schema.",
      'Small semantic integer domains such as rows, cols, gaps, jitter, counts, levels, bands, passes, points, tiles, and segments must use variant: "discrete".',
      'Finite animation step domains such as flip depth, character count, glyph steps, and frame steps must use variant: "discrete" when the marker count stays within the Toolcraft visual budget.',
      "Large or precision stepped ranges such as speed, FPS, rate, duration, density, size, and intensity stay visually continuous even when they declare step.",
      "Use rangeSlider unit only for measurement or scale suffixes; do not use it for repeated entity nouns already named by the section or label.",
      "When a range label needs an entity noun to make sense, improve the label or section title instead of appending that noun as the value unit.",
      "Compact symbol/CSS units render tight, such as 20% – 80% or 12px – 48px; word units render with a space when truly needed.",
      "RangeSlider is always a full-width two-thumb control; never place it in an inline two-column layout group with another slider or range slider.",
      "RangeSlider defaultValue must start with different lower and upper values so the two-thumb control does not collapse into a single-value slider.",
      "Manual range value editing accepts common separators such as slash, hyphen, spaces, and dashes; do not create custom parsers for RangeSlider labels.",
      'Specs, plans, and app-schema tests must assert explicit discrete range sliders render as variant: "discrete" with markers derived from min, max, and step.',
      "Visual discrete sliders must still drag smoothly; browser performance tests should use expectToolcraftDiscreteSliderDragSmoothness for real pointer drag.",
      "Use schema disabled: true for unavailable range sliders; do not recreate a disabled-looking range slider with custom markup.",
      "Use disabledWhen for range sliders that are only meaningful in some mode values; keep the value so it returns when the mode becomes relevant again.",
      "Do not leave a mode-dependent range slider active while making the renderer ignore it; the UI must expose the unavailable state.",
      "Acceptance must prove both rangeSlider.lower and rangeSlider.upper change the product output; testing one handle is not enough.",
    ],
  },
  select: {
    ...control("select", "Select", "grouped", "required"),
    decisionCatalog: decisionCatalog({
      strictness: "best-fit",
      ownsValueModel: [
        "finite single selection",
        "long option labels",
        "many options",
        "segmented fallback",
      ],
      useWhen: [
        "Use Select for finite choices with long labels, many options, or values that would not fit in Segmented.",
        "Use Select when a compact dropdown is more readable than a row of cells.",
      ],
      doNotReplaceWith: [
        "Do not use Select to recreate FontPicker, Gradient, ImagePicker, FileDrop, Curves, Vector, or Palette value models.",
      ],
      acceptableAlternatives: [
        "Use Segmented for two to four short closely related options that fit without clipping.",
      ],
      layoutConstraints: [
        "Prefer compact two-column inline layout for related short Select pairs that tune one workflow or entity.",
        "Use vertical one-select-per-row layout only as a fallback when a label, selected value, or option text would clip, truncate, or lose internal padding in the compact row.",
        "If a compact Select pair falls back to vertical layout, record the fit reason in the spec or worklog.",
      ],
      requiredAcceptance: [
        "Prove every visible option or representative option set changes product output or interpreted product state.",
      ],
    }),
  },
  segmented: {
    ...control("segmented", "Segmented", "grouped", "required"),
    decisionCatalog: decisionCatalog({
      strictness: "best-fit",
      ownsValueModel: [
        "compact finite mode choice",
        "two to four short related options",
        "single-row mode toggle",
      ],
      useWhen: [
        "Use Segmented for compact mode choices where every cell keeps internal padding.",
        "Use Segmented when the options are short, closely related, and easier to compare side by side.",
      ],
      doNotReplaceWith: [
        "Do not use Segmented for long labels, many options, or values that clip.",
        "Do not use Segmented for actions; use buttons or panelActions.",
      ],
      acceptableAlternatives: [
        "Use Select when options are long, numerous, or break segmented cell padding.",
      ],
      layoutConstraints: [
        "Keep text segmented controls to at most four options and compact labels.",
        "Fallback to Select when cells collide, clip, or lose padding.",
      ],
      requiredAcceptance: [
        "Prove every visible segment changes the relevant product mode or output.",
        "Browser verification must treat clipped or paddingless cells as broken.",
      ],
    }),
    aiUsageRules: [
      "Use Segmented only for compact mode choices where every cell keeps its internal padding.",
      "If a segmented control is too wide, first shorten option labels; if the compact labels still exceed the width budget, use Select because it has the same selection mechanics without broken cells.",
      "Generated schemas should keep text segmented controls to at most four options, no option label longer than nine characters, and no more than twenty-four total option-label characters.",
      "Browser verification must treat collided, clipped, or paddingless segmented cells as a broken component and switch to shorter labels or Select.",
    ],
  },
  switch: {
    ...control("switch", "Switch", "grouped", "required"),
    decisionCatalog: decisionCatalog({
      strictness: "best-fit",
      ownsValueModel: [
        "immediate binary setting",
        "on/off product behavior",
        "enabled/disabled runtime option",
      ],
      useWhen: [
        "Use Switch for a binary setting that applies immediately.",
        "Use Switch for options such as Glow, Loop, CRT, Background, or Guides.",
      ],
      doNotReplaceWith: [
        "Do not use Switch for more than two options.",
        "Do not use Switch for destructive actions or commands that need confirmation.",
      ],
      acceptableAlternatives: [
        "Use Checkbox when the option is an explicit inclusion flag.",
        "Use Select or Segmented for more than two options.",
      ],
      layoutConstraints: [
        "Two adjacent Switch controls for the same product entity must share one inline row when both labels fit; the runtime auto-pairs safe adjacent switches by target entity when no explicit layout group is needed.",
      ],
      requiredAcceptance: [
        "Prove toggling the switch changes the product output or runtime behavior.",
      ],
    }),
    aiUsageRules: [
      'Switch labels name the setting context only; do not prefix labels with "Enable" or "Disable" because the switch already communicates on/off behavior.',
      'Use labels such as "CRT", "Background", "Glow", or "Loop" instead of "Enable CRT" or "Disable background".',
      "Two adjacent Switch controls for the same product entity must share one inline row when every visible label fits without truncation. Keep paired labels to short one- or two-word names; the runtime auto-pairs safe adjacent switches by target entity, and generated schemas should stack switches only when any label would truncate.",
      "When the nearest section title already names the switch context, do not duplicate that title as the visible switch label. Use label false for a visual-only toggle and keep the meaning in target/description.",
      'A Switch may share an inline row with one related parameter control when the visible switch label is short enough to fit. That row uses equal-width columns; never shrink the switch column to intrinsic width. In section-owned rows, use a short visible label such as "Include" instead of repeating the section title, such as "Include background" inside Background.',
    ],
  },
  checkbox: {
    ...control("checkbox", "Checkbox", "grouped", "required"),
    decisionCatalog: decisionCatalog({
      strictness: "best-fit",
      ownsValueModel: [
        "explicit optional flag",
        "included/excluded choice",
        "binary checklist state",
      ],
      useWhen: [
        "Use Checkbox when the product meaning is an explicit optional flag or inclusion choice.",
      ],
      doNotReplaceWith: [
        "Do not use Checkbox for immediate setting toggles that read more naturally as Switch.",
        "Do not use Checkbox for commands.",
      ],
      acceptableAlternatives: [
        "Use Switch for immediate on/off settings.",
        "Use Select or Segmented for more than two options.",
      ],
      layoutConstraints: [
        "Two adjacent Checkbox controls for the same product entity must share one inline row when both labels fit; the runtime auto-pairs safe adjacent checkboxes by target entity when no explicit layout group is needed.",
      ],
      requiredAcceptance: [
        "Prove checking and unchecking changes product output or runtime behavior.",
      ],
    }),
    aiUsageRules: [
      'Checkbox labels name the setting context only; do not prefix labels with "Enable" or "Disable" because the checkbox already communicates enabled/selected state.',
      'Use labels such as "Transparent background", "Guides", or "Loop" instead of "Enable transparent background".',
      "When the nearest section title already names the checkbox context, do not duplicate that title as the visible checkbox label. Use label false for a visual-only checkbox and keep the meaning in target/description.",
      "Two adjacent Checkbox controls for the same product entity must share one inline row when every visible label fits without truncation. Keep paired labels to short one- or two-word names; the runtime auto-pairs safe adjacent checkboxes by target entity, and generated schemas should stack checkboxes only when any label would truncate.",
      "A Checkbox may share an inline row with one related parameter control when the visible checkbox label is short enough to fit. That row uses equal-width columns; never shrink the checkbox column to intrinsic width. Hide the checkbox label when the section title provides the visible context.",
    ],
  },
  colorOpacity: {
    ...control("colorOpacity", "ColorOpacity", "standalone", "component-owned"),
    decisionCatalog: decisionCatalog({
      strictness: "exact-owner",
      ownsValueModel: [
        "color plus opacity for one entity",
        "hex color and percent opacity",
      ],
      useWhen: [
        "Use ColorOpacity when one product entity owns both a color and opacity.",
      ],
      doNotReplaceWith: [
        "Do not split ColorOpacity into separate Color and opacity Slider/Input controls.",
      ],
      acceptableAlternatives: [
        "Use Color only when opacity is not editable.",
        "Use Gradient when the entity is a color transition or gradient fill.",
      ],
      layoutConstraints: [
        "ColorOpacity stays stacked and does not share inline color rows.",
      ],
      requiredAcceptance: [
        "Prove colorOpacity.hex and colorOpacity.opacity both affect product output.",
      ],
    }),
    aiUsageRules: [
      "Use ColorOpacity when one product entity needs both a color and an opacity value, such as text color, shadow color, glow color, overlay color, or stroke color.",
      "Do not split ColorOpacity into a separate Color plus Slider/Input for opacity; use type: \"colorOpacity\" so the color popover and percent input stay visually connected.",
      "ColorOpacity is the only color control variant that may expose opacity in the color picker popover; plain Color popovers hide opacity controls.",
      "Use one object value with hex and opacity. Renderers and exports must consume both parts.",
      "Do not place ColorOpacity in inline two-column layout groups. If either color control has opacity, keep the controls stacked.",
      "Only plain Color controls without opacity may render in two-column color rows.",
      "Acceptance must prove colorOpacity.hex and colorOpacity.opacity both affect the product output; testing only the swatch or only runtime state is not enough.",
    ],
  },
  text: {
    ...control("text", "TextInput", "grouped", "required"),
    decisionCatalog: decisionCatalog({
      strictness: "best-fit",
      ownsValueModel: [
        "short single-line text",
        "single-line content",
        "single-line setting value",
      ],
      useWhen: [
        "Use TextInput for short names, titles, tokens, compact prompts, and small setting strings.",
        "Use commitMode content for real product content and commitMode setting for configuration-like values.",
      ],
      doNotReplaceWith: [
        "Do not use TextInput for long multiline content; use CodeTextarea.",
      ],
      acceptableAlternatives: [
        "Use CodeTextarea for multiline or long structured content.",
        "Use Select for finite choices.",
      ],
      layoutConstraints: [
        "Short numeric/text pairs can share inline rows when they tune one product meaning.",
      ],
      requiredAcceptance: [
        "Prove text edits change product content or the intended setting at the correct commit timing.",
      ],
    }),
    aiUsageRules: [
      'TextInput commitMode defaults to "content": text content, prompts, names, tokens, titles, and instructions apply while typing.',
      'Use commitMode: "setting" for text inputs that edit settings such as font size, numeric-like style values, dimensions, ids, or configuration fields; setting text commits on blur or Enter.',
      "Canvas width and Canvas height are runtime editable-size fields and always commit on blur or Enter like editor size fields.",
    ],
  },
  rangeInput: {
    ...control("rangeInput", "RangeInput", "grouped", "required"),
    decisionCatalog: decisionCatalog({
      strictness: "exact-owner",
      ownsValueModel: [
        "manual lower and upper values",
        "from/to text range",
        "compact paired range input",
      ],
      useWhen: [
        "Use RangeInput when users need to type or inspect a lower and upper bound more than drag them.",
      ],
      doNotReplaceWith: [
        "Do not replace RangeInput with two unrelated TextInput controls for one range.",
      ],
      acceptableAlternatives: [
        "Use RangeSlider when dragging the range relationship is the primary interaction.",
      ],
      layoutConstraints: [
        "Keep the two range fields together as one compound control.",
      ],
      requiredAcceptance: [
        "Prove rangeInput.start and rangeInput.end both affect product output.",
      ],
    }),
    aiUsageRules: [
      "RangeInput is a compound control; acceptance must prove rangeInput.start and rangeInput.end both affect the product output.",
      "Do not accept a range input test that edits only the first field or only checks runtime state.",
    ],
  },
  actions: {
    ...control("actions", "Actions", "grouped", "required"),
    decisionCatalog: decisionCatalog({
      strictness: "best-fit",
      ownsValueModel: [
        "local section action",
        "small contextual command",
        "non-sticky workflow command",
        "entity-scoped command group",
      ],
      useWhen: [
        "Use Actions for local commands inside a control section that affect the nearby entity.",
        "Use Actions for section-scoped commands such as Randomize palette, Normalize weights, Sort glyphs, Clear selection, Duplicate item, or Reset current entity.",
      ],
      doNotReplaceWith: [
        "Do not use Actions for final product export, copy, generate, apply, or download actions.",
        "Do not use Actions for global reset; the panel header owns reset.",
        "Do not use Actions for timeline transport such as Play, Pause, Resume, Restart, or Scrub.",
      ],
      acceptableAlternatives: [
        "Use panelActions for sticky product delivery actions.",
        "Use item-level icon buttons inside custom controls for local item remove/reorder commands.",
        "Use the top TimelinePanel for animation transport commands.",
      ],
      layoutConstraints: [
        "Keep local actions close to the entity they affect.",
        "Keep action labels short and scoped by the section title; prefer Randomize, Clear, Sort, Normalize, Duplicate, or Reset when the section already names the target.",
      ],
      requiredAcceptance: [
        "Prove each action dispatches the intended command or product side effect for the nearby entity only.",
      ],
    }),
    commands: ["controls.reset", "controls.apply"],
    stateMode: "command-only",
    aiUsageRules: [
      "Use Actions for local commands inside the current section when the command affects only the nearby entity or workflow step.",
      "Good Actions examples: Randomize palette, Normalize weights, Sort glyphs, Clear selection, Duplicate item, Reset current layer, Reset current stop, or Shuffle shades.",
      "Do not use Actions for final product delivery actions; use sticky panelActions for Export, Copy, Download, Generate, or Apply.",
      "Do not use Actions for global reset; the controls panel header owns global reset.",
      "Do not use Actions for animation transport; Play, Pause, Resume, Restart, and Scrub belong to the top timeline when timeline behavior exists.",
      'For local reset-like actions, use product-specific values such as "reset-current-layer" or "reset-palette" and handle them through ToolcraftApp onPanelAction; do not use a bare "reset" value unless the action intentionally runs controls.reset.',
      "Acceptance and browser tests must click each Actions button and prove the product output or runtime state for the nearby entity changed.",
    ],
  },
  collectionActions: {
    ...control("collectionActions", "CollectionActions", "standalone", "component-owned"),
    decisionCatalog: decisionCatalog({
      strictness: "exact-owner",
      ownsValueModel: [
        "repeatable product entity collection",
        "add/remove product items",
        "dynamic list of visible controls",
        "canvas-backed collection size",
      ],
      useWhen: [
        "Use CollectionActions when users can add or remove repeated product entities such as colors, glyphs, symbols, points, rules, variants, or object entries.",
        "Use CollectionActions instead of a count Slider when the user edits the actual set of items rather than only a numeric amount.",
      ],
      doNotReplaceWith: [
        "Do not use Slider to add or remove real collection items.",
        "Do not use plain Actions for add/remove collection ownership; Actions are local commands, not collection state owners.",
        "Do not use CollectionActions for panel-only lists that do not affect canvas preview or export.",
      ],
      acceptableAlternatives: [
        "Use fileDrop multiple when the repeated entities are uploaded images.",
        "Use Gradient when the repeated entities are gradient stops inside an adjustable gradient.",
        "Use customControl only when the repeated entity needs interactions no built-in collection item control can express.",
      ],
      layoutConstraints: [
        "CollectionActions sits at the start of its section, renders the collection label on the left, and keeps remove/add icon buttons together on the right.",
        "Homogeneous repeated item controls do not render visible per-item labels when the collection label already names the group.",
        "Collection item controls follow normal density rules: plain color items use equal 50% columns when they fit, while color+opacity items stay stacked.",
        "CollectionActions is a compound control and follows content-width compound divider rules when sharing a section with sibling controls.",
        "recommendedMaxItems is an agent/layout/performance hint, not a hard add limit; hardMaxItems is allowed only for real algorithm, format, API, export, or proven performance limits.",
      ],
      requiredAcceptance: [
        "Prove plus adds a runtime item and that the new item appears in or affects canvas preview and export.",
        "Prove minus removes a runtime item and that the removed item disappears from or stops affecting canvas preview and export.",
        "Prove minItems prevents deleting below the minimum and recommendedMaxItems does not silently block adding more items.",
      ],
    }),
    stateMode: "controlled",
    aiUsageRules: [
      "Use CollectionActions for repeatable product entities whose actual item list can grow or shrink.",
      "Adding or removing collection items must update the runtime target array consumed by the renderer and export; do not add panel-only items.",
      "Do not model add/remove item behavior with a Slider count when users need to edit the actual items.",
      "recommendedMaxItems is advisory only and must not disable the plus button. Use hardMaxItems only when a real product, algorithm, API, export, or measured performance limit requires it.",
      "CollectionActions item controls use built-in controls whenever possible, such as Color, ColorOpacity, TextInput, Select, Segmented, Slider, Switch, Checkbox, or RangeInput.",
      "Do not add visible labels like Color 1, Color 2, Item 1, or Item 2 for homogeneous collection items when the collection label already explains the group.",
      "Use compact half-width item layout whenever the child control is allowed to fit in a half row; color items without opacity are the default two-column case.",
      "Acceptance must add and remove items through the browser UI and prove canvas/export output follows the changed collection.",
    ],
  },
  panelActions: {
    ...control("panelActions", "PanelActions", "standalone", "component-owned"),
    decisionCatalog: decisionCatalog({
      strictness: "exact-owner",
      ownsValueModel: [
        "sticky final product action",
        "export action",
        "copy action",
        "generate action",
        "apply action",
      ],
      useWhen: [
        "Use panelActions for final product actions such as Export, Copy, Generate, Apply, or Download.",
      ],
      doNotReplaceWith: [
        "Do not place final product action buttons on the canvas.",
        "Do not use regular section Actions for final sticky export or generate actions.",
        "Do not duplicate global Reset in panelActions.",
      ],
      acceptableAlternatives: [
        "Use Actions only for local section commands.",
      ],
      layoutConstraints: [
        "Footer actions are one compact sticky group with secondary on the left and primary on the right.",
      ],
      requiredAcceptance: [
        "Prove panel actions execute real product side effects such as exported bytes, clipboard payload, or generated output.",
        "For async panelActions, prove the sticky footer top accent indicator is visible while the returned Promise is pending, advances when reportProgress is called, and hides after it settles.",
      ],
    }),
    aiUsageRules: [
      "Use panelActions only for sticky footer product actions such as Generate, Export, Copy, or Download.",
      "Do not use panelActions for resetting controls; the controls panel header owns Reset controls.",
      "Handle product-specific panelActions through ToolcraftApp onPanelAction.",
      "Async product actions such as Export, Download, Copy, Generate, or Apply must return the real Promise from onPanelAction and report progress through the onPanelAction reportProgress callback.",
      "The sticky footer top accent indicator is determinate when reportProgress receives 0..1 values and falls back to pending state only when progress is unavailable.",
      "defineToolcraft hoists panelActions into the controls panel sticky footer automatically.",
      "Product-output apps must always include export in panelActions.",
      "Static or still-output apps include Export PNG as the primary footer action.",
      'Every app with Export PNG must expose a separate "Image Export" controls section.',
      'The Image Export section must include "export.image.format" as a Select control with PNG and JPG choices, defaulting to "png".',
      'The Image Export section must include "export.image.resolution" as a Select control with 2K, 4K, and 8K choices, defaulting to "4k".',
      "Image Export format and resolution render as one compact two-column inline Select pair, matching the Video Export settings structure.",
      "Image Export resolution controls the actual exported image long edge: 2K = 2048px, 4K = 4096px, 8K = 8192px. Pass the selected runtime value to createToolcraftPngExportCanvas resolution and prove decoded image width/height in browser acceptance.",
      "Animated apps include Export Video as the primary footer action and Export PNG as a secondary footer action.",
      'Animated apps with Export Video must expose a separate "Video Export" controls section.',
      'Animated apps with both Export PNG and Export Video must expose both "Image Export" and "Video Export"; Image Export sits immediately before Video Export.',
      'The Video Export section must include format and resolution controls such as targets "export.video.format" and "export.video.resolution".',
      "Use Select controls for Video Export format and resolution; do not use Segmented unless the product has a deliberately tiny fixed output menu and browser tests prove every cell keeps padding.",
      'Place the Video Export section as the final controls section directly above sticky footer panelActions.',
      'Video Export format defaults to "mp4"; keep "webm" available as the baseline alternate unless the prompt/reference requires another default.',
      'Video Export resolution defaults to "current"; keep "4k" available as the high-resolution alternate.',
      "Video Export format and resolution are a compact semantic pair and should use a two-column inline layout by default; use stacked rows only when labels or selected values do not fit without clipping.",
      'Baseline browser video formats are "mp4" and "webm"; MOV or ProRes require an explicit custom encoder/transcoder and dedicated acceptance plus performance coverage.',
      "Video export code must choose the actual MIME/container through MediaRecorder.isTypeSupported or an equivalent encoder capability check, then fall back safely.",
      "Offline video export duration must be encoded from runtime timeline timestamps. Do not rely on canvas.captureStream plus MediaRecorder wall-clock recording time as the only duration mechanism for rendered-frame export.",
      'Video resolution must control exported dimensions. Use "current" output size by default; "4K" is an export resolution target, not a hardcoded 3840x2160 canvas lock.',
      "Video export browser coverage must load the exported blob metadata and prove video.duration matches the edited runtime timeline duration; blobSize/blobType checks alone are not enough.",
      "Video export must report frame-based progress through reportProgress during render/encode steps. PNG export should report phase progress for render, blob, and handoff when those phases are asynchronous.",
      'Product-output apps must expose a dedicated "Background" section directly before the first export settings section. With PNG export that first section is Image Export; with video-only export it is Video Export.',
      "Product-output apps must pass the includeBackground runtime value to createToolcraftPngExportCanvas only for PNG alpha.",
      "PNG export must use createToolcraftPngExportCanvas so background transparency and selected image dimensions or retina fallback are applied consistently without making live preview, workspace canvas backing, or video transparent.",
      "Video export must keep product background and use getToolcraftRetinaExportSize for retina dimensions.",
      "Copy PNG can be a secondary action when clipboard output is useful, but copy does not replace export.",
      "Add Copy PNG as a secondary action only when the prompt/reference includes clipboard output or the product clearly benefits from paste/share workflows.",
      "Footer actions must be one compact horizontal group; do not split them into stacked full-width sections.",
      "If two footer actions are needed, render secondary/outline on the left and primary on the right.",
      "When an odd number of footer actions renders in two columns, the final unpaired action spans the full row width.",
    ],
    commands: ["controls.apply"],
    stateMode: "command-only",
  },
  palette: {
    ...control("palette", "Palette", "standalone", "component-owned"),
    decisionCatalog: decisionCatalog({
      strictness: "best-fit",
      ownsValueModel: [
        "constrained palette choice",
        "palette family and shade",
        "design-token color selection",
        "style-guide color token",
      ],
      useWhen: [
        "Use Palette when users choose from a constrained palette family and shade rather than a free color value.",
        "Use Palette for token-based color choices such as brand palettes, Tailwind-like shade scales, semantic palette families, or style-guide colors.",
      ],
      doNotReplaceWith: [
        "Do not use Palette for arbitrary color picking.",
        "Do not use Palette for gradients, free hex colors, text color inside FontPicker, or a color value that owns opacity.",
      ],
      acceptableAlternatives: [
        "Use Color for a free single color.",
        "Use ColorOpacity when opacity belongs to the same color entity.",
        "Use Gradient for color transitions, gradient fills, stops, type, and angle.",
        "Use FontPicker when the color belongs to product typography.",
      ],
      layoutConstraints: [
        "Palette is a standalone compound control.",
        "Palette renders content-width internal dividers only when it shares a panel section with sibling controls, with 18px vertical spacing between each divider and the control content; if it is the first control in that section, only the bottom internal divider renders, and if it is the only control in the section, only the parent section dividers render.",
      ],
      requiredAcceptance: [
        "Prove palette.family and palette.shade both affect product output.",
      ],
    }),
    aiUsageRules: [
      "Use Palette only when the product value is a constrained design-token palette choice with both family and shade.",
      "Good Palette examples: brand palette family and shade, Tailwind-like token color, style-guide color scale, semantic palette family, or theme accent token.",
      "Do not use Palette for arbitrary free color picking; use Color instead.",
      "Do not use Palette when opacity belongs to the same color entity; use ColorOpacity instead.",
      "Do not use Palette for gradients or color transitions; use Gradient instead.",
      "Do not split typography color out to Palette when the text styling belongs to FontPicker.",
      "Palette is a compound control; acceptance must prove palette.family and palette.shade both affect the product output.",
      "Do not accept a palette test that only changes a swatch preview without proving the renderer/export consumes the selected family and shade.",
    ],
  },
  vector: {
    ...control("vector", "Vector", "standalone", "component-owned"),
    decisionCatalog: decisionCatalog({
      strictness: "exact-owner",
      ownsValueModel: [
        "x/y vector",
        "position",
        "offset",
        "direction",
        "focus point",
        "light vector",
        "color balance pad",
      ],
      useWhen: [
        "Use Vector for paired X/Y values such as position, offset, direction, focus, anchor, light direction, or color-balance movement.",
      ],
      doNotReplaceWith: [
        "Do not replace Vector with two unrelated sliders or text inputs when direct two-axis editing is the product interaction.",
      ],
      acceptableAlternatives: [
        "Use two numeric text fields only when exact numeric entry is the primary product requirement.",
      ],
      layoutConstraints: [
        "One vector renders as a square pad; multiple vectors render compact pads.",
      ],
      requiredAcceptance: [
        "Prove vector.x and vector.y both affect product output.",
      ],
    }),
    aiUsageRules: [
      "If the controls panel contains exactly one vector control, the runtime renders the vector pad as a square.",
      "If the controls panel contains multiple vector controls, the runtime renders compact vector pads.",
      "Multiple vector controls should live in separate semantic sections unless they intentionally belong to the same entity with other related controls.",
      'Use variant: "whiteBalance" for temperature/tint pads: X maps cool blue to warm amber, Y maps green to magenta.',
      'Use variant: "colorBalance" for paired color-balance axes such as cyan/red and blue/yellow correction.',
      'Use variant: "chromaOffset" for RGB/chromatic offset vectors where the X/Y movement controls channel separation.',
      'Use variant: "toneBias" for split-tone, duotone, or color-grading vectors where both axes describe tone or hue bias.',
      'Use the default vector variant for spatial values such as position, offset, direction, focus, anchor, and light direction.',
      "Do not add custom vector sizing props in generated schemas; choose the number, variant, and section grouping from product need and let the runtime size the pads.",
      "Vector is a compound control; acceptance must prove vector.x and vector.y both affect the product output.",
    ],
  },
  color: {
    ...control("color", "Color", "standalone", "component-owned"),
    decisionCatalog: decisionCatalog({
      strictness: "best-fit",
      ownsValueModel: [
        "single free color",
        "hex color value",
        "role color",
      ],
      useWhen: [
        "Use Color for one editable free color without opacity or gradient stops.",
      ],
      doNotReplaceWith: [
        "Do not use multiple Color controls as a substitute for an adjustable Gradient.",
        "Do not pair Color with a separate opacity control when ColorOpacity fits.",
      ],
      acceptableAlternatives: [
        "Use ColorOpacity when opacity belongs to the color entity.",
        "Use Gradient for color transitions, fills with stops, or angle/type editing.",
        "Use Palette for constrained design-token choices.",
      ],
      layoutConstraints: [
        "Plain Color controls may render two per row only when no opacity is present.",
        "Color fields in mixed sections need visible labels.",
      ],
      requiredAcceptance: [
        "Prove the selected color affects product output, preview, or export.",
      ],
    }),
    aiUsageRules: [
      "Color controls can be standalone color sections or grouped fields inside a semantic control section.",
      "First identify the semantic entity the color belongs to, such as Square 1, Square 2, Background, Object, Connector, Glow, Tone Mapping, Brand, or Export.",
      "Keep a color inside a section when it configures the same entity as nearby controls. Example: Square 1 (Right) contains Connections, Hover radius, and Color in one section.",
      "Use a standalone color section only when the color itself is the whole semantic section; the section title must describe the product role such as Background, Object, Connector, Accent, Gradient, or Brand.",
      "When color belongs to the same object or effect as nearby controls, keep it inside that section and use a concise field label that is unambiguous in context, such as Color in a Square section or Symbol color in a mixed Style section.",
      "Show visible labels for Color and ColorOpacity controls inside mixed sections that contain any non-color controls.",
      "Omit visible color field labels only when the section contains color controls and no other control types.",
      "The standalone default applies only to color-only sections; mixed semantic sections keep color grouped with nearby controls.",
      "Never use generic Color or Colors as a generated section title. If no meaningful color role exists and the colors are just basic colors, use a neutral section title such as Appearance instead of omitting the title.",
      "Do not split a grouped object section into a separate generated Color section; if the color role is unclear, ask the user before implementation.",
      "When one short numeric/text field and one Color field configure the same entity, keep them in one two-column inline layout group.",
      'Mixed inline rows require visible labels on both controls. The required Background row is the only section-title-owned exception: use the Switch label "Include" and set the background Color control label to false. Color fields in other mixed rows must not be unlabeled.',
      "Plain Color popovers must not show opacity controls. If opacity is editable, use ColorOpacity instead.",
      "Product-output apps always expose renderer-owned output background color as a schema color target such as appearance.background or scene.background.",
      'Pair renderer-owned output background color with export.includeBackground in one Background section directly before export settings. Use an equal-width inline row with the export.includeBackground Switch labeled "Include" on the left and the background Color parameter with label false on the right; each control occupies one half of the row.',
      "Preview, PNG export, and video export must read the runtime background color value instead of hardcoding that background in CSS, Canvas fillStyle, or WebGL clearColor. export.includeBackground controls only PNG alpha; it must not make live preview, workspace canvas backing, or video transparent.",
      "Render multiple related color fields in one section with at most two colors per row.",
    ],
  },
  gradient: {
    ...control("gradient", "Gradient", "standalone", "component-owned"),
    decisionCatalog: decisionCatalog({
      strictness: "exact-owner",
      ownsValueModel: [
        "gradient fill",
        "gradient type",
        "gradient angle",
        "gradient stops",
        "stop colors",
        "stop opacity",
        "stop positions",
      ],
      useWhen: [
        "Use Gradient when the product needs an adjustable gradient, color transition, multi-stop fill, linear fill, radial fill, angular fill, or diamond fill.",
        "Use Gradient when the prompt or reference mentions gradient stops, gradient angle, gradient type, or editable color transition.",
      ],
      doNotReplaceWith: [
        "Do not replace Gradient with two Color controls.",
        "Do not replace Gradient with ColorOpacity plus sliders.",
        "Do not build custom gradient UI unless the built-in Gradient cannot express the interaction and the custom escape hatch is documented.",
      ],
      acceptableAlternatives: [
        "Use Color or ColorOpacity only when the product explicitly needs fixed single colors, not an adjustable gradient.",
      ],
      layoutConstraints: [
        "Gradient is a full standalone compound control.",
        "Gradient renders content-width internal dividers only when it shares a panel section with sibling controls, with 18px vertical spacing between each divider and the control content; if it is the first control in that section, only the bottom internal divider renders, and if it is the only control in the section, only the parent section dividers render.",
      ],
      requiredAcceptance: [
        "Prove gradientType, angle, stop position, stop color, and stop opacity affect product output or export output.",
      ],
    }),
    aiUsageRules: [
      "Gradient is a compound control; acceptance must prove gradient.gradientType, gradient.angle, gradient.stops.position, gradient.stops.color, and gradient.stops.opacity all affect the product output when visible.",
      "Keep Gradient type/angle, draggable stop track, and Stops list inside the built-in Gradient control. The full Gradient control is visually separated with content-width dividers only when it shares a section with sibling controls; do not put dividers only around the Stops list and do not rebuild it as separate schema controls.",
      "Do not accept a gradient test that edits only a stop color; Linear/Radial/Angular/Diamond selection, angle, stop position, stop color, and stop opacity must be wired or the control should be simplified.",
      "If the renderer intentionally supports only a subset of gradient behavior, do not use the full Gradient control; use simpler controls that match the renderer behavior.",
    ],
  },
  fontPicker: {
    ...control("fontPicker", "FontPicker", "standalone", "component-owned"),
    decisionCatalog: decisionCatalog({
      strictness: "exact-owner",
      ownsValueModel: [
        "font family",
        "font preview",
        "font weight",
        "font size",
        "text case",
        "letter spacing",
        "line height",
        "text color",
        "text opacity",
      ],
      useWhen: [
        "Use FontPicker when product typography needs font family, weight, size, case, letter spacing, line height, text color, or text opacity.",
      ],
      doNotReplaceWith: [
        "Do not replace FontPicker with a plain Select plus separate typography controls.",
        "Do not build a custom font popup for product typography.",
        "Do not add sibling controls for text color, text opacity, case, weight, size, letter spacing, or line height when they belong to the same typography entity.",
      ],
      acceptableAlternatives: [
        "Use TextInput or Select only for non-typographic labels or finite text choices.",
      ],
      layoutConstraints: [
        "FontPicker owns its popup and internal footer controls.",
        "FontPicker renders content-width internal dividers only when it shares a panel section with sibling controls, with 18px vertical spacing between each divider and the control content; if it is the first control in that section, only the bottom internal divider renders, and if it is the only control in the section, only the parent section dividers render.",
      ],
      requiredAcceptance: [
        "Prove fontId, fontWeight, fontSize, letterSpacing, lineHeight, textCase, color, and opacity affect actual product text output.",
      ],
    }),
    aiUsageRules: [
      "FontPicker owns the font preview select, virtualized font popup, category filters, search, preview loading, font-weight select, font-size input, text-case select, text color/opacity control, letter-spacing slider, and line-height slider.",
      "Do not recreate FontPicker with a plain Select plus separate sliders; use type: \"fontPicker\" so the popup mechanics and footer controls stay intact.",
      "Use one object value with fontId, fontWeight, fontSize, letterSpacing, lineHeight, textCase, color, and opacity. Keep typography renderers wired to all eight parts.",
      "Any product text controlled by FontPicker must render fontId, fontWeight, fontSize, letterSpacing, lineHeight, textCase, color, and opacity in preview and export; do not leave typography values as panel-only runtime state.",
      "FontPicker is an atomic compound typography control. Do not split any owned typography part into a neighboring schema control for the same product text entity.",
      "Do not put a help tooltip on FontPicker just to list its owned fields. If the section title and FontPicker labels already make the text target clear, omit description.",
      "FontPicker is a compound control; acceptance must prove fontPicker.fontId, fontPicker.fontWeight, fontPicker.fontSize, fontPicker.letterSpacing, fontPicker.lineHeight, fontPicker.textCase, fontPicker.color, and fontPicker.opacity all affect the product output.",
      "FontPicker acceptance must inspect the actual product text output after changing font, weight, size, letter spacing, line height, text case, color, and opacity; runtime state, select labels, or popup preview text alone are not enough.",
      "Browser verification must open the popup, choose a different font, change font weight, change font size, change text case, change text color/opacity, move the letter-spacing footer slider, and move the line-height footer slider.",
    ],
  },
  curves: {
    ...control("curves", "Curves", "standalone", "component-owned"),
    decisionCatalog: decisionCatalog({
      strictness: "exact-owner",
      ownsValueModel: [
        "editable curve",
        "tone curve",
        "response curve",
        "easing curve",
        "remapping curve",
        "channel curve",
      ],
      useWhen: [
        "Use Curves for editable remapping, tone, response, easing, opacity, depth, mask, or channel curves.",
      ],
      doNotReplaceWith: [
        "Do not replace Curves with generic sliders when the product needs an editable curve.",
        "Do not build custom curve UI just to remove RGB tabs; use variant single.",
      ],
      acceptableAlternatives: [
        "Use Slider only when the product needs one scalar strength value, not a curve shape.",
      ],
      layoutConstraints: [
        "Use variant single for one standalone curve and RGB variant only for color-correction or channel-specific curves.",
        "Single Curves is one labeled control and does not render internal dividers, even inside mixed sections.",
        "RGB Curves is a compound channel control and renders content-width internal dividers only when it shares a panel section with sibling controls, with 18px vertical spacing between each rendered divider and the control content; if it is the first control in that section, only the bottom internal divider renders and the top internal padding is removed, and if it is the only control in the section, only the parent section dividers render.",
      ],
      requiredAcceptance: [
        "Prove curves.points affect product output; RGB curves also prove activeChannel affects output.",
      ],
    }),
    aiUsageRules: [
      'Use Curves for editable remapping curves. RGB/R/G/B tabs are only for color-correction or channel-specific curves; use variant: "single" for one standalone curve without channel tabs.',
      'Use variant: "single" for a single acceleration, bend, easing, opacity, response, depth, mask, threshold, tone-response, or mapping curve. Do not create a custom curve UI just to remove RGB tabs.',
      "RGB Curves is a color-correction-specific case; do not force RGB/R/G/B tabs onto products that need only one response, bend, depth, or easing curve.",
      'Use interpolation: "smooth" for photo/editor-like visual tone, color, and RGB curves where the curve should feel like a creative editor spline.',
      'Use interpolation: "monotone" for depth, response, mask, opacity, threshold, and data-mapping curves where order must be preserved and overshoot is unsafe. Single curves default to monotone unless smooth is explicitly requested.',
      "Single Curves is one labeled control without internal dividers; RGB Curves is the compound variant with channel tabs and section dividers when mixed with sibling controls.",
      "RGB curves acceptance must prove curves.activeChannel and curves.points both affect the product output. Single curves acceptance proves curves.points.",
      "Curves acceptance should include an off-center control point near an edge so smooth-vs-monotone interpolation mistakes are visible in product output.",
      "Do not accept a curves test that only opens the UI or changes selected point state without proving renderer/export output changes.",
    ],
  },
  anchorGrid: {
    ...control("anchorGrid", "AnchorGrid", "standalone", "component-owned"),
    decisionCatalog: decisionCatalog({
      strictness: "best-fit",
      ownsValueModel: [
        "anchor position",
        "edge or corner placement",
        "nine-point alignment",
      ],
      useWhen: [
        "Use AnchorGrid for choosing an anchor, alignment point, or edge/corner placement.",
      ],
      doNotReplaceWith: [
        "Do not use AnchorGrid for freeform two-axis movement; use Vector.",
      ],
      acceptableAlternatives: [
        "Use Vector for continuous position or direction.",
      ],
      layoutConstraints: [
        "AnchorGrid is a standalone position selector.",
      ],
      requiredAcceptance: [
        "Prove selected anchor changes product placement.",
      ],
    }),
    aiUsageRules: [
      "AnchorGrid is a position selector; acceptance must prove anchorGrid.position changes product placement, not only selected button state.",
      "Choose representative edge/corner anchors in browser tests so center-only behavior cannot pass.",
    ],
  },
  channelMixer: {
    ...control("channelMixer", "ChannelMixer", "standalone", "component-owned"),
    decisionCatalog: decisionCatalog({
      strictness: "exact-owner",
      ownsValueModel: [
        "RGB channel mixer",
        "RGB channel matrix",
        "active RGB output channel and RGB source-channel values",
      ],
      useWhen: [
        "Use ChannelMixer only when product behavior edits RGB channel mixing, channel swapping, or an RGB channel matrix.",
      ],
      doNotReplaceWith: [
        "Do not replace ChannelMixer with disconnected sliders for each channel when the active channel matrix matters.",
        "Do not use ChannelMixer for arbitrary non-RGB channels, data channels, audio bands, masks, layers, or option groups.",
      ],
      acceptableAlternatives: [
        "Use Color or Curves for simple color choice or tone curves that are not channel matrix mixing.",
        "Use Select, Segmented, Slider, Curves, or a justified custom control for non-RGB channel-like product domains.",
      ],
      layoutConstraints: [
        "ChannelMixer is a standalone compound control.",
        "ChannelMixer renders content-width internal dividers only when it shares a panel section with sibling controls, with 18px vertical spacing between each divider and the control content; if it is the first control in that section, only the bottom internal divider renders, and if it is the only control in the section, only the parent section dividers render.",
      ],
      requiredAcceptance: [
        "Prove channelMixer.activeChannel and channelMixer.values both affect product output.",
      ],
    }),
    aiUsageRules: [
      "ChannelMixer is RGB-specific: it renders R/G/B tabs and Red, Green, Blue sliders for an RGB channel matrix.",
      "Use ChannelMixer only for RGB channel mixing, channel swapping, or color-correction matrix behavior; do not use it for arbitrary channel lists.",
      "ChannelMixer is a compound control; acceptance must prove channelMixer.activeChannel and channelMixer.values both affect the product output.",
      "Do not accept a channel mixer test that changes only the active tab or only one slider without proving the selected channel matrix is consumed by the renderer/export.",
    ],
  },
  fileDrop: {
    ...control("fileDrop", "FileDrop", "standalone", "component-owned"),
    decisionCatalog: decisionCatalog({
      strictness: "exact-owner",
      ownsValueModel: [
        "source material upload",
        "file import",
        "media import",
        "drop target",
      ],
      useWhen: [
        "Use FileDrop for source material uploads, file import, or drag-and-drop media input.",
      ],
      doNotReplaceWith: [
        "Do not place upload UI on the canvas.",
        "Do not build custom file buttons for source media import.",
      ],
      acceptableAlternatives: [
        "Use ImagePicker when users choose from built-in visual options rather than uploading a file.",
      ],
      layoutConstraints: [
        "FileDrop lives in the controls panel; single-layer apps use its preview and clear behavior.",
        "When fileDrop has multiple: true and more than one image is present, the runtime renders a four-column thumbnail grid with the add-more tile last.",
      ],
      requiredAcceptance: [
        "Prove file import changes media state and product output; prove clear removes source material.",
      ],
    }),
    aiUsageRules: [
      "Use fileDrop for source material uploads in the controls panel, not on the canvas.",
      "In single-layer apps, the runtime shows the uploaded image as the fileDrop preview and provides the clear action.",
      "Use fileDrop with multiple: true when the app needs several uploaded images as one source set; do not build a custom thumbnail uploader for this.",
      "When multiple uploaded images are present, the runtime appends media, shows a four-column preview grid, puts the add-more tile last, and exposes per-image removal.",
      "In multi-layer apps, deletion and visibility belong to the Layers panel; fileDrop remains an upload target.",
    ],
    commands: ["media.delete", "media.import"],
  },
  imagePicker: {
    ...control("imagePicker", "ImagePicker", "standalone", "component-owned"),
    decisionCatalog: decisionCatalog({
      strictness: "exact-owner",
      ownsValueModel: [
        "visual option choice",
        "thumbnail selection",
        "preset image choice",
      ],
      useWhen: [
        "Use ImagePicker when users choose one visual option from a set of thumbnails or images.",
      ],
      doNotReplaceWith: [
        "Do not recreate ImagePicker grids manually.",
        "Do not show choices that the renderer treats as fallback or no-op.",
      ],
      acceptableAlternatives: [
        "Use Select for non-visual named options.",
        "Use FileDrop for user-uploaded source material.",
      ],
      layoutConstraints: [
        "Runtime owns tile sizing by option count.",
      ],
      requiredAcceptance: [
        "Prove each visible image choice changes product output or selected visual data.",
      ],
    }),
    aiUsageRules: [
      "ImagePicker owns thumbnail layout; pass the item list only and do not recreate the grid manually.",
      "Every visible ImagePicker item must be actionable in the current product context.",
      "Do not show selectable image choices that the renderer later sanitizes to a fallback or no-op.",
      "If available choices depend on another control such as template, mode, or selected object, either make every visible item valid for every mode, split the choice into separate semantic controls, or ask the user before implementation.",
      "A defensive invalid-value fallback is allowed, but it is not acceptance proof for a visible ImagePicker option.",
      "Tests must choose each visible ImagePicker item and assert the selected image, texture, gradient, or exported pixels change in the product output.",
      "Do not accept renderer data attributes, runtime target changes, or option existence as final proof that an image choice works.",
    ],
  },
  code: {
    ...control("code", "CodeTextarea", "standalone", "required"),
    decisionCatalog: decisionCatalog({
      strictness: "best-fit",
      ownsValueModel: [
        "long text",
        "multiline content",
        "structured text",
        "prompt",
        "JSON",
        "CSS",
        "shader code",
      ],
      useWhen: [
        "Use CodeTextarea for potentially long, multiline, or structured text values.",
      ],
      doNotReplaceWith: [
        "Do not use repeated TextInput controls for one long content value.",
      ],
      acceptableAlternatives: [
        "Use TextInput for short single-line values.",
      ],
      layoutConstraints: [
        "CodeTextarea is capped at 12 visible lines and scrolls internally.",
      ],
      requiredAcceptance: [
        "Prove long text edits affect product content while typing.",
      ],
    }),
    aiUsageRules: [
      "CodeTextarea is the multiline text input for any potentially long value, not only source code.",
      "Use text for short single-line strings such as names, small numeric values, compact prompts, titles, and short tokens.",
      "Use code when the user may enter long prompts, multiline text, JSON, CSS, shader code, scripts, templates, or other long structured data.",
      "CodeTextarea is a content editor and applies values while typing; do not wait for blur, Enter, or Cmd/Ctrl+Enter to update runtime state.",
      "CodeTextarea height is capped at 12 visible text lines; long content scrolls inside the textarea instead of making the controls panel taller.",
      "Do not name a section Code unless the product value is actually code; use the product role such as Prompt, Instructions, Template, JSON, Shader, or CSS.",
    ],
  },
  customControl: {
    decisionCatalog: decisionCatalog({
      strictness: "custom-escape-hatch",
      ownsValueModel: [
        "product-specific interaction not expressible by built-in controls",
      ],
      useWhen: [
        "Use custom controls only after checking all relevant built-ins and documenting why the closest built-in is insufficient.",
      ],
      doNotReplaceWith: [
        "Do not use custom controls to recreate built-in controls, runtime panels, toolbar, timeline, layers, canvas, or sticky panel actions.",
      ],
      acceptableAlternatives: [
        "Prefer built-in schema controls plus renderer logic whenever the value model fits an existing control.",
      ],
      layoutConstraints: [
        "Custom UI must use Toolcraft primitives and minimal product-specific chrome.",
      ],
      requiredAcceptance: [
        "Document rejected built-ins, prove runtime-state writes, and prove product output or command side effects.",
      ],
    }),
    aiUsageRules: [
      "Use custom controls only for product interactions that built-in controls cannot express.",
      "Do not use a custom control to recreate a built-in Slider, RangeSlider, Select, Segmented, Switch, Checkbox, Color, ColorOpacity, Gradient, FontPicker, ImagePicker, FileDrop, TextInput, CodeTextarea, RangeInput, Palette, Actions, CollectionActions, Curves, AnchorGrid, ChannelMixer, Vector, or PanelActions control.",
      "Custom controls may use Toolcraft primitives for small app-specific chrome, but must not import or render low-level runtime surfaces or duplicate toolbar, timeline, layers, canvas, panel, or built-in control mechanics.",
      "Custom controls must render the minimum UI needed to understand the value, context, and available actions; avoid decorative metadata and text that repeats what the section, label, or visible item already explains.",
      "Every visible custom-control element must justify its space by enabling selection, ordering, preview, removal, upload, editing, or status that affects the product.",
      "Use Toolcraft primitives and tokens for all custom-control chrome; do not hand-style basic buttons, inputs, selects, sliders, scroll areas, or focus states.",
      "Custom-control action buttons must be sized for the interaction. Do not shrink destructive, reorder, upload, or primary actions below comfortable kit button/icon-button sizes just to fit more text.",
      "Choose preview sizes that match the product object scale. A glyph, swatch, chip, or thumbnail can be compact, but its actions and hit targets must stay readable and clickable.",
      "If a custom item needs explanatory context, prefer concise labels such as Darkest, Mid tone, or Lightest; omit file names, long captions, and duplicated helper text unless they are required to distinguish items.",
      "Acceptance and browser tests must prove custom-control interactions work through runtime state and product output, not only that custom markup rendered.",
    ],
    capabilities: ["controlRenderers", "runtime-state", "minimal-ui"],
    commands: [],
    historyPolicy: "patch",
    id: "customControl",
    kind: "control",
    labelPolicy: "required",
    schemaType: "controlRenderers",
    stateMode: "controlled",
    visualComponent: "CustomControlRenderer",
  },
  canvas: {
    aiUsageRules: [
      "Choose canvas.sizing.mode from product context instead of copying a universal 1024px artboard.",
      "Use intrinsic-media for single-layer upload/generation apps so imported media natural size becomes canvas.size.",
      "Use editable-output by default for generated, exportable, shader, poster, badge, wall, banner, thumbnail, and product-output apps where users should see or edit width and height.",
      "When no explicit product size is provided, the runtime default canvas is 16:9 at 1920x1080; do not reset a new product-output app to 1:1 unless the product meaning requires it.",
      "A user-provided base/default size is not a reason to remove size controls; model it as canvas.size plus editable-output unless the prompt or reference explicitly locks output dimensions.",
      "Use fixed-output only when the product output size must not be user-editable, and prove that lock with canvasSizingCoverage fixed-output-size acceptance.",
      "Resolved canvas.size exists for every canvas app, but visible Canvas width and Canvas height controls are mandatory only for editable-output sizing and do not depend on settingsTransfer.",
      "If canvas.size is provided without an explicit sizing mode, defineToolcraft treats it as editable-output and adds Canvas width and Canvas height controls.",
      "The runtime Canvas width and Canvas height block uses the technical Setup section and renders without a visible section heading; do not add a separate Canvas section label above these fields.",
      "When the user manually edits Canvas width or Canvas height, the runtime keeps the typed dimension, keeps the other dimension unchanged, switches Aspect ratio to Custom, and shows the reduced current ratio in the custom ratio inputs.",
      "Aspect ratio presets are the only interaction that may resize both canvas dimensions from a preset; manual size inputs are exact output dimensions.",
      "For non-vector raster, Canvas 2D, WebGL, and WebGPU previews, set canvas.renderScale: true so the runtime adds Resolution scale after canvas sizing. The scale changes backing pixels from 1x to 2x without changing visible canvas size, and adding/enabling it requires targeted browser evidence that the canvas stays responsive at the selected scale.",
      "After enabling canvas.renderScale, verify that canvas preview stays responsive while dragging sliders and other high-frequency controls at the selected scale.",
      "Performance fixes for canvas.renderScale must preserve the selected visual quality; do not silently downsample, stretch a lower-resolution backing canvas, blur output, or clamp canvas.renderScale below the user's chosen value to pass budgets.",
      "Do not enable canvas.renderScale for DOM/SVG/vector-native previews; preserve vector fidelity through native vector rendering instead of raster supersampling.",
    ],
    capabilities: ["drag", "zoom", "radar", "upload", "editable-size"],
    commands: [
      "canvas.setSize",
      "canvas.panBy",
      "canvas.setOffset",
      "canvas.center",
      "canvas.zoomIn",
      "canvas.zoomOut",
      "canvas.zoomReset",
      "media.delete",
      "media.import",
    ],
    historyPolicy: "patch",
    id: "canvas",
    kind: "canvas",
    schemaType: "canvas",
    stateMode: "runtime-owned",
    visualComponent: "CanvasShell",
  },
  persistence: {
    aiUsageRules: [
      "Do not write app state to localStorage directly.",
      "Use schema persistence policy for app state that should survive reload.",
      "Persistence may include values, canvas, panels, timeline, and layers; history and media blobs are not persisted.",
      'Apps with visible runtime panels and localStorage persistence must include "panels" so dragged panel positions survive reload.',
      'Apps with localStorage persistence must include acceptance coverage for changing a user setting, reloading the browser page, and seeing the restored value or product output.',
      "Settings import/export is a preset transfer feature for complex apps; it must not be used to hide or replace broken persistence reload behavior.",
      "Do not store media blobs, files, or large generated images in localStorage.",
    ],
    capabilities: ["themePreference", "appStatePolicy"],
    commands: [],
    historyPolicy: "never",
    id: "persistence",
    kind: "persistence",
    schemaType: "persistence",
    stateMode: "runtime-owned",
    visualComponent: "none",
  },
  settingsTransfer: {
    aiUsageRules: [
      'Use schema settingsTransfer: "auto" for complex apps unless the prompt explicitly disables settings import/export.',
      "After adding, removing, or reorganizing controls, sections, timeline, or layers, recalculate settings-transfer eligibility. The runtime threshold is 12 product controls, 5 product sections, or weighted score 18.",
      "Do not hand-roll settings import/export through app routes, hidden file inputs, or panelActions.",
      "Settings transfer appears as the first technical Setup controls-panel section when enabled and renders without a visible section heading; it imports and exports control values, canvas size, and timeline state.",
      "A settings-transfer section with only Export Settings and Import Settings means canvas sizing is not editable-output or canvas size controls already exist elsewhere.",
      "When settings transfer and editable-output canvas sizing are both enabled, the first technical Setup runtime section contains Export Settings, Import Settings, Aspect ratio, Canvas width, Canvas height, and optional Resolution scale in that order and renders without a visible section heading.",
      "Keep sticky footer panelActions for product delivery actions only, such as Export PNG, Export Video, Copy, Generate, Apply, or Download.",
    ],
    capabilities: ["settings-import-export"],
    commands: ["controls.setValue", "timeline.setCurrentTime", "timeline.setDuration"],
    historyPolicy: "patch",
    id: "settingsTransfer",
    kind: "settings",
    schemaType: "settingsTransfer",
    stateMode: "runtime-owned",
    visualComponent: "SettingsTransfer",
  },
  appEntityAcceptance: {
    aiUsageRules: [
      "Every app entity introduced by the AI must have an acceptance test that proves its product responsibility.",
      "Compound controls must declare controlPartCoverage for every semantic value part required by their control type.",
      "Compound control browser tests must explicitly exercise each required value part, not only one visible sub-control.",
      "Acceptance tests must fail when an entity is disconnected from runtime state, renderer output, export output, or command side effects.",
      "Do not accept typecheck, component existence, registered commands, runtime state mutation, renderer input objects, shader uniform presence, or signature strings as final proof.",
      "Use product-level observables such as rendered pixels, exported image bytes, canvas hash, clipboard payload, cleared media preview, selected layer result, changed viewport, or timeline-rendered frame.",
      "A generic canvas hash difference is not enough for workload or semantic controls; assert the intended direction of the effect.",
      "Component variants are accepted entities too; tests should fail if a non-default Toolcraft control variant falls back to the default variant or custom markup.",
      "Conditional entities require fixtures that make the condition observable.",
      "Use visibleWhen for mode-, type-, variant-, or count-exclusive sections or controls that do not belong to the current selected state.",
      "When a count/quantity control determines how many sibling controls are available, hide unavailable siblings with visibleWhen; do not render all possible controls while the renderer reads only the first N.",
      "Use disabledWhen for controls that belong to the current entity but are temporarily unavailable for the selected mode; the disabled value must be preserved.",
      "Do not leave inactive conditional controls visible and enabled while making the renderer ignore them.",
      "If an entity cannot be tested against a product-level observable, remove it from the app schema or ask whether it is required.",
    ],
    capabilities: ["acceptance-tests", "product-output-verification"],
    commands: [],
    historyPolicy: "never",
    id: "appEntityAcceptance",
    kind: "composition",
    schemaType: "appEntityAcceptance",
    stateMode: "runtime-owned",
    visualComponent: "none",
  },
  performanceAcceptance: {
    aiUsageRules: [
      "Custom renderers must define performance budgets for media import, preview updates, control drags, and export/copy before implementation.",
      "Controls that change renderer workload, such as Char Size, Grid Density, Matrix Scale, Sample Count, Resolution, Blur Radius, Iterations, Particle Count, or Quality, must be tested at min, default, and max values.",
      "Hash differs is not enough for workload controls; tests must assert semantic direction, for example smaller Char Size increases glyph/cell density and larger Char Size decreases it.",
      "Performance tests must use representative fixtures and the same renderer/export path as the running app, not only tiny 32px fixtures or isolated helper state.",
      "Expensive renderers must cache decoded media, source pixels, glyph atlases, gradients, and other reusable inputs by media id, canvas size, and stable control keys.",
      "Slider drags and high-frequency controls must debounce or coalesce preview work, cancel stale async renders, and avoid re-decoding media on every control change.",
      "Performance matrices must declare rendererWorkload as none, simple-composition, text-output, vector-output, or pixel-output.",
      "A full performance checkpoint must run with pnpm verify:perf only when the first working app version exists or the user requests performance, lag, jank, animation speed, drag/zoom stabilization work, or otherwise complains about performance.",
      "Renderer, canvas, animation, export, timeline, layers, canvas.renderScale, bug fixes, and performance-sensitive control changes use targeted functional/browser checks first and targeted performance scenarios only for touched workload, viewport, or export paths.",
      "Performance fixes must preserve selected output and preview quality; do not reduce image quality, selected renderScale, export resolution, source media fidelity, or canvas backing pixels as the hidden way to pass budgets.",
      "When canvas or slider interactions lag, diagnose where the slowdown comes from before changing output quality: renderer technique, React update frequency, decoded media, shader/program setup, buffer uploads, layout work, async render cancellation, or animation scheduling.",
      "Renderer specs must include a Renderer Technique Decision Matrix with sourceRepresentation, productRepresentation, previewRenderer, exportRenderer, rendererWorkload, rendererStrategy, whyNotAlternativeStrategies, fidelityRisks, and performanceRisks.",
      "Custom renderer apps must mirror the Renderer Technique Decision Matrix in typed rendererTechnique config so validation can reject contradictory renderer choices.",
      "Custom renderer specs must include a Renderer Layer Inventory and mirror it in typed rendererTechnique.layers so dense raster backgrounds cannot silently rasterize semantic foreground output.",
      "Semantic foreground output such as product lines, shapes, icons, text, object bounds, and meaningful markers should use DOM or SVG by default; dense raster backgrounds do not justify rasterizing low-count foreground geometry or text.",
      "Editing handles must be DOM/SVG overlays, excluded from export, and written through runtime state instead of being drawn into the product raster layer.",
      "Product foreground and editing handle renderer layers must declare uiSelector so browser tests can verify the visible layer exists.",
      'productRepresentation "mixed" is valid only when rendererTechnique.layers proves at least two different content families.',
      "Choose renderer technique from product context, not convenience or novelty. Preserve reference renderer technology in reference-runtime-clone mode unless a concrete blocker and replacement acceptance tests are named.",
      "Do not switch renderer technology just because it seems more modern or faster. Preview and export may use different renderers only when the decision matrix explains why and export/copy remains product-quality.",
      "Choose renderer workload by product fidelity before choosing rendering technology: ASCII, glyph grids, code art, subtitles, typography, or monospace text products are text-output unless the product intentionally rasterizes them into per-pixel effects.",
      "Text-output and vector-output visible previews must preserve native output fidelity. Do not render a low-resolution offscreen canvas or texture and upscale it to the product size.",
      "Pixel-output renderers must use WebGL or WebGPU even when the scene is static.",
      "Procedural pixel renderers, shader-like effects, animated mesh gradients, and large exportable previews should use WebGL or WebGPU for pixel work instead of main-thread ImageData loops.",
      "WebGL and WebGPU renderers must initialize contexts, programs, shaders, pipelines, textures, and large buffers once, then update uniforms or stable buffers when controls change.",
      "For keyframe or playback renderers, texture upload and media decode must be keyed to source media/resource changes, not to timeline time or evaluated settings. Timeline-only updates must reuse decoded media and existing GPU resources.",
      "Do not create WebGL/WebGPU contexts, shader programs, textures, or requestAnimationFrame loops directly in the React render path.",
      "Animation loops must cancel scheduled frames during cleanup.",
      "Animated preview renderers must suspend or coalesce non-essential animation work while the user drags, pans, pinches, zooms, or centers the canvas viewport, then resume from the correct timeline or autonomous time without changing the user's play/pause state.",
      "If a generated app uses ImageData, getImageData, or putImageData for procedural output, performance validation must fail unless the renderer is converted to GPU rendering or the CPU path is removed.",
      "Performance matrices must declare rendererStrategy so tests can distinguish none, dom, svg, canvas-2d, webgl, and webgpu renderer paths.",
      "Browser verification must interact with the actual UI, exercise worst-case control values, and fail if the app freezes, creates runaway render loops, drops canvas zoom/offset, or misses the performance budget.",
      "If a renderer cannot meet the budget, reduce the work units, clamp the control range, move work off the critical path, or remove the control.",
    ],
    capabilities: ["performance-budgets", "workload-control-tests"],
    commands: [],
    historyPolicy: "never",
    id: "performanceAcceptance",
    kind: "composition",
    schemaType: "performanceAcceptance",
    stateMode: "runtime-owned",
    visualComponent: "none",
  },
  referenceRuntimeClone: {
    aiUsageRules: [
      'Use transferMode: "reference-runtime-clone" when the user asks to port, clone, copy, or reproduce an existing app exactly.',
      "Preserve the reference runtime as the source of truth instead of replacing it with a new renderer or timeline model.",
      "Port requestAnimationFrame loops, refs, mutable particle/object state, connection state, spawn/update cadence, lifetime rules, pause/resume, export/copy, canvas sizing, and media lifecycle when the reference depends on them.",
      "Keep Toolcraft as the shell: defineToolcraft, ToolcraftApp, schema controls, canvasContent, fileDrop, panelActions, and runtime commands.",
      "Reference clone timeline choice is based on timeline behavior, not only on whether the reference draws a timeline-shaped UI.",
      "If the reference has Play/Pause, Restart from beginning, current time/progress, duration, loop, scrub, selected range, trim handles, or video export timing, write a Reference Timeline Inventory before choosing a timeline mode.",
      'Use referenceTimeline.mode "toolcraft-playback" for plain transport behavior such as play/pause, restart, duration/progress, loop, scrub, or export at time.',
      'Use referenceTimeline.mode "toolcraft-keyframes" when controls need keyframe diamonds, expanded keyframe rows, easing, or editable keyframes.',
      'Use referenceTimeline.mode "none" only when the reference has no user-facing transport behavior at all.',
      "Reference clone specs must list every detected transport behavior explicitly, including pause-resume, restart, time-progress, export-at-time, playback, scrub, duration, loop, and keyframes when present.",
      "Do not create right-panel controls named or targeted as Play, Pause, Paused, Animate, Restart animation, or equivalent app-wide transport toggles.",
      'Do not downgrade custom reference timelines to panels.timeline mode "playback". State buttons, trim handles, selected-range playback, or range export require referenceTimeline.mode "custom-reference-timeline" and dedicated acceptance.',
      "Generated reference clone apps must declare appTransferMode.referenceTimeline with mode none, toolcraft-playback, toolcraft-keyframes, or custom-reference-timeline.",
      "Custom reference timeline behavior needs referenceTimelineCoverage entries such as state-jump, trim-range, range-playback, all-range, jump-to-trim-start, and export-range.",
      "Reference clone acceptance must include referenceCoverage rows for canvas sizing, control mapping, renderer state, and any renderer loop, spawn/update cadence, pause/resume, export/copy, or media lifecycle behavior in the reference.",
      "Browser tests must compare reference behavior or a reference-derived baseline, not only Toolcraft state mutation.",
    ],
    capabilities: [
      "reference-runtime-clone",
      "reference-behavior-acceptance",
      "reference-timeline-inventory",
      "canvasContent-renderer",
    ],
    commands: [],
    historyPolicy: "never",
    id: "referenceRuntimeClone",
    kind: "composition",
    schemaType: "transferMode",
    stateMode: "runtime-owned",
    visualComponent: "canvasContent",
  },
  controlLabels: {
    aiUsageRules: [
      "Control labels must be short UI names, usually one to three words.",
      "Do not put explanations, formulas, units, parenthetical hints, or usage instructions in control labels.",
      "A concise property label such as Speed, Color, Size, or Opacity is allowed when the nearest visible section or group clearly names the affected product entity.",
      "When the section is generic, mixed, missing, or otherwise weak context, include the affected entity or role in the label: Pattern color, Background opacity, Wave speed, Stroke width.",
      "Acceptance validators suggest semantic replacement labels for weak generic labels; fix the schema label instead of relying on runtime fallback rewriting.",
      "Controls-panel sections should stay discrete: two to seven product controls is the normal size, and larger sections must split by product sub-entity or workflow stage.",
      "Every app-authored controls-panel body section must have a short meaningful visible title. Runtime-created setup/settings sections use the technical title Setup but render without a visible heading; sticky footer action sections use the technical title Export but render without a visible heading.",
      "Every visible controls-panel section title renders through the standard 36px collapsible header row with vertically centered text and the runtime collapse icon; generated apps must not hand-build section headers.",
      "Controls-panel section expand and collapse uses the standard runtime height/opacity animation; generated apps must not replace it with instant custom section visibility.",
      "Ordinary controls-panel section collapsed/expanded state persists as a runtime UI preference per app. It is not undo/redo state, not settings import/export state, and Reset controls must not clear it. Runtime technical Setup/settings sections and sticky footer Export sections are not collapsible.",
      "Ordinary controls-panel section headers expose the runtime section reset action before the collapse button; it dispatches controls.resetTargets and restores only that section's control targets to their schema defaultValue.",
      "Ordinary controls-panel body sections use 8px top spacing and 24px bottom spacing for their control content. Runtime technical Setup/settings sections use 12px top and bottom spacing to match side padding. Sticky footer action sections keep their dedicated spacing.",
      "Broad section titles such as Flow, Icon, Shapes, Scene, Text, Typography, or Motion are only valid for small cohesive groups; use specific titles such as Flow Motion, Flow Geometry, Letter Burst, Shape Colors, Logo Glow, Logo Plate, or Text Block for larger groups.",
      "Section titles in one controls panel must be unique.",
      "Use section titles, option labels, tests, or renderer/spec prose for details instead of long field labels.",
      "Bad: Grid Density (every Nth). Good: Grid Density, with Every 6th as the select option label.",
      "Use control.description for the short help tooltip shown beside visible labels. It must describe the product behavior or output affected by the control, not restate the label.",
      "Do not write label-recap descriptions such as Adjusts Opacity, Controls Speed, or Sets Background.",
      "If there is no useful product-specific explanation, omit control.description; the runtime should not show a help tooltip for that label.",
      "Do not add control.description to sequential colors such as Color 1, Color 2, or simple palette controls such as Spread when the section title already names the color or palette context.",
      "For compound controls such as FontPicker, do not use control.description to enumerate the control's owned fields. FontPicker descriptions must not recap font family, weight, size, case, color, opacity, letter spacing, or line height; use description only for non-obvious product scope or omit it.",
      "The runtime renders a filled Phosphor question icon beside each visible ControlFieldLabel; generated apps must not hand-build their own help icon beside built-in labels.",
      "If a source label is unavoidably long, keep the visible label concise and rely on the native title tooltip for the full text.",
    ],
    capabilities: ["short-labels", "control-description-tooltip", "native-title-tooltip"],
    commands: [],
    historyPolicy: "never",
    id: "controlLabels",
    kind: "composition",
    schemaType: "controlLabels",
    stateMode: "runtime-owned",
    visualComponent: "ControlFieldLabel",
  },
  controlsPanel: panel("controlsPanel", "ControlsPanel", "right", ["left", "right"], "handle"),
  layersPanel: {
    ...panel("layersPanel", "LayersPanel", "left", ["left", "right"], "handle"),
    aiUsageRules: [
      "Enable panels.layers only when the app needs editable layer selection, ordering, grouping, visibility, or multi-object media management.",
      "Do not enable the layers panel for single-layer apps.",
      "If the user intent is ambiguous, ask whether layer management is required before enabling panels.layers.",
      "When layers are enabled, layer-specific controls should target selectedLayer.* and apply to the currently selected runtime layer.",
      "Do not use selectedLayer.* targets when panels.layers is disabled; single-layer apps use app-specific targets.",
      "Layer-enabled apps need layerCoverage acceptance for selection, visibility, reorder, and grouping.",
      "Every selectedLayer.* control needs selected-layer-controls acceptance proving it edits the currently selected layer output.",
      "Layer browser coverage must use real LayersPanel rows and buttons, not direct layers.* command dispatch.",
      "Layer-enabled custom renderers need layers.interactions viewport-stability coverage around real selection, visibility, reorder or grouping, and selected-layer output checks.",
    ],
    capabilities: [
      "draggable",
      "snap",
      "doubleClickReset",
      "dragMode:handle",
      "groups",
      "selection",
      "visibility",
    ],
    commands: [
      "layers.add",
      "layers.delete",
      "layers.moveToGroup",
      "layers.rename",
      "layers.reorder",
      "layers.select",
      "layers.toggleCollapsed",
      "layers.toggleVisibility",
    ],
  },
  timelinePanel: {
    ...panel("timelinePanel", "TimelinePanel", "top", ["top", "bottom"], "panel"),
    aiUsageRules: [
      "Do not enable the timeline panel just because a renderer is animated.",
      "Before choosing no timeline for any animated product, write an Animation Intent Inventory: product transport, editable keyframes, or autonomous decorative output, plus the user-facing time behaviors present or intentionally absent.",
      'User-requested product animation defaults to panels.timeline mode "playback" unless the spec explicitly declares autonomous decorative/self-running output with no play, pause, scrub, duration, loop, or export-at-time behavior.',
      'Use panels.timeline: { mode: "playback" } when the product needs user-facing play, pause, scrubbing, duration, loop, restart, time progress, or export-at-time controls.',
      "Playback renderers must consume runtime timeline state; pause freezes output, scrubbing renders a deterministic frame, and the full animation cycle maps to state.timeline.durationSeconds instead of a local fixed duration.",
      "Playback renderers may compute an initial default duration, but must not watch state.timeline.durationSeconds and dispatch timeline.setDuration back to a computed local duration. User-edited timeline duration is the source of truth after initialization or reset.",
      "When non-looping playback reaches the end, pressing Play again restarts playback from time 0.",
      "Intrinsic-media upload timelines must stay paused at time 0 until source media exists; clearing the last media asset must pause and reset playback.",
      'Use panels.timeline: { mode: "keyframes" } or panels.timeline: true only when controls need keyframe diamonds, expanded timeline rows, easing, or keyframe editing.',
      "In keyframes mode, Toolcraft infers keyframe diamonds from control type; AI must not manually pick a smaller subset of slider/vector/color-style controls.",
      "Keyframe state stores typed control values; valueLabel is display-only and must never be parsed by renderers or tests as the source of truth.",
      "Custom renderers with keyframes must consume evaluateToolcraftTimelineValues or useToolcraftEvaluatedValues for keyframed settings instead of raw state.values for those targets.",
      "Every inferred keyframe-capable control must be evaluated from runtime timeline keyframes and needs acceptance proving diamond creation, row creation, keyframe updates, scrub/playback evaluation, and product output change.",
      "Keyframe custom renderers must prove zoom, radar, and canvas viewport stability while expanding the timeline, creating keyframes, and scrubbing or playing the timeline.",
      "Keyframe renderers must not re-decode media or re-upload source textures on timeline ticks, scrubs, playback, or evaluated setting changes.",
      "Timeline-driven preview renderers must suspend or coalesce non-essential animation work during canvas drag, pan, pinch, zoom, and radar/center interactions without mutating the user's timeline play/pause state.",
      "Use keyframeable: false only on controls that are structurally unsupported by the shared keyframe capability helper; capable controls cannot opt out to hide broken animation wiring.",
      "Right-panel animation controls may tune renderer parameters such as mode, intensity, speed, or stagger only after animation intent is declared; they must not replace top timeline transport.",
      "Do not put Pause or Resume in panelActions; playback belongs to TimelinePanel transport controls.",
      "Do not replace TimelinePanel with an app-level playback, transport, or timeline panel to avoid runtime performance issues; fix the Toolcraft runtime clock/state path instead.",
      'Custom timeline UI is allowed only for explicit referenceTimeline.mode "custom-reference-timeline" transfers with browser-backed referenceTimelineCoverage.',
      "Playback-only timelines stay collapsed and do not show keyframe diamonds or expanded keyframe rows.",
      "If timeline verification fails, wire the renderer to runtime timeline state or remove panels.timeline.",
    ],
    capabilities: [
      "draggable",
      "snap",
      "doubleClickReset",
      "dragMode:panel",
      "duration",
      "keyframes",
      "playback",
    ],
    commands: [
      "timeline.changeKeyframeEasing",
      "timeline.deleteControlKeyframes",
      "timeline.deleteKeyframe",
      "timeline.moveKeyframe",
      "timeline.selectKeyframe",
      "timeline.setCurrentTime",
      "timeline.setDuration",
      "timeline.setPlaying",
      "timeline.toggleLoop",
      "timeline.togglePlayback",
    ],
  },
  toolbar: {
    ...panel("toolbar", "ToolbarPanel", "bottom", ["top", "bottom"], "panel"),
    aiUsageRules: [
      "Toolbar history owns Undo and Redo buttons plus runtime keyboard shortcuts.",
      "Do not add app-level Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z, or Ctrl+Y listeners; use toolbar history and runtime commands.",
      "Undo/redo keyboard shortcuts must not fire while the user is typing into inputs, textareas, selects, or contentEditable value labels.",
    ],
    capabilities: [
      "draggable",
      "snap",
      "doubleClickReset",
      "history",
      "keyboardShortcuts",
      "zoom",
      "radar",
    ],
    commands: [
      "history.undo",
      "history.redo",
      "canvas.center",
      "canvas.zoomIn",
      "canvas.zoomOut",
      "canvas.zoomReset",
    ],
    kind: "toolbar",
  },
} as const satisfies Record<string, ToolcraftComponentContract>;

export type ToolcraftComponentContractId = keyof typeof TOOLCRAFT_COMPONENT_CONTRACTS;

export function getToolcraftComponentContract<const Id extends ToolcraftComponentContractId>(
  id: Id,
): (typeof TOOLCRAFT_COMPONENT_CONTRACTS)[Id] {
  return TOOLCRAFT_COMPONENT_CONTRACTS[id];
}

function decisionCatalog(
  catalog: ToolcraftControlDecisionCatalog,
): ToolcraftControlDecisionCatalog {
  return catalog;
}

function control<
  const Id extends string,
  const VisualComponent extends string,
  const SectionLayout extends ToolcraftSectionLayout,
  const LabelPolicy extends ToolcraftLabelPolicy,
>(
  id: Id,
  visualComponent: VisualComponent,
  defaultSectionLayout: SectionLayout,
  labelPolicy: LabelPolicy,
): {
  readonly defaultSectionLayout: SectionLayout;
  readonly historyPolicy: "patch";
  readonly id: Id;
  readonly kind: "control";
  readonly labelPolicy: LabelPolicy;
  readonly schemaType: Id;
  readonly stateMode: "controlled";
  readonly visualComponent: VisualComponent;
} {
  return {
    defaultSectionLayout,
    historyPolicy: "patch",
    id,
    kind: "control",
    labelPolicy,
    schemaType: id,
    stateMode: "controlled",
    visualComponent,
  };
}

function panel<
  const Id extends string,
  const VisualComponent extends string,
  const Placement extends ToolcraftPanelPlacement,
  const SnapEdges extends readonly ToolcraftPanelSnapEdge[],
  const DragMode extends "handle" | "panel",
>(
  id: Id,
  visualComponent: VisualComponent,
  defaultPlacement: Placement,
  snapEdges: SnapEdges,
  dragMode: DragMode,
): {
  readonly aiUsageRules: readonly [`Render ${VisualComponent} only through PanelHost.`];
  readonly capabilities: readonly [
    "draggable",
    "snap",
    "doubleClickReset",
    `dragMode:${DragMode}`,
  ];
  readonly defaultPlacement: Placement;
  readonly historyPolicy: "optional";
  readonly id: Id;
  readonly kind: "panel";
  readonly requiredWrapper: "PanelHost";
  readonly schemaType: Id;
  readonly snapEdges: SnapEdges;
  readonly stateMode: "runtime-owned";
  readonly visualComponent: VisualComponent;
} {
  return {
    aiUsageRules: [`Render ${visualComponent} only through PanelHost.`],
    capabilities: [
      "draggable",
      "snap",
      "doubleClickReset",
      `dragMode:${dragMode}` as const,
    ],
    defaultPlacement,
    historyPolicy: "optional",
    id,
    kind: "panel",
    requiredWrapper: "PanelHost",
    schemaType: id,
    snapEdges,
    stateMode: "runtime-owned",
    visualComponent,
  };
}
