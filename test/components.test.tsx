import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Bullets, RichText } from "../src/editor/RichText";
import { dropHandler } from "../src/editor/drop";
import type { Layout } from "../src/model";
import { parse } from "../src/parse";
import { Paper } from "../src/paper/Paper";
import { SAMPLE } from "../src/sample";
import { DocStore, MemoryStorage } from "../src/store";
import { focusRef } from "../src/ui/focus";
import { fromBulletsDoc } from "../src/editor/convert";
import {
  bulletsWith,
  expand,
  fieldOf,
  printed,
  renderApp,
  richEditor,
  section,
} from "./support/app";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** Lay blocks out 100px apart, and sortable rows 40px apart, on 450px pages. */
function stubLayout(pageHeight = 450): void {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.classList.contains("page-body")) return DOMRect.fromRect({ height: pageHeight });
    if (this.dataset["block"] !== undefined)
      return DOMRect.fromRect({ y: Number(this.dataset["block"]) * 100, width: 500, height: 100 });
    const row = this.closest(".outline-item, .sortable-entry");
    if (row?.parentElement) {
      const i = [...row.parentElement.children].indexOf(row);
      return DOMRect.fromRect({ x: 0, y: i * 40, width: 200, height: 36 });
    }
    return DOMRect.fromRect({ width: 500, height: 0 });
  });
}

describe("dropHandler", () => {
  it("moves only when dropped on another item", () => {
    const onMove = vi.fn();
    const drop = dropHandler(onMove);
    const at = (id: string) => ({ id });
    drop({ active: at("a"), over: null });
    drop({ active: at("a"), over: at("a") });
    drop({ active: at("a"), over: at("b") });
    expect(onMove).toHaveBeenCalledExactlyOnceWith("a", "b");
  });
});

describe("keyboard reordering", () => {
  it("moves a section and an entry with Space and the arrow keys", async () => {
    stubLayout();
    const user = userEvent.setup();
    renderApp();
    const handle = screen.getByRole("button", { name: "Move Experience" });
    handle.focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowDown}");
    await user.keyboard(" ");
    const outline = within(screen.getByRole("navigation", { name: "Sections" }));
    expect(
      outline
        .getAllByRole("button", { name: /^(Experience|Projects|Skills|Education)$/ })
        .map((b) => b.textContent),
    ).toEqual(["Projects", "Experience", "Skills", "Education"]);
    const entry = screen.getByRole("button", { name: "Move Fernhill Gardens" });
    entry.focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowDown}");
    await user.keyboard(" ");
    const names = section("Experience").querySelectorAll(".entry-summary strong");
    expect([...names].map((n) => n.textContent)).toEqual([
      "Paper Lantern Games",
      "Fernhill Gardens",
    ]);
  });
});

describe("App layout feedback", () => {
  it("counts pages and warns when a block can't fit on a page", () => {
    stubLayout(250);
    renderApp({}, new DocStore(new MemoryStorage()));
    expect(screen.getByText(/pages$/)).toBeInTheDocument();
    expect(screen.getByText(/taller than a whole page/)).toBeInTheDocument();
  });
});

describe("Paper", () => {
  it("shows everything on one page while a shorter CV waits to be measured", () => {
    stubLayout();
    const layout: Layout = { paper: "a4", compact: false };
    const props = { layout, fontsVersion: 0, zoom: 1, onPages: vi.fn(), onSelect: vi.fn() };
    const { rerender } = render(<Paper cv={parse(SAMPLE)} {...props} />);
    expect(screen.getAllByRole("region", { name: /^Page \d+$/ })).toHaveLength(7);
    rerender(<Paper cv={parse("# Short\n## S\n- one")} {...props} />);
    expect(screen.getAllByRole("region", { name: /^Page/ })).toHaveLength(1);
  });
});

