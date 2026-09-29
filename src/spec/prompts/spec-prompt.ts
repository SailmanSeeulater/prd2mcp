import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { ServerSpec } from "../schema.ts";

const fewshotDir = resolve(import.meta.dirname, "fewshot");
const read = (name: string): string => readFileSync(resolve(fewshotDir, name), "utf8").trim();

// The JSON Schema carries the SHAPE; the invariants section below carries what a schema can't say.
export function specJsonSchema(): string {
  const schema = z.toJSONSchema(ServerSpec, { io: "input" });
  return JSON.stringify(schema); // compact: whitespace is wasted tokens
}

const INSTRUCTIONS = `You turn a product requirements document (PRD) into a JSON "server spec" for an MCP server generator. A later stage generates code from your spec, so it must be precise and contain only what the PRD supports.

# Output
Respond with exactly one JSON object that matches the JSON Schema below. No prose, no markdown fences, no comments.

# The hard rule
If the PRD doesn't say, put it in openQuestions. Never invent.
- Never invent tools, inputs, hosts, environment variables, storage, or limits that the PRD does not state or clearly imply.
- If a detail that decides what gets built is missing, vague, or contradictory, add a specific question to openQuestions that a product manager could answer in one line. Leave the affected tool out, or include only the parts that are clear.
- If nothing usable is specified, use "tools": [] and explain what is missing in openQuestions.
- Small details with a conventional default are not questions: record them in assumptions (next section).

# Questions vs assumptions
openQuestions BLOCK the build until a person answers, so use them only when the answer changes what gets built:
- which service, host, or account to talk to; how to authenticate; where credentials come from
- which operations exist, and whether data may be created, changed, or deleted
- where data must live (nowhere, memory, or a file)
- anything the PRD contradicts itself about, or is too vague to build even one tool from

assumptions do NOT block. Use them for small details a competent engineer would settle with the conventional default. Say what you assumed in one sentence. Typical examples:
- rounding of numbers (default: full precision)
- whether text matching is case-sensitive (default: yes)
- the wording of an error the PRD calls an error but does not word (default: rely on input validation, or a plain descriptive message)
- id and timestamp formats (default: opaque string ids, ISO 8601 UTC timestamps)
- whether limits are inclusive (default: yes) and how ties are ordered
If guessing wrong would change which tools exist, what they touch, or who can call them, it is a question, not an assumption. Use "assumptions": [] when there are none.

# Be faithful, not protective
Describe what the PRD asks for, even if it sounds dangerous, unwise, or too big (arbitrary shell commands, reading any file, 25 tools). A separate policy gate decides what is allowed. Never refuse, water down, split up, or shrink the request, and never add safety features the PRD did not ask for.

# How to fill in the spec
- One tool per distinct operation the PRD describes. Tool names are snake_case verbs (create_note). The server name is kebab-case.
- Field names start with a lowercase letter and use lowerCamelCase.
- sourceRefs: the exact heading text of each PRD section that describes the tool ("intro" if the PRD has no headings).
- storage: "none" unless calls must remember data; "memory" when data lives only while the server runs; "sqlite-file" only if the PRD asks for a file or SQLite database.
- sideEffects: "none" (pure computation), "read", "write", or "network" (calls another service).
- allowedHosts: only hostnames the PRD names, as bare hostnames (api.example.com; no scheme, port, or path).
- env: only secrets or settings the PRD says are needed.
- Types: "integer" for whole numbers, "number" otherwise, "enum" (with enumValues) for closed sets. Arrays hold primitives, or objects with properties. Represent nesting exactly as the PRD describes it; do not flatten it.
- required: true unless the PRD says a value is optional or gives a default.
- constraints: only limits the PRD states.
- errors: one entry per error the PRD describes with its wording, using {field} placeholders for input values. If the PRD calls something an error without wording it, leave it out of errors, cover it with an "Input validation error" example where it is an input problem, and note it in assumptions.
- output.kind: "structured" when the tool returns named values; "text" only for a plain message.

# Examples (they become automated tests, so they must be correct)
- Every tool needs at least one example. A few clear ones beat many.
- Example inputs use only declared input names.
- ok: true with contains: only values the PRD makes certain, and only top-level output field names. If the result cannot be predicted (random values, timestamps, generated ids), leave contains out.
- ok: false: errorIncludes is a substring of the error message. Use the PRD's wording. For input that violates a declared constraint or enum, or is missing a required field, use "Input validation error".

# Rules the schema cannot express (a spec that breaks them is rejected)
- enumValues: required for type "enum", forbidden otherwise, no duplicates.
- items: required for type "array", forbidden otherwise.
- properties: required for type "object" and for arrays with items "object", forbidden otherwise.
- constraints: min/max only on number and integer fields; minLength/maxLength/pattern only on string fields; min <= max; pattern must be a valid JavaScript regular expression.
- Tool names are unique; field names are unique within a list.
- contains is only allowed when output.kind is "structured", and its keys must be output fields.
- tools may be empty only when openQuestions is non-empty.`;

export function buildSystemPrompt(): string {
  return [
    INSTRUCTIONS,
    "",
    "# JSON Schema",
    "<json_schema>",
    specJsonSchema(),
    "</json_schema>",
    "",
    "# Worked examples",
    "<example>",
    "<prd>",
    read("notes.prd.md"),
    "</prd>",
    "<spec>",
    JSON.stringify(JSON.parse(read("notes.spec.json"))),
    "</spec>",
    "</example>",
    "",
    "This second PRD is too vague to build from, so the spec has no tools and asks questions:",
    "<example>",
    "<prd>",
    read("calendar.prd.md"),
    "</prd>",
    "<spec>",
    JSON.stringify(JSON.parse(read("calendar.spec.json"))),
    "</spec>",
    "</example>",
  ].join("\n");
}

export function buildUserPrompt(prd: string): string {
  return `<prd>\n${prd.trim()}\n</prd>\n\nReturn the JSON spec for this PRD.`;
}

export function buildRepairPrompt(prd: string, previousOutput: string, errors: string[]): string {
  return [
    "Your previous answer was rejected by the validator.",
    "",
    "<prd>",
    prd.trim(),
    "</prd>",
    "",
    "<previous_output>",
    previousOutput.trim(),
    "</previous_output>",
    "",
    "<validation_errors>",
    ...errors.map((e) => `- ${e}`),
    "</validation_errors>",
    "",
    "Return the corrected, complete JSON object. Fix every listed error and change nothing else. " +
      "Do not add information the PRD does not contain: if an error cannot be fixed without inventing something, " +
      "remove that part or move the question to openQuestions.",
  ].join("\n");
}
