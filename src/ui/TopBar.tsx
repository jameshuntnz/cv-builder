import { useRef, useState, type ReactElement } from "react";
import { download, fileBase } from "../files";
import type { CV } from "../model";
import { parse } from "../parse";
import { serialize } from "../serialize";
import { encodeShare } from "../share";
import { isPaper } from "../store";
import { SAMPLE } from "../sample";
import type { WorkspaceApi } from "../workspace";
import type { Env } from "./App";
import { Guide, ShareDialog } from "./dialogs";

/** Where anyone can read exactly what this page runs. */
const SOURCE_URL = "https://github.com/jameshuntnz/cv-builder";

export interface TopBarProps {
  readonly api: WorkspaceApi;
  readonly env: Env;
  readonly cv: CV;
  readonly say: (message: string) => void;
}

function docLabel(md: string, updated: number): string {
  const name = parse(md).name || "Untitled";
  const when = new Date(updated).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return `${name} · ${when}`;
}

/** Document actions: switch, create, delete, import, export, share, layout and print. */
export function TopBar({ api, env, cv, say }: TopBarProps): ReactElement {
  const { ws } = api;
  const fileInput = useRef<HTMLInputElement>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [guide, setGuide] = useState(false);
  const base = fileBase(cv.name);

  return (
    <header className="bar">
      <div className="brand">
        <h1>CV Builder</h1>
        <p>
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
            Source code
          </a>
        </p>
      </div>
      <nav className="actions" aria-label="Document">
        <label className="field inline">
          <span className="field-label">CV</span>
          <select
            aria-label="Open a saved CV"
            value={ws.id}
            onChange={(e) => {
              api.open(e.target.value);
            }}
          >
            {api.docs.map((d) => (
              <option key={d.id} value={d.id}>
                {docLabel(d.md, d.updated)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            api.create(SAMPLE);
            say("Started a new CV from the example.");
          }}
        >
          New
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              env.confirm(`Delete ${cv.name || "this CV"} from this browser? This can't be undone.`)
            )
              api.removeCurrent();
          }}
        >
          Delete
        </button>
        <button type="button" onClick={() => fileInput.current?.click()}>
          Open .md
        </button>
        <input
          ref={fileInput}
          type="file"
          hidden
          aria-label="Markdown file to open"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          onChange={(e) => {
            const file = e.target.files?.item(0);
            e.target.value = "";
            if (!file) return;
            void file.text().then((md) => {
              api.create(md, ws.layout);
              say(`Opened ${file.name} as a new CV.`);
            });
          }}
        />
        <button
          type="button"
          onClick={() => {
            download(`${base}.md`, serialize(cv));
          }}
        >
          Save .md
        </button>
        <button
          type="button"
          onClick={() => {
            void encodeShare({ md: serialize(cv), ...ws.layout }).then((hash) => {
              setShareUrl(env.baseUrl() + hash);
            });
          }}
        >
          Share link
        </button>
        <label className="field inline">
          <span className="field-label">Paper</span>
          <select
            value={ws.layout.paper}
            onChange={(e) => {
              if (isPaper(e.target.value)) api.setLayout({ paper: e.target.value });
            }}
          >
            <option value="a4">A4</option>
            <option value="letter">US Letter</option>
          </select>
        </label>
        <label className="field inline check">
          <input
            type="checkbox"
            checked={ws.layout.compact}
            onChange={(e) => {
              api.setLayout({ compact: e.target.checked });
            }}
          />
          <span>Compact</span>
        </label>
        <button
          type="button"
          onClick={() => {
            setGuide(true);
          }}
        >
          Guide
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => {
            const title = document.title;
            document.title = base;
            env.print();
            document.title = title;
          }}
        >
          Export PDF
        </button>
      </nav>
      {shareUrl !== null && (
        <ShareDialog
          url={shareUrl}
          say={say}
          onClose={() => {
            setShareUrl(null);
          }}
        />
      )}
      {guide && (
        <Guide
          onClose={() => {
            setGuide(false);
          }}
        />
      )}
    </header>
  );
}
