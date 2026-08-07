import * as React from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";

import {
  createControlHistoryGroupId,
  type ControlChangeMeta,
} from "@/toolcraft/ui";

import {
  easeInOutQuad,
  getOrbitCameraQuaternion,
  getOrbitRadius,
  orbitPoseFromGizmoPointer,
  projectOrbitAxes,
  readOrbitPose,
  snapOrbitPose,
  type OrbitAxis,
  type OrbitAxisProjection,
  type OrbitPose,
} from "./orbit-camera";

const CSS_SIZE = 70;
const PIXEL_RATIO = 2;
const CENTER = CSS_SIZE / 2;
const AXIS_REACH = 24.5;
const DOT_RADIUS = 5.6;
const HOVER_RADIUS = DOT_RADIUS * 1.3;
const HIT_RADIUS = 7;
const FALLBACK_HIT_RADIUS = 8.4;
const SNAP_DURATION_MS = 600;
const DRAG_THRESHOLD_PX = 3;

const axisColors: Record<"x" | "y" | "z", string> = {
  x: "#ff215e",
  y: "#53ff55",
  z: "#3b69ff",
};

type SetOrbitValue = (value: unknown, meta?: ControlChangeMeta) => void;

type OrientationGizmoControlProps = {
  setValue: SetOrbitValue;
  value: unknown;
};

function getAxisColor(axis: OrbitAxis): string {
  return axisColors[axis[1] as "x" | "y" | "z"];
}

function isPositiveAxis(axis: OrbitAxis): boolean {
  return axis[0] === "+";
}

function interpolatePose(start: OrbitPose, end: OrbitPose, progress: number): OrbitPose {
  const radius = getOrbitRadius(start);
  const quaternion = getOrbitCameraQuaternion(start).slerp(
    getOrbitCameraQuaternion(end),
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
  projections: readonly OrbitAxisProjection[],
): OrbitAxisProjection[] {
  return [...projections].sort((left, right) => right.depth - left.depth);
}

function findHoveredAxis(
  projections: readonly OrbitAxisProjection[],
  x: number,
  y: number,
): OrbitAxis | null {
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
  const exact = ranked.find((item) => item.distance <= HIT_RADIUS);
  const nearest = exact ?? ranked.find((item) => item.distance <= FALLBACK_HIT_RADIUS);

  return nearest?.axis ?? null;
}

function getLocalPointer(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: ((clientX - bounds.left) / Math.max(1, bounds.width)) * CSS_SIZE,
    y: ((clientY - bounds.top) / Math.max(1, bounds.height)) * CSS_SIZE,
  };
}

