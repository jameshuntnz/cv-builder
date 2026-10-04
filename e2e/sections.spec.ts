import { expect, test, type Locator, type Page } from "./test";
import { keyboardMove, open, printed, rich, SAMPLE_SECTIONS, section } from "./support";

test.beforeEach(async ({ page }) => {
  await open(page);
});

/** The section names in the left panel, in order. */
function outlineNames(page: Page): Locator {
  return page.getByRole("navigation", { name: "Sections" }).locator(".outline-name");
}

test("hiding a section takes it off the paper but keeps it in the editor", async ({ page }) => {
  const paper = printed(page);
  await page.getByRole("button", { name: "Hide Projects", exact: true }).click();
  await expect(paper.sections).toHaveText(["Experience", "Skills", "Education"]);
  await expect(section(page, "Projects")).toHaveClass(/is-hidden/);
  await expect(
    section(page, "Projects").getByRole("button", { name: "Show Projects on the page" }),
  ).toHaveAttribute("aria-pressed", "true");
  await section(page, "Projects")
    .getByRole("button", { name: "Show Projects on the page" })
    .click();
  await expect(paper.sections).toHaveText(SAMPLE_SECTIONS);
});

test("renaming a section renames it everywhere", async ({ page }) => {
  await section(page, "Skills").getByRole("textbox", { name: "Section" }).fill("Toolbox");
  await expect(printed(page).sections).toHaveText([
    "Experience",
    "Projects",
    "Toolbox",
    "Education",
  ]);
  await expect(outlineNames(page)).toHaveText(["Experience", "Projects", "Toolbox", "Education"]);
});

test("sections reorder by dragging in the outline", async ({ page }) => {
  const handle = page.getByRole("button", { name: "Move Education" });
  const target = page.getByRole("button", { name: "Move Experience" });
  const from = await handle.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("handles not laid out");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  // dnd-kit starts a drag after a few pixels of movement; move in steps like a hand would.
  await page.mouse.move(from.x + from.width / 2, from.y - 10, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + 2, { steps: 10 });
  await page.mouse.up();
  const order = ["Education", "Experience", "Projects", "Skills"];
  await expect(outlineNames(page)).toHaveText(order);
  await expect(printed(page).sections).toHaveText(order);
});

test("sections reorder from the keyboard", async ({ page }) => {
  await keyboardMove(
    page.getByRole("button", { name: "Move Experience", exact: true }),
    "ArrowDown",
  );
  await expect(printed(page).sections).toHaveText([
    "Projects",
    "Experience",
    "Skills",
    "Education",
  ]);
});

test("a new section is added from a preset and can be deleted", async ({ page }) => {
  const paper = printed(page);
  await page.getByRole("combobox", { name: "New section" }).selectOption("summary");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await rich(page, "Summary paragraph").fill("Builds calm apps for busy people.");
  await expect(paper.sections).toHaveText([...SAMPLE_SECTIONS, "Summary"]);
  await expect(paper.paragraphs).toHaveText(["Builds calm apps for busy people."]);

  page.once("dialog", (dialog) => void dialog.dismiss());
  await page.getByRole("button", { name: "More for Summary" }).click();
  await page.getByRole("menuitem", { name: "Delete Summary" }).click();
  await expect(paper.sections).toHaveText([...SAMPLE_SECTIONS, "Summary"]);

  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "More for Summary" }).click();
  await page.getByRole("menuitem", { name: "Delete Summary" }).click();
  await expect(paper.sections).toHaveText(SAMPLE_SECTIONS);
  await expect(section(page, "Summary")).toHaveCount(0);
});

test("each section offers the add that fits it", async ({ page }) => {
  await expect(section(page, "Experience").locator(".adders > button")).toHaveText(["+ Employer"]);
  await expect(section(page, "Projects").locator(".adders > button")).toHaveText(["+ Entry"]);
  await expect(section(page, "Skills").locator(".adders > button")).toHaveText(["+ Category"]);
  await expect(section(page, "Education").locator(".adders > button")).toHaveCount(0);
  await expect(
    section(page, "Education").getByRole("button", { name: "+ Add bullet" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "More for Education" }).click();
  await expect(
    page.getByRole("menu", { name: "More for Education" }).getByRole("menuitem"),
  ).toHaveText([
    "Add employer with roles",
    "Add entry",
    "Add skill category",
    "Add paragraph",
    "Delete Education",
  ]);
});

test("menus close on Escape and on a click elsewhere, and are opaque", async ({ page }) => {
  const menu = page.getByRole("menu", { name: "Add a contact line" });
  await page.getByRole("button", { name: "Add a contact line" }).click();
  await expect(menu).toBeVisible();
  await expect(menu).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await page.getByRole("button", { name: "Add a contact line" }).click();
  await page.getByRole("heading", { name: "Header" }).click();
  await expect(menu).toBeHidden();
});
