/**
 * A skills line is a comma-separated list. Commas inside brackets belong to the item,
 * so "AWS (Lambda, S3), Docker" is two skills.
 */
export function splitList(value: string): string[] {
  const { done, rest } = takeItems(value);
  return [...done, rest].map((s) => s.trim()).filter((s) => s !== "");
}

/**
 * Split typed text into the items its top-level commas have finished, and the
 * unfinished text after the last one.
 */
export function takeItems(value: string): { done: string[]; rest: string } {
  const done: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(" || ch === "[") depth += 1;
    if ((ch === ")" || ch === "]") && depth > 0) depth -= 1;
    if (ch === "," && depth === 0) {
      done.push(current.trim());
      current = "";
    } else current += ch;
  }
  return { done: done.filter((s) => s !== ""), rest: current };
}

export function joinList(items: readonly string[]): string {
  return items
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .join(", ");
}
