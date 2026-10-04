import { isPaper } from "./store";
import type { Paper } from "./model";

/** What a share link carries. It lives after the `#`, which browsers never send to a server. */
export interface Shared {
  readonly md: string;
  readonly paper: Paper;
  readonly compact: boolean;
}

const PREFIX = "#cv=";
const VERSION = 1;

export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

type Transform = CompressionStream | DecompressionStream;

async function pipe(
  bytes: Uint8Array<ArrayBuffer>,
  stream: Transform,
): Promise<Uint8Array<ArrayBuffer>> {
  const source = new ReadableStream<Uint8Array<ArrayBuffer>>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  const out = source.pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeShare(data: Shared): Promise<string> {
  const json = JSON.stringify({ v: VERSION, ...data });
  const packed = await pipe(new TextEncoder().encode(json), new CompressionStream("deflate-raw"));
  return PREFIX + toBase64Url(packed);
}

export function isShared(x: unknown): x is Shared & { v: number } {
  return (
    typeof x === "object" &&
    x !== null &&
    "v" in x &&
    x.v === VERSION &&
    "md" in x &&
    typeof x.md === "string" &&
    "paper" in x &&
    isPaper(x.paper) &&
    "compact" in x &&
    typeof x.compact === "boolean"
  );
}

/** Read a share hash. Anything malformed comes back as undefined, never an exception. */
export async function decodeShare(hash: string): Promise<Shared | undefined> {
  if (!hash.startsWith(PREFIX)) return undefined;
  try {
    const bytes = await pipe(
      fromBase64Url(hash.slice(PREFIX.length)),
      new DecompressionStream("deflate-raw"),
    );
    const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!isShared(data)) return undefined;
    return { md: data.md, paper: data.paper, compact: data.compact };
  } catch {
    return undefined;
  }
}
