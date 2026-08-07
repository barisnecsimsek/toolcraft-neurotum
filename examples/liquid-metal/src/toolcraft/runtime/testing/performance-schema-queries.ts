import type {
  ResolvedToolcraftAppSchema,
  ToolcraftControlSchema,
} from "../schema/types";

export function getAllSchemaControls(
  schema: ResolvedToolcraftAppSchema,
): ToolcraftControlSchema[] {
  return (schema.panels.controls?.sections ?? []).flatMap((section) =>
    Object.values(section.controls),
  );
}

export function getVisiblePerformanceControlTargets(schema: ResolvedToolcraftAppSchema): string[] {
  return getAllSchemaControls(schema)
    .filter((control) => control.type !== "panelActions")
    .map((control) => control.target);
}

function getActionValue(
  action: NonNullable<ToolcraftControlSchema["actions"]>[number],
): string {
  return typeof action === "string" ? action : action.value;
}

export function hasOutputDeliveryAction(schema: ResolvedToolcraftAppSchema): boolean {
  return getAllSchemaControls(schema).some(
    (control) =>
      control.type === "panelActions" &&
      (control.actions ?? []).some((action) =>
        /copy|download|export/i.test(getActionValue(action)),
      ),
  );
}

export function hasKeyframeTimeline(schema: ResolvedToolcraftAppSchema): boolean {
  return schema.panels.timeline?.enabled === true && schema.panels.timeline.mode === "keyframes";
}

export function hasLayersPanel(schema: ResolvedToolcraftAppSchema): boolean {
  return schema.panels.layers === true;
}
