# Liquid Glass Canvas Drag Plan

## Implementation

1. Add a transparent Toolcraft canvas handle in `LiquidGlassRenderer` positioned from `getLiquidGlassGeometry(settings)` and current `glass.center`.
2. Handle pointer capture and drag deltas in canvas screen coordinates, converting back to Toolcraft centered vector values for `glass.center`.
3. Stop pointer propagation only for the glass handle so normal viewport panning still works outside the lens.
4. Render immediately/coalesced during glass drag and cache source texture draws in `LiquidGlassRenderRuntime`.
5. Update acceptance and performance configs for the new canvas handle and mask-drag workload.
6. Add Playwright browser coverage for handle drag, clean export, and drag performance.
7. Update the Toolcraft worklog with the decision and verification evidence.

## Verification

- `pnpm verify:quick`
- Targeted Playwright browser test for the new handle behavior
- Targeted Playwright performance test for canvas drag
- `pnpm verify:perf` because performance checking was explicitly requested
- Keep the existing dev server running or start `pnpm dev` on the next free port if needed.
