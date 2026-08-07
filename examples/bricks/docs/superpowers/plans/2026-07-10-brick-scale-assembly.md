# Brick Scale Assembly Implementation Plan

1. Keep the deterministic preview-only local permutation in `src/app/brick-mosaic-render.ts`, but remove interpolation/progress so shuffled bricks remain snapped to grid cells.
2. Update `src/app/brick-mosaic-renderer.tsx` to detect interaction with the built-in Scale slider, expose only `shuffling` and `assembled` states, and restore the final renderer immediately on release.
3. Extend `src/app/app-acceptance.ts`, `src/app/app-schema.test.ts`, and `e2e/app-brick-mosaic.spec.ts` to prove that the shuffle is one-to-one, remains inside the radius, changes rendered pixels while Scale is held, and immediately returns to a stable final state on release.
4. Update `src/app/app-performance.ts` wording if needed so the existing Scale drag scenario covers the transient preview work, and record the implementation and verification in `docs/toolcraft/agent-worklog.md`.
5. Run `pnpm verify:quick`, the focused browser acceptance, and the focused Scale drag performance scenario. Verify the running app in a real local browser.
