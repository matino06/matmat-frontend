// Holds the task the user is currently looking at, so the AI panel
// (which lives in the root layout) can read it for context. `revealed` is
// whether the solution is open — before that the AI gives hints, not answers.
export const currentTaskState = $state({
  task: null,
  revealed: false,
});

export function setCurrentTask(task) {
  currentTaskState.task = task;
  currentTaskState.revealed = false;
}

export function setSolutionRevealed(revealed) {
  currentTaskState.revealed = revealed;
}

export function clearCurrentTask() {
  currentTaskState.task = null;
  currentTaskState.revealed = false;
}
