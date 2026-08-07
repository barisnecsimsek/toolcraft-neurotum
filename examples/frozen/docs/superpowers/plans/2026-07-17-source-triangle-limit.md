# Raise source triangle boundary to 30,000

1. Update `PRODUCT_SPEC.md` and the exported `frozenSourceTriangleLimit` so the
   runtime guard, performance envelope, maximum STL fixture, and kernel workload
   share one 30,000-triangle authority.
2. Add focused model tests proving the 30,000 boundary, acceptance of an
   8,550-triangle object, and early rejection above the boundary.
3. Add a product browser scenario that uploads a generated 8,550-triangle STL
   through the real `source.model` file input and observes ready output plus the
   exact triangle count. Keep the existing media-lifecycle acceptance row and
   browser title unchanged.
4. Update the current performance decision and add a complete Iteration 19 entry
   in `docs/toolcraft/agent-worklog.md`; historical 3,000-triangle iterations stay
   historical.
5. Run Tier 3 proof: focused Vitest, typecheck, exact browser upload, existing
   source lifecycle regression, performance schema/gates, protected kernel,
   affected targeted performance paths, `verify:quick`, and direct integrity.

Affected surfaces: source media import and renderer workload boundary only.
Controls/sections: unchanged Source section and built-in `fileDrop`.
Renderer output: unchanged retained WebGL scene; larger accepted source geometry.
Timeline/layers/persistence/settings transfer/export semantics: unchanged.
