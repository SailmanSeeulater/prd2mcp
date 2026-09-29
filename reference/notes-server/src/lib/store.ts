import { randomUUID } from "node:crypto";

export type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

export class NoteStore {
  private notes = new Map<string, Note>();

  create(title: string, body: string): Note {
    const note: Note = { id: randomUUID(), title, body, createdAt: new Date().toISOString() };
    this.notes.set(note.id, note);
    return note;
  }

  list(): Note[] {
    return [...this.notes.values()];
  }

  get(id: string): Note | undefined {
    return this.notes.get(id);
  }

  delete(id: string): boolean {
    return this.notes.delete(id);
  }
}