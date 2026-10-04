import { expect, test } from "./test";
import {
  fieldOf,
  open,
  openWith,
  printed,
  rich,
  SAMPLE_BULLETS,
  section,
  selectIn,
  visible,
} from "./support";

test.beforeEach(async ({ page }) => {
  await open(page);
});

/** The example's bullets with `edit` applied to a copy. */
function bulletsWith(edit: (list: string[]) => void): string[] {
  const list = [...SAMPLE_BULLETS];
  edit(list);
  return list;
}

test.describe("header", () => {
  test("name, headline and contact lines print as you type", async ({ page }) => {
    const header = section(page, "Header");
    const paper = printed(page);
    await header.getByRole("textbox", { name: "Name", exact: true }).fill("Robin Tui");
    await header.getByRole("textbox", { name: "Headline" }).fill("Platform Engineer");
    await expect(paper.name).toHaveText("Robin Tui");
    await expect(paper.headline).toHaveText("Platform Engineer");

    await page.getByRole("button", { name: "Add a contact line" }).click();
    await page.getByRole("menuitem", { name: "Website" }).click();
    await header.getByRole("textbox", { name: "Website" }).fill("robin.example");
    await header.getByRole("button", { name: "Remove Phone" }).click();
    await expect(paper.contact).toHaveText(
      "robin.example|linkedin.com/in/example|github.com/example|rowan.ellis@example.com|Glasgow, UK",
    );
    await expect(paper.contact.getByRole("link", { name: "robin.example" })).toHaveAttribute(
      "href",
      "https://robin.example",
    );
    await expect(
      paper.contact.getByRole("link", { name: "rowan.ellis@example.com" }),
    ).toHaveAttribute("href", "mailto:rowan.ellis@example.com");
  });

  test("an extra line prints in italics under the contact line, with the location", async ({
    page,
  }) => {
    const paper = printed(page);
    await page.getByRole("button", { name: "Add a contact line" }).click();
    await page.getByRole("menuitem", { name: /^Other/ }).click();
    await section(page, "Header").getByRole("textbox", { name: "Availability" }).fill("From March");
    await expect(paper.extras).toHaveText(["Glasgow, UK · From March"]);
    await expect(paper.extras).toHaveCSS("font-style", "italic");
    await expect(paper.contact).toHaveText(
      "linkedin.com/in/example|github.com/example|rowan.ellis@example.com|+44 7700 900123",
    );
  });
});

test("a contact line too long for the page breaks between items, never inside one", async ({
  page,
}) => {
  await openWith(
    page,
    [
      "# Morgan Tate",
      "**Location:** Dunedin, NZ",
      "**Email:** morgan.tate@example.com",
      "**Phone:** +64 21 555 0199",
      "**LinkedIn:** linkedin.com/in/example-person",
      "**GitHub:** github.com/example-person",
      "**Website:** example-person.dev",
    ].join("\n"),
  );
  const items = printed(page).contact.locator(".cv-item");
  const tops = await items.evaluateAll((els) =>
    els.map((el) => [...el.getClientRects()].map((r) => Math.round(r.top))),
  );
  // Six items, each on one line, over two lines.
  expect(tops.map((rects) => rects.length)).toEqual([1, 1, 1, 1, 1, 1]);
  expect(new Set(tops.flat()).size).toBe(2);
});

