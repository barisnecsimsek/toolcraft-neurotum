import type { ResolvedToolcraftAppSchema } from "@/toolcraft/runtime";

import { getToolcraftControlDependencyGroupingErrors } from "./control-layout-dependency-rules";
import { getToolcraftControlEntityGroupingErrors } from "./control-layout-entity-rules";
import { buildToolcraftControlLayoutFacts } from "./control-layout-model";
import { getToolcraftControlLayoutSectionErrors } from "./control-layout-section-rules";
import type { ToolcraftControlSectionInventoryEntry } from "./types";

export function getToolcraftControlSectionGroupingErrors(
  schema: ResolvedToolcraftAppSchema,
  sectionInventory: readonly ToolcraftControlSectionInventoryEntry[] = [],
): string[] {
  const facts = buildToolcraftControlLayoutFacts(schema);

  return [
    ...getToolcraftControlLayoutSectionErrors(facts),
    ...getToolcraftControlDependencyGroupingErrors(facts),
    ...getToolcraftControlEntityGroupingErrors({ facts, sectionInventory }),
  ];
}
