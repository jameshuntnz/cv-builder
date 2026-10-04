import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { record, redo, start, undo, type History } from "./history";
import type { Layout } from "./model";
import type { Action } from "./ops";
import { parse } from "./parse";
import { SAMPLE } from "./sample";
import { serialize } from "./serialize";
import { decodeShare } from "./share";
import { newId, type Doc, type DocStore } from "./store";

/** The open CV: which stored doc it is, its layout, and its edit history. */
export interface Workspace {
  readonly id: string;
  readonly layout: Layout;
  readonly history: History;
  /** Bumped whenever the CV is replaced wholesale, so views holding their own text reload. */
  readonly revision: number;
}

export type Msg =
  | { readonly type: "edit"; readonly action: Action; readonly now: number }
  | { readonly type: "undo" }
  | { readonly type: "redo" }
  | { readonly type: "open"; readonly doc: Doc }
  | { readonly type: "layout"; readonly layout: Partial<Layout> };

export function fromDoc(doc: Doc): Workspace {
  return {
    id: doc.id,
    layout: { paper: doc.paper, compact: doc.compact },
    history: start(parse(doc.md)),
    revision: 0,
  };
}

export function reduce(ws: Workspace, msg: Msg): Workspace {
  switch (msg.type) {
    case "edit": {
      const history = record(ws.history, msg.action, msg.now);
      return history === ws.history ? ws : { ...ws, history };
    }
    case "undo":
    case "redo": {
      const history = msg.type === "undo" ? undo(ws.history) : redo(ws.history);
      return history === ws.history ? ws : { ...ws, history, revision: ws.revision + 1 };
    }
    case "open":
      return { ...fromDoc(msg.doc), revision: ws.revision + 1 };
    case "layout":
      return { ...ws, layout: { ...ws.layout, ...msg.layout } };
  }
}

export function toDoc(ws: Workspace): Omit<Doc, "updated"> {
  return { id: ws.id, md: serialize(ws.history.present), ...ws.layout };
}

/** The doc to open first: the last one used, else the newest, else a fresh sample. */
export function initialDoc(store: DocStore): Doc {
  const active = store.activeId();
  const doc = (active !== null && active !== "" ? store.get(active) : undefined) ?? store.list()[0];
  return doc ?? store.save({ id: newId(), md: SAMPLE, paper: "a4", compact: false });
}

export interface WorkspaceApi {
  readonly ws: Workspace;
  readonly docs: readonly Doc[];
  readonly dispatch: (action: Action) => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly setLayout: (layout: Partial<Layout>) => void;
  readonly open: (id: string) => void;
  readonly create: (md: string, layout?: Layout) => void;
  readonly removeCurrent: () => void;
  /** Open a `#cv=` share hash; resolves to a message for the user, or undefined if there was none. */
  readonly openShared: (hash: string) => Promise<string | undefined>;
}

/** Workspace state, saved to the store shortly after every change. */
export function useWorkspace(store: DocStore, saveDelay = 300): WorkspaceApi {
  const [ws, send] = useReducer(reduce, store, (s) => fromDoc(initialDoc(s)));
  const [docs, setDocs] = useState(() => store.list());
  const latest = useRef(ws);

  useEffect(() => {
    latest.current = ws;
    store.setActive(ws.id);
    const timer = setTimeout(() => {
      store.save(toDoc(ws));
      setDocs(store.list());
    }, saveDelay);
    return () => {
      clearTimeout(timer);
    };
  }, [ws, store, saveDelay]);

  const flush = useCallback(() => {
    store.save(toDoc(latest.current));
  }, [store]);

  const open = useCallback(
    (id: string) => {
      flush();
      const doc = store.get(id);
      if (doc) send({ type: "open", doc });
      setDocs(store.list());
    },
    [store, flush],
  );

  const create = useCallback(
    (md: string, layout: Layout = { paper: "a4", compact: false }) => {
      flush();
      send({ type: "open", doc: store.save({ id: newId(), md, ...layout }) });
      setDocs(store.list());
    },
    [store, flush],
  );

  return useMemo(
    () => ({
      ws,
      docs,
      dispatch: (action: Action) => {
        send({ type: "edit", action, now: Date.now() });
      },
      undo: () => {
        send({ type: "undo" });
      },
      redo: () => {
        send({ type: "redo" });
      },
      setLayout: (layout: Partial<Layout>) => {
        send({ type: "layout", layout });
      },
      open,
      create,
      removeCurrent: () => {
        store.remove(ws.id);
        const next =
          store.list()[0] ?? store.save({ id: newId(), md: SAMPLE, paper: "a4", compact: false });
        send({ type: "open", doc: next });
        setDocs(store.list());
      },
      openShared: async (hash: string) => {
        const shared = await decodeShare(hash);
        if (!shared)
          return hash.startsWith("#cv=") ? "That share link is damaged or incomplete." : undefined;
        const same = store.list().find((d) => d.md === shared.md);
        if (same) {
          open(same.id);
          return "That CV is already saved here, so it was opened.";
        }
        create(shared.md, { paper: shared.paper, compact: shared.compact });
        return "Opened the shared CV and saved it in this browser.";
      },
    }),
    [ws, docs, store, open, create],
  );
}
