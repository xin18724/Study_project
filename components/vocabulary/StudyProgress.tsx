"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { migrateLocalProgress, readCloudLearningData } from "@/components/vocabulary/cloudProgress";
import {
  dailyRecordStorageKey,
  getLocalDateKey,
  normalizeProgressMap,
  wordList,
  wordStatusStorageKey,
  type DailyRecord,
  type ProgressMap,
  type Word,
} from "@/components/vocabulary/data";


export default function StudyProgress() {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [today, setToday] = useState<DailyRecord>({});
  const [loaded, setLoaded] = useState(false);
  const [todayDate, setTodayDate] = useState("");
  const [cloudError, setCloudError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadProgress() {
    const date = getLocalDateKey();
    setTodayDate(date);
    let loadedProgress: ProgressMap = {};
    let loadedToday: DailyRecord = {};
    try {
      const savedMastery = window.localStorage.getItem(wordStatusStorageKey);
      const savedToday = window.localStorage.getItem(dailyRecordStorageKey(date));
      if (savedMastery) loadedProgress = normalizeProgressMap(JSON.parse(savedMastery));
      if (savedToday) {
        const parsed: unknown = JSON.parse(savedToday);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) loadedToday = parsed as DailyRecord;
      }
    } catch { /* Show available local progress if saved data is malformed. */ }
    try {
      const { data: { user } } = await createClient().auth.getUser();
      if (user) {
        const cloud = await readCloudLearningData(user.id);
        if (cloud.progressRows > 0) loadedProgress = { ...loadedProgress, ...cloud.progress };
        if (Object.keys(loadedProgress).length) await migrateLocalProgress(user.id, loadedProgress);
        loadedToday = { ...loadedToday, ...(cloud.dailyRecords[date] ?? {}) };
      }
    } catch {
      setCloudError("暂时无法读取云端进度，请确认已在 Supabase 执行 supabase/schema.sql。");
    }
    if (cancelled) return;
    setProgress(loadedProgress);
    setToday(loadedToday);
    try {
      window.localStorage.setItem(wordStatusStorageKey, JSON.stringify(loadedProgress));
      window.localStorage.setItem(dailyRecordStorageKey(date), JSON.stringify(loadedToday));
    } catch { /* Cloud and in-memory data remain available if local storage is unavailable. */ }
    setLoaded(true);
    }
    void loadProgress();
    return () => { cancelled = true; };
  }, []);

  const masteredCount = wordList.reduce((count, word) => count + (progress[word.id]?.masteryLevel === 3 ? 1 : 0), 0);
  const learningCount = wordList.reduce((count, word) => {
    const level = progress[word.id]?.masteryLevel;
    return count + (level === 1 || level === 2 ? 1 : 0);
  }, 0);
  const remainingCount = wordList.length - masteredCount - learningCount;
  const percentage = wordList.length ? (masteredCount / wordList.length) * 100 : 0;
  const wordsById = new Map(wordList.map((word) => [word.id, word]));
  const remembered = getTodayWords(today, wordsById, "mastered");
  const review = getTodayWords(today, wordsById, "review");

  return <main className="app-shell progress-shell">
    <header className="site-header">
      <a className="brand" href="/"><span className="brand-mark">J</span><span>Junior<span className="brand-light">Study</span></span></a>
      <a className="back-link" href="/">← 返回首页</a>
    </header>
    <section className="progress-intro">
      <span className="section-kicker">YOUR LEARNING PROGRESS</span>
      <h1>学习进度</h1>
      <p>每天记住一些，离目标再近一点。</p>
    </section>
    {cloudError && <p className="cloud-sync-error" role="status">{cloudError}</p>}
    <section className="progress-overview">
      <article className="progress-card progress-total">
        <div className="progress-card-heading"><span>总进度</span><span className="progress-percent">{loaded ? percentage.toFixed(1) : "0.0"}%</span></div>
        <div className="progress-summary"><span>已掌握</span><strong>{loaded ? masteredCount : 0}</strong><span>词 / 共 {wordList.length} 词</span></div>
        <div className="progress-track progress-track-large" role="progressbar" aria-valuenow={loaded ? masteredCount : 0} aria-valuemin={0} aria-valuemax={wordList.length}><i style={{ width: (loaded ? percentage : 0) + "%" }}/></div>
      </article>
      <article className="progress-card progress-remaining">
        <span>剩余未记忆</span>
        <strong>{loaded ? remainingCount : wordList.length}</strong>
        <small>还有 {loaded ? remainingCount : wordList.length} 个词未掌握</small>
        <small>学习中 {loaded ? learningCount : 0} 词</small>
      </article>
    </section>
    <section className="today-record">
      <div className="today-record-heading"><div><span className="section-kicker">TODAY</span><h2>今日记忆记录</h2></div><span>{todayDate}</span></div>
      <div className="record-groups">
        <RecordGroup title="已记住" count={remembered.length} words={remembered} tone="mastered"/>
        <RecordGroup title="还不认识" count={review.length} words={review} tone="review"/>
      </div>
    </section>
    <footer className="site-footer"><span>JUNIOR STUDY</span><span>已掌握 {loaded ? masteredCount : 0} / {wordList.length}</span></footer>
  </main>;
}

function getTodayWords(today: DailyRecord, words: Map<string, Word>, response: "mastered" | "review") {
  return Object.entries(today)
    .filter(([, value]) => value === response)
    .map(([id]) => words.get(id))
    .filter((word): word is Word => word !== undefined)
    .sort((left, right) => left.spelling.localeCompare(right.spelling));
}

function RecordGroup({ title, count, words, tone }: { title: string; count: number; words: Word[]; tone: "mastered" | "review" }) {
  return <article className="record-group">
    <div className="record-group-heading"><span><i className={"status-dot dot-" + tone}/>{title}</span><b>{count} 词</b></div>
    {words.length ? <ul className="record-word-list">{words.map((word) => <li key={word.id}><span><strong>{word.spelling}</strong><small>{word.pronunciation}</small></span><em>{word.meaning}</em></li>)}</ul> : <p className="record-empty">今天还没有记录</p>}
  </article>;
}
