# Toolcraft App Template Assembly Guide

This is a standalone Toolcraft template app generated from the base starter.

## Required Preflight

Treat this `AGENTS.md` as the active project contract. Before planning or editing app code, runtime code, controls, canvas, panels, renderer, timeline, layers, export, or tests, you must read:

1. `docs/toolcraft/workflow.md`

Then follow `workflow.md` to choose the required contract docs and verification tier. Do not edit implementation files until this preflight is complete.

## Quick Entry Contract

1. Build through `defineToolcraft` and `ToolcraftApp`.
2. Keep app state in Toolcraft runtime schema and commands.
3. Keep product output in `canvasContent`; never render app UI there.
4. Use built-in Toolcraft controls before custom controls.
5. Do not hand-compose runtime surfaces or render built-in control components directly in app code; use `ToolcraftApp`, schema controls, `canvasContent`, `controlRenderers`, `onPanelAction`, and runtime commands.
6. Before writing controls, make a Control Section Inventory that groups controls by product entity or workflow stage, not by UI component type.
7. Keep control `label` short but semantically sufficient with the nearest visible section/group context, and put product-specific behavior help in schema `description`; runtime renders the label help tooltip only when that description adds meaning beyond the label.
8. Enable layers and timeline only when product behavior requires them, then test the real UI.
9. Animated preview renderers suspend or coalesce non-essential animation work during canvas drag, pan, pinch, zoom, and radar/center interactions, then resume without changing user playback state.
10. If a Figma URL is provided, inspect the Figma file through MCP and rebuild from its structure; never implement from a screenshot or by eye.
11. Choose an explicit persistence policy; use schema `persistence` for user-edited app settings that should survive reload, and test real reload restoration when localStorage is enabled.
12. Use schema `settingsTransfer: "auto"` for complex apps that need import/export of control settings; never implement settings import/export through `panelActions` or route-local file inputs. After adding, removing, or reorganizing controls, sections, timeline, or layers, recalculate settings-transfer eligibility. The runtime threshold is 12 product controls, 5 product sections, or weighted score 18. Visible `Aspect ratio`, `Canvas width`, and `Canvas height` controls are owned by `editable-output` canvas sizing, not by settings transfer. Runtime aspect presets apply canonical canvas sizes, with `16:9` equal to `1920x1080`; manual Canvas width/height edits keep the typed dimension, keep the other dimension unchanged, switch Aspect ratio to Custom, and show the reduced current ratio in custom ratio inputs; when no explicit product size is provided, the runtime default canvas size is also `1920x1080`. Product-output, exportable, shader, procedural, and reference-clone apps use `editable-output` unless the prompt/reference explicitly locks a real fixed-format deliverable size; a reference app lacking a size editor is not a `fixed-output` reason. Non-vector raster, Canvas 2D, WebGL, and WebGPU previews set `canvas.renderScale: true`; the first technical runtime section then appends `Resolution scale` after canvas sizing so backing pixels can increase up to 2x without changing CSS/output size. Performance fixes must preserve the selected render scale and keep canvas preview responsive to sliders/high-frequency controls at that scale; diagnose the bottleneck before reducing quality. Do not pass budgets by silently downsampling, stretching a lower-resolution backing canvas, blurring output, or clamping `canvas.renderScale` below the user's chosen value. When settings transfer and editable-output canvas sizing are both enabled, the first technical `Setup` runtime section contains `Export Settings`, `Import Settings`, `Aspect ratio`, `Canvas width`, `Canvas height`, and, for raster outputs, `Resolution scale` in that order and renders without a visible section heading.
13. Product apps expose a required `Background` section directly before export settings. It contains a Switch labeled `Include` and a background color control with `label: false` in one equal-width inline row; PNG export wires those runtime values into the standard export helper, live preview uses `shouldIncludeToolcraftPreviewBackground(state)` so Include can hide the product background, and video export keeps the background. Every app with `Export PNG` exposes `Image Export` with `export.image.format` and `export.image.resolution` as two `select` controls in one compact two-column inline row, and passes the selected resolution to `createToolcraftPngExportCanvas({ resolution })` so 2K/4K/8K change actual PNG dimensions. Animated apps with both PNG and video export place `Image Export` immediately before `Video Export`.
14. Keep `docs/toolcraft/agent-worklog.md` current with a decision trail, product decisions, evidence, verification, and risks.
15. Prove every visible entity through acceptance, browser, and performance coverage.
16. Workload performance scenarios must declare `stressFixture` for the tested control value; browser perf tests must use `getToolcraftPerformanceStressValue(appPerformance, scenarioId)` so heavy-case tests cannot use toy values. When the tested control is not itself the whole heavy source, declare `workloadFixture` and apply it first with `getToolcraftPerformanceWorkloadValue` or `applyToolcraftPerformanceWorkloadFixture`; this is the app baseline such as large media, long text, many items, or high render scale, and it must be paired with the measured `stressFixture`. Media import and image-processing workloads use `kind: "media"` fixtures at least `1920x1080`-equivalent, and heavy pixel/media Canvas 2D must evaluate WebGL/WebGPU with measured evidence before staying on CPU.
17. Custom renderer apps declare a Render Pipeline Inventory in typed `rendererPipeline`: render passes, cache keys, execution location, preview/export quality, and interaction invalidation.
18. Classify every implementation pass with a verification tier before editing. Use targeted checks for incremental edits and the full final gate only for final delivery, exports, or architecture/runtime/template changes.

