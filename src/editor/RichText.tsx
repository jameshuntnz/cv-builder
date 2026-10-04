import type { Editor, Extensions, JSONContent } from "@tiptap/core";
import Bold from "@tiptap/extension-bold";
import BulletList from "@tiptap/extension-bullet-list";
import Code from "@tiptap/extension-code";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Italic from "@tiptap/extension-italic";
import Link from "@tiptap/extension-link";
import ListItem from "@tiptap/extension-list-item";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { bulletsDoc, fromBulletsDoc, fromTextDoc, sameBullets, textDoc } from "./convert";
import { FieldBar } from "./FieldBar";
import { appendItem, moveItem } from "./listCommands";

const marks: Extensions = [
  Bold,
  Italic,
  Code,
  Link.configure({
    openOnClick: false,
    autolink: false,
    linkOnPaste: true,
    protocols: ["mailto", "tel"],
  }),
];

/** One list, no nesting: Enter makes a new bullet, Alt+arrows move one, Tab moves focus on. */
const FlatListItem = ListItem.extend({
  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitListItem(this.name),
      "Alt-ArrowUp": () => moveItem(this.editor, -1),
      "Alt-ArrowDown": () => moveItem(this.editor, 1),
    };
  },
});

const textExtensions: Extensions = [
  Document.extend({ content: "paragraph" }),
  Paragraph,
  Text,
  HardBreak,
  ...marks,
];
const listExtensions: Extensions = [
  Document.extend({ content: "bulletList" }),
  Paragraph,
  Text,
  BulletList,
  FlatListItem,
  ...marks,
];

interface FieldProps {
  readonly label: string;
  readonly editRef: string;
  readonly placeholder?: string;
}

interface RichOptions extends FieldProps {
  readonly onUpdate: (editor: Editor) => void;
  readonly onLinkKey: () => void;
}

function useRich(
  extensions: Extensions,
  content: JSONContent,
  options: RichOptions,
): Editor | null {
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });
  return useEditor({
    extensions,
    content,
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        "aria-label": options.label,
        "aria-multiline": "true",
        role: "textbox",
        class: "rich",
        "data-placeholder": options.placeholder ?? "",
      },
      handleKeyDown: (_view, event) => {
        const mod = event.metaKey || event.ctrlKey;
        if (!mod || event.key.toLowerCase() !== "k") return false;
        event.preventDefault();
        latest.current.onLinkKey();
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      latest.current.onUpdate(editor);
    },
  });
}

/** Keep the editor showing `value` when it changes from outside (undo, source view). */
function useSync(
  editor: Editor | null,
  differs: (e: Editor) => boolean,
  doc: () => JSONContent,
): void {
  useEffect(() => {
    if (editor && !editor.isDestroyed && differs(editor)) {
      editor.commands.setContent(doc(), { emitUpdate: false });
    }
  });
}

/** The field, its formatting bar (shown while editing) and anything after it. */
function Frame(props: {
  readonly editor: Editor | null;
  readonly list: boolean;
  readonly linking: boolean;
  readonly setLinking: (on: boolean) => void;
  readonly className: string;
  readonly editRef: string;
  readonly items?: string;
  readonly children?: ReactNode;
}): ReactElement {
  const { editor } = props;
  return (
    <div
      className={props.linking ? `${props.className} is-linking` : props.className}
      data-edit-ref={props.editRef}
      data-items={props.items}
    >
      <EditorContent editor={editor} />
      <div className="field-foot">
        {editor && (
          <FieldBar
            editor={editor}
            list={props.list}
            linking={props.linking}
            setLinking={props.setLinking}
          />
        )}
        {props.children}
      </div>
    </div>
  );
}

export interface RichTextProps extends FieldProps {
  readonly value: string;
  readonly onChange: (text: string) => void;
  /** Allow Shift+Enter line breaks (address blocks). Enter never adds a paragraph. */
  readonly multiline?: boolean;
}

/** A one-line rich-text field: bold, italic and links. */
export function RichText(props: RichTextProps): ReactElement {
  const [linking, setLinking] = useState(false);
  const editor = useRich(textExtensions, textDoc(props.value), {
    ...props,
    onLinkKey: () => {
      setLinking(true);
    },
    onUpdate: (e) => {
      const text = fromTextDoc(e.getJSON());
      props.onChange(props.multiline ? text : text.replace(/\n/g, " "));
    },
  });
  useSync(
    editor,
    (e) => fromTextDoc(e.getJSON()) !== props.value,
    () => textDoc(props.value),
  );
  return (
    <Frame
      editor={editor}
      list={false}
      linking={linking}
      setLinking={setLinking}
      className="rich-field"
      editRef={props.editRef}
    />
  );
}

export interface BulletsProps extends FieldProps {
  readonly items: readonly { readonly id: string; readonly text: string }[];
  readonly onChange: (texts: string[]) => void;
}

/** A bullet list edited as one rich-text block: Enter for a new bullet, Backspace to merge. */
export function Bullets(props: BulletsProps): ReactElement {
  const [linking, setLinking] = useState(false);
  const texts = props.items.map((i) => i.text);
  const editor = useRich(listExtensions, bulletsDoc(texts), {
    ...props,
    onLinkKey: () => {
      setLinking(true);
    },
    onUpdate: (e) => {
      props.onChange(fromBulletsDoc(e.getJSON()));
    },
  });
  useSync(
    editor,
    (e) => !sameBullets(fromBulletsDoc(e.getJSON()), texts),
    () => bulletsDoc(texts),
  );
  return (
    <Frame
      editor={editor}
      list
      linking={linking}
      setLinking={setLinking}
      className="rich-field rich-list"
      editRef={props.editRef}
      items={props.items.map((i) => i.id).join(" ")}
    >
      <button
        type="button"
        className="add-bullet"
        // Keep focus in the field: blurring it hides the bar, shifting this button out from
        // under the pointer before the click lands.
        onMouseDown={(e) => {
          e.preventDefault();
        }}
        onClick={() => {
          if (editor) appendItem(editor);
        }}
      >
        + Add bullet
      </button>
    </Frame>
  );
}
