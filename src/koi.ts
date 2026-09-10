import { CANVAS_HEIGHT, CANVAS_WIDTH, SPINE_NODES, TAU } from "./config";
import { add, fromAngle, mul, type Vec2, vec, XorShift32 } from "./math";

export enum SwimState {
  Glide,
  Coast,
  Hover,
  Burst,
  Pivot,
}

export class Koi {
  public position = vec();
  public velocity = vec();
  public spine: Vec2[] = Array.from({ length: SPINE_NODES }, () => vec());
  public renderSpine: Vec2[] = Array.from({ length: SPINE_NODES }, () => vec());
  public heading = 0;
  public angularVelocity = 0;
  public speed = 0;
  public cruiseSpeed = 20;
  public maximumSpeed = 34;
  public turnStrength = 5;
  public bodyLength = 24;
  public bodyWidth = 4;
  public swimPhase = 0;
  public phaseOffset = 0;
  public wanderSeed = 0;
  public stateAge = 0;
  public stateDuration = 2;
  public pivotHeading = 0;
  public reactivity = 0.7;
  public callDelay = 0;
  public tailEffort = 0.6;
  public behaviorRng = 1;
  public state = SwimState.Glide;

  public reset(index: number, random: XorShift32): void {
    this.position = vec(
      random.range(45, CANVAS_WIDTH - 45),
      random.range(32, CANVAS_HEIGHT - 32),
    );
    this.heading = random.range(-Math.PI, Math.PI);
    this.cruiseSpeed = random.range(13, 21);
    this.maximumSpeed = this.cruiseSpeed * random.range(1.55, 1.9);
    this.speed = this.cruiseSpeed * random.range(0.72, 1.05);
    this.turnStrength = random.range(4.4, 6.8);
    this.bodyLength = random.range(27, 38);
    this.bodyWidth = this.bodyLength * random.range(0.17, 0.2);
    this.phaseOffset = random.range(0, TAU);
    this.swimPhase = this.phaseOffset;
    this.wanderSeed = random.range(0, 100);
    this.reactivity = random.range(0.35, 1);
    this.callDelay = 0;
    this.behaviorRng = (0x9e3779b9 ^ Math.imul(index + 1, 0x85ebca6b)) >>> 0;
    this.state = index % 5;

    const durations: ReadonlyArray<readonly [number, number]> = [
      [1.7, 4.8],
      [0.8, 2],
      [0.7, 2.9],
      [0.35, 0.9],
      [0.35, 0.8],
    ];
    const [low, high] = durations[this.state];
    this.stateDuration = random.range(low, high);
    this.stateAge = random.range(0, this.stateDuration * 0.8);
    this.pivotHeading = this.heading;
    this.tailEffort = 0.6;
    this.angularVelocity = 0;
    this.velocity = mul(fromAngle(this.heading), this.speed);

    const backward = mul(fromAngle(this.heading), -this.bodyLength / (SPINE_NODES - 1));
    for (let node = 0; node < SPINE_NODES; node += 1) {
      this.spine[node] = add(this.position, mul(backward, node));
      this.renderSpine[node] = { ...this.spine[node] };
    }
  }
}
