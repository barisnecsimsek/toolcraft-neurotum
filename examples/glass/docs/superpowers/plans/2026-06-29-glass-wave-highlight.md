# Glass Wave Highlight Implementation Plan

## Scope

- Add a `Wave Highlight` Toolcraft section with built-in switch/slider controls.
- Extend liquid glass settings/defaults/value normalization for `glass.wave.*`.
- Add WebGL uniforms and shader math for a masked caustic band, RGB fringe, dark top sheen, and soft wave lines.
- Add a requestAnimationFrame preview loop that renders only through the existing WebGL runtime and suspends during active pointer/canvas work.
- Update acceptance, performance metadata, browser coverage, and worklog.

## Checks

1. Run `pnpm exec tsc -p tsconfig.json --noEmit` after code edits if quick verification fails early.
2. Run `pnpm verify:quick`.
3. Run targeted browser acceptance for the wave test.
4. Run targeted browser performance for wave controls and autonomous animation.
