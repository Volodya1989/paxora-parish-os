# Tasks modal bug — Root cause + fix

## Symptoms
- Editing a task does not update the task list and the modal remains open.
- Creating a task sometimes leaves the modal open after a successful submit.

## Root cause
- `TaskCreateDialog` and `TaskEditDialog` rely on `useActionState` and only watch `state.status` in `useEffect`.
- After a successful submit, `state.status` remains `"success"`. A second successful submit returns the same status value, so the effect does **not re-run**, leaving the modal open and the UI stale.

## Fix
- Reset the “handled success” ref any time the modal opens.
- Treat every new action result as distinct by depending on the full `state` object (not just `state.status`) so the success handler runs on consecutive successful submits.
- Keep `router.refresh()` and success toasts but ensure they run only once per action result.

## Regression avoidance
- Add unit coverage for the success-handling helper so consecutive success states still trigger a close action for both create and edit flows.
