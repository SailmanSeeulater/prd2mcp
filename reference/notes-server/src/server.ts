import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { NoteStore } from "./store.js";

const noteShape = {
  id: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
};

function ok(data: Record<string, unknown>, text: string): CallToolResult {
    return { content: [{ type: "text", text}], structuredContent: data };
}

function fail(message: string): CallToolResult {
    return { isError: true, content: [{ type: "text", text: message }] };
}

export function createServer(store = new NoteStore()): McpServer {
    const server = new McpServer({ name: "notes", version: "0.1.0" });

    server.registerTool(
        "create_note", {
            title: "Create note",
            description: "Create a new note with a title and body. Returns the created note.",
            inputSchema: {
                title: z.string().min(1).max(200).describe("Short title for note"),
                body: z.string().max(10_000).describe("Body text of the note"),
            },
            outputSchema: noteShape,
        },
        ({ title, body }) => {
            const note = store.create(title, body);
            return ok(note, `Created note ${note.id}`);
        },
    );

    server.registerTool(
        "list_notes",
        {
            title: "List notes",
            description: "List all notes currently stored, oldest first.",
            inputSchema: {},
            outputSchema: { notes: z.array(z.object(noteShape)) },
        },
        () => {
            const notes = store.list();
            return ok({ notes }, `${notes.length} note(s)`);
        },
    );

    server.registerTool(
        "get_note",
        {
            title: "Get note",
            description: "Fetch a single note by its id.",
            inputSchema: { id: z.string().describe("Id of the note") },
            outputSchema: noteShape,
        },
        ({ id }) => {
            const note = store.get(id);
            return note ? ok(note, note.title): fail(`Note not found: ${id}`);
        },
    );

    server.registerTool(
        "delete_note",
        {
            title: "Delete note",
            description: "Delete a note by its id.",
            inputSchema: { id: z.string().describe("Id of the note") },
            outputSchema: { deleted: z.boolean() }, 
        },
        ({ id }) =>
            store.delete(id) ? ok({ deleted: true }, `Deleted ${id}`) : fail(`Note not found: ${id}`),
    );

    return server;
}