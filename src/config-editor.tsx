import { ChevronRight, RotateCcw, X } from "lucide-react";
import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ElasticSlider } from "@/components/elastic-slider";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  RUNTIME_CONFIG_SECTIONS,
  type ConfigPath,
  type RuntimeConfigDraft,
  type RuntimeConfigSection,
} from "./runtime-config";

interface ConfigEditorProps {
  query: string;
  draft: RuntimeConfigDraft;
  isMobile: boolean;
  hasPendingChanges: boolean;
  onApply: () => void;
  onReset: () => void;
  onChange: (
    sectionId: string,
    path: ConfigPath,
    value: boolean | number | string,
  ) => void;
}

interface ConfigTreeProps {
  section: RuntimeConfigSection;
  value: unknown;
  path: ConfigPath;
  label: string;
  query: string;
  onChange: ConfigEditorProps["onChange"];
  excludedKeys?: readonly string[];
  flat?: boolean;
  rangeOverride?: NumberRange;
}

interface NumberRange {
  min: number;
  max: number;
  step: number;
}

interface ConfigGroup {
  id: string;
  title: string;
  description: string;
  sectionIds: readonly string[];
}

const CONFIG_GROUPS: readonly ConfigGroup[] = [
  {
    id: "koi",
    title: "Koi",
    description: "Fish behavior, palettes, and body markings.",
    sectionIds: ["koi", "koi-palettes", "koi-patterns"],
  },
  {
    id: "tiny-fish",
    title: "Tiny fish",
    description: "School behavior, appearance, and placement.",
    sectionIds: ["tiny-fish", "tiny-fish-schools"],
  },
  {
    id: "water",
    title: "Water",
    description: "Pond bed, currents, tint, and ripple behavior.",
    sectionIds: ["pond-bed", "water", "ripples"],
  },
  {
    id: "lotus",
    title: "Lotus",
    description: "Leaves, flowers, palettes, and placement.",
    sectionIds: ["lotus", "lotus-leaves", "lotus-flowers"],
  },
  {
    id: "duckweed",
    title: "Duckweed",
    description: "Leaf appearance and floating patches.",
    sectionIds: ["duckweed", "duckweed-patches"],
  },
  {
    id: "butterflies",
    title: "Butterflies",
    description: "Flight behavior, colors, and spawn points.",
    sectionIds: ["butterflies", "butterfly-spawns"],
  },
];

const STABLE_NUMBER_RANGES = new Map<string, NumberRange>();

const explicitNumberRange = (
  sectionId: string,
  path: ConfigPath,
): NumberRange | undefined => {
  const fullPath = `${sectionId} ${pathText(path)}`.toLowerCase();
  const key = String(path.at(-1) ?? "").toLowerCase();
  if (
    fullPath.includes("koi depth") &&
    /depth|range|start|end/.test(fullPath)
  ) {
    return { min: 0, max: 1, step: 0.01 };
  }
  if (fullPath.includes("blur")) return { min: 0, max: 12, step: 0.1 };
  if (fullPath.includes("openingangledegrees")) {
    return { min: 10, max: 60, step: 1 };
  }
  if (fullPath.includes("distortion") || key === "strength") {
    return { min: 0, max: 10, step: 0.05 };
  }
  if (fullPath.includes("duration") || fullPath.includes("seconds")) {
    return { min: 0.1, max: 30, step: 0.1 };
  }
  return undefined;
};

const isContainer = (value: unknown): value is object =>
  value !== null && typeof value === "object";

const prettify = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/^./, (character) => character.toUpperCase());

const pathText = (path: ConfigPath): string =>
  path.map((part) => String(part)).join(" ");

const matchesQuery = (value: unknown, label: string, query: string): boolean => {
  if (!query) return true;
  const normalizedLabel = prettify(label).toLowerCase();
  if (normalizedLabel.includes(query)) return true;
  if (!isContainer(value)) return String(value).toLowerCase().includes(query);
  return Object.entries(value).some(([key, child]) =>
    matchesQuery(child, `${label} ${key}`, query),
  );
};

const isColorValue = (value: number, path: ConfigPath): boolean => {
  const key = String(path.at(-1) ?? "").toLowerCase();
  return (
    Number.isInteger(value) &&
    value > 0xffff &&
    /(color|base|accent|marking|fin|light|shade|vein|center|petal|body|wing|eye)/.test(
      key,
    )
  );
};

