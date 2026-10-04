import { expect, test } from "./test";
import { open } from "./support";

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("the sections panel and the paper hide, leave a strip, and come back", async ({ page }) => {
  const workspace = page.locator(".workspace");
  await page.getByRole("button", { name: "Hide the sections panel" }).click();
  await expect(page.getByRole("navigation", { name: "Sections" })).toHaveCount(0);
  await expect(workspace).toHaveAttribute("data-outline", "hidden");
  await page.getByRole("button", { name: "Hide the paper preview" }).click();
  await expect(workspace).toHaveAttribute("data-paper", "hidden");
  await expect(page.getByRole("region", { name: "Paper" })).toBeHidden();

  await page.reload();
  await expect(workspace).toHaveAttribute("data-outline", "hidden");
  await expect(workspace).toHaveAttribute("data-paper", "hidden");

  await page.getByRole("button", { name: "Show sections" }).click();
  await page.getByRole("button", { name: "Show paper" }).click();
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Paper" })).toBeVisible();
});

test("the divider resizes the paper by dragging and by keyboard, and resets", async ({ page }) => {
  const divider = page.getByRole("separator", { name: "Resize the paper preview" });
  const paperPane = page.getByRole("region", { name: "Paper" });
  const width = async (): Promise<number> =>
    Math.round((await paperPane.boundingBox())?.width ?? 0);
  const start = await width();

  const box = await divider.boundingBox();
  if (!box) throw new Error("no divider");
  await page.mouse.move(box.x + box.width / 2, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 120, box.y + 200, { steps: 6 });
  await page.mouse.up();
  expect(await width()).toBe(start + 120);
  await expect(divider).toHaveAttribute("aria-valuenow", String(start + 120));

  await divider.focus();
  await page.keyboard.press("ArrowRight");
  expect(await width()).toBe(start + 120 - 32);
  await page.keyboard.press("Home");
  expect(await width()).toBe(start);
  await divider.dblclick();
  expect(await width()).toBe(start);
});

test("the paper stays in view while the editor scrolls", async ({ page }) => {
  await page.getByRole("button", { name: "Expand all" }).click();
  const scroller = page.locator(".editor-scroll");
  await scroller.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await page.mouse.wheel(0, 2000);
  // Scrolled to its end, inside the pane.
  expect(await scroller.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(
    page.viewportSize()?.height,
  );
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole("region", { name: "Page 1" })).toBeInViewport();
});
