import type {
  ResolvedToolcraftAppSchema,
  ToolcraftActionSchema,
} from "@/toolcraft/runtime";

import {
  getActionSearchText,
  getControlActions,
} from "./actions";

function actionLooksLikePngExport(action: ToolcraftActionSchema | string): boolean {
  const text = getActionSearchText(action).replace(/([a-z])([A-Z])/g, "$1 $2");

  return (
    (/\b(export|download)\b/i.test(text) && /\b(png|image)\b/i.test(text)) ||
    /\bexport\.png\b/i.test(text)
  );
}

function actionLooksLikeVideoExport(action: ToolcraftActionSchema | string): boolean {
  const text = getActionSearchText(action).replace(/([a-z])([A-Z])/g, "$1 $2");

  return (
    (/\b(export|download)\b/i.test(text) && /\b(video|mp4|webm|mov)\b/i.test(text)) ||
    /\bexport\.video\b/i.test(text)
  );
}

export function schemaHasPngExportPanelAction(schema: ResolvedToolcraftAppSchema): boolean {
  return (schema.panels.controls?.sections ?? []).some((section) =>
    Object.values(section.controls).some(
      (control) =>
        control.type === "panelActions" &&
        getControlActions(control).some(actionLooksLikePngExport),
    ),
  );
}

export function schemaHasVideoExportPanelAction(schema: ResolvedToolcraftAppSchema): boolean {
  return (schema.panels.controls?.sections ?? []).some((section) =>
    Object.values(section.controls).some(
      (control) =>
        control.type === "panelActions" &&
        getControlActions(control).some(actionLooksLikeVideoExport),
    ),
  );
}
