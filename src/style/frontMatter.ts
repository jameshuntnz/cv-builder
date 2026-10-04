import type { Diagnostic } from "../model";
import {
  ELEMENT_KEYS,
  emptyStyle,
  inRange,
  isCase,
  isColor,
  isElementKey,
  isFontKey,
  isMarker,
  LIMITS,
  type PageStyle,
  type Style,
  type TextStyle,
} from "./model";

/**
 * Styles travel at the top of the markdown, between `---` lines, one setting per line:
 *
 *     ---
 *     page.font: sourceSans
 *     section.case: upper
 *     name.color: #1f4e79
 *     ---
 *
 * Only settings that differ from the classic look are written. A line that can't be read is
 * reported and skipped, never guessed at.
 */

const PAGE_ORDER: (keyof PageStyle)[] = [
  "font",
  "size",
  "leading",
  "margin",
  "ink",
  "accent",
  "rule",
  "marker",
  "gap",
];
const TEXT_ORDER: (keyof TextStyle)[] = [
  "font",
  "size",
  "bold",
  "italic",
  "color",
  "case",
  "space",
];

function bool(v: string): boolean | undefined {
  return v === "true" ? true : v === "false" ? false : undefined;
}

function num(v: string, limits: { min: number; max: number }): number | undefined {
  const n = Number(v);
  return v.trim() !== "" && inRange(n, limits) ? n : undefined;
}

type PageNumber = "size" | "leading" | "margin" | "gap";

function isPageNumber(prop: string): prop is PageNumber {
  return prop === "size" || prop === "leading" || prop === "margin" || prop === "gap";
}

function setPage(page: PageStyle, prop: string, v: string): boolean {
  if (isPageNumber(prop)) {
    const n = num(v, LIMITS[prop]);
    if (n !== undefined) page[prop] = n;
    return n !== undefined;
  }
  switch (prop) {
    case "font":
      if (isFontKey(v)) page.font = v;
      return isFontKey(v);
    case "ink":
    case "accent":
      if (isColor(v)) page[prop] = v.toLowerCase();
      return isColor(v);
    case "marker":
      if (isMarker(v)) page.marker = v;
      return isMarker(v);
    case "rule": {
      const b = bool(v);
      if (b !== undefined) page.rule = b;
      return b !== undefined;
    }
    default:
      return false;
  }
}

function setText(text: TextStyle, prop: string, v: string): boolean {
  switch (prop) {
    case "font":
      if (isFontKey(v)) text.font = v;
      return isFontKey(v);
    case "color":
      if (isColor(v)) text.color = v.toLowerCase();
      return isColor(v);
    case "case":
      if (isCase(v)) text.case = v;
      return isCase(v);
    case "bold":
    case "italic": {
      const b = bool(v);
      if (b !== undefined) text[prop] = b;
      return b !== undefined;
    }
    case "size":
    case "space": {
      const n = num(v, LIMITS[prop]);
      if (n !== undefined) text[prop] = n;
      return n !== undefined;
    }
    default:
      return false;
  }
}

export interface FrontMatter {
  readonly style: Style;
  /** The markdown after the block, with the block's lines blanked so line numbers stay true. */
  readonly body: string;
  readonly diagnostics: Diagnostic[];
}

/** Read the style block off the top of the markdown, if there is one. */
export function readFrontMatter(md: string): FrontMatter {
  const lines = md.split("\n");
  const style = emptyStyle();
  const diagnostics: Diagnostic[] = [];
  if (lines[0]?.trim() !== "---") return { style, body: md, diagnostics };
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (end < 0) return { style, body: md, diagnostics };

  lines.slice(1, end).forEach((raw, i) => {
    const line = i + 2;
    const m = /^([a-z]+)\.([a-z]+):\s*(.*)$/i.exec(raw.trim());
    if (raw.trim() === "") return;
    const [, owner = "", prop = "", value = ""] = m ?? [];
    let ok = false;
    if (owner === "page") ok = setPage(style.page, prop, value.trim());
    else if (isElementKey(owner)) {
      const text = style.el[owner] ?? {};
      ok = setText(text, prop, value.trim());
      if (ok) style.el[owner] = text;
    }
    if (!ok)
      diagnostics.push({
        line,
        message: `Style line “${raw.trim()}” isn't a setting this app knows.`,
      });
  });
  const blanked = lines.map((l, i) => (i <= end ? "" : l));
  return { style, body: blanked.join("\n"), diagnostics };
}

/** The style block for a style, or nothing when it's the classic look. */
export function writeFrontMatter(style: Style): string {
  const out: string[] = [];
  for (const prop of PAGE_ORDER) {
    const v = style.page[prop];
    if (v !== undefined) out.push(`page.${prop}: ${String(v)}`);
  }
  for (const key of ELEMENT_KEYS) {
    const text: TextStyle | undefined = style.el[key];
    for (const prop of TEXT_ORDER) {
      const v = text?.[prop];
      if (v !== undefined) out.push(`${key}.${prop}: ${String(v)}`);
    }
  }
  return out.length === 0 ? "" : `---\n${out.join("\n")}\n---\n\n`;
}
