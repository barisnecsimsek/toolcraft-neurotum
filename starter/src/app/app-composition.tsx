import type { ToolcraftAppComposition } from "@/toolcraft/runtime/react";

import { appSchema } from "./app-schema";
import {
  particleGridExportRenderer,
  ParticleGridCanvas,
} from "./particle-grid";

export const appComposition: ToolcraftAppComposition = {
  canvasContent: <ParticleGridCanvas />,
  exportRenderer: particleGridExportRenderer,
  modelPresentation: { mode: "runtime" },
  renderDefaultCanvasMedia: false,
  schema: appSchema,
};
