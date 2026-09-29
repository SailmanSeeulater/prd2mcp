import { expect, it } from "vitest";
import { toolNames } from "../src/tools/index.js";
import { connect, textOf } from "./helpers.js";

it("tools/list matches the registry, and every tool has schemas", async () => {
  const client = await connect();
  const { tools } = await client.listTools();
  expect(tools.map((t) => t.name).sort()).toEqual([...toolNames].sort());
  for (const tool of tools) {
    expect(tool.description).toBeTruthy();
    expect(tool.inputSchema.type).toBe("object");
    expect(tool.outputSchema).toBeDefined();
  }
});

it("an unknown tool is an error result, not a throw", async () => {
  const client = await connect();
  const r = await client.callTool({ name: "definitely_not_a_tool", arguments: {} });
  expect(r.isError).toBe(true);
  expect(textOf(r)).toContain("not found");
});
