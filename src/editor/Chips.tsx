import { useState, type ReactElement } from "react";
import { plain } from "../inline";
import { joinList, splitList, takeItems } from "../skills";

export interface ChipsProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

/**
 * A comma-separated list edited as chips. Enter or a comma adds what's typed, × removes
 * one, and Backspace in the empty box takes the last one back out to edit.
 */
export function Chips({ label, value, onChange }: ChipsProps): ReactElement {
  const items = splitList(value);
  const [draft, setDraft] = useState("");
  const add = (text: string): void => {
    const added = splitList(text);
    if (added.length > 0) onChange(joinList([...items, ...added]));
    setDraft("");
  };
  return (
    <div className="chips">
      <ul aria-label={label}>
        {items.map((item, i) => (
          <li key={`${String(i)}:${item}`} className="chip">
            <span>{plain(item)}</span>
            <button
              type="button"
              aria-label={`Remove ${plain(item)}`}
              onClick={() => {
                onChange(joinList(items.filter((_, j) => j !== i)));
              }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <input
        aria-label={`Add to ${label}`}
        placeholder={items.length === 0 ? "Type a skill, then Enter" : "Add…"}
        value={draft}
        onChange={(e) => {
          // A typed or pasted comma finishes an item; keep typing whatever follows.
          const { done, rest } = takeItems(e.target.value);
          if (done.length > 0) onChange(joinList([...items, ...done]));
          setDraft(done.length > 0 ? rest.trimStart() : rest);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && draft === "" && items.length > 0) {
            e.preventDefault();
            setDraft(items.at(-1) ?? "");
            onChange(joinList(items.slice(0, -1)));
          }
        }}
        onBlur={() => {
          add(draft);
        }}
      />
    </div>
  );
}
