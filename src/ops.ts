import {
  nextId,
  type CV,
  type Entry,
  type Item,
  type Pair,
  type Role,
  type Section,
} from "./model";
import type { ElementKey, PageStyle, Style, TextStyle } from "./style/model";
import { applyStyle, isStyleAction, type StyleAction } from "./style/ops";

/** A change to some style settings; `undefined` puts a setting back to the default. */
export type Patch<T> = { [K in keyof T]?: T[K] | undefined };

/** Contact keys that mean the headline under the name. */
export const HEADLINE_KEYS = ["Title", "Headline"];

/** Contact lines offered in the header editor. */
export const CONTACT_KEYS = [
  "Email",
  "Phone",
  "Location",
  "LinkedIn",
  "GitHub",
  "Website",
  "Portfolio",
];

/** Section templates offered by "Add section". */
export const PRESETS = {
  summary: { title: "Summary", label: "Summary (a paragraph)" },
  experience: { title: "Experience", label: "Experience (employers and roles)" },
  projects: { title: "Projects", label: "Projects (entries)" },
  education: { title: "Education", label: "Education (a list)" },
  skills: { title: "Skills", label: "Skills (labelled lists)" },
  list: { title: "New section", label: "Other (a list)" },
} satisfies Record<string, { title: string; label: string }>;

export type Preset = keyof typeof PRESETS;

export function isPreset(x: string): x is Preset {
  return Object.hasOwn(PRESETS, x);
}

type EntryFields = Partial<Pick<Entry, "name" | "location" | "dates" | "link" | "blurb">>;

export type Action =
  | { readonly type: "replace"; readonly cv: CV }
  | { readonly type: "setName"; readonly value: string }
  | {
      readonly type: "setContact";
      readonly id: string;
      readonly key?: string;
      readonly value?: string;
    }
  | { readonly type: "addContact"; readonly key: string }
  | { readonly type: "setHeadline"; readonly value: string }
  | { readonly type: "addSection"; readonly preset: Preset }
  | { readonly type: "renameSection"; readonly id: string; readonly title: string }
  | { readonly type: "toggleSection"; readonly id: string }
  | { readonly type: "move"; readonly id: string; readonly overId: string }
  | { readonly type: "remove"; readonly id: string }
  | { readonly type: "addEntry"; readonly sectionId: string; readonly withRole?: boolean }
  | { readonly type: "updateEntry"; readonly id: string; readonly patch: EntryFields }
  | { readonly type: "addRole"; readonly entryId: string }
  | {
      readonly type: "updateRole";
      readonly id: string;
      readonly title?: string;
      readonly dates?: string;
    }
  | { readonly type: "addPair"; readonly sectionId: string }
  | {
      readonly type: "updatePair";
      readonly id: string;
      readonly key?: string;
      readonly value?: string;
    }
  | { readonly type: "addParagraph"; readonly sectionId: string }
  | { readonly type: "setText"; readonly id: string; readonly text: string }
  | { readonly type: "setBullets"; readonly ownerId: string; readonly texts: readonly string[] }
  | { readonly type: "stylePage"; readonly patch: Patch<PageStyle> }
  | { readonly type: "styleElement"; readonly key: ElementKey; readonly patch: Patch<TextStyle> }
  | { readonly type: "setStyle"; readonly style: Style }
  | { readonly type: "resetStyle"; readonly key: ElementKey | "page" };

/** Any list in the document that holds things with ids, so moves and removals are generic. */
function lists(cv: CV): { id: string }[][] {
  const out: { id: string }[][] = [cv.contact, cv.sections];
  for (const s of cv.sections) {
    out.push(s.paragraphs, s.pairs, s.bullets, s.entries);
    for (const e of s.entries) {
      out.push(e.bullets, e.roles);
      for (const r of e.roles) out.push(r.bullets);
    }
  }
  return out;
}

export function entries(cv: CV): Entry[] {
  return cv.sections.flatMap((s) => s.entries);
}

export function roles(cv: CV): Role[] {
  return entries(cv).flatMap((e) => e.roles);
}

function pairs(cv: CV): Pair[] {
  return cv.sections.flatMap((s) => s.pairs);
}

/** Items whose text is edited directly: paragraphs and every kind of bullet. */
function items(cv: CV): Item[] {
  return [
    ...cv.sections.flatMap((s) => [...s.paragraphs, ...s.bullets]),
    ...entries(cv).flatMap((e) => e.bullets),
    ...roles(cv).flatMap((r) => r.bullets),
  ];
}

/** The bullet list owned by a section, entry or role. */
function bulletsOf(cv: CV, ownerId: string): Item[] | undefined {
  const owner = [...cv.sections, ...entries(cv), ...roles(cv)].find((o) => o.id === ownerId);
  return owner?.bullets;
}

/** Move `id` to where `overId` is, within whichever list holds both. */
export function move(cv: CV, id: string, overId: string): void {
  for (const list of lists(cv)) {
    const from = list.findIndex((x) => x.id === id);
    const to = list.findIndex((x) => x.id === overId);
    if (from < 0 || to < 0) continue;
    list.splice(to, 0, ...list.splice(from, 1));
    return;
  }
}

export function remove(cv: CV, id: string): void {
  for (const list of lists(cv)) {
    const at = list.findIndex((x) => x.id === id);
    if (at >= 0) {
      list.splice(at, 1);
      return;
    }
  }
}

