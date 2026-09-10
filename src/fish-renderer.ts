import * as THREE from "three";
import { CANVAS_HEIGHT, CANVAS_WIDTH, SPINE_NODES } from "./config";
import { Koi, SwimState } from "./koi";
import {
  add,
  fromAngle,
  mul,
  normalize,
  perpendicular,
  sub,
  type Vec2,
} from "./math";
import { School } from "./school";

const TRIANGLE_FLOAT_CAPACITY = 72_000;
const LINE_FLOAT_CAPACITY = 18_000;

class GeometryBatch {
  private readonly values: Float32Array;
  private readonly attribute: THREE.BufferAttribute;
  private cursor = 0;

  public constructor(
    private readonly geometry: THREE.BufferGeometry,
    capacity: number,
  ) {
    this.values = new Float32Array(capacity);
    this.attribute = new THREE.BufferAttribute(this.values, 3);
    this.attribute.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute("position", this.attribute);
  }

  public reset(): void {
    this.cursor = 0;
  }

  public point(point: Vec2): void {
    if (this.cursor + 3 > this.values.length) return;
    this.values[this.cursor++] = point.x;
    this.values[this.cursor++] = point.y;
    this.values[this.cursor++] = 0;
  }

  public triangle(a: Vec2, b: Vec2, c: Vec2): void {
    this.point(a);
    this.point(b);
    this.point(c);
  }

  public line(a: Vec2, b: Vec2): void {
    this.point(a);
    this.point(b);
  }

  public circle(center: Vec2, radius: number, segments = 12): void {
    for (let index = 0; index < segments; index += 1) {
      const angleA = (index / segments) * Math.PI * 2;
      const angleB = ((index + 1) / segments) * Math.PI * 2;
      this.triangle(
        center,
        add(center, mul(fromAngle(angleA), radius)),
        add(center, mul(fromAngle(angleB), radius)),
      );
    }
  }

  public circleLine(center: Vec2, radius: number, segments = 32): void {
    for (let index = 0; index < segments; index += 1) {
      const angleA = (index / segments) * Math.PI * 2;
      const angleB = ((index + 1) / segments) * Math.PI * 2;
      this.line(
        add(center, mul(fromAngle(angleA), radius)),
        add(center, mul(fromAngle(angleB), radius)),
      );
    }
  }

  public commit(): void {
    this.geometry.setDrawRange(0, this.cursor / 3);
    this.attribute.clearUpdateRanges();
    this.attribute.addUpdateRange(0, this.cursor);
    this.attribute.needsUpdate = true;
  }
}

export class FishRenderer {
  public readonly canvas: HTMLCanvasElement;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(
    0,
    CANVAS_WIDTH,
    0,
    CANVAS_HEIGHT,
    -10,
    10,
  );
  private readonly whiteTriangles: GeometryBatch;
  private readonly blackTriangles: GeometryBatch;
  private readonly whiteLines: GeometryBatch;

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

    const whiteGeometry = new THREE.BufferGeometry();
    const blackGeometry = new THREE.BufferGeometry();
    const lineGeometry = new THREE.BufferGeometry();
    this.whiteTriangles = new GeometryBatch(whiteGeometry, TRIANGLE_FLOAT_CAPACITY);
    this.blackTriangles = new GeometryBatch(blackGeometry, TRIANGLE_FLOAT_CAPACITY);
    this.whiteLines = new GeometryBatch(lineGeometry, LINE_FLOAT_CAPACITY);

