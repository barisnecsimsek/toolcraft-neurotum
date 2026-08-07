import type { ToolcraftPipelineInteraction } from "./performance-types";
import type { ToolcraftPerformanceProfileName } from "./performance-workload-types";

const performanceProfiles = {
  "animation-frame": "interactive-continuous",
  "control-change": "interactive-discrete",
  "control-drag": "interactive-continuous",
  export: "batch-responsive",
  "initial-render": "initial-render",
  "mask-drag": "interactive-continuous",
  "media-import": "batch-responsive",
  "timeline-playback": "interactive-continuous",
  "timeline-scrub": "interactive-continuous",
  "viewport-drag": "interactive-continuous",
  "viewport-zoom": "interactive-continuous",
} satisfies Record<ToolcraftPipelineInteraction, ToolcraftPerformanceProfileName>;

export function getToolcraftPerformanceProfileForInteraction(
  interaction: ToolcraftPipelineInteraction,
): ToolcraftPerformanceProfileName {
  return performanceProfiles[interaction];
}