const inferNumberRange = (value: number, path: ConfigPath): NumberRange => {
  const key = String(path.at(-1) ?? "").toLowerCase();
  const fullPath = pathText(path).toLowerCase();
  if (/(opacity|chance|probability)/.test(key)) {
    return { min: 0, max: 1, step: 0.01 };
  }
  if (key === "palette") return { min: 0, max: 5, step: 1 };
  if (key === "leafindex") return { min: 0, max: 18, step: 1 };
  if (key === "x") return { min: -80, max: 560, step: 1 };
  if (key === "y") return { min: -80, max: 350, step: 1 };
  if (/(angle|heading|rotation|phase)/.test(key)) {
    return { min: -Math.PI * 2, max: Math.PI * 2, step: 0.01 };
  }
  if (fullPath.includes("direction")) {
    return { min: -1, max: 1, step: 0.01 };
  }
  if (/(color|tint)/.test(fullPath)) {
    return { min: 0, max: 1.5, step: 0.01 };
  }
  if (Number.isInteger(value)) {
    const maximum = /(count|segments|veincount|every)/.test(key)
      ? Math.max(12, Math.ceil(Math.max(value, 1) * 2))
      : Math.max(10, Math.ceil(Math.abs(value) * 2));
    return { min: value < 0 ? -maximum : 0, max: maximum, step: 1 };
  }
  if (value < 0) {
    const limit = Math.max(1, Math.abs(value) * 3);
    return { min: -limit, max: limit, step: limit / 200 };
  }
  if (value <= 0.1) return { min: 0, max: 0.25, step: 0.001 };
  if (value <= 1) return { min: 0, max: 1.5, step: 0.01 };
  const maximum = Math.max(10, value * 2.25);
  return { min: 0, max: maximum, step: maximum / 200 };
};

const numberRange = (
  sectionId: string,
  value: number,
  path: ConfigPath,
): NumberRange => {
  const id = `${sectionId}:${path.join(".")}`;
  const savedRange = STABLE_NUMBER_RANGES.get(id);
  if (savedRange) return savedRange;
  const inferredRange =
    explicitNumberRange(sectionId, path) ?? inferNumberRange(value, path);
  STABLE_NUMBER_RANGES.set(id, inferredRange);
  return inferredRange;
};

const clampToRange = (value: number, range: NumberRange): number =>
  Math.min(range.max, Math.max(range.min, value));

const formatNumber = (value: number): string =>
  Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("en-US", {
        maximumFractionDigits: 3,
        useGrouping: false,
      });

function PrimitiveControl({
  section,
  value,
  path,
  label,
  onChange,
  rangeOverride,
}: ConfigTreeProps) {
  const id = `${section.id}-${path.join("-")}`;

  if (typeof value === "boolean") {
    return (
      <div className="config-property-row config-property-row--switch" data-base-ui-swipe-ignore>
        <Label htmlFor={id}>{prettify(label)}</Label>
        <Switch
          id={id}
          checked={value}
          onCheckedChange={(checked) => onChange(section.id, path, checked)}
        />
      </div>
    );
  }

  if (typeof value === "number" && isColorValue(value, path)) {
    const hex = `#${value.toString(16).padStart(6, "0").slice(-6)}`;
    return (
      <div className="config-property-row config-property-row--color" data-base-ui-swipe-ignore>
        <Label htmlFor={id}>{prettify(label)}</Label>
        <div className="color-control">
          <input
            id={id}
            type="color"
            value={hex}
            onChange={(event) =>
              onChange(
                section.id,
                path,
                Number.parseInt(event.target.value.slice(1), 16),
              )
            }
          />
          <code>{hex.toUpperCase()}</code>
        </div>
      </div>
    );
  }

  if (typeof value === "number") {
    const range = rangeOverride ?? numberRange(section.id, value, path);
    const updateValue = (next: number): void => {
      if (Number.isFinite(next)) {
        onChange(section.id, path, clampToRange(next, range));
      }
    };
    return (
      <div className="config-property-row" data-base-ui-swipe-ignore>
        <Label>{prettify(label)}</Label>
        <ElasticSlider
          label={prettify(label)}
          aria-label={`${prettify(label)} value`}
          showLabel={false}
          min={range.min}
          max={range.max}
          step={range.step}
          value={clampToRange(value, range)}
          onValueChange={updateValue}
          formatValue={formatNumber}
          className="drawer-elastic-slider"
        />
      </div>
    );
  }

  if (typeof value === "string") {
    return null;
  }

  return null;
}

function ConfigTree(props: ConfigTreeProps) {
  const { section, value, path, label, query, onChange, excludedKeys, flat } = props;
  if (!matchesQuery(value, `${label} ${pathText(path)}`, query)) return null;
  if (!isContainer(value)) return <PrimitiveControl {...props} />;

  const entries = Object.entries(value).filter(
    ([key]) => !excludedKeys?.includes(key),
  );
  const primitiveArray =
    Array.isArray(value) && entries.every(([, child]) => !isContainer(child));
  if (primitiveArray) {
    const colorChannels = /color|tint/i.test(label) && entries.length === 3;
    const rangeEnds =
      entries.length === 2 &&
      !/direction/i.test(label) &&
      entries.every(([, child]) => typeof child === "number");
    return (
      <div className="config-cluster" data-base-ui-swipe-ignore>
        <div className="config-cluster__label">{prettify(label)}</div>
        {entries.map(([key, child], index) => {
          const childPath = [...path, Number(key)];
          let rangeOverride: NumberRange | undefined;
          if (rangeEnds && typeof child === "number") {
            const baseRange = numberRange(section.id, child, childPath);
            rangeOverride = index === 0
              ? { ...baseRange, max: Math.min(baseRange.max, Number(entries[1][1])) }
              : { ...baseRange, min: Math.max(baseRange.min, Number(entries[0][1])) };
          }
          return (
            <ConfigTree
              key={key}
              section={section}
              value={child}
              path={childPath}
              label={
                colorChannels
                  ? ["Red", "Green", "Blue"][index]
                  : rangeEnds
                    ? ["Minimum", "Maximum"][index]
                    : `Value ${index + 1}`
              }
              query={query}
              onChange={onChange}
              rangeOverride={rangeOverride}
            />
          );
        })}
      </div>
    );
  }

  const children = entries.map(([key, child], index) => {
    const childLabel = Array.isArray(value)
      ? isContainer(child) && "name" in child && typeof child.name === "string"
        ? child.name
        : `Item ${index + 1}`
      : key;
    return (
      <ConfigTree
        key={key}
        section={section}
        value={child}
        path={[...path, Array.isArray(value) ? Number(key) : key]}
        label={childLabel}
        query={query}
        onChange={onChange}
      />
    );
  });

  if (flat) return <div className="config-root">{children}</div>;

  return (
    <details className="config-subgroup" open={query ? true : undefined}>
      <summary>
        <ChevronRight aria-hidden="true" />
        <span>{prettify(label)}</span>
        <span>{entries.length}</span>
      </summary>
      <div className="config-subgroup__body">{children}</div>
    </details>
  );
}

