import { FISH, MAX_WAKES } from "./config";
import { type Vec2, vec } from "./math";

export interface WakeInstance {
  position: Vec2;
  direction: Vec2;
  age: number;
  strength: number;
  length: number;
  width: number;
  alive: boolean;
}

export class WakeSystem {
  public readonly instances: WakeInstance[] = Array.from(
    { length: MAX_WAKES },
    () => ({
      position: vec(),
      direction: vec(1, 0),
      age: 0,
      strength: 0,
      length: 0,
      width: FISH.tailWake.bandWidth,
      alive: false,
    }),
  );

  private nextIndex = 0;

  public emit(
    x: number,
    y: number,
    directionX: number,
    directionY: number,
    strength: number,
    length: number,
  ): void {
    const wake = this.instances[this.nextIndex];
    wake.position.x = x;
    wake.position.y = y;
    wake.direction.x = directionX;
    wake.direction.y = directionY;
    wake.age = 0;
    wake.strength = strength;
    wake.length = length;
    wake.width = FISH.tailWake.bandWidth;
    wake.alive = true;
    this.nextIndex = (this.nextIndex + 1) % this.instances.length;
  }

  public update(deltaTime: number): void {
    for (const wake of this.instances) {
      if (!wake.alive) continue;
      wake.age += deltaTime;
      if (wake.age >= FISH.tailWake.lifetimeSeconds) wake.alive = false;
    }
  }

  public reset(): void {
    for (const wake of this.instances) wake.alive = false;
    this.nextIndex = 0;
  }
}
