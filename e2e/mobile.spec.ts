import { expect, test } from "./test";
import { open } from "./support";

test("on a phone, edit and paper are tabs, and nothing scrolls sideways", async ({ page }) => {
  await open(page);
  const width = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    window.innerWidth,
  ]);
  expect(width[0]).toBe(width[1]);
  await expect(page.getByRole("region", { name: "Header" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeHidden();
  await expect(page.getByRole("separator")).toBeHidden();

  await page
    .getByRole("region", { name: "Header" })
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Pocket CV");
  await page.getByRole("tab", { name: "Paper" }).click();
  const sheet = page.getByRole("region", { name: "Page 1", exact: true });
  await expect(sheet.getByRole("heading", { level: 1 })).toHaveText("Pocket CV");
  const box = await sheet.boundingBox();
  expect(Math.round(box?.width ?? 0) <= (page.viewportSize()?.width ?? 0)).toBe(true);

  await sheet.getByRole("heading", { level: 1 }).click();
  await expect(page.getByRole("tab", { name: "Edit" })).toHaveAttribute("aria-selected", "true");
  await expect(
    page
      .getByRole("region", { name: "Header" })
      .getByRole("textbox", { name: "Name", exact: true }),
  ).toBeFocused();
});
