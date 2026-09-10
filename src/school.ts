import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  INITIAL_FISH,
  MAX_FISH,
  MAX_RIPPLES,
  RIPPLE_LIFETIME,
  SPINE_NODES,
} from "./config";
import { Koi, SwimState } from "./koi";
import {
  add,
  clamp,
  fromAngle,
  length,
  lerp,
  mul,
  normalize,
  perpendicular,
  sub,
  type Vec2,
  vec,
  wrapAngle,
  XorShift32,
} from "./math";

export interface Ripple {
  center: Vec2;
  age: number;
  alive: boolean;
}

export class School {
  public readonly fish: Koi[] = Array.from({ length: MAX_FISH }, () => new Koi());
  public readonly ripples: Ripple[] = Array.from({ length: MAX_RIPPLES }, () => ({
    center: vec(),
    age: 0,
    alive: false,
  }));

  public count: number = INITIAL_FISH;
  public targetActive = false;

  private random = new XorShift32();
  private target = vec(CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.5);
  private targetAge = 0;
  private nextRipple = 0;

  public constructor() {
    this.fish.forEach((fish, index) => fish.reset(index, this.random));
  }

  public setCount(count: number): void {
    this.count = clamp(Math.round(count), 1, MAX_FISH);
  }

  public reset(): void {
    this.random.state = 0x00c0ffee;
    this.fish.forEach((fish, index) => fish.reset(index, this.random));
    this.targetActive = false;
  }

  public callTo(point: Vec2): void {
    this.target = { ...point };
    this.targetActive = true;
    this.targetAge = 0;
    for (let index = 0; index < this.count; index += 1) {
      const fish = this.fish[index];
      fish.callDelay = this.random.range(0.04, 1.15) * (1.22 - fish.reactivity);
      fish.respondedToCall = false;
    }
    this.addRipple(point);
  }

  public scatter(): void {
    for (let index = 0; index < this.count; index += 1) {
      const fish = this.fish[index];
      fish.heading += this.random.range(-1.35, 1.35);
      fish.speed = fish.maximumSpeed;
      fish.angularVelocity += this.random.range(-2, 2);
      this.enterState(fish, SwimState.Burst);
    }
    this.targetActive = false;
  }

  public update(dt: number, time: number): void {
    this.targetAge += dt;
    if (this.targetActive && this.targetAge > 4.0) this.targetActive = false;

    const desired: Vec2[] = [];
    const desiredSpeed: number[] = [];
    for (let index = 0; index < this.count; index += 1) {
      const fish = this.fish[index];
      fish.callDelay = Math.max(0, fish.callDelay - dt);
      if (this.targetActive && fish.callDelay <= 0 && !fish.respondedToCall) {
        fish.respondedToCall = true;
        this.enterState(fish, SwimState.Burst);
      }
      this.updateNaturalState(fish, dt);
      desired[index] = this.steeringFor(index, time);
      desiredSpeed[index] = this.desiredSpeedFor(index);
    }
    for (let index = 0; index < this.count; index += 1) {
      this.integrate(this.fish[index], desired[index], desiredSpeed[index], dt);
    }

    for (const ripple of this.ripples) {
      if (!ripple.alive) continue;
      ripple.age += dt;
      if (ripple.age > RIPPLE_LIFETIME) ripple.alive = false;
    }
  }

  private behaviorUnit(fish: Koi): number {
    let value = fish.behaviorRng >>> 0;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    fish.behaviorRng = value >>> 0;
    return (fish.behaviorRng & 0x00ffffff) / 0x01000000;
  }

  private behaviorRange(fish: Koi, low: number, high: number): number {
    return low + (high - low) * this.behaviorUnit(fish);
  }

  private enterState(fish: Koi, next: SwimState): void {
    fish.state = next;
    fish.stateAge = 0;
    switch (next) {
      case SwimState.Glide:
        fish.stateDuration = this.behaviorRange(fish, 1.7, 5.2);
        break;
      case SwimState.Coast:
        fish.stateDuration = this.behaviorRange(fish, 0.7, 2.1);
        break;
      case SwimState.Hover:
        fish.stateDuration = this.behaviorRange(fish, 0.65, 3.1);
        break;
      case SwimState.Burst:
        fish.stateDuration = this.behaviorRange(fish, 0.32, 0.92);
        break;
      case SwimState.Pivot: {
        fish.stateDuration = this.behaviorRange(fish, 0.3, 0.78);
        const direction = this.behaviorUnit(fish) < 0.5 ? -1 : 1;
        fish.pivotHeading = wrapAngle(
          fish.heading + direction * this.behaviorRange(fish, 0.85, 2.35),
        );
        break;
      }
    }
  }

