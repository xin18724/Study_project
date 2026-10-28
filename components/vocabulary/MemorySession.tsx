"use client";

import { useEffect, useState } from "react";
import SpeakButton from "@/components/SpeakButton";
import { createClient } from "@/lib/supabase/client";
import { deleteCloudDailyRecord, migrateLocalDailyRecords, migrateLocalProgress, readCloudLearningData, writeCloudDailyRecord, writeCloudProgress } from "@/components/vocabulary/cloudProgress";
import {
  addLocalDays,
  dailyQueueStorageKey,
  dailyRecordStorageKey,
  dailyUnknownCountStorageKey,
  emptyWordProgress,
  getLocalDateKey,
  normalizeProgressMap,
  readCustomWords,
  readReadingAddedWordIds,
  readingAddedWordIdsStorageKey,
  removeDailyResponse,
  saveDailyResponse,
  wordList,
  wordStatusStorageKey,
  type DailyRecord,
  type ProgressMap,
  type Word,
  type WordProgress,
} from "@/components/vocabulary/data";

type UnknownCounts = Record<string, number>;
type HistoryEntry = {
  wordId: string;
  action: "mastered" | "review" | "unknown" | null;
  finalized?: boolean;
  previousProgress?: WordProgress;
  replacementId?: string;
  previousTotal?: number;
};
type SavedQueue = { amount: number; total: number; wordIds: string[]; history?: HistoryEntry[] };

function shuffle<T,>(items: T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function wordProgress(progress: ProgressMap, wordId: string) {
  return progress[wordId] ?? emptyWordProgress();
}

function applyProgress(word: Word, progress: ProgressMap): Word {
  const state = wordProgress(progress, word.id);
  return { ...word, masteryLevel: state.masteryLevel, nextReviewDate: state.nextReviewDate };
}

function selectEligibleWords(words: Word[], progress: ProgressMap, amount: number, today: string, excludedIds: Set<string> = new Set()) {
  const seenSpellings = new Set(words.filter((word) => excludedIds.has(word.id)).map((word) => word.spelling.trim().toLocaleLowerCase()));
  const pool = words.filter((word) => {
    const spelling = word.spelling.trim().toLocaleLowerCase();
    if (excludedIds.has(word.id) || seenSpellings.has(spelling)) return false;
    const state = wordProgress(progress, word.id);
    if (state.isMastered) return false;
    const eligible = state.isUnfamiliar || state.masteryLevel === 0 ||
      (state.nextReviewDate !== null && state.nextReviewDate <= today);
    if (!eligible) return false;
    seenSpellings.add(spelling);
    return true;
  });
  return shuffle(pool).slice(0, amount).map((word) => applyProgress(word, progress));
}

function readSavedQueue(date: string): SavedQueue | null {
  try {
    const raw = window.localStorage.getItem(dailyQueueStorageKey(date));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("wordIds" in value) || !Array.isArray(value.wordIds)) return null;
    const saved = value as SavedQueue;
    if (typeof saved.amount !== "number" || typeof saved.total !== "number") return null;
    return saved;
  } catch { return null; }
}

function readUnknownCounts(date: string): UnknownCounts {
  try {
    const raw = window.localStorage.getItem(dailyUnknownCountStorageKey(date));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const counts: UnknownCounts = {};
    for (const [id, count] of Object.entries(parsed)) {
      if (typeof count === "number" && count >= 0) counts[id] = count;
    }
    return counts;
  } catch { return {}; }
}

function writeUnknownCounts(date: string, counts: UnknownCounts) {
  try { window.localStorage.setItem(dailyUnknownCountStorageKey(date), JSON.stringify(counts)); }
  catch { /* Browser storage can be unavailable. */ }
}

function writeSavedQueue(date: string, amount: number, total: number, words: Word[], history: HistoryEntry[]) {
  try {
    const saved: SavedQueue = { amount, total, wordIds: words.map((word) => word.id), history };
    window.localStorage.setItem(dailyQueueStorageKey(date), JSON.stringify(saved));
  } catch { /* Browser storage can be unavailable. */ }
}

