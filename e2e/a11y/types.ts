/** axe's severity scale, least to most severe. */
export type Impact = "minor" | "moderate" | "serious" | "critical";
export const impacts: readonly Impact[] = ["minor", "moderate", "serious", "critical"];

export function isImpact(x: unknown): x is Impact {
  return x === "minor" || x === "moderate" || x === "serious" || x === "critical";
}

/** What the page is told on every scan. Changing any of it applies from the next scan on. */
export interface WatcherConfig {
  /** Scan on every DOM change. Off, only `analyze()` and `flush()` scan. */
  autoAnalyze: boolean;
  /** How long the DOM must stay still before a changed page is scanned. */
  debounceMs: number;
  /** Longest a changing page waits for a scan, so a page that never settles still gets one. */
  maxWaitMs: number;
  /** axe tags selecting the rules to run. */
  tags: string[];
  disabledRules: string[];
  /** CSS selectors for regions left out of every scan. */
  exclude: string[];
}

/**
 * The two colours a colour rule measured, as axe's hex: text and its background for
 * `color-contrast`, a link and the text around it for `link-in-text-block`. Reported so a
 * failure says which colours to change.
 */
export interface ColorPair {
  foreground: string;
  background: string;
}

export interface ViolationNode {
  /** axe's selector for the element; frames and shadow roots are joined with ` >>> `. */
  target: string;
  html: string;
  failureSummary?: string | undefined;
  colors?: ColorPair | undefined;
}

export interface Violation {
  id: string;
  impact: Impact | null;
  help: string;
  helpUrl: string;
  nodes: ViolationNode[];
}

/** One scan: the page as it stood after a change, and what axe found in it. */
export interface PageState {
  url: string;
  title: string;
  violations: Violation[];
}

/** A violation on one element, however many page states it turned up in. */
export interface Issue {
  rule: string;
  impact: Impact | null;
  help: string;
  helpUrl: string;
  target: string;
  html: string;
  failureSummary?: string | undefined;
  colors?: ColorPair | undefined;
  urls: string[];
  /** How many scans found it. */
  seen: number;
}

/** What a test attaches for the run-wide reporter. */
export interface A11yAttachment {
  states: number;
  issues: Issue[];
}

export const ATTACHMENT_NAME = "a11y";

/** The watcher's handle in the page, for the test side to drive. */
export interface InPageWatcher {
  configure: (config: WatcherConfig) => void;
  /** Scans now, whether or not anything changed. */
  analyze: () => Promise<void>;
  /** Settles any change still waiting for a scan, and waits out one in progress. */
  flush: () => Promise<void>;
}

/** The parts of axe's result the watcher reads. */
export interface AxeCheck {
  data?: Record<string, unknown> | null;
}

export interface AxeResultNode {
  target: (string | string[])[];
  html: string;
  failureSummary?: string;
  any: AxeCheck[];
  all: AxeCheck[];
  none: AxeCheck[];
}

export interface AxeResult {
  id: string;
  impact?: Impact | null;
  help: string;
  helpUrl: string;
  nodes: AxeResultNode[];
}

/** What the page gets: axe itself, and the bindings that connect it to the test. */
declare global {
  interface Window {
    axe?: {
      run: (context: unknown, options: unknown) => Promise<{ violations: AxeResult[] }>;
    };
    __cvA11y?: InPageWatcher;
    __cvA11yConfig?: () => Promise<WatcherConfig>;
    __cvA11yReport?: (state: PageState) => Promise<void>;
  }
}

/** Whether parsed JSON is an attachment this watcher wrote, checked rather than assumed. */
export function isAttachment(x: unknown): x is A11yAttachment {
  return (
    typeof x === "object" &&
    x !== null &&
    "states" in x &&
    typeof x.states === "number" &&
    "issues" in x &&
    Array.isArray(x.issues) &&
    x.issues.every(isIssue)
  );
}

const STRING_FIELDS = ["rule", "target", "help", "helpUrl", "html"];

function isIssue(x: unknown): x is Issue {
  if (typeof x !== "object" || x === null) return false;
  const impact: unknown = Reflect.get(x, "impact");
  const seen: unknown = Reflect.get(x, "seen");
  return (
    STRING_FIELDS.every((key) => typeof Reflect.get(x, key) === "string") &&
    (impact === null || isImpact(impact)) &&
    typeof seen === "number" &&
    Array.isArray(Reflect.get(x, "urls"))
  );
}
