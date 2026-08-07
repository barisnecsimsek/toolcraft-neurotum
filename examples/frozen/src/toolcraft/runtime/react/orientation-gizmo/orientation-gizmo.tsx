"use client";

import * as React from "react";
import { createControlHistoryGroupId, type ControlChangeMeta } from "@/toolcraft/ui";

import type { ToolcraftExternalStore } from "../../state/toolcraft-external-store";
import { useToolcraftTheme } from "../app-shell/theme-runtime";
import {
  beginToolcraftOrientationInteraction,
  type ToolcraftOrientationInteractionLease,
} from "./orientation-interaction-coordinator";
import {
  easeToolcraftOrientationSnap,
  getToolcraftOrientationPoseFromGizmoPointer,
  interpolateToolcraftOrientationPose,
  projectToolcraftOrientationAxes,
  readToolcraftOrientationPose,
  snapToolcraftOrientationPose,
  type ToolcraftOrientationAxis,
  type ToolcraftOrientationAxisProjection,
  type ToolcraftOrientationPose,
} from "./orientation-gizmo-math";

export const toolcraftOrientationGizmoCssSize = 70;
export const toolcraftOrientationGizmoInset = 16;

const pixelRatio = 2;
const center = toolcraftOrientationGizmoCssSize / 2;
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

export type ToolcraftOrientationGizmoProps = {
  defaultValue?: ToolcraftOrientationPose;
  onValueChange?: (
    value: ToolcraftOrientationPose,
    meta?: ControlChangeMeta,
  ) => void;
  testId?: string;
  store: ToolcraftExternalStore;
  target: string;
  value: unknown;
};

function getAxisColor(axis: ToolcraftOrientationAxis): string {
  return axisColors[axis[1] as "x" | "y" | "z"];
}

function isPositiveAxis(axis: ToolcraftOrientationAxis): boolean {
  return axis[0] === "+";
}

function sortRearToFront(
  projections: readonly ToolcraftOrientationAxisProjection[],
): ToolcraftOrientationAxisProjection[] {
  return [...projections].sort((left, right) => right.depth - left.depth);
}

function findHoveredAxis(
  projections: readonly ToolcraftOrientationAxisProjection[],
  x: number,
  y: number,
): ToolcraftOrientationAxis | null {
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
    x:
      ((clientX - bounds.left) / Math.max(1, bounds.width)) *
      toolcraftOrientationGizmoCssSize,
    y:
      ((clientY - bounds.top) / Math.max(1, bounds.height)) *
      toolcraftOrientationGizmoCssSize,
  };
}

