import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";

/** A page as ink: true where a pixel is darker than mid-grey, so a hairline rule still counts. */
export interface Ink {
  readonly width: number;
  readonly height: number;
  readonly dark: Uint8Array;
}

const INK_LUMA = 200;

/**
 * Every page of a PDF drawn by poppler's pdftoppm at 96 dpi. Both sides of a comparison go
 * through the same rasteriser, so differences are in the drawing, not in anti-aliasing.
 */
export function rasterise(pdf: Uint8Array): Ink[] {
  const dir = mkdtempSync(join(tmpdir(), "vrt-"));
  try {
    writeFileSync(join(dir, "in.pdf"), pdf);
    execFileSync("pdftoppm", ["-r", "96", "-png", join(dir, "in.pdf"), join(dir, "page")]);
    return readdirSync(dir)
      .filter((f) => f.startsWith("page"))
      .sort()
      .map((f) => toInk(PNG.sync.read(readFileSync(join(dir, f)))));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function toInk(png: PNG): Ink {
  const dark = new Uint8Array(png.width * png.height);
  for (let i = 0; i < dark.length; i++) {
    const [r = 255, g = 255, b = 255] = png.data.subarray(i * 4, i * 4 + 3);
    dark[i] = r * 0.3 + g * 0.59 + b * 0.11 < INK_LUMA ? 1 : 0;
  }
  return { width: png.width, height: png.height, dark };
}

function inkNear(ink: Ink, x: number, y: number): boolean {
  for (let yy = Math.max(0, y - 1); yy <= Math.min(ink.height - 1, y + 1); yy++) {
    for (let xx = Math.max(0, x - 1); xx <= Math.min(ink.width - 1, x + 1); xx++) {
      if (ink.dark[yy * ink.width + xx] === 1) return true;
    }
  }
  return false;
}

/**
 * Pixels of ink in `a` with no ink within one pixel in `b`: what `b` is missing. Sub-pixel
 * shifts of a line are allowed; a missing rule, bullet, word or colour change is not.
 */
export function strayInk(a: Ink, b: Ink): number {
  let stray = 0;
  for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < a.width; x++) {
      if (a.dark[y * a.width + x] === 1 && !inkNear(b, x, y)) stray++;
    }
  }
  return stray;
}
