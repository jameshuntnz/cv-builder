import type { CSSProperties } from "react";
import {
  FONTS,
  isElementKey,
  MARKERS,
  type Case,
  type ElementKey,
  type Style,
  type TextStyle,
} from "./model";

const TRANSFORM: Record<Case, string> = { none: "none", upper: "uppercase", smallcaps: "none" };

function elementVars(key: ElementKey, s: TextStyle): CSSProperties {
  const vars: CSSProperties = {};
  const v = (name: string, value: string): void => {
    vars[`--cv-${key}-${name}`] = value;
  };
  if (s.font) v("font", FONTS[s.font].stack);
  if (s.size !== undefined) v("size", `${String(s.size)}pt`);
  if (s.bold !== undefined) v("weight", s.bold ? "700" : "400");
  if (s.italic !== undefined) v("style", s.italic ? "italic" : "normal");
  if (s.color) v("color", s.color);
  if (s.case) {
    v("transform", TRANSFORM[s.case]);
    v("caps", s.case === "smallcaps" ? "all-small-caps" : "normal");
    v("tracking", s.case === "none" ? "normal" : "0.04em");
  }
  if (s.space !== undefined) v("space", `${String(s.space)}pt`);
  return vars;
}

/**
 * The style as CSS custom properties for a page. Only what's set is emitted; cv.css falls back
 * to the classic template for the rest, so an empty style changes nothing.
 */
export function styleVars(style: Style): CSSProperties {
  const p = style.page;
  const vars: CSSProperties = {};
  if (p.font) vars["--cv-font"] = FONTS[p.font].stack;
  if (p.size !== undefined) vars["--cv-size"] = `${String(p.size)}pt`;
  if (p.leading !== undefined) vars["--cv-leading"] = String(p.leading);
  if (p.margin !== undefined) vars["--cv-margin"] = `${String(p.margin)}cm`;
  if (p.ink) vars["--cv-ink"] = p.ink;
  if (p.accent) vars["--cv-accent"] = p.accent;
  if (p.rule !== undefined) vars["--cv-rule-width"] = p.rule ? "0.5pt" : "0";
  if (p.marker) vars["--cv-marker"] = MARKERS[p.marker].content;
  if (p.gap !== undefined) vars["--cv-gap"] = `${String(p.gap)}pt`;
  for (const [key, s] of Object.entries(style.el)) {
    if (isElementKey(key)) Object.assign(vars, elementVars(key, s));
  }
  return vars;
}
