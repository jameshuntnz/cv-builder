import type { UniqueIdentifier } from "@dnd-kit/core";

/** The parts of a dnd-kit drag-end event a drop needs. */
interface Drop {
  readonly active: { readonly id: UniqueIdentifier };
  readonly over: { readonly id: UniqueIdentifier } | null;
}

/** Turn a finished drag into a move, ignoring drops outside the list or onto itself. */
export function dropHandler(onMove: (id: string, overId: string) => void): (e: Drop) => void {
  return ({ active, over }) => {
    if (over && active.id !== over.id) onMove(String(active.id), String(over.id));
  };
}
