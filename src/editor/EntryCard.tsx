import { useState, type ReactElement } from "react";
import { plain } from "../inline";
import type { Entry, Role } from "../model";
import type { Action as Edit } from "../ops";
import { Action, Field } from "./fields";
import { Fold } from "./Fold";
import { Menu, type MenuItem } from "./Menu";
import { Bullets, RichText } from "./RichText";
import { DragHandle, type Handle } from "./sortable";

export interface EntryCardProps {
  readonly entry: Entry;
  readonly handle: Handle;
  /** Whether entries in this section are jobs with roles. */
  readonly jobs: boolean;
  readonly dispatch: (action: Edit) => void;
}

type EntryFields = Partial<Pick<Entry, "name" | "location" | "dates" | "link" | "blurb">>;

function RoleRow({
  role,
  dispatch,
}: {
  readonly role: Role;
  readonly dispatch: (a: Edit) => void;
}): ReactElement {
  return (
    <div className="role" data-edit-ref={role.id}>
      <div className="grid-role">
        <Field
          label="Role"
          hideLabel
          value={role.title}
          placeholder="Job title"
          className="field-role"
          onChange={(title) => {
            dispatch({ type: "updateRole", id: role.id, title });
          }}
        />
        <Field
          label="Role dates"
          hideLabel
          value={role.dates}
          placeholder="2022–Present"
          onChange={(dates) => {
            dispatch({ type: "updateRole", id: role.id, dates });
          }}
        />
        <Action
          label={`Remove role ${role.title}`.trim()}
          className="remove"
          onClick={() => {
            dispatch({ type: "remove", id: role.id });
          }}
        >
          ×
        </Action>
      </div>
      <Bullets
        label={`Bullets for ${role.title || "role"}`}
        editRef={role.id}
        items={role.bullets}
        placeholder="What you did, and what came of it"
        onChange={(texts) => {
          dispatch({ type: "setBullets", ownerId: role.id, texts });
        }}
      />
    </div>
  );
}

/** "Acme  Wellington · 2020–2024", or a prompt for an entry not filled in yet. */
function Summary({ entry }: { readonly entry: Entry }): ReactElement {
  const rest = [entry.location, entry.dates].filter((x) => x.trim() !== "").join(" · ");
  return (
    <span className="entry-summary">
      <strong>{plain(entry.name) || "New entry"}</strong>
      {rest && <span className="muted"> {rest}</span>}
    </span>
  );
}

/** One employer, project or qualification. Collapsed, it's a single summary line. */
export function EntryCard({ entry, handle, jobs, dispatch }: EntryCardProps): ReactElement {
  const update = (patch: EntryFields): void => {
    dispatch({ type: "updateEntry", id: entry.id, patch });
  };
  const name = plain(entry.name) || "entry";
  // A new, empty entry opens ready to fill in, and stays open once you start typing.
  const [startOpen] = useState(entry.name === "");
  const showRoles = jobs || entry.roles.length > 0;
  const menu: MenuItem[] = [
    {
      label: `Delete ${name}`,
      danger: true,
      onSelect: () => {
        dispatch({ type: "remove", id: entry.id });
      },
    },
  ];
  if (!showRoles) {
    menu.unshift({
      label: "Add roles (for promotions)",
      onSelect: () => {
        dispatch({ type: "addRole", entryId: entry.id });
      },
    });
  }
  return (
    <Fold
      id={entry.id}
      label={name}
      defaultOpen={startOpen}
      className="entry-card"
      head={
        <>
          <DragHandle {...handle} label={`Move ${name}`} />
          <Summary entry={entry} />
          <Menu label={`More for ${name}`} items={menu} />
        </>
      }
    >
      <div className="entry-body" data-edit-ref={entry.id}>
        <div className="grid-entry">
          <Field
            label="Name"
            hideLabel
            value={entry.name}
            placeholder={jobs ? "Employer" : "Name"}
            className="field-org"
            onChange={(v) => {
              update({ name: v });
            }}
          />
          <Field
            label="Place"
            hideLabel
            value={entry.location}
            placeholder="City, Country"
            onChange={(v) => {
              update({ location: v });
            }}
          />
          <Field
            label="Dates"
            hideLabel
            value={entry.dates}
            placeholder="2020–2024"
            onChange={(v) => {
              update({ dates: v });
            }}
          />
          <Field
            label="Link"
            hideLabel
            value={entry.link}
            placeholder="Link (optional)"
            onChange={(v) => {
              update({ link: v });
            }}
          />
        </div>
        <RichText
          label={`Description of ${name}`}
          editRef={`${entry.id}:blurb`}
          value={entry.blurb}
          placeholder="One line on what it is (optional)"
          onChange={(blurb) => {
            update({ blurb });
          }}
        />
        {(entry.bullets.length > 0 || !showRoles) && (
          <Bullets
            label={`Bullets for ${name}`}
            editRef={`${entry.id}:bullets`}
            items={entry.bullets}
            placeholder="What you did, and what came of it"
            onChange={(texts) => {
              dispatch({ type: "setBullets", ownerId: entry.id, texts });
            }}
          />
        )}
        {entry.roles.map((r) => (
          <RoleRow key={r.id} role={r} dispatch={dispatch} />
        ))}
        {showRoles && (
          <button
            type="button"
            className="add"
            onClick={() => {
              dispatch({ type: "addRole", entryId: entry.id });
            }}
          >
            + Role
          </button>
        )}
      </div>
    </Fold>
  );
}
