# Button Image Spec

## Request

Allow the user to upload an image into the glass button, position it, and scale it.

## Product Behavior

- Add a `Button Image` section to the controls panel.
- The section uses built-in Toolcraft controls:
  - `fileDrop` for uploading one image into the glass button.
  - `vector` for image position inside the button.
  - `slider` for image scale.
- Uploaded button-image pixels are clipped to the glass shape and included in preview/export.
- Removing the image clears the button image without affecting the background Source or Glass Texture uploads.
- Resetting the `Button Image` section or global Reset returns upload to empty, position to center, and scale to `1`.
- The image is rendered inside the existing WebGL lens composite, after glass texture and before glass text.

## Control Section Inventory

Product need: Upload an image into the glass button.
Value model: Single image media source.
Candidate built-ins checked: `fileDrop`, `imagePicker`, custom control.
Best built-in: `fileDrop`.
Rejected alternatives: `imagePicker` is for choosing preset assets; custom upload UI would duplicate Toolcraft media lifecycle.
Target: `buttonImage.upload`.
Required acceptance: Upload, clear, section reset, and global reset change preview/output.

Product need: Position the uploaded image inside the button.
Value model: Two-axis normalized position.
Candidate built-ins checked: `vector`, sliders, custom control.
Best built-in: `vector`.
Rejected alternatives: Two sliders are weaker for spatial movement; custom pad duplicates built-in vector behavior.
Target: `buttonImage.offset`.
Required acceptance: Moving both axes changes button-image placement in product output.

Product need: Scale the uploaded image inside the button.
Value model: Bounded numeric scalar.
Candidate built-ins checked: `slider`, select, custom control.
Best built-in: `slider`.
Rejected alternatives: Select cannot express continuous scale; custom control is unnecessary.
Target: `buttonImage.scale`.
Required acceptance: Dragging Scale changes product output live.

## Renderer Pipeline

- Add a cached `button-image-frame` Canvas 2D pass sized to the resolved glass geometry.
- The pass draws the uploaded media with contain-fit, runtime media transform support, user offset, and user scale.
- Add one WebGL sampler for the button image and composite it inside the existing SDF coverage mask.
- `buttonImage.offset` and `buttonImage.scale` invalidate only `button-image-frame`, `lens-composite`, and `png-export`.
- `buttonImage.upload` invalidates `button-image-frame`, `lens-composite`, and `png-export`; it must not invalidate source, displacement, frost, texture, or text caches.

## Verification

Verification tier: Tier 3
Reason: Adds schema controls, runtime media lifecycle, a cached renderer pass, WebGL composite uniforms, acceptance rows, and targeted media/slider performance.
Run: `pnpm exec tsc -p tsconfig.json --noEmit`, targeted app tests, source Button Image browser acceptance, targeted button-image media and scale/offset performance.
Skip: Full `pnpm verify:perf`, because this is a focused renderer feature with targeted workload coverage.