  private updateNaturalState(fish: Koi, dt: number): void {
    fish.stateAge += dt;
    if (fish.stateAge < fish.stateDuration) return;

    const roll = this.behaviorUnit(fish);
    switch (fish.state) {
      case SwimState.Glide:
        if (roll < 0.25) this.enterState(fish, SwimState.Coast);
        else if (roll < 0.43) this.enterState(fish, SwimState.Hover);
        else if (roll < 0.61) this.enterState(fish, SwimState.Pivot);
        else if (roll < 0.72) this.enterState(fish, SwimState.Burst);
        else this.enterState(fish, SwimState.Glide);
        break;
      case SwimState.Coast:
        if (roll < 0.38) this.enterState(fish, SwimState.Hover);
        else if (roll < 0.72) this.enterState(fish, SwimState.Glide);
        else if (roll < 0.9) this.enterState(fish, SwimState.Pivot);
        else this.enterState(fish, SwimState.Burst);
        break;
      case SwimState.Hover:
        if (roll < 0.34) this.enterState(fish, SwimState.Pivot);
        else if (roll < 0.55) this.enterState(fish, SwimState.Burst);
        else this.enterState(fish, SwimState.Glide);
        break;
      case SwimState.Burst:
        this.enterState(fish, SwimState.Coast);
        break;
      case SwimState.Pivot:
        this.enterState(fish, roll < 0.38 ? SwimState.Burst : SwimState.Glide);
        break;
    }
  }

  private steeringFor(index: number, time: number): Vec2 {
    const fish = this.fish[index];
    const forward = fromAngle(fish.heading);
    let steering = mul(forward, 0.95);

    if (fish.state === SwimState.Pivot) {
      steering = mul(fromAngle(fish.pivotHeading), 4.7);
    } else if (fish.state !== SwimState.Hover) {
      const wander =
        Math.sin(time * 0.29 + fish.wanderSeed) * 0.7 +
        Math.sin(time * 0.113 + fish.wanderSeed * 1.73) * 0.45;
      steering = add(steering, mul(fromAngle(fish.heading + wander), 0.62));
    }

    let separation = vec();
    let alignment = vec();
    let cohesion = vec();
    let neighbours = 0;

    for (let other = 0; other < this.count; other += 1) {
      if (other === index) continue;
      const offset = sub(fish.position, this.fish[other].position);
      const distance = length(offset);
      if (distance > 0.001 && distance < 37) {
        neighbours += 1;
        cohesion = add(cohesion, this.fish[other].position);
        alignment = add(alignment, normalize(this.fish[other].velocity));
        if (distance < 14) {
          separation = add(separation, mul(normalize(offset), (14 - distance) / 14));
        }
      }
    }

    if (neighbours > 0) {
      cohesion = normalize(sub(mul(cohesion, 1 / neighbours), fish.position), forward);
      alignment = normalize(alignment, forward);
      steering = add(steering, mul(cohesion, 0.25));
      steering = add(steering, mul(alignment, 0.42));
      steering = add(steering, mul(separation, 2.8));
    }

    const margin = 32;
    const edgeForce = vec();
    if (fish.position.x < margin) edgeForce.x += (margin - fish.position.x) / margin;
    if (fish.position.x > CANVAS_WIDTH - margin) {
      edgeForce.x -= (fish.position.x - (CANVAS_WIDTH - margin)) / margin;
    }
    if (fish.position.y < margin) edgeForce.y += (margin - fish.position.y) / margin;
    if (fish.position.y > CANVAS_HEIGHT - margin) {
      edgeForce.y -= (fish.position.y - (CANVAS_HEIGHT - margin)) / margin;
    }
    steering = add(steering, mul(edgeForce, 4.8));

    if (this.targetActive && fish.callDelay <= 0) {
      const toTarget = sub(this.target, fish.position);
      const distance = length(toTarget);
      if (distance > 13) {
        const chasePull = this.targetAge < 2.65 ? 3.35 : 2.45;
        steering = add(steering, mul(normalize(toTarget), chasePull));
      } else {
        const targetDirection = normalize(toTarget, forward);
        steering = add(steering, mul(perpendicular(targetDirection), 2.2));
        steering = add(steering, mul(targetDirection, -0.5));
      }
    }

    return normalize(steering, forward);
  }

