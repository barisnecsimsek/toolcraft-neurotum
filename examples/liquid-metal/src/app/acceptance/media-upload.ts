import type { ToolcraftControlSchema } from "@/toolcraft/runtime";

import { getAcceptanceEvidenceText } from "./evidence";
import type { ToolcraftComponentAcceptance } from "./types";

export function getFileDropLifecycleCoverageErrors(
  label: string,
  control: ToolcraftControlSchema,
  entry: ToolcraftComponentAcceptance,
  hasDefaultMediaAssets: boolean,
): string[] {
  const errors: string[] = [];
  const evidenceText = getAcceptanceEvidenceText(entry);

  if (entry.evidence !== "media-lifecycle") {
    errors.push(
      `${label} fileDrop acceptance evidence must be "media-lifecycle" so upload, clear, and reset behavior cannot be replaced by generic product-output coverage.`,
    );
  }

  if (
    !/\b(upload|import|drop|drag|browse|choose|select file|source image)\b/i.test(
      evidenceText,
    ) ||
    !/\b(clear|remove|delete|trash)\b/i.test(evidenceText) ||
    !/\b(reset|reset controls|section reset|global reset)\b/i.test(evidenceText)
  ) {
    errors.push(
      `${label} fileDrop acceptance must prove upload/import, clear/remove, and section or global reset restore default source media or remove uploaded source media when no default exists.`,
    );
  }

  if (hasDefaultMediaAssets) {
    const provesDefaultRemoval =
      /\b(default|predefined|preset|attached)\b.{0,60}\b(clear|remove|delete|trash)\b/i.test(
        evidenceText,
      ) ||
      /\b(clear|remove|delete|trash)\b.{0,60}\b(default|predefined|preset|attached)\b/i.test(
        evidenceText,
      );
    const provesDefaultReset =
      /\b(reset|section reset|global reset)\b.{0,80}\b(restore|restores|return|returns|recreate|recreates)\b.{0,80}\b(default|predefined|preset|attached)\b/i.test(
        evidenceText,
      );

    if (!provesDefaultRemoval || !provesDefaultReset) {
      errors.push(
        `${label} fileDrop acceptance must prove predefined media.defaultAssets render as attached files, can be removed to an empty source/canvas state, and are restored by section or global Reset.`,
      );
    }
  }

  if (control.assetKind !== "file") {
    const provesRotate = /\b(rotate|rotation|90°|90\s*degrees?)\b/i.test(evidenceText);
    const provesFlip = /\b(flip|flipped)\b/i.test(evidenceText);
    const provesTransformConsumption =
      /\b(mediaAssets\[\]\.transform|runtime media transform|transform metadata|preview|renderer|rendered output|export)\b/i.test(
        evidenceText,
      );

    if (!provesRotate || !provesFlip || !provesTransformConsumption) {
      errors.push(
        `${label} image fileDrop acceptance must prove rotate and flip actions update runtime media transform metadata and that preview, renderer, or export consumes the transform.`,
      );
    }
  }

  if (control.multiple === true) {
    const provesReorder = /\b(reorder|sort|sorting|drag|order)\b/i.test(evidenceText);
    const provesOrderConsumption =
      /\b(runtime media order|mediaAssets order|ordered media|preview|renderer|rendered output|export)\b/i.test(
        evidenceText,
      );

    if (!provesReorder || !provesOrderConsumption) {
      errors.push(
        `${label} multiple fileDrop acceptance must prove thumbnail/file reorder updates runtime media order and that preview, renderer, or export consumes that order.`,
      );
    }
  }

  return errors;
}
