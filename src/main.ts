import { inject } from "@vercel/analytics";
import "./styles.css";
import { CANVAS_HEIGHT, CANVAS_WIDTH, FIXED_STEP } from "./config";
import { FishRenderer } from "./fish-renderer";
import { clamp, vec } from "./math";
import { School } from "./school";

inject();

const requireElement = <T extends HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
};

const canvas = requireElement<HTMLCanvasElement>("#pond");
const display = requireElement<HTMLDivElement>("#display");
const fishCount = requireElement<HTMLSpanElement>("#fish-count");
const touchCount = requireElement<HTMLOutputElement>("#touch-count");
const stateLabel = requireElement<HTMLSpanElement>("#state-label");
const debugButton = requireElement<HTMLButtonElement>("#debug-button");

const school = new School();
const fishRenderer = new FishRenderer(canvas);
let accumulator = 0;
let simulationTime = 0;
let previousTime = performance.now();
let framesSinceSample = 0;
let fpsSampleStarted = previousTime;
let displayedFps = 0;
let showDebug = false;
let showInterface = true;

const refreshInterface = (): void => {
  fishCount.textContent = `FISH: ${school.count.toString().padStart(2, "0")}  FPS: ${displayedFps
    .toString()
    .padStart(3, "0")}`;
  touchCount.textContent = `${school.count} fish`;
  stateLabel.textContent = school.targetActive ? "STATE: CALLED" : "STATE: WANDERING";
  debugButton.setAttribute("aria-pressed", String(showDebug));
  display.classList.toggle("interface-hidden", !showInterface);
};

const changeCount = (amount: number): void => {
  school.setCount(school.count + amount);
  refreshInterface();
};

const toggleDebug = (): void => {
  showDebug = !showDebug;
  refreshInterface();
};

canvas.addEventListener("pointerdown", (event) => {
  const bounds = canvas.getBoundingClientRect();
  const point = vec(
    clamp(((event.clientX - bounds.left) / bounds.width) * CANVAS_WIDTH, 0, CANVAS_WIDTH),
    clamp(((event.clientY - bounds.top) / bounds.height) * CANVAS_HEIGHT, 0, CANVAS_HEIGHT),
  );
  school.callTo(point);
  refreshInterface();
});

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  switch (event.code) {
    case "Space":
      event.preventDefault();
      school.scatter();
      break;
    case "BracketLeft":
      changeCount(-1);
      break;
    case "BracketRight":
      changeCount(1);
      break;
    case "KeyD":
      toggleDebug();
      break;
    case "KeyH":
      showInterface = !showInterface;
      break;
    case "KeyR":
      school.reset();
      break;
  }
  refreshInterface();
});

requireElement<HTMLButtonElement>("#scatter-button").addEventListener("click", () => {
  school.scatter();
  refreshInterface();
});
requireElement<HTMLButtonElement>("#remove-button").addEventListener("click", () => changeCount(-1));
requireElement<HTMLButtonElement>("#add-button").addEventListener("click", () => changeCount(1));
debugButton.addEventListener("click", toggleDebug);

const animate = (now: number): void => {
  framesSinceSample += 1;
  if (now - fpsSampleStarted >= 500) {
    displayedFps = Math.round((framesSinceSample * 1000) / (now - fpsSampleStarted));
    framesSinceSample = 0;
    fpsSampleStarted = now;
  }

  accumulator += Math.min((now - previousTime) / 1000, 0.1);
  previousTime = now;
  while (accumulator >= FIXED_STEP) {
    simulationTime += FIXED_STEP;
    school.update(FIXED_STEP, simulationTime);
    accumulator -= FIXED_STEP;
  }

  fishRenderer.draw(school, simulationTime, showDebug);
  refreshInterface();
  requestAnimationFrame(animate);
};

refreshInterface();
requestAnimationFrame(animate);
