import * as React from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";

import {
  createControlHistoryGroupId,
  type ControlChangeMeta,
} from "@/toolcraft/ui";

import {
  easeLiquidMetalOrbitSnap,
  getLiquidMetalOrbitCameraQuaternion,
  getLiquidMetalOrbitPoseFromGizmoPointer,
  getLiquidMetalOrbitRadius,
  projectLiquidMetalOrbitAxes,
  readLiquidMetalOrbitPose,
  snapLiquidMetalOrbitPose,
  type LiquidMetalOrbitAxis,
  type LiquidMetalOrbitAxisProjection,
  type LiquidMetalOrbitPose,
} from "./liquid-metal-orbit";

const cssSize = 70;
const pixelRatio = 2;
const center = cssSize / 2;
const axisReach = 24.5;
const dotRadius = 5.6;
const hoverRadius = dotRadius * 1.3;
const hitRadius = 7;
const fallbackHitRadius = 8.4;
const snapDurationMs = 600;
const dragThresholdPixels = 3;

const axisColors: Record<"x" | "y" | "z", string> = {
  x: "#ff215e",
  y: "#53ff55",
  z: "#3b69ff",
};

type SetOrbitValue = (value: unknown, meta?: ControlChangeMeta) => void;

type LiquidMetalOrientationGizmoProps = {
  setValue: SetOrbitValue;
  value: unknown;
};

function getAxisColor(axis: LiquidMetalOrbitAxis): string {
  return axisColors[axis[1] as "x" | "y" | "z"];
}

function isPositiveAxis(axis: LiquidMetalOrbitAxis): boolean {
  return axis[0] === "+";
}

function interpolatePose(
  start: LiquidMetalOrbitPose,
  end: LiquidMetalOrbitPose,
  progress: number,
): LiquidMetalOrbitPose {
  const radius = getLiquidMetalOrbitRadius(start);
  const quaternion = getLiquidMetalOrbitCameraQuaternion(start).slerp(
    getLiquidMetalOrbitCameraQuaternion(end),
    progress,
  );
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).normalize();

  return {
    position: forward.multiplyScalar(-radius).toArray(),
    up: up.toArray(),
  };
}

function sortRearToFront(
  projections: readonly LiquidMetalOrbitAxisProjection[],
): LiquidMetalOrbitAxisProjection[] {
  return [...projections].sort((left, right) => right.depth - left.depth);
}

function findHoveredAxis(
  projections: readonly LiquidMetalOrbitAxisProjection[],
  x: number,
  y: number,
): LiquidMetalOrbitAxis | null {
  const ranked = projections
    .map((projection) => ({
      axis: projection.axis,
      depth: projection.depth,
      distance: Math.hypot(x - projection.x, y - projection.y),
    }))
    .sort(
      (left, right) =>
        left.distance - right.distance || left.depth - right.depth,
    );
  const exact = ranked.find((item) => item.distance <= hitRadius);
  const nearest =
    exact ?? ranked.find((item) => item.distance <= fallbackHitRadius);

  return nearest?.axis ?? null;
}

function getLocalPointer(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const bounds = canvas.getBoundingClientRect();

  return {
    x: ((clientX - bounds.left) / Math.max(1, bounds.width)) * cssSize,
    y: ((clientY - bounds.top) / Math.max(1, bounds.height)) * cssSize,
  };
}

function drawGizmo(
  canvas: HTMLCanvasElement,
  pose: LiquidMetalOrbitPose,
  hoveredAxis: LiquidMetalOrbitAxis | null,
): void {
  const context = canvas.getContext("2d");
  if (!context) return;

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, cssSize, cssSize);

  const projections = sortRearToFront(
    projectLiquidMetalOrbitAxes(pose, center, axisReach),
  );
  context.lineCap = "round";

  for (const projection of projections) {
    const color = getAxisColor(projection.axis);
    const opacity = projection.isFrontFacing ? 0.95 : 0.3;

    context.globalAlpha = opacity;
    if (isPositiveAxis(projection.axis)) {
      context.strokeStyle = color;
      context.lineWidth = 2.1;
      context.beginPath();
      context.moveTo(center, center);
      context.lineTo(projection.x, projection.y);
      context.stroke();
    }

    context.fillStyle = color;
    context.beginPath();
    context.arc(
      projection.x,
      projection.y,
      projection.axis === hoveredAxis ? hoverRadius : dotRadius,
      0,
      Math.PI * 2,
    );
    context.fill();

    if (projection.axis === hoveredAxis) {
      context.globalAlpha = 0.7;
      context.strokeStyle = "#ffffff";
      context.lineWidth = 1;
      context.stroke();
    }
  }

  context.globalAlpha = 1;
}

