import importedWords from "@/data/words.json";

export type MasteryLevel = 0 | 1 | 2 | 3;
export type Word = {
  id: string;
  spelling: string;
  pronunciation: string;
  partOfSpeech: string;
  meaning: string;
  masteryStatus: "unmastered" | "mastered";
  masteryLevel: MasteryLevel;
  nextReviewDate: string | null;
};
export type WordProgress = {
  masteryLevel: MasteryLevel;
  nextReviewDate: string | null;
  isMastered: boolean;
  isUnfamiliar: boolean;
};
export type WordResponse = "mastered" | "review";
export type DailyRecord = Record<string, WordResponse>;
export type ProgressMap = Record<string, WordProgress>;

export const wordList = importedWords.map((word) => ({
  ...word,
  masteryLevel: 0 as MasteryLevel,
  nextReviewDate: null as string | null,
})) as Word[];
export const wordStatusStorageKey = "junior-study-3500-word-status-v1";
export const dailyRecordStorageKey = (date: string) => "junior-study-daily-records-" + date + "-v1";
export const dailyQueueStorageKey = (date: string) => "junior-study-daily-queue-" + date + "-v1";
export const dailyUnknownCountStorageKey = (date: string) => "junior-study-daily-unknown-counts-" + date + "-v1";

export function emptyWordProgress(): WordProgress {
  return { masteryLevel: 0, nextReviewDate: null, isMastered: false, isUnfamiliar: false };
}

export function normalizeProgressMap(value: unknown): ProgressMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const progress: ProgressMap = {};
  for (const [id, raw] of Object.entries(value)) {
    if (raw === "mastered") {
      progress[id] = { masteryLevel: 3, nextReviewDate: null, isMastered: true, isUnfamiliar: false };
      continue;
    }
    if (raw === "review") {
      progress[id] = { masteryLevel: 0, nextReviewDate: null, isMastered: false, isUnfamiliar: true };
      continue;
    }
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Partial<WordProgress> & { status?: string };
    const level = item.masteryLevel;
    const masteryLevel: MasteryLevel = level === 1 || level === 2 || level === 3 ? level : 0;
    const nextReviewDate = typeof item.nextReviewDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.nextReviewDate)
      ? item.nextReviewDate
      : null;
    progress[id] = {
      masteryLevel,
      nextReviewDate,
      isMastered: item.isMastered === true || (item as { masteryStatus?: string }).masteryStatus === "mastered",
      isUnfamiliar: item.isUnfamiliar === true || item.status === "review",
    };
    if (progress[id].isMastered) progress[id].masteryLevel = 3;
  }
  return progress;
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

export function addLocalDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return getLocalDateKey(new Date(year, month - 1, day + days));
}

export function saveDailyResponse(wordId: string, response: WordResponse, date = getLocalDateKey()) {
  try {
    const key = dailyRecordStorageKey(date);
    const stored = window.localStorage.getItem(key);
    const records: DailyRecord = stored ? JSON.parse(stored) as DailyRecord : {};
    records[wordId] = response;
    window.localStorage.setItem(key, JSON.stringify(records));
  } catch { /* Browser storage can be unavailable. */ }
}

export function removeDailyResponse(wordId: string, date = getLocalDateKey()) {
  try {
    const key = dailyRecordStorageKey(date);
    const stored = window.localStorage.getItem(key);
    if (!stored) return;
    const records: DailyRecord = JSON.parse(stored) as DailyRecord;
    delete records[wordId];
    window.localStorage.setItem(key, JSON.stringify(records));
  } catch { /* Browser storage can be unavailable. */ }
}
