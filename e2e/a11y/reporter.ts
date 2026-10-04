import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import { ATTACHMENT_NAME, isAttachment, type Issue } from "./types";
import { describeIssues } from "./watcher";

interface ReporterOptions {
  outputDir?: string;
  /** Projects whose findings aren't the app's, such as the watcher's own tests. */
  ignoreProjects?: string[];
}

/**
 * The whole run's accessibility issues in one place: what axe Developer Hub is to axe Watcher.
 *
 * Each test reports its own issues, so the same unlabelled button shows up in every test that
 * passes it. This folds them together across the run, one entry per rule and element, and
 * writes `a11y-report/report.{json,txt}` for a reviewer or a CI artifact.
 */
export default class A11yReporter implements Reporter {
  private readonly issues = new Map<string, Issue & { tests: string[] }>();
  private states = 0;
  private readonly outputDir: string;
  private readonly ignoreProjects: string[];

  constructor({ outputDir = "a11y-report", ignoreProjects = [] }: ReporterOptions = {}) {
    this.outputDir = resolve(outputDir);
    this.ignoreProjects = ignoreProjects;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (this.ignoreProjects.includes(test.parent.project()?.name ?? "")) return;
    const body = result.attachments.find((a) => a.name === ATTACHMENT_NAME)?.body;
    if (!body) return;
    const data: unknown = JSON.parse(body.toString());
    if (!isAttachment(data)) return;

    const title = test.titlePath().filter(Boolean).join(" › ");
    this.states += data.states;
    for (const issue of data.issues) {
      const key = `${issue.rule}\u0000${issue.target}`;
      const known = this.issues.get(key);
      if (!known) {
        this.issues.set(key, { ...issue, tests: [title] });
        continue;
      }
      known.seen += issue.seen;
      known.urls = [...new Set([...known.urls, ...issue.urls])];
      if (!known.tests.includes(title)) known.tests.push(title);
    }
  }

  onEnd(): void {
    if (this.states === 0) return;
    const issues = [...this.issues.values()];
    mkdirSync(this.outputDir, { recursive: true });
    writeFileSync(
      join(this.outputDir, "report.json"),
      JSON.stringify({ states: this.states, issues }, null, 2),
    );
    writeFileSync(join(this.outputDir, "report.txt"), describeIssues(issues, this.states));
    const where = issues.length > 0 ? `; see ${join(this.outputDir, "report.txt")}` : "";
    process.stdout.write(
      `\nAccessibility: ${String(issues.length)} unique issue${issues.length === 1 ? "" : "s"} across ${String(this.states)} scanned page states${where}\n`,
    );
  }

  printsToStdio(): boolean {
    return false;
  }
}
