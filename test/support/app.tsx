import { Editor } from "@tiptap/core";
import { fireEvent, render, screen, within, type RenderResult } from "@testing-library/react";
import { vi, type Mock } from "vitest";
import { DocStore, MemoryStorage, type KeyValue } from "../../src/store";
import { App, type Env } from "../../src/ui/App";

export interface Harness extends RenderResult {
  readonly store: DocStore;
  readonly confirm: Mock<(message: string) => boolean>;
}

export function renderApp(
  overrides: Partial<Env> = {},
  store = new DocStore(new MemoryStorage()),
  prefs: KeyValue = new MemoryStorage(),
): Harness {
  const confirm = vi.fn<(message: string) => boolean>(() => true);
  const env: Env = {
    confirm,
    print: vi.fn(),
    hash: () => "",
    clearHash: vi.fn(),
    baseUrl: () => "https://cv.example/",
    ...overrides,
  };
  return { ...render(<App store={store} env={env} prefs={prefs} />), store, confirm };
}

/** The first page of paper. */
export function paper(): HTMLElement {
  const page = screen.getAllByRole("region", { name: /^Page 1$/ })[0];
  if (!page) throw new Error("no paper");
  return page;
}

export function section(name: string): HTMLElement {
  return screen.getByRole("region", { name });
}

/** The TipTap editor behind a rich-text field, found by its accessible name. */
export function richEditor(name: string | RegExp, root: HTMLElement = document.body): Editor {
  const el = within(root).getAllByRole("textbox", { name })[0];
  if (el && "editor" in el && el.editor instanceof Editor) return el.editor;
  throw new Error(`no rich editor for ${String(name)}`);
}

/** Open a collapsed section or entry by its name. */
export function expand(name: string): void {
  const toggle = screen.queryByRole("button", { name: `Expand ${name}` });
  if (toggle) fireEvent.click(toggle);
}

/** The field wrapper (editor, its formatting bar, "+ Add bullet") around a rich editor. */
export function fieldOf(editor: Editor): HTMLElement {
  const field = editor.view.dom.closest<HTMLElement>(".rich-field");
  if (!field) throw new Error("no field");
  return field;
}

/** Choose an item from a "⋯" or "+" menu. */
export function choose(
  menu: string | RegExp,
  item: string | RegExp,
  root: HTMLElement = document.body,
): void {
  fireEvent.click(within(root).getByRole("button", { name: menu }));
  fireEvent.click(within(root).getByRole("menuitem", { name: item }));
}

/** Every bullet on the example CV's paper, top to bottom. */
export const SAMPLE_BULLETS = [
  "Rebuilt the plant identification screen so it works offline in greenhouses with no signal.",
  "Cut the app’s download size in half by loading plant photos only when they’re opened.",
  "Ran fortnightly usability sessions with customers in store.",
  "Added watering reminders, now the app’s most used feature.",
  "Made every screen work with VoiceOver and large text sizes.",
  "Wrote the level editor the designers used for three released games.",
  "Fixed dropped frames on older phones by redrawing only the parts of the board that changed.",
  "Drew the chart from a public star catalogue and kept it smooth while the phone moves.",
  "BSc Interaction Design, Example University, 2018",
];

/** The paper's bullets, top to bottom. */
export function paperBullets(): string[] {
  return [...document.querySelectorAll(".pages .cv-bullet li")].map((li) => li.textContent);
}

function texts(selector: string): string[] {
  return [...document.querySelectorAll(`.pages ${selector}`)].map((el) => el.textContent);
}

/** The printed parts of the CV, each as the full text of every element, in order. */
export const printed = {
  name: (): string[] => texts(".cv-name"),
  headline: (): string[] => texts(".cv-headline"),
  contact: (): string[] => texts(".cv-contact"),
  extras: (): string[] => texts(".cv-extra"),
  sections: (): string[] => texts(".cv-section"),
  entries: (): string[] => texts(".cv-entry .cv-row"),
  blurbs: (): string[] => texts(".cv-blurb"),
  roles: (): string[] => texts(".cv-role"),
  bullets: (): string[] => texts(".cv-bullet li"),
  pairs: (): string[] => texts(".cv-pair"),
  paragraphs: (): string[] => texts(".cv-para"),
  /** Every link on the paper as [text, href]. */
  links: (): [string, string][] =>
    [...document.querySelectorAll(".pages a")].map((a) => [
      a.textContent,
      a.getAttribute("href") ?? "",
    ]),
};

/** The example's bullets with `edit` applied to a copy. */
export function bulletsWith(edit: (list: string[]) => void): string[] {
  const list = [...SAMPLE_BULLETS];
  edit(list);
  return list;
}