  private desiredSpeedFor(index: number): number {
    const fish = this.fish[index];
    const chasing = this.targetActive && fish.callDelay <= 0 && this.targetAge < 2.65;
    if (chasing) {
      const chaseFade = 1 - clamp(this.targetAge / 2.65, 0, 1);
      return fish.maximumSpeed * (1.30 + chaseFade * 0.34);
    }

    let intention = fish.cruiseSpeed;
    if (this.targetActive && fish.callDelay <= 0) {
      const distance = length(sub(this.target, fish.position));
      const urgency = clamp(distance / 105, 0.2, 1);
      intention = fish.cruiseSpeed + (fish.maximumSpeed - fish.cruiseSpeed) * urgency;
    }

    switch (fish.state) {
      case SwimState.Glide:
        return intention;
      case SwimState.Coast:
        return intention * 0.28;
      case SwimState.Hover:
        return 0;
      case SwimState.Burst:
        return fish.maximumSpeed * 1.08;
      case SwimState.Pivot:
        return fish.cruiseSpeed * 0.16;
    }
  }

  private integrate(fish: Koi, desired: Vec2, desiredSpeed: number, dt: number): void {
    const desiredHeading = Math.atan2(desired.y, desired.x);
    const headingError = wrapAngle(desiredHeading - fish.heading);
    const pivoting = fish.state === SwimState.Pivot;
    const turnMultiplier = pivoting ? 2.65 : 1;
    const angularDamping = pivoting ? 2.15 : 3.8;
    const angularAcceleration =
      headingError * fish.turnStrength * turnMultiplier - fish.angularVelocity * angularDamping;
    fish.angularVelocity += angularAcceleration * dt;
    const maximumTurnRate = pivoting ? 4.35 : 2.25;
    fish.angularVelocity = clamp(fish.angularVelocity, -maximumTurnRate, maximumTurnRate);
    fish.heading = wrapAngle(fish.heading + fish.angularVelocity * dt);

    let speedResponse = 1.65;
    let desiredTailEffort = 0.62;
    switch (fish.state) {
      case SwimState.Glide:
        break;
      case SwimState.Coast:
        speedResponse = 1.05;
        desiredTailEffort = 0.16;
        break;
      case SwimState.Hover:
        speedResponse = 3.6;
        desiredTailEffort = 0.05;
        break;
      case SwimState.Burst:
        speedResponse = 6.4;
        desiredTailEffort = 1.22;
        break;
      case SwimState.Pivot:
        speedResponse = 4.2;
        desiredTailEffort = 1;
        break;
    }

    fish.speed += (desiredSpeed - fish.speed) * (1 - Math.exp(-speedResponse * dt));
    fish.tailEffort += (desiredTailEffort - fish.tailEffort) * (1 - Math.exp(-4.5 * dt));
    fish.velocity = mul(fromAngle(fish.heading), fish.speed);
    fish.position = add(fish.position, mul(fish.velocity, dt));

    const beatRate = 0.45 + (fish.speed / fish.maximumSpeed) * 4.6 + fish.tailEffort * 0.9;
    fish.swimPhase += beatRate * dt;

    fish.spine[0] = { ...fish.position };
    const spacing = fish.bodyLength / (SPINE_NODES - 1);
    for (let node = 1; node < SPINE_NODES; node += 1) {
      const fallback = mul(fromAngle(fish.heading), -1);
      const direction = normalize(sub(fish.spine[node], fish.spine[node - 1]), fallback);
      const constrained = add(fish.spine[node - 1], mul(direction, spacing));
      const tailAmount = node / (SPINE_NODES - 1);
      const stiffness = 0.94 - tailAmount * 0.17;
      fish.spine[node] = lerp(fish.spine[node], constrained, stiffness);
    }
  }

  private addRipple(point: Vec2): void {
    const ripple = this.ripples[this.nextRipple];
    ripple.center = { ...point };
    ripple.age = 0;
    ripple.alive = true;
    this.nextRipple = (this.nextRipple + 1) % this.ripples.length;
  }
}
