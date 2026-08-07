# Glass Texture Overlay Plan

## Implementation Plan

1. Add texture state types, defaults, value parsing, and media asset lookup.
2. Add the Glass Texture schema section with built-in Toolcraft controls and default values.
3. Add preview/export image loading for `texture.upload`.
4. Add a cached texture-frame Canvas 2D pass and pass it to WebGL only when dirty.
5. Extend the WebGL lens shader with texture sampler, blend mode uniforms, and masked compositing inside SDF coverage.
6. Update acceptance and performance metadata to describe the new visible entity and renderer pipeline invalidation.
7. Add browser acceptance tests for texture controls and upload lifecycle.
8. Add targeted browser performance tests backed by declared stress fixtures.
9. Update schema tests and worklog.
10. Run Tier 3 verification and fix root causes before final response.

## Notes

No runtime files under `src/toolcraft` should change. Texture overlay must preserve the selected render scale, exported dimensions, and existing canvas drag optimization.
