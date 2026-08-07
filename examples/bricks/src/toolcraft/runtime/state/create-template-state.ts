import type { ResolvedToolcraftAppSchema } from "../schema/types";
import type {
  ToolcraftInitialState,
  ToolcraftState,
  ToolcraftTimelineKeyframeGroup,
  ToolcraftTimelineState,
} from "./types";
import { toolcraftCanvasZoomDefault } from "./canvas-zoom";
import { getMediaReadyTimelineState } from "./timeline-readiness";

function cloneTimelineKeyframeGroups(
  keyframeGroups: readonly ToolcraftTimelineKeyframeGroup[],
): ToolcraftTimelineKeyframeGroup[] {
  return keyframeGroups.map((group) => ({
    ...group,
    keyframes: group.keyframes.map((keyframe) => ({
      ...keyframe,
      easing:
        keyframe.easing?.type === "bezier"
          ? {
              controlPoints: [...keyframe.easing.controlPoints],
              type: "bezier",
            }
          : keyframe.easing,
    })),
  }));
}

function createDefaultTimelineState(
  timeline?: Partial<ToolcraftTimelineState>,
): ToolcraftTimelineState {
  return {
    currentTimeSeconds: 0,
    durationSeconds: 8,
    expanded: false,
    isLooping: true,
    isPlaying: true,
    selectedKeyframeId: null,
    ...timeline,
    keyframeGroups: cloneTimelineKeyframeGroups(timeline?.keyframeGroups ?? []),
  };
}

export function createToolcraftState(
  schema: ResolvedToolcraftAppSchema,
  initialState: ToolcraftInitialState = {},
): ToolcraftState {
  const defaults: Record<string, unknown> = {};
  const mediaAssets = initialState.mediaAssets ?? [];
  const timeline = getMediaReadyTimelineState(
    schema,
    createDefaultTimelineState(initialState.timeline),
    mediaAssets,
  );

  for (const section of schema.panels.controls?.sections ?? []) {
    for (const control of Object.values(section.controls)) {
      defaults[control.target] = control.defaultValue;
    }
  }

  const panels: ToolcraftState["panels"] = {
    controls: { offset: { x: 0, y: 0 } },
    layers: { offset: { x: 0, y: 0 } },
    timeline: { offset: { x: 0, y: 0 } },
    toolbar: { offset: { x: 0, y: 0 } },
  };
  const initialCanvas = {
    offset: { x: 0, y: 0 },
    size: schema.canvas.size,
    zoom: toolcraftCanvasZoomDefault,
    ...initialState.canvas,
  };

  return {
    canvas: initialCanvas,
    defaults,
    history: {
      redo: [],
      undo: [],
    },
    layers: initialState.layers ?? [],
    mediaAssets,
    panels: {
      controls: { ...panels.controls, ...initialState.panels?.controls },
      layers: { ...panels.layers, ...initialState.panels?.layers },
      timeline: { ...panels.timeline, ...initialState.panels?.timeline },
      toolbar: { ...panels.toolbar, ...initialState.panels?.toolbar },
    },
    schema,
    selectedLayerId: initialState.selectedLayerId ?? null,
    timeline,
    values: { ...defaults, ...initialState.values },
  };
}
