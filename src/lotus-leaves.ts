import * as THREE from "three";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  LOTUS,
  LOTUS_FLOWERS,
  LOTUS_LEAVES,
} from "./config";

interface Point {
  x: number;
  y: number;
}

interface LeafPalette {
  base: THREE.Color;
  light: THREE.Color;
  shade: THREE.Color;
  vein: THREE.Color;
  center: THREE.Color;
}

interface FlowerPalette {
  outerPetal: THREE.Color;
  innerPetal: THREE.Color;
  petalLight: THREE.Color;
  center: THREE.Color;
  centerDark: THREE.Color;
}

const TAU = Math.PI * 2;
const DEFAULT_COLOR = new THREE.Color(0xffffff);

const PALETTES: readonly LeafPalette[] = LOTUS.leafPalettes.map((palette) => ({
  base: new THREE.Color(palette.base),
  light: new THREE.Color(palette.light),
  shade: new THREE.Color(palette.shade),
  vein: new THREE.Color(palette.vein),
  center: new THREE.Color(palette.center),
}));

const FLOWER_PALETTES: readonly FlowerPalette[] = LOTUS.flowerPalettes.map(
  (palette) => ({
    outerPetal: new THREE.Color(palette.outerPetal),
    innerPetal: new THREE.Color(palette.innerPetal),
    petalLight: new THREE.Color(palette.petalLight),
    center: new THREE.Color(palette.center),
    centerDark: new THREE.Color(palette.centerDark),
  }),
);

class LotusGeometryBatch {
  private readonly positions: Float32Array;
  private readonly positionAttribute: THREE.BufferAttribute;
  private readonly colors?: Float32Array;
  private readonly colorAttribute?: THREE.BufferAttribute;
  private cursor = 0;

  public constructor(
    geometry: THREE.BufferGeometry,
    capacity: number,
    includeColors: boolean,
  ) {
    this.positions = new Float32Array(capacity);
    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("position", this.positionAttribute);
    geometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.5, 0),
      Math.hypot(CANVAS_WIDTH, CANVAS_HEIGHT),
    );

    if (includeColors) {
      this.colors = new Float32Array(capacity);
      this.colorAttribute = new THREE.BufferAttribute(this.colors, 3);
      this.colorAttribute.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute("color", this.colorAttribute);
    }
  }

  public reset(): void {
    this.cursor = 0;
  }

  public point(point: Point, color: THREE.Color = DEFAULT_COLOR): void {
    if (this.cursor + 3 > this.positions.length) return;
    this.positions[this.cursor] = point.x;
    this.positions[this.cursor + 1] = point.y;
    this.positions[this.cursor + 2] = 0;
    if (this.colors) {
      this.colors[this.cursor] = color.r;
      this.colors[this.cursor + 1] = color.g;
      this.colors[this.cursor + 2] = color.b;
    }
    this.cursor += 3;
  }

  public triangle(
    a: Point,
    b: Point,
    c: Point,
    color: THREE.Color = DEFAULT_COLOR,
  ): void {
    this.point(a, color);
    this.point(b, color);
    this.point(c, color);
  }

  public line(a: Point, b: Point, color: THREE.Color): void {
    this.point(a, color);
    this.point(b, color);
  }

  public circle(center: Point, radius: number, color: THREE.Color): void {
    for (let index = 0; index < 8; index += 1) {
      const angleA = (index / 8) * TAU;
      const angleB = ((index + 1) / 8) * TAU;
      this.triangle(
        center,
        {
          x: center.x + Math.cos(angleA) * radius,
          y: center.y + Math.sin(angleA) * radius,
        },
        {
          x: center.x + Math.cos(angleB) * radius,
          y: center.y + Math.sin(angleB) * radius,
        },
        color,
      );
    }
  }

  public commit(geometry: THREE.BufferGeometry): void {
    geometry.setDrawRange(0, this.cursor / 3);
    this.positionAttribute.clearUpdateRanges();
    this.positionAttribute.addUpdateRange(0, this.cursor);
    this.positionAttribute.needsUpdate = true;
    if (this.colorAttribute) {
      this.colorAttribute.clearUpdateRanges();
      this.colorAttribute.addUpdateRange(0, this.cursor);
      this.colorAttribute.needsUpdate = true;
    }
  }
}

export class LotusLeavesPass {
  public readonly shadowGroup = new THREE.Group();
  public readonly group = new THREE.Group();

