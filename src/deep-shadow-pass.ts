import * as THREE from "three";
import { CANVAS_HEIGHT, CANVAS_WIDTH, FISH } from "./config";

const TARGET_SCALE = 0.5;

const fullScreenVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const blurFragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D uTexture;
  uniform vec2 uDirection;
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(uTexture, vUv) * 0.227027;
    color += texture2D(uTexture, vUv + uDirection * 1.384615) * 0.316216;
    color += texture2D(uTexture, vUv - uDirection * 1.384615) * 0.316216;
    color += texture2D(uTexture, vUv + uDirection * 3.230769) * 0.070270;
    color += texture2D(uTexture, vUv - uDirection * 3.230769) * 0.070270;
    gl_FragColor = color;
  }
`;

function renderTarget(): THREE.WebGLRenderTarget {
  const target = new THREE.WebGLRenderTarget(
    Math.ceil(CANVAS_WIDTH * TARGET_SCALE),
    Math.ceil(CANVAS_HEIGHT * TARGET_SCALE),
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    },
  );
  target.texture.generateMipmaps = false;
  return target;
}

export class DeepShadowPass {
  private readonly sourceTarget = renderTarget();
  private readonly blurTarget = renderTarget();
  private readonly sourceScene = new THREE.Scene();
  private readonly blurScene = new THREE.Scene();
  private readonly compositeScene = new THREE.Scene();
  private readonly screenCamera = new THREE.Camera();
  private readonly blurMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: this.sourceTarget.texture },
      uDirection: { value: new THREE.Vector2() },
    },
    vertexShader: fullScreenVertexShader,
    fragmentShader: blurFragmentShader,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  private readonly compositeMaterial = new THREE.MeshBasicMaterial({
    map: this.sourceTarget.texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  private readonly quadGeometry = new THREE.PlaneGeometry(2, 2);
  private readonly clearColor = new THREE.Color();

  public constructor(shadowMesh: THREE.Object3D) {
    this.sourceScene.add(shadowMesh);
    const blurQuad = new THREE.Mesh(this.quadGeometry, this.blurMaterial);
    const compositeQuad = new THREE.Mesh(this.quadGeometry, this.compositeMaterial);
    blurQuad.frustumCulled = false;
    compositeQuad.frustumCulled = false;
    this.blurScene.add(blurQuad);
    this.compositeScene.add(compositeQuad);
  }

  public render(
    renderer: THREE.WebGLRenderer,
    pondCamera: THREE.Camera,
    destination: THREE.WebGLRenderTarget,
  ): void {
    renderer.getClearColor(this.clearColor);
    const clearAlpha = renderer.getClearAlpha();
    const previousAutoClear = renderer.autoClear;
    renderer.setClearColor(0x000000, 0);

    renderer.setRenderTarget(this.sourceTarget);
    renderer.clear();
    renderer.render(this.sourceScene, pondCamera);

    const blurPixels = Math.max(0, FISH.depth.shadow.deepBlurPixels) * TARGET_SCALE;
    this.blurMaterial.uniforms.uTexture.value = this.sourceTarget.texture;
    this.blurMaterial.uniforms.uDirection.value.set(
      blurPixels / this.sourceTarget.width,
      0,
    );
    renderer.setRenderTarget(this.blurTarget);
    renderer.clear();
    renderer.render(this.blurScene, this.screenCamera);

    this.blurMaterial.uniforms.uTexture.value = this.blurTarget.texture;
    this.blurMaterial.uniforms.uDirection.value.set(
      0,
      blurPixels / this.sourceTarget.height,
    );
    renderer.setRenderTarget(this.sourceTarget);
    renderer.clear();
    renderer.render(this.blurScene, this.screenCamera);

    this.compositeMaterial.map = this.sourceTarget.texture;
    renderer.setRenderTarget(destination);
    renderer.autoClear = false;
    renderer.render(this.compositeScene, this.screenCamera);
    renderer.autoClear = previousAutoClear;
    renderer.setClearColor(this.clearColor, clearAlpha);
  }

  public dispose(): void {
    this.sourceTarget.dispose();
    this.blurTarget.dispose();
    this.blurMaterial.dispose();
    this.compositeMaterial.dispose();
    this.quadGeometry.dispose();
  }
}
