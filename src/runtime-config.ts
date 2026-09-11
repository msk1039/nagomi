import {
  BUTTERFLIES,
  BUTTERFLY_SPAWNS,
  DUCKWEED,
  DUCKWEED_PATCHES,
  FISH,
  KOI_PALETTES,
  KOI_PATTERN_PATCHES,
  LOTUS,
  LOTUS_FLOWERS,
  LOTUS_LEAVES,
  POND_BED,
  TINY_FISH,
  TINY_FISH_SCHOOLS,
  WATER,
} from "./config";

export type ConfigPath = readonly (string | number)[];
export type RuntimeConfigDraft = Record<string, unknown>;

export interface RuntimeConfigSection {
  id: string;
  title: string;
  description: string;
  value: unknown;
  excludedKeys?: readonly string[];
}

export const RUNTIME_CONFIG_SECTIONS: readonly RuntimeConfigSection[] = [
  {
    id: "koi",
    title: "Koi",
    description: "Population, proportions, shadows, and call response.",
    value: FISH,
    excludedKeys: ["maximumCount"],
  },
  {
    id: "koi-palettes",
    title: "Koi palettes",
    description: "Body, marking, and fin colors for each koi family.",
    value: KOI_PALETTES,
  },
  {
    id: "koi-patterns",
    title: "Koi markings",
    description: "Placement and shape of the colored body patches.",
    value: KOI_PATTERN_PATCHES,
  },
  {
    id: "tiny-fish",
    title: "Tiny fish",
    description: "Schooling, flee behavior, proportions, and colors.",
    value: TINY_FISH,
  },
  {
    id: "tiny-fish-schools",
    title: "Tiny fish schools",
    description: "Population, origin, spread, and palette per school.",
    value: TINY_FISH_SCHOOLS,
  },
  {
    id: "pond-bed",
    title: "Pond bed",
    description: "Base water-bed colors, grain, and edge depth.",
    value: POND_BED,
  },
  {
    id: "water",
    title: "Water",
    description: "Currents, ripple timing, distortion, and tint.",
    value: WATER,
    excludedKeys: ["maximumRipples"],
  },
  {
    id: "lotus",
    title: "Lotus",
    description: "Leaf and flower geometry, drift, shadows, and palettes.",
    value: LOTUS,
  },
  {
    id: "lotus-leaves",
    title: "Lotus placements",
    description: "Position, scale, rotation, and palette for every leaf.",
    value: LOTUS_LEAVES,
  },
  {
    id: "lotus-flowers",
    title: "Lotus flowers",
    description: "Leaf attachment, position, size, and palette.",
    value: LOTUS_FLOWERS,
  },
  {
    id: "duckweed",
    title: "Duckweed",
    description: "Leaf size, drift, shadows, and green palettes.",
    value: DUCKWEED,
  },
  {
    id: "duckweed-patches",
    title: "Duckweed patches",
    description: "Population, spread, and origin of each patch.",
    value: DUCKWEED_PATCHES,
  },
  {
    id: "butterflies",
    title: "Butterflies",
    description: "Flight, flower visits, proportions, and colors.",
    value: BUTTERFLIES,
  },
  {
    id: "butterfly-spawns",
    title: "Butterfly spawns",
    description: "Initial position, phase, and palette per butterfly.",
    value: BUTTERFLY_SPAWNS,
  },
];

const DEFAULTS = new Map(
  RUNTIME_CONFIG_SECTIONS.map((section) => [
    section.id,
    structuredClone(section.value),
  ]),
);

type MutableRecord = Record<string | number, unknown>;

function asMutable(value: unknown): MutableRecord {
  return value as MutableRecord;
}

function copyInto(target: unknown, source: unknown): void {
  if (Array.isArray(target) && Array.isArray(source)) {
    target.length = source.length;
    for (let index = 0; index < source.length; index += 1) {
      const sourceValue = source[index];
      const targetValue = target[index];
      if (
        targetValue !== null &&
        sourceValue !== null &&
        typeof targetValue === "object" &&
        typeof sourceValue === "object"
      ) {
        copyInto(targetValue, sourceValue);
      } else {
        target[index] = structuredClone(sourceValue);
      }
    }
    return;
  }

  if (
    target !== null &&
    source !== null &&
    typeof target === "object" &&
    typeof source === "object"
  ) {
    const targetRecord = asMutable(target);
    const sourceRecord = asMutable(source);
    for (const key of Object.keys(sourceRecord)) {
      const sourceValue = sourceRecord[key];
      const targetValue = targetRecord[key];
      if (
        targetValue !== null &&
        sourceValue !== null &&
        typeof targetValue === "object" &&
        typeof sourceValue === "object"
      ) {
        copyInto(targetValue, sourceValue);
      } else {
        targetRecord[key] = structuredClone(sourceValue);
      }
    }
  }
}

export function createRuntimeConfigDraft(): RuntimeConfigDraft {
  return Object.fromEntries(
    RUNTIME_CONFIG_SECTIONS.map((section) => [
      section.id,
      structuredClone(section.value),
    ]),
  );
}

export function createDefaultRuntimeConfigDraft(): RuntimeConfigDraft {
  return Object.fromEntries(
    RUNTIME_CONFIG_SECTIONS.map((section) => [
      section.id,
      structuredClone(DEFAULTS.get(section.id)),
    ]),
  );
}

export function updateRuntimeConfigDraft(
  draft: RuntimeConfigDraft,
  sectionId: string,
  path: ConfigPath,
  value: boolean | number | string,
): RuntimeConfigDraft {
  if (!(sectionId in draft) || path.length === 0) return draft;
  const next = {
    ...draft,
    [sectionId]: structuredClone(draft[sectionId]),
  };
  let target = next[sectionId];
  for (const segment of path.slice(0, -1)) {
    target = asMutable(target)[segment];
  }
  asMutable(target)[path[path.length - 1]] = value;
  return next;
}

export function applyRuntimeConfigDraft(draft: RuntimeConfigDraft): void {
  for (const section of RUNTIME_CONFIG_SECTIONS) {
    const draftValue = draft[section.id];
    if (draftValue !== undefined) copyInto(section.value, draftValue);
  }
}

export function resetRuntimeConfig(): void {
  for (const section of RUNTIME_CONFIG_SECTIONS) {
    const defaultValue = DEFAULTS.get(section.id);
    if (defaultValue !== undefined) copyInto(section.value, defaultValue);
  }
}
