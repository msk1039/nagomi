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

export interface DuckweedPatchSetting {
  x: number;
  y: number;
  radius: number;
  count: number;
  phase: number;
  palette: number;
}

export interface ButterflySpawnSetting {
  x: number;
  y: number;
  phase: number;
  palette: number;
}

export interface TinyFishSchoolSetting {
  x: number;
  y: number;
  count: number;
  heading: number;
  spreadX: number;
  spreadY: number;
  palette: number;
  sizeScale: number;
  speedScale: number;
  swirlDirection: -1 | 1;
}

export const CANVAS = {
  width: 480,
  height: 270,
} as const;

export const SIMULATION = {
  updatesPerSecond: 60,
  spineNodes: 14,
} as const;

export const FISH = {
  initialCount: 14,
  maximumCount: 48,
  regularLength: [27, 40] as const,
  regularWidthRatio: [0.17, 0.20] as const,
  tinyEvery: 2,
  tinyLength: [16, 22] as const,
  tinyWidthRatio: [0.18, 0.22] as const,
  eyeColor: 0x171815,
  shadow: {
    color: 0x0b211e,
    opacity: 0.46,
    offset: { x: 4.4, y: 10.4 },
  },
  callResponse: {
    // Farther fish receive a larger part of maximumDistanceDelaySeconds.
    minimumDelaySeconds: 0.04,
    distanceAtMaximumDelay: 360,
    maximumDistanceDelaySeconds: 1.05,
    distanceExponent: 1.5,
    randomJitterSeconds: 0.18,
    temperamentDelaySeconds: 0.22,
    targetLifetimeSeconds: 4.4,
    chaseBoostSeconds: 2.6,
    chaseSpeedMultiplier: 2.30,
    initialExtraSpeedMultiplier: 0.34,
  },
} as const;

export const TINY_FISH = {
  visibleSchoolCount: 3,
  bodyLength: [5.8, 8.2] as const,
  bodyWidthRatio: [0.10, 0.32] as const,
  tailLengthScale: 0.34,
  tailWidthScale: 0.92,
  finReachScale: 1.28,
  eyeRadius: 0.28,
  cruiseSpeed: [19, 27] as const,
  speedVariation: 0.46,
  edgeMargin: 14,
  neighbourRadius: 25,
  separationRadius: 6.2,
  cohesionStrength: 0.62,
  alignmentStrength: 0.56,
  separationStrength: 2.8,
  swirlStrength: 0.46,
  wanderStrength: 0.34,
  edgeStrength: 4.8,
  steeringResponse: 4.7,
  maximumTurnRate: 2.4,
  flee: {
    reactionRadius: 270,
    propagationSpeed: 180,
    randomDelay: 0.16,
    duration: [1.45, 2.35] as const,
    speed: [49, 64] as const,
    directionStrength: 5.8,
    schoolingStrength: 0.58,
    initialImpulse: 13,
  },
  shadow: {
    color: 0x12352f,
    opacity: 0.28,
    offset: { x: 1.5, y: 2.8 },
  },
  palettes: [
    {
      body: 0xffe66d,
      light: 0xfff3a0,
      accent: 0xff8c42,
      fin: 0xffc857,
      eye: 0x203638,
    },
    {
      body: 0x56dffc,
      light: 0xb2f2ff,
      accent: 0x3877ed,
      fin: 0x85edff,
      eye: 0x173b52,
    },
    {
      body: 0xff72ad,
      light: 0xffbad2,
      accent: 0xffd05e,
      fin: 0xff9bc2,
      eye: 0x4d2940,
    },
    {
      body: 0xa8ed48,
      light: 0xddff8c,
      accent: 0x38bb78,
      fin: 0xc5f56d,
      eye: 0x254535,
    },
  ],
} as const;

export const TINY_FISH_SCHOOLS: readonly TinyFishSchoolSetting[] = [
  {
    x: 174,
    y: 82,
    count: 24,
    heading: 0.35,
    spreadX: 32,
    spreadY: 15,
    palette: 0,
    sizeScale: 0.88,
    speedScale: 1.04,
    swirlDirection: 1,
  },
  {
    x: 343,
    y: 174,
    count: 15,
    heading: 2.75,
    spreadX: 22,
    spreadY: 11,
    palette: 1,
    sizeScale: 1.08,
    speedScale: 0.95,
    swirlDirection: -1,
  },
  {
    x: 139,
    y: 204,
    count: 34,
    heading: -0.72,
    spreadX: 40,
    spreadY: 18,
    palette: 2,
    sizeScale: 0.82,
    speedScale: 1.12,
    swirlDirection: 1,
  },
  {
    x: 377,
    y: 69,
    count: 19,
    heading: 2.2,
    spreadX: 28,
    spreadY: 13,
    palette: 3,
    sizeScale: 0.94,
    speedScale: 1,
    swirlDirection: -1,
  },
];

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

  deepColor: [0.486, 0.718, 0.631] as Rgb,
  shallowColor: [0.145, 0.395, 0.255] as Rgb,
  speckColor: [0.020, 0.065, 0.040] as Rgb,
  verticalTone: 0.20,
  grainScale: 0.54,
  edgeDarkening: 0.57,
} as const;

