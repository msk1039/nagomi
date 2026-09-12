export type WeatherPresetId =
  | "sunny"
  | "overcast"
  | "sunset"
  | "moonlight"
  | "rain";

type ColorTriplet = readonly [number, number, number];
type Direction = readonly [number, number];

export interface CurrentLayerTheme {
  colorTint: ColorTriplet;
  coreColorTint: ColorTriplet;
  opacityMultiplier: number;
  speedMultiplier: number;
}

export interface CurrentWeatherTheme {
  large: CurrentLayerTheme;
  secondaryLarge: CurrentLayerTheme;
  detail: CurrentLayerTheme;
}

export interface WeatherPreset {
  id: WeatherPresetId;
  label: string;
  tint: ColorTriplet;
  brightness: number;
  contrast: number;
  saturation: number;
  vignette: number;
  cloudStrength: number;
  lightColor: ColorTriplet;
  lightStrength: number;
  lightDirection: Direction;
  rainStrength: number;
  currents: CurrentWeatherTheme;
}

export const DEFAULT_WEATHER_PRESET_ID: WeatherPresetId = "sunny";

// These presets are runtime presentation values. They do not modify config.ts.
export const WEATHER_PRESETS: readonly WeatherPreset[] = [
  {
    id: "sunny",
    label: "Sunny",
    tint: [1, 1, 1],
    brightness: 1,
    contrast: 1,
    saturation: 1,
    vignette: 0,
    cloudStrength: 0,
    lightColor: [1, 0.94, 0.72],
    lightStrength: 0,
    lightDirection: [-0.58, 0.82],
    rainStrength: 0,
    currents: {
      large: {
        colorTint: [1, 1, 1],
        coreColorTint: [1, 1, 1],
        opacityMultiplier: 1,
        speedMultiplier: 1,
      },
      secondaryLarge: {
        colorTint: [1, 1, 1],
        coreColorTint: [1, 1, 1],
        opacityMultiplier: 1,
        speedMultiplier: 1,
      },
      detail: {
        colorTint: [1, 1, 1],
        coreColorTint: [1, 1, 1],
        opacityMultiplier: 1,
        speedMultiplier: 1,
      },
    },
  },
  {
    id: "overcast",
    label: "Overcast",
    tint: [0.87, 0.96, 1.02],
    brightness: 0.86,
    contrast: 0.9,
    saturation: 0.78,
    vignette: 0.1,
    cloudStrength: 0.62,
    lightColor: [0.72, 0.84, 0.9],
    lightStrength: 0.035,
    lightDirection: [0.42, 0.9],
    rainStrength: 0,
    currents: {
      large: {
        colorTint: [0.66, 0.86, 1.05],
        coreColorTint: [0.62, 0.88, 1.08],
        opacityMultiplier: 0.7,
        speedMultiplier: 0.54,
      },
      secondaryLarge: {
        colorTint: [0.58, 0.82, 1.12],
        coreColorTint: [0.54, 0.86, 1.16],
        opacityMultiplier: 0.58,
        speedMultiplier: 0.42,
      },
      detail: {
        colorTint: [0.7, 0.92, 1.08],
        coreColorTint: [0.66, 0.96, 1.12],
        opacityMultiplier: 0.55,
        speedMultiplier: 0.7,
      },
    },
  },
  {
    id: "sunset",
    label: "Sunset",
    tint: [1.08, 0.86, 0.7],
    brightness: 0.93,
    contrast: 1.06,
    saturation: 1.1,
    vignette: 0.2,
    cloudStrength: 0.16,
    lightColor: [1, 0.42, 0.15],
    lightStrength: 0.2,
    lightDirection: [-0.7, 0.72],
    rainStrength: 0,
    currents: {
      large: {
        colorTint: [1.42, 0.76, 0.5],
        coreColorTint: [1.34, 0.68, 0.4],
        opacityMultiplier: 0.92,
        speedMultiplier: 0.72,
      },
      secondaryLarge: {
        colorTint: [1.2, 0.62, 0.46],
        coreColorTint: [1.28, 0.66, 0.4],
        opacityMultiplier: 0.66,
        speedMultiplier: 0.5,
      },
      detail: {
        colorTint: [1.28, 0.84, 0.58],
        coreColorTint: [1.36, 0.86, 0.5],
        opacityMultiplier: 0.52,
        speedMultiplier: 0.86,
      },
    },
  },
  {
    id: "moonlight",
    label: "Moonlight",
    tint: [0.5, 0.7, 1.04],
    brightness: 0.6,
    contrast: 1.08,
    saturation: 0.76,
    vignette: 0.42,
    cloudStrength: 0.3,
    lightColor: [0.46, 0.68, 1],
    lightStrength: 0.14,
    lightDirection: [0.68, 0.74],
    rainStrength: 0,
    currents: {
      large: {
        colorTint: [0.52, 0.78, 1.5],
        coreColorTint: [0.48, 0.74, 1.62],
        opacityMultiplier: 0.72,
        speedMultiplier: 0.34,
      },
      secondaryLarge: {
        colorTint: [0.46, 0.7, 1.58],
        coreColorTint: [0.42, 0.68, 1.68],
        opacityMultiplier: 0.5,
        speedMultiplier: 0.24,
      },
      detail: {
        colorTint: [0.58, 0.86, 1.42],
        coreColorTint: [0.54, 0.9, 1.52],
        opacityMultiplier: 0.78,
        speedMultiplier: 0.44,
      },
    },
  },
  {
    id: "rain",
    label: "Rain",
    tint: [0.67, 0.86, 0.96],
    brightness: 0.72,
    contrast: 0.94,
    saturation: 0.72,
    vignette: 0.28,
    cloudStrength: 0.78,
    lightColor: [0.54, 0.75, 0.86],
    lightStrength: 0.045,
    lightDirection: [0.36, 0.93],
    rainStrength: 10,
    currents: {
      large: {
        colorTint: [0.54, 0.9, 1.34],
        coreColorTint: [0.48, 0.92, 1.44],
        opacityMultiplier: 1.12,
        speedMultiplier: 1.42,
      },
      secondaryLarge: {
        colorTint: [0.48, 0.84, 1.42],
        coreColorTint: [0.44, 0.88, 1.52],
        opacityMultiplier: 0.92,
        speedMultiplier: 1.18,
      },
      detail: {
        colorTint: [0.62, 1, 1.28],
        coreColorTint: [0.58, 1.04, 1.36],
        opacityMultiplier: 1.28,
        speedMultiplier: 1.72,
      },
    },
  },
];

export function getWeatherPreset(id: WeatherPresetId): WeatherPreset {
  return (
    WEATHER_PRESETS.find((preset) => preset.id === id) ?? WEATHER_PRESETS[0]
  );
}
