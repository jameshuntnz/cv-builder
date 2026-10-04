import type { Editor } from "@tiptap/core";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useContext } from "react";
import { describe, expect, it, vi } from "vitest";
import { Chips } from "../src/editor/Chips";
import { FoldContext } from "../src/editor/folds";
import { modKey } from "../src/editor/format";
import { otherAdds, primaryAdd } from "../src/editor/kinds";
import { appendItem, currentItem, moveItem, removeItem } from "../src/editor/listCommands";
import { Menu } from "../src/editor/Menu";
import { parse } from "../src/parse";
import { joinList, splitList } from "../src/skills";
import { MemoryStorage } from "../src/store";
import { clampWidth, DEFAULT_PANES, MIN_PAPER, readPanes } from "../src/ui/panes";
import { Splitter } from "../src/ui/Splitter";
import {
  choose,
  expand,
  fieldOf,
  paper,
  printed,
  renderApp,
  richEditor,
  SAMPLE_BULLETS,
  section,
} from "./support/app";

/** The document position just inside the start of `text`, for placing the caret. */
function positionOf(editor: Editor, text: string): number {
  let found = -1;
  editor.state.doc.descendants((node, pos) => {
    if (found < 0 && node.isText && node.text?.includes(text))
      found = pos + node.text.indexOf(text) + 1;
  });
  if (found < 0) throw new Error(`"${text}" isn't in the editor`);
  return found;
}

function bulletTexts(): string[] {
  return [...paper().querySelectorAll(".cv-bullet")].map((b) => b.textContent);
}

