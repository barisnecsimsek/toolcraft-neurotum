# Double Crystal Density Implementation Plan

## Product decision

- Keep the existing `Crystal Density` slider and semantic `Crystal Growth` section.
- Double the default density from 900 to 1800 and the reachable maximum from 2000 to 4000.
- Increase the deterministic precomputed surface-sample capacity to 4000 so values above 2000 create real additional crystal instances.
- Preserve current timeline, layers, persistence, media import, material, mask, environment, and export behavior.

## Files and behavior

1. Update the schema-owned density default and maximum in `src/app/frozen/frozen-controls.ts`.
2. Update the renderer's deterministic crystal sample capacity in `src/app/frozen/frozen-model.ts`.
3. Align unit and browser assertions in `src/app/frozen-product.test.ts` and `e2e/app-controls.spec.ts` with the new default, maximum, and sample-array size.
4. Update `docs/toolcraft/agent-worklog.md` with the workload boundary and verification evidence.

## Runtime mapping

- Schema target `ice.crystalDensity` remains the single source of truth.
- The renderer clamps the active instance count to the available deterministic sample pool.
- The existing performance workload dimension continues to derive its default and maximum directly from the schema, so no separately authored boundary is introduced.

## Verification

Verification tier: Tier 3

Reason: the schema workload boundary and WebGL instance capacity change, affecting renderer cost and density responsiveness.

Run:

- targeted unit tests for schema defaults, limits, and sample capacity;
- `npm run verify:quick`;
- exact browser acceptance for `ice.crystalDensity`, proving 1800 by default and 4000 at the upper bound;
- the protected targeted performance path required by the impact inventory, if the existing baseline lifecycle permits it;
- kernel verification if the renderer receipt becomes stale;
- direct integrity check.

Skip:

- full `verify:perf`, because this is a later feature adjustment and the user did not request performance optimization;
- unrelated export, media-format, scratch-texture, and icicle browser scenarios.
