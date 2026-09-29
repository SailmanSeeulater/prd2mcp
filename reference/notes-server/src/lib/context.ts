import { NoteStore } from "./store.js";

// Per-server state. createServer() calls createCtx() once per server instance.
export type Ctx = { store: NoteStore };
export const createCtx = (): Ctx => ({ store: new NoteStore() });
