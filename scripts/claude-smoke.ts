import { spawn } from "node:child_process";

export interface ClaudeResult {
  type: "result";
  subtype: string;
  is_error: boolean;
  result: string;
  session_id: string;
  num_turns: number;
  total_cost_usd: number;
  duration_ms: number;
}

export function runClaude(prompt: string, extraArgs: string[] = []): Promise<ClaudeResult> {
  return new Promise((resolve, reject) => {
    // stdin "ignore": an open stdin pipe can make `claude -p` hang waiting for input
    const child = spawn("claude", ["-p", prompt, "--output-format", "json", ...extraArgs], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => {
      // parse regardless of exit code: failures still emit JSON with is_error: true
      try {
        resolve(JSON.parse(out) as ClaudeResult);
      } catch {
        reject(new Error(`claude exited ${code}, unparseable output:\n${err || out}`));
      }
    });
  });
}

if (import.meta.filename === process.argv[1]) {
  const r = await runClaude("say hi");
  console.log({
    result: r.result,
    is_error: r.is_error,
    num_turns: r.num_turns,
    session_id: r.session_id,
    total_cost_usd: r.total_cost_usd,
  });
}
