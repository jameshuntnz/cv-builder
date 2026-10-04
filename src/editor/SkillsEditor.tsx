import type { ReactElement } from "react";
import type { Pair } from "../model";
import type { Action as Edit } from "../ops";
import { Chips } from "./Chips";
import { Action, Field } from "./fields";
import { DragHandle, SortableItem, SortableList } from "./sortable";

export interface SkillsEditorProps {
  readonly pairs: readonly Pair[];
  readonly dispatch: (action: Edit) => void;
}

/** Labelled lists ("Languages: Go, SQL") as rows of chips, dragged to reorder. */
export function SkillsEditor({ pairs, dispatch }: SkillsEditorProps): ReactElement {
  return (
    <SortableList
      ids={pairs.map((p) => p.id)}
      onMove={(id, overId) => {
        dispatch({ type: "move", id, overId });
      }}
    >
      <div className="skills">
        {pairs.map((p) => (
          <SortableItem key={p.id} id={p.id} className="skill-row">
            {(handle) => (
              <div className="skill" data-edit-ref={p.id}>
                <DragHandle {...handle} label={`Move ${p.key || "category"}`} />
                <Field
                  label="Category"
                  hideLabel
                  value={p.key}
                  placeholder="Category"
                  className="field-key"
                  onChange={(key) => {
                    dispatch({ type: "updatePair", id: p.id, key });
                  }}
                />
                <Chips
                  label={p.key || "Skills"}
                  value={p.value}
                  onChange={(value) => {
                    dispatch({ type: "updatePair", id: p.id, value });
                  }}
                />
                <Action
                  label={`Remove ${p.key || "category"}`}
                  className="remove"
                  onClick={() => {
                    dispatch({ type: "remove", id: p.id });
                  }}
                >
                  ×
                </Action>
              </div>
            )}
          </SortableItem>
        ))}
      </div>
    </SortableList>
  );
}
