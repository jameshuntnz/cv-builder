import { expect, test } from "./test";
import { open, printed } from "./support";

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("the markdown view edits the CV, and undo and redo work across views", async ({ page }) => {
  await page.getByRole("tab", { name: "Markdown" }).click();
  const source = page.getByRole("textbox", { name: "CV as markdown" });
  await source.fill("# Typed Here\n\n## Notes\n\n- one\n- two\n");
  const paper = printed(page);
  await expect(paper.name).toHaveText("Typed Here");
  await expect(paper.sections).toHaveText(["Notes"]);
  await expect(paper.bullets).toHaveText(["one", "two"]);

  await page.keyboard.press("ControlOrMeta+z");
  await expect(paper.name).toHaveText("Rowan Ellis");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(paper.name).toHaveText("Typed Here");

  await page.getByRole("tab", { name: "Visual" }).click();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(paper.name).toHaveText("Rowan Ellis");
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(paper.name).toHaveText("Typed Here");
});

test("notes sit at the top and jump to what they're about", async ({ page }) => {
  const notes = page.locator("#notes");
  await expect(notes.locator("summary")).toHaveText("Notes nothing to flag");
  await expect(notes).not.toHaveClass(/has-notes/);

  await page.getByRole("tab", { name: "Markdown" }).click();
  await page
    .getByRole("textbox", { name: "CV as markdown" })
    .fill("# A\n\n**Email:** a@b.c\n\n## Work\n\n### Acme\n- Building things\n");
  await expect(notes.locator("summary")).toHaveText("⚑ 1 thing to look at");
  await expect(notes.getByRole("listitem")).toHaveText([
    "Opens with “Building”. A past-tense verb reads as a result.",
  ]);
  // First in the editor, above the views.
  expect(
    await page
      .locator(".editor-pane > *")
      .evaluateAll((els: Element[]) => els.map((e) => e.getAttribute("class") ?? "")),
  ).toEqual(["editor-head", "notes has-notes", "editor-scroll"]);

  await notes.getByRole("button").click();
  await expect(page.getByRole("tab", { name: "Visual" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("textbox", { name: "Bullets for Acme" })).toBeFocused();
});
