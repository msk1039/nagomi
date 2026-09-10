// Scene tuning file. Change the values in this file to experiment with the pond.

export type Rgb = readonly [number, number, number];

export interface KoiPaletteSetting {
  name: string;
  base: number;
  accent: number;
  marking: number;
  fin: number;
}

export interface KoiPatchSetting {
  position: number;
  length: number;
  width: number;
  offset: number;
  color: "accent" | "marking";
}

export interface LotusLeafSetting {
  x: number;
  y: number;
  radius: number;
  angle: number;
  phase: number;
  palette: number;
}

export interface LotusFlowerSetting {
  leafIndex: number;
  radius: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  palette: number;
}

export const CANVAS = {
  width: 480,
  height: 270,
} as const;

export const SIMULATION = {
  updatesPerSecond: 120,
  spineNodes: 14,
} as const;

export const FISH = {
  initialCount: 10,
  maximumCount: 48,
  regularLength: [27, 40] as const,
  regularWidthRatio: [0.17, 0.20] as const,
  tinyEvery: 2,
  tinyLength: [16, 22] as const,
  tinyWidthRatio: [0.18, 0.22] as const,
  eyeColor: 0x171815,
  shadow: {
    color: 0x0b211e,
    opacity: 0.56,
    offset: { x: 4.4, y: 10.4 },
  },
  callResponse: {
    // Farther fish receive a larger part of maximumDistanceDelaySeconds.
    minimumDelaySeconds: 0.04,
    distanceAtMaximumDelay: 360,
    maximumDistanceDelaySeconds: 1.05,
    distanceExponent: 1.35,
    randomJitterSeconds: 0.18,
    temperamentDelaySeconds: 0.22,
    targetLifetimeSeconds: 4.4,
    chaseBoostSeconds: 1.6,
    chaseSpeedMultiplier: 1.30,
    initialExtraSpeedMultiplier: 0.34,
  },
} as const;

// The order is Kohaku, Sanke, Showa, Ogon, Tancho, and Shiro.
export const KOI_PALETTES: readonly KoiPaletteSetting[] = [
  {
    name: "Kohaku",
    base: 0xf1eadb,
    accent: 0xdc4b2f,
    marking: 0x27251f,
    fin: 0xe6ddca,
  },
  {
    name: "Sanke",
    base: 0xf2ebdc,
    accent: 0xdf5032,
    marking: 0x20211f,
    fin: 0xe7dece,
  },
  {
    name: "Showa",
    base: 0xeee6d5,
    accent: 0xd9482e,
    marking: 0x242622,
    fin: 0xc9bfaa,
  },
  {
    name: "Ogon",
    base: 0xe7aa31,
    accent: 0xcf7626,
    marking: 0x78431f,
    fin: 0xd9922a,
  },
  {
    name: "Tancho",
    base: 0xf2ebdc,
    accent: 0xda4430,
    marking: 0x292723,
    fin: 0xe7dece,
  },
  {
    name: "Shiro",
    base: 0xeae5da,
    accent: 0x252825,
    marking: 0x4f5c5a,
    fin: 0xd7d2c7,
  },
];

export const KOI_PATTERN_PATCHES: readonly (readonly KoiPatchSetting[])[] = [
  [
    { position: 0.17, length: 0.090, width: 0.74, offset: 0.04, color: "accent" },
    { position: 0.48, length: 0.115, width: 0.69, offset: -0.12, color: "accent" },
    { position: 0.76, length: 0.085, width: 0.62, offset: 0.16, color: "accent" },
  ],
  [
    { position: 0.19, length: 0.095, width: 0.70, offset: 0.04, color: "accent" },
    { position: 0.58, length: 0.105, width: 0.66, offset: -0.14, color: "accent" },
    { position: 0.38, length: 0.045, width: 0.30, offset: 0.38, color: "marking" },
    { position: 0.79, length: 0.040, width: 0.28, offset: -0.36, color: "marking" },
  ],
  [
    { position: 0.15, length: 0.082, width: 0.63, offset: -0.05, color: "accent" },
    { position: 0.53, length: 0.092, width: 0.58, offset: 0.17, color: "accent" },
    { position: 0.32, length: 0.090, width: 0.72, offset: 0.10, color: "marking" },
    { position: 0.73, length: 0.105, width: 0.67, offset: -0.14, color: "marking" },
  ],
  [],
  [{ position: 0.16, length: 0.070, width: 0.52, offset: 0, color: "accent" }],
  [
    { position: 0.22, length: 0.092, width: 0.68, offset: 0.08, color: "accent" },
    { position: 0.51, length: 0.090, width: 0.60, offset: -0.18, color: "accent" },
    { position: 0.79, length: 0.074, width: 0.54, offset: 0.22, color: "accent" },
  ],
];

export const POND_BED = {
  deepColor: [0.105, 0.335, 0.225] as Rgb,
  shallowColor: [0.145, 0.395, 0.255] as Rgb,
  speckColor: [0.020, 0.065, 0.040] as Rgb,
  verticalTone: 0.20,
  grainScale: 0.34,
  edgeDarkening: 0.07,
} as const;

