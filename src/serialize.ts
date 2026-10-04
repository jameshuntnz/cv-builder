import type { CV, Entry, Item, Role, Section } from "./model";
import { HIDDEN_MARK } from "./parse";
import { writeFrontMatter } from "./style/frontMatter";

/** Fields joined by `|` in a heading can't contain one themselves. */
function field(text: string): string {
  return text.replace(/\s*\|\s*/g, " / ").trim();
}

function bullets(items: readonly Item[]): string[] {
  return items
    .map((b) => b.text.replace(/\n/g, " ").trim())
    .filter((t) => t !== "")
    .map((t) => `- ${t}`);
}

/** A `**Key:**` label: no `*` or `:` inside, never empty. */
function label(key: string, fallback: string): string {
  return key.replace(/[*:]/g, "").trim() || fallback;
}

function role(r: Role): string[] {
  // A title can't be empty or contain `*`, or it would stop reading as a role.
  const title = field(r.title).replace(/\*/g, "") || " ";
  return [`**${title}** | ${field(r.dates)}`.trimEnd(), ...bullets(r.bullets), ""];
}

function entry(e: Entry): string[] {
  const head = field(e.name) + (e.location.trim() ? ` – ${field(e.location)}` : "");
  const fields = [head || "Untitled", field(e.dates), field(e.link)].filter((f) => f !== "");
  const lines = [`### ${fields.join(" | ")}`];
  if (e.blurb.trim()) lines.push(`*${e.blurb.replace(/\n/g, " ").trim()}*`);
  lines.push(...bullets(e.bullets), "");
  for (const r of e.roles) lines.push(...role(r));
  return lines;
}

function section(s: Section): string[] {
  const lines = [`## ${s.title.trim() || "Untitled"}${s.hidden ? ` ${HIDDEN_MARK}` : ""}`, ""];
  for (const p of s.paragraphs) {
    lines.push(
      ...p.text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l !== ""),
      "",
    );
  }
  lines.push(...s.pairs.map((p) => `- **${label(p.key, "Label")}:** ${p.value.trim()}`), "");
  lines.push(...bullets(s.bullets), "");
  for (const e of s.entries) lines.push(...entry(e));
  return lines;
}

/** Write the CV back out as markdown that `parse` reads into the same shape. */
export function serialize(cv: CV): string {
  const lines = [`# ${cv.name.trim()}`.trimEnd(), ""];
  lines.push(...cv.contact.map((c) => `**${label(c.key, "Contact")}:** ${c.value.trim()}`), "");
  for (const s of cv.sections) lines.push(...section(s));
  const body = lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
  return `${writeFrontMatter(cv.style)}${body}\n`;
}
