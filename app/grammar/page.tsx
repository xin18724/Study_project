"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import grammarData from "@/data/grammar.json";

type Question = { id: string; type?: "choice" | "fill"; stem: string; options?: string[]; answer?: number; answerText?: string; explanation: string; optionExplanations?: string[] };
type Topic = { id: string; category: string; title: string; description: string; lesson: { rule: string; tip: string; examples: { sentence: string; translation: string }[] }; questions: Question[] };
type TopicProgress = { completed: number; correct: number; weak: boolean };
type Progress = Record<string, TopicProgress>;
const topics = grammarData.topics as Topic[];
const storageKey = "junior-study-grammar-progress-v1";

function readProgress(): Progress {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "{}") as Progress;
    let changed = false;
    for (const topic of topics) {
      const item = stored[topic.id];
      if (!item) continue;
      const oldCompleted = Math.max(0, item.completed || 0);
      const oldCorrect = Math.max(0, Math.min(oldCompleted, item.correct || 0));
      const completed = Math.min(topic.questions.length, oldCompleted);
      if (completed !== oldCompleted || oldCorrect !== item.correct) {
        // Legacy entries counted repeated submissions. Keep their approximate
        // rate while limiting the displayed attempted-question count.
        const rate = oldCompleted ? oldCorrect / oldCompleted : 0;
        stored[topic.id] = { ...item, completed, correct: Math.min(completed, Math.round(rate * completed)) };
        changed = true;
      }
    }
    if (changed) localStorage.setItem(storageKey, JSON.stringify(stored));
    return stored;
  } catch { return {}; }
}

