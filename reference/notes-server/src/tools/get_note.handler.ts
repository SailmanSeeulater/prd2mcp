import type { Ctx } from "../lib/context.js";
import { fail, ok } from "../result.js";
import type { Input } from "./get_note.schema.js";

export function handler({ id }: Input, ctx: Ctx) {
  const note = ctx.store.get(id);
  return note ? ok(note, note.title) : fail(`Note not found: ${id}`);
}
