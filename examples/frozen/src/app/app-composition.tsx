import type { ToolcraftAppComposition } from "@/toolcraft/runtime/react";

import {
  appRendererPipelineRegistration,
  imageExportPass,
} from "./app-renderer-pipeline";
import { appSchema } from "./app-schema";
import { downloadFrozenImage } from "./frozen/frozen-export";
import { refreezeFrozenMelt } from "./frozen/frozen-melt-action";
import { FrozenOutput } from "./frozen/frozen-output";

export const appComposition: ToolcraftAppComposition = {
  canvasContent: <FrozenOutput />,
  onPanelAction: ({ action, rendererPipeline, reportProgress, state }) => {
    if (action.value === "melt.refreeze-all") {
      refreezeFrozenMelt();
      return;
    }
    if (action.value !== "export.png") return;
    const exportImage = () => downloadFrozenImage(state, reportProgress);
    return rendererPipeline
      ? rendererPipeline.runPass(imageExportPass, undefined, exportImage)
      : exportImage();
  },
  renderDefaultCanvasMedia: false,
  rendererPipelineRegistration: appRendererPipelineRegistration,
  schema: appSchema,
};
