import { apiClient } from "$lib/api/apiClient";

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
