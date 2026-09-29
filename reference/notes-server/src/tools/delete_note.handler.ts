import type { Ctx } from "../lib/context.js";
import { fail, ok } from "../result.js";
import type { Input } from "./delete_note.schema.js";

export function handler({ id }: Input, ctx: Ctx) {
  return ctx.store.delete(id) ? ok({ deleted: true }, `Deleted ${id}`) : fail(`Note not found: ${id}`);
}
