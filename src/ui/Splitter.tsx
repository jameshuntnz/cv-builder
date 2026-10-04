import { useRef, type ReactElement } from "react";

export interface SplitterProps {
  /** The paper pane's width now, and the range it can take, announced to screen readers. */
  readonly value: number;
  readonly min: number;
  readonly max: number;
  /** The paper pane's current width, read when a drag or key press starts. */
  readonly measure: () => number;
  readonly onResize: (width: number) => void;
  readonly onReset: () => void;
}

const STEP = 32;

/**
 * The divider between editor and paper. Drag it, or focus it and use the arrow keys;
 * double-click (or Home) puts it back to the default split.
 */
export function Splitter({
  value,
  min,
  max,
  measure,
  onResize,
  onReset,
}: SplitterProps): ReactElement {
  const drag = useRef<{ x: number; width: number } | null>(null);
  return (
    <div
      className="splitter"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the paper preview"
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={Math.max(min, Math.round(max))}
      aria-valuetext={`Paper ${String(Math.round(value))} pixels wide`}
      tabIndex={0}
      title="Drag to resize. Double-click to reset."
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, width: measure() };
      }}
      onPointerMove={(e) => {
        const start = drag.current;
        // The paper is on the right, so moving left widens it.
        if (start) onResize(start.width - (e.clientX - start.x));
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onResize(measure() + STEP);
        else if (e.key === "ArrowRight") onResize(measure() - STEP);
        else if (e.key === "Home") onReset();
        else return;
        e.preventDefault();
      }}
    />
  );
}