function normalizeFillAnswer(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[’‘]/g, "'")
    .trim()
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .replace(/\bcan't\b/g, "can not")
    .replace(/\bwon't\b/g, "will not")
    .replace(/\bshan't\b/g, "shall not")
    .replace(/n't\b/g, " not")
    .replace(/'re\b/g, " are")
    .replace(/'s\b/g, " is")
    .replace(/'ve\b/g, " have")
    .replace(/'ll\b/g, " will")
    .replace(/'d\b/g, " would")
    .replace(/'m\b/g, " am")
    .replace(/\s+/g, " ")
    .trim();
}

function GrammarExperience() {
  const router = useRouter();
  const search = useSearchParams();
  const view = search.get("view") || "list";
  const topicId = search.get("topic") || topics[0].id;
  const topic = topics.find((item) => item.id === topicId) || topics[0];
  const [progress, setProgress] = useState<Progress>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [fillAnswer, setFillAnswer] = useState("");
  const [fillChecked, setFillChecked] = useState(false);
  const [fillRevealed, setFillRevealed] = useState(false);
  const [attemptCorrect, setAttemptCorrect] = useState(0);
  // The topic can change before the reset effect runs, so the old index may
  // briefly be outside the new topic's question list during that render.
  const question = topic.questions[questionIndex] ?? topic.questions[0];
  const isFillQuestion = question.type === "fill";
  const isAnswered = isFillQuestion ? fillChecked || fillRevealed : selected !== null;
  const isCorrect = isFillQuestion
    ? fillChecked && normalizeFillAnswer(fillAnswer) === normalizeFillAnswer(question.answerText || "")
    : selected === question.answer;

  useEffect(() => setProgress(readProgress()), []);
  useEffect(() => { setQuestionIndex(0); setSelected(null); setFillAnswer(""); setFillChecked(false); setFillRevealed(false); setAttemptCorrect(0); }, [view, topicId]);

  const navigate = (nextView: string, id = topic.id) => router.push(nextView === "list" ? "/grammar" : `/grammar?view=${nextView}&topic=${id}`);
  const recordAnswer = (correct: boolean) => {
    const currentCorrect = attemptCorrect + (correct ? 1 : 0);
    setAttemptCorrect(currentCorrect);
    if (questionIndex !== topic.questions.length - 1) return;

    const next = readProgress();
    next[topic.id] = {
      completed: topic.questions.length,
      correct: currentCorrect,
      weak: currentCorrect < topic.questions.length,
    };
    localStorage.setItem(storageKey, JSON.stringify(next));
    setProgress(next);
  };
  const answerQuestion = (optionIndex: number) => {
    if (selected !== null) return;
    setSelected(optionIndex);
    recordAnswer(optionIndex === question.answer);
  };
  const checkFillAnswer = () => {
    if (!fillAnswer.trim() || isAnswered) return;
    const correct = normalizeFillAnswer(fillAnswer) === normalizeFillAnswer(question.answerText || "");
    setFillChecked(true);
    recordAnswer(correct);
  };
  const revealFillAnswer = () => {
    if (isAnswered) return;
    setFillRevealed(true);
    recordAnswer(false);
  };
  const goToNextQuestion = () => {
    if (questionIndex + 1 < topic.questions.length) {
      setQuestionIndex(questionIndex + 1);
      setSelected(null);
      setFillAnswer("");
      setFillChecked(false);
      setFillRevealed(false);
    } else navigate("list");
  };
  const stats = progress[topic.id] || { completed: 0, correct: 0, weak: false };
  const rate = stats.completed ? Math.round(stats.correct / stats.completed * 100) : 0;
  const passed = stats.completed > 0 && rate >= 80;
  const totalCompleted = useMemo(() => Object.values(progress).reduce((sum, item) => sum + item.completed, 0), [progress]);

  return <main className="app-shell subpage-shell grammar-shell">
    <header className="site-header"><a className="brand" href="/"><span className="brand-mark">J</span><span>Junior<span className="brand-light">Study</span></span></a><a className="back-link" href="/">返回首页　↗</a></header>

    {view === "lesson" ? <>
      <div className="grammar-breadcrumb"><button onClick={() => navigate("list")}>语法考点</button><span> / </span>{topic.category}</div>
      <section className="grammar-lesson-header"><div className="section-kicker">GRAMMAR · {topic.category}</div><h1>{topic.title}</h1><p>{topic.description}</p></section>
      <section className="lesson-panel"><div className="lesson-label"><span>核心规则</span><i>01 / RULE</i></div><p className="lesson-rule">{topic.lesson.rule}</p><div className="lesson-examples">{topic.lesson.examples.map((example) => <div className="lesson-example" key={example.sentence}><strong>{example.sentence}</strong><span>{example.translation}</span></div>)}</div><div className="lesson-tip"><b>记忆提示</b><span>{topic.lesson.tip}</span></div></section>
      <section className="lesson-start"><div><strong>{topic.questions.length} 道基础巩固题</strong><span>单选与填空结合，每题都有详细解析</span></div><button className="primary-button" onClick={() => navigate("quiz")}>开始练习 <span>→</span></button></section>
    </> : view === "quiz" ? <>
      <div className="quiz-top"><button className="back-link" onClick={() => navigate("lesson")}>← 返回讲解</button><span>{topic.category}　·　{questionIndex + 1} / {topic.questions.length}</span></div>
      <div className="quiz-progress"><i style={{ width: `${(questionIndex + 1) / topic.questions.length * 100}%` }} /></div>
      <section className="quiz-card"><div className="quiz-eyebrow">基础辨析 <span>{isFillQuestion ? "语法填空" : "单选题"}</span></div><h1>{question.stem.split("\n").map((line, index) => <span key={index}>{line}<br /></span>)}</h1>
        {!isFillQuestion && <div className="quiz-options">{(question.options || []).map((option, index) => {
          const isCorrect = index === question.answer;
          const isSelected = selected === index;
          const className = selected === null ? "" : isCorrect ? "option-correct" : isSelected ? "option-wrong" : "option-muted";
          return <button key={option} className={`quiz-option ${className}`} onClick={() => answerQuestion(index)} disabled={selected !== null}><span>{option.slice(0, 1)}</span><b>{option.slice(3)}</b>{selected !== null && isCorrect && <i>✓</i>}{selected !== null && isSelected && !isCorrect && <i>×</i>}</button>;
        })}</div>}
        {isFillQuestion && <div className="fill-answer-area"><div className="fill-input-row"><input aria-label="填写答案" value={fillAnswer} onChange={(event) => setFillAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") checkFillAnswer(); }} placeholder="在这里填写动词的正确形式" disabled={isAnswered} /><button className="primary-button" onClick={checkFillAnswer} disabled={!fillAnswer.trim() || isAnswered}>提交答案</button></div><button className="reveal-answer-button" onClick={revealFillAnswer} disabled={isAnswered}>查看答案</button></div>}
        {isAnswered && <div className={`answer-explanation ${isCorrect ? "answer-right" : "answer-incorrect"}`}><div className="answer-result"><b>{isCorrect ? "回答正确" : fillRevealed ? "参考答案" : "再检查一下"}</b><span>正确答案：{isFillQuestion ? question.answerText : question.options?.[question.answer ?? 0]}</span></div><p>{question.explanation}</p>{!isFillQuestion && <div className="option-analysis"><strong>选项逐一分析</strong>{(question.optionExplanations || []).map((item, index) => <div key={item}><b>{String.fromCharCode(65 + index)}.</b><span>{item}</span></div>)}</div>}{!isCorrect && <div className="wrongbook-button">＋ 已记录到本考点薄弱项</div>}</div>}
        {isAnswered && <button className="next-question" onClick={goToNextQuestion}>{questionIndex + 1 < topic.questions.length ? "下一题" : "完成练习，查看进度"}<span>→</span></button>}
      </section>
    </> : <>
      <section className="subpage-intro grammar-intro"><div className="section-kicker">GRAMMAR FOUNDATION · 高中英语基础语法</div><h1>语法考点</h1><p>从容易混淆的基础规则开始，学一点、练一道、稳一步。</p></section>
      <div className="grammar-overview"><div><span>已完成答题</span><strong>{totalCompleted}</strong><small>道</small></div><p>答题正确率达到 <b>80%</b> 即可通关</p></div>
      <section className="grammar-topic-list">{topics.map((item, index) => {
        const itemProgress = progress[item.id] || { completed: 0, correct: 0, weak: false };
        const itemRate = itemProgress.completed ? Math.round(itemProgress.correct / itemProgress.completed * 100) : 0;
        const isPassed = itemProgress.completed > 0 && itemRate >= 80;
        return <button className="grammar-topic-card" key={item.id} onClick={() => navigate("lesson", item.id)}><span className="grammar-topic-number">0{index + 1}</span><span className="grammar-topic-content"><span className="grammar-topic-category">{item.category}　·　{item.questions.length} 道题</span><strong>{item.title}</strong><span className="grammar-topic-desc">{item.description}</span><span className="topic-progress-track"><i style={{ width: `${itemRate}%` }} /></span><small>已答 {itemProgress.completed} 题　正确率 {itemRate}%</small></span><span className={`topic-status ${isPassed ? "passed" : itemProgress.weak ? "weak" : ""}`}>{isPassed ? "已通关" : itemProgress.weak ? "需加强" : itemProgress.completed ? "练习中" : "未开始"}</span><span className="feature-arrow">→</span></button>;
      })}</section>
    </>}
    <footer className="site-footer"><span>JUNIOR STUDY</span><span>把基础补牢，进步就有迹可循。</span></footer>
  </main>;
}

export default function GrammarPage() {
  return <Suspense fallback={<main className="app-shell subpage-shell"><div className="memory-loading">正在打开语法练习…</div></main>}><GrammarExperience /></Suspense>;
}
