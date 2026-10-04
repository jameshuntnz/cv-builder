import { embeddedFonts, pageSizes, printToPdf } from "./pdf";
import { expect, test } from "./test";
import { open, printed } from "./support";

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("the paper is black on white in either app theme", async ({ page }) => {
  const paper = printed(page);
  // Whatever the app's own palette, the CV prints in its own colours.
  await expect(paper.name).toHaveCSS("color", "rgb(26, 26, 26)");
  await expect(paper.sections.first()).toHaveCSS("color", "rgb(26, 26, 26)");
  await expect(paper.sections.first()).toHaveCSS("border-bottom-color", "rgb(26, 26, 26)");
  await expect(paper.bullets.first()).toHaveCSS("color", "rgb(26, 26, 26)");
  await expect(paper.pages.first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

test("each part takes its own font, size, case and colour", async ({ page }) => {
  const paper = printed(page);
  await page.getByRole("tab", { name: "Style" }).click();
  await page.getByRole("combobox", { name: "Typeface" }).first().selectOption("sourceSans");
  await page.getByRole("button", { name: "Expand Section headings" }).click();
  const section = page.locator(".fold", {
    has: page.getByRole("button", { name: "Collapse Section headings" }),
  });
  await section.getByRole("spinbutton", { name: "Size", exact: true }).fill("14");
  await section.getByRole("combobox", { name: "Letters" }).selectOption("upper");
  await section.getByLabel("Colour").fill("#7a1f1f");

  await expect(paper.bullets.first()).toHaveCSS("font-family", /^"Source Sans 3"/);
  // 14pt is 18.6667px, as Chromium rounds it.
  await expect(paper.sections.first()).toHaveCSS("font-size", "18.6667px");
  await expect(paper.sections.first()).toHaveCSS("text-transform", "uppercase");
  await expect(paper.sections.first()).toHaveCSS("color", "rgb(122, 31, 31)");
  await expect(paper.name).toHaveCSS("color", "rgb(26, 26, 26)");
  expect(await page.evaluate(() => document.fonts.check('10pt "Source Sans 3"'))).toBe(true);
});

test("a style travels in the share link to another browser", async ({ page, browser }) => {
  await page.getByRole("tab", { name: "Style" }).click();
  await page.getByRole("button", { name: /^Modern/ }).click();
  await page.getByRole("button", { name: "Share link" }).click();
  const url = await page.getByRole("textbox", { name: "Share link" }).inputValue();

  // A separate browser profile: nothing in common with this one but the link.
  const other = await browser.newContext();
  const elsewhere = await other.newPage();
  await elsewhere.goto(url);
  const paper = printed(elsewhere);
  await expect(paper.name).toHaveText("Rowan Ellis");
  await expect(paper.sections.first()).toHaveCSS("text-transform", "uppercase");
  await expect(paper.name).toHaveCSS("color", "rgb(31, 78, 121)");
  await expect(paper.name).toHaveCSS("font-family", /^"Source Sans 3"/);
  await other.close();
});

test("a styled CV exports to PDF with its own fonts embedded", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "PDF output is Chromium's");
  await page.getByRole("tab", { name: "Style" }).click();
  await page.getByRole("button", { name: /^Modern/ }).click();
  const pdf = await printToPdf(page);
  expect(pageSizes(pdf)).toHaveLength(1);
  // The bundled files carry the family name of the variable master they were cut from.
  expect(embeddedFonts(pdf)).toEqual([
    "SourceSans3ExtraLight-Bold",
    "SourceSans3ExtraLight-Italic",
    "SourceSans3ExtraLight-Regular",
  ]);
});
