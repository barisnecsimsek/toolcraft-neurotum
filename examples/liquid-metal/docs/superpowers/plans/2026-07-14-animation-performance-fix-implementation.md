# Liquid Metal animation performance implementation plan

1. Add a small pure preview-scheduler module under `src/app` and unit tests for
   stable 30 fps deadlines, timestamp jitter, missed frames, long gaps, and the
   100 ms viewport-interaction interval, leaving headroom under the 120 ms interaction budget.
2. Update `src/app/liquid-metal-renderer.tsx` to use the scheduler while keeping
   Toolcraft timeline state, render scale, renderer resources, and viewport
   playback suspension semantics unchanged.
3. Update `src/app/app-performance.ts` and its focused tests so the animation
   workload declares the authored default scene and a duration budget for
   actual product-frame progress.
4. Update `e2e/performance-probe-helpers.ts` with an actual product-frame probe
   and update `e2e/liquid-metal-performance-cases.spec.ts` to measure
   `data-liquid-metal-surface-frame`, including a dedicated real-default-scene
   case at `3840x2160` with ten stickers and the scratch mask.
5. Run focused unit/source tests and the real browser measurement. If cadence
   remains below budget, benchmark a second pass that removes cross-frame
   default-framebuffer retention together with partial scissor redraw; never
   disable `preserveDrawingBuffer` alone.
6. Update `docs/toolcraft/agent-worklog.md` with before/after measurements,
   rejected quality reductions, exact files, verification, and remaining risk.
7. Run `npm run verify:quick`, targeted browser acceptance/performance for
   animation, timeline, viewport drag/zoom, and sticker manipulation, then the
   full performance checkpoint required by this performance-fix request.
