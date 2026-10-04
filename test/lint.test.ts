import { describe, expect, it } from "vitest";
import { lint } from "../src/lint";
import { parse } from "../src/parse";
import { SAMPLE } from "../src/sample";

describe("lint", () => {
  it("has nothing to say about the sample", () => {
    expect(lint(parse(SAMPLE))).toEqual([]);
  });

  it("flags a missing name and email", () => {
    expect(lint(parse("## S")).map((n) => n.ref)).toEqual(["name", "contact"]);
  });

  it("flags long, -ing, first-person and bold bullets, and repeated openers", () => {
    const long = Array.from({ length: 31 }, () => "word").join(" ");
    const md = `# A\n**Email:** a@b.c\n## S\n- ${long}\n### E\n- Building things\n- I fixed **it**\n**R** | 2020\n- Building more`;
    const messages = lint(parse(md)).map((n) => n.message);
    expect(messages.some((m) => m.startsWith("31 words"))).toBe(true);
    expect(messages.filter((m) => m.includes("Building"))).toHaveLength(2);
    expect(messages.some((m) => m.includes("pronouns"))).toBe(true);
    expect(messages.some((m) => m.includes("Bold"))).toBe(true);
    expect(messages.some((m) => m.includes("already opens"))).toBe(true);
  });

  it("passes on parser diagnostics and ignores hidden sections", () => {
    const notes = lint(parse("# A\n**Email:** a@b.c\nstray\n## S <!-- hidden -->\n- I did"));
    expect(notes.map((n) => [n.ref, n.line])).toEqual([[undefined, 3]]);
  });

  it("ignores empty bullets", () => {
    const cv = parse("# A\n**Email:** a@b.c\n## S\n### E\n- x");
    const b = cv.sections[0]?.entries[0]?.bullets[0];
    if (b) b.text = "";
    expect(lint(cv)).toEqual([]);
  });
});
