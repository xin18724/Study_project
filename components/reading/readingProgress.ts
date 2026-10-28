export const completedReadingsStorageKey = "junior-study-completed-readings-v1";

export function readCompletedReadings(): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(completedReadingsStorageKey) || "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch { return []; }
}

export function markReadingCompleted(articleId: string) {
  try {
    const completed = new Set(readCompletedReadings());
    completed.add(articleId);
    window.localStorage.setItem(completedReadingsStorageKey, JSON.stringify([...completed]));
  } catch { /* Completion can still be shown for the current session if storage is unavailable. */ }
}
