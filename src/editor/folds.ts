import { createContext } from "react";

/** Which sections and entries are expanded. Unset ids use the caller's default. */
export interface Folds {
  readonly isOpen: (id: string, fallback: boolean) => boolean;
  readonly setOpen: (id: string, open: boolean) => void;
}

export const FoldContext = createContext<Folds>({
  isOpen: (_id, fallback) => fallback,
  setOpen: () => undefined,
});

/** Folds backed by a plain record, as kept in component state. */
export function foldsFrom(
  state: Readonly<Record<string, boolean>>,
  update: (id: string, open: boolean) => void,
): Folds {
  return { isOpen: (id, fallback) => state[id] ?? fallback, setOpen: update };
}
