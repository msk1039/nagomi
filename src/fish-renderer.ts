import * as THREE from "three";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FISH,
  MAX_FISH,
  SPINE_NODES,
} from "./config";
import {
  createFishAppearance,
  patchesFor,
  type FishAppearance,
} from "./fish-appearance";
import { Koi, SwimState } from "./koi";
import { LotusLeavesPass } from "./lotus-leaves";
import {
  add,
  fromAngle,
  lerp,
  mul,
  normalize,
  perpendicular,
  sub,
  type Vec2,
} from "./math";
import { PondBedPass } from "./pond-bed";
import { School } from "./school";
import { WaterSurfacePass } from "./water-surface";

const TRIANGLE_FLOAT_CAPACITY = 72_000;
const LINE_FLOAT_CAPACITY = 18_000;
const DEFAULT_COLOR = new THREE.Color(0xffffff);

class GeometryBatch {
  private readonly values: Float32Array;
  private readonly attribute: THREE.BufferAttribute;
  private readonly colorValues?: Float32Array;
  private readonly colorAttribute?: THREE.BufferAttribute;
  private cursor = 0;

  public constructor(
    private readonly geometry: THREE.BufferGeometry,
    capacity: number,
    includeColors = false,
  ) {
    this.values = new Float32Array(capacity);
    this.attribute = new THREE.BufferAttribute(this.values, 3);
    this.attribute.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute("position", this.attribute);
    this.geometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.5, 0),
      Math.hypot(CANVAS_WIDTH, CANVAS_HEIGHT),
    );
    if (includeColors) {
      this.colorValues = new Float32Array(capacity);
      this.colorAttribute = new THREE.BufferAttribute(this.colorValues, 3);
      this.colorAttribute.setUsage(THREE.DynamicDrawUsage);
      this.geometry.setAttribute("color", this.colorAttribute);
    }
  }

  public reset(): void {
    this.cursor = 0;
  }

  public point(point: Vec2, color: THREE.Color = DEFAULT_COLOR): void {
    if (this.cursor + 3 > this.values.length) return;
    this.values[this.cursor] = point.x;
    this.values[this.cursor + 1] = point.y;
    this.values[this.cursor + 2] = 0;
    if (this.colorValues) {
      this.colorValues[this.cursor] = color.r;
      this.colorValues[this.cursor + 1] = color.g;
      this.colorValues[this.cursor + 2] = color.b;
    }
    this.cursor += 3;
  }

  public triangle(a: Vec2, b: Vec2, c: Vec2, color: THREE.Color = DEFAULT_COLOR): void {
    this.point(a, color);
    this.point(b, color);
    this.point(c, color);
  }

  public line(a: Vec2, b: Vec2, color: THREE.Color = DEFAULT_COLOR): void {
    this.point(a, color);
    this.point(b, color);
  }

  public circle(
    center: Vec2,
    radius: number,
    color: THREE.Color = DEFAULT_COLOR,
    segments = 12,
  ): void {
    for (let index = 0; index < segments; index += 1) {
      const angleA = (index / segments) * Math.PI * 2;
      const angleB = ((index + 1) / segments) * Math.PI * 2;
      this.triangle(
        center,
        add(center, mul(fromAngle(angleA), radius)),
        add(center, mul(fromAngle(angleB), radius)),
        color,
      );
    }
  }

  public ellipse(
    center: Vec2,
    forward: Vec2,
    normal: Vec2,
    forwardRadius: number,
    sideRadius: number,
    color: THREE.Color,
    phase: number,
    segments = 10,
  ): void {
    const pointAt = (angle: number): Vec2 => {
      const wobble =
        1 +
        Math.sin(angle * 3 + phase) * 0.08 +
        Math.cos(angle * 2 - phase * 0.7) * 0.045;
      return add(
        add(center, mul(forward, Math.cos(angle) * forwardRadius * wobble)),
        mul(normal, Math.sin(angle) * sideRadius * wobble),
      );
    };

    for (let index = 0; index < segments; index += 1) {
      const angleA = (index / segments) * Math.PI * 2;
      const angleB = ((index + 1) / segments) * Math.PI * 2;
      this.triangle(center, pointAt(angleA), pointAt(angleB), color);
    }
  }

  public commit(): void {
    this.geometry.setDrawRange(0, this.cursor / 3);
    this.attribute.clearUpdateRanges();
    this.attribute.addUpdateRange(0, this.cursor);
    this.attribute.needsUpdate = true;
    if (this.colorAttribute) {
      this.colorAttribute.clearUpdateRanges();
      this.colorAttribute.addUpdateRange(0, this.cursor);
      this.colorAttribute.needsUpdate = true;
    }
  }
}

