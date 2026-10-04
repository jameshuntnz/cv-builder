import { useId, type ReactElement } from "react";

export interface FieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly editRef?: string;
  readonly className?: string;
  readonly list?: string;
  /** Keep the label for screen readers only; the placeholder carries it visually. */
  readonly hideLabel?: boolean;
}

/** A labelled plain-text input. */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  editRef,
  className,
  list,
  hideLabel,
}: FieldProps): ReactElement {
  const id = useId();
  return (
    <label
      className={className ? `field ${className}` : "field"}
      htmlFor={id}
      data-edit-ref={editRef}
    >
      <span className={hideLabel ? "field-label sr-only" : "field-label"}>{label}</span>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        list={list}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
    </label>
  );
}

export interface ActionProps {
  readonly label: string;
  readonly onClick: () => void;
  readonly children: string;
  readonly className?: string;
  readonly pressed?: boolean;
}

/** A small text button; `label` is the accessible name when the text alone is ambiguous. */
export function Action({
  label,
  onClick,
  children,
  className,
  pressed,
}: ActionProps): ReactElement {
  return (
    <button
      type="button"
      className={className ? `act ${className}` : "act"}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
