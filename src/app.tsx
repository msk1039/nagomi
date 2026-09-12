import {
  Cloud,
  CloudRain,
  EyeOff,
  Maximize2,
  Minus,
  Minimize2,
  Moon,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Shuffle,
  Sun,
  Sunset as SunsetIcon,
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
import { GitHubStars } from "@/components/github-stars";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ConfigEditor } from "./config-editor";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FISH,
  FIXED_STEP,
} from "./config";
import { FishRenderer } from "./fish-renderer";
import { useIsMobile } from "./hooks/use-mobile";
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
import {
  DEFAULT_WEATHER_PRESET_ID,
  WEATHER_PRESETS,
  getWeatherPreset,
  type WeatherPresetId,
} from "./weather";

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

const AMBIENT_IDLE_DELAY_MS = 2400;
const GITHUB_REPOSITORY = "msk1039/procedural-koi-threejs";

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function sceneStats(runtime: PondRuntime, fps: number): SceneStats {
  return {
    koi: runtime.school.count,
    fps,
  };
}

function WeatherIcon({ id }: { id: WeatherPresetId }) {
  switch (id) {
    case "sunny":
      return <Sun aria-hidden="true" />;
    case "overcast":
      return <Cloud aria-hidden="true" />;
    case "sunset":
      return <SunsetIcon aria-hidden="true" />;
    case "moonlight":
      return <Moon aria-hidden="true" />;
    case "rain":
      return <CloudRain aria-hidden="true" />;
  }
}

