# Default sticker scale parity fix

Verification tier: Tier 3

Reason: The change corrects startup decal projector geometry for all ten
preloaded stickers. It affects renderer output and startup workload, but does
not change schema shape, controls, camera, model normalization, media flow,
timeline, layers, persistence, or export architecture.

Run: focused default-scene product test, `npm run typecheck`,
`npm run verify:quick`, the authored-default-scene browser acceptance, the
targeted `stickers.scale` browser performance scenario, and a controlled-browser
comparison against `liquid-metal-3d (8).png`.

Skip: `npm run verify:final` and the full browser performance checkpoint. This
is a post-first-working renderer correction, and the touched footprint workload
has its own targeted performance scenario.

## Implementation

1. Define one authored default sticker scale constant (`0.82`) and use it for
   every recovered raycast seed. Keep every NDC center and rotation unchanged.
2. Strengthen the product regression test so it checks the complete default
   sticker batch, not only one representative seed.
3. Extend authored-scene browser acceptance with an observable assertion that
   all resolved startup placements use the authored scale.
4. Record the root-cause evidence, rejected camera/coordinate changes, and
   verification in `docs/toolcraft/agent-worklog.md`.
5. Run the focused, quick, browser, performance, and visual checks listed above
   while leaving the existing development server running.
