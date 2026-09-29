import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractJson, generateSpec, type ModelRunner } from "../src/spec/spec-agent.ts";

const goodSpec = readFileSync(
  resolve(import.meta.dirname, "../src/spec/prompts/fewshot/notes.spec.json"),
  "utf8",
);

// A runner that replays canned replies and records every request it receives.
function fakeRunner(replies: string[]) {
  const calls: { system: string; prompt: string }[] = [];
  const run: ModelRunner = async (req) => {
    calls.push(req);
    const text = replies[calls.length - 1];
    if (text === undefined) throw new Error("fake runner ran out of replies");
    return { text, costUsd: 0.01, inputTokens: 100, outputTokens: 10 };
  };
  return { run, calls };
}

const withUnknownKey = () => JSON.stringify({ ...JSON.parse(goodSpec), bogus: true });

describe("extractJson", () => {
  it("parses plain JSON", () => expect(extractJson('{"a":1}')).toEqual({ ok: true, value: { a: 1 } }));
  it("strips ```json fences", () =>
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ ok: true, value: { a: 1 } }));
  it("finds the object inside chatty text", () =>
    expect(extractJson('Sure! Here it is:\n{"a":1}\nHope that helps.')).toEqual({ ok: true, value: { a: 1 } }));
  it("reports non-JSON", () => {
    const r = extractJson("I cannot do that.");
    expect(r.ok).toBe(false);
  });
});

describe("generateSpec", () => {
  it("returns the spec on the first valid answer", async () => {
    const { run, calls } = fakeRunner([goodSpec]);
    const r = await generateSpec("some PRD", { run });
    expect(r.ok).toBe(true);
    expect(r.attempts).toBe(1);
    expect(calls).toHaveLength(1);
    expect(r.costUsd).toBeCloseTo(0.01);
  });

  it("accepts fenced output", async () => {
    const { run } = fakeRunner(["```json\n" + goodSpec + "\n```"]);
    expect((await generateSpec("prd", { run })).ok).toBe(true);
  });

  it("repairs once: the second request carries the errors and the previous output", async () => {
    const bad = withUnknownKey();
    const { run, calls } = fakeRunner([bad, goodSpec]);
    const r = await generateSpec("my PRD", { run });
    expect(r.ok).toBe(true);
    expect(r.attempts).toBe(2);
    expect(r.costUsd).toBeCloseTo(0.02);
    expect(calls[1]?.prompt).toContain('Unrecognized key: "bogus"');
    expect(calls[1]?.prompt).toContain("my PRD");
    expect(calls[1]?.prompt).toContain('"bogus":true');
    expect(calls[1]?.system).toBe(calls[0]?.system); // same rules on every attempt
    expect(r.attemptErrors).toHaveLength(1);
  });

  it("treats non-JSON output like any other validation failure", async () => {
    const { run, calls } = fakeRunner(["Sorry, no.", goodSpec]);
    const r = await generateSpec("prd", { run });
    expect(r.ok).toBe(true);
    expect(calls[1]?.prompt).toContain("not valid JSON");
  });

  it("gives up after 1 + maxRepairs attempts and returns the last errors", async () => {
    const bad = withUnknownKey();
    const { run, calls } = fakeRunner([bad, bad, bad]);
    const r = await generateSpec("prd", { run, maxRepairs: 2 });
    expect(r.ok).toBe(false);
    expect(calls).toHaveLength(3);
    expect(r.attempts).toBe(3);
    if (!r.ok) {
      expect(r.errors.join("\n")).toContain("bogus");
      expect(r.lastOutput).toBe(bad);
    }
  });

  it("maxRepairs: 0 means a single attempt", async () => {
    const { run, calls } = fakeRunner([withUnknownKey(), goodSpec]);
    const r = await generateSpec("prd", { run, maxRepairs: 0 });
    expect(r.ok).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it("a NEEDS_INPUT spec (no tools, open questions) is a valid result", async () => {
    const vague = readFileSync(
      resolve(import.meta.dirname, "../src/spec/prompts/fewshot/calendar.spec.json"),
      "utf8",
    );
    const r = await generateSpec("prd", { run: fakeRunner([vague]).run });
    expect(r.ok && r.spec.openQuestions.length > 0 && r.spec.tools.length === 0).toBe(true);
  });
});
