import { useLayoutEffect, useMemo, useRef, useState, type ReactElement } from "react";
import type { CV, Layout } from "../model";
import { assignPages, groupIndices, measure, type Pages } from "../paginate";
import { styleVars } from "../style/vars";
import { buildBlocks, type Block } from "./blocks";

export interface PaperProps {
  readonly cv: CV;
  readonly layout: Layout;
  /** Bumped when web fonts finish loading, since that changes every measurement. */
  readonly fontsVersion: number;
  readonly zoom: number;
  readonly onPages: (result: Pages) => void;
  readonly onSelect: (ref: string) => void;
}

function pageClass(layout: Layout): string {
  return ["page", `paper-${layout.paper}`, layout.compact ? "compact" : ""].join(" ").trim();
}

/**
 * The CV on paper. Blocks are laid out once in a hidden full-size column to measure
 * them, then poured into fixed-size pages. What's on screen is exactly what prints.
 */
export function Paper({
  cv,
  layout,
  fontsVersion,
  zoom,
  onPages,
  onSelect,
}: PaperProps): ReactElement {
  const blocks = useMemo(() => buildBlocks(cv), [cv]);
  const look = useMemo(() => styleVars(cv.style), [cv.style]);
  const groups = useMemo(() => groupIndices(blocks.map((b) => b.keep)), [blocks]);
  const column = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<Pages>({ pages: [groups.map((_, i) => i)], overflowing: 0 });

  useLayoutEffect(() => {
    const el = column.current;
    if (!el) return;
    // Rects and capacity both in drawn (post-transform) pixels: the page body is laid out at 4x.
    const result = assignPages(measure(el, groups), el.getBoundingClientRect().height);
    setPages(result);
    onPages(result);
  }, [groups, layout, fontsVersion, onPages]);

  // Until the layout effect re-measures, pages may name groups that no longer exist.
  const valid = pages.pages.flat().every((g) => g < groups.length);
  const shown = valid ? pages.pages : [groups.map((_, i) => i)];
  const grouped = groups.map((g) => g.flatMap((i) => blocks.slice(i, i + 1)));

  return (
    <>
      <div className="measure" aria-hidden="true">
        <section className={pageClass(layout)} style={look}>
          <div className="page-body" ref={column}>
            {blocks.map((b, i) => (
              <b.render key={b.key} data-ref={b.key} data-block={i} />
            ))}
          </div>
        </section>
      </div>
      <div
        className="pages"
        style={{ zoom }}
        onClick={(e) => {
          const target = e.target;
          if (!(target instanceof Element) || target.closest("a")) return;
          const ref = target.closest<HTMLElement>("[data-ref]")?.dataset["ref"];
          if (ref !== undefined) onSelect(ref);
        }}
      >
        {shown.map((page, p) => (
          <section
            className={pageClass(layout)}
            style={look}
            key={p}
            aria-label={`Page ${String(p + 1)}`}
          >
            <div className="page-body">
              {page
                .flatMap((g) => grouped.slice(g, g + 1).flat())
                .map((b) => (
                  <BlockView key={b.key} block={b} />
                ))}
            </div>
            {p > 0 && (
              <footer className="page-footer">
                <span>{cv.name}</span>
                <span>
                  Page {p + 1} of {shown.length}
                </span>
              </footer>
            )}
          </section>
        ))}
      </div>
    </>
  );
}

function BlockView({ block }: { readonly block: Block }): ReactElement {
  return <block.render data-ref={block.key} />;
}
