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
export const customWordStorageKey = "junior-study-custom-words-v1";
export const readingAddedWordIdsStorageKey = "junior-study-reading-added-word-ids-v1";
export const dailyRecordStorageKey = (date: string) => "junior-study-daily-records-" + date + "-v1";
export const dailyQueueStorageKey = (date: string) => "junior-study-daily-queue-" + date + "-v1";
export const dailyUnknownCountStorageKey = (date: string) => "junior-study-daily-unknown-counts-" + date + "-v1";

export function readCustomWords(): Word[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(customWordStorageKey) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is Word => Boolean(item && typeof item === "object" &&
      typeof item.id === "string" && typeof item.spelling === "string" && typeof item.meaning === "string"))
      .map((item) => ({
        ...item,
        pronunciation: typeof item.pronunciation === "string" ? item.pronunciation : "—",
        partOfSpeech: typeof item.partOfSpeech === "string" ? item.partOfSpeech : "词汇",
        masteryStatus: "unmastered" as const,
        masteryLevel: 0 as MasteryLevel,
        nextReviewDate: null,
      }));
  } catch { return []; }
}

export function readReadingAddedWordIds(): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(readingAddedWordIdsStorageKey) || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch { return []; }
}

export function addReadingWord(spelling: string): { word: Word; added: boolean } {
  const normalized = spelling.trim().toLocaleLowerCase();
  const existing = wordList.find((word) => word.spelling.toLocaleLowerCase() === normalized) ??
    readCustomWords().find((word) => word.spelling.toLocaleLowerCase() === normalized);
  const word: Word = existing ?? {
    id: `reading-${normalized.replace(/[^a-z0-9]+/g, "-")}`,
    spelling: spelling.trim(), pronunciation: "—", partOfSpeech: "词汇",
    meaning: "阅读中加入的生词（释义待补充）", masteryStatus: "unmastered",
    masteryLevel: 0, nextReviewDate: null,
  };

  try {
    if (!existing) {
      const customWords = readCustomWords();
      window.localStorage.setItem(customWordStorageKey, JSON.stringify([...customWords, word]));
    }

    const addedIds = new Set(readReadingAddedWordIds());
    const alreadyAdded = addedIds.has(word.id);
    addedIds.add(word.id);
    window.localStorage.setItem(readingAddedWordIdsStorageKey, JSON.stringify([...addedIds]));

    const progressValue: unknown = JSON.parse(window.localStorage.getItem(wordStatusStorageKey) || "{}");
    const progress = progressValue && typeof progressValue === "object" && !Array.isArray(progressValue)
      ? progressValue as Record<string, WordProgress>
      : {};
    progress[word.id] = { masteryLevel: 0, nextReviewDate: null, isMastered: false, isUnfamiliar: true };
    window.localStorage.setItem(wordStatusStorageKey, JSON.stringify(progress));

    const date = getLocalDateKey();
    const queueKey = dailyQueueStorageKey(date);
    const savedQueue: unknown = JSON.parse(window.localStorage.getItem(queueKey) || "null");
    if (savedQueue && typeof savedQueue === "object" && "wordIds" in savedQueue && Array.isArray(savedQueue.wordIds)) {
      const queue = savedQueue as { amount?: number; total?: number; wordIds: string[] };
      if (!queue.wordIds.includes(word.id)) {
        queue.wordIds.push(word.id);
        queue.total = (typeof queue.total === "number" ? queue.total : queue.wordIds.length - 1) + 1;
        window.localStorage.setItem(queueKey, JSON.stringify(queue));
      }
    }
    return { word, added: !alreadyAdded };
  } catch {
    return { word, added: false };
  }
}

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
