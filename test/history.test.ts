import { describe, expect, it } from "vitest";
import { COALESCE_MS, coalesceKey, LIMIT, record, redo, start, undo } from "../src/history";
import { parse } from "../src/parse";

describe("history", () => {
  const h0 = start(parse("# A"));

  it("records edits and undoes and redoes them", () => {
    const h1 = record(h0, { type: "setName", value: "B" }, 0);
    const h2 = record(h1, { type: "addSection", preset: "list" }, 5000);
    expect(h2.past).toHaveLength(2);
    const u = undo(h2);
    expect(u.present.sections).toHaveLength(0);
    const r = redo(u);
    expect(r.present.sections).toHaveLength(1);
    expect(undo(undo(undo(h2))).present.name).toBe("A");
    expect(redo(r)).toBe(r);
  });

  it("coalesces typing in one field within a second", () => {
    const h1 = record(h0, { type: "setName", value: "B" }, 0);
    const h2 = record(h1, { type: "setName", value: "Bo" }, COALESCE_MS - 1);
    const h3 = record(h2, { type: "setName", value: "Bob" }, COALESCE_MS * 3);
    expect(h2.past).toHaveLength(1);
    expect(h3.past).toHaveLength(2);
  });

  it("skips edits that change nothing", () => {
    expect(record(h0, { type: "remove", id: "x" }, 0)).toBe(h0);
  });

  it("replaces wholesale and caps the history", () => {
    let h = h0;
    for (let i = 0; i < LIMIT + 5; i++)
      h = record(h, { type: "addSection", preset: "list" }, i * 10_000);
    expect(h.past).toHaveLength(LIMIT);
    const replaced = record(h, { type: "replace", cv: parse("# R") }, 0);
    expect(replaced.present.name).toBe("R");
  });

  it("keys coalescing by field", () => {
    expect(coalesceKey({ type: "setHeadline", value: "" })).toBe("headline");
    expect(coalesceKey({ type: "setText", id: "n1", text: "" })).toBe("setText:n1");
    expect(coalesceKey({ type: "setBullets", ownerId: "n2", texts: [] })).toBe("bullets:n2");
    expect(coalesceKey({ type: "replace", cv: parse("") })).toBe("source");
    expect(coalesceKey({ type: "remove", id: "x" })).toBeUndefined();
  });
});
