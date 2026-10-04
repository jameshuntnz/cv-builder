import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAMPLE } from "../src/sample";
import { encodeShare } from "../src/share";
import { DocStore, MemoryStorage, type Doc } from "../src/store";
import { fromDoc, initialDoc, reduce, toDoc, useWorkspace } from "../src/workspace";

const doc: Doc = { id: "d1", md: "# One\n", paper: "a4", compact: false, updated: 1 };

describe("reduce", () => {
  const ws = fromDoc(doc);

  it("edits, undoes and redoes, bumping the revision only when the CV is swapped", () => {
    const edited = reduce(ws, { type: "edit", action: { type: "setName", value: "Two" }, now: 0 });
    expect(edited.history.present.name).toBe("Two");
    expect(edited.revision).toBe(0);
    const undone = reduce(edited, { type: "undo" });
    expect(undone.history.present.name).toBe("One");
    expect(undone.revision).toBe(1);
    expect(reduce(undone, { type: "redo" }).revision).toBe(2);
    expect(reduce(ws, { type: "undo" })).toBe(ws);
    expect(reduce(ws, { type: "edit", action: { type: "remove", id: "x" }, now: 0 })).toBe(ws);
  });

  it("opens another doc and changes layout", () => {
    const opened = reduce(ws, { type: "open", doc: { ...doc, id: "d2", md: "# Two" } });
    expect(opened.id).toBe("d2");
    expect(opened.revision).toBe(1);
    expect(opened.history.present.name).toBe("Two");
    expect(reduce(ws, { type: "layout", layout: { compact: true } }).layout).toEqual({
      paper: "a4",
      compact: true,
    });
  });

  it("serializes back to a doc", () => {
    expect(toDoc(ws)).toEqual({ id: "d1", md: "# One\n", paper: "a4", compact: false });
  });
});

describe("initialDoc", () => {
  it("prefers the active doc, then the newest, then a new sample", () => {
    const store = new DocStore(new MemoryStorage());
    const sample = initialDoc(store);
    expect(sample.md).toBe(SAMPLE);
    const other = store.save({ ...doc, id: "other" });
    expect(initialDoc(store).id).toBe(other.id);
    store.setActive(sample.id);
    expect(initialDoc(store).id).toBe(sample.id);
  });
});

describe("useWorkspace", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup() {
    const store = new DocStore(new MemoryStorage());
    store.save(doc);
    const hook = renderHook(() => useWorkspace(store, 100));
    return { store, hook };
  }

  it("saves shortly after an edit", () => {
    const { store, hook } = setup();
    act(() => {
      hook.result.current.dispatch({ type: "setName", value: "Saved" });
    });
    expect(store.get("d1")?.md).toBe("# One\n");
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(store.get("d1")?.md).toBe("# Saved\n");
    expect(store.activeId()).toBe("d1");
  });

  it("undoes, redoes and changes layout", () => {
    const { hook } = setup();
    act(() => {
      hook.result.current.dispatch({ type: "setName", value: "X" });
    });
    act(() => {
      hook.result.current.undo();
    });
    expect(hook.result.current.ws.history.present.name).toBe("One");
    act(() => {
      hook.result.current.redo();
    });
    expect(hook.result.current.ws.history.present.name).toBe("X");
    act(() => {
      hook.result.current.setLayout({ paper: "letter" });
    });
    expect(hook.result.current.ws.layout.paper).toBe("letter");
  });

  it("creates, opens and removes docs, saving the one it leaves", () => {
    const { store, hook } = setup();
    act(() => {
      hook.result.current.dispatch({ type: "setName", value: "Edited" });
    });
    act(() => {
      hook.result.current.create("# New\n");
    });
    expect(store.get("d1")?.md).toBe("# Edited\n");
    expect(hook.result.current.docs).toHaveLength(2);
    expect(hook.result.current.ws.history.present.name).toBe("New");
    act(() => {
      hook.result.current.open("d1");
    });
    expect(hook.result.current.ws.id).toBe("d1");
    act(() => {
      hook.result.current.open("missing");
    });
    expect(hook.result.current.ws.id).toBe("d1");
    act(() => {
      hook.result.current.removeCurrent();
    });
    expect(store.get("d1")).toBeUndefined();
    act(() => {
      hook.result.current.removeCurrent();
    });
    expect(hook.result.current.ws.history.present.name).toBe("Rowan Ellis");
  });

  it("opens share links, once", async () => {
    vi.useRealTimers();
    const { store, hook } = setup();
    const hash = await encodeShare({ md: "# Shared\n", paper: "letter", compact: true });
    let message: string | undefined;
    await act(async () => {
      message = await hook.result.current.openShared(hash);
    });
    expect(message).toBe("Opened the shared CV and saved it in this browser.");
    expect(hook.result.current.ws.layout).toEqual({ paper: "letter", compact: true });
    await act(async () => {
      message = await hook.result.current.openShared(hash);
    });
    expect(message).toBe("That CV is already saved here, so it was opened.");
    expect(store.list().filter((d) => d.md === "# Shared\n")).toHaveLength(1);
    await act(async () => {
      message = await hook.result.current.openShared("#cv=broken");
    });
    expect(message).toBe("That share link is damaged or incomplete.");
    await act(async () => {
      message = await hook.result.current.openShared("");
    });
    expect(message).toBeUndefined();
  });
});
