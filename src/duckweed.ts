import * as THREE from "three";
import { DUCKWEED, DUCKWEED_PATCHES } from "./config";
import {
  SurfaceGeometryBatch,
  type SurfacePoint,
} from "./surface-geometry";

interface DuckweedPalette {
  base: THREE.Color;
  light: THREE.Color;
  shade: THREE.Color;
  center: THREE.Color;
}

interface DuckweedLeaf {
  patchIndex: number;
  offsetX: number;
  offsetY: number;
  radius: number;
  angle: number;
  phase: number;
  tone: number;
  paired: boolean;
}

const PALETTES: readonly DuckweedPalette[] = DUCKWEED.palettes.map((palette) => ({
  base: new THREE.Color(palette.base),
  light: new THREE.Color(palette.light),
  shade: new THREE.Color(palette.shade),
  center: new THREE.Color(palette.center),
}));

function randomUnit(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export class DuckweedPass {
  public readonly shadowGroup = new THREE.Group();
  public readonly group = new THREE.Group();

  private readonly shadowGeometry = new THREE.BufferGeometry();
  private readonly leafGeometry = new THREE.BufferGeometry();
  private readonly detailGeometry = new THREE.BufferGeometry();
  private readonly shadowBatch = new SurfaceGeometryBatch(
    this.shadowGeometry,
    48_000,
  );
  private readonly leafBatch = new SurfaceGeometryBatch(
    this.leafGeometry,
    48_000,
    true,
  );
  private readonly detailBatch = new SurfaceGeometryBatch(
    this.detailGeometry,
    12_000,
    true,
  );
  private readonly leaves: readonly DuckweedLeaf[];

  public constructor() {
    this.leaves = this.createLeaves();
    this.shadowGeometry.name = "duckweed shadows";
    this.leafGeometry.name = "duckweed leaves";
    this.detailGeometry.name = "duckweed highlights";

    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: DUCKWEED.shadow.color,
      opacity: DUCKWEED.shadow.opacity,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const leafMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    const shadowMesh = new THREE.Mesh(this.shadowGeometry, shadowMaterial);
    const leafMesh = new THREE.Mesh(this.leafGeometry, leafMaterial);
    const detailMesh = new THREE.Mesh(this.detailGeometry, leafMaterial);
    shadowMesh.frustumCulled = false;
    leafMesh.frustumCulled = false;
    detailMesh.frustumCulled = false;
    shadowMesh.renderOrder = 0;
    leafMesh.renderOrder = 0;
    detailMesh.renderOrder = 1;
    this.shadowGroup.add(shadowMesh);
    this.group.add(leafMesh, detailMesh);
  }

  public update(time: number): void {
    this.shadowBatch.reset();
    this.leafBatch.reset();
    this.detailBatch.reset();

    const visiblePatchCount = Math.min(
      DUCKWEED.visiblePatchCount,
      DUCKWEED_PATCHES.length,
    );
    for (const leaf of this.leaves) {
      if (leaf.patchIndex >= visiblePatchCount) continue;
      const patch = DUCKWEED_PATCHES[leaf.patchIndex];
      const driftX = Math.sin(time * 0.1 + patch.phase) * DUCKWEED.driftX;
      const driftY =
        Math.cos(time * 0.13 + patch.phase * 1.4) * DUCKWEED.driftY;
      const rotation =
        Math.sin(time * 0.075 + patch.phase) * DUCKWEED.rotationAmount;
      const cosine = Math.cos(rotation);
      const sine = Math.sin(rotation);
      const center = {
        x: patch.x + leaf.offsetX * cosine - leaf.offsetY * sine + driftX,
        y: patch.y + leaf.offsetX * sine + leaf.offsetY * cosine + driftY,
      };
      const angle = leaf.angle + rotation;
      const pulse = 1 + Math.sin(time * 0.16 + leaf.phase) * 0.018;
      const radius = leaf.radius * pulse;
      const palette = PALETTES[patch.palette % PALETTES.length];
      const color =
        leaf.tone < 0.24
          ? palette.light
          : leaf.tone > 0.82
            ? palette.shade
            : palette.base;

      this.drawLeaf(
        this.shadowBatch,
        {
          x: center.x + DUCKWEED.shadow.offset.x,
          y: center.y + DUCKWEED.shadow.offset.y,
        },
        radius,
        angle,
        undefined,
      );
      this.drawLeaf(this.leafBatch, center, radius, angle, color);
      if (radius > 1.55) {
        const highlightCenter = {
          x: center.x - Math.cos(angle) * radius * 0.18,
          y: center.y - Math.sin(angle) * radius * 0.18,
        };
        this.detailBatch.circle(
          highlightCenter,
          Math.max(0.22, radius * 0.14),
          palette.center,
          5,
        );
      }

      if (leaf.paired) {
        const pairCenter = {
          x: center.x + Math.cos(angle + 0.8) * radius * 0.92,
          y: center.y + Math.sin(angle + 0.8) * radius * 0.92,
        };
        const pairRadius = radius * 0.72;
        this.drawLeaf(
          this.shadowBatch,
          {
            x: pairCenter.x + DUCKWEED.shadow.offset.x,
            y: pairCenter.y + DUCKWEED.shadow.offset.y,
          },
          pairRadius,
          angle + 1.15,
          undefined,
        );
        this.drawLeaf(
          this.leafBatch,
          pairCenter,
          pairRadius,
          angle + 1.15,
          palette.light,
        );
      }
    }

    this.shadowBatch.commit();
    this.leafBatch.commit();
    this.detailBatch.commit();
  }

  private createLeaves(): readonly DuckweedLeaf[] {
    const leaves: DuckweedLeaf[] = [];
    for (const [patchIndex, patch] of DUCKWEED_PATCHES.entries()) {
      for (let index = 0; index < patch.count; index += 1) {
        const seed = patchIndex * 1013 + index * 37 + 11;
        const radiusAmount = Math.pow(
          randomUnit(seed + 1),
          DUCKWEED.spreadExponent,
        );
        const distance = patch.radius * radiusAmount;
        const angle = randomUnit(seed + 2) * Math.PI * 2;
        leaves.push({
          patchIndex,
          offsetX: Math.cos(angle) * distance,
          offsetY: Math.sin(angle) * distance * 0.74,
          radius:
            DUCKWEED.minimumLeafRadius +
            randomUnit(seed + 3) *
              (DUCKWEED.maximumLeafRadius - DUCKWEED.minimumLeafRadius),
          angle: randomUnit(seed + 4) * Math.PI * 2,
          phase: randomUnit(seed + 5) * Math.PI * 2,
          tone: randomUnit(seed + 6),
          paired: randomUnit(seed + 7) < DUCKWEED.pairChance,
        });
      }
    }
    return leaves;
  }

  private drawLeaf(
    batch: SurfaceGeometryBatch,
    center: SurfacePoint,
    radius: number,
    angle: number,
    color?: THREE.Color,
  ): void {
    const segments = 7;
    for (let index = 0; index < segments; index += 1) {
      const angleA = (index / segments) * Math.PI * 2;
      const angleB = ((index + 1) / segments) * Math.PI * 2;
      batch.triangle(
        center,
        this.ellipsePoint(center, radius, angle, angleA),
        this.ellipsePoint(center, radius, angle, angleB),
        color,
      );
    }
  }

  private ellipsePoint(
    center: SurfacePoint,
    radius: number,
    rotation: number,
    angle: number,
  ): SurfacePoint {
    const localX = Math.cos(angle) * radius;
    const localY = Math.sin(angle) * radius * DUCKWEED.verticalScale;
    const cosine = Math.cos(rotation);
    const sine = Math.sin(rotation);
    return {
      x: center.x + localX * cosine - localY * sine,
      y: center.y + localX * sine + localY * cosine,
    };
  }
}
