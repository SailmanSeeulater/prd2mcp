import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { generateSpec } from "../src/spec/spec-agent.ts";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/spec-from-prd.ts <prd.md>");
  process.exit(2);
}
const id = basename(file).replace(/\.md$/, "");
const outDir = resolve("runs/_scratch");
mkdirSync(outDir, { recursive: true });

const r = await generateSpec(readFileSync(file, "utf8"));
const usd = `$${r.costUsd.toFixed(4)}`;
console.log(`PRD:     ${file}`);
if (r.ok) {
  const path = resolve(outDir, `${id}.spec.json`);
  writeFileSync(path, JSON.stringify(r.spec, null, 2));
  console.log(`Result:  VALID   attempts=${r.attempts}  cost=${usd}  tokens in=${r.inputTokens} out=${r.outputTokens}`);
  console.log(`Tools:   ${r.spec.tools.map((t) => t.name).join(", ") || "(none)"}`);
  console.log(`Open questions: ${r.spec.openQuestions.length}`);
  for (const q of r.spec.openQuestions) console.log(`  - ${q}`);
  console.log(`Assumptions: ${r.spec.assumptions.length}`);
  for (const a of r.spec.assumptions) console.log(`  * ${a}`);
  console.log(`Saved:   ${path}`);
} else {
  const path = resolve(outDir, `${id}.invalid.txt`);
  writeFileSync(path, r.lastOutput);
  console.log(`Result:  INVALID attempts=${r.attempts}  cost=${usd}  tokens in=${r.inputTokens} out=${r.outputTokens}`);
  for (const e of r.errors) console.log(`  - ${e}`);
  console.log(`Last output saved to ${path}`);
  process.exitCode = 1;
}