## Starter Baseline

The generated folder starts as a neutral Toolcraft shell: canvas upload plus toolbar. It intentionally does not include demo controls, prompt fields, layers, or timeline. Do not treat test fixtures or documentation examples as product requirements. Add controls, timeline, layers, sticky actions, persistence, and custom renderers only after the requested product or reference app requires them.

When the folder becomes a real product, update `src/app/app-acceptance.ts` from `appProductReadiness.mode: "starter"` to `mode: "product"` and fill `productName`, `productSummary`, and `requestedBehavior`. Renamed product folders are not allowed to keep neutral starter readiness.

## License

This project includes Toolcraft source code governed by the Toolcraft Designer License in `LICENSE.md`. `NOTICE.md` explains that generated apps include Toolcraft runtime, starter, UI component, documentation, and template source code. Designer client work is permitted under the license, and using AI coding assistants or agents such as Codex, Claude, ChatGPT, Cursor, or similar tools to work on generated apps is permitted. Platform, generator, AI software product, app-builder, website-builder, template-marketplace, and resale uses require a separate commercial license from Pixel Point.

## Local Reference Docs

Use this `AGENTS.md` as the entry contract. Use local docs for detail; the app must remain buildable without the website.

- `docs/toolcraft/workflow.md` — required preflight, task routing, worklog gate, and verification routing.
- `docs/toolcraft/assembly-workflow.md` — runtime assembly, canvas output, and reference clone path.
- `docs/toolcraft/decision-contract.md` — rule ids, levels, and enforcement expectations.
- `docs/toolcraft/schema-reference.md` — schema authoring rules for `src/app/app-schema.ts`.
- `docs/toolcraft/component-rules.md` — slider, segmented, color, upload, image picker, vector, layers, timeline, and footer action rules.
- `docs/toolcraft/acceptance-testing.md` — app entity matrix and browser acceptance for `src/app/app-acceptance.ts`.
- `docs/toolcraft/performance.md` — performance roles, scenarios, and workload coverage for `src/app/app-performance.ts`.
- `docs/toolcraft/renderer-technique.md` — DOM, SVG, Canvas 2D, WebGL, and mixed renderer choices.
- `docs/toolcraft/agent-worklog.md` — implementation decision trail, evidence, verification, and remaining risks.
- `docs/toolcraft/custom-controls.md` — custom control registration through `controlRenderers`.

## Edit Surface

- Build the product by editing `src/app/app-schema.ts` and app-specific files under `src/app` and `src/routes`.
- Keep route files thin: routes compose schema-backed app screens and product renderers.
- Keep `src/app/app-acceptance.ts` aligned with every visible product entity.
- Keep `src/app/app-performance.ts` as app-specific performance matrix config only.
- Do not paste, restore, or duplicate runtime validators inside `src/app/app-performance.ts`.
- Do not edit `src/toolcraft` unless you are intentionally changing the local copied Toolcraft runtime.
- Before final delivery, replace the starter worklog with `Mode: product`, add `Decision Trail` entries for significant implementation passes, and record concrete decisions for renderer, timeline, layers, controls, export, and performance. Each decision-trail iteration must name the user-visible result, source/reference checked, contract rules applied, rejected alternatives, and state/output mapping. `pnpm test` fails if the worklog is missing, lacks the decision trail, or still describes the neutral starter.
- `pnpm test` includes Toolcraft source integrity and local docs checks. If a desired control style is missing, fix the schema or regenerate from the upstream template/runtime; do not patch copied `src/toolcraft` files for one app.

## Decision Contract Rule IDs

