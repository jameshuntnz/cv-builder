import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeShare } from "../src/share";
import { DocStore, MemoryStorage } from "../src/store";
import { paper, printed, renderApp, section } from "./support/app";

/** The app's own message line (drag-and-drop adds other live regions). */
function toast(): HTMLElement {
  const el = document.querySelector<HTMLElement>(".toast");
  if (!el) throw new Error("no toast");
  return el;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("documents", () => {
  it("starts from the example and lists it", () => {
    renderApp();
    expect(printed.name()).toEqual(["Rowan Ellis"]);
    expect(screen.getByRole("combobox", { name: "Open a saved CV" })).toHaveDisplayValue(
      /Rowan Ellis/,
    );
  });

  it("creates, switches between and deletes CVs", async () => {
    const user = userEvent.setup();
    const { confirm } = renderApp();
    const name = within(section("Header")).getByRole("textbox", { name: "Name" });
    await user.clear(name);
    await user.type(name, "First");
    await user.click(screen.getByRole("button", { name: "New" }));
    const select = screen.getByRole("combobox", { name: "Open a saved CV" });
    await waitFor(() => {
      expect(within(select).getAllByRole("option")).toHaveLength(2);
    });
    const first = within(select).getByRole("option", { name: /^First/ });
    await user.selectOptions(select, first);
    expect(printed.name()).toEqual(["First"]);

    confirm.mockReturnValueOnce(false);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(printed.name()).toEqual(["First"]);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(printed.name()).toEqual(["Rowan Ellis"]);
  });

  it("opens a markdown file as a new CV and saves one out", async () => {
    const user = userEvent.setup();
    renderApp();
    const input = screen.getByLabelText("Markdown file to open");
    await user.upload(input, new File(["# From File\n"], "cv.md", { type: "text/markdown" }));
    await waitFor(() => {
      expect(printed.name()).toEqual(["From File"]);
    });
    await user.upload(input, []);

    const create = vi.fn(() => "blob:x");
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    await user.click(screen.getByRole("button", { name: "Save .md" }));
    expect(click).toHaveBeenCalledOnce();
  });

  it("clicks the hidden file input from Open .md", async () => {
    const user = userEvent.setup();
    renderApp();
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => undefined);
    await user.click(screen.getByRole("button", { name: "Open .md" }));
    expect(click).toHaveBeenCalled();
  });

  it("changes paper and compact layout", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.selectOptions(screen.getByRole("combobox", { name: "Paper" }), "letter");
    await user.click(screen.getByRole("checkbox", { name: "Compact" }));
    expect(paper()).toHaveClass("paper-letter", "compact");
  });

  it("prints with the CV's file name as the title, then restores it", async () => {
    const user = userEvent.setup();
    document.title = "CV Builder";
    let printedAs = "";
    renderApp({ print: () => (printedAs = document.title) });
    await user.click(screen.getByRole("button", { name: "Export PDF" }));
    expect(printedAs).toBe("Rowan-Ellis-CV");
    expect(document.title).toBe("CV Builder");
  });
});

