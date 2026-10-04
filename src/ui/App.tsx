import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { EditorBar } from "../editor/EditorBar";
import { FoldContext, foldsFrom } from "../editor/folds";
import { HeaderCard } from "../editor/HeaderCard";
import { Outline } from "../editor/Outline";
import { SectionCard } from "../editor/SectionCard";
import { Source } from "../editor/Source";
import { lint } from "../lint";
import type { Pages } from "../paginate";
import { Paper } from "../paper/Paper";
import { StylePanel } from "../style/StylePanel";
import { parse } from "../parse";
import { serialize } from "../serialize";
import { MemoryStorage, type DocStore, type KeyValue } from "../store";
import { useWorkspace } from "../workspace";
import { focusRef } from "./focus";
import { useFontsVersion, useUndoKeys, useWidth, type FontsLike } from "./hooks";
import { Notes } from "./Notes";
import { clampWidth, MIN_PAPER, usePanes } from "./panes";
import { HidePanel, Rail } from "./Rail";
import { Splitter } from "./Splitter";
import { TopBar } from "./TopBar";

/** Browser features the app reaches for, passed in so tests can stand in for them. */
export interface Env {
  readonly confirm: (message: string) => boolean;
  readonly print: () => void;
  readonly hash: () => string;
  readonly clearHash: () => void;
  readonly baseUrl: () => string;
  readonly fonts?: FontsLike;
}

type View = "visual" | "style" | "source";
const MOBILE_VIEWS: readonly ("edit" | "paper")[] = ["edit", "paper"];

const fallbackPrefs = new MemoryStorage();
const MM = 96 / 25.4;
const PAGE_WIDTH = { a4: 210 * MM, letter: 215.9 * MM };

export interface AppProps {
  readonly store: DocStore;
  readonly env: Env;
  /** Where pane sizes are remembered; per-browser, never part of a CV. */
  readonly prefs?: KeyValue;
}

