# Interactive Melt Brush Implementation Plan

1. Add the typed Melt Brush section, conditional visibility, orientation lock, scene settings, acceptance inventory, and typed video reference study.
2. Implement a focused fixed-resolution thermal-field module with radial heat deposition, path interpolation support, diffusion, cooling, texture upload, clear/dispose lifecycle, and deterministic unit tests.
3. Inject the thermal texture and structural threshold uniforms into source and ice shaders so shell, crystals, icicles, and source-core tint share the same local melt signal.
4. Extend the retained scene renderer with geometry raycast contacts, world-to-field painting, cursor projection, thermal stepping, clear action, model-change reset, and export-consistent state.
5. Add pointer ownership to `FrozenOutput`: mode-gated orbit, pointer capture on geometry hits, interpolated brush motion, hover cursor, coalesced refreeze RAF, and non-claimed misses.
6. Route the local Refreeze action through `onPanelAction` to the active renderer controller.
7. Extend the canonical renderer pipeline for melt controls, `mask-drag`, bounded animation-frame cooling, and their derived performance scenarios; update the performance impact inventory.
8. Add product-owned automated and browser tests for the thermal model, conditional controls, hit-only painting, model lock, continuous reveal, cooling, persistent zero-refreeze behavior, reset, and export-clean cursor.
9. Update the product spec and worklog with the video study, state/output mapping, rejected alternatives, verification tier, and known risks.
10. Read the routed Implementation and Verification documents at their required phases, run targeted checks, inspect the live result in the browser against the storyboard, and iterate before delivery.
