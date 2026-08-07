# Liquid Metal default pose and background implementation plan

1. Update `src/app/app-schema.ts` so `export.includeBackground` defaults to `true` and `appearance.background` defaults to `#AFAFC5`; retain the existing exact `view.orbit` default.
2. Synchronize the defensive scene-background fallback in `src/app/liquid-metal-values.ts` with `#AFAFC5`.
3. Extend `src/app/liquid-metal-product.test.ts` with exact initial-state assertions for the saved orbit, background color, Include state, and resolved renderer settings.
4. Update `e2e/app-controls.spec.ts` so the authored-default scenario verifies the supplied orbit/background defaults and Reset, while the export scenario explicitly toggles Include off before its transparent-PNG assertion and back on before included-background export.
5. Add Iteration 26 to `docs/toolcraft/agent-worklog.md`, recording the supplied JSON, the two effective changes, idempotent orbit value, state/output mapping, verification tier, and skipped full performance reason.
6. Run focused Vitest/typecheck, `npm run verify:quick`, the two focused Playwright scenarios, and a controlled live-browser reload at the saved app URL.
