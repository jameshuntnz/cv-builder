/** Open every collapsed fold around an element, outermost first. Returns whether any opened. */
function unfold(el: HTMLElement): boolean {
  const closed: HTMLElement[] = [];
  let fold = el.closest<HTMLElement>('[data-fold="closed"]');
  while (fold) {
    closed.unshift(fold);
    fold = fold.parentElement?.closest<HTMLElement>('[data-fold="closed"]') ?? null;
  }
  for (const f of closed) {
    f.querySelector<HTMLElement>(":scope > .fold-head > [data-fold-toggle]")?.click();
  }
  return closed.length > 0;
}

function focusIn(host: HTMLElement): void {
  host.scrollIntoView({ block: "center", behavior: "smooth" });
  const target = host.matches("input, textarea, [contenteditable='true']")
    ? host
    : host.querySelector<HTMLElement>("input, textarea, [contenteditable='true']");
  target?.focus({ preventScroll: true });
  host.classList.add("flash");
  setTimeout(() => {
    host.classList.remove("flash");
  }, 900);
}

/**
 * Bring the editor field for a node into view and focus it, opening any folds it sits
 * in. `ref` is a node id from the paper or the notes; bullets live inside their list's
 * editor, found by `data-items`.
 */
export function focusRef(root: Document, ref: string): boolean {
  const id = ref === "header" ? "name" : ref;
  const host =
    root.querySelector<HTMLElement>(`[data-edit-ref="${id}"]`) ??
    root.querySelector<HTMLElement>(`[data-items~="${id}"]`);
  if (!host) return false;
  // Opening a fold re-renders; focus once the field is showing.
  if (unfold(host)) {
    setTimeout(() => {
      focusIn(host);
    }, 0);
  } else focusIn(host);
  return true;
}