function drawGizmo(
  canvas: HTMLCanvasElement,
  pose: ToolcraftOrientationPose,
  hoveredAxis: ToolcraftOrientationAxis | null,
): void {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(
    0,
    0,
    toolcraftOrientationGizmoCssSize,
    toolcraftOrientationGizmoCssSize,
  );
  context.lineCap = "round";

  for (const projection of sortRearToFront(
    projectToolcraftOrientationAxes(pose, center, axisReach),
  )) {
    const color = getAxisColor(projection.axis);

    context.globalAlpha = projection.isFrontFacing ? 0.95 : 0.3;
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

export function ToolcraftOrientationGizmo({
  defaultValue,
  onValueChange,
  store,
  target,
  testId = "toolcraft-orientation-gizmo",
  value,
}: ToolcraftOrientationGizmoProps): React.JSX.Element {
  const { resolvedTheme } = useToolcraftTheme();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = React.useRef(0);
  const pose = readToolcraftOrientationPose(value, defaultValue);
  const poseRef = React.useRef(pose);
  const activeAxisRef = React.useRef<ToolcraftOrientationAxis | null>(null);
  const activeAxisCameraLocalZSignRef = React.useRef<-1 | 1>(1);
  const draggedRef = React.useRef(false);
  const historyGroupRef = React.useRef("");
  const interactionRef =
    React.useRef<ToolcraftOrientationInteractionLease | null>(null);
  const activeCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const activePointerIdRef = React.useRef<number | null>(null);
  const startPointerRef = React.useRef({ x: 0, y: 0 });
  const [hoveredAxis, setHoveredAxis] =
    React.useState<ToolcraftOrientationAxis | null>(null);

  poseRef.current = pose;

  React.useLayoutEffect(() => {
    if (canvasRef.current) {
      drawGizmo(canvasRef.current, pose, hoveredAxis);
    }
  }, [hoveredAxis, pose]);

  const clearLocalInteraction = React.useCallback((): void => {
    const canvas = activeCanvasRef.current;
    const pointerId = activePointerIdRef.current;

    window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = 0;
    activeAxisRef.current = null;
    activeCanvasRef.current = null;
    activePointerIdRef.current = null;
    draggedRef.current = false;
    setHoveredAxis(null);

    if (pointerId !== null && canvas?.hasPointerCapture?.(pointerId)) {
      canvas.releasePointerCapture?.(pointerId);
    }
  }, []);

  const releaseInteraction = React.useCallback((): void => {
    interactionRef.current?.release();
    interactionRef.current = null;
  }, []);

  React.useEffect(
    () => () => {
      window.cancelAnimationFrame(animationFrameRef.current);
      interactionRef.current?.release();
      interactionRef.current = null;
    },
    [],
  );

  const commitPose = React.useCallback(
    (nextPose: ToolcraftOrientationPose): boolean => {
      const interaction = interactionRef.current;

      if (!interaction) {
        return false;
      }

      return interaction.runOwnWrite(() => {
        poseRef.current = nextPose;
        onValueChange?.(nextPose, {
          history: "merge",
          historyGroup: historyGroupRef.current,
        });
      });
    },
    [onValueChange],
  );

  const animateSnap = React.useCallback(
    (axis: ToolcraftOrientationAxis) => {
      window.cancelAnimationFrame(animationFrameRef.current);
      const startPose = poseRef.current;
      const targetPose = snapToolcraftOrientationPose(startPose, axis);
      const startedAt = performance.now();

      const animate = (now: number): void => {
        const progress = Math.min(1, (now - startedAt) / snapDurationMs);

        const committed = commitPose(
          interpolateToolcraftOrientationPose(
            startPose,
            targetPose,
            easeToolcraftOrientationSnap(progress),
          ),
        );

        if (!committed) {
          animationFrameRef.current = 0;
          return;
        }

        if (progress < 1) {
          animationFrameRef.current = window.requestAnimationFrame(animate);
        } else {
          animationFrameRef.current = 0;
          releaseInteraction();
        }
      };

      animationFrameRef.current = window.requestAnimationFrame(animate);
    },
    [commitPose, releaseInteraction],
  );

  return (
    <>
      <div
        aria-hidden="true"
        data-slot="toolcraft-orientation-gizmo-backing"
        style={{
          backfaceVisibility: "hidden",
          backgroundColor: resolvedTheme === "dark" ? "#000000" : "#ececef",
          borderRadius: "50%",
          bottom: toolcraftOrientationGizmoInset,
          contain: "paint",
          height: toolcraftOrientationGizmoCssSize,
          left: toolcraftOrientationGizmoInset,
          pointerEvents: "none",
          position: "absolute",
          transform: "translateZ(0)",
          width: toolcraftOrientationGizmoCssSize,
          zIndex: 20,
        }}
      />
      <canvas
        aria-label="3D orientation gizmo"
        data-hovered-axis={hoveredAxis ?? ""}
        data-testid={testId}
        data-toolcraft-canvas-handle="orientation-gizmo"
        data-toolcraft-orientation-pose={JSON.stringify(pose)}
        data-toolcraft-orientation-target={target}
        height={toolcraftOrientationGizmoCssSize * pixelRatio}
        onPointerCancel={(event) => {
          event.preventDefault();
          event.stopPropagation();
          interactionRef.current?.cancel();
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          const canvas = event.currentTarget;
          const point = getLocalPointer(canvas, event.clientX, event.clientY);
          const projections = projectToolcraftOrientationAxes(
            poseRef.current,
            center,
            axisReach,
          );
          const axis = findHoveredAxis(projections, point.x, point.y);

          if (!axis) {
            return;
          }

          const activeProjection = projections.find(
            (projection) => projection.axis === axis,
          );

          window.cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = 0;
          historyGroupRef.current =
            createControlHistoryGroupId("orientation-gizmo");
          let interaction: ToolcraftOrientationInteractionLease;
          interaction = beginToolcraftOrientationInteraction({
            onCancel: () => {
              if (interactionRef.current === interaction) {
                interactionRef.current = null;
              }
              clearLocalInteraction();
            },
            store,
            target,
          });
          interactionRef.current = interaction;
          activeAxisRef.current = axis;
          activeCanvasRef.current = canvas;
          activePointerIdRef.current = event.pointerId;
          activeAxisCameraLocalZSignRef.current =
            (activeProjection?.depth ?? -1) <= 0 ? 1 : -1;
          draggedRef.current = false;
          startPointerRef.current = point;
          setHoveredAxis(axis);
          canvas.setPointerCapture?.(event.pointerId);
        }}
        onPointerLeave={() => {
          if (!activeAxisRef.current) {
            setHoveredAxis(null);
          }
        }}
        onLostPointerCapture={(event) => {
          if (activePointerIdRef.current === event.pointerId) {
            interactionRef.current?.cancel();
          }
        }}
        onPointerMove={(event) => {
          event.stopPropagation();
          const point = getLocalPointer(
            event.currentTarget,
            event.clientX,
            event.clientY,
          );
          const activeAxis = activeAxisRef.current;

          if (!activeAxis) {
            setHoveredAxis(
              findHoveredAxis(
                projectToolcraftOrientationAxes(
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
            getToolcraftOrientationPoseFromGizmoPointer(
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

          if (!activeAxis) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
            activeCanvasRef.current = null;
            activePointerIdRef.current = null;
            activeAxisRef.current = null;
            event.currentTarget.releasePointerCapture?.(event.pointerId);
          } else {
            activeCanvasRef.current = null;
            activePointerIdRef.current = null;
            activeAxisRef.current = null;
          }
          setHoveredAxis(null);
          if (!draggedRef.current) {
            animateSnap(activeAxis);
          } else {
            releaseInteraction();
          }
          draggedRef.current = false;
        }}
        ref={canvasRef}
        role="application"
        style={{
          backgroundColor: "transparent",
          borderRadius: "50%",
          bottom: toolcraftOrientationGizmoInset,
          display: "block",
          height: toolcraftOrientationGizmoCssSize,
          left: toolcraftOrientationGizmoInset,
          outline: "none",
          position: "absolute",
          touchAction: "none",
          width: toolcraftOrientationGizmoCssSize,
          zIndex: 21,
        }}
        width={toolcraftOrientationGizmoCssSize * pixelRatio}
      />
    </>
  );
}
