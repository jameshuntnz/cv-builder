import type { Page } from "./test";

/** The PDF Chromium makes from the print view. */
export async function printPdf(page: Page): Promise<Buffer> {
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  await page.emulateMedia({ media: "screen" });
  return pdf;
}

/** The same PDF as text the readers below can scan. */
export async function printToPdf(page: Page): Promise<string> {
  return (await printPdf(page)).toString("latin1");
}

/** Each page's size in points, in order. */
export function pageSizes(pdf: string): { width: number; height: number }[] {
  return [
    ...pdf.matchAll(
      /\/Type\s*\/Page\b(?!s)[\s\S]*?\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/g,
    ),
  ].map((m) => ({ width: Number(m[3]), height: Number(m[4]) }));
}

/**
 * The fonts embedded in the file, without their subset prefixes, sorted and once each. Type 3
 * fonts (Chromium's form for CFF-flavoured web fonts) name themselves only in /FontName.
 */
export function embeddedFonts(pdf: string): string[] {
  const names = [...pdf.matchAll(/\/(?:BaseFont|FontName)\s*\/(?:[A-Z]{6}\+)?([\w-]+)/g)].map(
    (m) => m[1] ?? "",
  );
  return [...new Set(names)].sort();
}
