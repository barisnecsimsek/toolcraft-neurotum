export function createMaxValueStressFixture(value: unknown, reason = "Maximum workload value.") {
  return {
    kind: "max-value" as const,
    loadProfile: {
      hardLimit: value,
      metric: "numeric-max" as const,
      smoothTarget: value,
      smoothTargetRatio: 1,
      target: "render.density",
      userFacingRange: "fully-guaranteed" as const,
    },
    reason,
    value,
  };
}

export function createCustomStressFixture(
  value: unknown = { density: 12 },
  reason = "Combined renderer stress state.",
) {
  return {
    kind: "custom" as const,
    loadProfile: {
      hardLimit: value,
      metric: "custom" as const,
      smoothTarget: value,
      smoothTargetRatio: 1,
      target: "renderer.output",
      userFacingRange: "fully-guaranteed" as const,
    },
    reason,
    value,
  };
}

export function createCombinedRendererStressFixture() {
  return createCustomStressFixture(
    { density: 12, zoom: "toolbar" },
    "Stress checks must run with the densest product output visible.",
  );
}

export function createLargeTextStressValue(): string {
  return Array.from(
    { length: 1_000 },
    (_, index) =>
      `Line ${String(index + 1).padStart(4, "0")} performance stress text with enough glyphs to exercise layout.`,
  ).join("\n");
}

export function createLargeTextStressFixture() {
  return {
    kind: "large-text" as const,
    minChars: 50_000,
    minLines: 1_000,
    reason: "Long multiline content is the heaviest realistic text workload.",
    value: createLargeTextStressValue(),
  };
}

export function createMediaStressFixture(
  value: { height: number; width: number } = { height: 1080, width: 1920 },
  reason = "Large uploaded source media is the heaviest realistic import fixture.",
) {
  return {
    kind: "media" as const,
    loadProfile: {
      hardLimit: value,
      metric: "media-area" as const,
      smoothTarget: value,
      smoothTargetRatio: 1,
      target: "source.image",
      userFacingRange: "fully-guaranteed" as const,
    },
    reason,
    value,
  };
}

export function createDegradedMaxValueStressFixture() {
  return {
    kind: "max-value" as const,
    loadProfile: {
      degradationStepPercent: 10 as const,
      evidence: [
        {
          attemptedTarget: 12,
          decision: "Keep 12 available as high density while guaranteeing smooth drag through 11.",
          measuredResult: "At density 12, maxFrameGapMs 148 exceeded the 80ms budget.",
          optimizationAttempted: "Cached glyph atlas and coalesced preview work to requestAnimationFrame.",
          result: "failed" as const,
          scenarioId: "density-drag",
        },
      ],
      hardLimit: 12,
      metric: "numeric-max" as const,
      smoothTarget: 11,
      smoothTargetRatio: 0.9,
      target: "render.density",
      userFacingRange: "experimental-above-smooth" as const,
    },
    reason: "Density 11 is the measured smooth target after hard-limit testing.",
    value: 11,
  };
}
