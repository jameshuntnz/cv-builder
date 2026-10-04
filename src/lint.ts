import { plain } from "./inline";
import type { CV, Item } from "./model";

/** A writing note shown beside the editor: advice, never an error. `ref` is the node it's about. */
export interface Note {
  readonly ref: string | undefined;
  readonly line: number;
  readonly message: string;
}

export const MAX_BULLET_WORDS = 30;
const PRONOUNS = /\b(I|me|my|myself)\b/;

function words(text: string): string[] {
  return plain(text).split(/\s+/).filter(Boolean);
}

function bulletNotes({ id, line, text }: Item): Note[] {
  const notes: Note[] = [];
  const w = words(text);
  const at = { ref: id, line };
  if (w.length > MAX_BULLET_WORDS) {
    notes.push({
      ...at,
      message: `${String(w.length)} words. Two lines (about ${String(MAX_BULLET_WORDS)} words) reads best.`,
    });
  }
  const first = w[0] ?? "";
  if (/^[A-Za-z]+ing$/.test(first)) {
    notes.push({ ...at, message: `Opens with “${first}”. A past-tense verb reads as a result.` });
  }
  if (PRONOUNS.test(plain(text))) {
    notes.push({ ...at, message: "Drop first-person pronouns; the CV is already about you." });
  }
  if (/\*\*[^*]+\*\*/.test(text)) {
    notes.push({ ...at, message: "Bold inside a bullet competes with the headings." });
  }
  return notes;
}

function repeatedOpeners(bullets: readonly Item[]): Note[] {
  const seen = new Set<string>();
  const notes: Note[] = [];
  for (const { id, line, text } of bullets) {
    const first = (words(text)[0] ?? "").toLowerCase();
    if (first === "") continue;
    if (seen.has(first)) {
      notes.push({ ref: id, line, message: `“${first}” already opens a bullet in this entry.` });
    }
    seen.add(first);
  }
  return notes;
}

/** Notes for the whole document: parser diagnostics, header gaps, then bullet style. */
export function lint(cv: CV): Note[] {
  const notes: Note[] = cv.diagnostics.map((d) => ({ ref: undefined, ...d }));
  if (cv.name.trim() === "") notes.push({ ref: "name", line: 1, message: "Add your name." });
  if (!cv.contact.some((c) => c.key === "Email" && c.value.trim() !== "")) {
    notes.push({ ref: "contact", line: 1, message: "No email address in the header." });
  }
  for (const section of cv.sections.filter((s) => !s.hidden)) {
    notes.push(...section.bullets.flatMap(bulletNotes));
    for (const entry of section.entries) {
      const bullets = [...entry.bullets, ...entry.roles.flatMap((r) => r.bullets)];
      notes.push(...bullets.flatMap(bulletNotes), ...repeatedOpeners(bullets));
    }
  }
  return notes;
}

/** How the notes announce themselves: "1 thing to look at", "3 things to look at". */
export function notesSummary(count: number): string {
  return count === 1 ? "1 thing to look at" : `${String(count)} things to look at`;
}