    const whiteMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const blackMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    const whiteMesh = new THREE.Mesh(whiteGeometry, whiteMaterial);
    const blackMesh = new THREE.Mesh(blackGeometry, blackMaterial);
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    whiteMesh.frustumCulled = false;
    blackMesh.frustumCulled = false;
    lines.frustumCulled = false;
    whiteMesh.renderOrder = 1;
    blackMesh.renderOrder = 2;
    lines.renderOrder = 3;
    this.scene.add(whiteMesh, blackMesh, lines);
  }

  public draw(school: School, time: number, showDebug: boolean): void {
    this.whiteTriangles.reset();
    this.blackTriangles.reset();
    this.whiteLines.reset();

    for (let index = 0; index < school.count; index += 1) {
      const fish = school.fish[index];
      this.buildRenderSpine(fish);
      this.drawKoi(fish);
      if (showDebug) this.drawDebug(fish);
    }

    if ((Math.floor(time * 12) & 1) === 0) {
      for (const ripple of school.ripples) {
        if (!ripple.alive) continue;
        const progress = ripple.age / 1.25;
        this.whiteLines.circleLine(ripple.center, Math.floor(4 + progress * 19));
      }
    }

    this.whiteTriangles.commit();
    this.blackTriangles.commit();
    this.whiteLines.commit();
    this.renderer.render(this.scene, this.camera);
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

  private drawKoi(fish: Koi): void {
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
    this.whiteTriangles.triangle(left[pectoralFront], leftPectoral, left[pectoralBack]);
    this.whiteTriangles.triangle(right[pectoralFront], right[pectoralBack], rightPectoral);

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
    this.whiteTriangles.triangle(left[pelvicFront], leftPelvic, left[pelvicBack]);
    this.whiteTriangles.triangle(right[pelvicFront], right[pelvicBack], rightPelvic);

    for (let node = SPINE_NODES - 2; node >= 0; node -= 1) {
      this.whiteTriangles.triangle(left[node], right[node], right[node + 1]);
      this.whiteTriangles.triangle(left[node], right[node + 1], left[node + 1]);
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
    this.whiteTriangles.triangle(left[0], noseLeft, noseRight);
    this.whiteTriangles.triangle(left[0], noseRight, right[0]);
    this.whiteTriangles.circle(noseCenter, Math.max(1, noseHalfWidth * 0.72));

    const tailNode = SPINE_NODES - 1;
    const tailForward = normalize(
      sub(fish.renderSpine[tailNode - 1], fish.renderSpine[tailNode]),
      fromAngle(fish.heading),
    );
    const tailNormal = perpendicular(tailForward);
    const fan = fish.bodyWidth * (1.22 + 0.2 * Math.sin(fish.swimPhase - 0.8));
    const finCenter = add(
      fish.renderSpine[tailNode],
      mul(tailForward, -fish.bodyWidth * 1.05),
    );
    const tailTip = add(
      fish.renderSpine[tailNode],
      mul(tailForward, -fish.bodyWidth * 2.05),
    );
    const upperFin = add(finCenter, mul(tailNormal, fan));
    const lowerFin = add(finCenter, mul(tailNormal, -fan));
    this.whiteTriangles.triangle(fish.renderSpine[tailNode], upperFin, tailTip);
    this.whiteTriangles.triangle(fish.renderSpine[tailNode], tailTip, lowerFin);

    const innerLeft: Vec2[] = [];
    const innerRight: Vec2[] = [];
    for (let node = 0; node < SPINE_NODES; node += 1) {
      const previous = Math.max(0, node - 1);
      const next = Math.min(SPINE_NODES - 1, node + 1);
      const tangent = normalize(
        sub(fish.renderSpine[previous], fish.renderSpine[next]),
        fromAngle(fish.heading),
      );
      const normal = perpendicular(tangent);
      const insetWidth = Math.max(0, this.widthAt(fish, node) - 1.65);
      innerLeft[node] = add(fish.renderSpine[node], mul(normal, insetWidth));
      innerRight[node] = add(fish.renderSpine[node], mul(normal, -insetWidth));
    }
    for (let node = SPINE_NODES - 2; node >= 0; node -= 1) {
      this.blackTriangles.triangle(innerLeft[node], innerRight[node], innerRight[node + 1]);
      this.blackTriangles.triangle(innerLeft[node], innerRight[node + 1], innerLeft[node + 1]);
    }

    const innerNoseWidth = Math.max(0, noseHalfWidth - 1.65);
    const innerNoseLeft = add(noseCenter, mul(headNormal, innerNoseWidth));
    const innerNoseRight = add(noseCenter, mul(headNormal, -innerNoseWidth));
    this.blackTriangles.triangle(innerLeft[0], innerNoseLeft, innerNoseRight);
    this.blackTriangles.triangle(innerLeft[0], innerNoseRight, innerRight[0]);
    if (innerNoseWidth > 0.6) {
      this.blackTriangles.circle(noseCenter, innerNoseWidth * 0.67);
    }

    this.whiteLines.line(left[pectoralFront], leftPectoral);
    this.whiteLines.line(leftPectoral, left[pectoralBack]);
    this.whiteLines.line(right[pectoralFront], rightPectoral);
    this.whiteLines.line(rightPectoral, right[pectoralBack]);
    this.whiteLines.line(left[pelvicFront], leftPelvic);
    this.whiteLines.line(leftPelvic, left[pelvicBack]);
    this.whiteLines.line(right[pelvicFront], rightPelvic);
    this.whiteLines.line(rightPelvic, right[pelvicBack]);
  }

  private drawDebug(fish: Koi): void {
    for (let node = 0; node < SPINE_NODES - 1; node += 1) {
      this.whiteLines.line(fish.renderSpine[node], fish.renderSpine[node + 1]);
    }
  }
}
