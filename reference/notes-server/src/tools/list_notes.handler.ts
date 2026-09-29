import type { Ctx } from "../lib/context.js";
import { ok } from "../result.js";
import type { Input } from "./list_notes.schema.js";

export function handler(_input: Input, ctx: Ctx) {
  const notes = ctx.store.list();
  return ok({ notes }, `${notes.length} note(s)`);
}
