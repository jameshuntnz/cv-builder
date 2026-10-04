import { describe, expect, it } from "vitest";
import type { CV } from "../src/model";
import { parse } from "../src/parse";
import { SAMPLE } from "../src/sample";
import { serialize } from "../src/serialize";

/** The CV without ids and line numbers, which are allowed to differ between parses. */
function shape(cv: CV): unknown {
  return JSON.parse(
    JSON.stringify(cv, (k: string, v: unknown) => (k === "id" || k === "line" ? undefined : v)),
  );
}

describe("serialize", () => {
  it("round-trips the sample exactly", () => {
    expect(serialize(parse(SAMPLE))).toBe(SAMPLE);
  });

  it("round-trips a hidden section, paragraphs and entry bullets", () => {
    const md = `# A

## Summary <!-- hidden -->

Line one
line two

## Work

### Acme | acme.example
*Blurb.*
- One

**Role** | 2020
- Two
`;
    const cv = parse(md);
    expect(serialize(cv)).toBe(md);
    expect(shape(parse(serialize(cv)))).toEqual(shape(cv));
  });

  it("keeps fields readable when they are empty or contain separators", () => {
    const cv = parse("# X\n\n## S\n\n### A\n");
    const entry = cv.sections[0]?.entries[0];
    if (!entry) throw new Error("no entry");
    entry.name = "";
    entry.dates = "2020 | 2021";
    entry.roles.push({
      id: "r",
      line: 0,
      title: "",
      dates: "",
      bullets: [{ id: "b", line: 0, text: "  " }],
    });
    cv.contact.push({ id: "c", key: "", value: "x" });
    cv.sections[0]?.pairs.push({ id: "p", line: 0, key: "**", value: "y" });
    const md = serialize(cv);
    // Every awkward field still writes a line that reads back; the blank bullet is dropped.
    expect(md).toBe(
      [
        "# X",
        "",
        "**Contact:** x",
        "",
        "## S",
        "",
        "- **Label:** y",
        "",
        "### Untitled | 2020 / 2021",
        "",
        "** ** |",
        "",
      ].join("\n"),
    );
    const back = parse(md).sections[0]?.entries[0]?.roles[0];
    expect(back?.title).toBe("");
  });

  it("names an untitled section", () => {
    const cv = parse("# A\n## S");
    const s = cv.sections[0];
    if (s) s.title = " ";
    expect(serialize(cv)).toBe("# A\n\n## Untitled\n");
  });

  it("writes an empty CV as just a heading", () => {
    expect(serialize(parse(""))).toBe("#\n");
  });
});
