import { afterEach, describe, expect, it, vi } from "vitest";
import { download, fileBase, slug } from "../src/files";

describe("file names", () => {
  it("makes a safe, readable base name", () => {
    expect(slug("Ngā Tāne O'Brien")).toBe("Nga-Tane-O-Brien");
    expect(slug("  ")).toBe("Untitled");
    expect(fileBase("Rowan Ellis")).toBe("Rowan-Ellis-CV");
  });
});

describe("download", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("clicks a temporary link to a blob, then frees it", () => {
    vi.useFakeTimers();
    const create = vi.fn(() => "blob:x");
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    download("a.md", "text");
    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector("a[download]")).toBeNull();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith("blob:x");
  });
});
