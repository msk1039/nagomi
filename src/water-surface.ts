import * as THREE from "three";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAX_RIPPLES,
  RIPPLE_LIFETIME,
  WATER,
  type Rgb,
} from "./config";
import { School } from "./school";

const glslFloat = (value: number): string =>
  Number.isInteger(value) ? `${value}.0` : `${value}`;
const glslVec2 = (value: readonly [number, number]): string =>
  `vec2(${value.map(glslFloat).join(", ")})`;
const glslVec3 = (color: Rgb): string =>
  `vec3(${color.map(glslFloat).join(", ")})`;
const [currentWaveA, currentWaveB, currentWaveC] =
  WATER.currentDistortion.waves;

const currentEffectShader = WATER.showCurrentEffect
  ? /* glsl */ `
    vec2 wavePixel = directionalWavePixel(distortedPixel, uResolution, uTime);
    vec2 warpedPixel = warpWater(wavePixel);

    float largeBorder = cellularBorderDistance(
      warpedPixel / ${glslFloat(WATER.largeCellSize)}
    );
    float largeWidthNoise = valueNoise(warpedPixel * 0.018 + vec2(3.7, 11.2));
    float largeVein = 1.0 - smoothstep(
      0.032 + largeWidthNoise * 0.010,
      0.125 + largeWidthNoise * 0.022,
      largeBorder
    );
    float largeCore = 1.0 - smoothstep(0.010, 0.052, largeBorder);

    float secondaryLargeBorder = cellularBorderDistance(
      warpedPixel / ${glslFloat(WATER.secondaryLargeCellSize)}
      + vec2(5.2, 8.4)
    );
    float secondaryLargeWidthNoise = valueNoise(
      warpedPixel * 0.015 + vec2(17.6, -6.8)
    );
    float secondaryLargeVein = 1.0 - smoothstep(
      0.032 + secondaryLargeWidthNoise * 0.010,
      0.125 + secondaryLargeWidthNoise * 0.022,
      secondaryLargeBorder
    );
    float secondaryLargeCore =
      1.0 - smoothstep(0.010, 0.052, secondaryLargeBorder);

    float detailBorder = cellularBorderDistance(
      warpedPixel / ${glslFloat(WATER.detailCellSize)} + vec2(9.6, 4.3)
    );
    float detailRegion = smoothstep(
      0.48,
      0.75,
      valueNoise(warpedPixel * 0.008 + vec2(-5.1, 17.8))
    );
    float detailVein =
      (1.0 - smoothstep(0.030, 0.105, detailBorder)) * detailRegion;
    float detailCore =
      (1.0 - smoothstep(0.008, 0.043, detailBorder)) * detailRegion;

    color +=
      (
        largeVein * ${glslVec3(WATER.largeCurrentColor)}
        + largeCore * ${glslVec3(WATER.largeCurrentCoreColor)}
      ) * ${glslFloat(WATER.largeCurrentOpacity)};
    color +=
      (
        secondaryLargeVein * ${glslVec3(WATER.largeCurrentColor)}
        + secondaryLargeCore * ${glslVec3(WATER.largeCurrentCoreColor)}
      ) * ${glslFloat(WATER.secondaryLargeCurrentOpacity)};
    color +=
      (
        detailVein * ${glslVec3(WATER.detailCurrentColor)}
        + detailCore * ${glslVec3(WATER.detailCurrentCoreColor)}
      ) * ${glslFloat(WATER.detailCurrentOpacity)};
  `
  : "";

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  #define MAX_RIPPLES ${MAX_RIPPLES}

  uniform sampler2D uUnderwater;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform int uRippleCount;
  uniform vec4 uRipples[MAX_RIPPLES];
  varying vec2 vUv;

  vec2 hash22(vec2 point) {
    vec2 value = vec2(
      dot(point, vec2(127.1, 311.7)),
      dot(point, vec2(269.5, 183.3))
    );
    return fract(sin(value) * 43758.5453);
  }

  float valueNoise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);

    float bottomLeft = hash22(cell).x;
    float bottomRight = hash22(cell + vec2(1.0, 0.0)).x;
    float topLeft = hash22(cell + vec2(0.0, 1.0)).x;
    float topRight = hash22(cell + vec2(1.0, 1.0)).x;
    return mix(
      mix(bottomLeft, bottomRight, local.x),
      mix(topLeft, topRight, local.x),
      local.y
    );
  }

  vec2 warpWater(vec2 pixel) {
    float warpX = valueNoise(pixel * 0.010);
    float warpY = valueNoise(pixel * 0.012 + vec2(19.4, 7.8));
    float smallWarpX = valueNoise(
      pixel * 0.022 + vec2(31.8, -12.1)
    );
    float smallWarpY = valueNoise(
      pixel * 0.019 + vec2(-8.2, 26.6)
    );

    vec2 broadBend = vec2(
      sin(pixel.y * 0.025 + warpY * 5.2),
      cos(pixel.x * 0.022 + warpX * 5.6)
    );
    vec2 smallBend = vec2(
      sin((pixel.x + pixel.y) * 0.034 + smallWarpY * 4.8),
      cos((pixel.x - pixel.y) * 0.030 + smallWarpX * 5.1)
    );
    return pixel
      + (vec2(warpX, warpY) - 0.5) * 48.0
      + (vec2(smallWarpX, smallWarpY) - 0.5) * 18.0
      + broadBend * 11.0
      + smallBend * 4.5;
  }

  float cellularBorderDistance(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    float nearest = 10.0;
    float secondNearest = 10.0;

    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 neighbour = vec2(float(x), float(y));
        vec2 seed = hash22(cell + neighbour);
        vec2 animatedPoint = 0.5 + 0.32 * sin(6.2831853 * seed);
        vec2 pointDelta = neighbour + animatedPoint - local;
        float influence = mix(
          0.68,
          1.38,
          hash22(cell + neighbour + vec2(41.7, 13.2)).x
        );
        float distanceToPoint = length(pointDelta) / influence;
        if (distanceToPoint < nearest) {
          secondNearest = nearest;
          nearest = distanceToPoint;
        } else if (distanceToPoint < secondNearest) {
          secondNearest = distanceToPoint;
        }
      }
    }

    return secondNearest - nearest;
  }

  vec2 directionalWavePixel(vec2 pixel, vec2 resolution, float time) {
    float aspect = resolution.x / resolution.y;
    vec2 centered = (pixel / resolution - 0.5) * vec2(aspect, 1.0);

    float phaseA =
      dot(centered, ${glslVec2(currentWaveA.direction)})
      * ${glslFloat(currentWaveA.frequency)}
      - time * ${glslFloat(currentWaveA.speed)};
    float phaseB =
      dot(centered, ${glslVec2(currentWaveB.direction)})
      * ${glslFloat(currentWaveB.frequency)}
      - time * ${glslFloat(currentWaveB.speed)};
    float phaseC =
      dot(centered, ${glslVec2(currentWaveC.direction)})
      * ${glslFloat(currentWaveC.frequency)}
      - time * ${glslFloat(currentWaveC.speed)};

    vec2 slope =
      ${glslVec2(currentWaveA.direction)}
      * sin(phaseA)
      * ${glslFloat(currentWaveA.strength)}
      + ${glslVec2(currentWaveB.direction)}
      * sin(phaseB)
      * ${glslFloat(currentWaveB.strength)}
      + ${glslVec2(currentWaveC.direction)}
      * sin(phaseC)
      * ${glslFloat(currentWaveC.strength)};
    vec2 uvOffset =
      slope
      * vec2(1.0 / aspect, 1.0)
      * ${glslFloat(WATER.currentDistortion.amplitude)};
    return pixel + uvOffset * resolution;
  }

  void main() {
    vec2 pixel = vec2(vUv.x * uResolution.x, (1.0 - vUv.y) * uResolution.y);
    vec2 displacement = vec2(
      sin(pixel.y * 0.051 + uTime * 0.31) + sin(pixel.y * 0.017 - uTime * 0.19),
      cos(pixel.x * 0.043 - uTime * 0.23) + sin(pixel.x * 0.014 + uTime * 0.16)
    ) * 0.13 / uResolution;

    for (int index = 0; index < MAX_RIPPLES; index++) {
      if (index >= uRippleCount) break;

      vec4 ripple = uRipples[index];
      vec2 delta = pixel - ripple.xy;
      float distanceToCenter = length(delta);
      vec2 radial = delta / max(distanceToCenter, 0.001);
      float radius =
        ${glslFloat(WATER.rippleStartRadius)}
        + ripple.z * ${glslFloat(WATER.rippleExpansionSpeed)};
      float signedDistance = distanceToCenter - radius;
      float fade = 1.0 - smoothstep(
        ${glslFloat(WATER.rippleLifetime * 0.58)},
        ${glslFloat(WATER.rippleLifetime)},
        ripple.z
      );
      float distortionBand = exp(-abs(signedDistance) * 0.30) * fade * ripple.w;
      float direction = signedDistance < 0.0 ? -1.0 : 1.0;

      displacement +=
        vec2(radial.x, -radial.y)
        * direction
        * distortionBand
        * ${glslFloat(WATER.rippleDistortion)}
        / uResolution;
    }

    vec2 sampleUv = clamp(vUv + displacement, vec2(0.002), vec2(0.998));
    vec3 color = texture2D(uUnderwater, sampleUv).rgb;

    vec2 distortedPixel = vec2(
      sampleUv.x * uResolution.x,
      (1.0 - sampleUv.y) * uResolution.y
    );

    color *= ${glslVec3(WATER.colorTint)};
    ${currentEffectShader}

    gl_FragColor = vec4(color, 1.0);
  }
`;

export class WaterSurfacePass {
  public readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  private readonly material: THREE.ShaderMaterial;
  private readonly rippleData = Array.from(
    { length: MAX_RIPPLES },
    () => new THREE.Vector4(),
  );

  public constructor(underwaterTexture: THREE.Texture) {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uUnderwater: { value: underwaterTexture },
        uResolution: { value: new THREE.Vector2(CANVAS_WIDTH, CANVAS_HEIGHT) },
        uTime: { value: 0 },
        uRippleCount: { value: 0 },
        uRipples: { value: this.rippleData },
      },
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.mesh.frustumCulled = false;
  }

  public update(school: School, time: number): void {
    let activeCount = 0;
    for (const ripple of school.ripples) {
      if (
        !ripple.alive ||
        ripple.age < 0 ||
        activeCount >= MAX_RIPPLES
      ) {
        continue;
      }
      const life = Math.min(1, ripple.age / RIPPLE_LIFETIME);
      const strength = ripple.strength * (1 - life * 0.18);
      this.rippleData[activeCount].set(
        ripple.center.x,
        ripple.center.y,
        ripple.age,
        strength,
      );
      activeCount += 1;
    }
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uRippleCount.value = activeCount;
  }
}
