import type { ReactElement } from "react";
import { Fold } from "../editor/Fold";
import type { Action } from "../ops";
import {
  ELEMENT_KEYS,
  ELEMENTS,
  FONTS,
  isCase,
  isFontKey,
  isMarker,
  LIMITS,
  MARKERS,
  PAGE_DEFAULTS,
  type Case,
  type ElementKey,
  type FontChoice,
  type FontKey,
  type Marker,
  type Style,
} from "./model";
import { PRESETS } from "./presets";
import { ColorSetting, NumberSetting, SelectSetting, ToggleSetting } from "./settings";

export interface StylePanelProps {
  readonly style: Style;
  readonly dispatch: (action: Action) => void;
}

function fontLabel(f: FontChoice): string {
  return f.bundled ? f.label : `${f.label} (varies by device)`;
}

const fontLabels: Record<FontKey, string> = {
  charter: fontLabel(FONTS.charter),
  charis: fontLabel(FONTS.charis),
  sourceSans: fontLabel(FONTS.sourceSans),
  georgia: fontLabel(FONTS.georgia),
  palatino: fontLabel(FONTS.palatino),
  helvetica: fontLabel(FONTS.helvetica),
  times: fontLabel(FONTS.times),
};
const CASES: Record<Case, string> = {
  none: "As typed",
  upper: "UPPERCASE",
  smallcaps: "Small caps",
};
const MARKER_LABELS: Record<Marker, string> = {
  bullet: MARKERS.bullet.label,
  dash: MARKERS.dash.label,
  arrow: MARKERS.arrow.label,
  none: MARKERS.none.label,
};

function GroupHead({
  label,
  changed,
  onReset,
}: {
  readonly label: string;
  readonly changed: boolean;
  readonly onReset: () => void;
}): ReactElement {
  return (
    <>
      <span className="style-group">
        <strong>{label}</strong>
        {changed && <span className="muted"> · changed</span>}
      </span>
      {changed && (
        <button
          type="button"
          className="hide-panel"
          aria-label={`Reset ${label}`}
          onClick={onReset}
        >
          Reset
        </button>
      )}
    </>
  );
}

function PageGroup({ style, dispatch }: StylePanelProps): ReactElement {
  const p = style.page;
  const set = (patch: Parameters<typeof stylePage>[0]): void => {
    dispatch(stylePage(patch));
  };
  return (
    <Fold
      id="style-page"
      label="Page"
      defaultOpen
      className="style-fold"
      head={
        <GroupHead
          label="Page"
          changed={Object.keys(p).length > 0}
          onReset={() => {
            dispatch({ type: "resetStyle", key: "page" });
          }}
        />
      }
    >
      <div className="settings">
        <SelectSetting
          label="Typeface"
          value={p.font}
          fallback={PAGE_DEFAULTS.font}
          options={fontLabels}
          isValue={isFontKey}
          onChange={(font) => {
            set({ font });
          }}
        />
        <NumberSetting
          label="Text size"
          unit="pt"
          limits={LIMITS.size}
          value={p.size}
          fallback={PAGE_DEFAULTS.size}
          onChange={(size) => {
            set({ size });
          }}
        />
        <NumberSetting
          label="Line spacing"
          unit="×"
          limits={LIMITS.leading}
          value={p.leading}
          fallback={PAGE_DEFAULTS.leading}
          onChange={(leading) => {
            set({ leading });
          }}
        />
        <NumberSetting
          label="Margins"
          unit="cm"
          limits={LIMITS.margin}
          value={p.margin}
          fallback={PAGE_DEFAULTS.margin}
          onChange={(margin) => {
            set({ margin });
          }}
        />
        <ColorSetting
          label="Text colour"
          value={p.ink}
          fallback={PAGE_DEFAULTS.ink}
          onChange={(ink) => {
            set({ ink });
          }}
        />
        <ColorSetting
          label="Accent colour"
          value={p.accent}
          fallback={p.ink ?? PAGE_DEFAULTS.accent}
          onChange={(accent) => {
            set({ accent });
          }}
        />
        <SelectSetting
          label="Bullet marker"
          value={p.marker}
          fallback={PAGE_DEFAULTS.marker}
          options={MARKER_LABELS}
          isValue={isMarker}
          onChange={(marker) => {
            set({ marker });
          }}
        />
        <NumberSetting
          label="Space between bullets"
          unit="pt"
          limits={LIMITS.gap}
          value={p.gap}
          fallback={PAGE_DEFAULTS.gap}
          onChange={(gap) => {
            set({ gap });
          }}
        />
        <ToggleSetting
          label="Rule under section headings"
          value={p.rule}
          fallback={PAGE_DEFAULTS.rule}
          onChange={(rule) => {
            set({ rule });
          }}
        />
      </div>
    </Fold>
  );
}

