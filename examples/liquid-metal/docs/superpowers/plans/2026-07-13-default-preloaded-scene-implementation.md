# Default preloaded scene implementation plan

1. Add the bundled model, recovered scratch source, and ten sticker files under
   `public/assets/liquid-metal-default/`.
2. Add `src/app/liquid-metal-default-scene.ts` containing typed default media
   declarations and sticker raycast seeds recovered from the final export.
3. Update `src/app/app-schema.ts` so JSON values are schema defaults and the
   recovered media list is `media.defaultAssets`.
4. Update `src/app/liquid-metal-scene.ts` so missing placements for known default
   stickers raycast their individual composition seeds before using the generic
   fallback; preserve user-upload behavior and all existing placement state.
5. Update acceptance/reference readiness and renderer pipeline wording for the
   authored non-empty default source flow.
6. Add focused unit/source tests plus a browser scenario that proves clean-load
   model/scratch/sticker output, editable default sticker drag, remove/reset,
   and PNG export without uploads.
7. Extend the existing media-import/startup performance scenario with the
   declared default-scene workload instead of adding an untyped interaction.
8. Update `docs/toolcraft/agent-worklog.md`, run formatting/diff checks,
   `npm run typecheck`, `npm run verify:quick`, focused browser acceptance,
   targeted performance, and controlled-browser reload verification.

No new control, section, panel action, timeline mode, layer panel, persistence
slice, settings-transfer mechanism, export helper, dependency, or copied
Toolcraft runtime change is required.
