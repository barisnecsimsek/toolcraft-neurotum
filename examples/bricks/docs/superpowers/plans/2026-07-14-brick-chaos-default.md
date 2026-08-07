# Brick Chaos Default Plan

Verification tier: Tier 2

1. Change `brickMosaicStartupValues["brick.chaos"]` from `0` to `25`, which also updates the schema-backed Reset value.
2. Advance localStorage persistence from `v2` to `v3` so saved legacy `0%` state does not hide the requested new startup preset.
3. Update schema and browser assertions; explicitly move Chaos to `0%` before testing exact identity restoration.
4. Run `pnpm verify:quick` and focused browser tests for startup, reset, and Chaos output. Skip full performance/final gates because renderer workload and runtime architecture are unchanged.
