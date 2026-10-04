import { useId, type ReactElement } from "react";
import { contrast, MIN_CONTRAST } from "./contrast";
import { inRange } from "./model";

interface Base<T> {
  readonly label: string;
  /** The setting as stored; undefined means the default is in use. */
  readonly value: T | undefined;
  /** What applies when nothing is set, shown in the control. */
  readonly fallback: T;
  readonly onChange: (value: T | undefined) => void;
}

function Labelled({
  id,
  label,
  children,
}: {
  readonly id: string;
  readonly label: string;
  readonly children: ReactElement;
}): ReactElement {
  return (
    <div className="setting">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

export function NumberSetting(
  props: Base<number> & {
    readonly unit: string;
    readonly limits: { min: number; max: number; step: number };
  },
): ReactElement {
  const id = useId();
  const { min, max, step } = props.limits;
  return (
    <Labelled id={id} label={props.label}>
      <span className="with-unit">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={props.value ?? props.fallback}
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            if (inRange(n, props.limits)) props.onChange(n);
          }}
        />
        <span aria-hidden="true">{props.unit}</span>
      </span>
    </Labelled>
  );
}

/** A colour, with a warning when text in it would be hard to read on white paper. */
export function ColorSetting(props: Base<string>): ReactElement {
  const id = useId();
  const shown = props.value ?? props.fallback;
  const ratio = contrast(shown, "#ffffff");
  return (
    <Labelled id={id} label={props.label}>
      <span className="with-unit">
        <input
          id={id}
          type="color"
          value={shown}
          onChange={(e) => {
            props.onChange(e.target.value.toLowerCase());
          }}
        />
        {ratio < MIN_CONTRAST && (
          <span className="warning" role="note">
            {`Hard to read: ${ratio.toFixed(1)}:1 on white, below ${String(MIN_CONTRAST)}:1.`}
          </span>
        )}
      </span>
    </Labelled>
  );
}

export function SelectSetting<T extends string>(
  props: Base<T> & {
    readonly options: Readonly<Record<T, string>>;
    readonly isValue: (x: string) => x is T;
    /** Offer "default" as its own choice, labelled with this text. */
    readonly defaultLabel?: string;
  },
): ReactElement {
  const id = useId();
  const entries = Object.entries<string>(props.options);
  return (
    <Labelled id={id} label={props.label}>
      <select
        id={id}
        value={props.value ?? (props.defaultLabel ? "" : props.fallback)}
        onChange={(e) => {
          const v = e.target.value;
          props.onChange(props.isValue(v) ? v : undefined);
        }}
      >
        {props.defaultLabel && <option value="">{props.defaultLabel}</option>}
        {entries.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </Labelled>
  );
}

export function ToggleSetting(props: Base<boolean>): ReactElement {
  const id = useId();
  return (
    <div className="setting setting-toggle">
      <input
        id={id}
        type="checkbox"
        checked={props.value ?? props.fallback}
        onChange={(e) => {
          props.onChange(e.target.checked);
        }}
      />
      <label htmlFor={id}>{props.label}</label>
    </div>
  );
}
