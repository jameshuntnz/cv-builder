import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Layout } from "../src/model";
import { parse } from "../src/parse";
import { buildBlocks } from "../src/paper/blocks";
import { Paper } from "../src/paper/Paper";
import { SAMPLE } from "../src/sample";
import { printed, SAMPLE_BULLETS } from "./support/app";

const layout: Layout = { paper: "a4", compact: false };

function stubLayout(blockHeight: number, pageHeight: number): void {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.classList.contains("page-body")) return DOMRect.fromRect({ height: pageHeight });
    const i = Number(this.dataset["block"] ?? -1);
    return i < 0
      ? DOMRect.fromRect({ y: 0, height: 0 })
      : DOMRect.fromRect({ y: i * blockHeight, height: blockHeight });
  });
}

function pages(): HTMLElement[] {
  return screen.getAllByRole("region", { name: /^Page \d+$/ });
}

describe("Paper", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the sample on one page: header, sections, entries, bullets and links", () => {
    const onPages = vi.fn();
    render(
      <Paper
        cv={parse(SAMPLE)}
        layout={layout}
        fontsVersion={0}
        zoom={1}
        onPages={onPages}
        onSelect={vi.fn()}
      />,
    );
    expect(pages()).toHaveLength(1);
    expect(printed.name()).toEqual(["Rowan Ellis"]);
    expect(printed.headline()).toEqual(["Mobile Engineer"]);
    expect(printed.contact()).toEqual([
      "linkedin.com/in/example|github.com/example|rowan.ellis@example.com|+44 7700 900123|Glasgow, UK",
    ]);
    expect(printed.sections()).toEqual(["Experience", "Projects", "Skills", "Education"]);
    expect(printed.entries()).toEqual([
      "Fernhill Gardens, Glasgow, UKJun 2021–Present",
      "Paper Lantern Games, Edinburgh, UKSep 2018–May 2021",
      "Night Skygithub.com/example/night-sky",
    ]);
    expect(printed.roles()).toEqual([
      "Lead Mobile EngineerMar 2024–Present",
      "Mobile EngineerJun 2021–Feb 2024",
      "DeveloperSep 2018–May 2021",
    ]);
    expect(printed.bullets()).toEqual(SAMPLE_BULLETS);
    expect(printed.pairs()).toEqual([
      "Languages: Swift, TypeScript, SQL",
      "Frameworks: SwiftUI, React Native",
      "Tools: Xcode, Figma, Firebase",
    ]);
    expect(printed.links()).toEqual([
      ["linkedin.com/in/example", "https://linkedin.com/in/example"],
      ["github.com/example", "https://github.com/example"],
      ["rowan.ellis@example.com", "mailto:rowan.ellis@example.com"],
      ["+44 7700 900123", "tel:+447700900123"],
      ["github.com/example/night-sky", "https://github.com/example/night-sky"],
    ]);
    expect(onPages).toHaveBeenLastCalledWith({
      pages: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]],
      overflowing: 0,
    });
  });

  it("splits onto pages and adds a footer from page two", () => {
    stubLayout(100, 450);
    render(
      <Paper
        cv={parse(SAMPLE)}
        layout={{ paper: "letter", compact: true }}
        fontsVersion={0}
        zoom={0.5}
        onPages={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    const all = pages();
    expect(all.map((p) => p.className)).toEqual(
      Array.from({ length: all.length }, () => "page paper-letter compact"),
    );
    expect(all.map((p) => p.querySelector(".page-footer")?.textContent ?? null)).toEqual([
      null,
      ...all.slice(1).map((_, i) => `Rowan EllisPage ${String(i + 2)} of ${String(all.length)}`),
    ]);
    expect(all).toHaveLength(7);
  });

  it("reports the source of a click, but not clicks on links or empty space", () => {
    const onSelect = vi.fn();
    const cv = parse(SAMPLE);
    render(
      <Paper
        cv={cv}
        layout={layout}
        fontsVersion={0}
        zoom={1}
        onPages={vi.fn()}
        onSelect={onSelect}
      />,
    );
    const page = pages()[0];
    if (!page) throw new Error("no page");
    fireEvent.click(page.querySelector(".cv-section") ?? page);
    expect(onSelect.mock.calls).toEqual([[cv.sections[0]?.id]]);
    onSelect.mockClear();
    fireEvent.click(page.querySelector("a") ?? page);
    fireEvent.click(page.querySelector(".page-body") ?? page);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("buildBlocks", () => {
  function draw(md: string): HTMLElement {
    const { container } = render(
      <>
        {buildBlocks(parse(md)).map((b) => (
          <b.render key={b.key} data-ref={b.key} />
        ))}
      </>,
    );
    return container;
  }

  function textOf(root: HTMLElement, selector: string): string[] {
    return [...root.querySelectorAll(selector)].map((el) => el.textContent);
  }

  it("leaves out hidden sections and empty lines", () => {
    const root = draw("# A\n## Shown\n- x\n## Gone <!-- hidden -->\n- y");
    expect(textOf(root, ".cv-section")).toEqual(["Shown"]);
    expect(textOf(root, ".cv-bullet li")).toEqual(["x"]);
  });

  it("puts a link on the blurb line when there are dates, and merges the location into the first extra line", () => {
    const root = draw(
      "# A\n**Location:** Here\n**Availability:** Now\n**Notice:** Soon\n**Phone:** +1 2\n## S\n### E – Town | 2020 | e.example\n*About E*\n### F | f.example\n*Blurb*",
    );
    expect(textOf(root, ".cv-extra")).toEqual(["Here · Now", "Soon"]);
    expect(textOf(root, ".cv-contact")).toEqual(["+1 2"]);
    expect(textOf(root, ".cv-entry .cv-row")).toEqual(["E, Town2020", "Ff.example"]);
    expect(textOf(root, ".cv-blurb")).toEqual(["About E · e.example", "Blurb"]);
    const links = [...root.querySelectorAll("a")].map((a) => [
      a.textContent,
      a.getAttribute("href"),
    ]);
    expect(links).toEqual([
      ["+1 2", "tel:+12"],
      ["e.example", "https://e.example"],
      ["f.example", "https://f.example"],
    ]);
  });

  it("renders paragraph line breaks, labelled lines and tight stacked roles", () => {
    const root = draw(
      "# A\n## S\nline one\nline two\n- **K:** *v*\n### E\n**Old** | 2019\n**New** | 2020\n- b",
    );
    expect(root.querySelector(".cv-para")?.innerHTML).toBe(
      '<p class="cv-lines"><span>line one</span><span><br>line two</span></p>',
    );
    expect(root.querySelector(".cv-pair")?.innerHTML).toBe(
      '<p class="cv-lines"><strong>K:</strong> <em>v</em></p>',
    );
    expect([...root.querySelectorAll(".cv-role")].map((r) => r.className)).toEqual([
      "cv-role",
      "cv-role cv-tight",
    ]);
  });

  it("never renders unsafe links, but keeps their text", () => {
    const root = draw("# A\n## S\n- [click](javascript:alert(1)) and **bold**");
    expect(root.querySelector(".cv-bullet li")?.innerHTML).toBe("click and <strong>bold</strong>");
    expect(root.querySelectorAll("a")).toHaveLength(0);
  });
});
