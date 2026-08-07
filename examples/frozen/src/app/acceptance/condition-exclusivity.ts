import type { ToolcraftControlConditionSchema } from "@/toolcraft/runtime";

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function readComparableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const numberValue = Number(value.trim());

    return Number.isFinite(numberValue) ? numberValue : null;
  }

  return null;
}

function conditionMatchesValue(
  condition: ToolcraftControlConditionSchema,
  value: unknown,
): boolean {
  const matches: boolean[] = [];

  if ("equals" in condition) {
    matches.push(valuesEqual(value, condition.equals));
  }
  if ("notEquals" in condition) {
    matches.push(!valuesEqual(value, condition.notEquals));
  }
  if (condition.oneOf) {
    matches.push(condition.oneOf.some((item) => valuesEqual(value, item)));
  }
  if (condition.notOneOf) {
    matches.push(!condition.notOneOf.some((item) => valuesEqual(value, item)));
  }

  const numberValue = readComparableNumber(value);
  for (const [expected, compare] of [
    [condition.greaterThan, (left: number, right: number) => left > right],
    [
      condition.greaterThanOrEqual,
      (left: number, right: number) => left >= right,
    ],
    [condition.lessThan, (left: number, right: number) => left < right],
    [
      condition.lessThanOrEqual,
      (left: number, right: number) => left <= right,
    ],
  ] as const) {
    if (expected !== undefined) {
      matches.push(numberValue !== null && compare(numberValue, expected));
    }
  }

  return matches.length > 0 && matches.every(Boolean);
}

function getFiniteConditionValues(
  condition: ToolcraftControlConditionSchema,
): readonly unknown[] | null {
  const candidates =
    "equals" in condition
      ? [condition.equals]
      : condition.oneOf
        ? [...condition.oneOf]
        : null;

  return candidates?.filter((value) => conditionMatchesValue(condition, value)) ?? null;
}

type NumericBoundary = {
  inclusive: boolean;
  value: number;
};

type NumericInterval = {
  lower: NumericBoundary | null;
  upper: NumericBoundary | null;
};

function stricterLowerBoundary(
  current: NumericBoundary | null,
  candidate: NumericBoundary,
): NumericBoundary {
  if (
    !current ||
    candidate.value > current.value ||
    (candidate.value === current.value && !candidate.inclusive)
  ) {
    return candidate;
  }

  return current;
}

function stricterUpperBoundary(
  current: NumericBoundary | null,
  candidate: NumericBoundary,
): NumericBoundary {
  if (
    !current ||
    candidate.value < current.value ||
    (candidate.value === current.value && !candidate.inclusive)
  ) {
    return candidate;
  }

  return current;
}

function getNumericInterval(
  condition: ToolcraftControlConditionSchema,
): NumericInterval | null {
  let lower: NumericBoundary | null = null;
  let upper: NumericBoundary | null = null;

  if (condition.greaterThan !== undefined) {
    lower = stricterLowerBoundary(lower, {
      inclusive: false,
      value: condition.greaterThan,
    });
  }
  if (condition.greaterThanOrEqual !== undefined) {
    lower = stricterLowerBoundary(lower, {
      inclusive: true,
      value: condition.greaterThanOrEqual,
    });
  }
  if (condition.lessThan !== undefined) {
    upper = stricterUpperBoundary(upper, {
      inclusive: false,
      value: condition.lessThan,
    });
  }
  if (condition.lessThanOrEqual !== undefined) {
    upper = stricterUpperBoundary(upper, {
      inclusive: true,
      value: condition.lessThanOrEqual,
    });
  }

  return lower || upper ? { lower, upper } : null;
}

function intervalEndsBefore(
  upper: NumericBoundary | null,
  lower: NumericBoundary | null,
): boolean {
  if (!upper || !lower) {
    return false;
  }

  return (
    upper.value < lower.value ||
    (upper.value === lower.value && (!upper.inclusive || !lower.inclusive))
  );
}

export function areToolcraftConditionsProvablyExclusive(
  left: ToolcraftControlConditionSchema,
  right: ToolcraftControlConditionSchema,
): boolean {
  if (left.target !== right.target) {
    return false;
  }

  const leftValues = getFiniteConditionValues(left);
  if (
    leftValues &&
    leftValues.every((value) => !conditionMatchesValue(right, value))
  ) {
    return true;
  }

  const rightValues = getFiniteConditionValues(right);
  if (
    rightValues &&
    rightValues.every((value) => !conditionMatchesValue(left, value))
  ) {
    return true;
  }

  const leftInterval = getNumericInterval(left);
  const rightInterval = getNumericInterval(right);

  return Boolean(
    leftInterval &&
      rightInterval &&
      (intervalEndsBefore(leftInterval.upper, rightInterval.lower) ||
        intervalEndsBefore(rightInterval.upper, leftInterval.lower)),
  );
}

export function areToolcraftConditionSetsProvablyExclusive(
  left: readonly ToolcraftControlConditionSchema[],
  right: readonly ToolcraftControlConditionSchema[],
): boolean {
  return left.some((leftCondition) =>
    right.some((rightCondition) =>
      areToolcraftConditionsProvablyExclusive(leftCondition, rightCondition),
    ),
  );
}
