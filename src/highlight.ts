/** Which kind of line this is, for the source view's colouring. */
export type LineKind =
  "name" | "section" | "entry" | "field" | "role" | "bullet" | "comment" | "text";

export function lineKind(line: string, inComment: boolean): LineKind {
  const t = line.trim();
  if (inComment || t.startsWith("<!--")) return "comment";
  if (/^#(\s|$)/.test(t)) return "name";
  if (/^##(\s|$)/.test(t)) return "section";
  if (/^###(\s|$)/.test(t)) return "entry";
  if (/^[-*]\s/.test(t)) return "bullet";
  if (/^\*\*[^*]+:\*\*/.test(t)) return "field";
  if (/^\*\*[^*]+\*\*\s*\|/.test(t)) return "role";
  return "text";
}

/** Each source line with its kind, tracking multi-line comments. */
export function highlight(md: string): { kind: LineKind; text: string }[] {
  let inComment = false;
  return md.split("\n").map((text) => {
    const kind = lineKind(text, inComment);
    const open = text.lastIndexOf("<!--");
    const close = text.lastIndexOf("-->");
    if (open >= 0 || close >= 0) inComment = open > close;
    return { kind, text };
  });
}