These ids mirror `TOOLCRAFT_DECISION_CONTRACT` in `@/toolcraft/runtime`. Keep this list synced so standalone instructions do not drift from runtime validators.

- `runtime-shell-required`
- `canvas-no-app-ui`
- `canvas-surface-preserved`
- `canvas-handle-placement`
- `panel-host-behavior`
- `layers-enable-only-when-needed`
- `layers-enabled-behavior`
- `timeline-mode-choice`
- `timeline-enabled-behavior`
- `controls-product-coverage`
- `output-export-required`
- `controls-layout-heuristics`
- `renderer-technique-inventory`
- `reference-clone-source-of-truth`
- `acceptance-product-observable`
- `performance-coverage-levels`
- `persistence-policy-explicit`
- `workflow-required`

## Runtime Contract

- Use `defineToolcraft` from `@/toolcraft/runtime`.
- Render the app through `ToolcraftApp` from `@/toolcraft/runtime/react`.
- Use `<ToolcraftApp schema={appSchema} />` for schema-only apps.
- Use `<ToolcraftApp schema={appSchema} canvasContent={<ProductRenderer />} />` for custom product renderers.
- Use `renderDefaultCanvasMedia={false}` when a custom renderer replaces the default media preview.
- Use `ToolcraftApp onPanelAction` for sticky footer product actions such as Generate, Apply, Export, Copy, or Download.
- Keep final app behavior in the schema and runtime command bus, not in isolated local control state.
- For animated products, write an Animation Intent Inventory before coding: use top playback timeline for product transport, keyframes timeline for editable property animation, and no timeline only for explicitly autonomous decorative output.
- For keyframes timeline apps, renderers read keyframed settings through Toolcraft evaluated-value helpers/hooks. Do not parse timeline `valueLabel` strings or read raw `state.values` for keyframed targets.
- Use schema `defaultValue` for every resettable control.
- Route editor-owned actions through runtime commands such as `controls.reset`, `media.import`, `media.delete`, `canvas.center`, `history.undo`, and `history.redo`.

## Required AI Workflow Skills

AI must work on this app through the required workflow skills when the environment supports Codex skills. These skills are part of the task process, not optional reading.

- Before writing or changing an app spec, use `brainstorming` to decide product behavior, canvas sizing mode, panels, media flow, controls, export/copy behavior, renderer technique, timeline/layer choice, and ambiguous requirements.
- Before editing code from an approved spec, use `writing-plans` to produce a deterministic implementation plan focused on app files, tests, build, and browser verification.
- Before fixing any broken control, failed test, build failure, visual mismatch, export issue, or runtime regression, use `systematic-debugging` to find the root cause first.
- When the prompt includes a Figma URL, use Figma MCP/design context before implementation. Read the actual node, layer, component, variable, and asset structure; screenshots are only for final visual QA, not the source of truth.
- After implementation, use the `browser` workflow or equivalent local browser verification to test the running app, not only typecheck/build output. The default browser gate is `pnpm test:browser`; `pnpm test:browser:perf` is reserved for full performance checkpoints.
- Run `pnpm ai:check` before app generation or major changes.
- If a required skill is missing and the environment supports skill installation, install it before implementation and restart or refresh the session if the skill list does not update.
- If skill installation is not available, stop before implementation and tell the user exactly which required skills are missing.
- Do not silently skip required workflow skills, and do not replace them with an ad hoc plan.
- The Toolcraft app contract overrides generic brainstorming approval and visual-companion rituals. If the user asks to build or port an app, that request is approval to produce the spec, plan, implementation, tests, build, and local run unless a product-critical ambiguity remains.
- Do not ask the user to confirm decisions already covered by this contract, the prompt, or the reference app. Record the decision in the spec and continue.
- Do not ask whether to enable a browser companion during brainstorming. Browser verification is mandatory after the app runs locally.
- In standalone folders that are not git repositories, save spec/plan files without asking about commit requirements.

## Verification Tier Classifier

Before editing, write a short verification note:

```md
Verification tier: Tier N
Reason: <changed surface and expected blast radius>
Run: <commands and browser checks>
Skip: <checks not needed for this pass and why>
```

Choose the tier by blast radius, not by line count. If uncertain, move one tier higher, not automatically to the full final gate.

