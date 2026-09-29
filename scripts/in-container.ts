import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const IMAGE = "prd2mcp-runner";

export interface ContainerOpts {
  runDir: string;
  network?: boolean; // default false: --network none
}

export function inContainer(cmd: string, opts: ContainerOpts): Promise<number> {
  const runDir = resolve(opts.runDir);
  mkdirSync(runDir, { recursive: true });

  const args = [
    "run", "--rm",
    "--network", opts.network ? "bridge" : "none",
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges",
    "--pids-limit", "512",
    "--memory", "2g",
    "-v", `${runDir}:/work`,
    "-w", "/work",
    IMAGE,
    "sh", "-c", cmd,
  ];

  return new Promise((res, rej) => {
    const child = spawn("docker", args, { stdio: "inherit" });
    child.on("error", rej);
    child.on("close", (code) => res(code ?? 1));
  });
}

if (import.meta.filename === process.argv[1]) {
  const argv = process.argv.slice(2);
  const network = argv.includes("--net");
  const cmd = argv.filter((a) => a !== "--net").join(" ");
  if (!cmd) {
    console.error('usage: node scripts/in-container.ts [--net] "<command>"');
    process.exit(2);
  }
  process.exit(await inContainer(cmd, { runDir: "runs/_scratch", network }));
}