export function newSection(preset: Preset): Section {
  const section: Section = {
    id: nextId(),
    line: 0,
    title: PRESETS[preset].title,
    hidden: false,
    paragraphs: [],
    pairs: [],
    bullets: [],
    entries: [],
  };
  if (preset === "summary") section.paragraphs.push({ id: nextId(), line: 0, text: "" });
  if (preset === "skills") section.pairs.push(newPair());
  if (preset === "experience") section.entries.push(newEntry(true));
  if (preset === "projects") section.entries.push(newEntry(false));
  if (preset === "education" || preset === "list")
    section.bullets.push({ id: nextId(), line: 0, text: "" });
  return section;
}

export function newEntry(withRole: boolean): Entry {
  return {
    id: nextId(),
    line: 0,
    name: "",
    location: "",
    dates: "",
    link: "",
    blurb: "",
    bullets: withRole ? [] : [{ id: nextId(), line: 0, text: "" }],
    roles: withRole ? [newRole()] : [],
  };
}

export function newRole(): Role {
  return {
    id: nextId(),
    line: 0,
    title: "",
    dates: "",
    bullets: [{ id: nextId(), line: 0, text: "" }],
  };
}

function newPair(): Pair {
  return { id: nextId(), line: 0, key: "", value: "" };
}

/** Replace a bullet list's text, keeping ids by position so notes and focus stay put. */
export function setBullets(list: Item[], texts: readonly string[]): void {
  const next = texts.map((text, i) => {
    const old = list[i];
    return old ? { ...old, text } : { id: nextId(), line: 0, text };
  });
  list.splice(0, list.length, ...next);
}

/** A new entry takes roles if asked, or else if its neighbours have them. */
function addEntry(cv: CV, sectionId: string, withRole?: boolean): void {
  const section = cv.sections.find((s) => s.id === sectionId);
  if (!section) return;
  section.entries.push(newEntry(withRole ?? section.entries.some((e) => e.roles.length > 0)));
}

/** Set the given string fields on the node with this id; undefined fields are left alone. */
function patch(
  list: readonly { id: string }[],
  id: string,
  fields: Record<string, string | undefined>,
): void {
  const node = list.find((x) => x.id === id);
  if (!node) return;
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && key in node) Reflect.set(node, key, value);
  }
}

type TextAction = Extract<
  Action,
  {
    type:
      | "updateEntry"
      | "updateRole"
      | "addPair"
      | "addParagraph"
      | "updatePair"
      | "setText"
      | "setBullets";
  }
>;

/** Edits to text and the leaves of the tree. */
function applyText(cv: CV, action: TextAction): void {
  switch (action.type) {
    case "updateEntry":
      patch(entries(cv), action.id, action.patch);
      return;
    case "updateRole":
      patch(roles(cv), action.id, { title: action.title, dates: action.dates });
      return;
    case "addPair":
      cv.sections.find((x) => x.id === action.sectionId)?.pairs.push(newPair());
      return;
    case "addParagraph":
      cv.sections
        .find((x) => x.id === action.sectionId)
        ?.paragraphs.push({ id: nextId(), line: 0, text: "" });
      return;
    case "updatePair":
      patch(pairs(cv), action.id, { key: action.key, value: action.value });
      return;
    case "setText": {
      const item = items(cv).find((x) => x.id === action.id);
      if (item) item.text = action.text;
      return;
    }
    case "setBullets": {
      const list = bulletsOf(cv, action.ownerId);
      if (list) setBullets(list, action.texts);
      return;
    }
  }
}

/** The headline is the `Title` contact line; it goes first so the markdown reads naturally. */
function setHeadline(cv: CV, value: string): void {
  const line = cv.contact.find((c) => HEADLINE_KEYS.includes(c.key));
  if (line) line.value = value;
  else cv.contact.unshift({ id: nextId(), key: "Title", value });
}

function updateSection(cv: CV, id: string, title?: string): void {
  const s = cv.sections.find((x) => x.id === id);
  if (!s) return;
  if (title === undefined) s.hidden = !s.hidden;
  else s.title = title;
}

/** Apply one edit to a draft of the CV (see immer). Unknown ids are ignored. */
export function apply(cv: CV, action: Action): void {
  if (isStyleAction(action)) applyStyle(cv, action);
  else applyContent(cv, action);
}

/** Edits to what the CV says: its header, sections, entries and their order. */
function applyContent(cv: CV, action: Exclude<Action, StyleAction>): void {
  switch (action.type) {
    case "replace":
      Object.assign(cv, action.cv);
      return;
    case "setName":
      cv.name = action.value;
      return;
    case "setContact":
      patch(cv.contact, action.id, { key: action.key, value: action.value });
      return;
    case "addContact":
      cv.contact.push({ id: nextId(), key: action.key, value: "" });
      return;
    case "setHeadline":
      setHeadline(cv, action.value);
      return;
    case "addSection":
      cv.sections.push(newSection(action.preset));
      return;
    case "renameSection":
      updateSection(cv, action.id, action.title);
      return;
    case "toggleSection":
      updateSection(cv, action.id);
      return;
    case "move":
      move(cv, action.id, action.overId);
      return;
    case "remove":
      remove(cv, action.id);
      return;
    case "addEntry":
      addEntry(cv, action.sectionId, action.withRole);
      return;
    case "addRole":
      entries(cv)
        .find((x) => x.id === action.entryId)
        ?.roles.push(newRole());
      return;
    default:
      applyText(cv, action);
  }
}
