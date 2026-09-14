import * as THREE from "three";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FISH,
  MAX_FISH,
  MAX_WAKES,
} from "./config";
import { clamp } from "./math";
import type { School } from "./school";

const DISTURBANCE_WIDTH = Math.ceil(CANVAS_WIDTH * 0.5);
const DISTURBANCE_HEIGHT = Math.ceil(CANVAS_HEIGHT * 0.5);

const vertexHeader = /* glsl */ `
  precision highp float;
  uniform vec2 uResolution;

  vec4 pondPosition(vec2 point) {
    vec2 clip = vec2(
      point.x / uResolution.x * 2.0 - 1.0,
      1.0 - point.y / uResolution.y * 2.0
    );
    return vec4(clip, 0.0, 1.0);
  }
`;

const wakeVertexShader = /* glsl */ `
  ${vertexHeader}
  attribute vec2 aCenter;
  attribute vec2 aDirection;
  attribute vec4 aWake;
  uniform float uSpread;
  varying vec2 vWakePosition;
  varying vec2 vWakeNormal;
  varying vec4 vWake;

  void main() {
    float wakeLength = aWake.z;
    float halfWidth = wakeLength * uSpread + aWake.w * 3.0;
    vec2 normal = vec2(-aDirection.y, aDirection.x);
    float forwardDistance = position.x * wakeLength;
    float sideDistance = position.y * halfWidth;
    vec2 point =
      aCenter
      + aDirection * forwardDistance
      + normal * sideDistance;
    vWakePosition = vec2(forwardDistance, sideDistance);
    vWakeNormal = normal;
    vWake = aWake;
    gl_Position = pondPosition(point);
  }
`;

const wakeFragmentShader = /* glsl */ `
  precision highp float;
  uniform float uSpread;
  uniform float uOscillation;
  varying vec2 vWakePosition;
  varying vec2 vWakeNormal;
  varying vec4 vWake;

  void main() {
    float life = vWake.x;
    float strength = vWake.y;
    float wakeLength = max(vWake.z, 0.001);
    float bandWidth = max(vWake.w, 0.1);
    float along = clamp(vWakePosition.x / wakeLength, 0.0, 1.0);
    float waviness =
      1.0 + sin(vWakePosition.x * 0.39 - life * 12.0) * uOscillation;
    float armCenter = vWakePosition.x * uSpread * waviness;
    float armDistance = abs(abs(vWakePosition.y) - armCenter);
    float band = exp(-armDistance * armDistance / (bandWidth * bandWidth));
    float distanceFade =
      smoothstep(0.0, 0.08, along)
      * (1.0 - smoothstep(0.72, 1.0, along));
    float ageFade = 1.0 - smoothstep(0.42, 1.0, life);
    float crest = sin(vWakePosition.x * 0.72 - life * 15.0);
    float sideSign = vWakePosition.y < 0.0 ? -1.0 : 1.0;
    vec2 displacement =
      vWakeNormal
      * sideSign
      * crest
      * band
      * distanceFade
      * ageFade
      * strength;
    gl_FragColor = vec4(displacement, 0.0, 1.0);
  }
`;

const depthVertexShader = /* glsl */ `
  ${vertexHeader}
  attribute vec2 aCenter;
  attribute vec2 aDirection;
  attribute vec2 aSize;
  attribute vec2 aDepth;
  varying vec2 vLocal;
  varying vec2 vForward;
  varying vec2 vDepth;

  void main() {
    vec2 normal = vec2(-aDirection.y, aDirection.x);
    vec2 point =
      aCenter
      + aDirection * position.x * aSize.x
      + normal * position.y * aSize.y;
    vLocal = position.xy;
    vForward = aDirection;
    vDepth = aDepth;
    gl_Position = pondPosition(point);
  }
`;

const depthFragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uStrength;
  uniform float uWaveFrequency;
  uniform float uWaveSpeed;
  varying vec2 vLocal;
  varying vec2 vForward;
  varying vec2 vDepth;

  void main() {
    float radiusSquared = dot(vLocal, vLocal);
    float mask =
      exp(-radiusSquared * 2.35)
      * (1.0 - smoothstep(0.82, 1.06, radiusSquared));
    vec2 normal = vec2(-vForward.y, vForward.x);
    float phase = vDepth.y + uTime * uWaveSpeed;
    float waveA = sin(
      (vLocal.x * 0.82 + vLocal.y * 0.31) * uWaveFrequency + phase
    );
    float waveB = cos(
      (vLocal.y * 0.91 - vLocal.x * 0.24) * (uWaveFrequency * 0.73)
      - phase * 1.17
    );
    vec2 displacement =
      (normal * waveA + vForward * waveB * 0.62)
      * mask
      * vDepth.x
      * uStrength;
    gl_FragColor = vec4(displacement, 0.0, 1.0);
  }
`;

function quadGeometry(forwardOnly: boolean): THREE.InstancedBufferGeometry {
  const minimumX = forwardOnly ? 0 : -1;
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        minimumX, -1, 0,
        1, -1, 0,
        1, 1, 0,
        minimumX, -1, 0,
        1, 1, 0,
        minimumX, 1, 0,
      ],
      3,
    ),
  );
  geometry.instanceCount = 0;
  return geometry;
}

function instanceAttribute(
  geometry: THREE.InstancedBufferGeometry,
  name: string,
  array: Float32Array,
  itemSize: number,
): THREE.InstancedBufferAttribute {
  const attribute = new THREE.InstancedBufferAttribute(array, itemSize);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute(name, attribute);
  return attribute;
}

function dynamicMaterial(
  vertexShader: string,
  fragmentShader: string,
  uniforms: Record<string, THREE.IUniform>,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

export class SurfaceDisturbancePass {
  public readonly texture: THREE.Texture;

  private readonly target = new THREE.WebGLRenderTarget(
    DISTURBANCE_WIDTH,
    DISTURBANCE_HEIGHT,
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
    },
  );
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.Camera();
  private readonly wakeGeometry = quadGeometry(true);
  private readonly depthGeometry = quadGeometry(false);
  private readonly wakeCenters = new Float32Array(MAX_WAKES * 2);
  private readonly wakeDirections = new Float32Array(MAX_WAKES * 2);
  private readonly wakeValues = new Float32Array(MAX_WAKES * 4);
  private readonly depthCenters = new Float32Array(MAX_FISH * 2);
  private readonly depthDirections = new Float32Array(MAX_FISH * 2);
  private readonly depthSizes = new Float32Array(MAX_FISH * 2);
  private readonly depthValues = new Float32Array(MAX_FISH * 2);
  private readonly wakeAttributes: THREE.InstancedBufferAttribute[];
  private readonly depthAttributes: THREE.InstancedBufferAttribute[];
  private readonly wakeMaterial: THREE.ShaderMaterial;
  private readonly depthMaterial: THREE.ShaderMaterial;
  private readonly clearColor = new THREE.Color();

  public constructor() {
    this.texture = this.target.texture;
    this.texture.generateMipmaps = false;
    this.texture.name = "koi surface disturbances";

    this.wakeAttributes = [
      instanceAttribute(this.wakeGeometry, "aCenter", this.wakeCenters, 2),
      instanceAttribute(this.wakeGeometry, "aDirection", this.wakeDirections, 2),
      instanceAttribute(this.wakeGeometry, "aWake", this.wakeValues, 4),
    ];
    this.depthAttributes = [
      instanceAttribute(this.depthGeometry, "aCenter", this.depthCenters, 2),
      instanceAttribute(this.depthGeometry, "aDirection", this.depthDirections, 2),
      instanceAttribute(this.depthGeometry, "aSize", this.depthSizes, 2),
      instanceAttribute(this.depthGeometry, "aDepth", this.depthValues, 2),
    ];

    this.wakeMaterial = dynamicMaterial(wakeVertexShader, wakeFragmentShader, {
      uResolution: { value: new THREE.Vector2(CANVAS_WIDTH, CANVAS_HEIGHT) },
      uSpread: { value: 0 },
      uOscillation: { value: 0 },
    });
    this.depthMaterial = dynamicMaterial(depthVertexShader, depthFragmentShader, {
      uResolution: { value: new THREE.Vector2(CANVAS_WIDTH, CANVAS_HEIGHT) },
      uTime: { value: 0 },
      uStrength: { value: 0 },
      uWaveFrequency: { value: 0 },
      uWaveSpeed: { value: 0 },
    });
    const wakeMesh = new THREE.Mesh(this.wakeGeometry, this.wakeMaterial);
    const depthMesh = new THREE.Mesh(this.depthGeometry, this.depthMaterial);
    wakeMesh.frustumCulled = false;
    depthMesh.frustumCulled = false;
    this.scene.add(wakeMesh, depthMesh);
  }

  public render(renderer: THREE.WebGLRenderer, school: School, time: number): void {
    this.updateWakeInstances(school);
    this.updateDepthInstances(school);
    this.wakeMaterial.uniforms.uSpread.value = Math.tan(
      (FISH.tailWake.openingAngleDegrees * Math.PI) / 360,
    );
    this.wakeMaterial.uniforms.uOscillation.value = FISH.tailWake.oscillation;
    this.depthMaterial.uniforms.uTime.value = time;
    this.depthMaterial.uniforms.uStrength.value = FISH.depth.localDistortion.strength;
    this.depthMaterial.uniforms.uWaveFrequency.value =
      FISH.depth.localDistortion.waveFrequency;
    this.depthMaterial.uniforms.uWaveSpeed.value = FISH.depth.localDistortion.waveSpeed;

    renderer.getClearColor(this.clearColor);
    const clearAlpha = renderer.getClearAlpha();
    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    renderer.setClearColor(this.clearColor, clearAlpha);
  }

  public dispose(): void {
    this.target.dispose();
    this.wakeGeometry.dispose();
    this.depthGeometry.dispose();
    this.wakeMaterial.dispose();
    this.depthMaterial.dispose();
  }

  private updateWakeInstances(school: School): void {
    let count = 0;
    for (const wake of school.wakes.instances) {
      if (!wake.alive || count >= MAX_WAKES) continue;
      const vectorOffset = count * 2;
      const valueOffset = count * 4;
      this.wakeCenters[vectorOffset] = wake.position.x;
      this.wakeCenters[vectorOffset + 1] = wake.position.y;
      this.wakeDirections[vectorOffset] = wake.direction.x;
      this.wakeDirections[vectorOffset + 1] = wake.direction.y;
      this.wakeValues[valueOffset] = clamp(
        wake.age / Math.max(FISH.tailWake.lifetimeSeconds, 0.001),
        0,
        1,
      );
      this.wakeValues[valueOffset + 1] = wake.strength;
      this.wakeValues[valueOffset + 2] = wake.length;
      this.wakeValues[valueOffset + 3] = wake.width;
      count += 1;
    }
    this.wakeGeometry.instanceCount = count;
    for (const attribute of this.wakeAttributes) attribute.needsUpdate = true;
  }

  private updateDepthInstances(school: School): void {
    let count = 0;
    const depthRange = Math.max(FISH.depth.visualEnd - FISH.depth.visualStart, 0.001);
    for (let index = 0; index < school.count && count < MAX_FISH; index += 1) {
      const fish = school.fish[index];
      const visualDepth = clamp(
        (fish.depth - FISH.depth.visualStart) / depthRange,
        0,
        1,
      );
      const smoothDepth = visualDepth * visualDepth * (3 - 2 * visualDepth);
      if (smoothDepth <= 0.005) continue;
      const offset = count * 2;
      this.depthCenters[offset] = fish.position.x;
      this.depthCenters[offset + 1] = fish.position.y;
      this.depthDirections[offset] = Math.cos(fish.heading);
      this.depthDirections[offset + 1] = Math.sin(fish.heading);
      this.depthSizes[offset] =
        fish.bodyLength * FISH.depth.localDistortion.lengthScale;
      this.depthSizes[offset + 1] =
        fish.bodyWidth * FISH.depth.localDistortion.widthScale;
      this.depthValues[offset] = smoothDepth;
      this.depthValues[offset + 1] = fish.phaseOffset;
      count += 1;
    }
    this.depthGeometry.instanceCount = count;
    for (const attribute of this.depthAttributes) attribute.needsUpdate = true;
  }
}
