import { readFileSync } from "node:fs";
import { embeddedFonts, pageSizes, printPdf } from "./pdf";
import { openWith } from "./support";
import { expect, test } from "./test";
import { rasterise, strayInk, type Ink } from "./vrt/ink";
import { pairLines, textLines } from "./vrt/lines";

/**
 * Visual regression against the Typst template: e2e/vrt/fixture.md, laid out by the builder,
 * must match e2e/vrt/reference/fixture.pdf (Typst's own output, from `pnpm vrt:reference`)
 * line for line and, drawn by the same rasteriser (poppler's pdftoppm), pixel for pixel.
 *
 * Only on macOS, where the builder and Typst both set Apple's Charter, the font the template
 * names. Elsewhere the builder falls back to XCharter, the same design a hair narrower.
 */
const REFERENCE = "e2e/vrt/reference";
const fixture = readFileSync("e2e/vrt/fixture.md", "utf8");

/** Points a line may sit from Typst's; the page body is laid out at 4x, so this is sub-pixel. */
const MAX_DY = 0.6;
const MAX_DX = 0.5;
/**
 * Pixels of ink one side has and the other lacks within a pixel, per page at 96 dpi. A bullet
 * marker is about 9, a word about 100. What remains is Typst breaking link underlines around
 * descenders, which Chrome doesn't do in print.
 */
const MAX_STRAY = 10;

test.skip(
  process.platform !== "darwin",
  "The reference is set in Apple's Charter, which only macOS has.",
);

test.beforeEach(async ({ page }) => {
  await openWith(page, fixture);
});

test("every line of text sits where Typst puts it", async ({ page }, info) => {
  const pdf = await printPdf(page);
  expect(embeddedFonts(pdf.toString("latin1"))).toEqual([
    "Charter-Bold",
    "Charter-Italic",
    "Charter-Roman",
  ]);
  const reference = readFileSync(`${REFERENCE}/fixture.pdf`);
  expect(pageSizes(pdf.toString("latin1"))).toHaveLength(
    pageSizes(reference.toString("latin1")).length,
  );

  const pairs = pairLines(
    await textLines(new Uint8Array(reference)),
    await textLines(new Uint8Array(pdf)),
  );
  const report = pairs.map(([ref, got]) => ({
    page: ref.page,
    text: ref.text.slice(0, 40),
    dy: got ? Math.round((got.baseline - ref.baseline) * 100) / 100 : null,
    dx: got ? Math.round((got.left - ref.left) * 100) / 100 : null,
  }));
  await info.attach("line-offsets.json", {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json",
  });

  // Same lines: same words, same line breaks, same pages.
  expect(report.filter((r) => r.dy === null).map((r) => r.text)).toEqual([]);
  // Each within a fraction of a point of Typst's position.
  expect(
    report.filter((r) => Math.abs(r.dy ?? 0) > MAX_DY || Math.abs(r.dx ?? 0) > MAX_DX),
  ).toEqual([]);
});

test("every page carries the same ink as Typst's, to the pixel", async ({ page }) => {
  const reference = rasterise(readFileSync(`${REFERENCE}/fixture.pdf`));
  const actual = rasterise(await printPdf(page));
  const sizes = (pages: Ink[]): string[] =>
    pages.map((p) => `${String(p.width)}x${String(p.height)}`);
  expect(sizes(actual)).toEqual(sizes(reference));
  const stray = reference.map((ref, i) => {
    const got = actual[i] ?? ref;
    return { page: i + 1, missing: strayInk(ref, got), extra: strayInk(got, ref) };
  });
  expect(stray).toEqual(
    stray.map((s) => ({
      ...s,
      missing: Math.min(s.missing, MAX_STRAY),
      extra: Math.min(s.extra, MAX_STRAY),
    })),
  );
});
