import { describe, expect, it } from "vitest";
import { decodeShare, encodeShare, fromBase64Url, isShared, toBase64Url } from "../src/share";
import { SAMPLE } from "../src/sample";

/** Inflates a share link's body independently of src/share.ts. */
async function inflate(body: string): Promise<string> {
  const bytes = fromBase64Url(body);
  const source = new ReadableStream<BufferSource>({
    start(c) {
      c.enqueue(bytes);
      c.close();
    },
  });
  return new Response(source.pipeThrough(new DecompressionStream("deflate-raw"))).text();
}

describe("share links", () => {
  it("round-trips a CV through the hash, compressed", async () => {
    const hash = await encodeShare({ md: SAMPLE, paper: "letter", compact: true });
    const body = hash.slice("#cv=".length);
    expect(hash.slice(0, 4)).toBe("#cv=");
    // URL-safe base64: nothing that needs escaping in an address.
    expect(body.replace(/[A-Za-z0-9_-]/g, "")).toBe("");
    // Raw deflate of the versioned JSON. The exact bytes vary with the platform's zlib, so the
    // body is checked by inflating it, not against a pinned length.
    expect(await inflate(body)).toBe(
      JSON.stringify({ v: 1, md: SAMPLE, paper: "letter", compact: true }),
    );
    expect(await decodeShare(hash)).toEqual({ md: SAMPLE, paper: "letter", compact: true });
  });

  it("ignores other hashes and survives damaged ones", async () => {
    expect(await decodeShare("")).toBeUndefined();
    expect(await decodeShare("#section")).toBeUndefined();
    expect(await decodeShare("#cv=not-deflate")).toBeUndefined();
    const valid = await encodeShare({ md: "x", paper: "a4", compact: false });
    expect(await decodeShare(valid.slice(0, -6))).toBeUndefined();
  });

  it("rejects well-formed data of the wrong shape", async () => {
    const bytes = new TextEncoder().encode(
      JSON.stringify({ v: 1, md: 1, paper: "a4", compact: false }),
    );
    const source = new ReadableStream({
      start(c) {
        c.enqueue(bytes);
        c.close();
      },
    });
    const packed = new Uint8Array(
      await new Response(source.pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer(),
    );
    expect(await decodeShare(`#cv=${toBase64Url(packed)}`)).toBeUndefined();
    expect(isShared({ v: 2, md: "", paper: "a4", compact: false })).toBe(false);
    expect(isShared(null)).toBe(false);
  });

  it("base64url round-trips every byte value", () => {
    const all = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(fromBase64Url(toBase64Url(all))).toEqual(all);
  });
});
