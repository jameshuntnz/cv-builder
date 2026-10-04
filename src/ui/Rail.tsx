import type { ReactElement } from "react";

/** The strip a hidden panel leaves at the edge of the window; clicking it brings it back. */
export function Rail({
  side,
  label,
  onShow,
}: {
  readonly side: "left" | "right";
  readonly label: string;
  readonly onShow: () => void;
}): ReactElement {
  return (
    <button type="button" className={`rail rail-${side}`} onClick={onShow} title={label}>
      <span aria-hidden="true">{side === "left" ? "›" : "‹"}</span>
      <span className="rail-text">{label}</span>
    </button>
  );
}

/** The "Hide" button in a panel's title row. */
export function HidePanel({
  label,
  onHide,
}: {
  readonly label: string;
  readonly onHide: () => void;
}): ReactElement {
  return (
    <button type="button" className="hide-panel" aria-label={label} title={label} onClick={onHide}>
      Hide
    </button>
  );
}