export const WATER = {
  maximumRipples: 8,
  ripplesPerCall: 3,
  rippleIntervalSeconds: 0.030,
  rippleStrengthFalloff: 0.92,
  rippleLifetime: 1.8,
  colorTint: [0.96, 1.02, 1.0] as Rgb,
  largeCurrentColor: [0.022, 0.068, 0.047] as Rgb,
  largeCurrentCoreColor: [0.052, 0.155, 0.108] as Rgb,
  detailCurrentColor: [0.010, 0.034, 0.023] as Rgb,
  detailCurrentCoreColor: [0.028, 0.090, 0.061] as Rgb,
  largeCellSize: 58,
  detailCellSize: 32,
  rippleStartRadius: 2,
  rippleExpansionSpeed: 62,
  rippleDistortion: 5.25,
} as const;

export const LOTUS = {
  visibleLeafCount: 15,
  visibleFlowerCount: 4,
  radiusScale: 1.18,
  leafSegments: 18,
  veinCount: 7,
  notchHalfAngle: 0.30,
  verticalScale: 0.92,
  driftX: 0.7,
  driftY: 0.55,
  rotationAmount: 0.055,
  shadow: {
    color: 0x0a2b26,
    opacity: 0.50,
    offset: { x: 4.8, y: 10.4 },
  },
  leafPalettes: [
    {
      base: 0x61ba63,
      light: 0x91d87a,
      shade: 0x408951,
      vein: 0x296b46,
      center: 0xb1e184,
    },
    {
      base: 0x70c66b,
      light: 0xa0e488,
      shade: 0x4b9558,
      vein: 0x30734a,
      center: 0xbce990,
    },
  ],
  flowerPalettes: [
    {
      outerPetal: 0xf29aaa,
      innerPetal: 0xffc4cc,
      petalLight: 0xffe1e2,
      center: 0xf2bd45,
      centerDark: 0xb96d31,
    },
    {
      outerPetal: 0xe985ac,
      innerPetal: 0xfab7ce,
      petalLight: 0xffdce6,
      center: 0xf5c64b,
      centerDark: 0xbd7330,
    },
  ],
} as const;

// Raise visibleLeafCount up to this list length to reveal reserve placements.
export const LOTUS_LEAVES: readonly LotusLeafSetting[] = [
  { x: -3, y: 37, radius: 22, angle: 0.35, phase: 0.2, palette: 0 },
  { x: 76, y: 17, radius: 16, angle: 2.15, phase: 1.4, palette: 1 },
  { x: 431, y: 18, radius: 23, angle: 2.75, phase: 2.2, palette: 0 },
  { x: 476, y: 88, radius: 17, angle: 4.25, phase: 3.3, palette: 1 },
  { x: 460, y: 151, radius: 23, angle: 0.95, phase: 4.6, palette: 0 },
  { x: 488, y: 216, radius: 20, angle: 3.55, phase: 5.4, palette: 1 },
  { x: 395, y: 252, radius: 22, angle: 5.3, phase: 0.9, palette: 0 },
  { x: 113, y: 260, radius: 28, angle: 4.65, phase: 2.8, palette: 1 },
  { x: 31, y: 230, radius: 19, angle: 1.85, phase: 4.1, palette: 0 },
  { x: 140, y: 10, radius: 21, angle: 0.70, phase: 5.9, palette: 1 },
  { x: 330, y: 7, radius: 14, angle: 3.85, phase: 1.8, palette: 0 },
  { x: 447, y: 57, radius: 20, angle: 5.65, phase: 3.8, palette: 1 },
  { x: 82, y: 76, radius: 12, angle: 1.25, phase: 4.9, palette: 0 },
  { x: 414, y: 194, radius: 23, angle: 4.85, phase: 2.5, palette: 1 },
  { x: 444, y: 224, radius: 20, angle: 2.85, phase: 2.5, palette: 1 },
  { x: 10, y: 165, radius: 14, angle: 2.55, phase: 2.5, palette: 0 },
  { x: 451, y: 246, radius: 10, angle: 0.15, phase: 3.1, palette: 1 },
  { x: 58, y: 202, radius: 15, angle: 5.15, phase: 5.0, palette: 0 },
  { x: 374, y: 31, radius: 19, angle: 2.25, phase: 1.1, palette: 1 },
];

// Raise visibleFlowerCount up to this list length to reveal reserve flowers.
export const LOTUS_FLOWERS: readonly LotusFlowerSetting[] = [
  {
    leafIndex: 12,
    radius: 5.4,
    offsetX: 0.5,
    offsetY: -0.5,
    rotation: 0.25,
    palette: 0,
  },
  {
    leafIndex: 13,
    radius: 5.0,
    offsetX: -0.8,
    offsetY: 0.3,
    rotation: 0.75,
    palette: 1,
  },
  {
    leafIndex: 7,
    radius: 4.8,
    offsetX: 2.0,
    offsetY: -1.0,
    rotation: 0.45,
    palette: 0,
  },
  {
    leafIndex: 15,
    radius: 4.5,
    offsetX: -1.0,
    offsetY: 0.5,
    rotation: 0.15,
    palette: 1,
  },
];

// Compatibility names used by the simulation modules.
export const CANVAS_WIDTH = CANVAS.width;
export const CANVAS_HEIGHT = CANVAS.height;
export const MAX_FISH = FISH.maximumCount;
export const INITIAL_FISH = FISH.initialCount;
export const SPINE_NODES = SIMULATION.spineNodes;
export const MAX_RIPPLES = WATER.maximumRipples;
export const RIPPLE_LIFETIME = WATER.rippleLifetime;
export const FIXED_STEP = 1 / SIMULATION.updatesPerSecond;
export const TAU = Math.PI * 2;