function useCanvasViewportPortal(): HTMLElement | null {
  const [target, setTarget] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    const locate = () => {
      const nextTarget = document.querySelector<HTMLElement>(
        '[data-slot="toolcraft-runtime-canvas"]',
      );

      if (nextTarget) setTarget(nextTarget);
      return Boolean(nextTarget);
    };

    if (locate()) return;

    const observer = new MutationObserver(() => {
      if (locate()) observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return target;
}

const LiquidMetalOrientationGizmoBacking = React.memo(
  function LiquidMetalOrientationGizmoBacking({ dark }: { dark: boolean }) {
    return (
      <div
        aria-hidden="true"
        data-testid="liquid-metal-orientation-gizmo-backing"
        style={{
          backfaceVisibility: "hidden",
          backgroundColor: dark ? "#000000" : "#ececef",
          borderRadius: "50%",
          bottom: 16,
          contain: "paint",
          height: cssSize,
          left: 16,
          pointerEvents: "none",
          position: "absolute",
          transform: "translateZ(0)",
          width: cssSize,
          zIndex: 20,
        }}
      />
    );
  },
);

function LiquidMetalOrientationGizmo({
  setValue,
  value,
}: LiquidMetalOrientationGizmoProps): React.JSX.Element | null {
  const portalTarget = useCanvasViewportPortal();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = React.useRef(0);
  const pose = readLiquidMetalOrbitPose(value);
  const poseRef = React.useRef(pose);
  const activeAxisRef = React.useRef<LiquidMetalOrbitAxis | null>(null);
  const activeAxisCameraLocalZSignRef = React.useRef<-1 | 1>(1);
  const draggedRef = React.useRef(false);
  const historyGroupRef = React.useRef("");
  const startPointerRef = React.useRef({ x: 0, y: 0 });
  const [hoveredAxis, setHoveredAxis] =
    React.useState<LiquidMetalOrbitAxis | null>(null);
  const [dark, setDark] = React.useState(true);

  poseRef.current = pose;

  React.useEffect(() => {
    if (!portalTarget) return;

    const themeScope =
      portalTarget.closest<HTMLElement>("[data-toolcraft-theme-scope]") ??
      document.querySelector<HTMLElement>("[data-toolcraft-theme-scope]");
    const updateTheme = () => {
      const scopedTheme = themeScope?.dataset.toolcraftTheme;
      const rootStyle = window.getComputedStyle(document.documentElement);

      setDark(
        scopedTheme === "dark" ||
          (scopedTheme !== "light" &&
            (document.documentElement.classList.contains("dark") ||
              rootStyle.colorScheme.includes("dark"))),
      );
    };

    updateTheme();
    const observer = new MutationObserver(updateTheme);

    observer.observe(themeScope ?? document.documentElement, {
      attributeFilter: [
        "class",
        "data-theme",
        "data-toolcraft-theme",
        "style",
      ],
      attributes: true,
    });
    return () => observer.disconnect();
  }, [portalTarget]);

  React.useLayoutEffect(() => {
    if (canvasRef.current) {
      drawGizmo(canvasRef.current, pose, hoveredAxis);
    }
  }, [hoveredAxis, pose]);

  React.useEffect(
    () => () => window.cancelAnimationFrame(animationFrameRef.current),
    [],
  );

  const commitPose = React.useCallback(
    (nextPose: LiquidMetalOrbitPose) => {
      poseRef.current = nextPose;
      setValue(nextPose, {
        history: "merge",
        historyGroup: historyGroupRef.current,
      });
    },
    [setValue],
  );

  const animateSnap = React.useCallback(
    (axis: LiquidMetalOrbitAxis) => {
      window.cancelAnimationFrame(animationFrameRef.current);
      const startPose = poseRef.current;
      const targetPose = snapLiquidMetalOrbitPose(startPose, axis);
      const startedAt = performance.now();

      const animate = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / snapDurationMs);

        commitPose(
          interpolatePose(
            startPose,
            targetPose,
            easeLiquidMetalOrbitSnap(progress),
          ),
        );

        if (progress < 1) {
          animationFrameRef.current = window.requestAnimationFrame(animate);
        } else {
          animationFrameRef.current = 0;
        }
      };

      animationFrameRef.current = window.requestAnimationFrame(animate);
    },
    [commitPose],
  );

  if (!portalTarget) return null;

  return createPortal(
    <>
      <LiquidMetalOrientationGizmoBacking dark={dark} />
      <canvas
        aria-hidden="true"
        data-hovered-axis={hoveredAxis ?? ""}
        data-testid="liquid-metal-orientation-gizmo"
        data-toolcraft-canvas-handle="liquid-metal-orientation-gizmo"
        height={cssSize * pixelRatio}
        onPointerCancel={(event) => {
          event.preventDefault();
          event.stopPropagation();
          window.cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = 0;
          activeAxisRef.current = null;
          draggedRef.current = false;
          setHoveredAxis(null);
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.stopPropagation();
          const canvas = event.currentTarget;
          const point = getLocalPointer(canvas, event.clientX, event.clientY);
          const projections = projectLiquidMetalOrbitAxes(
            poseRef.current,
            center,
            axisReach,
          );
          const axis = findHoveredAxis(projections, point.x, point.y);

          if (!axis) return;

          const activeProjection = projections.find(
            (projection) => projection.axis === axis,
          );

          window.cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = 0;
          historyGroupRef.current = createControlHistoryGroupId(
            "liquid-metal-orientation-gizmo",
          );
          activeAxisRef.current = axis;
          activeAxisCameraLocalZSignRef.current =
            (activeProjection?.depth ?? -1) <= 0 ? 1 : -1;
          draggedRef.current = false;
          startPointerRef.current = point;
          setHoveredAxis(axis);
          canvas.setPointerCapture(event.pointerId);
        }}
        onPointerLeave={() => {
          if (!activeAxisRef.current) setHoveredAxis(null);
        }}
        onPointerMove={(event) => {
          event.stopPropagation();
          const canvas = event.currentTarget;
          const point = getLocalPointer(canvas, event.clientX, event.clientY);
          const activeAxis = activeAxisRef.current;

          if (!activeAxis) {
            setHoveredAxis(
              findHoveredAxis(
                projectLiquidMetalOrbitAxes(
                  poseRef.current,
                  center,
                  axisReach,
                ),
                point.x,
                point.y,
              ),
            );
            return;
          }

          event.preventDefault();
          if (
            !draggedRef.current &&
            Math.hypot(
              point.x - startPointerRef.current.x,
              point.y - startPointerRef.current.y,
            ) <= dragThresholdPixels
          ) {
            return;
          }

          draggedRef.current = true;
          commitPose(
            getLiquidMetalOrbitPoseFromGizmoPointer(
              poseRef.current,
              activeAxis,
              point.x,
              point.y,
              center,
              axisReach,
              activeAxisCameraLocalZSignRef.current,
            ),
          );
        }}
        onPointerUp={(event) => {
          const activeAxis = activeAxisRef.current;

          if (activeAxis === null) return;

          event.preventDefault();
          event.stopPropagation();
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          activeAxisRef.current = null;
          setHoveredAxis(null);
          if (!draggedRef.current) animateSnap(activeAxis);
          draggedRef.current = false;
        }}
        ref={canvasRef}
        style={{
          backgroundColor: "transparent",
          bottom: 16,
          borderRadius: "50%",
          display: "block",
          height: cssSize,
          left: 16,
          outline: "none",
          outlineWidth: 0,
          position: "absolute",
          touchAction: "none",
          width: cssSize,
          zIndex: 21,
        }}
        width={cssSize * pixelRatio}
      />
    </>,
    portalTarget,
  );
}

export const liquidMetalControlRenderers = {
  orientationGizmo: (props: LiquidMetalOrientationGizmoProps) => (
    <LiquidMetalOrientationGizmo {...props} />
  ),
};
