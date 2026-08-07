import { defineToolcraft } from "../schema/define-toolcraft";
import { createToolcraftState } from "./create-template-state";
import type { ToolcraftInitialState } from "./types";

export function createState(initialState?: ToolcraftInitialState) {
  const app = defineToolcraft({
    canvas: {
      enabled: true,
      size: { width: 1024, height: 768, unit: "px" },
    },
    panels: {
      controls: {
        sections: [
          {
            controls: {
              opacity: {
                defaultValue: 75,
                target: "selectedLayer.opacity",
                type: "slider",
              },
            },
          },
        ],
        title: "Controls",
      },
    },
  });

  return createToolcraftState(app, initialState);
}
