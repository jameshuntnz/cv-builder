import type { Locator, Page } from "@playwright/test";

/** Every bullet on the example CV's paper, top to bottom. Tests assert edits against this. */
export const SAMPLE_BULLETS = [
  "Rebuilt the plant identification screen so it works offline in greenhouses with no signal.",
  "Cut the app’s download size in half by loading plant photos only when they’re opened.",
  "Ran fortnightly usability sessions with customers in store.",
  "Added watering reminders, now the app’s most used feature.",
  "Made every screen work with VoiceOver and large text sizes.",
  "Wrote the level editor the designers used for three released games.",
  "Fixed dropped frames on older phones by redrawing only the parts of the board that changed.",
  "Drew the chart from a public star catalogue and kept it smooth while the phone moves.",
  "BSc Interaction Design, Example University, 2018",
];

/** The example's printed section headings, in order. */
export const SAMPLE_SECTIONS = ["Experience", "Projects", "Skills", "Education"];

/** The first page of paper. */
export function paper(page: Page): Locator {
  return page.getByRole("region", { name: "Page 1", exact: true });
}

export function section(page: Page, name: string): Locator {
  return page.getByRole("region", { name, exact: true });
}

/** A rich-text field's editable area, by its accessible name. */
export function rich(page: Page, name: string): Locator {
  return page.getByRole("textbox", { name, exact: true });
}

/** The field wrapper around a rich-text editor: its bar and "+ Add bullet" live in here. */
export function fieldOf(editor: Locator): Locator {
  return editor.locator("xpath=ancestor::div[contains(@class, 'rich-field')][1]");
}

/** Only the matches a person could see: collapsed entries keep their fields in the page. */
export function visible(locator: Locator): Locator {
  return locator.locator("visible=true");
}

/** Opens the app with `md` as the only saved CV. */
export async function openWith(page: Page, md: string): Promise<void> {
  await page.goto("/");
  await page.evaluate((text) => {
    localStorage.setItem(
      "cv-builder:docs",
      JSON.stringify([
        { id: "fixture", md: text, paper: "a4", compact: false, updated: Date.now() },
      ]),
    );
    localStorage.setItem("cv-builder:active", "fixture");
  }, md);
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".pages .page").first().waitFor({ state: "attached" });
}

/** Opens the app on a fresh browser profile, with the example CV. */
export async function open(page: Page): Promise<void> {
  await page.goto("/");
  // The paper is a hidden tab on a phone, so wait for it to exist rather than to show.
  await page
    .locator(".pages .page")
    .first()
    .getByText("Rowan Ellis")
    .waitFor({ state: "attached" });
  await page.getByRole("region", { name: "Header" }).waitFor();
}

/** Whether this run is the phone layout, where the panes are tabs. */
export function isMobile(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1440) < 760;
}

/**
 * Select `text` inside a rich-text field, or put the caret just after it (`at: "end"`).
 * Clicks and End land wherever the line wraps; a DOM range lands exactly, and the editor
 * picks it up from the selection change.
 */
export async function selectIn(
  editor: Locator,
  text: string,
  at: "select" | "end" = "select",
): Promise<void> {
  await editor.evaluate(
    (el, { wanted, where }) =>
      new Promise<void>((resolve, reject) => {
        const select = (): void => {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const i = node.textContent?.indexOf(wanted) ?? -1;
            if (i < 0) continue;
            // The editor reads the selection on this event; its listener was added first, so
            // once ours runs the editor has the new selection.
            document.addEventListener(
              "selectionchange",
              () => {
                setTimeout(resolve, 0);
              },
              { once: true },
            );
            const range = document.createRange();
            range.setStart(node, where === "end" ? i + wanted.length : i);
            range.setEnd(node, i + wanted.length);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            return;
          }
          reject(new Error(`"${wanted}" is not in the field`));
        };
        // On focus, ProseMirror puts its own selection back from a 20ms timer. Timers run in
        // deadline order, so one due later selects after it, never before.
        if (el instanceof HTMLElement) el.focus();
        setTimeout(select, 30);
      }),
    { wanted: text, where: at },
  );
}

export interface Printed {
  readonly name: Locator;
  readonly headline: Locator;
  readonly contact: Locator;
  readonly extras: Locator;
  readonly sections: Locator;
  readonly entries: Locator;
  readonly blurbs: Locator;
  readonly roles: Locator;
  readonly bullets: Locator;
  readonly pairs: Locator;
  readonly paragraphs: Locator;
  readonly pages: Locator;
}

/** The parts of the paper, as elements, for exact assertions rather than text-anywhere ones. */
export function printed(page: Page): Printed {
  const sheet = page.locator(".pages");
  return {
    name: sheet.getByRole("heading", { level: 1 }),
    headline: sheet.locator(".cv-headline"),
    contact: sheet.locator(".cv-contact"),
    extras: sheet.locator(".cv-extra"),
    sections: sheet.getByRole("heading", { level: 2 }),
    /** Each entry's heading row: "Name, Place" and its dates or link. */
    entries: sheet.locator(".cv-entry .cv-row"),
    blurbs: sheet.locator(".cv-blurb"),
    roles: sheet.locator(".cv-role"),
    bullets: sheet.getByRole("listitem"),
    pairs: sheet.locator(".cv-pair"),
    paragraphs: sheet.locator(".cv-para"),
    pages: sheet.locator(".page"),
  };
}

/**
 * Reorder with the keyboard, as a keyboard user does it: focus the handle, Space to lift,
 * arrows to move, Space to drop. dnd-kit measures between key presses, so each waits a frame.
 */
export async function keyboardMove(
  handle: Locator,
  key: "ArrowUp" | "ArrowDown",
  times = 1,
): Promise<void> {
  const page = handle.page();
  const frame = (): Promise<unknown> =>
    page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  await handle.focus();
  await page.keyboard.press("Space");
  await frame();
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key);
    await frame();
    await frame();
  }
  await page.keyboard.press("Space");
}
