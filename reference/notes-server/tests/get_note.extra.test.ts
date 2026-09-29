import { expect, it } from "vitest";
import { connect, data } from "./helpers.js";

it("get_note round-trips a created note", async () => {
  const client = await connect();
  const created = await client.callTool({
    name: "create_note",
    arguments: { title: "hello", body: "world" },
  });
  const id = data(created).id as string;
  const r = await client.callTool({ name: "get_note", arguments: { id } });
  expect(data(r)).toEqual(data(created));
});
