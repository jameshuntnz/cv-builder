import { describe, expect, it } from "vitest";
import {
  bulletsDoc,
  fromBulletsDoc,
  fromInline,
  fromTextDoc,
  sameBullets,
  textDoc,
  toInline,
} from "../src/editor/convert";

describe("inline conversion", () => {
  it("round-trips marks, links and line breaks", () => {
    const text = "a **b** *c* ***d*** `e` [f](g.com)\nnext";
    expect(fromInline(toInline(text))).toBe(text);
  });

  it("drops links without a usable href and unknown nodes", () => {
    expect(
      fromInline([
        { type: "text", text: "x", marks: [{ type: "link", attrs: { href: "" } }] },
        { type: "image" },
      ]),
    ).toBe("x");
    expect(fromInline(undefined)).toBe("");
    expect(fromInline([{ type: "text" }])).toBe("");
  });
});

describe("documents", () => {
  it("wraps one field in a paragraph", () => {
    expect(fromTextDoc(textDoc("hi **there**"))).toBe("hi **there**");
    expect(textDoc("")).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });

  it("makes one list item per bullet and reads them back flat", () => {
    expect(fromBulletsDoc(bulletsDoc(["a", "**b**"]))).toEqual(["a", "**b**"]);
    expect(fromBulletsDoc(bulletsDoc([]))).toEqual([""]);
    const nested = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "x" },
                    { type: "hardBreak" },
                    { type: "text", text: "y" },
                  ],
                },
                {
                  type: "bulletList",
                  content: [
                    {
                      type: "listItem",
                      content: [{ type: "paragraph", content: [{ type: "text", text: "z" }] }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(fromBulletsDoc(nested)).toEqual(["x y", "z"]);
  });

  it("copes with nodes that have no content", () => {
    expect(fromTextDoc({ type: "doc" })).toBe("");
    expect(
      fromBulletsDoc({
        type: "doc",
        content: [{ type: "bulletList", content: [{ type: "listItem" }] }],
      }),
    ).toEqual([""]);
  });

  it("treats an empty list and one empty bullet as the same", () => {
    expect(sameBullets([], [""])).toBe(true);
    expect(sameBullets(["a"], ["a", ""])).toBe(false);
  });
});
