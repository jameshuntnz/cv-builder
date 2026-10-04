import { useRef, useState, type ReactElement } from "react";
import { highlight } from "../highlight";

export interface SourceProps {
  readonly value: string;
  readonly onChange: (md: string) => void;
}

/**
 * The CV as plain markdown. Keeps its own text while you type, so half-written
 * lines aren't rewritten under the cursor; mount it with a new `key` to reload.
 */
export function Source({ value, onChange }: SourceProps): ReactElement {
  const [text, setText] = useState(value);
  const overlay = useRef<HTMLPreElement>(null);
  return (
    <div className="source">
      <pre className="source-hl" ref={overlay} aria-hidden="true">
        {highlight(text).map((l, i) => (
          <span key={i} className={`hl hl-${l.kind}`}>
            {l.text}
            {"\n"}
          </span>
        ))}
      </pre>
      <textarea
        aria-label="CV as markdown"
        spellCheck
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value);
        }}
        onScroll={(e) => {
          if (overlay.current) overlay.current.scrollTop = e.currentTarget.scrollTop;
        }}
      />
    </div>
  );
}
