import { readFileSync } from "node:fs";
import { expect, test } from "./test";
import { open, printed, SAMPLE_BULLETS, section } from "./support";

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("edits survive a reload", async ({ page }) => {
  await section(page, "Header")
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Kept Name");
  // Saving waits for typing to settle.
  const today = await page.evaluate(() =>
    new Date().toLocaleDateString(undefined, { day: "numeric", month: "short" }),
  );
  await expect(
    page.getByRole("combobox", { name: "Open a saved CV" }).locator("option"),
  ).toHaveText([`Kept Name · ${today}`]);
  await page.reload();
  await expect(printed(page).name).toHaveText("Kept Name");
  await expect(printed(page).bullets).toHaveText(SAMPLE_BULLETS);
});

test("several CVs live side by side, and one can be deleted", async ({ page }) => {
  const picker = page.getByRole("combobox", { name: "Open a saved CV" });
  await section(page, "Header").getByRole("textbox", { name: "Name", exact: true }).fill("First");
  await page.getByRole("button", { name: "New", exact: true }).click();
  await expect(printed(page).name).toHaveText("Rowan Ellis");
  await expect(picker.locator("option")).toHaveCount(2);
  await picker.selectOption({
    label: (await picker.locator("option", { hasText: "First" }).textContent()) ?? "",
  });
  await expect(printed(page).name).toHaveText("First");

  page.once("dialog", (dialog) => {
    expect(dialog.message()).toBe("Delete First from this browser? This can't be undone.");
    void dialog.accept();
  });
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(printed(page).name).toHaveText("Rowan Ellis");
  await expect(picker.locator("option")).toHaveCount(1);
});

test("Save .md downloads the CV as markdown, and Open .md reads one back", async ({
  page,
}, info) => {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save .md" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("Rowan-Ellis-CV.md");
  const path = info.outputPath("cv.md");
  await file.saveAs(path);
  const md = readFileSync(path, "utf8");
  expect(md.split("\n").slice(0, 3)).toEqual(["# Rowan Ellis", "", "**Title:** Mobile Engineer"]);

  await page.getByLabel("Markdown file to open").setInputFiles({
    name: "other.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Other Person\n\n## Work\n\n- Did things.\n"),
  });
  await expect(printed(page).name).toHaveText("Other Person");
  await expect(printed(page).bullets).toHaveText(["Did things."]);
  await expect(page.locator(".toast")).toHaveText("Opened other.md as a new CV.");
});

test("a share link opens the CV in another browser, once, and survives being cut short", async ({
  page,
  browser,
}) => {
  await section(page, "Header")
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Travelling CV");
  await page.getByRole("button", { name: "Share link" }).click();
  const dialog = page.getByRole("dialog", { name: "Share link" });
  const url = await dialog.getByRole("textbox", { name: "Share link" }).inputValue();
  expect(url.slice(0, url.indexOf("#"))).toBe(page.url().split("#")[0]);
  await dialog.getByRole("button", { name: "Close" }).click();

  const other = await browser.newContext();
  const elsewhere = await other.newPage();
  await elsewhere.goto(url);
  await expect(printed(elsewhere).name).toHaveText("Travelling CV");
  await expect(elsewhere.locator(".toast")).toHaveText(
    "Opened the shared CV and saved it in this browser.",
  );
  // The address is cleaned up, so a reload doesn't import it again.
  expect(new URL(elsewhere.url()).hash).toBe("");
  await elsewhere.goto(url);
  await expect(elsewhere.locator(".toast")).toHaveText(
    "That CV is already saved here, so it was opened.",
  );
  await expect(
    elsewhere.getByRole("combobox", { name: "Open a saved CV" }).locator("option"),
  ).toHaveCount(2);

  await elsewhere.goto(url.slice(0, -20));
  await expect(elsewhere.locator(".toast")).toHaveText("That share link is damaged or incomplete.");
  await other.close();
});
