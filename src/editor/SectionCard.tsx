import type { ReactElement } from "react";
import type { Section } from "../model";
import type { Action as Edit } from "../ops";
import { EntryCard } from "./EntryCard";
import { Action, Field } from "./fields";
import { Fold } from "./Fold";
import { ADD_LABELS, otherAdds, primaryAdd, sectionKind, type Addable } from "./kinds";
import { Menu, type MenuItem } from "./Menu";
import { Bullets, RichText } from "./RichText";
import { SkillsEditor } from "./SkillsEditor";
import { SortableItem, SortableList } from "./sortable";

export interface SectionCardProps {
  readonly section: Section;
  readonly dispatch: (action: Edit) => void;
  readonly confirm: (message: string) => boolean;
}

function addAction(sectionId: string, what: Addable): Edit {
  switch (what) {
    case "job":
      return { type: "addEntry", sectionId, withRole: true };
    case "entry":
      return { type: "addEntry", sectionId, withRole: false };
    case "category":
      return { type: "addPair", sectionId };
    case "paragraph":
      return { type: "addParagraph", sectionId };
    case "list":
      return { type: "setBullets", ownerId: sectionId, texts: [""] };
  }
}

/** The "+ …" button under a section, worded for what the section holds. */
const PRIMARY_BUTTON: Record<Addable, string> = {
  job: "+ Employer",
  entry: "+ Entry",
  category: "+ Category",
  paragraph: "+ Paragraph",
  list: "+ List",
};

/** One `##` section and everything in it, in the order it prints. */
export function SectionCard({ section: s, dispatch, confirm }: SectionCardProps): ReactElement {
  const title = s.title || "section";
  const kind = sectionKind(s);
  const primary = primaryAdd(kind);
  const add = (what: Addable): void => {
    dispatch(addAction(s.id, what));
  };
  const menu: MenuItem[] = [
    ...otherAdds(s).map((what) => ({
      label: `Add ${ADD_LABELS[what].toLowerCase()}`,
      onSelect: () => {
        add(what);
      },
    })),
    {
      label: `Delete ${title}`,
      danger: true,
      onSelect: () => {
        if (confirm(`Delete the ${title} section and everything in it?`)) {
          dispatch({ type: "remove", id: s.id });
        }
      },
    },
  ];
  return (
    <section
      className={s.hidden ? "card section-card is-hidden" : "card section-card"}
      aria-label={title}
      id={`edit-${s.id}`}
    >
      <Fold
        id={s.id}
        label={title}
        defaultOpen
        className="section-fold"
        head={
          <>
            <Field
              label="Section"
              hideLabel
              value={s.title}
              editRef={s.id}
              placeholder="Section title"
              className="field-section"
              onChange={(t) => {
                dispatch({ type: "renameSection", id: s.id, title: t });
              }}
            />
            <Action
              label={s.hidden ? `Show ${title} on the page` : `Hide ${title} from the page`}
              pressed={s.hidden}
              className="eye"
              onClick={() => {
                dispatch({ type: "toggleSection", id: s.id });
              }}
            >
              {s.hidden ? "Hidden" : "Shown"}
            </Action>
            <Menu label={`More for ${title}`} items={menu} />
          </>
        }
      >
        {s.paragraphs.map((p) => (
          <div className="row" key={p.id}>
            <RichText
              label={`${title} paragraph`}
              editRef={p.id}
              value={p.text}
              multiline
              placeholder="A short paragraph"
              onChange={(text) => {
                dispatch({ type: "setText", id: p.id, text });
              }}
            />
            <Action
              label="Remove paragraph"
              className="remove"
              onClick={() => {
                dispatch({ type: "remove", id: p.id });
              }}
            >
              ×
            </Action>
          </div>
        ))}
        {s.pairs.length > 0 && <SkillsEditor pairs={s.pairs} dispatch={dispatch} />}
        {s.bullets.length > 0 && (
          <Bullets
            label={`${title} list`}
            editRef={`${s.id}:bullets`}
            items={s.bullets}
            placeholder="A list item"
            onChange={(texts) => {
              dispatch({ type: "setBullets", ownerId: s.id, texts });
            }}
          />
        )}
        <SortableList
          ids={s.entries.map((e) => e.id)}
          onMove={(id, overId) => {
            dispatch({ type: "move", id, overId });
          }}
        >
          {s.entries.map((e) => (
            <SortableItem key={e.id} id={e.id} className="sortable-entry">
              {(handle) => (
                <EntryCard entry={e} handle={handle} jobs={kind === "jobs"} dispatch={dispatch} />
              )}
            </SortableItem>
          ))}
        </SortableList>
        <div className="adders">
          {primary !== undefined && (
            <button
              type="button"
              className="add"
              onClick={() => {
                add(primary);
              }}
            >
              {PRIMARY_BUTTON[primary]}
            </button>
          )}
          {kind === "empty" &&
            otherAdds(s).map((what) => (
              <button
                key={what}
                type="button"
                className="add"
                onClick={() => {
                  add(what);
                }}
              >
                {PRIMARY_BUTTON[what]}
              </button>
            ))}
        </div>
      </Fold>
    </section>
  );
}
