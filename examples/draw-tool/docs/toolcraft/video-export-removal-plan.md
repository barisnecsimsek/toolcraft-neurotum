# Video Export Removal Plan

Verification tier: Tier 3
Reason: Removes the video export section, footer action, route handler, acceptance rows, performance scenarios, and browser coverage.
Run: direct docs checks, TypeScript, Vitest, Vite build, and a focused browser probe that verifies Export Video is absent while Export PNG still works.
Skip: full `pnpm verify:perf`; this is an export surface removal and still-image export is covered by targeted checks.

## Product Behavior

The app remains a live interactive WebGL drawing surface, but delivery is image-only. Users can export PNG/JPG still images and cannot export video.

## Implementation Plan

1. Remove `Video Export` controls and `Export Video` footer action from `src/app/app-schema.ts`.
2. Remove video recording helpers and the `export-video` branch from `src/routes/index.tsx`.
3. Remove the video-only renderer handle and engine background override.
4. Update acceptance and performance metadata/tests to cover still image export only.
5. Update browser tests and worklog, then run direct checks and a focused browser probe.
