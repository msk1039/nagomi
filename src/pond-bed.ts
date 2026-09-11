import * as THREE from "three";
import { CANVAS_HEIGHT, CANVAS_WIDTH, POND_BED } from "./config";

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform vec2 uResolution;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform vec3 uSpeckColor;
  uniform float uVerticalTone;
  uniform float uGrainScale;
  uniform float uEdgeDarkening;
  varying vec2 vUv;

  float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
  }

  void main() {
    float verticalTone = smoothstep(0.0, 1.0, vUv.y) * uVerticalTone;
    vec3 color = mix(uDeepColor, uShallowColor, verticalTone);

    vec2 grainCell = floor(
      vUv * uResolution * uGrainScale
    );
    float grain = hash21(grainCell);
    float darkSpeck = smoothstep(0.975, 0.998, grain);
    color -= darkSpeck * uSpeckColor;

    float edgeDepth = smoothstep(0.48, 0.82, length((vUv - 0.5) * vec2(1.0, 1.25)));
    color *= 1.0 - edgeDepth * uEdgeDarkening;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export class PondBedPass {
  public readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  private readonly material: THREE.ShaderMaterial;

  public constructor() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uResolution: { value: new THREE.Vector2(CANVAS_WIDTH, CANVAS_HEIGHT) },
        uDeepColor: { value: new THREE.Color() },
        uShallowColor: { value: new THREE.Color() },
        uSpeckColor: { value: new THREE.Color() },
        uVerticalTone: { value: 0 },
        uGrainScale: { value: 0 },
        uEdgeDarkening: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(CANVAS_WIDTH, CANVAS_HEIGHT),
      this.material,
    );
    this.mesh.position.set(CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.5, -1);
    this.mesh.renderOrder = 0;
    this.mesh.frustumCulled = false;
    this.update();
  }

  public update(): void {
    this.material.uniforms.uDeepColor.value.setRGB(...POND_BED.deepColor);
    this.material.uniforms.uShallowColor.value.setRGB(...POND_BED.shallowColor);
    this.material.uniforms.uSpeckColor.value.setRGB(...POND_BED.speckColor);
    this.material.uniforms.uVerticalTone.value = POND_BED.verticalTone;
    this.material.uniforms.uGrainScale.value = POND_BED.grainScale;
    this.material.uniforms.uEdgeDarkening.value = POND_BED.edgeDarkening;
  }
}
