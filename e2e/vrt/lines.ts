import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

/** One line of text on a page: its baseline and left edge in points from the top-left. */
export interface TextLine {
  readonly page: number;
  readonly baseline: number;
  readonly left: number;
  readonly text: string;
}

/** Text compared as content: spacing and quote style are the renderer's business. */
export function normalise(text: string): string {
  return text.replace(/\s+/g, "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

interface Run {
  readonly x: number;
  readonly y: number;
  readonly str: string;
}

/** A run of text from pdf.js, with y measured down from the top of the page. */
function runOf(item: unknown, height: number): Run | undefined {
  if (typeof item !== "object" || item === null || !("str" in item) || !("transform" in item)) {
    return undefined;
  }
  const { str, transform } = item;
  if (typeof str !== "string" || str.trim() === "" || !Array.isArray(transform)) return undefined;
  const x: unknown = transform[4];
  const y: unknown = transform[5];
  return typeof x === "number" && typeof y === "number" ? { x, y: height - y, str } : undefined;
}

/** Runs on one baseline (within 0.3pt), left to right, as one line. */
function linesOf(runs: Run[], page: number): TextLine[] {
  runs.sort((a, b) => a.y - b.y || a.x - b.x);
  const groups: Run[][] = [];
  for (const run of runs) {
    const group = groups.at(-1);
    if (group && Math.abs((group[0]?.y ?? 0) - run.y) < 0.3) group.push(run);
    else groups.push([run]);
  }
  return groups.map((group) => {
    const sorted = [...group].sort((a, b) => a.x - b.x);
    return {
      page,
      baseline: sorted[0]?.y ?? 0,
      left: sorted[0]?.x ?? 0,
      text: normalise(sorted.map((r) => r.str).join("")),
    };
  });
}

/**
 * Every line of text in a PDF. Runs on one baseline form a line; a right-aligned date set on
 * its own baseline is its own line, in both renderers alike.
 */
export async function textLines(pdf: Uint8Array): Promise<TextLine[]> {
  const task = getDocument({ data: pdf, disableFontFace: true, useSystemFonts: false });
  const doc = await task.promise;
  const lines: TextLine[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const height = page.getViewport({ scale: 1 }).height;
    const runs = (await page.getTextContent()).items.flatMap((item) => runOf(item, height) ?? []);
    lines.push(...linesOf(runs, p));
  }
  await task.destroy();
  return lines;
}

/** Each reference line with the builder's line of the same text, in reading order. */
export function pairLines(
  reference: readonly TextLine[],
  built: readonly TextLine[],
): [TextLine, TextLine | undefined][] {
  const pool = [...built];
  return reference.map((line) => {
    const at = pool.findIndex((b) => b.page === line.page && b.text === line.text);
    const [match] = at >= 0 ? pool.splice(at, 1) : [];
    return [line, match];
  });
}
