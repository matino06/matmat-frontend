import { apiClient } from "$lib/api/apiClient";
import { getProgram } from "$lib/config/programs";
import { ownCourses, findOwnCourse } from "$lib/store/ownCourses.svelte";

// The course the user is currently studying. Shared because the root layout
// needs it (formula sheet PDF, breadcrumb labels) while the Sidebar owns the
// switcher — see the currentTask store for the same page-writes/panel-reads
// pattern.
export const courseState = $state({ courseId: null, loaded: false });

export const loadCurrentCourse = async () => {
  try {
    const res = await apiClient("/account/current-course", { method: "GET" });
    if (res.ok) courseState.courseId = (await res.json())?.courseId ?? null;
  } catch {}
  courseState.loaded = true;
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