export function App({ store, env, prefs }: AppProps): ReactElement {
  const api = useWorkspace(store);
  const { ws } = api;
  const cv = ws.history.present;
  const [view, setView] = useState<View>("visual");
  const [mobile, setMobile] = useState<"edit" | "paper">("edit");
  const [openFolds, setOpenFolds] = useState<Readonly<Record<string, boolean>>>({});
  const [pages, setPages] = useState<Pages>({ pages: [[]], overflowing: 0 });
  const [toast, setToast] = useState("");
  const pendingFocus = useRef<string | null>(null);
  const [, setTick] = useState(0);
  const paperPane = useRef<HTMLDivElement>(null);
  const workspace = useRef<HTMLElement>(null);
  const paperSection = useRef<HTMLElement>(null);
  const [panes, setPanes] = usePanes(prefs ?? fallbackPrefs);
  // Custom properties can't go through React's style prop without a cast, so set it here.
  useEffect(() => {
    const el = workspace.current;
    if (!el) return;
    if (panes.paperWidth === null) el.style.removeProperty("--paper-width");
    else el.style.setProperty("--paper-width", `${String(panes.paperWidth)}px`);
  }, [panes.paperWidth]);
  const fontsVersion = useFontsVersion(env.fonts);
  const paneWidth = useWidth(paperPane);
  const notes = useMemo(() => lint(cv), [cv]);
  useUndoKeys(api.undo, api.redo);

  const say = useCallback((message: string) => {
    setToast(message);
  }, []);
  useEffect(() => {
    if (toast === "") return;
    const t = setTimeout(() => {
      setToast("");
    }, 4000);
    return () => {
      clearTimeout(t);
    };
  }, [toast]);

  // Read share links on load and on hash change only, not on every edit.
  const openShared = useRef(api.openShared);
  useEffect(() => {
    openShared.current = api.openShared;
  });
  useEffect(() => {
    const load = (): void => {
      void openShared.current(env.hash()).then((message) => {
        if (message === undefined) return;
        env.clearHash();
        say(message);
      });
    };
    load();
    window.addEventListener("hashchange", load);
    return () => {
      window.removeEventListener("hashchange", load);
    };
  }, [env, say]);

  // After a render that a jump asked for, focus the field it was looking for.
  useEffect(() => {
    if (pendingFocus.current === null) return;
    focusRef(document, pendingFocus.current);
    pendingFocus.current = null;
  });

  const select = (ref: string): void => {
    pendingFocus.current = ref;
    setView("visual");
    setMobile("edit");
    setTick((t) => t + 1);
  };

  const folds = useMemo(
    () =>
      foldsFrom(openFolds, (id, open) => {
        setOpenFolds((f) => ({ ...f, [id]: open }));
      }),
    [openFolds],
  );
  const foldAll = (open: boolean): void => {
    const ids = ["header", ...cv.sections.flatMap((s) => [s.id, ...s.entries.map((e) => e.id)])];
    setOpenFolds(Object.fromEntries(ids.map((id) => [id, open])));
  };

  const zoom = paneWidth > 0 ? Math.min(1, (paneWidth - 32) / PAGE_WIDTH[ws.layout.paper]) : 1;
  const pageCount = pages.pages.length;

  return (
    <FoldContext.Provider value={folds}>
      <TopBar api={api} env={env} cv={cv} say={say} />
      <div className="tabs" role="tablist" aria-label="View">
        {MOBILE_VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={mobile === v}
            onClick={() => {
              setMobile(v);
            }}
          >
            {v === "edit" ? "Edit" : "Paper"}
          </button>
        ))}
      </div>
      <main
        className="workspace"
        ref={workspace}
        data-view={mobile}
        data-outline={panes.outlineShown ? "shown" : "hidden"}
        data-paper={panes.paperShown ? "shown" : "hidden"}
      >
        {panes.outlineShown ? (
          <Outline
            cv={cv}
            dispatch={api.dispatch}
            onJump={(id) => {
              select(id);
            }}
            onHide={() => {
              setPanes({ outlineShown: false });
            }}
          />
        ) : (
          <Rail
            side="left"
            label="Show sections"
            onShow={() => {
              setPanes({ outlineShown: true });
            }}
          />
        )}
        <section className="pane editor-pane" aria-label="Editor">
          <div className="editor-head">
            <div className="segmented" role="tablist" aria-label="Editor view">
              <button
                type="button"
                role="tab"
                aria-selected={view === "visual"}
                onClick={() => {
                  setView("visual");
                }}
              >
                Visual
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "style"}
                onClick={() => {
                  setView("style");
                }}
              >
                Style
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "source"}
                onClick={() => {
                  setView("source");
                }}
              >
                Markdown
              </button>
            </div>
            <EditorBar
              {...(view === "visual" ? { onFoldAll: foldAll } : {})}
              canUndo={ws.history.past.length > 0}
              canRedo={ws.history.future.length > 0}
              onUndo={api.undo}
              onRedo={api.redo}
            />
          </div>
          <Notes
            notes={notes}
            onSelect={(ref) => {
              if (ref === undefined) setView("source");
              else select(ref);
            }}
          />
          <div className="editor-scroll">
            {view === "visual" ? (
              <div className="cards" key={`${ws.id}:${String(ws.revision)}`}>
                <HeaderCard cv={cv} dispatch={api.dispatch} />
                {cv.sections.map((s) => (
                  <SectionCard
                    key={s.id}
                    section={s}
                    dispatch={api.dispatch}
                    confirm={env.confirm}
                  />
                ))}
              </div>
            ) : view === "style" ? (
              <StylePanel style={cv.style} dispatch={api.dispatch} />
            ) : (
              <Source
                key={`${ws.id}:${String(ws.revision)}`}
                value={serialize(cv)}
                onChange={(md) => {
                  api.dispatch({ type: "replace", cv: parse(md) });
                }}
              />
            )}
          </div>
        </section>
        <Splitter
          value={panes.paperWidth ?? paneWidth + 32}
          min={MIN_PAPER}
          max={clampWidth(Number.MAX_SAFE_INTEGER, window.innerWidth)}
          measure={() => paperSection.current?.getBoundingClientRect().width ?? MIN_PAPER}
          onResize={(width) => {
            setPanes({ paperWidth: clampWidth(width, window.innerWidth) });
          }}
          onReset={() => {
            setPanes({ paperWidth: null });
          }}
        />
        <section className="pane paper-pane" aria-label="Paper" ref={paperSection}>
          <div className="pane-head">
            <h2 className="pane-title">
              Paper{" "}
              <span className="muted">{`${String(pageCount)} page${pageCount === 1 ? "" : "s"}`}</span>
            </h2>
            <HidePanel
              label="Hide the paper preview"
              onHide={() => {
                setPanes({ paperShown: false });
              }}
            />
          </div>
          {pages.overflowing > 0 && (
            <p className="warning">Something is taller than a whole page and will be cut off.</p>
          )}
          {/* Focusable so the pages can be scrolled from the keyboard. */}
          <div
            className="paper-scroll"
            ref={paperPane}
            tabIndex={0}
            role="region"
            aria-label="Pages"
          >
            <Paper
              cv={cv}
              layout={ws.layout}
              fontsVersion={fontsVersion}
              zoom={zoom}
              onPages={setPages}
              onSelect={select}
            />
          </div>
        </section>
        {!panes.paperShown && (
          <Rail
            side="right"
            label="Show paper"
            onShow={() => {
              setPanes({ paperShown: true });
            }}
          />
        )}
      </main>
      <div className={toast ? "toast show" : "toast"} role="status" aria-live="polite">
        {toast}
      </div>
    </FoldContext.Provider>
  );
}
