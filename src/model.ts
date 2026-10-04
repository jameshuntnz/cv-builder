import type { Style } from "./style/model";

/**
 * The working shape of a CV. The visual editor changes it in place; it is saved,
 * shared and exported as markdown (see parse.ts and serialize.ts).
 *
 * Every node has an `id`, so the paper, the editor and the notes can point at the
 * same thing, and a `line`, its line in the markdown it was parsed from (0 if new).
 * Text fields hold inline markdown: **bold**, *italic*, `code`, [text](url).
 */

export interface Item {
  readonly id: string;
  line: number;
  text: string;
}

export interface Pair {
  readonly id: string;
  line: number;
  key: string;
  value: string;
}

export interface Role {
  readonly id: string;
  line: number;
  title: string;
  dates: string;
  bullets: Item[];
}

/** A `###` heading: an employer, project or qualification. */
export interface Entry {
  readonly id: string;
  line: number;
  name: string;
  location: string;
  dates: string;
  link: string;
  blurb: string;
  bullets: Item[];
  roles: Role[];
}

export interface Section {
  readonly id: string;
  line: number;
  title: string;
  hidden: boolean;
  paragraphs: Item[];
  pairs: Pair[];
  bullets: Item[];
  entries: Entry[];
}

export interface Contact {
  readonly id: string;
  key: string;
  value: string;
}

export interface Diagnostic {
  readonly line: number;
  readonly message: string;
}

export interface CV {
  name: string;
  /** How it looks; empty is the classic template. */
  style: Style;
  contact: Contact[];
  sections: Section[];
  readonly diagnostics: Diagnostic[];
}

export type Paper = "a4" | "letter";

export interface Layout {
  readonly paper: Paper;
  readonly compact: boolean;
}

let counter = 0;

/** A fresh id, unique for this page load. */
export function nextId(): string {
  counter += 1;
  return `n${String(counter)}`;
}
