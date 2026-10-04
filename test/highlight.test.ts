import { describe, expect, it } from "vitest";
import { highlight, lineKind } from "../src/highlight";

describe("highlight", () => {
  it("classifies each kind of line", () => {
    const md = "# N\n## S\n### E\n- b\n**K:** v\n**R** | d\ntext\n<!-- c -->\n<!-- a\nb -->\nafter";
    expect(highlight(md).map((l) => l.kind)).toEqual([
      "name",
      "section",
      "entry",
      "bullet",
      "field",
      "role",
      "text",
      "comment",
      "comment",
      "comment",
      "text",
    ]);
  });

  it("treats lines inside an open comment as comment", () => {
    expect(lineKind("# looks like a name", true)).toBe("comment");
  });
});
