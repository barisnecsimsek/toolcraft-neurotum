import { describe, expect, it } from "vitest";

import {
  type ToolcraftTransferMode,
  validateToolcraftAcceptanceCoverage,
} from "./app-acceptance";
import { appSchema } from "./app-schema";
import {
  playbackTimelineAcceptance,
} from "./app-acceptance.timeline-test-utils";

function createTimelineSchema(mode: "keyframes" | "playback" = "playback") {
  return {
    ...appSchema,
    panels: {
      ...appSchema.panels,
      timeline: { defaultDurationSeconds: 8, enabled: true, mode },
    },
  };
}

describe("starter acceptance timeline playback contract", () => {
  it("requires timeline playback coverage when a playback timeline is enabled", () => {
    expect(validateToolcraftAcceptanceCoverage(createTimelineSchema(), [])).toEqual(
      expect.arrayContaining([
        'panels.timeline mode "playback" requires a runtime acceptance entry with timelineCoverage "playback" proving pause, scrub, duration/loop, and rendered-frame behavior.',
      ]),
    );
  });

  it("requires playback timeline coverage to prove duration drives renderer progress", () => {
    expect(
      validateToolcraftAcceptanceCoverage(createTimelineSchema(), [
        {
          automated: true,
          automatedTestName: "timeline playback controls drive rendered output",
          browser: true,
          browserTestName: "browser: timeline playback controls drive rendered output",
          componentType: "timeline",
          evidence: "timeline-output",
          expectedObservable:
            "Pause, scrub, and playback update visible renderer output.",
          fixture: "timeline playback fixture",
          id: "timeline.playback",
          kind: "runtime",
          target: "timeline.playback",
          timelineCoverage: "playback",
          timelinePlaybackCoverage: ["pause-resume", "scrub", "rendered-frame"],
          userAction: "Pause, scrub, and resume timeline playback.",
        },
      ]),
    ).toContain(
      'timeline.playback timelineCoverage "playback" must declare timelinePlaybackCoverage for pause-resume, scrub, duration, loop, and rendered-frame. Duration coverage must prove renderer progress maps 0..state.timeline.durationSeconds, not a local fixed animation duration.',
    );
  });

  it("requires timeline animation intent to declare loop duration provenance", () => {
    expect(
      validateToolcraftAcceptanceCoverage(
        createTimelineSchema(),
        [playbackTimelineAcceptance],
        {
          animationIntent: { mode: "timeline-playback" },
          mode: "new-toolcraft-app",
        } as unknown as ToolcraftTransferMode,
      ),
    ).toContain(
      'appTransferMode.animationIntent mode "timeline-playback" must declare loopDuration with source, seconds, and evidence. Do not let runtime/template fallback duration such as 8s stand in for product loop intent.',
    );
  });

  it("requires playback timeline apps to declare matching playback animation intent", () => {
    expect(
      validateToolcraftAcceptanceCoverage(
        createTimelineSchema(),
        [playbackTimelineAcceptance],
        {
          animationIntent: { mode: "none" },
          mode: "new-toolcraft-app",
        },
      ),
    ).toContain(
      'panels.timeline mode "playback" requires appTransferMode.animationIntent mode "timeline-playback" with loopDuration provenance.',
    );
  });

  it("requires keyframe timeline apps to declare matching keyframe animation intent", () => {
    expect(
      validateToolcraftAcceptanceCoverage(
        createTimelineSchema("keyframes"),
        [playbackTimelineAcceptance],
        {
          animationIntent: { mode: "none" },
          mode: "new-toolcraft-app",
        },
      ),
    ).toContain(
      'panels.timeline mode "keyframes" requires appTransferMode.animationIntent mode "timeline-keyframes" with loopDuration provenance.',
    );
  });

  it("requires declared loop duration to match timeline default duration", () => {
    expect(
      validateToolcraftAcceptanceCoverage(
        createTimelineSchema(),
        [playbackTimelineAcceptance],
        {
          animationIntent: {
            loopDuration: {
              evidence:
                "The product timing model derives a six second forward animation cycle from the authored baseline.",
              seconds: 6,
              source: "product-derived",
            },
            mode: "timeline-playback",
          },
          mode: "new-toolcraft-app",
        },
      ),
    ).toContain(
      "panels.timeline.defaultDurationSeconds (8) must match appTransferMode.animationIntent.loopDuration.seconds (6).",
    );
  });

  it("rejects runtime fallback evidence as a loop duration source", () => {
    expect(
      validateToolcraftAcceptanceCoverage(
        createTimelineSchema(),
        [playbackTimelineAcceptance],
        {
          animationIntent: {
            loopDuration: {
              evidence: "Use the runtime default 8s fallback because Toolcraft starts there.",
              seconds: 8,
              source: "product-derived",
            },
            mode: "timeline-playback",
          },
          mode: "new-toolcraft-app",
        },
      ),
    ).toContain(
      "appTransferMode.animationIntent.loopDuration.evidence must not cite the runtime/template fallback 8s default as the product loop source. Use reference timing, an explicit user request, or a product-derived timing rule.",
    );
  });

  it("requires playback timeline coverage to prove seamless forward-only loop behavior follows edited duration", () => {
    expect(
      validateToolcraftAcceptanceCoverage(createTimelineSchema(), [
        {
          automated: true,
          automatedTestName: "timeline duration edit drives renderer output",
          browser: true,
          browserTestName: "browser: timeline duration edit drives renderer output",
          componentType: "timeline",
          evidence: "timeline-output",
          expectedObservable:
            "Editing timeline duration changes the playback range and renderer follows state.timeline.durationSeconds.",
          fixture: "timeline playback fixture",
          id: "timeline.playback",
          kind: "runtime",
          target: "timeline.playback",
          timelineCoverage: "playback",
          timelinePlaybackCoverage: [
            "pause-resume",
            "scrub",
            "duration",
            "loop",
            "rendered-frame",
          ],
          userAction: "Edit timeline duration, scrub the range, pause, and resume playback.",
        },
      ]),
    ).toContain(
      'timeline.playback timelinePlaybackCoverage "loop" must prove a seamless forward-only product loop: motion advances in one direction, avoids mirror/yoyo/ping-pong/reverse fallbacks, first and last frames stitch without a visible jump, and the same seam holds after changing timeline duration.',
    );
  });

  it("rejects incomplete seamless loop evidence that omits fallback direction checks", () => {
    expect(
      validateToolcraftAcceptanceCoverage(createTimelineSchema(), [
        {
          automated: true,
          automatedTestName: "timeline duration edit verifies a seamless forward-only loop",
          browser: true,
          browserTestName: "browser: timeline duration edit verifies loop seam",
          componentType: "timeline",
          evidence: "timeline-output",
          expectedObservable:
            "Editing timeline duration keeps a seamless forward-only loop and stitches first and last frames.",
          fixture: "timeline playback fixture",
          id: "timeline.playback",
          kind: "runtime",
          target: "timeline.playback",
          timelineCoverage: "playback",
          timelinePlaybackCoverage: [
            "pause-resume",
            "scrub",
            "duration",
            "loop",
            "rendered-frame",
          ],
          userAction:
            "Edit timeline duration and verify first and last frames stitch with no mirror fallback.",
        },
      ]),
    ).toContain(
      'timeline.playback timelinePlaybackCoverage "loop" must prove a seamless forward-only product loop: motion advances in one direction, avoids mirror/yoyo/ping-pong/reverse fallbacks, first and last frames stitch without a visible jump, and the same seam holds after changing timeline duration.',
    );
  });

  it("rejects generic seamless loop evidence that omits first-last frame stitching", () => {
    expect(
      validateToolcraftAcceptanceCoverage(createTimelineSchema(), [
        {
          automated: true,
          automatedTestName: "timeline duration edit verifies a generic loop",
          browser: true,
          browserTestName: "browser: timeline duration edit verifies a generic loop",
          componentType: "timeline",
          evidence: "timeline-output",
          expectedObservable:
            "Editing timeline duration keeps a seamless forward-only loop with no mirror, yoyo, ping-pong, or reverse fallback.",
          fixture: "timeline playback fixture",
          id: "timeline.playback",
          kind: "runtime",
          target: "timeline.playback",
          timelineCoverage: "playback",
          timelinePlaybackCoverage: [
            "pause-resume",
            "scrub",
            "duration",
            "loop",
            "rendered-frame",
          ],
          userAction:
            "Edit timeline duration and verify the loop remains forward-only with no mirror, yoyo, ping-pong, or reverse fallback.",
        },
      ]),
    ).toContain(
      'timeline.playback timelinePlaybackCoverage "loop" must prove a seamless forward-only product loop: motion advances in one direction, avoids mirror/yoyo/ping-pong/reverse fallbacks, first and last frames stitch without a visible jump, and the same seam holds after changing timeline duration.',
    );
  });
});
