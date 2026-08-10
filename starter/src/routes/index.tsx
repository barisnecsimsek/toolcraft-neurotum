import { ToolcraftApp } from "@/toolcraft/runtime/react";

import { appSchema } from "../app/app-schema";
import {
  handleParticleGridPanelAction,
  ParticleGridCanvas,
} from "../app/particle-grid";

export function AppHome(): React.JSX.Element {
  return (
    <ToolcraftApp
      canvasContent={<ParticleGridCanvas />}
      className="h-dvh min-h-dvh"
      onPanelAction={handleParticleGridPanelAction}
      renderDefaultCanvasMedia={false}
      schema={appSchema}
    />
  );
}
