/** Where a group of blocks sits in one continuous column, in px from the top. */
export interface Span {
  readonly top: number;
  readonly bottom: number;
}

export interface Pages {
  /** Group indices on each page. */
  readonly pages: number[][];
  /** Groups taller than a page on their own; they are placed anyway and get cut off. */
  readonly overflowing: number;
}

const EPSILON = 0.5;

/**
 * Pour groups into pages of `capacity` px. A page's height is measured from the top
 * of its first group, because that group's top margin is dropped at the top of a page.
 */
export function assignPages(spans: readonly Span[], capacity: number): Pages {
  const pages: number[][] = [[]];
  let start = spans[0]?.top ?? 0;
  let overflowing = 0;
  spans.forEach((span, i) => {
    if (span.bottom - span.top > capacity + EPSILON) overflowing += 1;
    const page = pages.at(-1);
    if (!page || page.length === 0) {
      page?.push(i);
      start = span.top;
    } else if (span.bottom - start <= capacity + EPSILON) {
      page.push(i);
    } else {
      pages.push([i]);
      start = span.top;
    }
  });
  return { pages, overflowing };
}

/** Indices of blocks grouped so a `keep` block stays on the same page as the one after it. */
export function groupIndices(keeps: readonly boolean[]): number[][] {
  const groups: number[][] = [];
  let current: number[] = [];
  keeps.forEach((keep, i) => {
    current.push(i);
    if (!keep) {
      groups.push(current);
      current = [];
    }
  });
  if (current.length > 0) groups.push(current);
  return groups;
}

/** Read each group's position in the off-screen column, relative to the column's top. */
export function measure(column: HTMLElement, groups: readonly number[][]): Span[] {
  const origin = column.getBoundingClientRect().top;
  const rects = new Map<number, DOMRect>();
  column.querySelectorAll<HTMLElement>("[data-block]").forEach((el) => {
    rects.set(Number(el.dataset["block"]), el.getBoundingClientRect());
  });
  return groups.map((g) => ({
    top: (rects.get(g[0] ?? 0)?.top ?? origin) - origin,
    bottom: (rects.get(g.at(-1) ?? 0)?.bottom ?? origin) - origin,
  }));
}
