import { useEffect, useRef, type ReactElement, type ReactNode } from "react";

function Modal({
  title,
  onClose,
  children,
}: {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}): ReactElement {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
  }, []);
  return (
    <dialog ref={ref} aria-label={title} onClose={onClose}>
      <h2>{title}</h2>
      {children}
      <form method="dialog">
        <button type="submit" onClick={onClose}>
          Close
        </button>
      </form>
    </dialog>
  );
}

export function ShareDialog({
  url,
  say,
  onClose,
}: {
  readonly url: string;
  readonly say: (message: string) => void;
  readonly onClose: () => void;
}): ReactElement {
  const input = useRef<HTMLInputElement>(null);
  return (
    <Modal title="Share link" onClose={onClose}>
      <p>
        The whole CV is packed into this link. Open it on another device to carry on there, or send
        it to someone to read. It sits after the <code>#</code>, the part of a web address browsers
        never send to a server, so this site never sees it.
      </p>
      <p className="warning">Anyone with the link can read the CV. Treat it like the document.</p>
      <div className="share-row">
        <input
          ref={input}
          readOnly
          value={url}
          aria-label="Share link"
          onFocus={(e) => {
            e.target.select();
          }}
        />
        <button
          type="button"
          className="primary"
          onClick={() => {
            navigator.clipboard.writeText(url).then(
              () => {
                say("Link copied.");
              },
              () => {
                input.current?.select();
                say("Couldn't copy automatically. The link is selected; copy it from there.");
              },
            );
          }}
        >
          Copy
        </button>
      </div>
      <p className="muted">{`${String(url.length)} characters.`}</p>
    </Modal>
  );
}

export function Guide({ onClose }: { readonly onClose: () => void }): ReactElement {
  return (
    <Modal title="Guide" onClose={onClose}>
      <ul className="guide">
        <li>
          Drag sections in the left column to reorder them. Hide a section to keep it without
          printing it.
        </li>
        <li>
          Drag entries and skill categories by their ⋮⋮ handle. Click an entry's line to open or
          close it.
        </li>
        <li>
          Click into any text to get its formatting bar: bold, italic, link, and for bullets, move
          up, move down and remove.
        </li>
        <li>
          In a bullet list, Enter starts a new bullet and Backspace at the start of one joins it to
          the one above. ⌘B bold, ⌘I italic, ⌘K link. ⌘Z undoes anything.
        </li>
        <li>Click anything on the paper to jump to it in the editor.</li>
        <li>
          Need more room? Hide the sections panel or the paper from their title rows, and click the
          strip left at the edge to bring one back. Drag the line between editor and paper to
          resize.
        </li>
        <li>
          Stack roles under one employer for a promotion. A role with no bullets sits tight under
          the next one, so they read as one block.
        </li>
        <li>
          Prefer plain text? The Markdown view shows the whole CV as text. Save .md and Open .md
          move it in and out.
        </li>
        <li>
          Export PDF opens the print dialog: choose Save as PDF, keep margins on Default, and turn
          headers and footers off.
        </li>
        <li>
          Your CVs are saved in this browser only. Clearing site data deletes them, so keep a .md or
          a share link somewhere safe.
        </li>
      </ul>
    </Modal>
  );
}
