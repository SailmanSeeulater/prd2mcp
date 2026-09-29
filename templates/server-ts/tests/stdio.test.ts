import { resolve } from "node:path";
import { expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { serverInfo, toolNames } from "../src/tools/index.js";

// Proves the BUILT server starts and speaks the protocol over real stdio.
// Requires `npm run build` first (the `pretest` script does it).
it("built server completes the handshake over stdio", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve(import.meta.dirname, "../dist/index.js")],
  });
  const client = new Client({ name: "stdio-test", version: "0.0.0" });
  await client.connect(transport);
  try {
    expect(client.getServerVersion()?.name).toBe(serverInfo.name);
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(toolNames.length);
  } finally {
    await client.close();
  }
}, 10_000);
