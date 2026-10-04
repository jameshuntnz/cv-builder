/** A node with its generated ids and source line numbers removed, so whole objects compare. */
export function shape(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (key: string, v: unknown) =>
      key === "id" || key === "line" ? undefined : v,
    ),
  );
}
