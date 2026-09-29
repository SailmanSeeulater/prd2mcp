import { readFileSync } from "node:fs";
import { parseSpec } from "../src/spec/schema.ts";

for (const file of process.argv.slice(2)) {
  const r = parseSpec(JSON.parse(readFileSync(file, "utf8")));
  if (!r.ok) {
    console.log(`${file}: INVALID\n  ${r.errors.join("\n  ")}`);
    continue;
  }
  const s = r.spec;
  console.log(`\n=== ${s.name}  storage=${s.storage}  hosts=[${s.allowedHosts.join(",")}]  env=[${s.env.map((e) => e.name).join(",")}]`);
  for (const t of s.tools) {
    const ins = t.inputs.map((f) => `${f.name}${f.required ? "" : "?"}:${f.type}`).join(", ");
    const outs = t.output.kind === "text" ? "text" : t.output.fields.map((f) => f.name).join(", ");
    console.log(`  ${t.name}(${ins}) -> ${outs}   [${t.sideEffects}]`);
    for (const e of t.errors) console.log(`     error: when ${e.when} => "${e.message}"`);
    for (const ex of t.examples) {
      const exp = ex.expect.ok
        ? `ok${ex.expect.contains ? " contains " + JSON.stringify(ex.expect.contains) : ""}`
        : `error ~ "${ex.expect.errorIncludes}"`;
      console.log(`     ex: ${JSON.stringify(ex.input)} -> ${exp}`);
    }
  }
  for (const q of s.openQuestions) console.log(`  ? ${q}`);
  for (const a of s.assumptions) console.log(`  * ${a}`);
}