export function App() {
  const isMobile = useIsMobile();
  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<PondRuntime | null>(null);
  const ambientModeRef = useRef(false);
  const weatherPresetRef = useRef<WeatherPresetId>(
    DEFAULT_WEATHER_PRESET_ID,
  );
  const rainEnabledRef = useRef(false);
  const [stats, setStats] = useState<SceneStats>(emptyStats);
  const [showInterface, setShowInterface] = useState(true);
  const [ambientMode, setAmbientMode] = useState(false);
  const [ambientControlsVisible, setAmbientControlsVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [weatherMenuOpen, setWeatherMenuOpen] = useState(false);
  const [rainEnabled, setRainEnabled] = useState(false);
  const [weatherPreset, setWeatherPreset] = useState<WeatherPresetId>(
    DEFAULT_WEATHER_PRESET_ID,
  );
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

  const setAmbientModeState = useCallback((active: boolean) => {
    ambientModeRef.current = active;
    setAmbientMode(active);
    setAmbientControlsVisible(true);
  }, []);

  const toggleAmbientMode = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) return;

    if (ambientModeRef.current) {
      setAmbientModeState(false);
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => undefined);
      }
      return;
    }

    setAmbientModeState(true);
    const fullscreenRoot = document.documentElement;
    if (!document.fullscreenElement && fullscreenRoot.requestFullscreen) {
      await fullscreenRoot.requestFullscreen().catch(() => undefined);
    }
  }, [setAmbientModeState]);

  const changeRainEnabled = useCallback((enabled: boolean) => {
    rainEnabledRef.current = enabled;
    setRainEnabled(enabled);
    runtimeRef.current?.school.setRainIntensity(enabled ? 1 : 0);
  }, []);

  const changeWeather = useCallback((id: WeatherPresetId) => {
    const preset = getWeatherPreset(id);
    weatherPresetRef.current = id;
    setWeatherPreset(id);
    runtimeRef.current?.renderer.setWeatherPreset(id);
    changeRainEnabled(preset.rainStrength > 0);
    setWeatherMenuOpen(false);
  }, [changeRainEnabled]);

  useEffect(() => {
    const handleFullscreenChange = (): void => {
      if (document.fullscreenElement === document.documentElement) {
        setAmbientModeState(true);
      } else if (ambientModeRef.current && !document.fullscreenElement) {
        setAmbientModeState(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [setAmbientModeState]);

  useEffect(() => {
    if (!ambientMode || settingsOpen || weatherMenuOpen) {
      setAmbientControlsVisible(true);
      return;
    }

    let idleTimer = window.setTimeout(
      () => setAmbientControlsVisible(false),
      AMBIENT_IDLE_DELAY_MS,
    );
    const revealControls = (): void => {
      setAmbientControlsVisible(true);
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(
        () => setAmbientControlsVisible(false),
        AMBIENT_IDLE_DELAY_MS,
      );
    };

    window.addEventListener("pointermove", revealControls);
    window.addEventListener("pointerdown", revealControls);
    window.addEventListener("keydown", revealControls);
    return () => {
      window.clearTimeout(idleTimer);
      window.removeEventListener("pointermove", revealControls);
      window.removeEventListener("pointerdown", revealControls);
      window.removeEventListener("keydown", revealControls);
    };
  }, [ambientMode, settingsOpen, weatherMenuOpen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const school = new School();
    const renderer = new FishRenderer(canvas);
    const runtime: PondRuntime = { school, renderer, showDebug: false };
    runtimeRef.current = runtime;
    const activeWeather = getWeatherPreset(weatherPresetRef.current);
    renderer.setWeatherPreset(activeWeather.id);
    school.setRainIntensity(rainEnabledRef.current ? 1 : 0);

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
      if (isEditableTarget(event.target)) return;
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
        case "KeyF":
          event.preventDefault();
          void toggleAmbientMode();
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
  }, [toggleAmbientMode]);

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

  const selectedWeather = getWeatherPreset(weatherPreset);
  const ambientUiHeldOpen = settingsOpen || weatherMenuOpen;
  const ambientUiHidden =
    ambientMode && !ambientControlsVisible && !ambientUiHeldOpen;

  return (
    <main
      ref={stageRef}
      className={`stage${ambientMode ? " stage--ambient" : ""}${
        ambientUiHidden
          ? " stage--ambient-idle"
          : ""
      }`}
      aria-label="Procedural koi simulation"
    >
      <div className="pond-shell">
        <div className="display">
          <canvas
            ref={canvasRef}
            id="pond"
            aria-label="Animated procedural koi"
            onPointerDown={callFish}
          />
        </div>

        {showInterface && (
          <div
            className={`pond-ui${
              ambientUiHidden
                ? " pond-ui--hidden"
                : ""
            }`}
          >
            <section className="status-float" aria-label="Current frame rate">
              <span className="fps-readout">{stats.fps} FPS</span>
            </section>

            <Drawer
              open={settingsOpen}
              onOpenChange={setSettingsOpen}
              modal={false}
              swipeDirection={isMobile ? "down" : "right"}
              showSwipeHandle={isMobile}
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
                    isMobile={isMobile}
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

        {showInterface && (
          <nav
            className={`control-dock${
              ambientUiHidden
                ? " control-dock--hidden"
                : ""
            }`}
            aria-label="Simulation controls"
          >
            <div className="control-group control-group--simulation">
              <Button
                variant="secondary"
                size="sm"
                onClick={scatter}
                aria-keyshortcuts="Space"
              >
                <Shuffle aria-hidden="true" />
                <span className="control-label">Scatter</span>
                <Kbd className="control-shortcut">Space</Kbd>
              </Button>
              <Separator orientation="vertical" />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => changeKoiCount(-1)}
                aria-label="Remove one koi"
                aria-keyshortcuts="["
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
                aria-keyshortcuts="]"
              >
                <Plus aria-hidden="true" />
              </Button>
            </div>
            <Separator className="control-divider" orientation="vertical" />
            <div className="control-group control-group--environment">
              <DropdownMenu
                open={weatherMenuOpen}
                onOpenChange={setWeatherMenuOpen}
              >
                <DropdownMenuTrigger
                  render={
                    <Button
                      className="weather-trigger"
                      variant="ghost"
                      size="sm"
                      aria-label={`Weather: ${selectedWeather.label}`}
                    />
                  }
                >
                  <WeatherIcon id={weatherPreset} />
                  <span className="control-label">{selectedWeather.label}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="weather-menu"
                  side="top"
                  align="center"
                  sideOffset={8}
                >
                  <DropdownMenuRadioGroup
                    value={weatherPreset}
                    onValueChange={(value) =>
                      changeWeather(value as WeatherPresetId)
                    }
                  >
                    <DropdownMenuLabel>Weather and lighting</DropdownMenuLabel>
                    {WEATHER_PRESETS.map((preset) => (
                      <DropdownMenuRadioItem
                        key={preset.id}
                        value={preset.id}
                        closeOnClick
                      >
                        <WeatherIcon id={preset.id} />
                        {preset.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="rain-control">
                <CloudRain aria-hidden="true" />
                <span className="rain-control__label">Rain</span>
                <Switch
                  size="sm"
                  checked={rainEnabled}
                  onCheckedChange={changeRainEnabled}
                  aria-label="Toggle rain ripples"
                />
              </div>
            </div>
            <Separator className="control-divider" orientation="vertical" />
            <div className="control-group control-group--view">
              <GitHubStars repo={GITHUB_REPOSITORY} stargazersCount={2} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void toggleAmbientMode()}
                aria-label={ambientMode ? "Exit ambient mode" : "Enter ambient mode"}
                aria-keyshortcuts="F"
                aria-pressed={ambientMode}
              >
                {ambientMode ? (
                  <Minimize2 aria-hidden="true" />
                ) : (
                  <Maximize2 aria-hidden="true" />
                )}
                <span className="control-label">{ambientMode ? "Exit" : "Ambient"}</span>
                <Kbd className="control-shortcut">F</Kbd>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInterface(false)}
                aria-label="Hide interface"
                aria-keyshortcuts="H"
              >
                <EyeOff aria-hidden="true" />
                <span className="control-label">Hide UI</span>
                <Kbd className="control-shortcut">H</Kbd>
              </Button>
            </div>
          </nav>
        )}
      </div>
    </main>
  );
}
