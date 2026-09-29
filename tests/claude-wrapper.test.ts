import { chmodSync, existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { runClaude } from "../src/builder/claude.ts";

// A fake `claude` that echoes back the arguments and working directory it was started with.
let fake: string;
beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), "fake-claude-"));
  fake = join(dir, "claude");
  writeFileSync(
    fake,
    `#!/usr/bin/env node
const args = process.argv.slice(2);
const failing = args.includes("--fail");
process.stdout.write(JSON.stringify({
  type: "result", subtype: failing ? "error_during_execution" : "success", is_error: failing,
  result: JSON.stringify({ args, cwd: process.cwd() }), session_id: "s", num_turns: 1,
  total_cost_usd: 0.01, duration_ms: 5,
}));
process.exit(failing ? 1 : 0);
`,
  );
  chmodSync(fake, 0o755);
});

describe("runClaude", () => {
  it("passes the isolation flags, system prompt, model and an empty tool list", async () => {
    const r = await runClaude({ prompt: "hello", systemPrompt: "SYS", model: "sonnet", tools: "", bin: fake });
    const { args } = JSON.parse(r.result) as { args: string[] };
    expect(args.slice(0, 2)).toEqual(["-p", "hello"]);
    for (const flag of ["--output-format", "--no-session-persistence", "--strict-mcp-config", "--disable-slash-commands"]) {
      expect(args).toContain(flag);
    }
    expect(args[args.indexOf("--system-prompt") + 1]).toBe("SYS");
    expect(args[args.indexOf("--model") + 1]).toBe("sonnet");
    expect(args.slice(-2)).toEqual(["--tools", ""]); // variadic flag goes last
  });

  it("runs from a throwaway temp dir (not the repo) and deletes it afterwards", async () => {
    const r = await runClaude({ prompt: "x", bin: fake });
    const { cwd } = JSON.parse(r.result) as { cwd: string };
    expect(cwd).not.toBe(process.cwd());
    expect(existsSync(cwd)).toBe(false);
  });

  it("returns error results instead of throwing (is_error: true, non-zero exit)", async () => {
    const r = await runClaude({ prompt: "x", bin: fake, extraArgs: ["--fail"] });
    expect(r.is_error).toBe(true);
  });

  it("gives a clear message when the binary does not exist", async () => {
    await expect(runClaude({ prompt: "x", bin: "/no/such/claude" })).rejects.toThrow(/could not run/);
  });
});
