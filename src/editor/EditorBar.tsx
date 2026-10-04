import type { ReactElement } from "react";
import { modKey } from "./format";

export interface EditorBarProps {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  /** Present in the visual view only. */
  readonly onFoldAll?: (open: boolean) => void;
}

/** Undo and redo, and opening or closing every section and entry at once. */
export function EditorBar(props: EditorBarProps): ReactElement {
  const { canUndo, canRedo, onUndo, onRedo, onFoldAll } = props;
  const mod = modKey();
  return (
    <div className="editor-bar" role="toolbar" aria-label="Editor">
      {onFoldAll && (
        <>
          <button
            type="button"
            onClick={() => {
              onFoldAll(true);
            }}
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => {
              onFoldAll(false);
            }}
          >
            Collapse all
          </button>
        </>
      )}
      <span className="toolbar-gap" />
      <button type="button" title={`Undo (${mod}Z)`} disabled={!canUndo} onClick={onUndo}>
        Undo
      </button>
      <button type="button" title={`Redo (⇧${mod}Z)`} disabled={!canRedo} onClick={onRedo}>
        Redo
      </button>
    </div>
  );
}
