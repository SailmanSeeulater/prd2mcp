import { beforeEach, describe, expect, it } from "vitest";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { connect, data, textOf } from "./helpers.js";

let client: Client;
beforeEach(async () => {
  client = await connect();
});

describe("tools/list", () => {
  it("exposes exactly the four notes tools with schemas", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "create_note",
      "delete_note",
      "get_note",
      "list_notes",
    ]);
    for (const tool of tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.outputSchema).toBeDefined();
    }
  });

  it("marks title and body as required on create_note", async () => {
    const { tools } = await client.listTools();
    const create = tools.find((t) => t.name === "create_note");
    expect(create?.inputSchema.required).toEqual(["title", "body"]);
  });
});

describe("tools/call", () => {
  it("create_note returns structured content", async () => {
    const r = await client.callTool({ name: "create_note", arguments: { title: "a", body: "b" } });
    expect(r.isError).toBeFalsy();
    expect(r.structuredContent).toMatchObject({ title: "a", body: "b" });
    expect(data(r).id).toEqual(expect.any(String));
  });

  it("list_notes is empty, then contains created notes in order", async () => {
    const empty = await client.callTool({ name: "list_notes", arguments: {} });
    expect(empty.structuredContent).toEqual({ notes: [] });

    await client.callTool({ name: "create_note", arguments: { title: "one", body: "1" } });
    await client.callTool({ name: "create_note", arguments: { title: "two", body: "2" } });
    const r = await client.callTool({ name: "list_notes", arguments: {} });
    const notes = data(r).notes as { title: string }[];
    expect(notes.map((n) => n.title)).toEqual(["one", "two"]);
  });

  it("get_note round-trips a created note", async () => {
    const created = await client.callTool({
      name: "create_note",
      arguments: { title: "hello", body: "world" },
    });
    const id = data(created).id as string;
    const r = await client.callTool({ name: "get_note", arguments: { id } });
    expect(r.structuredContent).toEqual(created.structuredContent);
  });

  it("delete_note removes the note; a second get fails cleanly", async () => {
    const created = await client.callTool({
      name: "create_note",
      arguments: { title: "x", body: "y" },
    });
    const id = data(created).id as string;

    const del = await client.callTool({ name: "delete_note", arguments: { id } });
    expect(del.structuredContent).toEqual({ deleted: true });

    const get = await client.callTool({ name: "get_note", arguments: { id } });
    expect(get.isError).toBe(true);
    expect(textOf(get)).toContain("Note not found");
  });

  it("delete_note on a missing id is an error result, not a throw", async () => {
    const r = await client.callTool({ name: "delete_note", arguments: { id: "nope" } });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toContain("Note not found: nope");
  });
});

describe("input validation (enforced by the zod schema, over the protocol)", () => {
  it("rejects an empty title", async () => {
    const r = await client.callTool({ name: "create_note", arguments: { title: "", body: "x" } });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toContain("Input validation error");
  });

  it("rejects a missing required argument", async () => {
    const r = await client.callTool({ name: "get_note", arguments: {} });
    expect(r.isError).toBe(true);
  });

  it("rejects an unknown tool", async () => {
    const r = await client.callTool({ name: "nope", arguments: {} });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toContain("not found");
  });
});