describe("sharing", () => {
  it("makes a link that copies to the clipboard", async () => {
    const user = userEvent.setup();
    renderApp();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    await user.click(screen.getByRole("button", { name: "Share link" }));
    const dialog = await screen.findByRole("dialog", { name: "Share link" });
    const url = within(dialog).getByRole("textbox", { name: "Share link" });
    expect(url).toHaveDisplayValue(/^https:\/\/cv\.example\/#cv=[\w-]+$/);
    fireEvent.focus(url);
    await user.click(within(dialog).getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalled();
    expect(await screen.findByText("Link copied.")).toBeInTheDocument();
    writeText.mockRejectedValue(new Error("denied"));
    await user.click(within(dialog).getByRole("button", { name: "Copy" }));
    expect(await screen.findByText(/Couldn't copy/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens a shared CV from the address, and again on hash change", async () => {
    const hash = await encodeShare({ md: "# Shared Person\n", paper: "a4", compact: false });
    let current = hash;
    const clearHash = vi.fn(() => {
      current = "";
    });
    renderApp({ hash: () => current, clearHash });
    await waitFor(() => {
      expect(printed.name()).toEqual(["Shared Person"]);
    });
    expect(clearHash).toHaveBeenCalledOnce();
    expect(toast().textContent).toBe("Opened the shared CV and saved it in this browser.");
    current = await encodeShare({ md: "# Another\n", paper: "a4", compact: false });
    fireEvent(window, new HashChangeEvent("hashchange"));
    await waitFor(() => {
      expect(printed.name()).toEqual(["Another"]);
    });
  });
});

describe("views and history", () => {
  it("edits the markdown directly and undoes with the keyboard", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("tab", { name: "Markdown" }));
    const source = screen.getByRole("textbox", { name: "CV as markdown" });
    fireEvent.change(source, { target: { value: "# Typed Here\n\n## Notes\n\n- one\n" } });
    fireEvent.scroll(source, { target: { scrollTop: 10 } });
    expect(printed.name()).toEqual(["Typed Here"]);
    fireEvent.keyDown(window, { key: "z", metaKey: true });
    expect(printed.name()).toEqual(["Rowan Ellis"]);
    fireEvent.keyDown(window, { key: "z", metaKey: true, shiftKey: true });
    expect(printed.name()).toEqual(["Typed Here"]);
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(printed.name()).toEqual(["Typed Here"]);
    fireEvent.keyDown(window, { key: "x", metaKey: true });
    fireEvent.keyDown(window, { key: "z", metaKey: true, altKey: true });
    fireEvent.keyDown(window, { key: "z" });
    await user.click(screen.getByRole("tab", { name: "Visual" }));
    await user.click(screen.getByRole("button", { name: "Undo" }));
    await user.click(screen.getByRole("button", { name: "Redo" }));
    expect(printed.name()).toEqual(["Typed Here"]);
  });

  it("lists notes and jumps to what they are about", async () => {
    const user = userEvent.setup();
    renderApp();
    const notes = document.getElementById("notes");
    expect(notes).not.toHaveClass("has-notes");
    expect(notes?.querySelector("summary")?.textContent).toBe("Notes nothing to flag");
    await user.click(screen.getByRole("tab", { name: "Markdown" }));
    fireEvent.change(screen.getByRole("textbox", { name: "CV as markdown" }), {
      target: { value: "stray\n## Work\n### Acme\n- Building things\n" },
    });
    expect(document.getElementById("notes")).toHaveClass("has-notes");
    expect(document.querySelector("#notes summary")?.textContent).toBe("⚑ 4 things to look at");
    // The notes are the first thing in the editor, above its views.
    expect(document.querySelector(".editor-pane > #notes + .editor-scroll")).not.toBeNull();
    expect([...document.querySelectorAll("#notes li")].map((li) => li.textContent)).toEqual([
      "Header lines look like **Key:** value.",
      "Add your name.",
      "No email address in the header.",
      "Opens with “Building”. A past-tense verb reads as a result.",
    ]);
    await user.click(screen.getByRole("button", { name: /Opens with “Building”/ }));
    expect(screen.getByRole("tab", { name: "Visual" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("button", { name: /Header lines/ }));
    expect(screen.getByRole("tab", { name: "Markdown" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("button", { name: "Add your name." }));
    expect(within(section("Header")).getByRole("textbox", { name: "Name" })).toHaveFocus();
  });

  it("jumps from the paper and the outline to the editor", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(within(paper()).getByText("Rowan Ellis"));
    expect(within(section("Header")).getByRole("textbox", { name: "Name" })).toHaveFocus();
    await user.click(
      within(screen.getByRole("navigation", { name: "Sections" })).getByRole("button", {
        name: "Skills",
      }),
    );
    expect(within(section("Skills")).getByRole("textbox", { name: "Section" })).toHaveFocus();
    await user.click(within(paper()).getByText(/Rebuilt the plant/));
    expect(document.activeElement?.closest("[data-items]")).not.toBeNull();
  });

  it("switches between edit and paper on small screens, and opens the guide", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("tab", { name: "Paper" }));
    expect(document.querySelector(".workspace")).toHaveAttribute("data-view", "paper");
    await user.click(screen.getByRole("tab", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Guide" }));
    const guide = screen.getByRole("dialog", { name: "Guide" });
    fireEvent(guide, new Event("close"));
    expect(screen.queryByRole("dialog", { name: "Guide" })).toBeNull();
  });

  it("clears the message after a few seconds", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    expect(toast().textContent).toBe("Started a new CV from the example.");
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(toast().textContent).toBe("");
  });

  it("re-measures when fonts load and fits the paper to its pane", async () => {
    const listeners: (() => void)[] = [];
    const fonts = {
      ready: Promise.resolve(),
      addEventListener: (_: "loadingdone", l: () => void) => listeners.push(l),
      removeEventListener: vi.fn(),
    };
    let resize: () => void = () => undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: () => void) {
          resize = cb;
        }
        observe(): void {
          // Nothing to watch in jsdom.
        }
        disconnect(): void {
          // Nothing to stop.
        }
      },
    );
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(400);
    const { unmount } = renderApp({ fonts }, new DocStore(new MemoryStorage()));
    await act(async () => {
      await fonts.ready;
      listeners.forEach((l) => {
        l();
      });
      resize();
    });
    expect(document.querySelector(".pages")).toHaveStyle({
      zoom: String((400 - 32) / (210 * (96 / 25.4))),
    });
    unmount();
    expect(fonts.removeEventListener).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
