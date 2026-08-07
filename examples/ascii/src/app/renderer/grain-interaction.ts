export type GrainPointerGesture = {
  button: number;
  ctrlKey: boolean;
  isEffectsCanvas: boolean;
  isOrientationGizmo: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

/**
 * Film Grain is autonomous product output, so model-orbit gestures keep it
 * running. Only gestures owned by the Toolcraft viewport suspend the extra
 * animation frames while the viewport itself is moving.
 */
export function shouldSuspendGrainForPointerGesture({
  button,
  ctrlKey,
  isEffectsCanvas,
  isOrientationGizmo,
  metaKey,
  shiftKey,
}: GrainPointerGesture): boolean {
  if (button !== 0 || isOrientationGizmo) return false;

  const isDirectModelOrbit =
    isEffectsCanvas && !ctrlKey && !metaKey && !shiftKey;

  return !isDirectModelOrbit;
}
