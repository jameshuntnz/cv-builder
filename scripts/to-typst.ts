/**
 * Writes a CV's markdown as Typst source for e2e/vrt/template.typ: the reference the visual
 * regression test compares the builder's paper against. It reads the markdown with the
 * builder's own parser, so both sides lay out exactly the same document.
 *
 *   pnpm exec tsx scripts/to-typst.ts e2e/vrt/fixture.md > e2e/vrt/reference/fixture.typ
 */
import { readFileSync } from "node:fs";
import { segments } from "../src/inline";
import type { CV, Entry, Item, Role, Section } from "../src/model";
import { parse } from "../src/parse";

const ESCAPE: Record<string, string> = {
  "\\": "\\\\",
  "#": "\\#",
  "*": "\\*",
  _: "\\_",
  "`": "\\`",
  $: "\\$",
  "<": "\\<",
  ">": "\\>",
  "@": "\\@",
  "[": "\\[",
  "]": "\\]",
  '"': '\\"',
  "~": "\\~",
};

/** Raw text as Typst markup. */
export function esc(text: string): string {
  return text.replace(/[\\#$*_`<>@[\]"~]/g, (ch) => ESCAPE[ch] ?? ch);
}

/** A Typst string literal. */
export function str(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Inline markdown as Typst markup. */
export function inline(text: string): string {
  return segments(text)
    .map((s) => {
      if (s.href !== undefined) return `#link(${str(s.href)})[${esc(s.text)}]`;
      if (s.code) return `#raw(${str(s.text)})`;
      if (s.bold && s.italic) return `#strong[#emph[${esc(s.text)}]]`;
      if (s.bold) return `#strong[${esc(s.text)}]`;
      if (s.italic) return `#emph[${esc(s.text)}]`;
      return esc(s.text);
    })
    .join("");
}

function content(text: string): string {
  return `[${inline(text)}]`;
}

function bullets(items: readonly Item[]): string {
  if (items.length === 0) return "";
  return `#bullets(\n${items.map((b) => `  ${content(b.text)},`).join("\n")}\n)\n`;
}

function roleLine(r: Role, tight: boolean): string {
  return `#role(${content(r.title)}, ${content(r.dates)}${tight ? ", tight: true" : ""})\n`;
}

/**
 * An entry's heading, first role and first bullet go in one unbreakable block, so a page
 * break never leaves an employer's name alone at the foot of a page.
 */
function entry(e: Entry): string[] {
  const head =
    "#entry(\n" +
    `  name: ${content(e.name)},\n` +
    `  location: ${content(e.location)},\n` +
    `  dates: ${content(e.dates)},\n` +
    `  link: ${str(e.link)},\n` +
    `  blurb: ${content(e.blurb)},\n` +
    ")\n";
  const keep = [head];
  const rest: string[] = [];
  const [first, ...others] = e.roles;
  if (first) {
    keep.push(roleLine(first, false), bullets(first.bullets.slice(0, 1)));
    rest.push(bullets(first.bullets.slice(1)));
    let prev = first;
    for (const r of others) {
      rest.push(roleLine(r, prev.bullets.length === 0), bullets(r.bullets));
      prev = r;
    }
  } else {
    keep.push(bullets(e.bullets.slice(0, 1)));
    rest.push(bullets(e.bullets.slice(1)));
  }
  return [`#block(breakable: false)[\n${keep.join("")}]\n`, ...rest.filter((x) => x !== "")];
}

function section(s: Section): string[] {
  const out = [`= ${esc(s.title)}\n`];
  for (const p of s.paragraphs) out.push(`${p.text.split("\n").map(inline).join(" \\\n")}\n`);
  if (s.pairs.length > 0) {
    out.push(
      `#kvlist(\n${s.pairs.map((p) => `  (${content(p.key)}, ${content(p.value)})`).join(",\n")},\n)\n`,
    );
  }
  // Kept even when empty, as the original converter does: blank lines are paragraph breaks.
  out.push(bullets(s.bullets));
  for (const e of s.entries) out.push(...entry(e));
  return out;
}

/** The whole CV as a Typst document that imports `template`. */
export function toTypst(cv: CV, template: string): string {
  const contact = cv.contact.map((c) => `(${str(c.key)}, ${str(c.value)})`).join(", ");
  const head = [
    `#import ${str(template)}: *\n`,
    `#show: cv.with(\n  name: ${str(cv.name)},\n  contact: (${contact},),\n)\n`,
  ];
  return [...head, ...cv.sections.flatMap(section)].join("\n");
}

const [file, template = "../template.typ"] = process.argv.slice(2);
// A final newline, as the original converter printed one.
if (file) process.stdout.write(`${toTypst(parse(readFileSync(file, "utf8")), template)}\n`);
