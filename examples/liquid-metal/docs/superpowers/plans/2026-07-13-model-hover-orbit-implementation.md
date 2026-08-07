# Model-hover orbit implementation plan

1. Extend `src/app/liquid-metal-scene.ts` with a public, allocation-light model
   hit-test that reuses the current camera, canvas bounds, base model meshes, and
   raycaster.
2. Update `src/app/liquid-metal-renderer.tsx` pointer ownership to preserve
   sticker-first direct manipulation, start orbit only for an unmodified
   left-button model hit, let misses/modifiers bubble to Toolcraft pan, and
   remove middle-button camera rotation.
3. Update `src/app/acceptance/defaults.ts` and the reference feature inventory so
   acceptance names the ASCII left-drag/model-hit, empty-canvas pan, and inert
   middle-button contract.
4. Strengthen `e2e/app-controls.spec.ts` with hit-aware helpers and browser
   assertions for model orbit without offset movement, empty-space pan without
   orbit movement, middle-button inertness, sticker priority, and merged
   undo/redo.
5. Extend the existing targeted `view.orbit` scenario in
   `src/app/app-performance.ts` and
   `e2e/liquid-metal-performance-cases.spec.ts` with a second measured
   model-surface gesture; use the existing detailed model, render-scale-2
   workload, and declared budgets for both the gizmo and model drag.
6. Update `docs/toolcraft/agent-worklog.md` with the reference evidence,
   interaction priority, state/output mapping, verification, skipped full gate,
   and remaining risks.
7. Run Prettier, focused tests, `npm run typecheck`, `npm run verify:quick`, the
   focused browser acceptance, the targeted performance scenario, and a
   controlled-browser check against the saved local app URL.

No schema section, control, panel action, route-local state, timeline, layer,
persistence, settings-transfer, export, or copied Toolcraft runtime change is
required.
