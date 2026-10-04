import { useState, type ReactElement } from "react";
import type { CV } from "../model";
import { isPreset, PRESETS, type Action as Edit } from "../ops";
import { HidePanel } from "../ui/Rail";
import { Action } from "./fields";
import { DragHandle, SortableItem, SortableList } from "./sortable";

export interface OutlineProps {
  readonly cv: CV;
  readonly dispatch: (action: Edit) => void;
  readonly onJump: (sectionId: string) => void;
  readonly onHide: () => void;
}

/** The sections in print order: drag to reorder, hide or show, jump to one, add another. */
export function Outline({ cv, dispatch, onJump, onHide }: OutlineProps): ReactElement {
  const [preset, setPreset] = useState<string>("experience");
  return (
    <nav className="outline" aria-label="Sections">
      <div className="pane-head">
        <h2 className="pane-title">Sections</h2>
        <HidePanel label="Hide the sections panel" onHide={onHide} />
      </div>
      <SortableList
        ids={cv.sections.map((s) => s.id)}
        onMove={(id, overId) => {
          dispatch({ type: "move", id, overId });
        }}
      >
        <ol className="outline-list">
          {cv.sections.map((s) => (
            <SortableItem
              key={s.id}
              id={s.id}
              as="li"
              className={s.hidden ? "outline-item is-hidden" : "outline-item"}
            >
              {(handle) => (
                <>
                  <DragHandle {...handle} label={`Move ${s.title || "section"}`} />
                  <button
                    type="button"
                    className="outline-name"
                    onClick={() => {
                      onJump(s.id);
                    }}
                  >
                    {s.title || "Untitled"}
                  </button>
                  <Action
                    label={s.hidden ? `Show ${s.title}` : `Hide ${s.title}`}
                    pressed={s.hidden}
                    className="eye"
                    onClick={() => {
                      dispatch({ type: "toggleSection", id: s.id });
                    }}
                  >
                    {s.hidden ? "Show" : "Hide"}
                  </Action>
                </>
              )}
            </SortableItem>
          ))}
        </ol>
      </SortableList>
      <form
        className="add-section"
        onSubmit={(e) => {
          e.preventDefault();
          if (isPreset(preset)) dispatch({ type: "addSection", preset });
        }}
      >
        <label className="field">
          <span className="field-label">New section</span>
          <select
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value);
            }}
          >
            {Object.entries(PRESETS).map(([key, p]) => (
              <option key={key} value={key}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Add</button>
      </form>
    </nav>
  );
}
