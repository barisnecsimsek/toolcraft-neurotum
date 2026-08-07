# Film Grain during model orbit

Verification tier: Tier 3
Reason: Changes the autonomous WebGL animation loop during high-frequency model and gizmo pointer rotation while preserving viewport interaction throttling.
Run: Focused renderer unit/source checks, focused browser acceptance for held model/gizmo rotation, `npm run verify:quick`, and targeted Grain interaction performance.
Skip: Full `npm run verify:final` and full performance checkpoint are not required for this post-first-working feature correction; export, media, dependencies, runtime architecture, timeline, layers, and persistence are unchanged.

## Product decision

- Film Grain with Dynamic noise enabled must continue changing on every animation frame while the user rotates the 3D model directly or through the orientation gizmo.
- Real Toolcraft viewport movement still coalesces non-essential animation work: blank-canvas pan, Shift-drag pan over the product, wheel pan, and pinch/zoom may temporarily suspend Grain and resume it after the interaction.
- No controls, sections, timeline, layers, persistence, settings-transfer, export behavior, render scale, or visual quality change.

## Implementation

1. Add a small pointer-interaction classifier under `src/app/renderer` that distinguishes model/gizmo orbit from actual viewport manipulation.
2. Use that classifier in `effects-canvas.tsx` so the autonomous Grain loop ignores model-orbit pointerdown events but still throttles viewport interactions.
3. Add unit coverage for the classifier and browser coverage that holds the pointer during direct model rotation and gizmo rotation, proving rendered pixels keep changing before pointerup.
4. Keep the existing Grain and viewport performance scenarios aligned with the corrected behavior and record the pass in `docs/toolcraft/agent-worklog.md`.
