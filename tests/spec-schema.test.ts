/* eslint-disable @typescript-eslint/no-explicit-any -- specs are loose JSON in tests */
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseSpec, ServerSpec } from "../src/spec/schema.ts";

const validDir = resolve(import.meta.dirname, "../fixtures/specs/valid");
const load = (name: string): Record<string, any> =>
  JSON.parse(readFileSync(resolve(validDir, name), "utf8"));

describe("hand-written specs validate", () => {
  for (const file of readdirSync(validDir)) {
    it(file, () => {
      const result = parseSpec(load(file));
      expect(result.ok ? [] : result.errors).toEqual([]);
    });
  }
});

// Each case takes a known-good spec, breaks exactly one thing, and checks the error
// names the right place in a way a human (or the Spec Agent's repair prompt) can act on.
const broken: [string, string, (s: Record<string, any>) => void, string, string][] = [
  [
    "unknown key (LLM invented a field)",
    "notes.json",
    (s) => (s.tools[0].auth = "oauth"),
    "tools[0]",
    'Unrecognized key: "auth"',
  ],
  [
    "enum field without enumValues",
    "unit-converter.json",
    (s) => delete s.tools[0].inputs[1].enumValues,
    "tools[0].inputs[1].enumValues",
    "enumValues is required when type is 'enum'",
  ],
  [
    "example uses an input that does not exist",
    "notes.json",
    (s) => (s.tools[0].examples[0].input = { tittle: "a", body: "b" }),
    "tools[0].examples[0].input.tittle",
    "is not a declared input of create_note",
  ],
  [
    "min greater than max",
    "weather.json",
    (s) => (s.tools[0].inputs[0].constraints = { min: 90, max: -90 }),
    "tools[0].inputs[0].constraints",
    "min (90) is greater than max (-90)",
  ],
  [
    "invalid regex pattern",
    "notes.json",
    (s) => (s.tools[0].inputs[0].constraints.pattern = "(unclosed"),
    "tools[0].inputs[0].constraints.pattern",
    "not a valid regular expression",
  ],
  [
    "duplicate tool names",
    "notes.json",
    (s) => (s.tools[1].name = "create_note"),
    "tools[1].name",
    "duplicate tool name 'create_note'",
  ],
  [
    "array of objects without properties",
    "notes.json",
    (s) => delete s.tools[1].output.fields[0].properties,
    "tools[1].output.fields[0].properties",
    "properties is required",
  ],
  [
    "contains names a field the tool doesn't output",
    "notes.json",
    (s) => (s.tools[0].examples[0].expect.contains = { titel: "a" }),
    "tools[0].examples[0].expect.contains.titel",
    "is not an output field of create_note",
  ],
  [
    "bad allowedHosts (URL instead of hostname)",
    "weather.json",
    (s) => (s.allowedHosts = ["https://api.open-meteo.com/v1"]),
    "allowedHosts[0]",
    "bare lowercase hostname",
  ],
  [
    "missing assumptions list",
    "notes.json",
    (s) => delete s.assumptions,
    "assumptions",
    "expected array",
  ],
  [
    "unknown storage backend",
    "notes.json",
    (s) => (s.storage = "redis"),
    "storage",
    "Invalid option",
  ],
];

describe("broken specs fail with readable errors", () => {
  for (const [label, file, mutate, path, message] of broken) {
    it(label, () => {
      const spec = load(file);
      mutate(spec);
      const result = parseSpec(spec);
      expect(result.ok).toBe(false);
      const errors = result.ok ? [] : result.errors;
      expect(errors.some((e) => e.startsWith(`${path}: `) && e.includes(message))).toBe(true);
    });
  }
});

describe("assumptions never block", () => {
  it("a spec with assumptions and no open questions is valid", () => {
    const spec = load("notes.json");
    spec.assumptions = ["Rounding uses full precision."];
    expect(parseSpec(spec).ok).toBe(true);
  });
});

describe("NEEDS_INPUT specs are representable", () => {
  it("allows zero tools when openQuestions is non-empty", () => {
    const spec = load("notes.json");
    spec.tools = [];
    spec.openQuestions = ["What should the productivity tool actually do?"];
    expect(parseSpec(spec).ok).toBe(true);
  });

  it("rejects zero tools with no openQuestions", () => {
    const spec = load("notes.json");
    spec.tools = [];
    const result = parseSpec(spec);
    expect(result.ok).toBe(false);
  });

  it("does NOT enforce the tool-count limit (that is policy, see spec gate)", () => {
    const spec = load("notes.json");
    const base = spec.tools[0];
    spec.tools = Array.from({ length: 25 }, (_, i) => ({ ...structuredClone(base), name: `tool_${i}_x` }));
    expect(parseSpec(spec).ok).toBe(true);
  });

  it("does NOT enforce nesting depth (policy): 3-level nesting still parses", () => {
    const spec = load("notes.json");
    const leaf = { name: "c", description: "innermost field", type: "string", required: true };
    const mid = { name: "b", description: "middle object", type: "object", required: true, properties: [leaf] };
    const top = { name: "a", description: "outer object", type: "object", required: true, properties: [mid] };
    spec.tools[0].output.fields = [top];
    spec.tools[0].examples[0].expect = { ok: true };
    expect(parseSpec(spec).ok).toBe(true);
  });
});

describe("JSON Schema export (needed for the Spec Agent prompt in 2.2)", () => {
  it("z.toJSONSchema handles the recursive field type", () => {
    const js = z.toJSONSchema(ServerSpec, { io: "input" });
    expect(JSON.stringify(js)).toContain("tools");
  });
});
