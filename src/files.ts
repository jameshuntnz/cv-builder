/** "Rowan Ellis" → "Rowan-Ellis", safe for a file name. */
export function slug(name: string): string {
  const s = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s === "" ? "Untitled" : s;
}

export function fileBase(name: string): string {
  return `${slug(name)}-CV`;
}

/** Hand the browser a text file to save. */
export function download(filename: string, text: string, type = "text/markdown"): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
