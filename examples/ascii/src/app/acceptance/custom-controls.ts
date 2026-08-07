import type { ToolcraftControlSchema } from "@/toolcraft/runtime";

import type {
  ToolcraftComponentAcceptance,
  ToolcraftCustomControlCoverage,
} from "./types";
import { builtInToolcraftControlTypeValues } from "./types";

const builtInToolcraftControlTypes = new Set<string>(
  builtInToolcraftControlTypeValues,
);

export const requiredCustomControlCoverage: readonly ToolcraftCustomControlCoverage[] = [
  "built-in-gap",
  "kit-primitives",
  "minimal-ui",
  "product-output",
  "runtime-state",
];

export function isCustomToolcraftControl(control: ToolcraftControlSchema): boolean {
  return !builtInToolcraftControlTypes.has(control.type);
}

const collectionEntityCustomControlRe =
  /\b(collection|repeatable|list|lists|item|items|entry|entries|row|rows|asset|assets|object|objects|color|colors|swatch|swatches|glyph|glyphs|symbol|symbols|point|points|stop|stops|variant|variants|rule|rules|mask|masks|shape|shapes|layer|layers|media|image|images|file|files)\b/i;
const collectionOperationCustomControlRe =
  /\b(add|adding|delete|deleting|remove|removing|reorder|reordering|order|ordering|sort|sorting|select|selecting|selected|selection|duplicate|duplicating|upload|import|clear|clearing)\b/i;

const actionLikeCustomControlRe =
  /\b(add|adding|delete|deleting|remove|removing|duplicate|duplicating|sort|sorting|normalize|normalizing|clear|clearing|reset|shuffle|randomize|randomizing)\b/i;

const chromeOnlyCustomControlReasonRe =
  /\b(icon|icons|visual|style|styling|layout|spacing|chrome|button|buttons|compact|custom look|custom ui)\b/i;
const productInteractionCustomControlReasonRe =
  /\b(runtime|state|canvas|output|export|upload|import|preview|reorder|ordering|sort|drag|resize|handle|threshold|density|mapping|geometry|nested|multi|multiple|per-item|metadata|hit target|validation|selection)\b/i;
const collectionValueKeyRe =
  /^(items?|entries|rows|assets|objects|colors?|glyphs?|symbols?|points?|stops?|variants?|rules?|masks?|shapes?|layers?|media|images?|files?)$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringifyUnknownForFitCheck(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(stringifyUnknownForFitCheck).join(" ");
  }

  if (isRecord(value)) {
    return Object.entries(value)
      .flatMap(([key, entryValue]) => [key, stringifyUnknownForFitCheck(entryValue)])
      .join(" ");
  }

  return "";
}

function arrayLooksLikeCollectionValue(value: readonly unknown[]): boolean {
  return (
    value.length === 0 ||
    value.some((item) => isRecord(item) || Array.isArray(item) || typeof item === "string")
  );
}

function hasCollectionValueShape(value: unknown): boolean {
  if (!isRecord(value)) {
    return Array.isArray(value) && arrayLooksLikeCollectionValue(value);
  }

  return Object.entries(value).some(([key, entryValue]) => {
    if (Array.isArray(entryValue)) {
      return collectionValueKeyRe.test(key) || arrayLooksLikeCollectionValue(entryValue);
    }

    return collectionValueKeyRe.test(key) && isRecord(entryValue);
  });
}

function getCustomFitCheckSearchText(
  entry: ToolcraftComponentAcceptance,
  control?: ToolcraftControlSchema,
): string {
  return [
    control?.type,
    control?.target,
    typeof control?.label === "string" ? control.label : undefined,
    stringifyUnknownForFitCheck(control?.defaultValue),
    entry.id,
    entry.target,
    entry.componentType,
    entry.expectedObservable,
    entry.userAction,
    entry.builtInFitCheck?.whyInsufficient,
    entry.builtInFitCheck?.productObservable,
  ]
    .filter(Boolean)
    .join(" ");
}

function isCollectionLikeCustomControl(
  entry: ToolcraftComponentAcceptance,
  control: ToolcraftControlSchema,
): boolean {
  if (hasCollectionValueShape(control.defaultValue)) {
    return true;
  }

  const searchText = getCustomFitCheckSearchText(entry, control);

  return (
    collectionEntityCustomControlRe.test(searchText) &&
    collectionOperationCustomControlRe.test(searchText)
  );
}

export function getBuiltInFitCheckErrors(
  label: string,
  entry: ToolcraftComponentAcceptance,
  control: ToolcraftControlSchema,
): string[] {
  const fitCheck = entry.builtInFitCheck;

  if (!fitCheck) {
    return [
      `${label} is a custom control and must declare builtInFitCheck with checkedBuiltIns, closestBuiltIn, whyInsufficient, and productObservable.`,
    ];
  }

  const errors: string[] = [];
  const checkedBuiltIns = Array.isArray(fitCheck.checkedBuiltIns)
    ? fitCheck.checkedBuiltIns
    : [];

  if (checkedBuiltIns.length === 0) {
    errors.push(
      `${label} builtInFitCheck.checkedBuiltIns must name at least one checked built-in control.`,
    );
  }

  const unknownCheckedBuiltIns = checkedBuiltIns.filter(
    (builtIn) => !builtInToolcraftControlTypes.has(builtIn),
  );

  if (unknownCheckedBuiltIns.length > 0) {
    errors.push(
      `${label} builtInFitCheck.checkedBuiltIns contains unknown built-in controls: ${unknownCheckedBuiltIns.join(", ")}.`,
    );
  }

  if (
    fitCheck.closestBuiltIn !== "none" &&
    !checkedBuiltIns.includes(fitCheck.closestBuiltIn)
  ) {
    errors.push(
      `${label} builtInFitCheck.closestBuiltIn must be one of the checked built-ins or "none".`,
    );
  }

  if (fitCheck.whyInsufficient.trim().length < 24) {
    errors.push(
      `${label} builtInFitCheck.whyInsufficient must explain why the closest built-in cannot express the product interaction.`,
    );
  }

  if (fitCheck.productObservable.trim().length < 24) {
    errors.push(
      `${label} builtInFitCheck.productObservable must name the product output or side effect that proves the custom control is necessary.`,
    );
  }

  const searchText = getCustomFitCheckSearchText(entry, control);

  if (
    isCollectionLikeCustomControl(entry, control) &&
    !checkedBuiltIns.includes("collectionActions")
  ) {
    errors.push(
      `${label} builtInFitCheck.checkedBuiltIns must include collectionActions when the custom control owns a growable, removable, selectable, or reorderable runtime item set.`,
    );
  }

  if (actionLikeCustomControlRe.test(searchText) && !checkedBuiltIns.includes("actions")) {
    errors.push(
      `${label} builtInFitCheck.checkedBuiltIns must include actions when the custom control exposes local command buttons such as add, remove, delete, duplicate, sort, normalize, or clear.`,
    );
  }

  if (
    chromeOnlyCustomControlReasonRe.test(fitCheck.whyInsufficient) &&
    !productInteractionCustomControlReasonRe.test(fitCheck.whyInsufficient)
  ) {
    errors.push(
      `${label} builtInFitCheck.whyInsufficient cannot justify a custom control only with icons, layout, styling, or custom buttons; name the product interaction or value model that built-ins cannot express.`,
    );
  }

  return errors;
}
