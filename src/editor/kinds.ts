import type { Section } from "../model";

/** What a section mostly holds, which decides how it's edited and what "add" means. */
export type SectionKind = "jobs" | "entries" | "skills" | "list" | "text" | "empty";

export function sectionKind(s: Section): SectionKind {
  if (s.entries.some((e) => e.roles.length > 0)) return "jobs";
  if (s.entries.length > 0) return "entries";
  if (s.pairs.length > 0) return "skills";
  if (s.bullets.length > 0) return "list";
  if (s.paragraphs.length > 0) return "text";
  return "empty";
}

export type Addable = "job" | "entry" | "category" | "list" | "paragraph";

export const ADD_LABELS: Record<Addable, string> = {
  job: "Employer with roles",
  entry: "Entry",
  category: "Skill category",
  list: "List",
  paragraph: "Paragraph",
};

/** The one thing a section of this kind most often needs more of, shown as its main button. */
export function primaryAdd(kind: SectionKind): Addable | undefined {
  switch (kind) {
    case "jobs":
      return "job";
    case "entries":
      return "entry";
    case "skills":
      return "category";
    case "text":
      return "paragraph";
    case "list":
    case "empty":
      return undefined;
  }
}

/** Everything else that can go in the section, offered in its menu. A list appears once. */
export function otherAdds(s: Section): Addable[] {
  const main = primaryAdd(sectionKind(s));
  const all: Addable[] = ["job", "entry", "category", "paragraph"];
  if (s.bullets.length === 0) all.push("list");
  return all.filter((a) => a !== main);
}
