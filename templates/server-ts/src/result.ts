import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function ok(data: Record<string, unknown>, text: string): CallToolResult {
  return { content: [{ type: "text", text }], structuredContent: data };
}

export function fail(message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}
