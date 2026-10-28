"use client";

import { useState } from "react";
import { normalizeFillAnswer } from "@/components/grammar/normalizeFillAnswer";
import { markGrammarFillCompleted } from "@/components/grammar/grammarFillProgress";

type GrammarGap = {
  number: number;
  prompt?: string;
  answer: string;
  explanation: { context: string; grammar: string; reason: string };
};
type GrammarFillArticle = { id: string; title: string; paragraphs: string[]; gaps: GrammarGap[] };

export default function GrammarFillPractice({ article }: { article: GrammarFillArticle }) {
  const [answers, setAnswers] = useState<string[]>(article.gaps.map(() => ""));
  const [submitted, setSubmitted] = useState(false);
  const complete = answers.every((answer) => answer.trim().length > 0);
  const isCorrect = (index: number) => normalizeFillAnswer(answers[index]) === normalizeFillAnswer(article.gaps[index].answer);

  function submit() {
    if (!complete) return;
    markGrammarFillCompleted(article.id);
    setSubmitted(true);
  }

  function renderParagraph(paragraph: string, paragraphIndex: number) {
    return paragraph.split(/(__\d+__)/g).map((part, partIndex) => {
      const match = part.match(/^__(\d+)__$/);
      if (!match) return <span key={`${paragraphIndex}-${partIndex}`}>{part}</span>;
      const gapIndex = Number(match[1]) - 1;
      const gap = article.gaps[gapIndex];
      const correct = submitted && isCorrect(gapIndex);
      const incorrect = submitted && !correct;
      return <span className={`grammar-fill-inline-gap${correct ? " is-correct" : ""}${incorrect ? " is-incorrect" : ""}`} key={`${paragraphIndex}-${partIndex}`}>
        <b>{String(gap.number).padStart(2, "0")}</b>
        <input type="text" aria-label={`第 ${gap.number} 空`} value={answers[gapIndex]} disabled={submitted} onChange={(event) => setAnswers((current) => current.map((answer, index) => index === gapIndex ? event.target.value : answer))} />
        {gap.prompt && <span className="grammar-fill-prompt">({gap.prompt})</span>}
        {submitted && <span className="grammar-fill-mark">{correct ? "✓" : "×"}</span>}
      </span>;
    });
  }

  return <div className="grammar-fill-practice">
    <section className="grammar-fill-passage" aria-label="语法填空短文">{article.paragraphs.map((paragraph, index) => <p key={index}>{renderParagraph(paragraph, index)}</p>)}</section>
    {!submitted ? <div className="reading-submit-row grammar-fill-submit"><span>{answers.filter((answer) => answer.trim()).length} / {article.gaps.length} 空已填写</span><button type="button" className="primary-button" onClick={submit} disabled={!complete}>提交答案 <span>→</span></button></div> : <section className="grammar-fill-results" aria-label="答案解析">
      <div className="reading-quiz-heading"><span className="section-kicker">ANSWER REVIEW</span><h2>答案与解析</h2><p>对照语境、语法结构和标准答案，理解每个空的判断依据。</p></div>
      {article.gaps.map((gap, index) => <article className={`grammar-fill-explanation${isCorrect(index) ? "" : " is-incorrect"}`} key={gap.number}>
        <strong>第 {gap.number} 空 · {isCorrect(index) ? "回答正确" : "回答错误"}</strong>
        <p className="grammar-fill-answer-line">你的答案：<b>{answers[index]}</b><span>标准答案：<b>{gap.answer}</b></span></p>
        <div><b>语境</b><p>{gap.explanation.context}</p></div>
        <div><b>语法点</b><p>{gap.explanation.grammar}</p></div>
        <div><b>填词理由</b><p>{gap.explanation.reason}</p></div>
      </article>)}
      <button className="reading-restart-button" type="button" onClick={() => { setAnswers(article.gaps.map(() => "")); setSubmitted(false); }}>再做一次 <span>↻</span></button>
    </section>}
  </div>;
}
