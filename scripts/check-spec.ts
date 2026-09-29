import { readFileSync } from "node:fs";
import { parseSpec } from "../src/spec/schema.ts";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/check-spec.ts <spec.json>");
  process.exit(2);
}
const result = parseSpec(JSON.parse(readFileSync(file, "utf8")));
if (result.ok) {
  console.log(`OK  ${file}  (${result.spec.tools.length} tools)`);
} else {
  console.error(`INVALID  ${file}`);
  for (const e of result.errors) console.error(`  - ${e}`);
  process.exit(1);
}