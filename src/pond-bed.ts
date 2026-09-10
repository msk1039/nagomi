import * as THREE from "three";
import { CANVAS_HEIGHT, CANVAS_WIDTH, POND_BED, type Rgb } from "./config";

const glslFloat = (value: number): string =>
  Number.isInteger(value) ? `${value}.0` : `${value}`;
const glslVec3 = (color: Rgb): string =>
  `vec3(${color.map(glslFloat).join(", ")})`;

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
  varying vec2 vUv;

  float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
  }

  void main() {
    vec3 pondGreen = ${glslVec3(POND_BED.deepColor)};
    vec3 shallowGreen = ${glslVec3(POND_BED.shallowColor)};
    float verticalTone =
      smoothstep(0.0, 1.0, vUv.y) * ${glslFloat(POND_BED.verticalTone)};
    vec3 color = mix(pondGreen, shallowGreen, verticalTone);

    vec2 grainCell = floor(
      vUv * uResolution * ${glslFloat(POND_BED.grainScale)}
    );
    float grain = hash21(grainCell);
    float darkSpeck = smoothstep(0.975, 0.998, grain);
    color -= darkSpeck * ${glslVec3(POND_BED.speckColor)};

    float edgeDepth = smoothstep(0.48, 0.82, length((vUv - 0.5) * vec2(1.0, 1.25)));
    color *= 1.0 - edgeDepth * ${glslFloat(POND_BED.edgeDarkening)};

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
  }

}
