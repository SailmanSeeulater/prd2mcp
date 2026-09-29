// Builder-owned. Per-server state; createServer() calls createCtx() once per server instance.
export type Ctx = Record<string, never>;
export const createCtx = (): Ctx => ({});
