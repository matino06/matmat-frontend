import { apiClient } from "$lib/api/apiClient";
import { getProgram, loadPrograms } from "$lib/config/programs.svelte";
import { ownCourses, findOwnCourse } from "$lib/store/ownCourses.svelte";

// The course the user is currently studying. Shared because the root layout
// needs it (formula sheet PDF, breadcrumb labels) while the Sidebar owns the
// switcher — see the currentTask store for the same page-writes/panel-reads
// pattern.
// `chosen` lists the official courses the student picked to study (the switcher
// shows only those); null while unknown, e.g. on a backend without the list.
export const courseState = $state({ courseId: null, loaded: false, chosen: null });

export const loadCurrentCourse = async () => {
  const current = async () => {
    const res = await apiClient("/account/current-course", { method: "GET" });
    if (res.ok) courseState.courseId = (await res.json())?.courseId ?? null;
  };
  await Promise.allSettled([current(), loadChosenCourses(), loadPrograms()]);
  courseState.loaded = true;
};

const loadChosenCourses = async () => {
  const res = await apiClient("/account/courses", { method: "GET" });
  const ids = res.ok ? await res.json() : null;
  courseState.chosen = Array.isArray(ids) && ids.length ? ids : null;
};

// Throws when the list isn't saved, so the caller can say so.
export const saveChosenCourses = async (courseIds) => {
  const res = await apiClient("/account/courses", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseIds }),
  });
  if (!res.ok) throw new Error(String(res.status));
  courseState.chosen = courseIds;
};

// Throws like saveChosenCourses; callers reload afterwards, since every page
// fetches its course-specific content on mount.
export const saveCurrentCourse = async (courseId) => {
  const res = await apiClient("/account/current-course", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId }),
  });
  if (!res.ok) throw new Error(String(res.status));
  courseState.courseId = courseId;
};

export const setCurrentCourse = (courseId) => {
  courseState.courseId = courseId;
};

// Subject name for breadcrumbs and page subtitles; null while the course (or,
// for an own course, the creator's course list) is still loading, so callers
// can show a placeholder instead of guessing. Falls back to maths once loaded.
export const courseLabel = (courseId) => {
  const name = getProgram(courseId)?.short ?? findOwnCourse(courseId)?.courseName;
  if (name) return name;
  return courseState.loaded && ownCourses.loaded ? "Matematika" : null;
};