function persistProgress(progress: ProgressMap) {
  try { window.localStorage.setItem(wordStatusStorageKey, JSON.stringify(progress)); }
  catch { /* Browser storage can be unavailable. */ }
}

export default function MemorySession({ amount }: { amount: number }) {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [unknownCounts, setUnknownCounts] = useState<UnknownCounts>({});
  const [queue, setQueue] = useState<Word[]>([]);
  const [studyWords, setStudyWords] = useState<Word[]>(wordList);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [sessionTotal, setSessionTotal] = useState(amount);
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    async function prepareSession() {
    const date = getLocalDateKey();
    const availableWords = [...wordList, ...readCustomWords()];
    setStudyWords(availableWords);
    let loadedProgress: ProgressMap = {};
    try {
      const stored = window.localStorage.getItem(wordStatusStorageKey);
      if (stored) loadedProgress = normalizeProgressMap(JSON.parse(stored));
    } catch { /* Continue with default progress if browser storage is unavailable. */ }

    let loadedUnknownCounts = readUnknownCounts(date);
    let loadedDailyRecord: DailyRecord = {};
    const seenToday = new Set<string>();
    try {
      const rawRecord = window.localStorage.getItem(dailyRecordStorageKey(date));
      if (rawRecord) {
        const parsed: unknown = JSON.parse(rawRecord);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          loadedDailyRecord = parsed as DailyRecord;
          Object.entries(parsed).forEach(([id, response]) => {
            if (response === "mastered") seenToday.add(id);
          });
        }
      }
    } catch { /* Ignore malformed daily history. */ }

    let activeUserId: string | null = null;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      activeUserId = user?.id ?? null;
      if (activeUserId) {
        const cloud = await readCloudLearningData(activeUserId);
        if (cloud.progressRows > 0) loadedProgress = { ...loadedProgress, ...cloud.progress };
        if (Object.keys(loadedProgress).length) await migrateLocalProgress(activeUserId, loadedProgress);
        const cloudToday = cloud.dailyRecords[date] ?? {};
        loadedDailyRecord = { ...loadedDailyRecord, ...cloudToday };
        for (const [key, value] of Object.entries(cloud.unknownCounts)) {
          const prefix = `${date}:`;
          if (key.startsWith(prefix)) loadedUnknownCounts[key.slice(prefix.length)] = value;
        }
        await migrateLocalDailyRecords(activeUserId, date, loadedDailyRecord, loadedUnknownCounts);
        Object.entries(cloudToday).forEach(([id, response]) => { if (response === "mastered") seenToday.add(id); });
      }
    } catch {
      if (activeUserId) setCloudError("暂时无法读取云端进度，请确认已在 Supabase 执行 supabase/schema.sql。");
    }
    for (const wordId of readReadingAddedWordIds()) {
      loadedProgress[wordId] = { masteryLevel: 0, nextReviewDate: null, isMastered: false, isUnfamiliar: true };
    }
    if (cancelled) return;
    setUserId(activeUserId);
    if (activeUserId) setCloudError("");
    setUnknownCounts(loadedUnknownCounts);
    setProgress(loadedProgress);
    try {
      window.localStorage.setItem(dailyRecordStorageKey(date), JSON.stringify(loadedDailyRecord));
      persistProgress(loadedProgress);
    } catch { /* Continue with in-memory progress if browser storage is unavailable. */ }

    const savedQueue = readSavedQueue(date);
    let todayWords: Word[];
    let todayTotal: number;
    let todayHistory: HistoryEntry[];
    if (savedQueue && savedQueue.amount === amount) {
      todayWords = savedQueue.wordIds
        .map((id) => availableWords.find((word) => word.id === id))
        .filter((word): word is Word => word !== undefined && !wordProgress(loadedProgress, word.id).isMastered)
        .map((word) => applyProgress(word, loadedProgress));
      todayTotal = savedQueue.total;
      todayHistory = Array.isArray(savedQueue.history)
        ? savedQueue.history.filter((entry) => entry && typeof entry.wordId === "string" && availableWords.some((word) => word.id === entry.wordId))
        : [];
      if (!todayHistory.length && todayWords[0]) todayHistory = [{ wordId: todayWords[0].id, action: null }];
    } else {
      todayWords = selectEligibleWords(availableWords, loadedProgress, amount, date, seenToday);
      todayTotal = todayWords.length;
      todayHistory = todayWords[0] ? [{ wordId: todayWords[0].id, action: null }] : [];
    }
    setQueue(todayWords);
    setHistory(todayHistory);
    setSessionTotal(todayTotal);
    writeSavedQueue(date, amount, todayTotal, todayWords, todayHistory);
    setReady(true);
    }
    void prepareSession();
    return () => { cancelled = true; };
  }, [amount]);

  useEffect(() => {
    if (ready) persistProgress(progress);
  }, [ready, progress]);

  const current = queue[0];

  const remember = () => {
    if (!current) return;
    const date = getLocalDateKey();
    const previousProgress = wordProgress(progress, current.id);
    let nextProgress: WordProgress;
    if (previousProgress.masteryLevel === 0) {
      nextProgress = { masteryLevel: 1, nextReviewDate: addLocalDays(date, 1), isMastered: false, isUnfamiliar: false };
    } else if (previousProgress.masteryLevel === 1) {
      nextProgress = { ...previousProgress, masteryLevel: 2, nextReviewDate: addLocalDays(date, 3), isMastered: false, isUnfamiliar: false };
    } else if (previousProgress.masteryLevel === 2) {
      nextProgress = { ...previousProgress, masteryLevel: 3, nextReviewDate: addLocalDays(date, 7), isMastered: false, isUnfamiliar: false };
    } else {
      nextProgress = { ...previousProgress, masteryLevel: 3, nextReviewDate: null, isMastered: true, isUnfamiliar: false };
    }
    const nextProgressMap = { ...progress, [current.id]: nextProgress };
    const nextQueue = queue.slice(1);
    const priorHistory = history.length ? history.slice(0, -1) : [];
    const completedHistory = [...priorHistory, { wordId: current.id, action: "mastered" as const, previousProgress }];
    const nextHistory = nextQueue[0]
      ? [...completedHistory, { wordId: nextQueue[0].id, action: null }]
      : completedHistory;

    setProgress(nextProgressMap);
    persistProgress(nextProgressMap);
    try {
      const readingAddedIds = readReadingAddedWordIds().filter((id) => id !== current.id);
      window.localStorage.setItem(readingAddedWordIdsStorageKey, JSON.stringify(readingAddedIds));
    } catch { /* Keep the current session progress if storage is unavailable. */ }
    setQueue(nextQueue);
    setHistory(nextHistory);
    saveDailyResponse(current.id, "mastered", date);
    if (userId) void Promise.all([
      writeCloudProgress(userId, current.id, nextProgress),
      writeCloudDailyRecord(userId, current.id, date, "mastered", unknownCounts[current.id] ?? 0),
    ]).then(() => setCloudError("")).catch(() => setCloudError("云端同步失败，请检查 Supabase 表结构和网络连接。"));
    writeSavedQueue(date, amount, sessionTotal, nextQueue, nextHistory);
  };

  const reviewLater = () => {
    if (!current) return;
    const date = getLocalDateKey();
    const nextCount = (unknownCounts[current.id] ?? 0) + 1;
    const nextCounts = { ...unknownCounts, [current.id]: nextCount };
    const finalized = nextCount >= 3;
    const previousProgress = wordProgress(progress, current.id);
    const nextProgressMap = finalized
      ? { ...progress, [current.id]: { ...previousProgress, isUnfamiliar: true } }
      : progress;
    let nextQueue = queue.slice(1);
    let nextTotal = sessionTotal;
    let replacementId: string | undefined;
    if (finalized) {
      const reservedIds = new Set([...history.map((entry) => entry.wordId), ...queue.map((word) => word.id)]);
      const replacement = selectEligibleWords(studyWords, nextProgressMap, 1, date, reservedIds)[0];
      if (replacement) {
        nextQueue = [...nextQueue, replacement];
        replacementId = replacement.id;
      } else nextTotal = Math.max(0, sessionTotal - 1);
    } else {
      nextQueue = [...nextQueue, current];
    }

    const priorHistory = history.length ? history.slice(0, -1) : [];
    const checkedHistory = [...priorHistory, {
      wordId: current.id,
      action: "unknown" as const,
      finalized,
      previousProgress,
      replacementId,
      previousTotal: nextTotal !== sessionTotal ? sessionTotal : undefined,
    }];
    const nextHistory = nextQueue[0]
      ? [...checkedHistory, { wordId: nextQueue[0].id, action: null }]
      : checkedHistory;

    setUnknownCounts(nextCounts);
    writeUnknownCounts(date, nextCounts);
    if (finalized) {
      setProgress(nextProgressMap);
      persistProgress(nextProgressMap);
      saveDailyResponse(current.id, "review", date);
    }
    if (userId) void Promise.all([
      finalized ? writeCloudProgress(userId, current.id, nextProgressMap[current.id]) : Promise.resolve(),
      writeCloudDailyRecord(userId, current.id, date, finalized ? "review" : null, nextCount),
    ]).then(() => setCloudError("")).catch(() => setCloudError("云端同步失败，请检查 Supabase 表结构和网络连接。"));
    setQueue(nextQueue);
    setHistory(nextHistory);
    if (nextTotal !== sessionTotal) setSessionTotal(nextTotal);
    writeSavedQueue(date, amount, nextTotal, nextQueue, nextHistory);
  };

  const goPrevious = () => {
    const fromCompletion = !current && history.length > 0;
    if ((!fromCompletion && history.length < 2) || !history.length) return;

    const targetIndex = fromCompletion ? history.length - 1 : history.length - 2;
    const targetEntry = history[targetIndex];
    const target = studyWords.find((word) => word.id === targetEntry.wordId);
    if (!target) return;

    const date = getLocalDateKey();
    let nextQueue: Word[];
    let nextProgress = { ...progress };
    let nextCounts = unknownCounts;
    let nextTotal = sessionTotal;

    if (targetEntry.action === "mastered") {
      if (targetEntry.previousProgress) nextProgress[target.id] = targetEntry.previousProgress;
      else delete nextProgress[target.id];
      removeDailyResponse(target.id, date);
      if (userId) {
        void writeCloudProgress(userId, target.id, nextProgress[target.id] ?? emptyWordProgress()).catch(() => setCloudError("云端同步失败，请检查 Supabase 表结构和网络连接。"));
        if ((unknownCounts[target.id] ?? 0) > 0) void writeCloudDailyRecord(userId, target.id, date, (unknownCounts[target.id] ?? 0) >= 3 ? "review" : null, unknownCounts[target.id] ?? 0).catch(() => setCloudError("云端同步失败，请检查 Supabase 表结构和网络连接。"));
        else void deleteCloudDailyRecord(userId, target.id, date).catch(() => setCloudError("云端同步失败，请检查 Supabase 表结构和网络连接。"));
      }
      nextQueue = [applyProgress(target, nextProgress), ...queue.filter((word) => word.id !== target.id)];
    } else if (targetEntry.action === "unknown") {
      const decremented = Math.max(0, (unknownCounts[target.id] ?? 0) - 1);
      nextCounts = { ...unknownCounts, [target.id]: decremented };
      writeUnknownCounts(date, nextCounts);
      if (targetEntry.finalized && decremented < 3) {
        removeDailyResponse(target.id, date);
        if (targetEntry.previousProgress) nextProgress[target.id] = targetEntry.previousProgress;
        else delete nextProgress[target.id];
      }
      if (userId) {
        void writeCloudProgress(userId, target.id, nextProgress[target.id] ?? emptyWordProgress()).catch(() => setCloudError("云端同步失败，请检查 Supabase 表结构和网络连接。"));
        if (decremented > 0) void writeCloudDailyRecord(userId, target.id, date, decremented >= 3 ? "review" : null, decremented).catch(() => setCloudError("云端同步失败，请检查 Supabase 表结构和网络连接。"));
        else void deleteCloudDailyRecord(userId, target.id, date).catch(() => setCloudError("云端同步失败，请检查 Supabase 表结构和网络连接。"));
      }
      if (targetEntry.previousTotal !== undefined) nextTotal = targetEntry.previousTotal;
      nextQueue = [applyProgress(target, nextProgress), ...queue.filter((word) => word.id !== target.id && word.id !== targetEntry.replacementId)];
    } else if (targetEntry.action === "review") {
      nextQueue = [applyProgress(target, nextProgress), ...queue.filter((word) => word.id !== target.id)];
    } else {
      nextQueue = queue.some((word) => word.id === target.id)
        ? queue
        : [applyProgress(target, nextProgress), ...queue];
    }

    const nextHistory = history.slice(0, targetIndex + 1).map((entry, index) =>
      index === targetIndex ? { wordId: entry.wordId, action: null } : entry
    );
    setProgress(nextProgress);
    persistProgress(nextProgress);
    setUnknownCounts(nextCounts);
    setQueue(nextQueue);
    setHistory(nextHistory);
    if (nextTotal !== sessionTotal) setSessionTotal(nextTotal);
    writeSavedQueue(date, amount, nextTotal, nextQueue, nextHistory);
  };

  return <main className="app-shell memory-shell">
    <header className="site-header"><a className="brand" href="/"><span className="brand-mark">J</span><span>Junior<span className="brand-light">Study</span></span></a><a className="back-link" href="/study">← 调整学习量</a></header>
    <div className="memory-meta"><div><span className="section-kicker">WORD MEMORY · TODAY</span><h1>高中必背3500词</h1></div><span className="today-amount">今日目标 <b>{ready ? sessionTotal : amount}</b> 词</span></div>
    <div className="session-progress"><span>{current ? "今日学习" : "今日完成"}</span><div className="progress-track"><i style={{ width: (queue.length ? ((sessionTotal - queue.length) / sessionTotal) * 100 : 100) + "%" }}/></div><span>{Math.min(sessionTotal - queue.length, sessionTotal)} / {sessionTotal}</span></div>
    {cloudError && <p className="cloud-sync-error" role="status">{cloudError}</p>}
    <section className="memory-stage">{!ready ? <div className="memory-loading">正在准备今日词汇…</div> : current ? <WordCard word={current} canGoPrevious={history.length > 1} onPrevious={goPrevious} onRemember={remember} onReview={reviewLater} /> : <div className="session-complete"><span className="complete-spark">✦</span><span className="section-kicker">DAILY GOAL COMPLETE</span><h2>今日任务完成</h2><p>今天的学习量已经完成，继续保持这个节奏。</p><div className="complete-actions"><button className="previous-button" disabled={!history.length} onClick={goPrevious}>← 上一个</button><a className="primary-button home-button" href="/">返回首页 <span>→</span></a></div></div>}</section>
    {current && <div className="memory-footnote"><span>今日队列剩余 <b>{queue.length}</b> 词</span><span><i className="status-dot dot-review"/> 不认识未满三次会排到队尾</span></div>}
    <footer className="site-footer"><span>JUNIOR STUDY</span><span>高中词表 · {studyWords.length} 个词条</span></footer>
  </main>;
}

function WordCard({ word, canGoPrevious, onPrevious, onRemember, onReview }: { word: Word; canGoPrevious: boolean; onPrevious: () => void; onRemember: () => void; onReview: () => void }) {
  return <article className="memory-card"><div className="card-topline"><span className="unit-chip">TODAY’S WORD</span><span className="card-kind">WORD CARD <i>✦</i></span></div><div className="card-word"><div className="word-title-row"><h2>{word.spelling}</h2><SpeakButton text={word.spelling} /></div><span className="phonetic">{word.pronunciation}</span><span className="part-of-speech">{word.partOfSpeech}</span></div><div className="card-divider"/><div className="card-meaning-label">中文注释</div><p className="card-meaning">{word.meaning}</p><div className="card-actions"><button className="previous-button" disabled={!canGoPrevious} onClick={onPrevious}>← 上一个</button><button className="review-button" onClick={onReview}><span>↻</span> 不认识</button><button className="remember-button" onClick={onRemember}>记住了 <span>→</span></button></div></article>;
}
