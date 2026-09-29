---
name: mcp-handler
description: How to implement or fix a tool handler in this MCP server (src/tools/<name>.handler.ts). Use when a handler throws TODO, a spec test for fails, or you need shared state under src/lib.
---

# Implementing a tool handler

Each tool has a generated `src/tools/<name>.schema.ts` (exports `config` and the `Input` type) and a
handler file your write. The generated registery calls `handler(input, ctx)`.

## the pattern

```ts
import type { Ctx } from "../lib/context.js";
import { fail, ok } from "../result.js";
import type { Input } from "./get_note.schema.js";

export function handler({ id }: Input, ctx: Ctx) {
  const note = ctx.store.get(id);
  return note ? ok(note, note.title) : fail(`Note not found: ${id}`);
}
```

- `Input` is inferred from the schema. Destructure it.
- `ok(data, text)`: `data` must match the tool's `outputSchema`; `text` is a short human summary.
- `fail(message)`: for expected failures. Use the exact message from the spec.
- Handlers may be `async` if they need to be.
- Don't wrap everything in try/catch. Only catch errors you can turn into a specific `fail(...)`.

## Shared state

State lives in `src/lib/context.ts`. `createCtx()` runs once per server instance, so tests never
share state.

```ts
import { NoteStore } from "./store.js";

export type Ctx = { store: NoteStore };
export const createCtx = (): Ctx => ({ store: new NoteStore() });
```

Put helpers and storage classes in `src/lib/`, not in handler files.

## Extra tests

Spec tests cover single calls from the spec's examples. Add multi-step flows and edge cases in
`tests/<name>.extra.test.ts`:

```ts
import { expect, it } from "vitest";
import { connect, data } from "./helpers.js";

it("get_note round-trips a created note", async () => {
  const client = await connect();
  const created = await client.callTool({ name: "create_note", arguments: { title: "a", body: "b" } });
  const id = data(created).id as string;
  const r = await client.callTool({ name: "get_note", arguments: { id } });
  expect(data(r)).toEqual(data(created));
});
```

`connect()` gives a fresh server every call, and everything goes through the MCP protocol.