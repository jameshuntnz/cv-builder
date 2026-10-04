import { useEffect, useState, type RefObject } from "react";

/** The parts of `document.fonts` the app listens to. */
export interface FontsLike {
  readonly ready: Promise<unknown>;
  addEventListener(type: "loadingdone", listener: () => void): void;
  removeEventListener(type: "loadingdone", listener: () => void): void;
}

/** Bumps whenever web fonts finish loading, since that changes every measurement. */
export function useFontsVersion(fonts?: FontsLike): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!fonts) return;
    const bump = (): void => {
      setVersion((v) => v + 1);
    };
    void fonts.ready.then(bump);
    fonts.addEventListener("loadingdone", bump);
    return () => {
      fonts.removeEventListener("loadingdone", bump);
    };
  }, [fonts]);
  return version;
}

/** The element's content width, kept current as it resizes. */
export function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setWidth(el.clientWidth);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [ref]);
  return width;
}

/** Cmd/Ctrl+Z to undo, Shift+Cmd/Ctrl+Z or Ctrl+Y to redo, anywhere in the page. */
export function useUndoKeys(undo: () => void, redo: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) undo();
      else if ((key === "z" && e.shiftKey) || key === "y") redo();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
    };
  }, [undo, redo]);
}
