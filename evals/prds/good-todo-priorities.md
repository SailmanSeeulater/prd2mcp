# Todo list with priorities

An in-memory todo list for the assistant to keep track of a user's tasks during one session. Nothing is saved after the server stops.

## Add a todo
A todo has a title (required, 1 to 120 characters) and a priority of low, medium or high. Priority defaults to medium. Each new todo gets a unique id and starts as not done.

## List todos
Return all todos. The caller can optionally filter by priority and can choose whether to include finished todos (default: no). Sort high priority first; within the same priority, oldest first.

## Complete a todo
Mark a todo as done by id. Completing an already finished todo is fine and changes nothing.

## Delete a todo
Remove a todo by id.

For complete and delete: if no todo has that id, the error is "Todo not found: <id>".
