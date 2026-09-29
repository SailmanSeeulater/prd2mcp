import type { Ctx } from "../lib/context.js";
import { ok } from "../result.js";
import type { Input } from "./create_note.schema.js";

export function handler({ title, body }: Input, ctx: Ctx) {
  const note = ctx.store.create(title, body);
  return ok(note, `Created note ${note.id}`);
}
