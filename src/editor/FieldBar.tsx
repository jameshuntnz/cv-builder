import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { useState, type ReactElement, type ReactNode } from "react";
import { safeHref } from "../inline";
import { currentLink, modKey, setLink, toggleMark } from "./format";
import { currentItem, moveItem, removeItem } from "./listCommands";

export interface FieldBarProps {
  readonly editor: Editor;
  readonly list: boolean;
  readonly linking: boolean;
  readonly setLinking: (on: boolean) => void;
}

/** A toolbar button that leaves the caret where it is. */
function Tool(props: {
  readonly label: string;
  readonly className?: string;
  readonly pressed?: boolean;
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <button
      type="button"
      className={props.className}
      title={props.label}
      aria-label={props.label}
      aria-pressed={props.pressed}
      disabled={props.disabled}
      onMouseDown={(e) => {
        e.preventDefault();
      }}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

/**
 * Formatting for one rich-text field, shown while it's being edited: bold, italic and
 * link, and for bullet lists, moving and removing the current bullet.
 */
export function FieldBar({ editor, list, linking, setLinking }: FieldBarProps): ReactElement {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      link: e.isActive("link"),
      item: currentItem(e),
    }),
  });
  const mod = modKey();
  const item = state.item;
  return (
    <div className="fieldbar" role="toolbar" aria-label="Formatting">
      <Tool
        label={`Bold (${mod}B)`}
        className="tb-bold"
        pressed={state.bold}
        onClick={() => {
          toggleMark(editor, "bold");
        }}
      >
        B
      </Tool>
      <Tool
        label={`Italic (${mod}I)`}
        className="tb-italic"
        pressed={state.italic}
        onClick={() => {
          toggleMark(editor, "italic");
        }}
      >
        I
      </Tool>
      <Tool
        label={`Link (${mod}K)`}
        pressed={state.link}
        onClick={() => {
          setLinking(!linking);
        }}
      >
        Link
      </Tool>
      {list && (
        <>
          <span className="fieldbar-gap" />
          <Tool
            label="Move bullet up (Alt+↑)"
            disabled={!item || item.index === 0}
            onClick={() => moveItem(editor, -1)}
          >
            ↑
          </Tool>
          <Tool
            label="Move bullet down (Alt+↓)"
            disabled={!item || item.index === item.count - 1}
            onClick={() => moveItem(editor, 1)}
          >
            ↓
          </Tool>
          <Tool label="Remove bullet" disabled={!item} onClick={() => removeItem(editor)}>
            Remove
          </Tool>
        </>
      )}
      {linking && (
        <LinkForm
          initial={currentLink(editor)}
          onDone={(href) => {
            if (href !== undefined) setLink(editor, href);
            setLinking(false);
          }}
        />
      )}
    </div>
  );
}

function LinkForm({
  initial,
  onDone,
}: {
  readonly initial: string;
  readonly onDone: (href: string | undefined) => void;
}): ReactElement {
  const [href, setHref] = useState(initial);
  const valid = href.trim() === "" || safeHref(href) !== undefined;
  return (
    <form
      className="link-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onDone(href.trim() === "" ? "" : (safeHref(href) ?? ""));
      }}
    >
      <input
        aria-label="Link address"
        placeholder="example.com"
        value={href}
        autoFocus
        aria-invalid={!valid}
        onChange={(e) => {
          setHref(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onDone(undefined);
        }}
      />
      <button type="submit" disabled={!valid}>
        {href.trim() === "" ? "Remove link" : "Apply"}
      </button>
    </form>
  );
}