function drawGizmo(
  canvas: HTMLCanvasElement,
  pose: OrbitPose,
  hoveredAxis: OrbitAxis | null,
): void {
  const context = canvas.getContext("2d");
  if (!context) return;

  context.setTransform(PIXEL_RATIO, 0, 0, PIXEL_RATIO, 0, 0);
  context.clearRect(0, 0, CSS_SIZE, CSS_SIZE);

  const projections = sortRearToFront(projectOrbitAxes(pose, CENTER, AXIS_REACH));
  context.lineCap = "round";

  for (const projection of projections) {
    const color = getAxisColor(projection.axis);
    const opacity = projection.isFrontFacing ? 0.95 : 0.3;

    context.globalAlpha = opacity;
    if (isPositiveAxis(projection.axis)) {
      context.strokeStyle = color;
      context.lineWidth = 2.1;
      context.beginPath();
      context.moveTo(CENTER, CENTER);
      context.lineTo(projection.x, projection.y);
      context.stroke();
    }

    context.fillStyle = color;
    context.beginPath();
    context.arc(
      projection.x,
      projection.y,
      projection.axis === hoveredAxis ? HOVER_RADIUS : DOT_RADIUS,
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

const OrientationGizmoBacking = React.memo(function OrientationGizmoBacking({
  dark,
}: {
  dark: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      data-testid="orientation-gizmo-backing"
      style={{
        backfaceVisibility: "hidden",
        backgroundColor: dark ? "#000000" : "#ececef",
        borderRadius: "50%",
        bottom: 16,
        contain: "paint",
        height: CSS_SIZE,
        left: 16,
        pointerEvents: "none",
        position: "absolute",
        transform: "translateZ(0)",
        width: CSS_SIZE,
        zIndex: 20,
      }}
    />
  );
});

function OrientationGizmoControl({
  setValue,
  value,
}: OrientationGizmoControlProps): React.JSX.Element | null {
  const portalTarget = useCanvasViewportPortal();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = React.useRef(0);
  const pose = readOrbitPose(value);
  const poseRef = React.useRef(pose);
  const activeAxisRef = React.useRef<OrbitAxis | null>(null);
  const activeAxisCameraLocalZSignRef = React.useRef<-1 | 1>(1);
  const draggedRef = React.useRef(false);
  const historyGroupRef = React.useRef("");
  const startPointerRef = React.useRef({ x: 0, y: 0 });
  const [hoveredAxis, setHoveredAxis] = React.useState<OrbitAxis | null>(null);
  const [dark, setDark] = React.useState(true);

  poseRef.current = pose;

  React.useEffect(() => {
    const updateTheme = () => {
      const rootStyle = window.getComputedStyle(document.documentElement);
      setDark(
        document.documentElement.classList.contains("dark") ||
          rootStyle.colorScheme.includes("dark"),
      );
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributeFilter: ["class", "data-theme", "style"],
      attributes: true,
    });
    return () => observer.disconnect();
  }, []);

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
    (nextPose: OrbitPose) => {
      poseRef.current = nextPose;
      setValue(nextPose, {
        history: "merge",
        historyGroup: historyGroupRef.current,
      });
    },
    [setValue],
  );

  const animateSnap = React.useCallback(
    (axis: OrbitAxis) => {
      window.cancelAnimationFrame(animationFrameRef.current);
      const startPose = poseRef.current;
      const targetPose = snapOrbitPose(startPose, axis);
      const startedAt = performance.now();

      const animate = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / SNAP_DURATION_MS);
        commitPose(
          interpolatePose(startPose, targetPose, easeInOutQuad(progress)),
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
      <OrientationGizmoBacking dark={dark} />
      <canvas
        aria-hidden="true"
        data-hovered-axis={hoveredAxis ?? ""}
        data-testid="orientation-gizmo"
        data-toolcraft-canvas-handle="orientation-gizmo"
        height={CSS_SIZE * PIXEL_RATIO}
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
          const projections = projectOrbitAxes(
            poseRef.current,
            CENTER,
            AXIS_REACH,
          );
          const axis = findHoveredAxis(projections, point.x, point.y);
          if (!axis) return;
          const activeProjection = projections.find(
            (projection) => projection.axis === axis,
          );

          window.cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = 0;
          historyGroupRef.current = createControlHistoryGroupId(
            "orientation-gizmo",
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
                projectOrbitAxes(poseRef.current, CENTER, AXIS_REACH),
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
            ) <= DRAG_THRESHOLD_PX
          ) {
            return;
          }

          draggedRef.current = true;
          commitPose(
            orbitPoseFromGizmoPointer(
              poseRef.current,
              activeAxis,
              point.x,
              point.y,
              CENTER,
              AXIS_REACH,
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
          height: CSS_SIZE,
          left: 16,
          outline: "none",
          outlineWidth: 0,
          position: "absolute",
          touchAction: "none",
          width: CSS_SIZE,
          zIndex: 21,
        }}
        width={CSS_SIZE * PIXEL_RATIO}
      />
    </>,
    portalTarget,
  );
}

export const effectsControlRenderers = {
  orientationGizmo: (props: OrientationGizmoControlProps) => (
    <OrientationGizmoControl {...props} />
  ),
};
