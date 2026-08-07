import type { ToolcraftCanvasSize, ToolcraftInitialState } from "@/toolcraft/runtime";

export const brickMosaicStartupCanvasSize = {
  height: 941,
  unit: "px",
  width: 1672,
} as const satisfies ToolcraftCanvasSize;

export const brickMosaicStartupImage = {
  fileName: "brick-mosaic-start.png",
  id: "brick-mosaic-startup-media",
  mimeType: "image/png",
  position: { x: 0, y: 0 },
  size: brickMosaicStartupCanvasSize,
  src: `${import.meta.env.BASE_URL}startup/brick-mosaic-start.png`,
} as const;

export const brickMosaicStartupValues = {
  "appearance.background": { hex: "#0D0D0D" },
  "brick.chaos": 25,
  "brick.detail": 96,
  "brick.edgeDepth": 32,
  "brick.gap": 3.5,
  "brick.rounding": 20,
  "brick.scale": 0.7,
  "export.image.format": "png",
  "export.image.resolution": "4k",
  "lighting.direction": { x: -0.45, y: -0.55 },
  "lighting.shadow": 34,
  "media.source": null,
  "stud.diameter": 56,
  "stud.height": 42,
  "stud.highlight": 50,
  "stud.include": true,
  "tone.brightness": 100,
  "tone.contrast": 108,
  "tone.monochrome": false,
  "tone.posterize": 4,
  "tone.saturation": 105,
} as const satisfies NonNullable<ToolcraftInitialState["values"]>;
