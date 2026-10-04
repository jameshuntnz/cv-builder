// Every source file stays at or under 400 lines, whatever its language.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const MAX = 400;
// Generated or binary: the lockfile, font files and the Typst reference for the VRT.
const SKIP = [/^pnpm-lock\.yaml$/, /^public\/fonts\//, /^e2e\/vrt\/reference\//];

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  encoding: "utf8",
})
  .split("\n")
  .filter((f) => f && !SKIP.some((re) => re.test(f)));

const over = files
  .map((f) => ({ f, n: readFileSync(f, "utf8").split("\n").length }))
  .filter(({ n }) => n > MAX);

for (const { f, n } of over) process.stderr.write(`${f}: ${n} lines (max ${MAX})\n`);
process.exit(over.length > 0 ? 1 : 0);
