import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { BrowserContext, Page, TestInfo } from "@playwright/test";
import { watchForChanges } from "./inPage";
import {
  ATTACHMENT_NAME,
  impacts,
  type A11yAttachment,
  type Impact,
  type Issue,
  type PageState,
  type WatcherConfig,
} from "./types";

export interface A11yOptions extends Omit<WatcherConfig, "disabledRules" | "exclude"> {
  /** Impacts that fail the test. Empty, violations are reported but nothing fails. */
  failOn: Impact[];
}

/*
  There is deliberately no list of tolerated "known issues": every violation
  at a failing impact fails the test, and is fixed rather than recorded.
*/
export const defaultA11yOptions: A11yOptions = {
  autoAnalyze: true,
  debounceMs: 250,
  maxWaitMs: 2_000,
  // WCAG 2.2 A and AA: what the app commits to. axe's best-practice rules are advice rather
  // than conformance and stay out of the gate.
  tags: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
  failOn: [...impacts],
};

const axeSource = createRequire(import.meta.url).resolve("axe-core/axe.min.js");

/** The issues that fail a test: any at a failing impact. */
export function failingIssues(
  issues: readonly Issue[],
  { failOn }: Pick<A11yOptions, "failOn">,
): Issue[] {
  return issues.filter((issue) => issue.impact !== null && failOn.includes(issue.impact));
}

/**
 * Folds one scan into `found`: a violation on an element already known counts as another
 * sighting of the same issue, not a new one.
 */
export function recordState(found: Map<string, Issue>, state: PageState): void {
  const sightings = state.violations.flatMap((violation) =>
    violation.nodes.map((node) => ({ violation, node })),
  );
  for (const { violation, node } of sightings) {
    const key = `${violation.id}\u0000${node.target}`;
    const known = found.get(key);
    if (known) {
      known.seen += 1;
      if (!known.urls.includes(state.url)) known.urls.push(state.url);
      continue;
    }
    found.set(key, {
      rule: violation.id,
      impact: violation.impact,
      help: violation.help,
      helpUrl: violation.helpUrl,
      target: node.target,
      html: node.html,
      failureSummary: node.failureSummary,
      colors: node.colors,
      urls: [state.url],
      seen: 1,
    });
  }
}

/**
 * The test's side of the accessibility watcher: the axe Watcher controller, for Playwright.
 *
 * Every page in the context scans itself after each change (see `watchForChanges`); this
 * collects the results, folds the same violation on the same element into one issue however
 * many states it appeared in, and at the end of the test reports them and fails the test on any
 * at a failing impact. Tests only reach for it to steer: `stop()` around a state that is
 * deliberately mid-transition, `exclude()` for markup the app doesn't own, `analyze()` to
 * force a scan when automatic analysis is off.
 */
export class A11yWatcher {
  private readonly found = new Map<string, Issue>();
  private states = 0;
  private config: WatcherConfig;
  readonly failOn: Impact[];

  private constructor(
    private readonly context: BrowserContext,
    options: A11yOptions,
  ) {
    const { failOn, ...config } = options;
    this.failOn = failOn;
    this.config = { ...config, disabledRules: [], exclude: [] };
  }

  static async attach(context: BrowserContext, options: A11yOptions): Promise<A11yWatcher> {
    const watcher = new A11yWatcher(context, options);
    await context.exposeBinding("__cvA11yConfig", () => watcher.config);
    await context.exposeBinding("__cvA11yReport", (_source, state: PageState) => {
      watcher.record(state);
    });
    await context.addInitScript({ path: axeSource });
    await context.addInitScript(watchForChanges);
    // Init scripts only run on navigation, and a new page's first document (about:blank) is
    // already there, which is all `page.setContent` ever writes into. Install into it directly
    // so those pages are watched too.
    const axe = readFileSync(axeSource, "utf8");
    await Promise.all(
      context.pages().map(async (page) => {
        await page.evaluate(axe);
        await page.evaluate(watchForChanges);
      }),
    );
    return watcher;
  }

  /** Resumes scanning on every change. */
  async start(): Promise<void> {
    await this.configure({ autoAnalyze: true });
  }

  /** Stops scanning on change; `analyze()` still scans on request. */
  async stop(): Promise<void> {
    await this.configure({ autoAnalyze: false });
  }

  /** Scans every open page as it stands now. */
  async analyze(): Promise<void> {
    await this.eachPage((page) => page.evaluate(() => window.__cvA11y?.analyze()));
  }

  /** Waits until every change so far has been scanned. */
  async flush(): Promise<void> {
    await this.eachPage((page) => page.evaluate(() => window.__cvA11y?.flush()));
  }

  /** Leaves regions matching `selectors` out of every scan from here on. */
  async exclude(...selectors: string[]): Promise<void> {
    await this.configure({ exclude: [...this.config.exclude, ...selectors] });
  }

  /** Turns off axe rules `ids` from here on. Say why where you call it. */
  async disableRules(...ids: string[]): Promise<void> {
    await this.configure({ disabledRules: [...this.config.disabledRules, ...ids] });
  }

  /** Everything found so far, one entry per rule and element. */
  issues(): Issue[] {
    return [...this.found.values()];
  }

  /** How many page states have been scanned so far. */
  get scannedStates(): number {
    return this.states;
  }

  /** Attaches what was found to the test, and fails it on any issue at a failing impact. */
  async report(testInfo: TestInfo): Promise<void> {
    const issues = this.issues();
    const attachment: A11yAttachment = { states: this.states, issues };
    await testInfo.attach(ATTACHMENT_NAME, {
      body: JSON.stringify(attachment, null, 2),
      contentType: "application/json",
    });

    const failing = failingIssues(issues, this);
    if (failing.length > 0) throw new Error(describeIssues(failing, this.states));
  }

  private record(state: PageState): void {
    this.states += 1;
    recordState(this.found, state);
  }

  private async configure(change: Partial<WatcherConfig>): Promise<void> {
    this.config = { ...this.config, ...change };
    const config = this.config;
    await this.eachPage((page) =>
      page.evaluate((next) => {
        window.__cvA11y?.configure(next);
      }, config),
    );
  }

  private async eachPage(action: (page: Page) => Promise<unknown>): Promise<void> {
    await Promise.all(
      this.context
        .pages()
        .filter((page) => !page.isClosed())
        // A page mid-navigation has no watcher to reach; its next document reads the current
        // config and scans itself.
        .map((page) => action(page).catch(() => undefined)),
    );
  }
}

function severity(impact: Impact | null): number {
  return impact ? impacts.indexOf(impact) : -1;
}

function plural(n: number, word: string): string {
  return `${String(n)} ${word}${n === 1 ? "" : "s"}`;
}

export function describeIssues(issues: readonly Issue[], states: number): string {
  const sorted = [...issues].sort(
    (a, b) => severity(b.impact) - severity(a.impact) || a.rule.localeCompare(b.rule),
  );
  const lines = [
    `Accessibility: ${plural(issues.length, "issue")} across ${plural(states, "page state")}`,
    "",
  ];
  for (const issue of sorted) {
    lines.push(
      `  [${issue.impact ?? "unknown"}] ${issue.rule}: ${issue.help}`,
      `    at ${issue.target}`,
      `    ${issue.html}`,
      ...(issue.failureSummary ?? "")
        .split("\n")
        .filter(Boolean)
        .map((line) => `    ${line.trim()}`),
      `    on ${issue.urls.join(", ")}`,
      `    ${issue.helpUrl}`,
      "",
    );
  }
  return lines.join("\n");
}