export class FishRenderer {
  public readonly canvas: HTMLCanvasElement;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly bedScene = new THREE.Scene();
  private readonly shadowScene = new THREE.Scene();
  private readonly fishScene = new THREE.Scene();
  private readonly surfaceScene = new THREE.Scene();
  private readonly surfaceShadowScene = new THREE.Scene();
  private readonly surfaceObjectScene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(
    0,
    CANVAS_WIDTH,
    0,
    CANVAS_HEIGHT,
    -10,
    10,
  );
  private readonly surfaceCamera = new THREE.Camera();
  private readonly underwaterTarget: THREE.WebGLRenderTarget;
  private readonly pondBed: PondBedPass;
  private readonly waterSurface: WaterSurfacePass;
  private readonly lotusLeaves = new LotusLeavesPass();
  private readonly shadowTriangles: GeometryBatch;
  private readonly outerTriangles: GeometryBatch;
  private readonly bodyTriangles: GeometryBatch;
  private readonly outlineLines: GeometryBatch;
  private readonly appearances = Array.from(
    { length: MAX_FISH },
    (_, index) => createFishAppearance(index),
  );

  public constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT, false);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.underwaterTarget = new THREE.WebGLRenderTarget(CANVAS_WIDTH, CANVAS_HEIGHT, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });
    this.underwaterTarget.texture.generateMipmaps = false;

    this.pondBed = new PondBedPass();
    this.waterSurface = new WaterSurfacePass(this.underwaterTarget.texture);
    this.bedScene.add(this.pondBed.mesh);
    this.surfaceScene.add(this.waterSurface.mesh);
    this.surfaceShadowScene.add(this.lotusLeaves.shadowGroup);
    this.surfaceObjectScene.add(this.lotusLeaves.group);

    const shadowGeometry = new THREE.BufferGeometry();
    const whiteGeometry = new THREE.BufferGeometry();
    const blackGeometry = new THREE.BufferGeometry();
    const lineGeometry = new THREE.BufferGeometry();
    shadowGeometry.name = "fish shadows";
    whiteGeometry.name = "fish silhouettes";
    blackGeometry.name = "fish markings";
    lineGeometry.name = "fish debug lines";
    this.shadowTriangles = new GeometryBatch(shadowGeometry, TRIANGLE_FLOAT_CAPACITY);
    this.outerTriangles = new GeometryBatch(whiteGeometry, TRIANGLE_FLOAT_CAPACITY, true);
    this.bodyTriangles = new GeometryBatch(blackGeometry, TRIANGLE_FLOAT_CAPACITY, true);
    this.outlineLines = new GeometryBatch(lineGeometry, LINE_FLOAT_CAPACITY, true);

    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: FISH.shadow.color,
      opacity: FISH.shadow.opacity,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const outerMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const bodyMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
    const outerMesh = new THREE.Mesh(whiteGeometry, outerMaterial);
    const bodyMesh = new THREE.Mesh(blackGeometry, bodyMaterial);
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    shadowMesh.frustumCulled = false;
    outerMesh.frustumCulled = false;
    bodyMesh.frustumCulled = false;
    lines.frustumCulled = false;
    outerMesh.renderOrder = 1;
    bodyMesh.renderOrder = 2;
    lines.renderOrder = 3;
    this.shadowScene.add(shadowMesh);
    this.fishScene.add(outerMesh, bodyMesh, lines);
  }

  public draw(school: School, time: number, showDebug: boolean): void {
    this.shadowTriangles.reset();
    this.outerTriangles.reset();
    this.bodyTriangles.reset();
    this.outlineLines.reset();

    for (let index = 0; index < school.count; index += 1) {
      const fish = school.fish[index];
      this.buildRenderSpine(fish);
      this.drawKoi(fish, this.appearances[index]);
      if (showDebug) this.drawDebug(fish, this.appearances[index]);
    }

    this.shadowTriangles.commit();
    this.outerTriangles.commit();
    this.bodyTriangles.commit();
    this.outlineLines.commit();
    this.waterSurface.update(school, time);
    this.lotusLeaves.update(time);

    this.renderer.setRenderTarget(this.underwaterTarget);
    this.renderer.clear();
    this.renderer.autoClear = false;
    this.renderer.render(this.bedScene, this.camera);
    this.renderer.render(this.shadowScene, this.camera);
    this.renderer.render(this.fishScene, this.camera);
    this.renderer.autoClear = true;
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.surfaceScene, this.surfaceCamera);
    this.renderer.autoClear = false;
    this.renderer.render(this.surfaceShadowScene, this.camera);
    this.renderer.render(this.surfaceObjectScene, this.camera);
    this.renderer.autoClear = true;
  }

  private buildRenderSpine(fish: Koi): void {
    fish.renderSpine[0] = { ...fish.spine[0] };
    for (let node = 1; node < SPINE_NODES; node += 1) {
      const t = node / (SPINE_NODES - 1);
      const previous = Math.max(0, node - 1);
      const next = Math.min(SPINE_NODES - 1, node + 1);
      const tangent = normalize(
        sub(fish.spine[previous], fish.spine[next]),
        fromAngle(fish.heading),
      );
      const normal = perpendicular(tangent);
      const waveEnvelope = Math.pow(t, 1.72);
      const wave =
        Math.sin(fish.swimPhase - t * 6.1) *
        fish.bodyWidth *
        1.15 *
        waveEnvelope *
        (0.08 + fish.tailEffort * 0.92);
      fish.renderSpine[node] = add(fish.spine[node], mul(normal, wave));
    }
  }

  private widthAt(fish: Koi, node: number): number {
    const t = node / (SPINE_NODES - 1);
    const profile =
      t < 0.18
        ? 0.73 + (t / 0.18) * 0.27
        : Math.pow(Math.max(0, 1 - (t - 0.18) / 0.82), 0.72);
    return Math.max(0.7, fish.bodyWidth * profile);
  }

  private silhouetteTriangle(
    a: Vec2,
    b: Vec2,
    c: Vec2,
    color: THREE.Color,
  ): void {
    this.shadowTriangles.triangle(
      add(a, FISH.shadow.offset),
      add(b, FISH.shadow.offset),
      add(c, FISH.shadow.offset),
    );
    this.outerTriangles.triangle(a, b, c, color);
  }

  private silhouetteCircle(center: Vec2, radius: number, color: THREE.Color): void {
    this.shadowTriangles.circle(add(center, FISH.shadow.offset), radius);
    this.outerTriangles.circle(center, radius, color);
  }

  private drawKoi(fish: Koi, appearance: FishAppearance): void {
    const left: Vec2[] = [];
    const right: Vec2[] = [];

    for (let node = 0; node < SPINE_NODES; node += 1) {
      const previous = Math.max(0, node - 1);
      const next = Math.min(SPINE_NODES - 1, node + 1);
      const tangent = normalize(
        sub(fish.renderSpine[previous], fish.renderSpine[next]),
        fromAngle(fish.heading),
      );
      const normal = perpendicular(tangent);
      const halfWidth = this.widthAt(fish, node);
      left[node] = add(fish.renderSpine[node], mul(normal, halfWidth));
      right[node] = add(fish.renderSpine[node], mul(normal, -halfWidth));
    }

    const pectoralFront = 3;
    const pectoralCenter = 4;
    const pectoralBack = 6;
    const pectoralTangent = normalize(
      sub(fish.renderSpine[pectoralCenter - 1], fish.renderSpine[pectoralCenter + 1]),
      fromAngle(fish.heading),
    );
    const pectoralNormal = perpendicular(pectoralTangent);
    const paddleActivity =
      fish.state === SwimState.Hover ? 1 : fish.state === SwimState.Pivot ? 0.85 : 0.45;
    const finPulse =
      0.82 +
      paddleActivity * 0.25 * Math.sin(fish.swimPhase * 0.64 + fish.phaseOffset);
    const pectoralReach =
      fish.bodyWidth * (0.55 + paddleActivity * 0.25) * finPulse;
    const leftPectoral = add(
      add(left[pectoralCenter], mul(pectoralNormal, pectoralReach)),
      mul(pectoralTangent, -fish.bodyWidth * 0.22),
    );
    const rightPectoral = add(
      add(right[pectoralCenter], mul(pectoralNormal, -pectoralReach)),
      mul(pectoralTangent, -fish.bodyWidth * 0.22),
    );
    this.silhouetteTriangle(
      left[pectoralFront],
      leftPectoral,
      left[pectoralBack],
      appearance.fin,
    );
    this.silhouetteTriangle(
      right[pectoralFront],
      right[pectoralBack],
      rightPectoral,
      appearance.fin,
    );

    const pelvicFront = 7;
    const pelvicCenter = 8;
    const pelvicBack = 9;
    const pelvicTangent = normalize(
      sub(fish.renderSpine[pelvicCenter - 1], fish.renderSpine[pelvicCenter + 1]),
      fromAngle(fish.heading),
    );
    const pelvicNormal = perpendicular(pelvicTangent);
    const pelvicReach = fish.bodyWidth * (0.28 + 0.05 * finPulse);
    const leftPelvic = add(left[pelvicCenter], mul(pelvicNormal, pelvicReach));
    const rightPelvic = add(right[pelvicCenter], mul(pelvicNormal, -pelvicReach));
    this.silhouetteTriangle(
      left[pelvicFront],
      leftPelvic,
      left[pelvicBack],
      appearance.fin,
    );
    this.silhouetteTriangle(
      right[pelvicFront],
      right[pelvicBack],
      rightPelvic,
      appearance.fin,
    );

    for (let node = SPINE_NODES - 2; node >= 0; node -= 1) {
      this.silhouetteTriangle(
        left[node],
        right[node],
        right[node + 1],
        appearance.base,
      );
      this.silhouetteTriangle(
        left[node],
        right[node + 1],
        left[node + 1],
        appearance.base,
      );
    }

    const headForward = normalize(
      sub(fish.renderSpine[0], fish.renderSpine[1]),
      fromAngle(fish.heading),
    );
    const headNormal = perpendicular(headForward);
    const noseCenter = add(fish.renderSpine[0], mul(headForward, fish.bodyWidth * 0.43));
    const noseHalfWidth = this.widthAt(fish, 0) * 0.72;
    const noseLeft = add(noseCenter, mul(headNormal, noseHalfWidth));
    const noseRight = add(noseCenter, mul(headNormal, -noseHalfWidth));
    this.silhouetteTriangle(left[0], noseLeft, noseRight, appearance.base);
    this.silhouetteTriangle(left[0], noseRight, right[0], appearance.base);
    this.silhouetteCircle(
      noseCenter,
      Math.max(1, noseHalfWidth * 0.72),
      appearance.base,
    );

    const tailNode = SPINE_NODES - 1;
    const tailForward = normalize(
      sub(fish.renderSpine[tailNode - 1], fish.renderSpine[tailNode]),
      fromAngle(fish.heading),
    );
    const tailNormal = perpendicular(tailForward);
    const tailBackward = mul(tailForward, -1);
    const tailSpread =
      fish.bodyWidth * (0.58 + 0.08 * Math.sin(fish.swimPhase - 0.8));
    const upperFin = add(
      add(fish.renderSpine[tailNode], mul(tailBackward, fish.bodyWidth * 1.38)),
      mul(tailNormal, tailSpread),
    );
    const lowerFin = add(
      add(fish.renderSpine[tailNode], mul(tailBackward, fish.bodyWidth * 1.38)),
      mul(tailNormal, -tailSpread),
    );
    const tailNotch = add(
      fish.renderSpine[tailNode],
      mul(tailBackward, fish.bodyWidth * 0.86),
    );
    this.silhouetteTriangle(
      fish.renderSpine[tailNode],
      upperFin,
      tailNotch,
      appearance.fin,
    );
    this.silhouetteTriangle(
      fish.renderSpine[tailNode],
      tailNotch,
      lowerFin,
      appearance.fin,
    );

    // Pattern positions are authored in normalized body space. The shapes sample
    // the live spine, so they stay attached when the fish bends and turns.
    for (const [patchIndex, patch] of patchesFor(appearance).entries()) {
      const spinePosition = patch.position * (SPINE_NODES - 1);
      const node = Math.min(SPINE_NODES - 2, Math.floor(spinePosition));
      const amount = spinePosition - node;
      const center = lerp(fish.renderSpine[node], fish.renderSpine[node + 1], amount);
      const previous = Math.max(0, node - 1);
      const next = Math.min(SPINE_NODES - 1, node + 2);
      const forward = normalize(
        sub(fish.renderSpine[previous], fish.renderSpine[next]),
        fromAngle(fish.heading),
      );
      const normal = perpendicular(forward);
      const localWidth =
        this.widthAt(fish, node) * (1 - amount) +
        this.widthAt(fish, node + 1) * amount;
      const patchCenter = add(center, mul(normal, localWidth * patch.offset));
      const patchColor =
        patch.color === "accent" ? appearance.accent : appearance.marking;

      this.bodyTriangles.ellipse(
        patchCenter,
        forward,
        normal,
        fish.bodyLength * patch.length,
        localWidth * patch.width,
        patchColor,
        patchIndex * 1.73 + patch.position * 5.1,
      );
    }

    const eyeAnchor = add(
      fish.renderSpine[0],
      mul(headForward, fish.bodyWidth * 0.08),
    );
    const eyeOffset = this.widthAt(fish, 0) * 0.58;
    const eyeRadius = Math.max(0.58, fish.bodyWidth * 0.11);
    this.bodyTriangles.circle(
      add(eyeAnchor, mul(headNormal, eyeOffset)),
      eyeRadius,
      appearance.eye,
      6,
    );
    this.bodyTriangles.circle(
      add(eyeAnchor, mul(headNormal, -eyeOffset)),
      eyeRadius,
      appearance.eye,
      6,
    );
  }

  private drawDebug(fish: Koi, appearance: FishAppearance): void {
    for (let node = 0; node < SPINE_NODES - 1; node += 1) {
      this.outlineLines.line(
        fish.renderSpine[node],
        fish.renderSpine[node + 1],
        appearance.eye,
      );
    }
  }
}
