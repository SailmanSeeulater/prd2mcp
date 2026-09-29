import { expect, it } from "vitest";
import { connect, data, textOf } from "./helpers.js";

it("delete_note removes the note; a later get fails cleanly", async () => {
  const client = await connect();
  const created = await client.callTool({
    name: "create_note",
    arguments: { title: "x", body: "y" },
  });
  const id = data(created).id as string;

  const del = await client.callTool({ name: "delete_note", arguments: { id } });
  expect(data(del)).toEqual({ deleted: true });

  const get = await client.callTool({ name: "get_note", arguments: { id } });
  expect(get.isError).toBe(true);
  expect(textOf(get)).toContain("Note not found");
});
