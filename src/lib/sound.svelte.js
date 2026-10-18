import { browser } from "$app/environment";

// Short sounds for a correct answer and a milestone (lesson mastered, daily goal met), the same files as the iOS
// app. On by default; the choice lives only on this device (localStorage), it is not sent to the backend.
const STORAGE_KEY = "matmat.feedbackSound";
const FILES = { correct: "/sounds/correct.wav", milestone: "/sounds/milestone.wav" };

function readSetting() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true; // storage blocked (private mode): default on
  }
}

export const feedbackSound = $state({ on: browser ? readSetting() : true });

export function setFeedbackSound(on) {
  feedbackSound.on = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Storage blocked: the choice just won't survive a reload.
  }
}

// Both players are created on the first sound, so nothing loads on the server or before a sound is needed,
// and the milestone is already loaded by the time it plays.
let players = null;

/** @param {"correct" | "milestone"} kind */
export function playSound(kind) {
  if (!browser || !feedbackSound.on || !FILES[kind]) return;
  players ??= Object.fromEntries(
    Object.entries(FILES).map(([k, src]) => {
      const a = new Audio(src);
      a.preload = "auto";
      return [k, a];
    }),
  );
  const audio = players[kind];
  audio.currentTime = 0;
  // Autoplay rules can reject play(); the sound is a nicety, so stay silent.
  audio.play().catch(() => {});
}
