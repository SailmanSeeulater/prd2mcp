import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createCtx, type Ctx } from "./lib/context.js";
import { registerAll, serverInfo } from "./tools/index.js";

// Fresh context (state) per server instance, so tests never share state.
export function createServer(ctx: Ctx = createCtx()): McpServer {
  const server = new McpServer(serverInfo);
  registerAll(server, ctx);
  return server;
}
