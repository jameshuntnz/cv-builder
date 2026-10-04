import { describe, expect, it } from "vitest";
import {
  browserStorage,
  DocStore,
  isDoc,
  MemoryStorage,
  newId,
  parseDocs,
  type KeyValue,
} from "../src/store";

const doc: { id: string; md: string; paper: "a4"; compact: boolean } = {
  id: "a",
  md: "# A",
  paper: "a4",
  compact: false,
};

describe("DocStore", () => {
  it("saves, lists newest first, gets and removes", () => {
    let t = 0;
    const store = new DocStore(new MemoryStorage(), () => ++t);
    store.save(doc);
    store.save({ ...doc, id: "b" });
    expect(store.list().map((d) => d.id)).toEqual(["b", "a"]);
    store.save({ ...doc, md: "# A2" });
    expect(store.list().map((d) => d.id)).toEqual(["a", "b"]);
    expect(store.get("a")?.md).toBe("# A2");
    store.remove("a");
    expect(store.get("a")).toBeUndefined();
  });

  it("remembers the active doc", () => {
    const store = new DocStore(new MemoryStorage());
    expect(store.activeId()).toBeNull();
    store.setActive("x");
    expect(store.activeId()).toBe("x");
  });

  it("keeps working when writes fail", () => {
    const full: KeyValue = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    const store = new DocStore(full);
    expect(store.save(doc).id).toBe("a");
    expect(() => {
      store.setActive("a");
    }).not.toThrow();
  });
});

describe("parseDocs", () => {
  it("drops anything that isn't a doc", () => {
    const good = { ...doc, updated: 1 };
    expect(parseDocs(JSON.stringify([good, { id: 1 }, null, { ...good, paper: "a3" }]))).toEqual([
      good,
    ]);
    expect(parseDocs("{}")).toEqual([]);
    expect(parseDocs("not json")).toEqual([]);
    expect(parseDocs(null)).toEqual([]);
    expect(isDoc("x")).toBe(false);
  });
});

describe("browserStorage", () => {
  it("uses localStorage when it works", () => {
    expect(browserStorage()).toBe(window.localStorage);
  });

  it("falls back to memory when storage is blocked", () => {
    const s = browserStorage(() => {
      throw new Error("SecurityError");
    });
    expect(s).toBeInstanceOf(MemoryStorage);
  });
});

describe("newId", () => {
  it("is unique enough", () => {
    expect(new Set(Array.from({ length: 50 }, newId)).size).toBe(50);
  });
});
