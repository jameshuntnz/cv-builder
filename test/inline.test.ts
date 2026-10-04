import { describe, expect, it } from "vitest";
import { plain, safeHref, segments, toMarkdown } from "../src/inline";

describe("segments", () => {
  it("reads every inline mark", () => {
    expect(segments("a **b** *c* ***d*** `e` [f](g.com)")).toEqual([
      { text: "a " },
      { text: "b", bold: true },
      { text: " " },
      { text: "c", italic: true },
      { text: " " },
      { text: "d", bold: true, italic: true },
      { text: " " },
      { text: "e", code: true },
      { text: " " },
      { text: "f", href: "g.com" },
    ]);
  });

  it("leaves unmatched punctuation as text", () => {
    expect(segments("5 * 3 and **")).toEqual([{ text: "5 * 3 and **" }]);
  });
});

describe("links with brackets in their address", () => {
  it("keep the whole address", () => {
    expect(segments("see [Mercury](en.wikipedia.org/wiki/Mercury_(planet)) now")).toEqual([
      { text: "see " },
      { text: "Mercury", href: "en.wikipedia.org/wiki/Mercury_(planet)" },
      { text: " now" },
    ]);
  });
});

describe("toMarkdown", () => {
  it("inverts segments", () => {
    const md = "a **b** *c* ***d*** `e` [f](g.com)";
    expect(toMarkdown(segments(md))).toBe(md);
  });

  it("merges neighbours with the same marks and keeps spaces outside marks", () => {
    expect(toMarkdown([{ text: "a", bold: true }, { text: "b ", bold: true }, { text: "c" }])).toBe(
      "**ab** c",
    );
  });

  it("drops marks it can't express but never the text", () => {
    expect(toMarkdown([{ text: "x*y", bold: true }])).toBe("**xy**");
    expect(toMarkdown([{ text: "[x]", href: "u" }])).toBe("[x](u)");
    expect(toMarkdown([{ text: " ", bold: true }, { text: "" }])).toBe(" ");
  });
});

describe("plain", () => {
  it("strips markup", () => {
    expect(plain("**a** [b](c)")).toBe("a b");
  });
});

describe("safeHref", () => {
  it("allows web, mail and phone links, and bare domains", () => {
    expect(safeHref("https://a.example")).toBe("https://a.example");
    expect(safeHref("mailto:a@b.c")).toBe("mailto:a@b.c");
    expect(safeHref("tel:+64")).toBe("tel:+64");
    expect(safeHref(" github.com/you ")).toBe("https://github.com/you");
  });

  it("refuses other schemes and non-addresses", () => {
    expect(safeHref("javascript:alert(1)")).toBeUndefined();
    expect(safeHref("data:text/html,x")).toBeUndefined();
    expect(safeHref("not a link")).toBeUndefined();
  });
});
