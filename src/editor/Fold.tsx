import { useContext, type ReactElement, type ReactNode } from "react";
import { FoldContext } from "./folds";

export interface FoldProps {
  readonly id: string;
  readonly label: string;
  readonly defaultOpen: boolean;
  readonly className: string;
  /** Always visible next to the toggle. */
  readonly head: ReactNode;
  readonly children: ReactNode;
}

/**
 * A collapsible block. The body stays mounted while hidden, so a jump from the paper
 * or a note can still find the field inside and open the fold on the way (ui/focus.ts).
 */
export function Fold({
  id,
  label,
  defaultOpen,
  className,
  head,
  children,
}: FoldProps): ReactElement {
  const folds = useContext(FoldContext);
  const open = folds.isOpen(id, defaultOpen);
  return (
    <div className={`fold ${className}`} data-fold={open ? "open" : "closed"}>
      <div
        className="fold-head"
        onClick={(e) => {
          // The head's plain text toggles too; its buttons and fields do their own thing.
          if (!(
            e.target instanceof Element && e.target.closest("button, input, a, [role='menu']")
          )) {
            folds.setOpen(id, !open);
          }
        }}
      >
        <button
          type="button"
          className="fold-toggle"
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
          data-fold-toggle
          onClick={() => {
            folds.setOpen(id, !open);
          }}
        >
          <span aria-hidden="true">{open ? "▾" : "▸"}</span>
        </button>
        {head}
      </div>
      <div className="fold-body" hidden={!open}>
        {children}
      </div>
    </div>
  );
}
