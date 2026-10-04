import type { Editor } from "@tiptap/core";

export type Mark = "bold" | "italic";

export function toggleMark(editor: Editor, mark: Mark): void {
  const chain = editor.chain().focus();
  if (mark === "bold") chain.toggleBold().run();
  else chain.toggleItalic().run();
}

/** Link the selection, or unlink it when `href` is empty. */
export function setLink(editor: Editor, href: string): void {
  const chain = editor.chain().focus().extendMarkRange("link");
  if (href.trim() === "") chain.unsetLink().run();
  else chain.setLink({ href: href.trim() }).run();
}

export function currentLink(editor: Editor): string {
  const href: unknown = editor.getAttributes("link")["href"];
  return typeof href === "string" ? href : "";
}

/** "⌘" on Apple keyboards, "Ctrl+" elsewhere, for button tooltips. */
export function modKey(platform: string = globalThis.navigator.platform): string {
  return /Mac|iPhone|iPad/.test(platform) ? "⌘" : "Ctrl+";
}
