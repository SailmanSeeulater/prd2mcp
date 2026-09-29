import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface ClaudeUsage {
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens: number;
}

export interface ClaudeResult {
  type: "result";
  subtype: string;
  is_error: boolean;
  result: string;
  session_id: string;
  num_turns: number;
  total_cost_usd: number;
  duration_ms: number;
  usage?: ClaudeUsage;
}

export interface ClaudeOptions {
  prompt: string;
  /** Replaces Claude Code's default system prompt (this is what cuts the ~19k-token baseline). */
  systemPrompt?: string;
  /** Alias ("sonnet", "opus", "haiku") or a full model name. Unset = CLI default (expensive). */
  model?: string;
  /** "" disables every tool. Unset = the CLI default tool set. */
  tools?: string;
  /** Default: a fresh empty temp dir, so no CLAUDE.md or git status leaks into the run. */
  cwd?: string;
  maxBudgetUsd?: number;
  timeoutMs?: number;
  /** Default "claude". Tests point this at a fake. */
  bin?: string;
  extraArgs?: string[];
}

export async function runClaude(opts: ClaudeOptions): Promise<ClaudeResult> {
  const ownCwd = opts.cwd === undefined;
  const cwd = opts.cwd ?? mkdtempSync(join(tmpdir(), "prd2mcp-claude-"));

  // The positional prompt goes right after -p. --tools is variadic, so it goes LAST,
  // where it can't swallow anything that follows.
  const args = [
    "-p", opts.prompt,
    "--output-format", "json",
    "--no-session-persistence",
    "--strict-mcp-config", // ignore your claude.ai connectors and user-level MCP servers
    "--disable-slash-commands",
  ];
  if (opts.systemPrompt !== undefined) args.push("--system-prompt", opts.systemPrompt);
  if (opts.model) args.push("--model", opts.model);
  if (opts.maxBudgetUsd !== undefined) args.push("--max-budget-usd", String(opts.maxBudgetUsd));
  args.push(...(opts.extraArgs ?? []));
  if (opts.tools !== undefined) args.push("--tools", opts.tools);

  try {
    return await spawnJson(opts.bin ?? "claude", args, cwd, opts.timeoutMs ?? 300_000);
  } finally {
    if (ownCwd) rmSync(cwd, { recursive: true, force: true });
  }
}

function spawnJson(bin: string, args: string[], cwd: string, timeoutMs: number): Promise<ClaudeResult> {
  return new Promise((resolve, reject) => {
    // stdin "ignore": an open stdin pipe can make `claude -p` wait for input forever
    const child = spawn(bin, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      signal: AbortSignal.timeout(timeoutMs),
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => reject(new Error(`could not run ${bin}: ${e.message}`)));
    child.on("close", (code) => {
      // parse regardless of exit code: failures still print JSON with is_error: true
      try {
        resolve(JSON.parse(out) as ClaudeResult);
      } catch {
        reject(new Error(`${bin} exited ${code} with unparseable output:\n${err || out}`));
      }
    });
  });
}
