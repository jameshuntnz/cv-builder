import { expect, test } from "../test";
import { defaultA11yOptions } from "./watcher";

/**
 * The watcher itself, on pages built in place: that it scans what a test's interactions
 * reveal, folds repeats together, can be steered, and fails a test when it should. Findings
 * are read back rather than left to fail these tests, except in the tests about failing.
 */

const reportOnly = { ...defaultA11yOptions, failOn: [] };

/** A whole, otherwise valid document, so the only findings are the ones a test plants. */
function doc(body: string): string {
  return `<!doctype html><html lang="en"><head><title>Watcher test</title></head><body>${body}</body></html>`;
}

// Images are sized: one that fails to load and has no size renders as nothing, and axe rightly
// skips what nobody can see.
const IMAGE = '<img src="data:," width="40" height="40">';

test.describe("reporting", () => {
  test.use({ a11yOptions: reportOnly });

  test("scans a state that only exists after a click", async ({ page, a11y }) => {
    await page.setContent(
      doc(`<main><h1>Photos</h1>
        <button type="button" onclick="document.querySelector('main').insertAdjacentHTML('beforeend', '${IMAGE.replace(/"/g, "&quot;")}')">Show photo</button>
      </main>`),
    );
    await a11y.flush();
    expect(a11y.issues()).toEqual([]);

    await page.getByRole("button", { name: "Show photo" }).click();
    await a11y.flush();
    expect(a11y.issues().map((issue) => issue.rule)).toEqual(["image-alt"]);
  });

  test("counts a violation once however many states it appears in", async ({ page, a11y }) => {
    await page.setContent(
      doc(`<main><h1>Counter</h1>${IMAGE}<p id="count">0</p>
        <button type="button" onclick="count.textContent = Number(count.textContent) + 1">Add</button>
      </main>`),
    );
    await a11y.flush();
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.locator("#count")).toHaveText("1");
    await a11y.flush();

    const issues = a11y.issues();
    expect(issues).toHaveLength(1);
    expect(issues[0]?.seen).toBe(2);
    expect(a11y.scannedStates).toBe(2);
  });

  test("scans nothing while stopped, until asked, and resumes on start", async ({ page, a11y }) => {
    await page.setContent(doc("<main><h1>Quiet</h1></main>"));
    await a11y.flush();
    await a11y.stop();
    await page.evaluate((html) => {
      document.querySelector("main")?.insertAdjacentHTML("beforeend", html);
    }, IMAGE);
    await a11y.flush();
    expect(a11y.issues()).toEqual([]);

    await a11y.analyze();
    expect(a11y.issues().map((issue) => issue.rule)).toEqual(["image-alt"]);

    await a11y.start();
    await page.evaluate(() => {
      document.querySelector("main")?.insertAdjacentHTML("beforeend", "<p>changed</p>");
    });
    await a11y.flush();
    // The load, the requested scan, and the change after scanning resumed.
    expect(a11y.scannedStates).toBe(3);
  });

  test("leaves excluded regions and disabled rules out", async ({ page, a11y }) => {
    await a11y.exclude(".third-party");
    await a11y.disableRules("button-name");
    await page.setContent(
      doc(`<main><h1>Map</h1><div class="third-party">${IMAGE}</div>
        <button type="button"><svg width="16" height="16"></svg></button></main>`),
    );
    await a11y.flush();
    expect(a11y.issues()).toEqual([]);
  });

  test("lets a fade finish before judging contrast", async ({ page, a11y }) => {
    await page.setContent(
      doc(`<style>@keyframes in { from { opacity: 0.1 } to { opacity: 1 } }
        p { animation: in 300ms forwards; color: #222; background: #fff }</style>
        <main><h1>Fade</h1><p>Readable once it lands</p></main>`),
    );
    await a11y.flush();
    expect(a11y.issues()).toEqual([]);
  });
});

test.describe("gating", () => {
  // Expected to fail: if the watcher ever stops failing a test on a new violation, these
  // "unexpectedly pass" and the run goes red.
  test.fail();

  test("fails a test on a violation", async ({ page }) => {
    await page.setContent(
      doc(
        `<main><h1>Actions</h1><button type="button"><svg width="16" height="16"></svg></button></main>`,
      ),
    );
  });

  test("fails a test on low contrast", async ({ page }) => {
    await page.setContent(
      doc(
        `<main><h1>Notes</h1><p style="color: #999999; background: #aaaaaa">Hard to read</p></main>`,
      ),
    );
  });
});
