# Attached Default Settings Profile

## Goal

Make a fresh load and Reset controls reproduce the user-supplied `mesh-fx-settings (1).json` profile.

## Source Comparison

The attached file and current resolved schema were compared target by target. Canvas size `1920×1080`, render scale `2`, and every other product value already match. Ten schema defaults differ:

- `view.orbit`
- `effect.mode`
- `dither.size`
- `dither.pattern`
- `dither.colors.preset`
- `chromatic.enabled`
- `chromatic.amount`
- `grain.enabled`
- `bloom.strength`
- `bloom.mix`

The exported timeline block is runtime metadata, not a requested product timeline. The app remains timeline-free.

## Implementation

1. Update `DEFAULT_ORBIT_POSE` in `src/app/renderer/orbit-camera.ts` to the attached camera pose.
2. Update the ten differing schema defaults in `src/app/app-schema.ts`; extend the duotone-section helper so only Dither defaults to `Tidepool`.
3. Add schema tests that lock the attached default profile and prove no timeline was introduced.
4. Update browser acceptance to prove a fresh load and global reset restore Dither/Tidepool/Chromatic/Film Grain and the attached orbit pose.
5. Record the decision and verification in `docs/toolcraft/agent-worklog.md`.

## Verification

Verification tier: Tier 2 with targeted performance coverage

Reason: schema defaults and reset behavior change. The default now enables a workload shader plus autonomous Film Grain and Chromatic, so the touched default renderer workload receives targeted browser performance verification even though renderer code is unchanged.

Run:

- Focused schema, effect-state, orbit-camera, and animation-intent tests.
- `npm run typecheck`.
- `npm run verify:quick`.
- Focused default/reset browser acceptance.
- Targeted Film Grain and animated viewport performance scenarios.
- Controlled-browser fresh-load/reset verification with console checks.

Skip:

- `npm run verify:final` and the full performance checkpoint because this is a post-first-working defaults-only pass with no renderer, runtime, dependency, media, export, timeline, layer, or persistence implementation change.
