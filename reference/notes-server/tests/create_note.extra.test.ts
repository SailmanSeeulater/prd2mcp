import { expect, it } from "vitest";
import { connect } from "./helpers.js";

it("create_note requires title and body in its input schema", async () => {
  const client = await connect();
  const { tools } = await client.listTools();
  const create = tools.find((t) => t.name === "create_note");
  expect(create?.inputSchema.required).toEqual(["title", "body"]);
});
