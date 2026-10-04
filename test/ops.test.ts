import { produce } from "immer";
import { describe, expect, it } from "vitest";
import type { CV } from "../src/model";
import { apply, isPreset, newSection, PRESETS, setBullets, type Action } from "../src/ops";
import { parse } from "../src/parse";
import { shape } from "./support/shape";

const MD = `# A

**Title:** Eng
**Email:** a@b.c

## Work

### Acme | 2020
- one

**Role** | 2021
- two

### Beta

## Skills

- **Go:** yes
- plain

Para
`;

function run(cv: CV, ...actions: Action[]): CV {
  return actions.reduce(
    (acc, a) =>
      produce(acc, (d) => {
        apply(d, a);
      }),
    cv,
  );
}

const base = parse(MD);
const work = base.sections[0];
const skills = base.sections[1];
const acme = work?.entries[0];
const role = acme?.roles[0];
if (!work || !skills || !acme || !role) throw new Error("fixture");

describe("apply", () => {
  it("replaces the document", () => {
    const other = parse("# B");
    expect(run(base, { type: "replace", cv: other }).name).toBe("B");
  });

  it("edits the header", () => {
    const email = base.contact[1];
    if (!email) throw new Error("fixture");
    const cv = run(
      base,
      { type: "setName", value: "Z" },
      { type: "setContact", id: email.id, value: "z@z.z" },
      { type: "setContact", id: email.id, key: "Mail" },
      { type: "addContact", key: "Phone" },
      { type: "setHeadline", value: "Lead" },
    );
    expect(cv.name).toBe("Z");
    expect(cv.contact.map((c) => `${c.key}=${c.value}`)).toEqual([
      "Title=Lead",
      "Mail=z@z.z",
      "Phone=",
    ]);
  });

  it("adds a headline first when there is none", () => {
    const cv = run(parse("# A\n**Email:** x"), { type: "setHeadline", value: "Eng" });
    expect(shape(cv.contact)).toEqual([
      { key: "Title", value: "Eng" },
      { key: "Email", value: "x" },
    ]);
  });

  it("adds, renames, hides and removes sections", () => {
    let cv = run(base, { type: "addSection", preset: "summary" });
    const added = cv.sections[2];
    if (!added) throw new Error("not added");
    expect(added.title).toBe("Summary");
    cv = run(
      cv,
      { type: "renameSection", id: added.id, title: "Profile" },
      { type: "toggleSection", id: added.id },
    );
    expect(shape(cv.sections[2])).toEqual({
      title: "Profile",
      hidden: true,
      paragraphs: [{ text: "" }],
      pairs: [],
      bullets: [],
      entries: [],
    });
    cv = run(cv, { type: "remove", id: added.id });
    expect(cv.sections).toHaveLength(2);
  });

  it("moves sections, entries and contact lines within their own list", () => {
    const beta = work.entries[1];
    if (!beta) throw new Error("fixture");
    const cv = run(
      base,
      { type: "move", id: skills.id, overId: work.id },
      { type: "move", id: beta.id, overId: acme.id },
    );
    expect(cv.sections.map((s) => s.title)).toEqual(["Skills", "Work"]);
    expect(cv.sections[1]?.entries.map((e) => e.name)).toEqual(["Beta", "Acme"]);
  });

  it("ignores moves across lists and unknown ids", () => {
    expect(run(base, { type: "move", id: acme.id, overId: work.id })).toBe(base);
    expect(run(base, { type: "remove", id: "nope" })).toBe(base);
  });

  it("adds and edits entries and roles", () => {
    let cv = run(
      base,
      { type: "addEntry", sectionId: work.id },
      { type: "addEntry", sectionId: skills.id },
    );
    expect(cv.sections[0]?.entries[2]?.roles).toHaveLength(1);
    expect(cv.sections[1]?.entries[0]?.roles).toHaveLength(0);
    cv = run(
      cv,
      { type: "updateEntry", id: acme.id, patch: { name: "Acme Ltd", link: "acme.example" } },
      { type: "addRole", entryId: acme.id },
      { type: "updateRole", id: role.id, title: "Boss" },
      { type: "updateRole", id: role.id, dates: "2022" },
    );
    const e = cv.sections[0]?.entries[0];
    expect(shape(e)).toEqual({
      name: "Acme Ltd",
      location: "",
      dates: "2020",
      link: "acme.example",
      blurb: "",
      bullets: [{ text: "one" }],
      roles: [
        { title: "Boss", dates: "2022", bullets: [{ text: "two" }] },
        { title: "", dates: "", bullets: [{ text: "" }] },
      ],
    });
    expect(e?.roles.map((r) => [r.title, r.dates])).toEqual([
      ["Boss", "2022"],
      ["", ""],
    ]);
  });

  it("edits pairs, paragraphs and bullet lists", () => {
    const pair = skills.pairs[0];
    const para = skills.paragraphs[0];
    if (!pair || !para) throw new Error("fixture");
    const cv = run(
      base,
      { type: "addPair", sectionId: skills.id },
      { type: "updatePair", id: pair.id, key: "Rust" },
      { type: "updatePair", id: pair.id, value: "some" },
      { type: "addParagraph", sectionId: skills.id },
      { type: "setText", id: para.id, text: "New para" },
      { type: "setBullets", ownerId: role.id, texts: ["two!", "three"] },
      { type: "setBullets", ownerId: acme.id, texts: [] },
      { type: "setBullets", ownerId: skills.id, texts: ["x"] },
    );
    const s = cv.sections[1];
    expect(s?.pairs.map((p) => [p.key, p.value])).toEqual([
      ["Rust", "some"],
      ["", ""],
    ]);
    expect(s?.paragraphs.map((p) => p.text)).toEqual(["New para", ""]);
    expect(s?.bullets.map((b) => b.text)).toEqual(["x"]);
    expect(cv.sections[0]?.entries[0]?.roles[0]?.bullets.map((b) => b.text)).toEqual([
      "two!",
      "three",
    ]);
    expect(cv.sections[0]?.entries[0]?.bullets).toEqual([]);
  });

  it("does nothing for adds aimed at missing parents", () => {
    for (const a of [
      { type: "addEntry", sectionId: "x" },
      { type: "addRole", entryId: "x" },
      { type: "addPair", sectionId: "x" },
      { type: "addParagraph", sectionId: "x" },
      { type: "renameSection", id: "x", title: "t" },
      { type: "toggleSection", id: "x" },
      { type: "setBullets", ownerId: "x", texts: [] },
      { type: "setText", id: "x", text: "t" },
      { type: "updatePair", id: "x", key: "k" },
    ] satisfies Action[]) {
      expect(run(base, a)).toBe(base);
    }
  });
});

describe("presets", () => {
  it("builds each kind of section with something to type into", () => {
    for (const key of Object.keys(PRESETS)) {
      if (!isPreset(key)) throw new Error(key);
      const s = newSection(key);
      const parts = s.paragraphs.length + s.pairs.length + s.bullets.length + s.entries.length;
      expect(parts, key).toBe(1);
    }
    expect(isPreset("nope")).toBe(false);
  });
});

describe("setBullets", () => {
  it("keeps ids by position", () => {
    const list = [{ id: "a", line: 1, text: "1" }];
    setBullets(list, ["x", "y"]);
    expect(list[0]).toEqual({ id: "a", line: 1, text: "x" });
    expect(list[1]?.id).not.toBe("a");
  });
});
