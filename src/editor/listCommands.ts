import type { Editor } from "@tiptap/core";
import { Fragment } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";

/** Where the caret's bullet sits in its list, or undefined outside a list. */
export interface ItemAt {
  readonly depth: number;
  readonly index: number;
  readonly count: number;
}

export function currentItem(editor: Editor): ItemAt | undefined {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === "listItem") {
      return { depth, index: $from.index(depth - 1), count: $from.node(depth - 1).childCount };
    }
  }
  return undefined;
}

/** Swap the caret's bullet with the one above (-1) or below (1), keeping the caret in it. */
export function moveItem(editor: Editor, dir: -1 | 1): boolean {
  const at = currentItem(editor);
  if (!at) return false;
  const target = at.index + dir;
  if (target < 0 || target >= at.count) return false;
  const { state } = editor;
  const { $from } = state.selection;
  const list = $from.node(at.depth - 1);
  const lo = Math.min(at.index, target);
  let from = $from.start(at.depth - 1);
  for (let i = 0; i < lo; i++) from += list.child(i).nodeSize;
  const upper = list.child(lo);
  const lower = list.child(lo + 1);
  // The caret's offset inside its own bullet, which keeps its place after the swap.
  const ownStart = dir === 1 ? from : from + upper.nodeSize;
  const newStart = dir === 1 ? from + lower.nodeSize : from;
  const tr = state.tr.replaceWith(
    from,
    from + upper.nodeSize + lower.nodeSize,
    Fragment.from([lower, upper]),
  );
  tr.setSelection(TextSelection.create(tr.doc, newStart + ($from.pos - ownStart)));
  editor.view.dispatch(tr);
  return true;
}

/** Delete the caret's bullet; the last one left is emptied instead. */
export function removeItem(editor: Editor): boolean {
  const at = currentItem(editor);
  if (!at) return false;
  const { $from } = editor.state.selection;
  if (at.count === 1) {
    return editor
      .chain()
      .focus()
      .setTextSelection({ from: $from.start(), to: $from.end() })
      .deleteSelection()
      .run();
  }
  editor.view.dispatch(editor.state.tr.delete($from.before(at.depth), $from.after(at.depth)));
  editor.commands.focus();
  return true;
}

/** Put the caret in a fresh bullet at the end, reusing an empty last one. */
export function appendItem(editor: Editor): boolean {
  const chain = editor.chain().focus("end");
  const last = editor.state.doc.lastChild?.lastChild;
  if (last?.textContent === "") return chain.run();
  return chain.splitListItem("listItem").run();
}
