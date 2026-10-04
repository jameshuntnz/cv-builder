import { describe, expect, it } from "vitest";
import { assignPages, groupIndices, measure } from "../src/paginate";

describe("assignPages", () => {
  it("fills a page, then starts the next at the group that doesn't fit", () => {
    const spans = [
      { top: 0, bottom: 40 },
      { top: 50, bottom: 90 },
      { top: 100, bottom: 140 },
    ];
    expect(assignPages(spans, 100)).toEqual({ pages: [[0, 1], [2]], overflowing: 0 });
  });

  it("measures each page from its first group's top", () => {
    const spans = [
      { top: 0, bottom: 90 },
      { top: 120, bottom: 200 },
      { top: 205, bottom: 215 },
    ];
    expect(assignPages(spans, 100).pages).toEqual([[0], [1, 2]]);
  });

  it("places a group taller than a page anyway and counts it", () => {
    expect(
      assignPages(
        [
          { top: 0, bottom: 10 },
          { top: 10, bottom: 500 },
        ],
        100,
      ),
    ).toEqual({
      pages: [[0], [1]],
      overflowing: 1,
    });
  });

  it("returns one empty page for nothing", () => {
    expect(assignPages([], 100)).toEqual({ pages: [[]], overflowing: 0 });
  });
});

describe("groupIndices", () => {
  it("glues kept blocks to the next one", () => {
    expect(groupIndices([true, true, false, false, true])).toEqual([[0, 1, 2], [3], [4]]);
  });
});

describe("measure", () => {
  it("reads group spans relative to the column", () => {
    const column = document.createElement("div");
    const rect = (top: number, bottom: number): DOMRect =>
      DOMRect.fromRect({ x: 0, y: top, width: 1, height: bottom - top });
    column.getBoundingClientRect = () => rect(100, 100);
    [
      [100, 120],
      [130, 150],
    ].forEach(([t = 0, b = 0], i) => {
      const el = document.createElement("p");
      el.dataset["block"] = String(i);
      el.getBoundingClientRect = () => rect(t, b);
      column.appendChild(el);
    });
    expect(measure(column, [[0, 1], [2], []])).toEqual([
      { top: 0, bottom: 50 },
      { top: 0, bottom: 0 },
      { top: 0, bottom: 20 },
    ]);
  });
});
