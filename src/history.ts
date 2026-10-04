import { produce } from "immer";
import type { CV } from "./model";
import { apply, type Action } from "./ops";

/** Undo history over immutable snapshots of the CV. */
export interface History {
  readonly past: readonly CV[];
  readonly present: CV;
  readonly future: readonly CV[];
  /** What the last edit touched, so a run of keystrokes in one field is one undo step. */
  readonly key: string | undefined;
  readonly at: number;
}

export const LIMIT = 200;
export const COALESCE_MS = 1000;

export function start(cv: CV): History {
  return { past: [], present: cv, future: [], key: undefined, at: 0 };
}

/** Typing into the same field coalesces; anything structural is its own step. */
export function coalesceKey(action: Action): string | undefined {
  switch (action.type) {
    case "setName":
      return "name";
    case "setHeadline":
      return "headline";
    case "replace":
      return "source";
    case "setContact":
    case "renameSection":
    case "updateEntry":
    case "updateRole":
    case "updatePair":
    case "setText":
      return `${action.type}:${action.id}`;
    case "setBullets":
      return `bullets:${action.ownerId}`;
    case "stylePage":
      return `style:page:${Object.keys(action.patch).join(",")}`;
    case "styleElement":
      return `style:${action.key}:${Object.keys(action.patch).join(",")}`;
    default:
      return undefined;
  }
}

export function record(h: History, action: Action, now: number): History {
  const next =
    action.type === "replace"
      ? action.cv
      : produce(h.present, (draft) => {
          apply(draft, action);
        });
  if (next === h.present) return h;
  const key = coalesceKey(action);
  if (key !== undefined && key === h.key && now - h.at < COALESCE_MS) {
    return { ...h, present: next, future: [], at: now };
  }
  return { past: [...h.past, h.present].slice(-LIMIT), present: next, future: [], key, at: now };
}

export function undo(h: History): History {
  const prev = h.past.at(-1);
  if (!prev) return h;
  return {
    past: h.past.slice(0, -1),
    present: prev,
    future: [h.present, ...h.future],
    key: undefined,
    at: 0,
  };
}

export function redo(h: History): History {
  const [next, ...rest] = h.future;
  if (!next) return h;
  return { past: [...h.past, h.present], present: next, future: rest, key: undefined, at: 0 };
}
