import { ToolcraftApp } from "@/toolcraft/runtime/react";

import {
  appSchema,
  appSchemaWithoutDefaultMedia,
} from "../app/app-schema";
import { handleLiquidMetalPanelAction } from "../app/liquid-metal-export";
import { liquidMetalControlRenderers } from "../app/liquid-metal-orientation-gizmo";
import { LiquidMetal3DRenderer } from "../app/liquid-metal-renderer";

export function AppHome(): React.JSX.Element {
  const schema =
    new URLSearchParams(window.location.search).get("toolcraft-test-fixture") ===
    "empty-media"
      ? appSchemaWithoutDefaultMedia
      : appSchema;

  return (
    <ToolcraftApp
      canvasContent={<LiquidMetal3DRenderer />}
      className="h-dvh min-h-dvh"
      controlRenderers={liquidMetalControlRenderers}
      onPanelAction={handleLiquidMetalPanelAction}
      renderDefaultCanvasMedia={false}
      schema={schema}
    />
  );
}
