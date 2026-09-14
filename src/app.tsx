import {
  Cloud,
  CloudFog,
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
  Volume2,
  Waves,
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
import { AUDIO } from "./audio-config";
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
  applyWeatherConfig,
  applyWeatherConfigToDraft,
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
}

interface PondRuntime {
  school: School;
  renderer: FishRenderer;
  showDebug: boolean;
}

const emptyStats: SceneStats = {
  koi: FISH.initialCount,
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

function sceneStats(runtime: PondRuntime): SceneStats {
  return {
    koi: runtime.school.count,
  };
}

function WeatherIcon({ id }: { id: WeatherPresetId }) {
  switch (id) {
    case "sunny":
      return <Sun aria-hidden="true" />;
    case "deep-clear":
      return <Waves aria-hidden="true" />;
    case "overcast":
      return <Cloud aria-hidden="true" />;
    case "mist":
      return <CloudFog aria-hidden="true" />;
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
  const ambientAudioContextRef = useRef<AudioContext | null>(null);
  const ambientAudioGainRef = useRef<GainNode | null>(null);
  const ambientAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ambientAudioLoadingRef = useRef<Promise<void> | null>(null);
  const runtimeRef = useRef<PondRuntime | null>(null);
  const ambientModeRef = useRef(false);
  const weatherPresetRef = useRef<WeatherPresetId>(
    DEFAULT_WEATHER_PRESET_ID,
  );
  const rainEnabledRef = useRef(false);
  const soundEnabledRef = useRef<boolean>(AUDIO.defaultEnabled);
  const [stats, setStats] = useState<SceneStats>(emptyStats);
  const [showInterface, setShowInterface] = useState(true);
  const [ambientMode, setAmbientMode] = useState(false);
  const [ambientControlsVisible, setAmbientControlsVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [weatherMenuOpen, setWeatherMenuOpen] = useState(false);
  const [rainEnabled, setRainEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(
    AUDIO.defaultEnabled,
  );
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
    setStats(sceneStats(runtime));
  }, []);

  const scatter = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.school.scatter();
    setStats(sceneStats(runtime));
  }, []);

  const applyRuntimeConfig = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.school.refreshConfig();
    runtime.renderer.refreshConfig();
    setStats(sceneStats(runtime));
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

  const startAmbientAudio = useCallback(async (): Promise<void> => {
    if (ambientAudioSourceRef.current) {
      await ambientAudioContextRef.current?.resume();
      return;
    }
    if (ambientAudioLoadingRef.current) {
      await ambientAudioLoadingRef.current;
      return;
    }

    const context = new AudioContext();
    const gain = context.createGain();
    gain.gain.value = soundEnabledRef.current ? AUDIO.ambient.volume : 0;
    gain.connect(context.destination);
    ambientAudioContextRef.current = context;
    ambientAudioGainRef.current = gain;

    const loading = (async (): Promise<void> => {
      await context.resume();
      const loadBuffer = async (path: string): Promise<AudioBuffer> => {
        const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
        if (!response.ok) throw new Error(`Unable to load ${path}`);
        return context.decodeAudioData(await response.arrayBuffer());
      };
      const ambientBuffer = await loadBuffer(AUDIO.ambient.source);
      if (context.state === "closed") return;

      const ambientSource = context.createBufferSource();
      ambientSource.buffer = ambientBuffer;
      ambientSource.loop = true;
      ambientSource.connect(gain);
      ambientSource.start();
      ambientAudioSourceRef.current = ambientSource;
    })();
    ambientAudioLoadingRef.current = loading;
    try {
      await loading;
    } finally {
      ambientAudioLoadingRef.current = null;
    }
  }, []);

  const setAmbientSoundEnabled = useCallback((enabled: boolean) => {
    soundEnabledRef.current = enabled;
    setSoundEnabled(enabled);
    if (enabled) void startAmbientAudio().catch(() => undefined);

    const context = ambientAudioContextRef.current;
    const gain = ambientAudioGainRef.current;
    if (context && gain) {
      const now = context.currentTime;
      gain.gain.cancelAndHoldAtTime(now);
      gain.gain.linearRampToValueAtTime(
        enabled ? AUDIO.ambient.volume : 0,
        now + AUDIO.toggleFadeSeconds,
      );
    }
  }, [startAmbientAudio]);

  useEffect(() => {
    const unlockAmbientAudio = (): void => {
      window.removeEventListener("pointerdown", unlockAmbientAudio);
      window.removeEventListener("keydown", unlockAmbientAudio);
      if (soundEnabledRef.current) {
        void startAmbientAudio().catch(() => undefined);
      }
    };

    window.addEventListener("pointerdown", unlockAmbientAudio);
    window.addEventListener("keydown", unlockAmbientAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAmbientAudio);
      window.removeEventListener("keydown", unlockAmbientAudio);
    };
  }, [startAmbientAudio]);

  useEffect(() => () => {
    ambientAudioSourceRef.current?.stop();
    ambientAudioSourceRef.current = null;
    ambientAudioGainRef.current = null;
    const context = ambientAudioContextRef.current;
    ambientAudioContextRef.current = null;
    if (context && context.state !== "closed") void context.close();
  }, []);

  const changeWeather = useCallback((id: WeatherPresetId) => {
    const preset = getWeatherPreset(id);
    applyWeatherConfig(preset.config);
    setDraftConfig((current) =>
      applyWeatherConfigToDraft(current, preset.config),
    );
    weatherPresetRef.current = id;
    setWeatherPreset(id);
    runtimeRef.current?.renderer.refreshConfig();
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
    const animate = (now: number): void => {
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
      setStats(sceneStats(runtime));
    };

    window.addEventListener("keydown", handleKeyDown);
    setStats(sceneStats(runtime));
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
    setStats(sceneStats(runtime));
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
            <header className="brand-float">
              <h1 className="brand-wordmark">nagomi</h1>
            </header>

            <div className="top-actions">
              <GitHubStars repo={GITHUB_REPOSITORY} stargazersCount={2} />
              <Separator orientation="vertical" />
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
                    variant="ghost"
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
            <div className="control-group control-group--view">
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
            <Separator className="control-divider" orientation="vertical" />
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
              <div className="rain-control">
                <Volume2 aria-hidden="true" />
                <span className="rain-control__label">Sound</span>
                <Switch
                  size="sm"
                  checked={soundEnabled}
                  onCheckedChange={setAmbientSoundEnabled}
                  aria-label="Toggle pond ambience"
                />
              </div>
            </div>
          </nav>
        )}
      </div>
    </main>
  );
}
