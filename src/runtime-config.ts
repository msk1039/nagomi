import {
  BUTTERFLIES,
  BUTTERFLY_SPAWNS,
  CANVAS,
  DUCKWEED,
  DUCKWEED_PATCHES,
  FISH,
  KOI_PALETTES,
  KOI_PATTERN_PATCHES,
  LOTUS,
  LOTUS_FLOWERS,
  LOTUS_LEAVES,
  POND_BED,
  RIPPLES,
  TINY_FISH,
  TINY_FISH_SCHOOLS,
  WATER,
  type ButterflySpawnSetting,
  type DuckweedPatchSetting,
  type LotusFlowerSetting,
  type LotusLeafSetting,
  type TinyFishSchoolSetting,
} from "./config";
import type { WeatherConfigValues } from "./weather";

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
    description: "Population, depth, wakes, feeding, shadows, and call response.",
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
    description: "Current layers, distortion, and tint.",
    value: WATER,
  },
  {
    id: "ripples",
    title: "Ripples",
    description: "Touch, rain, and koi-mouth ripples plus rainfall frequency.",
    value: RIPPLES,
    excludedKeys: ["maximumInstances"],
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

interface CollectionGrowthRule {
  sectionId: string;
  countKey: string;
  collectionSectionId: string;
  createItem: (draft: RuntimeConfigDraft) => unknown;
}

function asMutable(value: unknown): MutableRecord {
  return value as MutableRecord;
}

function randomBetween(minimum: number, maximum: number): number {
  return minimum + Math.random() * (maximum - minimum);
}

function randomInteger(minimum: number, maximumExclusive: number): number {
  return Math.floor(randomBetween(minimum, maximumExclusive));
}

function roundedRandom(minimum: number, maximum: number): number {
  return Number(randomBetween(minimum, maximum).toFixed(2));
}

function randomEdgePosition(): { x: number; y: number } {
  const side = randomInteger(0, 4);
  if (side === 0) {
    return { x: randomInteger(16, CANVAS.width - 15), y: randomInteger(8, 43) };
  }
  if (side === 1) {
    return {
      x: randomInteger(CANVAS.width - 42, CANVAS.width - 7),
      y: randomInteger(16, CANVAS.height - 15),
    };
  }
  if (side === 2) {
    return {
      x: randomInteger(16, CANVAS.width - 15),
      y: randomInteger(CANVAS.height - 42, CANVAS.height - 7),
    };
  }
  return { x: randomInteger(8, 43), y: randomInteger(16, CANVAS.height - 15) };
}

function createTinyFishSchool(): TinyFishSchoolSetting {
  return {
    x: randomInteger(48, CANVAS.width - 47),
    y: randomInteger(38, CANVAS.height - 37),
    count: randomInteger(10, 19),
    heading: roundedRandom(-Math.PI, Math.PI),
    spreadX: randomInteger(18, 41),
    spreadY: randomInteger(9, 21),
    palette: randomInteger(0, TINY_FISH.palettes.length),
    sizeScale: roundedRandom(0.8, 1.14),
    speedScale: roundedRandom(0.88, 1.14),
    swirlDirection: Math.random() < 0.5 ? -1 : 1,
  };
}

function createLotusLeaf(): LotusLeafSetting {
  const position = randomEdgePosition();
  return {
    ...position,
    radius: randomInteger(12, 27),
    angle: roundedRandom(0, Math.PI * 2),
    phase: roundedRandom(0, Math.PI * 2),
    palette: randomInteger(0, LOTUS.leafPalettes.length),
  };
}

function createLotusFlower(draft: RuntimeConfigDraft): LotusFlowerSetting {
  const lotus = draft.lotus as { visibleLeafCount?: number } | undefined;
  const leaves = draft["lotus-leaves"];
  const availableLeaves = Array.isArray(leaves) ? leaves.length : LOTUS_LEAVES.length;
  const visibleLeaves = Math.max(
    1,
    Math.min(availableLeaves, Math.round(lotus?.visibleLeafCount ?? LOTUS.visibleLeafCount)),
  );
  return {
    leafIndex: randomInteger(0, visibleLeaves),
    radius: roundedRandom(4.2, 6.2),
    offsetX: roundedRandom(-2.2, 2.2),
    offsetY: roundedRandom(-2.2, 2.2),
    rotation: roundedRandom(0, Math.PI * 2),
    palette: randomInteger(0, LOTUS.flowerPalettes.length),
  };
}

function createDuckweedPatch(): DuckweedPatchSetting {
  const position = randomEdgePosition();
  return {
    ...position,
    radius: randomInteger(18, 43),
    count: randomInteger(18, 33),
    phase: roundedRandom(0, Math.PI * 2),
    palette: randomInteger(0, DUCKWEED.palettes.length),
  };
}

function createButterflySpawn(): ButterflySpawnSetting {
  return {
    x: randomInteger(24, CANVAS.width - 23),
    y: randomInteger(24, CANVAS.height - 23),
    phase: roundedRandom(0, Math.PI * 2),
    palette: randomInteger(0, BUTTERFLIES.palettes.length),
  };
}

const COLLECTION_GROWTH_RULES: readonly CollectionGrowthRule[] = [
  {
    sectionId: "tiny-fish",
    countKey: "visibleSchoolCount",
    collectionSectionId: "tiny-fish-schools",
    createItem: createTinyFishSchool,
  },
  {
    sectionId: "lotus",
    countKey: "visibleLeafCount",
    collectionSectionId: "lotus-leaves",
    createItem: createLotusLeaf,
  },
  {
    sectionId: "lotus",
    countKey: "visibleFlowerCount",
    collectionSectionId: "lotus-flowers",
    createItem: createLotusFlower,
  },
  {
    sectionId: "duckweed",
    countKey: "visiblePatchCount",
    collectionSectionId: "duckweed-patches",
    createItem: createDuckweedPatch,
  },
  {
    sectionId: "butterflies",
    countKey: "visibleCount",
    collectionSectionId: "butterfly-spawns",
    createItem: createButterflySpawn,
  },
];

function growRelatedCollection(
  draft: RuntimeConfigDraft,
  sectionId: string,
  path: ConfigPath,
  value: boolean | number | string,
): void {
  if (typeof value !== "number" || path.length !== 1) return;
  const rule = COLLECTION_GROWTH_RULES.find(
    (candidate) => candidate.sectionId === sectionId && candidate.countKey === path[0],
  );
  if (!rule) return;
  const source = draft[rule.collectionSectionId];
  if (!Array.isArray(source)) return;
  const collection = structuredClone(source);
  const requestedCount = Math.max(0, Math.round(value));
  while (collection.length < requestedCount) {
    collection.push(rule.createItem(draft));
  }
  draft[rule.collectionSectionId] = collection;
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

export function applyWeatherConfig(values: WeatherConfigValues): void {
  copyInto(FISH, values.fish);
  copyInto(POND_BED, values.pondBed);
  copyInto(WATER, values.water);
}

export function applyWeatherConfigToDraft(
  draft: RuntimeConfigDraft,
  values: WeatherConfigValues,
): RuntimeConfigDraft {
  const next = { ...draft };
  const overwriteSection = (sectionId: string, overrides: unknown): void => {
    const current = draft[sectionId];
    if (current === undefined) return;
    const updated = structuredClone(current);
    copyInto(updated, overrides);
    next[sectionId] = updated;
  };

  overwriteSection("koi", values.fish);
  overwriteSection("pond-bed", values.pondBed);
  overwriteSection("water", values.water);
  return next;
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
  const next: RuntimeConfigDraft = {
    ...draft,
    [sectionId]: structuredClone(draft[sectionId]),
  };
  let target = next[sectionId];
  for (const segment of path.slice(0, -1)) {
    target = asMutable(target)[segment];
  }
  asMutable(target)[path[path.length - 1]] = value;
  growRelatedCollection(next, sectionId, path, value);
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
