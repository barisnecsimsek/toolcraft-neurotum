import { ToolcraftApp } from "@/toolcraft/runtime/react";

import { appSchema } from "../app/app-schema";
import { handleEffectsPanelAction } from "../app/panel-actions";
import { EffectsCanvas } from "../app/renderer/effects-canvas";
import { effectsControlRenderers } from "../app/renderer/orientation-gizmo-control";

export function AppHome(): React.JSX.Element {
  return (
    <ToolcraftApp
      canvasContent={<EffectsCanvas />}
      className="h-dvh min-h-dvh"
      controlRenderers={effectsControlRenderers}
      onPanelAction={handleEffectsPanelAction}
      renderDefaultCanvasMedia={false}
      schema={appSchema}
    />
  );
}
