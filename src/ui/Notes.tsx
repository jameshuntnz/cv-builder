import type { ReactElement } from "react";
import { notesSummary, type Note } from "../lint";

export interface NotesProps {
  readonly notes: readonly Note[];
  readonly onSelect: (ref: string | undefined) => void;
}

/**
 * Writing notes at the top of the editor. Quiet when there's nothing to flag; a callout, open, when
 * there is. Each note jumps to what it's about.
 */
export function Notes({ notes, onSelect }: NotesProps): ReactElement {
  const count = notes.length;
  return (
    <details id="notes" className={count > 0 ? "notes has-notes" : "notes"} open={count > 0}>
      <summary>
        {count > 0 ? (
          <>
            <span aria-hidden="true">⚑ </span>
            {notesSummary(count)}
          </>
        ) : (
          <>
            Notes <span className="muted">nothing to flag</span>
          </>
        )}
      </summary>
      {count > 0 && (
        <ol>
          {notes.map((n, i) => (
            <li key={`${n.ref ?? "line"}:${String(i)}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(n.ref);
                }}
              >
                {n.message}
              </button>
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}
