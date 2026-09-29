import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import { NoteStore } from "../src/store.js";

// Fresh server + client wired together in memory. Every call goes through the MCP protocol.
export async function connect(): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createServer(new NoteStore()).connect(serverTransport);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await client.connect(clientTransport);
  return client;
}

// callTool() returns a union type, so accept unknown and narrow inside.
export function textOf(result: unknown): string {
  const content = (result as { content?: { type: string; text?: string }[] }).content;
  const first = content?.[0];
  return first?.type === "text" ? (first.text ?? "") : "";
}

export function data(result: unknown): Record<string, unknown> {
  return (result as { structuredContent?: Record<string, unknown> }).structuredContent ?? {};
}
