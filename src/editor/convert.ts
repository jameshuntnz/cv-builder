import type { JSONContent } from "@tiptap/core";
import { segments, toMarkdown, type Segment } from "../inline";

/** Inline markdown (one line, `\n` for a hard break) → TipTap inline nodes. */
export function toInline(text: string): JSONContent[] {
  return text.split("\n").flatMap((line, i): JSONContent[] => {
    const nodes = segments(line).map((s): JSONContent => {
      const marks: NonNullable<JSONContent["marks"]> = [];
      if (s.bold) marks.push({ type: "bold" });
      if (s.italic) marks.push({ type: "italic" });
      if (s.code) marks.push({ type: "code" });
      if (s.href !== undefined) marks.push({ type: "link", attrs: { href: s.href } });
      return marks.length > 0
        ? { type: "text", text: s.text, marks }
        : { type: "text", text: s.text };
    });
    return i === 0 ? nodes : [{ type: "hardBreak" }, ...nodes];
  });
}

function segmentOf(node: JSONContent): Segment {
  const types = new Set((node.marks ?? []).map((m) => m.type));
  const link = (node.marks ?? []).find((m) => m.type === "link");
  const href: unknown = link?.attrs?.["href"];
  return {
    text: node.text ?? "",
    ...(types.has("bold") ? { bold: true } : {}),
    ...(types.has("italic") ? { italic: true } : {}),
    ...(types.has("code") ? { code: true } : {}),
    ...(typeof href === "string" && href !== "" ? { href } : {}),
  };
}

/** Inline nodes → inline markdown. Hard breaks become `\n`. */
export function fromInline(nodes: readonly JSONContent[] | undefined): string {
  const lines: Segment[][] = [[]];
  for (const node of nodes ?? []) {
    if (node.type === "hardBreak") lines.push([]);
    else if (node.type === "text") lines.at(-1)?.push(segmentOf(node));
  }
  return lines.map(toMarkdown).join("\n");
}

function paragraph(text: string): JSONContent {
  const content = toInline(text);
  return content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" };
}

/** A one-paragraph document for a single rich-text field. */
export function textDoc(text: string): JSONContent {
  return { type: "doc", content: [paragraph(text)] };
}

/** Every paragraph's text in a document, in order, however deeply nested. */
function paragraphs(node: JSONContent): string[] {
  if (node.type === "paragraph") return [fromInline(node.content)];
  return (node.content ?? []).flatMap(paragraphs);
}

export function fromTextDoc(doc: JSONContent): string {
  return paragraphs(doc).join("\n");
}

/** A bullet-list document, one list item per bullet. An empty list still has one empty item. */
export function bulletsDoc(texts: readonly string[]): JSONContent {
  const items = (texts.length > 0 ? texts : [""]).map((t) => ({
    type: "listItem",
    content: [paragraph(t)],
  }));
  return { type: "doc", content: [{ type: "bulletList", content: items }] };
}

function listItems(node: JSONContent): JSONContent[] {
  const nested = (node.content ?? []).flatMap(listItems);
  return node.type === "listItem" ? [node, ...nested] : nested;
}

/** One string per list item; a pasted nested list is flattened into the one list. */
export function fromBulletsDoc(doc: JSONContent): string[] {
  return listItems(doc).map((item) =>
    (item.content ?? [])
      .filter((c) => c.type === "paragraph")
      .map((c) => fromInline(c.content).replace(/\n/g, " "))
      .join(" "),
  );
}

/** Whether a list's text already matches what the editor shows; [] and [""] are the same. */
export function sameBullets(a: readonly string[], b: readonly string[]): boolean {
  const norm = (x: readonly string[]): string => (x.length === 0 ? [""] : x).join("\u0000");
  return norm(a) === norm(b);
}
