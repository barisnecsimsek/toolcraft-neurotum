# Button Image Blend Spec

## Goal

Add blend mode control for the uploaded Button Image so users can choose how that image mixes with the existing liquid-glass pixels while staying clipped to the glass shape.

## Product Behavior

- Add a `Blend` select to the existing `Button Image` section.
- Target: `buttonImage.blendMode`.
- Options: `Normal`, `Multiply`, `Screen`, `Overlay`, `Soft Light`.
- Default: `Normal`, preserving the current appearance when no user change is made.
- The blend applies only to the uploaded button image layer, inside the glass/lens mask.
- Removing the button image leaves the selected blend setting in state but has no visible effect until another image is uploaded.

## Control Section Inventory

Section: `Button Image`.
Workflow/entity: the optional user-uploaded image composited into the glass/button.
Targets: `buttonImage.upload`, `buttonImage.blendMode`, `buttonImage.offset`, `buttonImage.scale`.
Reason: upload, blend, position, and scale all configure the same image layer and should reset together through the section reset.

## Renderer Design

- Keep the existing cached `button-image-frame` Canvas 2D pass for upload/position/scale.
- Add a WebGL uniform for the button image blend code.
- Use the existing shader blend helper used by texture/text compositing.
- Compose the button image after glass texture and before glass text, matching the current layer order.
- Do not invalidate `button-image-frame` when only `buttonImage.blendMode` changes; it should update only the lens composite.

## Verification

Verification tier: Tier 3.
Reason: adds a schema control and changes the WebGL lens composite path.
Run: typecheck, schema test, focused Button Image browser acceptance, focused Button Image blend performance.
Skip: full performance suite, because this is a post-generation targeted renderer/control iteration.
