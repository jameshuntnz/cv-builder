# CV Builder

Write a CV, see it on paper as you type, and export a clean PDF. It runs entirely in
your browser: no account, no server, no database, no analytics.

## What it does

- **Visual editor.** Header, sections, entries, roles and bullets as fields. Sections and
  entries collapse to a single line (Expand all / Collapse all), so a long CV stays easy to
  scan.
- **Formatting on each field.** Click into a field and its own bar appears underneath:
  Bold, Italic, Link, and for bullet lists, Move up, Move down and Remove. Shortcuts work
  too (⌘B, ⌘I, ⌘K, Alt+↑/↓), but nothing depends on them.
- **Sections you control.** Drag to reorder sections, entries and skill categories (or use
  the keyboard: focus a handle, Space, arrows, Space). Hide a section to keep it without
  printing it. Each section offers the add button that fits it: Employer, Entry, Category
  or Paragraph, with everything else in its ⋯ menu.
- **Skills as chips.** Each category is a row of chips: type a skill and press Enter or a
  comma, × to remove, Backspace to take the last one back. Commas inside brackets stay
  with their skill, so "AWS (Lambda, S3)" is one.
- **Paper preview that is the PDF.** Pages are laid out at their real size (A4 or US
  Letter) and split between blocks, so an employer heading never ends up alone at the
  bottom of a page. Page 2 onward carries the name and page number. Click anything on the
  paper to jump to it in the editor.
- **Panes your way.** Hide the Sections panel or the paper, and drag the divider (or use
  the arrow keys on it) to give the editor or the paper more room. Double-click resets it.
- **Export to PDF** through the browser's print dialog: real text, embedded fonts, links
  that work, and a reading order an applicant tracking system can parse.
- **Markdown underneath.** The Markdown view shows the whole CV as plain text in a small,
  documented format (see the Guide in the app). Save .md and Open .md move it in and out.
- **Styles, saved with the CV.** The Style tab sets the typeface, size, line spacing,
  margins, colours, heading rule and bullet marker for the page, and the typeface, size,
  weight, italics, colour, letter case and spacing of each part (name, headline, contact
  line, section headings, employers, descriptions, job titles, dates, bullets, body text).
  Start from Classic, Modern or Minimal. Styles are stored in the CV itself, so share
  links, `.md` files and undo all carry them. Colours that would be hard to read get a
  warning.
- **Writing notes, at the top.** Long bullets, "-ing" openers, first-person pronouns,
  bold in bullets and repeated opening verbs are listed above the editor; each note jumps
  to its line.
- **Undo and redo** for everything, including structural changes.

## Where your data lives

Every CV is kept in this browser's `localStorage` and nowhere else (pane sizes too). Clearing site data
deletes it, so keep a `.md` export or a share link somewhere safe.

**Share links** carry the whole CV, compressed, after the `#` in the address. Browsers
never send that part of a URL to a server, so the host never sees it. Opening a share
link on another device saves a copy there. Anyone holding the link can read the CV.

The site sends a strict Content-Security-Policy (`public/_headers`): scripts, fonts and
data only from its own origin, no third-party requests.

## Develop

Requires Node 24+ and pnpm.

```bash
pnpm install
pnpm dev
```

```bash
pnpm check
```

`pnpm check` runs everything CI runs: type-check, lint, format check, unit tests with
coverage, a production build, and the end-to-end suite.

### Testing

- **Unit and component tests** (Vitest, Testing Library, jsdom): `pnpm coverage`.
- **End-to-end tests** (Playwright, against the production build): `pnpm e2e`. Every
  journey runs on desktop in light and in dark mode, and on a phone. Exports are checked
  as real PDFs: page count, paper size and embedded fonts. Any request that leaves the
  app's origin fails the test, as does any error the page logs.
- **Accessibility on every page state.** `e2e/a11y` reimplements Deque's axe Watcher
  for Playwright: a script in the page rescans with axe after each burst of DOM changes,
  so the menu a click opened, the dialog, the field being edited are all checked without
  the test asking. The gate is WCAG 2.2 A and AA at any impact, and there is no list of
  tolerated issues: a violation fails the test. A run-wide summary is written to
  `a11y-report/report.txt`.
- **Visual regression against Typst** (macOS only): `pnpm vrt`. `e2e/vrt/fixture.md` is
  typeset by the reference Typst template (`e2e/vrt/template.typ`) and by the app, and
  the two PDFs are compared word by word: same words on the same lines and pages, each
  line within a point of the reference. Both sides use Apple's Charter, which is why it
  runs on macOS, with poppler (`brew install poppler`) to draw both PDFs for the pixel
  comparison. After changing the template or the fixture, regenerate the reference
  with `pnpm vrt:reference` (needs `typst`).
- **Exact assertions only.** Tests compare whole texts, whole lists and whole objects on
  specific elements. Lint rejects prefix, substring, pattern and partial-object matchers
  (`toMatch`, `toContain`, `toHaveTextContent`, `objectContaining`, `expect.any`, …) in
  test files.

### Rules the checks enforce

- TypeScript `strict`, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- ESLint `strict-type-checked`. No type assertions of any kind (`as`, `as const`,
  `<T>x`): narrow with a type guard. Inline `eslint-disable` comments are switched off
  and reported, so the config is the only place rules can change.
- No file over 400 lines, whatever its language (`scripts/check-lines.mjs`).
- Coverage thresholds: 100% of lines and functions, 99.5% of statements, 98% of
  branches.
- Every spec imports `test` from `e2e/test.ts`, so accessibility scanning and the
  network guard can't be skipped by accident.
- Prettier formatting.

### Layout

```
src/
  model.ts, parse.ts, serialize.ts   the CV shape, and markdown in and out
  ops.ts, history.ts, workspace.ts   edits, undo, and the open document
  inline.ts, lint.ts, highlight.ts   inline formatting, writing notes, source colouring
  paginate.ts                        pure page assignment from measured block positions
  share.ts, store.ts, files.ts       share links, browser storage, downloads
  paper/                             the CV as printed: blocks, paging, links
  editor/                            visual editor, rich text, drag and drop, toolbar
  ui/                                app shell, top bar, dialogs, notes
  styles/                            app chrome, editor, the CV page, print
  style/                             the CV's look: settings, presets, CSS variables, panel
test/                                Vitest + Testing Library, jsdom
e2e/                                 Playwright journeys; e2e/a11y is the axe watcher
```

## Deploy (Cloudflare Pages)

`wrangler.toml` describes the site: a static build in `dist`, no Functions. Headers
(Content Security Policy, caching) are in `public/_headers`. Connect the repository in
Cloudflare Pages with:

| Setting          | Value                                    |
| ---------------- | ---------------------------------------- |
| Build command    | `pnpm build`                             |
| Output directory | `dist`                                   |
| Node version     | 24 (`NODE_VERSION` environment variable) |

Or build locally and upload with Wrangler (`pnpm dlx wrangler login` first):

```bash
pnpm run deploy
```

## Credits

The CV is set in Charter: Apple's system copy where there is one, otherwise
[XCharter](https://ctan.org/pkg/xcharter), the free extension of Bitstream Charter
(`public/fonts/LICENSE-XCharter.txt`). Other typefaces: [Charis SIL](https://software.sil.org/charis/)
and [Source Sans 3](https://github.com/adobe-fonts/source-sans), both under the SIL Open
Font License (`public/fonts/OFL-*.txt`). The page layout follows the widely used LaTeX
résumé style: one serif face, black ink, bold section headings over a hairline rule,
employer in bold and role in italics with dates flush right.

## Licence

MIT. See `LICENSE`.