function ConfigGroupDrawer({
  group,
  sections,
  query,
  onChange,
  hasPendingChanges,
  onApply,
  onReset,
  isMobile,
}: {
  group: ConfigGroup;
  sections: RuntimeConfigSection[];
  query: string;
  onChange: ConfigEditorProps["onChange"];
  hasPendingChanges: boolean;
  onApply: () => void;
  onReset: () => void;
  isMobile: boolean;
}) {
  const [selectedSectionId, setSelectedSectionId] = useState(group.sectionIds[0]);
  const selectedSection =
    sections.find((section) => section.id === selectedSectionId) ?? sections[0];

  return (
    <Drawer
      modal={false}
      swipeDirection={isMobile ? "down" : "right"}
      showSwipeHandle={isMobile}
      disablePointerDismissal
    >
      <DrawerTrigger render={<button className="config-section" type="button" />}>
        <span>
          <strong>{group.title}</strong>
          <small>{group.description}</small>
        </span>
        <ChevronRight aria-hidden="true" />
      </DrawerTrigger>
      <DrawerContent className="settings-drawer settings-drawer--nested">
        <DrawerHeader className="settings-drawer__header">
          <div>
            <DrawerTitle>{group.title}</DrawerTitle>
            <DrawerDescription>{group.description}</DrawerDescription>
          </div>
          <DrawerClose
            render={
              <Button variant="ghost" size="icon" aria-label={`Close ${group.title}`} />
            }
          >
            <X aria-hidden="true" />
          </DrawerClose>
        </DrawerHeader>
        {sections.length > 1 && (
          <div className="config-section-tabs" data-base-ui-swipe-ignore>
            {sections.map((section) => (
              <Button
                key={section.id}
                size="sm"
                variant={section.id === selectedSection.id ? "secondary" : "ghost"}
                onClick={() => setSelectedSectionId(section.id)}
              >
                {section.title}
              </Button>
            ))}
          </div>
        )}
        <div className="nested-settings-scroll" data-base-ui-swipe-ignore>
          <ConfigTree
            section={selectedSection}
            value={selectedSection.value}
            path={[]}
            label={selectedSection.title}
            query={query}
            onChange={onChange}
            excludedKeys={selectedSection.excludedKeys}
            flat
          />
        </div>
        <DrawerFooter className="settings-drawer__footer">
          <Button variant="outline" onClick={onReset}>
            <RotateCcw aria-hidden="true" />
            Reset defaults
          </Button>
          <Button onClick={onApply} disabled={!hasPendingChanges}>
            Apply changes
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export const ConfigEditor = memo(function ConfigEditor({
  query,
  draft,
  isMobile,
  hasPendingChanges,
  onApply,
  onReset,
  onChange,
}: ConfigEditorProps) {
  const normalizedQuery = query.trim().toLowerCase();
  const sections = RUNTIME_CONFIG_SECTIONS.map((section) => ({
    ...section,
    value: draft[section.id] ?? section.value,
  }));
  const visibleGroups = CONFIG_GROUPS.map((group) => ({
    group,
    sections: sections.filter(
      (section) =>
        group.sectionIds.includes(section.id) &&
        matchesQuery(
          section.value,
          `${group.title} ${section.title} ${section.description}`,
          normalizedQuery,
        ),
    ),
  })).filter(({ sections: groupSections }) => groupSections.length > 0);

  if (visibleGroups.length === 0) {
    return <p className="config-empty">No settings match “{query}”.</p>;
  }

  return (
    <div className="config-sections" aria-label="Settings categories">
      {visibleGroups.map(({ group, sections: groupSections }) => (
        <ConfigGroupDrawer
          key={group.id}
          group={group}
          sections={groupSections}
          query={normalizedQuery}
          onChange={onChange}
          hasPendingChanges={hasPendingChanges}
          onApply={onApply}
          onReset={onReset}
          isMobile={isMobile}
        />
      ))}
    </div>
  );
});
