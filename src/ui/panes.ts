import { useEffect, useState } from "react";
import type { KeyValue } from "../store";

/** How the viewer last arranged the panes. A per-browser convenience, never part of a CV. */
export interface Panes {
  readonly outlineShown: boolean;
  readonly paperShown: boolean;
  /** Paper pane width in px, or null for the default share. */
  readonly paperWidth: number | null;
}

const KEY = "cv-builder:panes";
export const DEFAULT_PANES: Panes = { outlineShown: true, paperShown: true, paperWidth: null };

export function readPanes(storage: KeyValue): Panes {
  try {
    const data: unknown = JSON.parse(storage.getItem(KEY) ?? "null");
    if (typeof data !== "object" || data === null) return DEFAULT_PANES;
    const flag = (value: unknown): boolean => (typeof value === "boolean" ? value : true);
    return {
      outlineShown: flag("outlineShown" in data ? data.outlineShown : undefined),
      paperShown: flag("paperShown" in data ? data.paperShown : undefined),
      paperWidth:
        "paperWidth" in data && typeof data.paperWidth === "number" ? data.paperWidth : null,
    };
  } catch {
    return DEFAULT_PANES;
  }
}

/** Pane layout, remembered in this browser. */
export function usePanes(storage: KeyValue): [Panes, (change: Partial<Panes>) => void] {
  const [panes, setPanes] = useState(() => readPanes(storage));
  useEffect(() => {
    try {
      storage.setItem(KEY, JSON.stringify(panes));
    } catch {
      // Not remembering a pane width is fine.
    }
  }, [panes, storage]);
  return [
    panes,
    (change) => {
      setPanes((p) => ({ ...p, ...change }));
    },
  ];
}

/** Keep a pane width between a usable minimum and what leaves the editor room. */
export function clampWidth(width: number, viewport: number): number {
  const max = Math.max(MIN_PAPER, viewport - 560);
  return Math.round(Math.min(Math.max(width, MIN_PAPER), max));
}

export const MIN_PAPER = 320;
