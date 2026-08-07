import { TOOLCRAFT_CHOICE_COMPONENT_CONTRACTS } from "./component-contracts.choices";
import { TOOLCRAFT_INPUT_COMPONENT_CONTRACTS } from "./component-contracts.inputs";
import { TOOLCRAFT_MEDIA_CUSTOM_COMPONENT_CONTRACTS } from "./component-contracts.media-custom";
import { TOOLCRAFT_RUNTIME_COMPONENT_CONTRACTS } from "./component-contracts.runtime";
import { TOOLCRAFT_VISUAL_COMPONENT_CONTRACTS } from "./component-contracts.visual";
import type { ToolcraftComponentContract } from "./types";

export type * from "./types";

export const TOOLCRAFT_COMPONENT_CONTRACTS = {
  ...TOOLCRAFT_INPUT_COMPONENT_CONTRACTS,
  ...TOOLCRAFT_CHOICE_COMPONENT_CONTRACTS,
  ...TOOLCRAFT_VISUAL_COMPONENT_CONTRACTS,
  ...TOOLCRAFT_MEDIA_CUSTOM_COMPONENT_CONTRACTS,
  ...TOOLCRAFT_RUNTIME_COMPONENT_CONTRACTS,
} as const satisfies Record<string, ToolcraftComponentContract>;

export type ToolcraftComponentContractId = keyof typeof TOOLCRAFT_COMPONENT_CONTRACTS;

export function getToolcraftComponentContract<const Id extends ToolcraftComponentContractId>(
  id: Id,
): (typeof TOOLCRAFT_COMPONENT_CONTRACTS)[Id] {
  return TOOLCRAFT_COMPONENT_CONTRACTS[id];
}
