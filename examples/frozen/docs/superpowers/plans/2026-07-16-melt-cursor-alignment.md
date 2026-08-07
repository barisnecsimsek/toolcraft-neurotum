# Melt cursor alignment fix

Verification tier: Tier 3
Reason: The visible melt editing handle is positioned in the wrong coordinate
space when the Toolcraft canvas is fitted or zoomed; pointer ownership and the
thermal renderer stay unchanged.
Run: TypeScript, focused melt browser acceptance at fitted scale and after zoom,
focused performance/source gates, current-source kernel verification, production
build, and direct Toolcraft integrity.
Skip: Full performance checkpoint because this is a coordinate-correctness fix
with no new workload, pass, resource, or boundary.

## Implementation

1. In `src/app/frozen/frozen-scene.ts`, convert pointer position and projected
   brush radius from post-transform viewport pixels into the canvas local CSS
   coordinate system.
2. In `e2e/frozen-melt-brush.spec.ts`, assert that the rendered cursor center
   matches the pointer before and after Toolcraft canvas zoom.
3. Record the diagnosis, mapping, checks, and remaining framework blockers in
   `docs/toolcraft/agent-worklog.md`.

Schema controls, panel actions, persistence, timeline, layers, renderer field,
and export behavior are unchanged.
