# Melt Brush edge-overlap design

## Goal

When the pointer center is outside the visible source object but the displayed
brush disk overlaps its silhouette, the overlapping part must still deposit heat
and remove frost. The brush center must remain beneath the pointer rather than
snapping to the object edge.

## Interaction model

1. A direct source-geometry ray hit keeps the current behavior.
2. On a miss, use a camera-projected cache of the bounded source triangles to
   find the nearest silhouette candidates in screen space.
3. Raycast a small bounded set of those candidates to recover the nearest visible
   surface depth.
4. Unproject the pointer at that depth. This produces a 3D brush center outside
   the object, so the existing spherical thermal kernel naturally affects only
   the volume where it intersects the object.
5. Reject the contact when the screen-space pointer-to-silhouette distance is
   larger than the physically projected brush radius.
6. If a captured drag leaves the overlap completely, clear stroke continuity so
   re-entry cannot draw a thermal bridge through empty space.

## Product decisions

- Controls and Control Section Inventory: unchanged; existing `Melt Brush`
  controls author heat, radius, structure, and refreeze.
- Renderer: retain the 48³ object-space thermal field and PBR shader; add only a
  memoized projected-triangle interaction cache.
- Timeline, layers, persistence, settings transfer, media, and export: unchanged.
- Editing handle: remains a textless DOM overlay and remains excluded from export.
- Complexity boundary: source geometry remains capped at 3,000 triangles; the
  cache is rebuilt only when model/camera projection changes, and a miss raycasts
  at most eight nearest candidates.

## Acceptance

- Unit proof finds the closest projected triangle candidate outside its edge and
  preserves the pointer-centered offset.
- Browser proof establishes an outside point using the minimum brush radius,
  verifies it is a miss, enlarges Radius, paints from the same point, and proves
  rendered product output changes while the cursor center stays under the pointer.
- Existing direct-hit, empty-canvas miss, refreeze, and zoom-alignment scenarios
  remain green.
