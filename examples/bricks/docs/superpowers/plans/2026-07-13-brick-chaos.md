# Brick Chaos Implementation Plan

1. Add `brick.chaos` to `src/app/brick-mosaic-startup-preset.ts` and a built-in `Chaos` slider after Scale in `src/app/app-schema.ts`.
2. Extend `BrickMosaicSettings` and `getBrickMosaicSettings` in `src/app/brick-mosaic-render.ts`; implement and cache a deterministic one-to-one Chaos permutation whose moved fraction and radius grow with the control value.
3. Compose persistent Chaos with the existing held-Scale shuffle in the shared renderer so preview and export use identical final mapping.
4. Update schema/unit acceptance in `src/app/app-schema.test.ts` and `src/app/app-acceptance.ts`; add browser output coverage and a `brick-chaos-drag` scenario in `e2e/app-brick-mosaic.spec.ts` and `src/app/app-performance.ts`.
5. Run `pnpm ai:check`, `pnpm verify:quick`, focused Chaos browser acceptance/performance, and visual QA against a fresh local dev server. Record evidence in `docs/toolcraft/agent-worklog.md`.
