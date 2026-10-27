import { createClient } from "@/lib/supabase/client";
import { emptyWordProgress, type DailyRecord, type ProgressMap, type WordProgress, type WordResponse } from "./data";

export type CloudLearningData = {
  progress: ProgressMap;
  dailyRecords: Record<string, DailyRecord>;
  unknownCounts: Record<string, number>;
  progressRows: number;
  dailyRows: number;
};

export async function readCloudLearningData(userId: string): Promise<CloudLearningData> {
  const supabase = createClient();
  const [progressResult, dailyResult] = await Promise.all([
    supabase.from("word_progress").select("word_id,status,mastery_level,next_review_date,is_mastered,is_unfamiliar").eq("user_id", userId),
    supabase.from("daily_word_records").select("word_id,record_date,response,unknown_count").eq("user_id", userId),
  ]);
  if (progressResult.error) throw progressResult.error;
  if (dailyResult.error) throw dailyResult.error;

  const progress: ProgressMap = {};
  for (const row of progressResult.data ?? []) {
    const level = Number(row.mastery_level);
    const masteryLevel: WordProgress["masteryLevel"] = level === 1 || level === 2 || level === 3 ? level : 0;
    progress[row.word_id] = {
      masteryLevel,
      nextReviewDate: row.next_review_date,
      isMastered: row.is_mastered || row.status === "mastered",
      isUnfamiliar: row.is_unfamiliar || row.status === "unfamiliar",
    };
    if (progress[row.word_id].isMastered) progress[row.word_id].masteryLevel = 3;
  }

  const dailyRecords: Record<string, DailyRecord> = {};
  const unknownCounts: Record<string, number> = {};
  for (const row of dailyResult.data ?? []) {
    const date = String(row.record_date).slice(0, 10);
    unknownCounts[`${date}:${row.word_id}`] = Number(row.unknown_count) || 0;
    if (row.response === "mastered" || row.response === "review") {
      (dailyRecords[date] ??= {})[row.word_id] = row.response as WordResponse;
    }
  }
  return { progress, dailyRecords, unknownCounts, progressRows: progressResult.data?.length ?? 0, dailyRows: dailyResult.data?.length ?? 0 };
}

export async function writeCloudProgress(userId: string, wordId: string, progress: WordProgress) {
  const status = progress.isMastered ? "mastered" : progress.isUnfamiliar ? "unfamiliar" : progress.masteryLevel > 0 ? "learning" : "unmastered";
  const { error } = await createClient().from("word_progress").upsert({
    user_id: userId, word_id: wordId, status, mastery_level: progress.masteryLevel,
    next_review_date: progress.nextReviewDate, is_mastered: progress.isMastered,
    is_unfamiliar: progress.isUnfamiliar, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,word_id" });
  if (error) throw error;
}

export async function writeCloudDailyRecord(userId: string, wordId: string, date: string, response: WordResponse | null, unknownCount: number) {
  const { error } = await createClient().from("daily_word_records").upsert({
    user_id: userId, word_id: wordId, record_date: date, response,
    unknown_count: unknownCount, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,word_id,record_date" });
  if (error) throw error;
}

export async function deleteCloudDailyRecord(userId: string, wordId: string, date: string) {
  const { error } = await createClient().from("daily_word_records").delete().eq("user_id", userId).eq("word_id", wordId).eq("record_date", date);
  if (error) throw error;
}

export async function migrateLocalProgress(userId: string, progress: ProgressMap) {
  const rows = Object.entries(progress).map(([wordId, value]) => {
    const item = value ?? emptyWordProgress();
    const status = item.isMastered ? "mastered" : item.isUnfamiliar ? "unfamiliar" : item.masteryLevel > 0 ? "learning" : "unmastered";
    return { user_id: userId, word_id: wordId, status, mastery_level: item.masteryLevel, next_review_date: item.nextReviewDate, is_mastered: item.isMastered, is_unfamiliar: item.isUnfamiliar };
  });
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await createClient().from("word_progress").upsert(rows.slice(i, i + 500), { onConflict: "user_id,word_id" });
    if (error) throw error;
  }
}

export async function migrateLocalDailyRecords(userId: string, date: string, records: DailyRecord, unknownCounts: Record<string, number>) {
  const wordIds = new Set([...Object.keys(records), ...Object.keys(unknownCounts)]);
  const rows = [...wordIds].map((wordId) => ({
    user_id: userId,
    word_id: wordId,
    record_date: date,
    response: records[wordId] ?? null,
    unknown_count: unknownCounts[wordId] ?? 0,
  }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await createClient().from("daily_word_records").upsert(rows.slice(i, i + 500), { onConflict: "user_id,word_id,record_date" });
    if (error) throw error;
  }
}
