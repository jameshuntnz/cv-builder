import { describe, expect, it } from "vitest";
import { parse, splitHeading, stripComments } from "../src/parse";
import { shape } from "./support/shape";

describe("splitHeading", () => {
  it("splits name, place, dates and link", () => {
    expect(splitHeading("Acme – Wellington, NZ | 2020–2022 | acme.example")).toEqual({
      name: "Acme",
      location: "Wellington, NZ",
      dates: "2020–2022",
      link: "acme.example",
    });
  });

  it("accepts em dashes and hyphens, and a link in place of dates", () => {
    expect(splitHeading("Acme — Remote | https://acme.example")).toEqual({
      name: "Acme",
      location: "Remote",
      dates: "",
      link: "https://acme.example",
    });
    expect(splitHeading("Acme - Remote")).toEqual({
      name: "Acme",
      location: "Remote",
      dates: "",
      link: "",
    });
  });

  it("treats a field with a year as dates even if it looks like a link", () => {
    expect(splitHeading("Acme | example.com/2020")).toEqual({
      name: "Acme",
      location: "",
      dates: "example.com/2020",
      link: "",
    });
  });

  it("leaves a plain name alone", () => {
    expect(splitHeading("Acme")).toEqual({ name: "Acme", location: "", dates: "", link: "" });
  });
});

describe("stripComments", () => {
  it("blanks comments but keeps their line breaks", () => {
    expect(stripComments("a<!-- x\ny -->b")).toBe("a\nb");
  });
});

const MD = `# CV – Sam Lee

**Title:** Engineer
**Email:** sam@example.com

## Summary

First line
second line

Another paragraph

## Experience

### Acme – Wellington | 2020–Present
*What Acme does.*
- Entry-level bullet

**Lead** | 2022–Present
- Led things

**Engineer** | 2020–2022

## Skills <!-- hidden -->

- **Languages:** Go, SQL
- Plain item
`;

describe("parse", () => {
  const cv = parse(MD);

  it("reads the name, dropping a CV prefix", () => {
    expect(cv.name).toBe("Sam Lee");
  });

  it("reads header lines as contact", () => {
    expect(cv.contact.map((c) => [c.key, c.value])).toEqual([
      ["Title", "Engineer"],
      ["Email", "sam@example.com"],
    ]);
  });

  it("joins adjacent lines into one paragraph and splits on blank lines", () => {
    expect(cv.sections[0]?.paragraphs.map((p) => p.text)).toEqual([
      "First line\nsecond line",
      "Another paragraph",
    ]);
  });

  it("reads entries with blurb, entry bullets and stacked roles", () => {
    const e = cv.sections[1]?.entries[0];
    expect(shape(e)).toEqual({
      name: "Acme",
      location: "Wellington",
      dates: "2020–Present",
      link: "",
      blurb: "What Acme does.",
      bullets: [{ text: "Entry-level bullet" }],
      roles: [
        { title: "Lead", dates: "2022–Present", bullets: [{ text: "Led things" }] },
        { title: "Engineer", dates: "2020–2022", bullets: [] },
      ],
    });
    expect(e?.roles.map((r) => [r.title, r.dates, r.bullets.length])).toEqual([
      ["Lead", "2022–Present", 1],
      ["Engineer", "2020–2022", 0],
    ]);
  });

  it("reads labelled bullets as pairs and the hidden mark", () => {
    const s = cv.sections[2];
    expect(s?.title).toBe("Skills");
    expect(s?.hidden).toBe(true);
    expect(s?.pairs.map((p) => [p.key, p.value])).toEqual([["Languages", "Go, SQL"]]);
    expect(s?.bullets.map((b) => b.text)).toEqual(["Plain item"]);
  });

  it("records source lines", () => {
    expect(cv.sections[1]?.line).toBe(13);
    expect(cv.sections[1]?.entries[0]?.roles[0]?.line).toBe(19);
  });

  it("gives every node a distinct id", () => {
    const ids = [
      ...cv.contact.map((c) => c.id),
      ...cv.sections.flatMap((s) => [
        s.id,
        ...s.paragraphs.map((p) => p.id),
        ...s.entries.map((e) => e.id),
      ]),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("reports what it can't place, and never throws", () => {
    const bad = parse("# A\nnot a field\n- stray bullet\n### Orphan\n## S\ntext");
    expect(bad.diagnostics.map((d) => d.line)).toEqual([2, 3, 4]);
    expect(bad.sections[0]?.paragraphs[0]?.text).toBe("text");
  });

  it("only takes a blurb straight after the heading", () => {
    const cv2 = parse("## S\n### A\n- b\n*not a blurb*");
    expect(cv2.sections[0]?.entries[0]?.blurb).toBe("");
    expect(cv2.sections[0]?.paragraphs[0]?.text).toBe("*not a blurb*");
  });

  it("handles empty headings and an empty document", () => {
    expect(parse("#\n##\n###").sections[0]?.entries).toHaveLength(1);
    expect(parse("")).toEqual({
      name: "",
      style: { page: {}, el: {} },
      contact: [],
      sections: [],
      diagnostics: [],
    });
  });
});
