import type { ReactElement } from "react";
import type { CV, Entry, Item, Role, Section } from "../model";
import { typographic } from "../inline";
import { Inline } from "./Inline";
import { EntryHead, Header } from "./parts";

/** Attributes every block puts on its root element: where it came from, and its index when measured. */
export interface BlockAttrs {
  readonly "data-ref": string;
  readonly "data-block"?: number;
}

/** One unbreakable piece of the paper. `keep` glues it to the next block across a page break. */
export interface Block {
  readonly key: string;
  readonly keep: boolean;
  readonly render: (attrs: BlockAttrs) => ReactElement;
}

function bullet(b: Item): Block {
  return {
    key: b.id,
    keep: false,
    render: (attrs) => (
      <ul className="cv-bullet" {...attrs}>
        <li className="cv-lines">
          <Inline text={b.text} />
        </li>
      </ul>
    ),
  };
}

function roleBlock(r: Role, tight: boolean): Block {
  return {
    key: r.id,
    keep: true,
    render: (attrs) => (
      <div className={tight ? "cv-role cv-tight" : "cv-role"} {...attrs}>
        <em className="cv-role-title">
          <Inline text={r.title} />
        </em>
        <em className="cv-right">{typographic(r.dates)}</em>
      </div>
    ),
  };
}

function filled(items: readonly Item[]): Item[] {
  return items.filter((b) => b.text.trim() !== "");
}

function entryBlocks(e: Entry): Block[] {
  const blocks: Block[] = [
    { key: e.id, keep: true, render: (attrs) => <EntryHead e={e} attrs={attrs} /> },
  ];
  blocks.push(...filled(e.bullets).map(bullet));
  e.roles.forEach((r, i) => {
    const prev = e.roles[i - 1];
    blocks.push(roleBlock(r, prev !== undefined && filled(prev.bullets).length === 0));
    blocks.push(...filled(r.bullets).map(bullet));
  });
  return blocks;
}

function sectionBlocks(s: Section): Block[] {
  const blocks: Block[] = [
    {
      key: s.id,
      keep: true,
      render: (attrs) => (
        <h2 className="cv-section" {...attrs}>
          {typographic(s.title)}
        </h2>
      ),
    },
  ];
  for (const p of filled(s.paragraphs)) {
    const lines = p.text.split("\n");
    blocks.push({
      key: p.id,
      keep: false,
      render: (attrs) => (
        <div className="cv-para" {...attrs}>
          <p className="cv-lines">
            {lines.map((l, i) => (
              <span key={i}>
                {i > 0 && <br />}
                <Inline text={l} />
              </span>
            ))}
          </p>
        </div>
      ),
    });
  }
  for (const p of s.pairs.filter((x) => x.key.trim() !== "" || x.value.trim() !== "")) {
    blocks.push({
      key: p.id,
      keep: false,
      render: (attrs) => (
        <div className="cv-pair" {...attrs}>
          <p className="cv-lines">
            <strong>{typographic(p.key)}:</strong> <Inline text={p.value} />
          </p>
        </div>
      ),
    });
  }
  blocks.push(...filled(s.bullets).map(bullet));
  for (const e of s.entries) blocks.push(...entryBlocks(e));
  return blocks;
}

/** The whole CV as blocks, header first. Hidden sections and empty lines are left out. */
export function buildBlocks(cv: CV): Block[] {
  const header: Block = {
    key: "header",
    keep: false,
    render: (attrs) => <Header cv={cv} attrs={attrs} />,
  };
  const body = cv.sections.filter((s) => !s.hidden).flatMap(sectionBlocks);
  // Nothing after the last block to keep it with.
  const last = body.at(-1);
  if (last) body[body.length - 1] = { ...last, keep: false };
  return [header, ...body];
}
