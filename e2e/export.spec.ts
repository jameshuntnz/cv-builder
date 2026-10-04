import { embeddedFonts, pageSizes, printToPdf } from "./pdf";
import { expect, test } from "./test";
import { open } from "./support";

/** Page sizes in points, as Chromium writes them. */
const A4 = { width: 594.95996, height: 841.91998 };
const LETTER = { width: 612, height: 792 };
/** The example's faces: Apple's Charter on a Mac, the bundled XCharter everywhere else. */
const CHARTER = ["Bold", "Italic", "Roman"].map((face) =>
  process.platform === "darwin" ? `Charter-${face}` : `XCharter-${face}`,
);

test.beforeEach(async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "PDF output is Chromium's");
  await open(page);
});

test("the example prints as one A4 page with only the CV on it", async ({ page }) => {
  const pdf = await printToPdf(page);
  expect(pageSizes(pdf)).toEqual([A4]);
  expect(embeddedFonts(pdf)).toEqual(CHARTER);
});

test("print shows the pages and nothing of the app around them", async ({ page }) => {
  await page.emulateMedia({ media: "print" });
  for (const hidden of [".bar", ".outline", ".editor-pane", ".pane-head", ".splitter", ".tabs"]) {
    await expect(page.locator(hidden).first()).toBeHidden();
  }
  await expect(page.locator(".pages .page")).toHaveCount(1);
  await expect(page.locator(".pages")).toHaveCSS("zoom", "1");
});

test("US Letter prints on Letter paper", async ({ page }) => {
  await page.getByRole("combobox", { name: "Paper" }).selectOption("letter");
  expect(pageSizes(await printToPdf(page))).toEqual([LETTER]);
});

test("a long CV breaks onto a second page with the name and page number at the foot", async ({
  page,
}) => {
  await page.getByRole("tab", { name: "Markdown" }).click();
  const source = page.getByRole("textbox", { name: "CV as markdown" });
  const more = Array.from(
    { length: 6 },
    (_, i) =>
      `### Company ${String(i)} – Town, UK | 201${String(i)}\n*An employer.*\n\n**Engineer** | 201${String(i)}\n- Built a thing people used every day for years.\n- Fixed another thing that had been broken a while.\n- Wrote the guide the team still reads.\n`,
  ).join("\n");
  const md = await source.inputValue();
  await source.fill(md.replace("## Projects", `${more}\n## Projects`));
  await expect(page.locator(".pages .page")).toHaveCount(2);
  await expect(page.locator(".pages .page").nth(1).locator(".page-footer")).toHaveText(
    "Rowan EllisPage 2 of 2",
  );
  await expect(page.locator(".pages .page").first().locator(".page-footer")).toHaveCount(0);
  expect(pageSizes(await printToPdf(page))).toEqual([A4, A4]);
});

test("Export PDF names the file after the person, then puts the title back", async ({ page }) => {
  await page.evaluate(() => {
    // Stand in for the print dialog: record the title it would have used.
    window.print = () => {
      document.body.dataset["printedAs"] = document.title;
    };
  });
  await page.getByRole("button", { name: "Export PDF" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-printed-as", "Rowan-Ellis-CV");
  await expect(page).toHaveTitle("CV Builder");
});
