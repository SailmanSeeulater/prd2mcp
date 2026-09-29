import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

// stdout is the protocal channel: never console.log here, now we use console.error baby
await createServer().connect(new StdioServerTransport());
console.error("notes server running on stdio");