| Tier | Use When | Required Checks |
| --- | --- | --- |
| Tier 0 — docs/copy | Documentation, comments, copy, labels, or titles change without schema targets, values, runtime behavior, renderer output, or layout mechanics. | Targeted docs/typecheck or targeted app test. Browser is not required unless visual text fitting is the risk. |
| Tier 1 — local control presentation | One control or panel visual state changes: spacing, hover, focus, disabled, marker visibility, label fit, or component variant display. Runtime state shape and product renderer are unchanged. | Targeted unit/component test plus one focused browser check for the affected control or panel. |
| Tier 2 — schema/product behavior | Controls, sections, defaults, persistence, panel actions, export actions, acceptance rows, or product behavior mapping changes. | `pnpm verify:quick` plus relevant browser acceptance. Run perf only when the changed control affects renderer workload or responsiveness. |
| Tier 3 — renderer/canvas/runtime feature | Custom renderer, animation loop, canvas sizing, upload/media, timeline, layers, toolbar, export bytes, WebGL/Canvas/SVG output, zoom, radar, history, heavy control behavior changes, or a post-generation iteration that touches renderer workload or viewport stability. | `pnpm verify:quick`, targeted browser acceptance, and targeted performance scenarios only for touched workload/viewport/export paths. |
| Tier 4 — final delivery/template architecture | Fresh generated app completion, folder export, commit-ready delivery, dependency changes, runtime/template/contract/CLI changes, broad refactors, or major post-generation iterations that rewrite renderer, canvas, animation, timeline/keyframes, layers, media, export, or control mapping. | Fresh folders run `pnpm install` once, then `pnpm verify:final`; add `pnpm verify:perf` only for the first working app version or explicit performance complaints, then start `pnpm dev` to provide the local URL. |

Do not rerun `pnpm install` after every edit. Run it after fresh export, dependency changes, lockfile changes, or a missing package error.

Do not run the full browser performance suite for Tier 0-2 edits.

Run a full performance checkpoint with `pnpm verify:perf` only when the first working version of an app exists, or when the user explicitly asks to optimize performance, fix lag, remove jank, speed up animation, stabilize drag/zoom, or otherwise complains about performance.

Feature loops after the first working version do not run the full performance suite by default. Renderer, canvas, animation, export, timeline, layers, `canvas.renderScale`, bug fixes, and performance-sensitive controls still need targeted functional/browser checks first, plus targeted performance scenarios only when they directly exercise the touched workload/viewport/export path. Record any skipped full performance run and reason in the verification note or worklog.

## Required Checks

For final delivery, run:

```bash
pnpm verify:final
pnpm dev
```

Use `pnpm install` before this final gate when the folder is fresh or dependencies changed.

`pnpm test` must include `node scripts/check-toolcraft-docs.mjs`, `node scripts/check-toolcraft-integrity.mjs`, and app tests. `pnpm verify:ui` / `pnpm test:browser` must run against the real app UI and product output. `pnpm verify:perf` / `pnpm test:browser:perf` remains available for the two full-performance triggers and must run the performance browser suite sequentially so budgets are measured without parallel e2e noise.

Do not stop or kill existing local servers to free a port. `pnpm dev`, `pnpm preview`, and browser verification prefer port `3002`, but automatically move to the next free port when it is busy. Use `TOOLCRAFT_PORT`, `TOOLCRAFT_DEV_PORT`, or `TOOLCRAFT_TEST_PORT` only to change the preferred starting port.

## App Completion Bar

The app is complete only when:

- the Toolcraft runtime shell is present;
- `canvasContent` contains product output only;
- the runtime canvas backing remains visible behind product output;
- every visible control affects runtime state and product output or a command side effect;
- reset returns schema controls to `defaultValue`;
- sticky footer export actions operate on final product output at `state.canvas.size`;
- still products expose Export PNG; animated products expose Export Video plus Export PNG;
- PNG export uses the required `Background` section with `Include` plus unlabeled background color runtime controls, live preview hides product background when Include is off, and video keeps background;
- every PNG export includes `Image Export` format/resolution `select` controls, and passes `export.image.resolution` into `createToolcraftPngExportCanvas`;
- animated products with both PNG and video export place `Image Export` immediately before `Video Export`;
- all export paths use retina output dimensions from the standard export helper;
- layers are absent for single-layer apps and fully working when enabled;
- timeline is absent, playback, keyframes, or custom reference timeline according to product behavior;
- performance checks cover workload and responsiveness for all relevant controls;
- detail-heavy or animated custom renderers pass real viewport drag and zoom stress checks;
- workload browser perf tests use the declared `stressFixture` value from `app-performance.ts`, and apply `workloadFixture` first whenever the scenario declares an independent heavy app baseline;
- browser tests verify upload/clear, controls, canvas sizing, toolbar, timeline/layers when enabled, sticky actions, output dimensions, and viewport stability.
