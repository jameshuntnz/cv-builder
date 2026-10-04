import { useEffect, useRef, useState, type ReactElement } from "react";

export interface MenuItem {
  readonly label: string;
  readonly onSelect: () => void;
  readonly danger?: boolean;
}

/** A small "⋯" menu of less common actions. Closes on choice, Escape or a click elsewhere. */
export function Menu({
  label,
  items,
  text = "⋯",
}: {
  readonly label: string;
  readonly items: readonly MenuItem[];
  /** What the button shows; its accessible name is always `label`. */
  readonly text?: string;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event): void => {
      if (!(e.target instanceof Node && root.current?.contains(e.target))) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);
  return (
    <div
      className="menu"
      ref={root}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        className={text === "⋯" ? "menu-button" : "menu-button add"}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
        }}
      >
        {text}
      </button>
      {open && (
        <ul className="menu-list" role="menu" aria-label={label}>
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                className={item.danger ? "danger" : undefined}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