test.describe("folding", () => {
  test("entries open from their toggle or their summary line, and all at once", async ({
    page,
  }) => {
    const experience = section(page, "Experience");
    const blurb = rich(page, "Description of Fernhill Gardens");
    await expect(blurb).toBeHidden();
    await experience.getByText("Fernhill Gardens", { exact: true }).click();
    await expect(blurb).toBeVisible();
    await expect(page.getByRole("button", { name: "Collapse Fernhill Gardens" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await page.getByRole("button", { name: "Collapse Fernhill Gardens" }).click();
    await expect(blurb).toBeHidden();

    await page.getByRole("button", { name: "Expand all" }).click();
    await expect(rich(page, "Bullets for Developer")).toBeVisible();
    await page.getByRole("button", { name: "Collapse all" }).click();
    await expect(experience.getByRole("button", { name: "Expand Experience" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(rich(page, "Bullets for Developer")).toBeHidden();
  });
});

test.describe("rich text", () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole("button", { name: "Expand Fernhill Gardens" }).click();
  });

  test("the field's own bar bolds and italicises the selection", async ({ page }) => {
    const bullets = rich(page, "Bullets for Lead Mobile Engineer");
    const bar = fieldOf(bullets);
    const paper = printed(page);
    await selectIn(bullets, "Ran");
    await bar.getByRole("button", { name: /^Bold/ }).click();
    await expect(bar.getByRole("button", { name: /^Bold/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const third = paper.bullets.nth(2);
    await expect(third.locator("strong")).toHaveText("Ran");
    await bar.getByRole("button", { name: /^Italic/ }).click();
    await expect(third.locator("strong > em")).toHaveText("Ran");
    await expect(third).toHaveText(SAMPLE_BULLETS[2] ?? "");
  });

  test("keyboard shortcuts format too", async ({ page }) => {
    const blurb = rich(page, "Description of Fernhill Gardens");
    const printedBlurb = printed(page).blurbs.first();
    await selectIn(blurb, "Garden");
    await page.keyboard.press("ControlOrMeta+b");
    await expect(printedBlurb.locator("strong")).toHaveText("Garden");
    await page.keyboard.press("ControlOrMeta+i");
    await expect(printedBlurb.locator("strong > em")).toHaveText("Garden");
  });

  test("links are added, refused when unsafe, and removed", async ({ page }) => {
    const blurb = rich(page, "Description of Fernhill Gardens");
    const bar = fieldOf(blurb);
    const printedBlurb = printed(page).blurbs.first();
    await selectIn(blurb, "Garden");
    await page.keyboard.press("ControlOrMeta+k");
    const address = bar.getByRole("textbox", { name: "Link address" });
    await address.fill("javascript:alert(1)");
    await expect(address).toHaveAttribute("aria-invalid", "true");
    await expect(bar.getByRole("button", { name: "Apply" })).toBeDisabled();
    await address.fill("fernhill.example");
    await address.press("Enter");
    const link = printedBlurb.getByRole("link");
    await expect(link).toHaveText("Garden");
    await expect(link).toHaveAttribute("href", "https://fernhill.example");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");

    await selectIn(blurb, "Gard", "end");
    await bar.getByRole("button", { name: /^Link/ }).click();
    await expect(address).toHaveValue("https://fernhill.example");
    await address.fill("");
    await bar.getByRole("button", { name: "Remove link" }).click();
    await expect(printedBlurb.getByRole("link")).toHaveCount(0);
    await expect(printedBlurb).toHaveText(
      "Garden centre chain with a plant-care app for its loyalty members.",
    );
  });

  test("Enter starts a bullet where the caret is", async ({ page }) => {
    const bullets = rich(page, "Bullets for Lead Mobile Engineer");
    await selectIn(bullets, "in store.", "end");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Planted a test garden for the beta.");
    await expect(printed(page).bullets).toHaveText(
      bulletsWith((l) => l.splice(3, 0, "Planted a test garden for the beta.")),
    );
  });

  test("bullets move with the bar and with Alt+arrows, and go with Remove", async ({ page }) => {
    const bullets = rich(page, "Bullets for Lead Mobile Engineer");
    const bar = fieldOf(bullets);
    const paper = printed(page);
    await selectIn(bullets, "Rebuilt", "end");
    await expect(bar.getByRole("button", { name: /^Move bullet up/ })).toBeDisabled();
    await bar.getByRole("button", { name: /^Move bullet down/ }).click();
    const swapped = bulletsWith((l) => l.splice(0, 2, l[1] ?? "", l[0] ?? ""));
    await expect(paper.bullets).toHaveText(swapped);
    await page.keyboard.press("Alt+ArrowUp");
    await expect(paper.bullets).toHaveText(SAMPLE_BULLETS);
    await page.keyboard.press("Alt+ArrowDown");
    await expect(paper.bullets).toHaveText(swapped);
    await bar.getByRole("button", { name: "Remove bullet" }).click();
    await expect(paper.bullets).toHaveText(bulletsWith((l) => l.splice(0, 1)));
  });

  test("+ Add bullet starts a new last bullet, even from outside the field", async ({ page }) => {
    const bullets = rich(page, "Bullets for Lead Mobile Engineer");
    await fieldOf(bullets).getByRole("button", { name: "+ Add bullet" }).click();
    await expect(bullets).toBeFocused();
    await page.keyboard.type("One more");
    await expect(printed(page).bullets).toHaveText(bulletsWith((l) => l.splice(3, 0, "One more")));
  });

  test("a description stays one line when Enter is pressed", async ({ page }) => {
    const blurb = rich(page, "Description of Fernhill Gardens");
    await selectIn(blurb, "members.", "end");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" Open all year.");
    await expect(printed(page).blurbs.first()).toHaveText(
      "Garden centre chain with a plant-care app for its loyalty members. Open all year.",
    );
  });
});

test.describe("entries and roles", () => {
  test("a new employer opens ready to fill in, with a role", async ({ page }) => {
    const experience = section(page, "Experience");
    const paper = printed(page);
    await experience.getByRole("button", { name: "+ Employer" }).click();
    await expect(experience.locator(".entry-summary").last()).toHaveText("New entry");
    await visible(experience.getByPlaceholder("Employer")).fill("Moss & Stone");
    await visible(experience.getByPlaceholder("City, Country")).fill("Perth, UK");
    await visible(experience.getByPlaceholder("2020–2024")).fill("2017–2018");
    await visible(experience.getByPlaceholder("Job title")).fill("Engineer");
    await visible(experience.getByPlaceholder("2022–Present")).fill("2017–2018");
    await rich(page, "Bullets for Engineer").fill(
      "Kept the shop's stock list in step with the till.",
    );

    await expect(paper.entries.nth(2)).toHaveText("Moss & Stone, Perth, UK2017–2018");
    await expect(paper.roles.last()).toHaveText("Engineer2017–2018");
    await expect(paper.bullets).toHaveText(
      bulletsWith((l) => l.splice(7, 0, "Kept the shop’s stock list in step with the till.")),
    );
    await expect(experience.locator(".entry-summary").last()).toHaveText(
      "Moss & Stone Perth, UK · 2017–2018",
    );
  });

  test("roles stack and go, and an entry can be deleted", async ({ page }) => {
    const paper = printed(page);
    await page.getByRole("button", { name: "Expand Paper Lantern Games" }).click();
    const experience = section(page, "Experience");
    await visible(experience.getByRole("button", { name: "+ Role" })).click();
    await visible(experience.getByPlaceholder("Job title")).last().fill("Lead Developer");
    await expect(paper.roles).toHaveText([
      "Lead Mobile EngineerMar 2024–Present",
      "Mobile EngineerJun 2021–Feb 2024",
      "DeveloperSep 2018–May 2021",
      "Lead Developer",
    ]);
    await experience.getByRole("button", { name: "Remove role Lead Developer" }).click();
    await expect(paper.roles).toHaveCount(3);

    await page.getByRole("button", { name: "More for Paper Lantern Games" }).click();
    await page.getByRole("menuitem", { name: "Delete Paper Lantern Games" }).click();
    await expect(paper.entries).toHaveText([
      "Fernhill Gardens, Glasgow, UKJun 2021–Present",
      "Night Skygithub.com/example/night-sky",
    ]);
    await expect(paper.bullets).toHaveText(bulletsWith((l) => l.splice(5, 2)));
  });

  test("a project can take roles from its menu", async ({ page }) => {
    await page.getByRole("button", { name: "Expand Night Sky" }).click();
    await page.getByRole("button", { name: "More for Night Sky" }).click();
    await page.getByRole("menuitem", { name: "Add roles (for promotions)" }).click();
    await visible(section(page, "Projects").getByPlaceholder("Job title")).fill("Maintainer");
    await expect(printed(page).roles.last()).toHaveText("Maintainer");
  });
});
