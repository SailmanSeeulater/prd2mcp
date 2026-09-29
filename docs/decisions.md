# Decisions

One line per decision: date, choice, reason.

- 2026-09-28: **TypeScript for pipeline and generated servers.** One stack, zod schemas shared between spec validation and generated code, `tsc` gives clean machine-readable errors.
- 2026-09-28: **Node 24, not 20.** vitest 5 requires Node ^22.12 or ^24, and Node 20 is EOL. Pinned via `.nvmrc` and `engines`.
- 2026-09-28: **TypeScript 6.0.3, not 7.x.** typescript-eslint 8.71 only supports TS <6.1. TS 7 is a stretch goal.
- 2026-09-28: **MCP SDK v1.31.0, exact pin.** v1 has far more training-data coverage, so fewer hallucinated imports. v2 migration is a stretch goal.
- 2026-09-28: **zod 4.6.5, exact pin.** The SDK accepts ^3.25 || ^4.0. `npm ls zod` shows a single deduped copy. Use built-in `z.toJSONSchema()` instead of `zod-to-json-schema`, and `z.record(key, value)` needs a key schema in v4.
- 2026-09-28: **Exact version pins everywhere (`npm i -E`).** Generated servers and the pipeline must be reproducible across eval runs.
- 2026-09-28: **stdio transport only.** HTTP adds auth, ports, and sessions the pipeline doesn't need. Stretch goal.
- 2026-09-28: **vitest, discovery limited to `tests/`.** Otherwise it would pick up tests inside generated servers under `runs/`.
- 2026-09-28: **Develop in WSL2 on the Linux filesystem (`~/code`), not `/mnt/c` or OneDrive.** Spawning `.cmd` shims on Windows is painful, Docker bind mounts are fastest from WSL, and the target environment is Linux.
- 2026-09-28: **Claude Code headless (`claude -p --output-format json`) as the loop driver, pinned to 2.1.284.** Spawn with stdin `ignore` so it never waits on input; parse JSON regardless of exit code because failures still emit `is_error: true`.
- 2026-09-28: **Docker, one container per run, `--network none` by default, opt-in per stage.** Also `--cap-drop ALL`, `no-new-privileges`, non-root user, PID and memory caps. The builder runs generated code, so treat it as untrusted.
- 2026-09-28: **Ambient Claude config leaks into headless runs outside Docker** (user-level MCP connectors, git status). Use `--strict-mcp-config` outside Docker; the container has no `~/.claude`, so it's clean by default.
- 2026-09-28: **Baseline `claude -p` cost is about $0.07 per call** (Opus 5.5 default, about 19k tokens of fixed context). Pin `--model` explicitly in the builder (3.2) and compare cost per green PRD across models.
- 2026-09-28: **npm install scripts allowed per package, one time, never globally.** Generated servers keep install scripts off (revisit in P1 with the template lockfile).
- 2026-09-28: **Results stored as JSON in `evals/results/`, no database.** Git history is the time series.
