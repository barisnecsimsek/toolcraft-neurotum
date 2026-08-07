import { cleanup, render } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeAll, vi } from "vitest";

import { defineToolcraft } from "../../schema/define-toolcraft";
import type { ToolcraftTimelinePanelSchema } from "../../schema/types";
import type { ToolcraftInitialState } from "../../state/types";
import { ToolcraftRoot } from "../app-shell/toolcraft-root";
import { useToolcraft } from "../app-shell/use-toolcraft";
import { TimelinePanel } from "./timeline-panel";

export function installTimelinePanelTestEnvironment() {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      value: (query: string) => ({
        addEventListener: () => undefined,
        addListener: () => undefined,
        dispatchEvent: () => false,
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        removeEventListener: () => undefined,
        removeListener: () => undefined,
      }),
      writable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
}

export function createTimelineSchema(timeline: ToolcraftTimelinePanelSchema = true) {
  return defineToolcraft({
    canvas: { enabled: true },
    panels: {
      timeline,
    },
  });
}

function TimelineStateProbe() {
  const { state } = useToolcraft();

  return (
    <>
      <span data-testid="timeline-playing">{String(state.timeline.isPlaying)}</span>
      <span data-testid="timeline-looping">{String(state.timeline.isLooping)}</span>
      <span data-testid="timeline-time">{String(state.timeline.currentTimeSeconds)}</span>
      <span data-testid="timeline-expanded">{String(state.timeline.expanded)}</span>
    </>
  );
}

export function renderTimelinePanel(
  props: Partial<React.ComponentProps<typeof TimelinePanel>> = {},
  initialState?: ToolcraftInitialState,
  timeline?: ToolcraftTimelinePanelSchema,
) {
  return render(
    <ToolcraftRoot initialState={initialState} schema={createTimelineSchema(timeline)}>
      <TimelinePanel framed={false} {...props} />
      <TimelineStateProbe />
    </ToolcraftRoot>,
  );
}

export function renderUploadDependentTimelinePanel(initialState?: ToolcraftInitialState) {
  const schema = defineToolcraft({
    canvas: {
      enabled: true,
      sizing: { mode: "intrinsic-media" },
      upload: true,
    },
    panels: {
      timeline: { mode: "playback" },
    },
  });

  return render(
    <ToolcraftRoot initialState={initialState} schema={schema}>
      <TimelinePanel framed={false} />
      <TimelineStateProbe />
    </ToolcraftRoot>,
  );
}