function stylePage(patch: Extract<Action, { type: "stylePage" }>["patch"]): Action {
  return { type: "stylePage", patch };
}

function ElementGroup({
  k,
  style,
  dispatch,
}: StylePanelProps & { readonly k: ElementKey }): ReactElement {
  const meta = ELEMENTS[k];
  const s = style.el[k] ?? {};
  const set = (patch: Extract<Action, { type: "styleElement" }>["patch"]): void => {
    dispatch({ type: "styleElement", key: k, patch });
  };
  const ink = style.page.ink ?? PAGE_DEFAULTS.ink;
  const inheritsAccent = k === "name" || k === "section";
  return (
    <Fold
      id={`style-${k}`}
      label={meta.label}
      defaultOpen={false}
      className="style-fold"
      head={
        <GroupHead
          label={meta.label}
          changed={Object.keys(s).length > 0}
          onReset={() => {
            dispatch({ type: "resetStyle", key: k });
          }}
        />
      }
    >
      <div className="settings">
        <SelectSetting
          label="Typeface"
          value={s.font}
          fallback={style.page.font ?? PAGE_DEFAULTS.font}
          options={fontLabels}
          isValue={isFontKey}
          defaultLabel="Same as the page"
          onChange={(font) => {
            set({ font });
          }}
        />
        <NumberSetting
          label="Size"
          unit="pt"
          limits={LIMITS.size}
          value={s.size}
          fallback={meta.defaults.size}
          onChange={(size) => {
            set({ size });
          }}
        />
        <ColorSetting
          label="Colour"
          value={s.color}
          fallback={(inheritsAccent ? style.page.accent : undefined) ?? ink}
          onChange={(color) => {
            set({ color });
          }}
        />
        <SelectSetting
          label="Letters"
          value={s.case}
          fallback={meta.defaults.case}
          options={CASES}
          isValue={isCase}
          onChange={(c) => {
            set({ case: c });
          }}
        />
        {meta.space !== undefined && (
          <NumberSetting
            label="Space above"
            unit="pt"
            limits={LIMITS.space}
            value={s.space}
            fallback={meta.space}
            onChange={(space) => {
              set({ space });
            }}
          />
        )}
        <ToggleSetting
          label="Bold"
          value={s.bold}
          fallback={meta.defaults.bold}
          onChange={(bold) => {
            set({ bold });
          }}
        />
        <ToggleSetting
          label="Italic"
          value={s.italic}
          fallback={meta.defaults.italic}
          onChange={(italic) => {
            set({ italic });
          }}
        />
      </div>
    </Fold>
  );
}

/** Every part of the CV's look. Changes are part of the CV: saved, undoable and shared. */
export function StylePanel(props: StylePanelProps): ReactElement {
  return (
    <div className="style-panel">
      <section className="card" aria-label="Presets">
        <h2 className="card-title">Start from</h2>
        <div className="presets">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="preset"
              onClick={() => {
                props.dispatch({ type: "setStyle", style: preset.style() });
              }}
            >
              <strong>{preset.label}</strong>
              <span className="muted">{preset.description}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="card" aria-label="Page style">
        <PageGroup {...props} />
      </section>
      <section className="card" aria-label="Parts of the CV">
        <h2 className="card-title">Each part</h2>
        {ELEMENT_KEYS.map((k) => (
          <ElementGroup key={k} k={k} {...props} />
        ))}
      </section>
    </div>
  );
}
