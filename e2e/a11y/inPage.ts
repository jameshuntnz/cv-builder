import type { AxeResultNode, ColorPair, WatcherConfig } from "./types";

/**
 * Scans the page with axe whenever it changes.
 *
 * Installed as an init script, so it runs in every document before the app's own code. Each
 * burst of DOM mutations is one new page state; once the DOM has been still for `debounceMs`,
 * the state is scanned and the result handed to the test through `__cvA11yReport`. This is the
 * behaviour of Deque's axe Watcher: coverage comes from what the tests already do, with no
 * explicit scan calls, and a state that exists only after a click still gets scanned.
 *
 * This function is serialised into the page, so it must not close over anything in this module.
 */
export function watchForChanges(): void {
  // Frames are scanned from the top document; axe reaches into them itself.
  if (window.top !== window) return;
  if (window.__cvA11y) return;

  let config: WatcherConfig | undefined;
  let quietTimer: ReturnType<typeof setTimeout> | undefined;
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<void> | undefined;
  /** The DOM changed after the last scan began. */
  let pending = false;
  let scanned = false;

  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const clearTimers = (): void => {
    clearTimeout(quietTimer);
    clearTimeout(deadlineTimer);
    quietTimer = deadlineTimer = undefined;
  };

  /*
    A fade or slide caught halfway reads as a real failure (half-opaque text
    fails contrast), so finite animations are allowed to finish first. Endless
    ones never would, and are left running.
  */
  const settle = async (): Promise<void> => {
    const finishing = document
      .getAnimations()
      .filter(
        (a) => a.playState === "running" && a.effect?.getComputedTiming().endTime !== Infinity,
      )
      .map((a) => a.finished.catch(() => undefined));
    await Promise.race([Promise.all(finishing), sleep(1_000)]);
    await new Promise((resolve) => requestAnimationFrame(resolve));
  };

  // What a colour rule measured, so a failure names the colours to change: color-contrast says
  // fgColor/bgColor, link-in-text-block nodeColor/parentColor.
  const measuredColors = (node: AxeResultNode): ColorPair | undefined => {
    for (const check of [...node.any, ...node.all, ...node.none]) {
      const data = check.data ?? {};
      const foreground = data["fgColor"] ?? data["nodeColor"];
      const background = data["bgColor"] ?? data["parentColor"];
      if (typeof foreground === "string" && typeof background === "string") {
        return { foreground, background };
      }
    }
    return undefined;
  };

  const scan = async (active: WatcherConfig): Promise<void> => {
    pending = false;
    const { axe, __cvA11yReport: report } = window;
    // Nothing rendered, nothing to check: a new page's about:blank, or a document between
    // navigations. Scanning it would only report that an empty page has no title.
    if (!axe || !report || document.body.childElementCount === 0) return;
    await settle();
    const results = await axe.run(
      active.exclude.length > 0
        ? { exclude: active.exclude.map((selector) => [selector]) }
        : document,
      {
        runOnly: { type: "tag", values: active.tags },
        rules: Object.fromEntries(active.disabledRules.map((id) => [id, { enabled: false }])),
        resultTypes: ["violations"],
      },
    );
    scanned = true;
    await report({
      url: location.href,
      title: document.title,
      violations: results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact ?? null,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.map((node) => ({
          target: node.target
            .map((part) => (Array.isArray(part) ? part.join(" ") : part))
            .join(" >>> "),
          html: node.html.slice(0, 300),
          failureSummary: node.failureSummary,
          colors: measuredColors(node),
        })),
      })),
    });
  };

  const readConfig = async (): Promise<WatcherConfig | undefined> => {
    if (config) return config;
    config = await window.__cvA11yConfig?.();
    return config;
  };

  // One scan at a time: axe refuses to start while it is already running. Changes made during
  // a scan are picked up by another pass once it ends.
  const analyze = (): Promise<void> => {
    clearTimers();
    if (running) {
      pending = true;
      return running;
    }
    running = (async () => {
      const active = await readConfig();
      if (!active) return;
      await scan(active);
      while (pending && config?.autoAnalyze) {
        await sleep(config.debounceMs);
        await scan(config);
      }
    })()
      .catch((error: unknown) => {
        // A navigation mid-scan tears the document down under axe; the next document scans
        // itself.
        console.warn("[a11y watcher] scan failed", error);
      })
      .finally(() => {
        running = undefined;
      });
    return running;
  };

  const onChange = (): void => {
    if (!config?.autoAnalyze) return;
    pending = true;
    if (running) return;
    clearTimeout(quietTimer);
    quietTimer = setTimeout(() => void analyze(), config.debounceMs);
    deadlineTimer ??= setTimeout(() => void analyze(), config.maxWaitMs);
  };

  window.__cvA11y = {
    configure: (next) => {
      config = next;
      if (!next.autoAnalyze) clearTimers();
    },
    analyze,
    flush: async () => {
      if (pending || !scanned) await analyze();
      while (running) await running;
    },
  };

  const start = async (): Promise<void> => {
    await readConfig();
    // The document itself, not its <html>: document.open() (what page.setContent uses) swaps
    // the <html> element out from under an observer attached to it, but keeps the document.
    new MutationObserver(onChange).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    // The loaded page is a state of its own, changed or not.
    onChange();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void start(), { once: true });
  } else {
    void start();
  }
}
