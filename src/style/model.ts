/**
 * How the CV looks. Everything is optional: an empty style is the classic look, and only
 * what someone changes is stored (see frontMatter.ts), so a CV carries its own styling into
 * share links and saved files.
 */

export type FontKey =
  "charter" | "charis" | "sourceSans" | "georgia" | "palatino" | "helvetica" | "times";

export interface FontChoice {
  readonly label: string;
  readonly stack: string;
  /** Shipped with the app, so it looks the same on every device and in every PDF. */
  readonly bundled: boolean;
}

export const FONTS: Readonly<Record<FontKey, FontChoice>> = {
  charter: { label: "Charter (serif)", stack: '"CV Charter", Georgia, serif', bundled: true },
  charis: { label: "Charis (serif)", stack: '"Charis SIL", Georgia, serif', bundled: true },
  sourceSans: {
    label: "Source Sans (sans)",
    stack: '"Source Sans 3", "Helvetica Neue", Arial, sans-serif',
    bundled: true,
  },
  georgia: { label: "Georgia", stack: "Georgia, serif", bundled: false },
  palatino: {
    label: "Palatino",
    stack: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
    bundled: false,
  },
  helvetica: {
    label: "Helvetica / Arial",
    stack: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    bundled: false,
  },
  times: { label: "Times", stack: '"Times New Roman", Times, serif', bundled: false },
};

export type Case = "none" | "upper" | "smallcaps";
export type Marker = "bullet" | "dash" | "arrow" | "none";

export const MARKERS: Readonly<Record<Marker, { label: string; content: string }>> = {
  bullet: { label: "• Bullet", content: '"•"' },
  dash: { label: "– Dash", content: '"–"' },
  arrow: { label: "▸ Arrow", content: '"▸"' },
  none: { label: "None", content: '""' },
};

/** The printed parts of a CV, each styled on its own. */
export type ElementKey =
  | "name"
  | "headline"
  | "contact"
  | "extra"
  | "section"
  | "entry"
  | "blurb"
  | "role"
  | "dates"
  | "bullet"
  | "text";

export interface TextStyle {
  font?: FontKey;
  /** Points. */
  size?: number;
  bold?: boolean;
  italic?: boolean;
  /** `#rrggbb`. */
  color?: string;
  case?: Case;
  /** Points of space above; only for the parts that have it. */
  space?: number;
}

export interface PageStyle {
  font?: FontKey;
  /** Body size in points. */
  size?: number;
  /** Line height as a multiple of the font size. */
  leading?: number;
  /** Page margins in centimetres. */
  margin?: number;
  /** Text colour, `#rrggbb`. */
  ink?: string;
  /** Section heading rules and the name, `#rrggbb`. */
  accent?: string;
  /** The hairline under section headings. */
  rule?: boolean;
  marker?: Marker;
  /** Points between bullets. */
  gap?: number;
}

export interface Style {
  page: PageStyle;
  el: Partial<Record<ElementKey, TextStyle>>;
}

export function emptyStyle(): Style {
  return { page: {}, el: {} };
}

/** What each part looks like when nothing is set: the classic template. Shown in the panel. */
export const ELEMENTS: Readonly<
  Record<
    ElementKey,
    {
      label: string;
      defaults: Required<Omit<TextStyle, "font" | "color" | "space">>;
      space?: number;
    }
  >
> = {
  name: { label: "Name", defaults: { size: 17, bold: true, italic: false, case: "none" } },
  headline: { label: "Headline", defaults: { size: 13, bold: false, italic: false, case: "none" } },
  contact: {
    label: "Contact line",
    defaults: { size: 9.5, bold: false, italic: false, case: "none" },
  },
  extra: { label: "Extra line", defaults: { size: 10, bold: false, italic: true, case: "none" } },
  section: {
    label: "Section headings",
    defaults: { size: 12, bold: true, italic: false, case: "none" },
    space: 13,
  },
  entry: {
    label: "Employers and projects",
    defaults: { size: 11, bold: true, italic: false, case: "none" },
    space: 8,
  },
  blurb: {
    label: "Descriptions",
    defaults: { size: 9.5, bold: false, italic: true, case: "none" },
  },
  role: {
    label: "Job titles",
    defaults: { size: 10, bold: false, italic: true, case: "none" },
    space: 7,
  },
  dates: { label: "Dates", defaults: { size: 10, bold: false, italic: false, case: "none" } },
  bullet: { label: "Bullets", defaults: { size: 10, bold: false, italic: false, case: "none" } },
  text: {
    label: "Paragraphs and skills",
    defaults: { size: 10, bold: false, italic: false, case: "none" },
  },
};

export const ELEMENT_KEYS = Object.keys(ELEMENTS).filter(isElementKey);

export const PAGE_DEFAULTS: Required<PageStyle> = {
  font: "charter",
  size: 10,
  leading: 1.4,
  margin: 1.27,
  ink: "#1a1a1a",
  accent: "#1a1a1a",
  rule: true,
  marker: "bullet",
  gap: 4.28,
};

/** The ranges the panel offers, and what a parsed file is held to. */
export const LIMITS = {
  size: { min: 6, max: 40, step: 0.5 },
  leading: { min: 0.9, max: 2, step: 0.01 },
  margin: { min: 0.5, max: 3, step: 0.05 },
  gap: { min: 0, max: 14, step: 0.2 },
  space: { min: 0, max: 30, step: 0.5 },
};

export function isFontKey(x: unknown): x is FontKey {
  return typeof x === "string" && Object.hasOwn(FONTS, x);
}

export function isMarker(x: unknown): x is Marker {
  return typeof x === "string" && Object.hasOwn(MARKERS, x);
}

export function isCase(x: unknown): x is Case {
  return x === "none" || x === "upper" || x === "smallcaps";
}

export function isElementKey(x: unknown): x is ElementKey {
  return typeof x === "string" && Object.hasOwn(ELEMENTS, x);
}

export function isColor(x: unknown): x is string {
  return typeof x === "string" && /^#[0-9a-f]{6}$/i.test(x);
}

export function inRange(n: number, { min, max }: { min: number; max: number }): boolean {
  return Number.isFinite(n) && n >= min && n <= max;
}

/** A style with nothing left empty, for comparing and saving. */
export function isEmptyStyle(style: Style): boolean {
  return (
    Object.keys(style.page).length === 0 &&
    Object.values(style.el).every((e) => Object.keys(e).length === 0)
  );
}
