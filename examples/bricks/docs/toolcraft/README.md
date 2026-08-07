# Toolcraft Template Local Docs

This folder is the local operational reference for a standalone Toolcraft template app.

Use `../../AGENTS.md` as the entry contract, then read `workflow.md` before planning or editing app work. Use the remaining docs when a decision needs more detail:

The starter app itself is intentionally neutral. It should show the Toolcraft canvas/upload/toolbar baseline only until the product schema is authored. Demo controls, prompt inputs, layers, and timeline belong in tests/docs or in a real generated product that needs them.

1. `workflow.md` — required preflight, task routing, worklog gate, and verification routing.
2. `assembly-workflow.md` — how the app must be assembled.
3. `decision-contract.md` — hard rules, defaults, heuristics, and escape hatches.
4. `schema-reference.md` — how to write `src/app/app-schema.ts`.
5. `component-rules.md` — component-specific layout and behavior rules.
6. `acceptance-testing.md` — how every visible entity proves it works.
7. `performance.md` — performance matrix and responsiveness gates.
8. `renderer-technique.md` — how to choose DOM, SVG, Canvas 2D, WebGL, WebGPU, or mixed rendering.
9. `agent-worklog.md` — implementation decision trail, evidence, verification, and risks.
10. `custom-controls.md` — how to register custom controls without editing `src/toolcraft`.

`agent-worklog.md` starts as a neutral starter template. Once the folder becomes a product, change it to `Mode: product`, add `Decision Trail` entries for significant implementation passes, and record concrete renderer, timeline, layers, controls, export, and performance decisions with evidence. Each iteration must explain the user-visible result, source/reference checked, contract rules applied, rejected alternatives, and state/output mapping so later debugging can reconstruct why the app was built that way. The final test gate fails if this worklog is missing, stale, lacks decision-trail fields, or lacks verification.

Every implementation pass must choose a verification tier before editing. Use the smallest tier that covers the changed surface, and move one tier higher when unsure.

| Tier | Use for | Typical command |
| --- | --- | --- |
| Tier 0 | Docs/copy only | targeted docs/typecheck |
| Tier 1 | One control or panel visual state | targeted test + focused browser check |
| Tier 2 | Schema, defaults, persistence, actions, product mapping | `pnpm verify:quick` + relevant browser acceptance |
| Tier 3 | Renderer, canvas, timeline, layers, upload, export, zoom, heavy controls, or a touched performance-sensitive path | `pnpm verify:quick` + targeted browser checks, plus targeted perf scenarios only for the touched path |
| Tier 4 | Final delivery, fresh export, runtime/template/contract changes, broad renderer/product rewrites | `pnpm verify:final`; add `pnpm verify:perf` only for the first working app version or explicit performance complaints |

Run the full `pnpm verify:perf` suite only when the first working app version exists, or when the user explicitly asks to optimize performance, fix lag, remove jank, speed up animation, stabilize drag/zoom, or otherwise complains about performance.

Fresh folders or dependency changes need `pnpm install` before verification. Final delivery still starts the local app after the gate:

```bash
pnpm verify:final
pnpm verify:perf # first working version or explicit performance complaint only
pnpm dev
```

Do not kill existing local servers to free `3002`. Dev, preview, and browser verification prefer `3002`, then move to the next free port automatically.
