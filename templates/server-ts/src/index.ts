import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

// stdout is the protocol channel: never console.log here, use console.error
await createServer().connect(new StdioServerTransport());
console.error("server running on stdio");
