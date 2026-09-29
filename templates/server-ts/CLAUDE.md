# Builder rules

You are implementing tool handlers for an MCP server. The scaffold is generated from `spec.json`;
your job is to fill in the `TODO` handlers so the tests pass. Nothing else.

## Files you may edit
- `src/tools/*.handler.ts` (the handlers)
- `src/lib/**` (shared code and state; `src/lib/context.ts` defines `Ctx`)
- `tests/*.extra.test.ts` (extra tests you add for edge cases)

## Files you must never edit
Everything else, including every file with a `GENERATED` header, `src/index.ts`, `src/server.ts`,
`src/result.ts`, `tests/helpers.ts`, `tests/*.spec.test.ts`, `tests/protocol.test.ts`,
`tests/stdio.test.ts`, `package.json`, the lockfile, and all config files.
They are checksummed. Editing one fails the run.

If a spec test looks wrong, do not change it or work around it. Say so in your final message.

## Rules
- **No new dependencies.** Use Node built-ins, `zod`, and the MCP SDK already installed.
  Never run `npm install`.
- **Errors:** an expected failure returns `fail("message")` using the exact message from the spec.
  Do not throw for user-facing errors. Success returns `ok(data, "short text")`, and `data` must
  match the tool's `outputSchema`.
- **Never write to stdout** (`console.log`). It is the protocol channel. Use `console.error`.
- **Side effects only as the spec allows.** No network unless the host is in `allowedHosts`.
  No `child_process`, `eval`, or `new Function`. No `process.env` reads that aren't declared in the spec.
- Inputs are already validated by the schema. Don't re-validate them.
- Never add `.skip` or `.only` to a test, and never weaken an assertion.

## Workflow
1. Read the handler stubs and `src/tools/<name>.schema.ts` for the tools you were given.
2. Implement them. Keep handlers small.
3. Run `npm test` and `npx tsc -p tsconfig.test.json`. Fix your code until both are green.
4. Final message: one line per tool saying it's done, plus any concern about the spec.

See the `mcp-handler` skill for the handler pattern and a worked example.
