import type { CV } from "../model";
import type { Action } from "../ops";

/** Style edits: set or clear settings, reset a part, or swap the whole style (presets). */

/** Set or clear each setting in `patch` on `target`. */
function applyPatch(target: object, patch: object): void {
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) Reflect.deleteProperty(target, key);
    else Reflect.set(target, key, value);
  }
}

export type StyleAction = Extract<
  Action,
  { type: "stylePage" | "styleElement" | "setStyle" | "resetStyle" }
>;

export function isStyleAction(action: Action): action is StyleAction {
  return (
    action.type === "stylePage" ||
    action.type === "styleElement" ||
    action.type === "setStyle" ||
    action.type === "resetStyle"
  );
}

export function applyStyle(cv: CV, action: StyleAction): void {
  switch (action.type) {
    case "stylePage":
      applyPatch(cv.style.page, action.patch);
      return;
    case "styleElement": {
      const el = cv.style.el[action.key] ?? {};
      applyPatch(el, action.patch);
      if (Object.keys(el).length > 0) cv.style.el[action.key] = el;
      else Reflect.deleteProperty(cv.style.el, action.key);
      return;
    }
    case "setStyle":
      cv.style = action.style;
      return;
    case "resetStyle":
      if (action.key === "page") cv.style.page = {};
      else Reflect.deleteProperty(cv.style.el, action.key);
      return;
  }
}
