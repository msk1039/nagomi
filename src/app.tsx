import {
  Minus,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Shuffle,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ConfigEditor } from "./config-editor";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FISH,
  FIXED_STEP,
} from "./config";
import { FishRenderer } from "./fish-renderer";
import { clamp, vec } from "./math";
import {
  applyRuntimeConfigDraft,
  createDefaultRuntimeConfigDraft,
  createRuntimeConfigDraft,
  resetRuntimeConfig,
  updateRuntimeConfigDraft,
  type ConfigPath,
  type RuntimeConfigDraft,
} from "./runtime-config";
import { School } from "./school";

interface SceneStats {
  koi: number;
  fps: number;
}

interface PondRuntime {
  school: School;
  renderer: FishRenderer;
  showDebug: boolean;
}

const emptyStats: SceneStats = {
  koi: FISH.initialCount,
  fps: 0,
};

function sceneStats(runtime: PondRuntime, fps: number): SceneStats {
  return {
    koi: runtime.school.count,
    fps,
  };
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<PondRuntime | null>(null);
  const [stats, setStats] = useState<SceneStats>(emptyStats);
  const [showInterface, setShowInterface] = useState(true);
  const [draftConfig, setDraftConfig] = useState<RuntimeConfigDraft>(() =>
    createRuntimeConfigDraft(),
  );
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const changeKoiCount = useCallback((amount: number) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.school.setCount(runtime.school.count + amount);
    setStats((current) => sceneStats(runtime, current.fps));
  }, []);

  const scatter = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.school.scatter();
    setStats((current) => sceneStats(runtime, current.fps));
  }, []);

  const applyRuntimeConfig = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.school.refreshConfig();
    runtime.renderer.refreshConfig();
    setStats((current) => sceneStats(runtime, current.fps));
  }, []);

  const handleConfigChange = useCallback((
    sectionId: string,
    path: ConfigPath,
    value: boolean | number | string,
  ) => {
    setDraftConfig((current) =>
      updateRuntimeConfigDraft(current, sectionId, path, value),
    );
    setSettingsDirty(true);
  }, []);

  const saveSettings = useCallback(() => {
    applyRuntimeConfigDraft(draftConfig);
    applyRuntimeConfig();
    setSettingsDirty(false);
  }, [applyRuntimeConfig, draftConfig]);

  const resetSettings = useCallback(() => {
    resetRuntimeConfig();
    setDraftConfig(createDefaultRuntimeConfigDraft());
    setSettingsDirty(false);
    applyRuntimeConfig();
  }, [applyRuntimeConfig]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const school = new School();
    const renderer = new FishRenderer(canvas);
    const runtime: PondRuntime = { school, renderer, showDebug: false };
    runtimeRef.current = runtime;

    let animationFrame = 0;
    let accumulator = 0;
    let simulationTime = 0;
    let previousTime = performance.now();
    let framesSinceSample = 0;
    let fpsSampleStarted = previousTime;
    let displayedFps = 0;

    const animate = (now: number): void => {
      framesSinceSample += 1;
      if (now - fpsSampleStarted >= 500) {
        displayedFps = Math.round(
          (framesSinceSample * 1000) / (now - fpsSampleStarted),
        );
        framesSinceSample = 0;
        fpsSampleStarted = now;
        setStats(sceneStats(runtime, displayedFps));
      }

      accumulator += Math.min((now - previousTime) / 1000, 0.1);
      previousTime = now;
      while (accumulator >= FIXED_STEP) {
        simulationTime += FIXED_STEP;
        school.update(FIXED_STEP, simulationTime);
        accumulator -= FIXED_STEP;
      }

      renderer.draw(school, simulationTime, runtime.showDebug);
      animationFrame = requestAnimationFrame(animate);
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat) return;
      switch (event.code) {
        case "Space":
          event.preventDefault();
          school.scatter();
          break;
        case "BracketLeft":
          school.setCount(school.count - 1);
          break;
        case "BracketRight":
          school.setCount(school.count + 1);
          break;
        case "KeyD":
          runtime.showDebug = !runtime.showDebug;
          break;
        case "KeyH":
          setShowInterface((current) => !current);
          break;
        case "KeyR":
          school.reset();
          break;
        default:
          return;
      }
      setStats(sceneStats(runtime, displayedFps));
    };

    window.addEventListener("keydown", handleKeyDown);
    setStats(sceneStats(runtime, 0));
    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", handleKeyDown);
      renderer.dispose();
      runtimeRef.current = null;
    };
  }, []);

  const callFish = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    runtime.school.callTo(
      vec(
        clamp(
          ((event.clientX - bounds.left) / bounds.width) * CANVAS_WIDTH,
          0,
          CANVAS_WIDTH,
        ),
        clamp(
          ((event.clientY - bounds.top) / bounds.height) * CANVAS_HEIGHT,
          0,
          CANVAS_HEIGHT,
        ),
      ),
    );
    setStats((current) => sceneStats(runtime, current.fps));
  };

  return (
    <main className="stage" aria-label="Procedural koi simulation">
      <div className="pond-shell">
        <div className="display">
          <canvas
            ref={canvasRef}
            id="pond"
            aria-label="Animated procedural koi"
            onPointerDown={callFish}
          />

          {showInterface && (
            <div className="pond-ui">
              <section className="status-float" aria-label="Current frame rate">
                <span className="fps-readout">{stats.fps} FPS</span>
              </section>

              <Drawer
                modal={false}
                swipeDirection="right"
                disablePointerDismissal
              >
                <DrawerTrigger
                  render={
                    <Button
                      className="settings-trigger"
                      variant="secondary"
                      aria-label="Open pond settings"
                    />
                  }
                >
                  <Settings2 aria-hidden="true" />
                  <span>Settings</span>
                </DrawerTrigger>
                <DrawerContent className="settings-drawer">
                  <DrawerHeader className="settings-drawer__header">
                    <div>
                      <DrawerTitle>Pond settings</DrawerTitle>
                      <DrawerDescription>
                        Adjust values, then apply them to the pond.
                      </DrawerDescription>
                    </div>
                    <DrawerClose
                      render={
                        <Button variant="ghost" size="icon" aria-label="Close settings" />
                      }
                    >
                      <X aria-hidden="true" />
                    </DrawerClose>
                  </DrawerHeader>
                  <div className="settings-search">
                    <Search aria-hidden="true" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Find a setting…"
                      aria-label="Find a setting"
                    />
                  </div>
                  <div className="settings-scroll">
                    <ConfigEditor
                      query={searchQuery}
                      draft={draftConfig}
                      hasPendingChanges={settingsDirty}
                      onApply={saveSettings}
                      onReset={resetSettings}
                      onChange={handleConfigChange}
                    />
                  </div>
                  <DrawerFooter className="settings-drawer__footer">
                    <Button variant="outline" onClick={resetSettings}>
                      <RotateCcw aria-hidden="true" />
                      Reset defaults
                    </Button>
                    <Button onClick={saveSettings} disabled={!settingsDirty}>
                      Apply changes
                    </Button>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>

            </div>
          )}
        </div>

        {showInterface && (
          <nav className="control-dock" aria-label="Simulation controls">
                <Button variant="secondary" size="sm" onClick={scatter}>
                  <Shuffle aria-hidden="true" />
                  <span>Scatter</span>
                </Button>
                <Separator orientation="vertical" />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => changeKoiCount(-1)}
                  aria-label="Remove one koi"
                >
                  <Minus aria-hidden="true" />
                </Button>
                <output className="koi-count" aria-live="polite">
                  {stats.koi}
                </output>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => changeKoiCount(1)}
                  aria-label="Add one koi"
                >
                  <Plus aria-hidden="true" />
                </Button>
          </nav>
        )}
      </div>
    </main>
  );
}
