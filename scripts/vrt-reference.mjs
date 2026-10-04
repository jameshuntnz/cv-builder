// Regenerates the visual regression reference: e2e/vrt/fixture.md typeset by Typst with
// e2e/vrt/template.typ, as e2e/vrt/reference/fixture.{typ,pdf}.
//
// Run on a Mac: the template sets Charter, and the reference must come from Apple's Charter,
// the font real CVs from this template use. Elsewhere Typst would fall back silently.
import { execFileSync } from "node:child_process";
import { readdirSync, rmSync, writeFileSync } from "node:fs";

const fail = (message) => {
  process.stderr.write(`${message}\n`);
  process.exit(1);
};

if (process.platform !== "darwin")
  fail("Generate the reference on macOS, where Typst has Apple's Charter.");
const fonts = execFileSync("typst", ["fonts"], { encoding: "utf8" });
if (!/^Charter$/m.test(fonts)) fail("Typst can't see the Charter font.");

const dir = "e2e/vrt/reference";
for (const f of readdirSync(dir)) if (/^fixture/.test(f)) rmSync(`${dir}/${f}`);
const typ = execFileSync(
  "pnpm",
  ["exec", "tsx", "scripts/to-typst.ts", "e2e/vrt/fixture.md", "../template.typ"],
  {
    encoding: "utf8",
  },
);
writeFileSync(`${dir}/fixture.typ`, typ);
execFileSync(
  "typst",
  ["compile", "--root", "e2e/vrt", `${dir}/fixture.typ`, `${dir}/fixture.pdf`],
  { stdio: "inherit" },
);
process.stdout.write(`Reference written: ${readdirSync(dir).join(", ")}\n`);