export const WATER = {
  showCurrentEffect: true,
  maximumRipples: 16,
  ripplesPerCall: 5,
  rippleIntervalSeconds: 0.023,
  rippleStrengthFalloff: 0.92,
  rippleLifetime: 2.2,
  colorTint: [0.96, 1.02, 1.0] as Rgb,
  largeCurrentColor: [0.022, 0.068, 0.047] as Rgb,
  largeCurrentCoreColor: [0.052, 0.155, 0.108] as Rgb,
  detailCurrentColor: [0.010, 0.034, 0.023] as Rgb,
  detailCurrentCoreColor: [0.028, 0.090, 0.061] as Rgb,
  // Use 0 to hide one layer without changing its colors.
  largeCellSize: 908,
  largeCurrentOpacity: 0.99,
  secondaryLargeCellSize:10,
  secondaryLargeCurrentOpacity: 0.15,
  detailCellSize: 20,
  detailCurrentOpacity: 0.9,
  currentDistortion: {
    amplitude: 0.015,
    waves: [
      { direction: [0.94, 0.34], frequency: 22, speed: 0.92, strength: 1.2 },
      { direction: [-0.38, 0.92], frequency: 31, speed: 0.51, strength: 0.55 },
      { direction: [0.71, 0.71], frequency: 59, speed: -6.38, strength: 0.28 },
    ],
  },
  rippleStartRadius: 4,
  rippleExpansionSpeed: 62,
  rippleDistortion: 5.55,
} as const;

export const LOTUS = {
  visibleLeafCount: 15,
  visibleFlowerCount: 4,
  radiusScale: 1.18,
  flowerRadiusScale: 1.38,
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

export const DUCKWEED = {
  visiblePatchCount: 8,
  minimumLeafRadius: 1.05,
  maximumLeafRadius: 3.35,
  verticalScale: 0.76,
  pairChance: 0.42,
  spreadExponent: 0.68,
  driftX: 5.55,
  driftY: 5.42,
  rotationAmount: 0.045,
  shadow: {
    color: 0x123b2d,
    opacity: 0.24,
    offset: { x: 1.4, y: 5.1 },
  },
  palettes: [
    {
      base: 0x6fc94f,
      light: 0x9be66c,
      shade: 0x45963e,
      center: 0xc3ee75,
    },
    {
      base: 0x83d35b,
      light: 0xb1ed76,
      shade: 0x549e43,
      center: 0xd0f28a,
    },
  ],
} as const;

// Duckweed stays near the pond boundary and the existing lotus clusters.
export const DUCKWEED_PATCHES: readonly DuckweedPatchSetting[] = [
  { x: 28, y: 45, radius: 30, count: 42, phase: 0.3, palette: 0 },
  { x: 102, y: 17, radius: 22, count: 28, phase: 1.7, palette: 1 },
  { x: 447, y: 34, radius: 77, count: 138, phase: 2.8, palette: 0 },
  { x: 470, y: 116, radius: 25, count: 34, phase: 4.1, palette: 1 },
  { x: 451, y: 225, radius: 31, count: 44, phase: 5.3, palette: 0 },
  { x: 378, y: 259, radius: 22, count: 29, phase: 0.9, palette: 1 },
  { x: 71, y: 244, radius: 29, count: 40, phase: 3.4, palette: 0 },
  { x: 13, y: 168, radius: 64, count: 200, phase: 4.8, palette: 0 },
];

export const BUTTERFLIES = {
  visibleCount: 4,
  edgeMargin: 14,
  bodyLength: 3.8,
  bodyWidth: 0.32,
  headRadius: 0.72,
  wingLength: 4.7,
  wingWidth: 5.4,
  wingSpotRadius: 0.58,
  minimumSpeed: 8.5,
  maximumSpeed: 30.5,
  flowerApproachSpeed: 18,
  turnResponsiveness: 3.4,
  wanderTargetDistance: [42, 105] as const,
  wanderTargetTurnRange: 2.2,
  randomTurnInterval: [0.32, 1.15] as const,
  randomTurnAngle: 0.72,
  sharpTurnChance: 0.18,
  sharpTurnAngle: 1.45,
  turnSmoothing: 3.1,
  curvedFlightStrength: 0.34,
  curvedFlightFrequency: [0.65, 1.35] as const,
  speedVariation: 0.27,
  flowerArrivalRadius: 7.5,
  flowerOrbitRadius: [7, 12] as const,
  flowerOrbitSpeed: [0.9, 1.5] as const,
  wanderDuration: [3.8, 7.4] as const,
  flowerVisitDuration: [2.2, 4.6] as const,
  flowerRestDuration: [0.8, 1.8] as const,
  flowerVisitChance: 0.92,
  flapSpeed: [17.5, 31.5] as const,
  driftAmount: 1.3,
  shadow: {
    color: 0x17372f,
    opacity: 0.20,
    offset: { x: 2.4, y: 3.2 },
    scale: 0.82,
  },
  palettes: [
    { wing: 0xf3a64c, wingLight: 0xffd36b, accent: 0x75448b, body: 0x3e2d35 },
    { wing: 0x71bce8, wingLight: 0xb8e4f5, accent: 0x315b9d, body: 0x293747 },
    { wing: 0xe9789d, wingLight: 0xffb4c5, accent: 0x8f416b, body: 0x49303c },
    { wing: 0xc4df58, wingLight: 0xeaf68a, accent: 0x508c61, body: 0x334239 },
  ],
} as const;

export const BUTTERFLY_SPAWNS: readonly ButterflySpawnSetting[] = [
  { x: 56, y: 61, phase: 0.2, palette: 0 },
  { x: 416, y: 71, phase: 1.9, palette: 1 },
  { x: 394, y: 214, phase: 3.6, palette: 2 },
  { x: 101, y: 218, phase: 5.2, palette: 3 },
  { x: 244, y: 30, phase: 0.9, palette: 1 },
  { x: 252, y: 242, phase: 4.4, palette: 0 },
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
