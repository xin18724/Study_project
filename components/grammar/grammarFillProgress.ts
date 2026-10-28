export const completedGrammarFillStorageKey = "junior-study-completed-grammar-fill-v1";

export function readCompletedGrammarFill(): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(completedGrammarFillStorageKey) || "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch { return []; }
}

export function markGrammarFillCompleted(articleId: string) {
  try {
    const completed = new Set(readCompletedGrammarFill());
    completed.add(articleId);
    window.localStorage.setItem(completedGrammarFillStorageKey, JSON.stringify([...completed]));
  } catch { /* Keep the submitted answers even if browser storage is unavailable. */ }
}
