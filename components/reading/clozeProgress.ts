export const completedClozesStorageKey = "junior-study-completed-clozes-v1";

export function readCompletedClozes(): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(completedClozesStorageKey) || "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch { return []; }
}

export function markClozeCompleted(articleId: string) {
  try {
    const completed = new Set(readCompletedClozes());
    completed.add(articleId);
    window.localStorage.setItem(completedClozesStorageKey, JSON.stringify([...completed]));
  } catch { /* Keep the practice result even if browser storage is unavailable. */ }
}
