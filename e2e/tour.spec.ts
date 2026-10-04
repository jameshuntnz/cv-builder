import { expect, test } from "./test";
import { fieldOf, isMobile, open, paper, rich, section } from "./support";

/**
 * A walk through every kind of state the app has: folds open and closed, a field being
 * edited with its bar and link form, each menu and dialog open, the markdown view, the style
 * panel and a styled CV, and hidden panels. Each state is scanned by the accessibility
 * watcher. Run in light, dark and on a phone.
 */
test("every state of the editor passes an accessibility scan", async ({ page, a11y }) => {
  await open(page);
  await a11y.flush();

  await page.getByRole("button", { name: "Expand Fernhill Gardens" }).click();
  const bullets = rich(page, "Bullets for Lead Mobile Engineer");
  await bullets.click();
  const field = fieldOf(bullets);
  await expect(field.getByRole("button", { name: /^Bold/ })).toBeVisible();
  await field.getByRole("button", { name: /^Link/ }).click();
  await expect(field.getByRole("textbox", { name: "Link address" })).toBeVisible();
  await a11y.flush();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "More for Experience" }).click();
  await expect(page.getByRole("menu", { name: "More for Experience" })).toBeVisible();
  await a11y.flush();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Add a contact line" }).click();
  await a11y.flush();
  await page.keyboard.press("Escape");

  await section(page, "Skills").getByRole("textbox", { name: "Add to Languages" }).fill("Go");
  await a11y.flush();

  await page.getByRole("button", { name: "Share link" }).click();
  await expect(page.getByRole("dialog", { name: "Share link" })).toBeVisible();
  await a11y.flush();
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Guide" }).click();
  await expect(page.getByRole("dialog", { name: "Guide" })).toBeVisible();
  await a11y.flush();
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("tab", { name: "Markdown" }).click();
  await expect(page.getByRole("textbox", { name: "CV as markdown" })).toBeVisible();
  await a11y.flush();
  await page.getByRole("tab", { name: "Visual" }).click();

  // The Style tab, with a part opened, then a preset that changes colours and fonts.
  await page.getByRole("tab", { name: "Style" }).click();
  await page.getByRole("button", { name: "Expand Section headings" }).click();
  await expect(page.getByRole("spinbutton", { name: "Size", exact: true })).toBeVisible();
  await a11y.flush();
  await page.getByRole("button", { name: /^Modern/ }).click();
  await a11y.flush();
  await page.getByRole("tab", { name: "Visual" }).click();

  if (isMobile(page)) {
    await page.getByRole("tab", { name: "Paper" }).click();
    await expect(paper(page)).toBeVisible();
  } else {
    await page.getByRole("button", { name: "Collapse all" }).click();
    await page.getByRole("button", { name: "Hide the sections panel" }).click();
    await page.getByRole("button", { name: "Hide the paper preview" }).click();
    await expect(page.getByRole("button", { name: "Show sections" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Show paper" })).toBeVisible();
  }
  await a11y.flush();
});
