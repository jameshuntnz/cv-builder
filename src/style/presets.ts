import { emptyStyle, type Style } from "./model";

export interface Preset {
  readonly label: string;
  readonly description: string;
  readonly style: () => Style;
}

/** Starting points. Each replaces the whole style; anything can be changed from there. */
export const PRESETS: readonly Preset[] = [
  {
    label: "Classic",
    description: "Serif, all black, bold headings over a hairline.",
    style: emptyStyle,
  },
  {
    label: "Modern",
    description: "Sans, a navy accent, small capitals for headings.",
    style: () => ({
      page: { font: "sourceSans", size: 10.5, accent: "#1f4e79", leading: 1.2 },
      el: {
        name: { size: 22 },
        headline: { color: "#1f4e79" },
        section: { size: 11, case: "upper" },
        entry: { size: 11.5 },
      },
    }),
  },
  {
    label: "Minimal",
    description: "Lighter headings, no rules, dashes for bullets.",
    style: () => ({
      page: { rule: false, marker: "dash" },
      el: {
        name: { size: 20, bold: false },
        section: { bold: false, case: "smallcaps", size: 13 },
        entry: { bold: false, case: "none" },
      },
    }),
  },
];