describe("field formatting bar", () => {
  it("bolds, italicises and links the selection", async () => {
    const user = userEvent.setup();
    renderApp();
    expand("Paper Lantern Games");
    const blurb = richEditor("Description of Paper Lantern Games");
    const bar = within(fieldOf(blurb));
    act(() => {
      blurb.commands.focus();
      blurb.commands.selectAll();
    });
    await user.click(bar.getByRole("button", { name: /^Bold/ }));
    await user.click(bar.getByRole("button", { name: /^Italic/ }));
    expect(paper().querySelector(".cv-blurb strong em")).not.toBeNull();
    expect(bar.getByRole("button", { name: /^Bold/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(bar.getByRole("button", { name: /^Italic/ }));

    await user.click(bar.getByRole("button", { name: /^Link/ }));
    const address = bar.getByRole("textbox", { name: "Link address" });
    await user.type(address, "javascript:x");
    expect(bar.getByRole("button", { name: "Apply" })).toBeDisabled();
    await user.clear(address);
    await user.type(address, "lantern.example{Enter}");
    expect(within(paper()).getByRole("link", { name: /Small studio/ })).toHaveAttribute(
      "href",
      "https://lantern.example",
    );

    fireEvent.keyDown(blurb.view.dom, { key: "k", metaKey: true });
    const again = bar.getByRole("textbox", { name: "Link address" });
    expect(again).toHaveValue("https://lantern.example");
    await user.clear(again);
    await user.click(bar.getByRole("button", { name: "Remove link" }));
    expect(within(paper()).queryByRole("link", { name: /Small studio/ })).toBeNull();

    await user.click(bar.getByRole("button", { name: /^Link/ }));
    await user.keyboard("{Escape}");
    expect(bar.queryByRole("textbox", { name: "Link address" })).toBeNull();
    fireEvent.keyDown(blurb.view.dom, { key: "j", metaKey: true });
    fireEvent.keyDown(blurb.view.dom, { key: "k" });
    expect(bar.queryByRole("textbox", { name: "Link address" })).toBeNull();
  });

  it("moves, removes and adds bullets from the bar and the keyboard", async () => {
    const user = userEvent.setup();
    renderApp();
    expand("Fernhill Gardens");
    const list = richEditor("Bullets for Lead Mobile Engineer");
    const bar = within(fieldOf(list));
    const [rebuilt = "", cut = "", ran = ""] = SAMPLE_BULLETS;
    // jsdom syncs the DOM selection lazily, so put the caret where each step needs it.
    const caretIn = (text: string): void => {
      act(() => {
        list.commands.setTextSelection(positionOf(list, text));
      });
    };

    caretIn("Rebuilt");
    expect(bar.getByRole("button", { name: /^Move bullet up/ })).toBeDisabled();
    await user.click(bar.getByRole("button", { name: /^Move bullet down/ }));
    expect(bulletTexts().slice(0, 3)).toEqual([cut, rebuilt, ran]);
    caretIn("Rebuilt");
    fireEvent.keyDown(list.view.dom, { key: "ArrowUp", altKey: true });
    expect(bulletTexts().slice(0, 3)).toEqual([rebuilt, cut, ran]);
    caretIn("Rebuilt");
    fireEvent.keyDown(list.view.dom, { key: "ArrowDown", altKey: true });
    expect(bulletTexts().slice(0, 3)).toEqual([cut, rebuilt, ran]);
    caretIn("Rebuilt");
    await user.click(bar.getByRole("button", { name: /^Move bullet up/ }));
    expect(bulletTexts().slice(0, 3)).toEqual([rebuilt, cut, ran]);

    fireEvent.keyDown(list.view.dom, { key: "k", ctrlKey: true });
    expect(bar.getByRole("textbox", { name: "Link address" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    caretIn("Rebuilt");
    await user.click(bar.getByRole("button", { name: "Remove bullet" }));
    expect(bulletTexts().slice(0, 2)).toEqual([cut, ran]);
    await user.click(bar.getByRole("button", { name: "+ Add bullet" }));
    act(() => {
      list.commands.insertContent("A new one");
    });
    expect(bulletTexts().slice(0, 3)).toEqual([cut, ran, "A new one"]);
  });
});

describe("list commands", () => {
  it("do nothing outside a list or past its ends, and empty the last bullet", () => {
    renderApp();
    expand("Night Sky");
    const blurb = richEditor("Description of Night Sky");
    expect(currentItem(blurb)).toBeUndefined();
    expect(moveItem(blurb, 1)).toBe(false);
    expect(removeItem(blurb)).toBe(false);
    const list = richEditor("Bullets for Night Sky");
    act(() => {
      list.commands.setTextSelection(3);
    });
    expect(moveItem(list, -1)).toBe(false);
    expect(moveItem(list, 1)).toBe(false);
    act(() => {
      removeItem(list);
    });
    expect(list.state.doc.textContent).toBe("");
    act(() => {
      appendItem(list);
    });
    expect(list.state.doc.firstChild?.childCount).toBe(1);
  });
});

describe("folds", () => {
  it("collapse and expand everything, and toggle from the head text", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.getByRole("button", { name: "Collapse Fernhill Gardens" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(screen.getByRole("button", { name: "Expand Experience" })).toBeInTheDocument();
    await user.click(
      within(section("Experience")).getByRole("button", { name: "Expand Experience" }),
    );
    await user.click(within(section("Experience")).getByText("Paper Lantern Games"));
    expect(
      screen.getByRole("button", { name: "Collapse Paper Lantern Games" }),
    ).toBeInTheDocument();
  });

  it("open when the paper jumps to something inside them", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Collapse all" }));
    await user.click(within(paper()).getByText(/Wrote the level editor/));
    await waitFor(() => {
      expect(document.activeElement?.closest("[data-items]")).not.toBeNull();
    });
    expect(
      screen.getByRole("button", { name: "Collapse Paper Lantern Games" }),
    ).toBeInTheDocument();
  });

  it("fall back to their defaults without a provider", () => {
    function Probe() {
      const folds = useContext(FoldContext);
      folds.setOpen("x", true);
      return <>{String(folds.isOpen("x", true))}</>;
    }
    render(<Probe />);
    expect(screen.getByText("true")).toBeInTheDocument();
  });
});

describe("Menu", () => {
  it("closes on Escape and on clicks outside, but not inside", () => {
    const onSelect = vi.fn();
    render(<Menu label="Things" items={[{ label: "One", onSelect }]} />);
    const button = screen.getByRole("button", { name: "Things" });
    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Tab" });
    fireEvent.pointerDown(screen.getByRole("menu"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
    choose("Things", "One");
    expect(onSelect).toHaveBeenCalledOnce();
  });
});

describe("panes", () => {
  it("hide and show the sections panel and the paper, remembering the choice", async () => {
    const user = userEvent.setup();
    const prefs = new MemoryStorage();
    const { unmount } = renderApp({}, undefined, prefs);
    await user.click(screen.getByRole("button", { name: "Hide the sections panel" }));
    await user.click(screen.getByRole("button", { name: "Hide the paper preview" }));
    const workspace = document.querySelector(".workspace");
    expect(workspace).toHaveAttribute("data-outline", "hidden");
    expect(workspace).toHaveAttribute("data-paper", "hidden");
    expect(screen.queryByRole("navigation", { name: "Sections" })).toBeNull();
    unmount();
    renderApp({}, undefined, prefs);
    expect(document.querySelector(".workspace")).toHaveAttribute("data-paper", "hidden");
    await user.click(screen.getByRole("button", { name: "Show sections" }));
    await user.click(screen.getByRole("button", { name: "Show paper" }));
    expect(document.querySelector(".workspace")).toHaveAttribute("data-paper", "shown");
    expect(screen.getByRole("navigation", { name: "Sections" })).toBeInTheDocument();
  });

  it("resize the paper with the divider, and reset it", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ width: 500 }),
    );
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(2000);
    renderApp();
    const divider = screen.getByRole("separator", { name: "Resize the paper preview" });
    const workspace = document.querySelector<HTMLElement>(".workspace");
    const width = (): string => workspace?.style.getPropertyValue("--paper-width") ?? "";
    fireEvent.keyDown(divider, { key: "ArrowLeft" });
    expect(width()).toBe("532px");
    fireEvent.keyDown(divider, { key: "ArrowRight" });
    expect(width()).toBe("468px");
    fireEvent.pointerDown(divider, { clientX: 600, pointerId: 1 });
    fireEvent.pointerMove(divider, { clientX: 500 });
    fireEvent.pointerUp(divider);
    fireEvent.pointerMove(divider, { clientX: 100 });
    expect(width()).toBe("600px");
    fireEvent.keyDown(divider, { key: "Home" });
    expect(width()).toBe("");
    fireEvent.keyDown(divider, { key: "a" });
    fireEvent.doubleClick(divider);
    expect(width()).toBe("");
    vi.restoreAllMocks();
  });

  it("read stored preferences defensively and keep widths usable", () => {
    const store = new MemoryStorage();
    expect(readPanes(store)).toEqual(DEFAULT_PANES);
    store.setItem("cv-builder:panes", "not json");
    expect(readPanes(store)).toEqual(DEFAULT_PANES);
    store.setItem(
      "cv-builder:panes",
      JSON.stringify({ paperShown: "no", paperWidth: 400, outlineShown: false }),
    );
    expect(readPanes(store)).toEqual({ outlineShown: false, paperShown: true, paperWidth: 400 });
    expect(clampWidth(10, 1400)).toBe(MIN_PAPER);
    expect(clampWidth(5000, 1400)).toBe(840);
    expect(clampWidth(500, 600)).toBe(MIN_PAPER);
  });

  it("survive a browser that refuses to store them", () => {
    const full = {
      getItem: () => null,
      setItem: () => {
        throw new Error("full");
      },
    };
    renderApp({}, undefined, full);
    expect(() => {
      fireEvent.click(screen.getByRole("button", { name: "Hide the paper preview" }));
    }).not.toThrow();
  });

  it("render a bare divider that needs its pane measured", () => {
    const onResize = vi.fn();
    render(
      <Splitter
        value={400}
        min={320}
        max={900}
        measure={() => 400}
        onResize={onResize}
        onReset={vi.fn()}
      />,
    );
    fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowLeft" });
    expect(onResize).toHaveBeenCalledWith(432);
  });
});

describe("dragging by keyboard", () => {
  it("reorders skill categories, and hides a section from the outline", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const row = this.closest(".skill-row");
      if (!row?.parentElement) return DOMRect.fromRect({ width: 500, height: 0 });
      const i = [...row.parentElement.children].indexOf(row);
      return DOMRect.fromRect({ y: i * 40, width: 300, height: 36 });
    });
    const user = userEvent.setup();
    renderApp();
    screen.getByRole("button", { name: "Move Languages" }).focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowDown}");
    await user.keyboard(" ");
    expect(printed.pairs()).toEqual([
      "Frameworks: SwiftUI, React Native",
      "Languages: Swift, TypeScript, SQL",
      "Tools: Xcode, Figma, Firebase",
    ]);
    await user.click(
      within(screen.getByRole("navigation", { name: "Sections" })).getByRole("button", {
        name: "Hide Skills",
      }),
    );
    expect(printed.sections()).toEqual(["Experience", "Projects", "Education"]);
    expect(printed.pairs()).toEqual([]);
    vi.restoreAllMocks();
  });
});