describe("RichText", () => {
  it("follows its value when it changes from outside, and flattens line breaks unless multiline", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <RichText label="Field" editRef="f" value="one" onChange={onChange} />,
    );
    rerender(<RichText label="Field" editRef="f" value="**two**" onChange={onChange} />);
    const editor = richEditor("Field");
    expect(editor.getHTML()).toBe("<p><strong>two</strong></p>");
    act(() => {
      editor.commands.setHardBreak();
    });
    expect(onChange).toHaveBeenLastCalledWith(expect.not.stringContaining("\n"));
  });

  it("reloads a bullet list changed from outside", () => {
    const one = [{ id: "a", text: "one" }];
    const { rerender } = render(
      <Bullets label="List" editRef="l" items={one} onChange={vi.fn()} />,
    );
    rerender(
      <Bullets
        label="List"
        editRef="l"
        items={[...one, { id: "b", text: "two" }]}
        onChange={vi.fn()}
      />,
    );
    expect(fromBulletsDoc(richEditor("List").getJSON())).toEqual(["one", "two"]);
  });
});

describe("focusRef", () => {
  it("focuses a field, flashes its host, and reports misses", () => {
    vi.useFakeTimers();
    document.body.innerHTML =
      '<div data-edit-ref="n1"><input id="i"></div><input data-edit-ref="n2">';
    expect(focusRef(document, "n1")).toBe(true);
    expect(document.activeElement?.id).toBe("i");
    const host = document.querySelector("[data-edit-ref='n1']");
    expect(host).toHaveClass("flash");
    vi.runAllTimers();
    expect(host).not.toHaveClass("flash");
    expect(focusRef(document, "n2")).toBe(true);
    expect(focusRef(document, "missing")).toBe(false);
  });
});

describe("TopBar and header edge cases", () => {
  it("labels untitled CVs and renames contact labels", async () => {
    const user = userEvent.setup();
    const { confirm } = renderApp();
    const name = within(section("Header")).getByRole("textbox", { name: "Name" });
    await user.clear(name);
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Open a saved CV" })).toHaveDisplayValue(
        /^Untitled/,
      );
    });
    const label = within(section("Header")).getAllByRole("combobox", { name: "Label" })[0];
    if (!label) throw new Error("no label");
    await user.clear(label);
    await user.type(label, "Base");
    // "Location" renamed: it's an ordinary extra line now, out of the contact line.
    expect(printed.extras()).toEqual(["Glasgow, UK"]);
    expect(printed.contact()).toEqual([
      "linkedin.com/in/example|github.com/example|rowan.ellis@example.com|+44 7700 900123",
    ]);
    confirm.mockReturnValueOnce(false);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(confirm.mock.calls).toEqual([
      ["Delete this CV from this browser? This can't be undone."],
    ]);
  });
});

describe("remaining edges", () => {
  it("splits a bullet with Enter", () => {
    renderApp();
    expand("Paper Lantern Games");
    const bullets = richEditor("Bullets for Developer");
    act(() => {
      bullets.commands.focus("end");
    });
    fireEvent.keyDown(bullets.view.dom, { key: "Enter" });
    act(() => {
      bullets.commands.insertContent("Third");
    });
    expect(printed.bullets()).toEqual(bulletsWith((l) => l.splice(7, 0, "Third")));
  });

  it("ignores an empty file pick and an invalid link submit", () => {
    renderApp();
    fireEvent.change(screen.getByLabelText("Markdown file to open"));
    expect(printed.name()).toEqual(["Rowan Ellis"]);
    expand("Paper Lantern Games");
    const field = fieldOf(richEditor("Description of Paper Lantern Games"));
    fireEvent.click(within(field).getByRole("button", { name: /^Link/ }));
    const address = screen.getByRole("textbox", { name: "Link address" });
    fireEvent.change(address, { target: { value: "nope" } });
    const form = address.closest("form");
    if (!form) throw new Error("no form");
    fireEvent.submit(form);
    expect(address).toBeInTheDocument();
  });
});