  private readonly shadowGeometry = new THREE.BufferGeometry();
  private readonly leafGeometry = new THREE.BufferGeometry();
  private readonly veinGeometry = new THREE.BufferGeometry();
  private readonly flowerGeometry = new THREE.BufferGeometry();
  private readonly shadowMaterial = new THREE.MeshBasicMaterial({
    color: LOTUS.shadow.color,
    opacity: LOTUS.shadow.opacity,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  private readonly shadowBatch = new LotusGeometryBatch(
    this.shadowGeometry,
    20_000,
    false,
  );
  private readonly leafBatch = new LotusGeometryBatch(
    this.leafGeometry,
    20_000,
    true,
  );
  private readonly veinBatch = new LotusGeometryBatch(
    this.veinGeometry,
    8_000,
    true,
  );
  private readonly flowerBatch = new LotusGeometryBatch(
    this.flowerGeometry,
    10_000,
    true,
  );

  public constructor() {
    this.shadowGeometry.name = "lotus shadows";
    this.leafGeometry.name = "lotus leaves";
    this.veinGeometry.name = "lotus veins";
    this.flowerGeometry.name = "lotus flowers";

    const leafMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const veinMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const flowerMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    const shadowMesh = new THREE.Mesh(this.shadowGeometry, this.shadowMaterial);
    const leafMesh = new THREE.Mesh(this.leafGeometry, leafMaterial);
    const veins = new THREE.LineSegments(this.veinGeometry, veinMaterial);
    const flowers = new THREE.Mesh(this.flowerGeometry, flowerMaterial);
    shadowMesh.frustumCulled = false;
    leafMesh.frustumCulled = false;
    veins.frustumCulled = false;
    flowers.frustumCulled = false;
    leafMesh.renderOrder = 1;
    veins.renderOrder = 2;
    flowers.renderOrder = 3;
    this.shadowGroup.add(shadowMesh);
    this.group.add(leafMesh, veins, flowers);
    this.refreshConfig();
  }

  public refreshConfig(): void {
    this.shadowMaterial.color.setHex(LOTUS.shadow.color);
    this.shadowMaterial.opacity = LOTUS.shadow.opacity;
    for (const [index, palette] of LOTUS.leafPalettes.entries()) {
      const target = PALETTES[index];
      if (!target) continue;
      target.base.setHex(palette.base);
      target.light.setHex(palette.light);
      target.shade.setHex(palette.shade);
      target.vein.setHex(palette.vein);
      target.center.setHex(palette.center);
    }
    for (const [index, palette] of LOTUS.flowerPalettes.entries()) {
      const target = FLOWER_PALETTES[index];
      if (!target) continue;
      target.outerPetal.setHex(palette.outerPetal);
      target.innerPetal.setHex(palette.innerPetal);
      target.petalLight.setHex(palette.petalLight);
      target.center.setHex(palette.center);
      target.centerDark.setHex(palette.centerDark);
    }
  }

  public update(time: number): void {
    this.shadowBatch.reset();
    this.leafBatch.reset();
    this.veinBatch.reset();
    this.flowerBatch.reset();

    const visibleLeaves = LOTUS_LEAVES.slice(0, LOTUS.visibleLeafCount);
    const visibleFlowers = LOTUS_FLOWERS.slice(0, LOTUS.visibleFlowerCount);
    for (const [leafIndex, leaf] of visibleLeaves.entries()) {
      const center = {
        x: leaf.x + Math.sin(time * 0.12 + leaf.phase) * LOTUS.driftX,
        y:
          leaf.y +
          Math.cos(time * 0.15 + leaf.phase * 1.3) * LOTUS.driftY,
      };
      const angle =
        leaf.angle +
        Math.sin(time * 0.085 + leaf.phase) * LOTUS.rotationAmount;
      const radius =
        leaf.radius *
        LOTUS.radiusScale *
        (1 + Math.sin(time * 0.11 + leaf.phase) * 0.012);
      const palette = PALETTES[
        ((leaf.palette % PALETTES.length) + PALETTES.length) % PALETTES.length
      ];

      this.drawLeaf(
        this.shadowBatch,
        {
          x: center.x + LOTUS.shadow.offset.x,
          y: center.y + LOTUS.shadow.offset.y,
        },
        radius * 1.02,
        angle,
        leaf.phase,
      );
      this.drawLeaf(this.leafBatch, center, radius, angle, leaf.phase, palette);
      this.drawVeins(center, radius, angle, leaf.phase, palette);

      for (const flower of visibleFlowers) {
        if (flower.leafIndex !== leafIndex) continue;
        this.drawFlower(
          {
            x: center.x + flower.offsetX,
            y: center.y + flower.offsetY,
          },
          flower.radius * LOTUS.flowerRadiusScale,
          flower.rotation + Math.sin(time * 0.12 + leaf.phase) * 0.04,
          FLOWER_PALETTES[
            ((flower.palette % FLOWER_PALETTES.length) +
              FLOWER_PALETTES.length) %
              FLOWER_PALETTES.length
          ],
        );
      }
    }

    this.shadowBatch.commit(this.shadowGeometry);
    this.leafBatch.commit(this.leafGeometry);
    this.veinBatch.commit(this.veinGeometry);
    this.flowerBatch.commit(this.flowerGeometry);
  }

  private edgePoint(
    center: Point,
    radius: number,
    angle: number,
    phase: number,
  ): Point {
    const wobble =
      1 + Math.sin(angle * 3 + phase) * 0.035 + Math.cos(angle * 5 - phase) * 0.025;
    return {
      x: center.x + Math.cos(angle) * radius * wobble,
      y: center.y + Math.sin(angle) * radius * LOTUS.verticalScale * wobble,
    };
  }

  private drawLeaf(
    batch: LotusGeometryBatch,
    center: Point,
    radius: number,
    angle: number,
    phase: number,
    palette?: LeafPalette,
  ): void {
    const start = angle + LOTUS.notchHalfAngle;
    const span = TAU - LOTUS.notchHalfAngle * 2;

    for (let index = 0; index < LOTUS.leafSegments; index += 1) {
      const angleA = start + (index / LOTUS.leafSegments) * span;
      const angleB = start + ((index + 1) / LOTUS.leafSegments) * span;
      let color = DEFAULT_COLOR;
      if (palette) {
        const light = Math.cos((angleA + angleB) * 0.5 + 2.2);
        color = light > 0.48 ? palette.light : light < -0.58 ? palette.shade : palette.base;
      }
      batch.triangle(
        center,
        this.edgePoint(center, radius, angleA, phase),
        this.edgePoint(center, radius, angleB, phase),
        color,
      );
    }
  }

  private drawVeins(
    center: Point,
    radius: number,
    angle: number,
    phase: number,
    palette: LeafPalette,
  ): void {
    const start = angle + LOTUS.notchHalfAngle;
    const span = TAU - LOTUS.notchHalfAngle * 2;
    for (let index = 1; index <= LOTUS.veinCount; index += 1) {
      const veinAngle = start + (index / (LOTUS.veinCount + 1)) * span;
      this.veinBatch.line(
        center,
        this.edgePoint(center, radius * 0.78, veinAngle, phase),
        palette.vein,
      );
    }
    this.leafBatch.circle(center, Math.max(1, radius * 0.075), palette.center);
  }

  private drawFlower(
    center: Point,
    radius: number,
    rotation: number,
    palette: FlowerPalette,
  ): void {
    const drawPetalRing = (
      count: number,
      length: number,
      width: number,
      angleOffset: number,
      primary: THREE.Color,
      alternate: THREE.Color,
    ): void => {
      for (let index = 0; index < count; index += 1) {
        const angle = rotation + angleOffset + (index / count) * TAU;
        const direction = { x: Math.cos(angle), y: Math.sin(angle) };
        const side = { x: -direction.y, y: direction.x };
        const base = {
          x: center.x + direction.x * radius * 0.12,
          y: center.y + direction.y * radius * 0.12,
        };
        const tip = {
          x: center.x + direction.x * radius * length,
          y: center.y + direction.y * radius * length,
        };
        const halfWidth = radius * width;
        const color = index % 3 === 0 ? alternate : primary;
        this.flowerBatch.triangle(
          {
            x: base.x + side.x * halfWidth,
            y: base.y + side.y * halfWidth,
          },
          tip,
          {
            x: base.x - side.x * halfWidth,
            y: base.y - side.y * halfWidth,
          },
          color,
        );
      }
    };

    drawPetalRing(8, 1, 0.22, 0, palette.outerPetal, palette.petalLight);
    drawPetalRing(
      6,
      0.66,
      0.19,
      Math.PI / 6,
      palette.innerPetal,
      palette.petalLight,
    );
    this.flowerBatch.circle(center, radius * 0.28, palette.centerDark);
    this.flowerBatch.circle(center, radius * 0.18, palette.center);
  }
}
