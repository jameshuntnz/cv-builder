import { test as base } from "@playwright/test";
import { A11yWatcher, defaultA11yOptions, type A11yOptions } from "./a11y/watcher";

export { expect } from "@playwright/test";
export type { Locator, Page } from "@playwright/test";
export type { A11yOptions, A11yWatcher };

interface Fixtures {
  /** Keeps the test on its own server, and records any request that tries to leave it. */
  sameOrigin: string[];
  /** Fails a test whose page threw or logged an error, even if every assertion held. */
  pageErrors: undefined;
  /** Tunes the watcher for a project (`use: { a11yOptions }`) or a file (`test.use`). */
  a11yOptions: A11yOptions;
  /**
   * Scans every page state the test passes through with axe, and fails the test on what it
   * finds. It runs whether or not the test asks for it; ask for it only to steer it.
   */
  a11y: A11yWatcher;
}

/**
 * Playwright's `test`, with accessibility checked on every page state.
 *
 * Specs import `test` and `expect` from here rather than `@playwright/test` (lint enforces it),
 * which is what makes the checking automatic: a new spec is covered without remembering to be.
 */
export const test = base.extend<Fixtures>({
  /*
    The app promises that nothing leaves the browser. Any request to another
    origin is refused and fails the test, so a stray font, analytics script or
    CDN import can't creep in unnoticed.
  */
  sameOrigin: [
    async ({ context, baseURL }, use) => {
      const allowed = baseURL ? new URL(baseURL).origin : "";
      const escaped: string[] = [];
      await context.route(
        (url) => url.protocol.startsWith("http") && url.origin !== allowed,
        async (route) => {
          escaped.push(route.request().url());
          await route.abort("blockedbyclient");
        },
      );
      await use(escaped);
      if (escaped.length > 0) {
        throw new Error(`Requests left the app's origin:\n${escaped.join("\n")}`);
      }
    },
    { auto: true },
  ],
  pageErrors: [
    async ({ page }, use, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await use(undefined);
      if (testInfo.status !== "passed" || errors.length === 0) return;
      throw new Error(
        `The page reported ${String(errors.length)} error(s):\n\n${errors.join("\n\n")}`,
      );
    },
    { auto: true },
  ],
  a11yOptions: [defaultA11yOptions, { option: true }],
  a11y: [
    // Depends on `page` so it's torn down first, while the page is still there to flush.
    async ({ context, page, a11yOptions }, use, testInfo) => {
      await page.title();
      const watcher = await A11yWatcher.attach(context, a11yOptions);
      await use(watcher);
      // A test that already failed has its own story to tell; scanning the wreckage would
      // only bury it.
      if (testInfo.status !== "passed") return;
      await watcher.flush();
      await watcher.report(testInfo);
    },
    { auto: true },
  ],
});
