/** Inline markdown — **bold**, *italic*, ***both***, `code`, [text](url) — as flat segments. */

export interface Segment {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly code?: boolean;
  readonly href?: string;
}

// Emphasis can't open or close on a space, so "5 * 3" stays plain text.
const TOKEN =
  /(\*\*\*(?!\s)[^*]+(?<!\s)\*\*\*|\*\*(?!\s)[^*]+(?<!\s)\*\*|\*(?!\s)[^*]+(?<!\s)\*|`[^`]+`|\[[^\]]+\]\((?:[^()\s]|\([^()\s]*\))+\))/;
// A link target may hold one level of brackets, as in en.wikipedia.org/wiki/Mercury_(planet).
const LINK = /^\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)$/;

function wrapped(part: string, mark: string): string | undefined {
  const n = mark.length;
  return part.length > 2 * n && part.startsWith(mark) && part.endsWith(mark)
    ? part.slice(n, -n)
    : undefined;
}

function segment(part: string): Segment {
  const both = wrapped(part, "***");
  if (both !== undefined) return { text: both, bold: true, italic: true };
  const bold = wrapped(part, "**");
  if (bold !== undefined) return { text: bold, bold: true };
  const italic = wrapped(part, "*");
  if (italic !== undefined) return { text: italic, italic: true };
  const code = wrapped(part, "`");
  if (code !== undefined) return { text: code, code: true };
  const link = LINK.exec(part);
  if (link?.[1] !== undefined && link[2] !== undefined) return { text: link[1], href: link[2] };
  return { text: part };
}

export function segments(text: string): Segment[] {
  return text
    .split(TOKEN)
    .filter((part) => part !== "")
    .map(segment);
}

function same(a: Segment, b: Segment): boolean {
  return a.bold === b.bold && a.italic === b.italic && a.code === b.code && a.href === b.href;
}

function merge(list: readonly Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const s of list) {
    const last = out.at(-1);
    if (last && same(last, s)) out[out.length - 1] = { ...last, text: last.text + s.text };
    else if (s.text !== "") out.push(s);
  }
  return out;
}

/** Inverse of `segments`. Marks that markdown can't nest here are dropped, text never is. */
export function toMarkdown(list: readonly Segment[]): string {
  return merge(list)
    .map((s) => {
      const text = s.text.replace(/[*`]/g, "");
      if (text.trim() === "") return s.text;
      if (s.href !== undefined) return `[${text.replace(/[[\]]/g, "")}](${s.href})`;
      if (s.code) return `\`${text}\``;
      const pad = text.slice(0, text.length - text.trimStart().length);
      const tail = text.slice(text.trimEnd().length);
      const core = text.trim();
      const mark = s.bold && s.italic ? "***" : s.bold ? "**" : s.italic ? "*" : "";
      return mark === "" ? s.text : `${pad}${mark}${core}${mark}${tail}`;
    })
    .join("");
}

/** The text with markdown punctuation removed, for checks and titles. */
export function plain(text: string): string {
  return segments(text)
    .map((s) => s.text)
    .join("");
}

const SAFE_SCHEMES = /^(https?:|mailto:|tel:)/i;

/** A user-written link target as a safe href, or undefined for anything else (javascript:, data:…). */
export function safeHref(target: string): string | undefined {
  const t = target.trim();
  if (SAFE_SCHEMES.test(t)) return t;
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return undefined;
  if (/^[\w.-]+\.[a-z]{2,}(?:[/?#]\S*)?$/i.test(t)) return `https://${t}`;
  return undefined;
}

/**
 * Apostrophes and single quotes as typeset ones, as Typst sets them: between letters an
 * apostrophe, otherwise opening or closing by what comes before. Double quotes stay straight,
 * because the template's converter escapes them, which turns Typst's smart quotes off.
 * Used for the paper only; the text as typed is left alone.
 */
export function typographic(text: string): string {
  return text.replace(/(^|[\s([{\u2014\u2013])'/g, "$1\u2018").replace(/'/g, "\u2019");
}
