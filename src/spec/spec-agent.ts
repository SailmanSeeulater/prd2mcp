import { runClaude } from "../builder/claude.ts";
import { buildRepairPrompt, buildSystemPrompt, buildUserPrompt } from "./prompts/spec-prompt.ts";
import { parseSpec, type ServerSpec } from "./schema.ts";

export interface ModelReply {
  text: string;
  costUsd: number;
  inputTokens?: number;
  outputTokens?: number;
}
export type ModelRunner = (req: { system: string; prompt: string }) => Promise<ModelReply>;

// Real runner: `claude -p` with no tools, its default system prompt replaced, run from an empty temp dir.
export function claudeRunner(model = process.env.PRD2MCP_SPEC_MODEL ?? "sonnet"): ModelRunner {
  return async ({ system, prompt }) => {
    const r = await runClaude({ prompt, systemPrompt: system, model, tools: "", maxBudgetUsd: 1 });
    if (r.is_error) throw new Error(`claude failed (${r.subtype}): ${r.result}`);
    const u = r.usage;
    return {
      text: r.result,
      costUsd: r.total_cost_usd,
      inputTokens: u ? u.input_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens : undefined,
      outputTokens: u?.output_tokens,
    };
  };
}

export interface SpecStats {
  attempts: number; // 1 = first try was valid
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  attemptErrors: string[][]; // errors seen after each failed attempt
}
export type SpecResult =
  | ({ ok: true; spec: ServerSpec } & SpecStats)
  | ({ ok: false; errors: string[]; lastOutput: string } & SpecStats);

export function extractJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  let s = text.trim();
  const fenced = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenced?.[1]) s = fenced[1];
  if (!s.startsWith("{")) {
    const a = s.indexOf("{");
    const b = s.lastIndexOf("}");
    if (a !== -1 && b > a) s = s.slice(a, b + 1);
  }
  try {
    return { ok: true, value: JSON.parse(s) };
  } catch (e) {
    return { ok: false, error: `output is not valid JSON: ${(e as Error).message}` };
  }
}

// The plan says 1 repair. Shape errors mask invariant errors (zod skips custom checks when the
// shape is wrong), so a spec can need two rounds. Default 2; the eval data will say if that's needed.
export async function generateSpec(
  prd: string,
  opts: { run?: ModelRunner; maxRepairs?: number } = {},
): Promise<SpecResult> {
  const run = opts.run ?? claudeRunner();
  const maxRepairs = opts.maxRepairs ?? 2;
  const system = buildSystemPrompt();
  const stats: SpecStats = { attempts: 0, costUsd: 0, inputTokens: 0, outputTokens: 0, attemptErrors: [] };

  let prompt = buildUserPrompt(prd);
  let lastOutput = "";
  let errors: string[] = [];

  for (let attempt = 1; attempt <= 1 + maxRepairs; attempt++) {
    const reply = await run({ system, prompt });
    stats.attempts = attempt;
    stats.costUsd += reply.costUsd;
    stats.inputTokens += reply.inputTokens ?? 0;
    stats.outputTokens += reply.outputTokens ?? 0;
    lastOutput = reply.text;

    const json = extractJson(reply.text);
    if (json.ok) {
      const parsed = parseSpec(json.value);
      if (parsed.ok) return { ok: true, spec: parsed.spec, ...stats };
      errors = parsed.errors;
    } else {
      errors = [json.error];
    }
    stats.attemptErrors.push(errors);
    prompt = buildRepairPrompt(prd, lastOutput, errors);
  }
  return { ok: false, errors, lastOutput, ...stats };
}
