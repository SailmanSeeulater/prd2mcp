# Notes server

A small in-memory notes service for an AI assistant. Notes are lost when the server stops.

## Create a note
The assistant can create a note with a title (required, at most 200 characters) and a body (up to 10,000 characters). The result is the created note, including a unique id and the time it was created.

## List notes
The assistant can list every note, oldest first.

## Get a note
The assistant can fetch one note by its id. If there is no note with that id, the answer is the error "Note not found: <id>".

## Delete a note
The assistant can delete a note by its id, with the same "Note not found: <id>" error for an unknown id.
