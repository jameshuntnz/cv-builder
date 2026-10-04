import { produce } from "immer";
import { describe, expect, it } from "vitest";
import { coalesceKey, record, start } from "../src/history";
import { apply, type Action } from "../src/ops";
import { parse } from "../src/parse";
import { SAMPLE } from "../src/sample";
import { serialize } from "../src/serialize";
import { contrast, luminance } from "../src/style/contrast";
import { readFrontMatter, writeFrontMatter } from "../src/style/frontMatter";
import { emptyStyle, isEmptyStyle, type Style } from "../src/style/model";
import { PRESETS } from "../src/style/presets";
import { styleVars } from "../src/style/vars";

const FULL: Style = {
  page: {
    font: "sourceSans",
    size: 10.5,
    leading: 1.3,
    margin: 2,
    ink: "#222222",
    accent: "#1f4e79",
    rule: false,
    marker: "dash",
    gap: 5,
  },
  el: {
    name: { font: "georgia", size: 22, bold: false, italic: true, color: "#112233", case: "upper" },
    section: { case: "smallcaps", space: 18 },
    bullet: { size: 9 },
  },
};

describe("style front matter", () => {
  it("writes nothing for the classic look", () => {
    expect(writeFrontMatter(emptyStyle())).toBe("");
    expect(serialize(parse(SAMPLE))).toBe(SAMPLE);
  });

  it("writes every setting in a fixed order and reads it back the same", () => {
    const block = writeFrontMatter(FULL);
    expect(block.split("\n")).toEqual([
      "---",
      "page.font: sourceSans",
      "page.size: 10.5",
      "page.leading: 1.3",
      "page.margin: 2",
      "page.ink: #222222",
      "page.accent: #1f4e79",
      "page.rule: false",
      "page.marker: dash",
      "page.gap: 5",
      "name.font: georgia",
      "name.size: 22",
      "name.bold: false",
      "name.italic: true",
      "name.color: #112233",
      "name.case: upper",
      "section.case: smallcaps",
      "section.space: 18",
      "bullet.size: 9",
      "---",
      "",
      "",
    ]);
    const back = readFrontMatter(block + "# A\n");
    expect(back.style).toEqual(FULL);
    expect(back.diagnostics).toEqual([]);
  });

  it("round-trips a styled CV through markdown", () => {
    const cv = parse(SAMPLE);
    cv.style = FULL;
    const md = serialize(cv);
    expect(md.startsWith("---\npage.font: sourceSans\n")).toBe(true);
    expect(parse(md).style).toEqual(FULL);
    expect(serialize(parse(md))).toBe(md);
  });

  it("keeps line numbers true below the block", () => {
    const cv = parse("---\nname.size: 20\n---\n\n# A\n## Work\n");
    expect(cv.name).toBe("A");
    expect(cv.sections[0]?.line).toBe(6);
  });

  it("reports and skips settings it can't read, never guessing", () => {
    const md = [
      "---",
      "page.font: comic",
      "page.size: 2",
      "page.size: big",
      "page.ink: red",
      "page.rule: yes",
      "page.marker: star",
      "page.colour: #000000",
      "logo.size: 10",
      "name.size: 41",
      "name.case: title",
      "name.bold: maybe",
      "name.color: #12345",
      "name.weight: 700",
      "nonsense",
      "",
      "name.size: 18",
      "---",
      "# A",
    ].join("\n");
    const { style, diagnostics } = readFrontMatter(md);
    expect(style).toEqual({ page: {}, el: { name: { size: 18 } } });
    expect(diagnostics.map((d) => d.line)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
    expect(diagnostics[0]?.message).toBe(
      "Style line “page.font: comic” isn't a setting this app knows.",
    );
  });

  it("leaves markdown without a closed block alone", () => {
    expect(readFrontMatter("---\nname.size: 20\n# A").style).toEqual(emptyStyle());
    expect(parse("---\nname.size: 20\n# A").name).toBe("A");
    expect(readFrontMatter("# A\n---\n").body).toBe("# A\n---\n");
  });

  it("lowercases colours", () => {
    expect(readFrontMatter("---\npage.ink: #ABCDEF\nname.color: #FF0000\n---\n").style).toEqual({
      page: { ink: "#abcdef" },
      el: { name: { color: "#ff0000" } },
    });
  });
});

describe("styleVars", () => {
  it("emits nothing for the classic look", () => {
    expect(styleVars(emptyStyle())).toEqual({});
  });

  it("maps every setting to the custom property cv.css reads", () => {
    expect(styleVars(FULL)).toEqual({
      "--cv-font": '"Source Sans 3", "Helvetica Neue", Arial, sans-serif',
      "--cv-size": "10.5pt",
      "--cv-leading": "1.3",
      "--cv-margin": "2cm",
      "--cv-ink": "#222222",
      "--cv-accent": "#1f4e79",
      "--cv-rule-width": "0",
      "--cv-marker": '"–"',
      "--cv-gap": "5pt",
      "--cv-name-font": "Georgia, serif",
      "--cv-name-size": "22pt",
      "--cv-name-weight": "400",
      "--cv-name-style": "italic",
      "--cv-name-color": "#112233",
      "--cv-name-transform": "uppercase",
      "--cv-name-caps": "normal",
      "--cv-name-tracking": "0.04em",
      "--cv-section-transform": "none",
      "--cv-section-caps": "all-small-caps",
      "--cv-section-tracking": "0.04em",
      "--cv-section-space": "18pt",
      "--cv-bullet-size": "9pt",
    });
  });

  it("covers the remaining switches", () => {
    const vars = styleVars({
      page: { rule: true },
      el: { role: { bold: true, italic: false, case: "none" } },
    });
    expect(vars).toEqual({
      "--cv-rule-width": "0.5pt",
      "--cv-role-weight": "700",
      "--cv-role-style": "normal",
      "--cv-role-transform": "none",
      "--cv-role-caps": "normal",
      "--cv-role-tracking": "normal",
    });
  });
});

describe("contrast", () => {
  it("matches the WCAG formula at the ends and in between", () => {
    expect(luminance("#ffffff")).toBeCloseTo(1);
    expect(luminance("#000000")).toBe(0);
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21);
    expect(contrast("#ffffff", "#ffffff")).toBe(1);
    expect(contrast("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });
});

describe("presets", () => {
  it("each survives a trip through markdown unchanged", () => {
    for (const preset of PRESETS) {
      const style = preset.style();
      expect(readFrontMatter(writeFrontMatter(style) + "# A").style, preset.label).toEqual(style);
    }
    expect(PRESETS.map((p) => p.label)).toEqual(["Classic", "Modern", "Minimal"]);
    expect(isEmptyStyle(PRESETS[0]?.style() ?? FULL)).toBe(true);
    expect(isEmptyStyle({ page: {}, el: { name: {} } })).toBe(true);
    expect(isEmptyStyle({ page: {}, el: { name: { size: 12 } } })).toBe(false);
    expect(isEmptyStyle(FULL)).toBe(false);
  });
});

describe("style edits", () => {
  const run = (style: Style, ...actions: Action[]): Style =>
    actions.reduce((acc, action) => {
      const cv = produce({ ...parse("# A"), style: acc }, (d) => {
        apply(d, action);
      });
      return cv.style;
    }, style);

  it("sets and clears page and element settings, dropping emptied parts", () => {
    const style = run(
      emptyStyle(),
      { type: "stylePage", patch: { font: "times", size: 11 } },
      { type: "styleElement", key: "name", patch: { size: 20 } },
      { type: "styleElement", key: "bullet", patch: { bold: true } },
      { type: "stylePage", patch: { size: undefined } },
      { type: "styleElement", key: "bullet", patch: { bold: undefined } },
    );
    expect(style).toEqual({ page: { font: "times" }, el: { name: { size: 20 } } });
  });

  it("resets a part or the page, and replaces the whole style", () => {
    expect(run(FULL, { type: "resetStyle", key: "name" }).el).toEqual({
      section: { case: "smallcaps", space: 18 },
      bullet: { size: 9 },
    });
    expect(run(FULL, { type: "resetStyle", key: "page" }).page).toEqual({});
    expect(run(FULL, { type: "setStyle", style: emptyStyle() })).toEqual(emptyStyle());
  });

  it("coalesces repeated changes to one setting into one undo step", () => {
    expect(coalesceKey({ type: "stylePage", patch: { size: 11 } })).toBe("style:page:size");
    expect(coalesceKey({ type: "styleElement", key: "name", patch: { color: "#000000" } })).toBe(
      "style:name:color",
    );
    const h1 = record(start(parse("# A")), { type: "stylePage", patch: { size: 11 } }, 0);
    const h2 = record(h1, { type: "stylePage", patch: { size: 12 } }, 100);
    expect(h2.past).toHaveLength(1);
    expect(h2.present.style.page.size).toBe(12);
  });
});
