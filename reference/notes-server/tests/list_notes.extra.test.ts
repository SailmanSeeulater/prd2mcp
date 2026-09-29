import { expect, it } from "vitest";
import { connect, data } from "./helpers.js";

it("list_notes returns created notes oldest first", async () => {
  const client = await connect();
  await client.callTool({ name: "create_note", arguments: { title: "one", body: "1" } });
  await client.callTool({ name: "create_note", arguments: { title: "two", body: "2" } });
  const r = await client.callTool({ name: "list_notes", arguments: {} });
  const notes = data(r).notes as { title: string }[];
  expect(notes.map((n) => n.title)).toEqual(["one", "two"]);
});
