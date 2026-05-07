// Holds the task the user is currently looking at, so the AI panel
// (which lives in the root layout) can read it for context.
export const currentTaskState = $state({
  task: null,
});

export function setCurrentTask(task) {
  currentTaskState.task = task;
}

export function clearCurrentTask() {
  currentTaskState.task = null;
}
