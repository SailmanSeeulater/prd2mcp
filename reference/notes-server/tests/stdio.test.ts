import { resolve } from "node:path";
import { expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

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
    expect(client.getServerVersion()?.name).toBe("notes");
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(4);
    const r = await client.callTool({ name: "create_note", arguments: { title: "t", body: "b" } });
    expect(r.isError).toBeFalsy();
  } finally {
    await client.close();
  }
}, 10_000);
