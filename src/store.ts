import type { Paper } from "./model";

/** One CV as stored in this browser. */
export interface Doc {
  readonly id: string;
  readonly md: string;
  readonly paper: Paper;
  readonly compact: boolean;
  readonly updated: number;
}

const DOCS_KEY = "cv-builder:docs";
const ACTIVE_KEY = "cv-builder:active";

export function isPaper(x: unknown): x is Paper {
  return x === "a4" || x === "letter";
}

export function isDoc(x: unknown): x is Doc {
  return (
    typeof x === "object" &&
    x !== null &&
    "id" in x &&
    typeof x.id === "string" &&
    "md" in x &&
    typeof x.md === "string" &&
    "paper" in x &&
    isPaper(x.paper) &&
    "compact" in x &&
    typeof x.compact === "boolean" &&
    "updated" in x &&
    typeof x.updated === "number"
  );
}

export function parseDocs(json: string | null): Doc[] {
  if (json === null) return [];
  try {
    const data: unknown = JSON.parse(json);
    return Array.isArray(data) ? data.filter(isDoc) : [];
  } catch {
    return [];
  }
}

/** Map-backed stand-in when the browser refuses storage (private windows, blocked sites). */
export class MemoryStorage {
  private readonly items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

export type KeyValue = Pick<Storage, "getItem" | "setItem">;

export function browserStorage(get: () => Storage = () => window.localStorage): KeyValue {
  try {
    const s = get();
    s.setItem("cv-builder:probe", "1");
    return s;
  } catch {
    return new MemoryStorage();
  }
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Every CV in this browser, newest first. Writes are best-effort: a full disk never throws. */
export class DocStore {
  constructor(
    private readonly storage: KeyValue,
    private readonly now: () => number = Date.now,
  ) {}

  list(): Doc[] {
    return parseDocs(this.storage.getItem(DOCS_KEY)).sort((a, b) => b.updated - a.updated);
  }

  get(id: string): Doc | undefined {
    return this.list().find((d) => d.id === id);
  }

  /** Insert or replace by id, stamping the update time. Returns the stored doc. */
  save(doc: Omit<Doc, "updated">): Doc {
    const stored: Doc = { ...doc, updated: this.now() };
    this.write([stored, ...this.list().filter((d) => d.id !== doc.id)]);
    return stored;
  }

  remove(id: string): void {
    this.write(this.list().filter((d) => d.id !== id));
  }

  /** The CV that was open last, if any. */
  activeId(): string | null {
    return this.storage.getItem(ACTIVE_KEY);
  }

  setActive(id: string): void {
    this.trySet(ACTIVE_KEY, id);
  }

  private write(docs: readonly Doc[]): void {
    this.trySet(DOCS_KEY, JSON.stringify(docs));
  }

  private trySet(key: string, value: string): void {
    try {
      this.storage.setItem(key, value);
    } catch {
      // Quota exceeded: the editor keeps working on what it has in memory.
    }
  }
}
