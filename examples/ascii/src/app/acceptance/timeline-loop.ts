import type {
  ToolcraftAnimationIntent,
  ToolcraftTimelineLoopDurationIntent,
} from "./types";

export function getTimelineLoopDurationIntent(
  animationIntent: ToolcraftAnimationIntent | undefined,
): ToolcraftTimelineLoopDurationIntent | undefined {
  if (
    animationIntent?.mode !== "timeline-playback" &&
    animationIntent?.mode !== "timeline-keyframes"
  ) {
    return undefined;
  }

  return animationIntent.loopDuration;
}

export function isValidTimelineLoopDurationSource(source: string): boolean {
  return source === "reference" || source === "user-request" || source === "product-derived";
}

export const runtimeDefaultLoopDurationEvidencePattern =
  /\b(?:runtime|template|generic|fallback|default)\b.{0,40}\b(?:8\s*s|8\s*sec(?:ond)?s?|eight\s*sec(?:ond)?s?)\b|\b(?:8\s*s|8\s*sec(?:ond)?s?|eight\s*sec(?:ond)?s?)\b.{0,40}\b(?:runtime|template|generic|fallback|default)\b/i;

export function hasSeamlessForwardLoopEvidence(text: string): boolean {
  const hasDurationChange =
    /\b(duration|range|state\.timeline\.durationSeconds|timeline)\b/i.test(text) &&
    /\b(edit|change|changed|changing|commit|set|after)\w*\b/i.test(text);
  const hasFirstLastFrameEvidence =
    /\b(first[-\s/]*(?:and\s+)?last|last[-\s/]*(?:and\s+)?first|wrapped\s+first\s+frame)\b/i.test(
      text,
    ) ||
    (/\bfirst\s+frame\b/i.test(text) && /\blast\s+frame\b/i.test(text)) ||
    (/\bstart\s+frame\b/i.test(text) && /\bend\s+frame\b/i.test(text));
  const hasNoVisibleJumpEvidence =
    /\b(no|not|without|avoid(?:s|ing)?|absent|rejects?|disallow(?:s|ed)?|forbid(?:s|den)?)\b.{0,40}\bvisible\s+jump\b/i.test(
      text,
    );
  const hasSeamEvidence =
    hasFirstLastFrameEvidence &&
    (/\b(stitch(?:es|ed|ing)?|seam(?:less)?)\b/i.test(text) || hasNoVisibleJumpEvidence);
  const hasForwardDirectionEvidence =
    /\b(forward[-\s]*only|one\s+direction|same\s+direction|advances?\s+in\s+one\s+direction|motion\s+advances?\s+forward|direction\s+does\s+not\s+reverse)\b/i.test(text);
  const hasNoMirrorEvidence =
    /\b(no|not|without|avoid(?:s|ing)?|absent|rejects?|disallow(?:s|ed)?|forbid(?:s|den)?)\b.{0,40}\bmirror(?:ed|ing)?\b/i.test(text);
  const hasNoYoyoEvidence =
    /\b(no|not|without|avoid(?:s|ing)?|absent|rejects?|disallow(?:s|ed)?|forbid(?:s|den)?)\b.{0,40}\byo-?yo\b/i.test(text);
  const hasNoPingPongEvidence =
    /\b(no|not|without|avoid(?:s|ing)?|absent|rejects?|disallow(?:s|ed)?|forbid(?:s|den)?)\b.{0,40}\bping[-\s]*pong\b/i.test(text);
  const hasNoReverseEvidence =
    /\b(no|not|without|avoid(?:s|ing)?|absent|rejects?|disallow(?:s|ed)?|forbid(?:s|den)?)\b.{0,40}\breverse\b/i.test(text);

  return (
    hasDurationChange &&
    hasSeamEvidence &&
    hasForwardDirectionEvidence &&
    hasNoMirrorEvidence &&
    hasNoYoyoEvidence &&
    hasNoPingPongEvidence &&
    hasNoReverseEvidence
  );
}
