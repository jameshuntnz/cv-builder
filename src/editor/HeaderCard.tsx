import type { ReactElement } from "react";
import type { CV } from "../model";
import { CONTACT_KEYS, HEADLINE_KEYS, type Action as Edit } from "../ops";
import { Action, Field } from "./fields";
import { Fold } from "./Fold";
import { Menu } from "./Menu";

export interface HeaderCardProps {
  readonly cv: CV;
  readonly dispatch: (action: Edit) => void;
}

/** Name, headline and contact lines. The headline is the contact line keyed "Title". */
export function HeaderCard({ cv, dispatch }: HeaderCardProps): ReactElement {
  const headline = cv.contact.find((c) => HEADLINE_KEYS.includes(c.key));
  const contact = cv.contact.filter((c) => !HEADLINE_KEYS.includes(c.key));
  const unused = CONTACT_KEYS.filter((k) => !contact.some((c) => c.key === k));
  return (
    <section className="card header-card" aria-label="Header" data-edit-ref="header">
      <Fold
        id="header"
        label="header"
        defaultOpen
        className="section-fold"
        head={<h2 className="card-title">Header</h2>}
      >
        <div className="grid-2">
          <Field
            label="Name"
            value={cv.name}
            editRef="name"
            placeholder="Your name"
            className="field-name"
            onChange={(value) => {
              dispatch({ type: "setName", value });
            }}
          />
          <Field
            label="Headline"
            value={headline?.value ?? ""}
            placeholder="Software Engineer"
            onChange={(value) => {
              dispatch({ type: "setHeadline", value });
            }}
          />
        </div>
        <datalist id="contact-keys">
          {CONTACT_KEYS.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
        <ul className="contact-rows" data-edit-ref="contact">
          {contact.map((c) => (
            <li key={c.id} className="contact-row">
              <Field
                label="Label"
                hideLabel
                value={c.key}
                list="contact-keys"
                placeholder="Label"
                className="field-key"
                onChange={(key) => {
                  dispatch({ type: "setContact", id: c.id, key });
                }}
              />
              <Field
                label={c.key || "Value"}
                hideLabel
                value={c.value}
                placeholder={c.key}
                onChange={(value) => {
                  dispatch({ type: "setContact", id: c.id, value });
                }}
              />
              <Action
                label={`Remove ${c.key || "line"}`}
                className="remove"
                onClick={() => {
                  dispatch({ type: "remove", id: c.id });
                }}
              >
                ×
              </Action>
            </li>
          ))}
        </ul>
        <div className="adders">
          <Menu
            label="Add a contact line"
            text="+ Contact"
            items={[
              ...unused.map((key) => ({
                label: key,
                onSelect: () => {
                  dispatch({ type: "addContact", key });
                },
              })),
              {
                label: "Other (shown in italics under the contact line)",
                onSelect: () => {
                  dispatch({ type: "addContact", key: "Availability" });
                },
              },
            ]}
          />
        </div>
      </Fold>
    </section>
  );
}
