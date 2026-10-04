import { nextId, type CV, type Entry, type Role, type Section } from "./model";
import { readFrontMatter } from "./style/frontMatter";

const HEADING = /^(#{1,3})(?:\s+(.*))?$/;
const KEY_VALUE = /^\*\*([^*]+?):\*\*\s*(.*)$/;
const ROLE = /^\*\*([^*]+)\*\*\s*\|\s*(.*)$/;
const BULLET = /^[-*]\s+/;
const LOOKS_LIKE_LINK = /^(https?:\/\/|www\.)|\.[a-z]{2,}(\/|$)/i;
const HAS_YEAR = /\d{4}/;
const DASHES = [" – ", " — ", " - "];
/** `## Projects <!-- hidden -->` keeps a section in the document but off the page. */
export const HIDDEN_MARK = "<!-- hidden -->";
const HIDDEN = /<!--\s*hidden\s*-->\s*$/;

export interface HeadingParts {
  readonly name: string;
  readonly location: string;
  readonly dates: string;
  readonly link: string;
}

/** "Company – City | Mar 2023–Present | example.com" → its parts. */
export function splitHeading(text: string): HeadingParts {
  const [head = "", ...fields] = text.split("|").map((p) => p.trim());
  let dates = "";
  let link = "";
  for (const field of fields) {
    if (LOOKS_LIKE_LINK.test(field) && !HAS_YEAR.test(field)) link = field;
    else dates = field;
  }
  const dash = DASHES.find((d) => head.includes(d));
  if (dash === undefined) return { name: head, location: "", dates, link };
  const at = head.indexOf(dash);
  return {
    name: head.slice(0, at).trim(),
    location: head.slice(at + dash.length).trim(),
    dates,
    link,
  };
}

/** Blank out HTML comments but keep their newlines, so line numbers stay true. */
export function stripComments(md: string): string {
  return md.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ""));
}

interface State {
  readonly cv: CV;
  section: Section | undefined;
  entry: Entry | undefined;
  role: Role | undefined;
  inParagraph: boolean;
}

function addBullet(s: State, text: string, line: number): void {
  const item = { id: nextId(), line, text };
  if (s.role) s.role.bullets.push(item);
  else if (s.entry) s.entry.bullets.push(item);
  else if (s.section) {
    const kv = KEY_VALUE.exec(text);
    if (kv) {
      const [, key = "", value = ""] = kv;
      s.section.pairs.push({ id: item.id, line, key: key.trim(), value: value.trim() });
    } else s.section.bullets.push(item);
  } else s.cv.diagnostics.push({ line, message: "A bullet before the first section is ignored." });
}

function addHeader(s: State, text: string, line: number): void {
  const kv = KEY_VALUE.exec(text);
  if (!kv) {
    s.cv.diagnostics.push({ line, message: "Header lines look like **Key:** value." });
    return;
  }
  const [, key = "", value = ""] = kv;
  s.cv.contact.push({ id: nextId(), key: key.trim(), value: value.trim() });
}

function addText(s: State, section: Section, text: string, line: number): boolean {
  const role = ROLE.exec(text);
  if (role && s.entry) {
    const [, title = "", dates = ""] = role;
    s.role = { id: nextId(), line, title: title.trim(), dates: dates.trim(), bullets: [] };
    s.entry.roles.push(s.role);
    return false;
  }
  const isBlurb = text.length > 2 && text.startsWith("*") && text.endsWith("*");
  const entry = s.entry;
  if (
    entry &&
    isBlurb &&
    entry.blurb === "" &&
    entry.roles.length === 0 &&
    entry.bullets.length === 0
  ) {
    entry.blurb = text.slice(1, -1).trim();
    return false;
  }
  const last = section.paragraphs.at(-1);
  if (s.inParagraph && last) last.text += `\n${text}`;
  else section.paragraphs.push({ id: nextId(), line, text });
  return true;
}

interface Heading {
  readonly level: number;
  readonly text: string;
  readonly line: number;
  readonly hidden: boolean;
}

function addHeading(s: State, { level, text, line, hidden }: Heading): void {
  if (level === 1) {
    s.cv.name = text.replace(/^(CV|Resume|Résumé)\s*[–—-]\s*/i, "");
    return;
  }
  if (level === 2) {
    s.section = {
      id: nextId(),
      line,
      title: text,
      hidden,
      paragraphs: [],
      pairs: [],
      bullets: [],
      entries: [],
    };
    s.cv.sections.push(s.section);
    s.entry = s.role = undefined;
    return;
  }
  if (!s.section) {
    s.cv.diagnostics.push({ line, message: "A ### entry before the first section is ignored." });
    return;
  }
  s.entry = { id: nextId(), line, ...splitHeading(text), blurb: "", bullets: [], roles: [] };
  s.section.entries.push(s.entry);
  s.role = undefined;
}

function parseLine(s: State, text: string, line: number, hidden: boolean): boolean {
  const heading = HEADING.exec(text);
  if (heading) {
    const [, hashes = "", rest = ""] = heading;
    addHeading(s, { level: hashes.length, text: rest.trim(), line, hidden });
    return false;
  }
  if (BULLET.test(text)) {
    addBullet(s, text.replace(BULLET, "").trim(), line);
    return false;
  }
  if (!s.section) {
    addHeader(s, text, line);
    return false;
  }
  return addText(s, s.section, text, line);
}

/** Parse CV markdown. Never throws; anything it can't place becomes a diagnostic. */
export function parse(source: string): CV {
  const { style, body: md, diagnostics } = readFrontMatter(source);
  const s: State = {
    cv: { name: "", style, contact: [], sections: [], diagnostics },
    section: undefined,
    entry: undefined,
    role: undefined,
    inParagraph: false,
  };
  // The hidden mark is a comment, so find it before comments are stripped.
  const hidden = new Set(md.split("\n").flatMap((line, i) => (HIDDEN.test(line) ? [i] : [])));
  stripComments(md)
    .split("\n")
    .forEach((line, i) => {
      const text = line.trim();
      if (text === "") s.inParagraph = false;
      else s.inParagraph = parseLine(s, text, i + 1, hidden.has(i));
    });
  return s.cv;
}