describe("chips", () => {
  it("add on Enter or blur, ignore blanks, and pull the last one back with Backspace", () => {
    const onChange = vi.fn();
    const { rerender } = render(<Chips label="Tools" value="Xcode, Figma" onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "Add to Tools" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(onChange).toHaveBeenLastCalledWith("Xcode");
    expect(input).toHaveValue("Figma");
    rerender(<Chips label="Tools" value="Xcode" onChange={onChange} />);
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith("Xcode, Figma");
    fireEvent.change(input, { target: { value: "Vim" } });
    fireEvent.keyDown(input, { key: "Backspace" });
    fireEvent.keyDown(input, { key: "x" });
    expect(input).toHaveValue("Vim");
    rerender(<Chips label="Tools" value="" onChange={onChange} />);
    expect(input).toHaveAttribute("placeholder", "Type a skill, then Enter");
  });
});

describe("pure helpers", () => {
  it("split skills on top-level commas only", () => {
    expect(splitList("a, b (c, d), [e, f], g)")).toEqual(["a", "b (c, d)", "[e, f]", "g)"]);
    expect(joinList([" a ", "", "b"])).toBe("a, b");
  });

  it("choose adds by section kind", () => {
    const cv = parse("# A\n## List\n- x\n## Empty\n");
    const [list, empty] = cv.sections;
    if (!list || !empty) throw new Error("fixture");
    expect(primaryAdd("list")).toBeUndefined();
    expect(otherAdds(list)).toEqual(["job", "entry", "category", "paragraph"]);
    expect(otherAdds(empty)).toEqual(["job", "entry", "category", "paragraph", "list"]);
  });

  it("names the modifier key per platform", () => {
    expect(modKey("MacIntel")).toBe("⌘");
    expect(modKey("Win32")).toBe("Ctrl+");
  });
});
