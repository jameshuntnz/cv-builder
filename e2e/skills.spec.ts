import { expect, test, type Locator } from "./test";
import { keyboardMove, open, printed, section } from "./support";

test.beforeEach(async ({ page }) => {
  await open(page);
});

function chips(row: Locator): Locator {
  return row.locator(".chip > span");
}

test("skills are added with Enter or a comma, and brackets keep their commas", async ({ page }) => {
  const skills = section(page, "Skills");
  const input = skills.getByRole("textbox", { name: "Add to Languages" });
  await input.fill("Go");
  await input.press("Enter");
  await input.pressSequentially("AWS (Lambda, S3), Rust,");
  await expect(input).toHaveValue("");
  const row = skills.locator(".skill").first();
  await expect(chips(row)).toHaveText([
    "Swift",
    "TypeScript",
    "SQL",
    "Go",
    "AWS (Lambda, S3)",
    "Rust",
  ]);
  await expect(printed(page).pairs.first()).toHaveText(
    "Languages: Swift, TypeScript, SQL, Go, AWS (Lambda, S3), Rust",
  );
});

test("a pasted list becomes chips", async ({ page }) => {
  const input = section(page, "Skills").getByRole("textbox", { name: "Add to Tools" });
  await input.fill("Vim, Git, ");
  await expect(chips(section(page, "Skills").locator(".skill").nth(2))).toHaveText([
    "Xcode",
    "Figma",
    "Firebase",
    "Vim",
    "Git",
  ]);
});

test("chips go with ×, and Backspace takes the last one back to edit", async ({ page }) => {
  const skills = section(page, "Skills");
  const row = skills.locator(".skill").first();
  await skills.getByRole("button", { name: "Remove TypeScript" }).click();
  await expect(chips(row)).toHaveText(["Swift", "SQL"]);
  const input = skills.getByRole("textbox", { name: "Add to Languages" });
  await input.press("Backspace");
  await expect(input).toHaveValue("SQL");
  await expect(chips(row)).toHaveText(["Swift"]);
  await input.fill("PostgreSQL");
  await input.press("Enter");
  await expect(printed(page).pairs.first()).toHaveText("Languages: Swift, PostgreSQL");
});

test("categories are added, renamed, reordered and removed", async ({ page }) => {
  const skills = section(page, "Skills");
  const paper = printed(page);
  await skills.getByRole("button", { name: "+ Category" }).click();
  await skills.getByRole("textbox", { name: "Category" }).last().fill("Spoken");
  await skills.getByRole("textbox", { name: "Add to Spoken" }).fill("English, Gaelic,");
  await expect(paper.pairs).toHaveText([
    "Languages: Swift, TypeScript, SQL",
    "Frameworks: SwiftUI, React Native",
    "Tools: Xcode, Figma, Firebase",
    "Spoken: English, Gaelic",
  ]);

  await keyboardMove(page.getByRole("button", { name: "Move Spoken", exact: true }), "ArrowUp", 3);
  await expect(paper.pairs.first()).toHaveText("Spoken: English, Gaelic");

  await skills.getByRole("textbox", { name: "Category" }).first().fill("Speaks");
  await expect(paper.pairs.first()).toHaveText("Speaks: English, Gaelic");
  await skills.getByRole("button", { name: "Remove Speaks" }).click();
  await expect(paper.pairs).toHaveCount(3);
});
