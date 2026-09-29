import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildRepairPrompt, buildSystemPrompt, buildUserPrompt } from "../src/spec/prompts/spec-prompt.ts";
import { parseSpec } from "../src/spec/schema.ts";

const fewshot = (name: string) =>
  readFileSync(resolve(import.meta.dirname, "../src/spec/prompts/fewshot", name), "utf8");

describe("few-shot examples are honest", () => {
  for (const file of ["notes.spec.json", "calendar.spec.json"]) {
    it(`${file} passes the real validator`, () => {
      const r = parseSpec(JSON.parse(fewshot(file)));
      expect(r.ok ? [] : r.errors).toEqual([]);
    });
  }

  it("the notes example records assumptions and asks nothing", () => {
    const spec = JSON.parse(fewshot("notes.spec.json"));
    expect(spec.assumptions.length).toBeGreaterThan(0);
    expect(spec.openQuestions).toEqual([]);
  });

  it("the vague example asks questions and has no tools", () => {
    const spec = JSON.parse(fewshot("calendar.spec.json"));
    expect(spec.tools).toEqual([]);
    expect(spec.openQuestions.length).toBeGreaterThan(0);
  });
});

describe("system prompt", () => {
  const system = buildSystemPrompt();

  it("contains the hard rule verbatim", () => {
    expect(system).toContain("If the PRD doesn't say, put it in openQuestions. Never invent.");
  });

  it("tells the agent to stay faithful so the gate can REJECT", () => {
    expect(system).toContain("Be faithful, not protective");
  });

  it("separates blocking questions from non-blocking assumptions", () => {
    expect(system).toContain("# Questions vs assumptions");
    expect(system).toContain("assumptions do NOT block");
    expect(system).toContain("openQuestions BLOCK the build");
  });

  it("embeds the JSON Schema and both worked examples", () => {
    expect(system).toContain("<json_schema>");
    expect(system).toContain('"additionalProperties":false');
    expect(system.match(/<example>/g)).toHaveLength(2);
  });

  it("stays small (cost guard): under 20k characters", () => {
    expect(system.length).toBeLessThan(20_000);
  });
});

describe("user and repair prompts", () => {
  it("wraps the PRD", () => {
    expect(buildUserPrompt("  # Hi  ")).toContain("<prd>\n# Hi\n</prd>");
  });

  it("repair prompt carries the PRD, the previous output and every error", () => {
    const p = buildRepairPrompt("PRD TEXT", "PREVIOUS", ["a.b: bad", "c: worse"]);
    for (const s of ["PRD TEXT", "PREVIOUS", "- a.b: bad", "- c: worse"]) expect(p).toContain(s);
  });
});
