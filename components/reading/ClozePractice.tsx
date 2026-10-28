"use client";

import { useState } from "react";
import { markClozeCompleted } from "@/components/reading/clozeProgress";

type ClozeQuestion = {
  number: number;
  stem: string;
  options: string[];
  answer: number;
  explanation: {
    contextLogic: string;
    optionAnalysis: string;
    translation?: string;
  };
};
type ClozeArticle = { id: string; title: string; paragraphs: string[]; questions: ClozeQuestion[] };

export default function ClozePractice({ article }: { article: ClozeArticle }) {
  const [answers, setAnswers] = useState<(number | null)[]>(article.questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const allAnswered = answers.every((answer) => answer !== null);

  function submit() {
    if (!allAnswered) return;
    markClozeCompleted(article.id);
    setSubmitted(true);
  }

  function renderParagraph(paragraph: string, paragraphIndex: number) {
    return paragraph.split(/(__\d+__)/g).map((part, partIndex) => {
      const match = part.match(/^__(\d+)__$/);
      if (!match) return <span key={`${paragraphIndex}-${partIndex}`}>{part}</span>;
      const questionIndex = Number(match[1]) - 1;
      const selected = answers[questionIndex];
      const question = article.questions[questionIndex];
      const correct = submitted && selected === question.answer;
      const wrong = submitted && !correct;
      return <span className={`cloze-inline-blank${correct ? " is-correct" : ""}${wrong ? " is-wrong" : ""}`} key={`${paragraphIndex}-${partIndex}`}>
        <b>{String(match[1]).padStart(2, "0")}</b>{selected === null ? "______" : question.options[selected]}
      </span>;
    });
  }

  return <div className="cloze-practice">
    <section className="cloze-passage" aria-label="完形填空短文">{article.paragraphs.map((paragraph, index) => <p key={index}>{renderParagraph(paragraph, index)}</p>)}</section>
    <section className="cloze-questions" aria-label="完形填空选项">
      <div className="reading-quiz-heading"><span className="section-kicker">CHOOSE THE BEST WORD</span><h2>选择答案</h2><p>观察前后文的逻辑关系，再选择最合适的词。</p></div>
      {article.questions.map((question, questionIndex) => <article className="cloze-question" key={question.number}>
        <div className="cloze-question-heading"><span>空格 {String(question.number).padStart(2, "0")}</span><p>{question.stem}</p></div>
        <div className="cloze-options">{question.options.map((option, optionIndex) => {
          const selected = answers[questionIndex] === optionIndex;
          const correct = submitted && optionIndex === question.answer;
          const wrong = submitted && selected && !correct;
          return <button type="button" key={option} className={`cloze-option${selected ? " is-selected" : ""}${correct ? " is-correct" : ""}${wrong ? " is-wrong" : ""}`} disabled={submitted} aria-pressed={selected} onClick={() => setAnswers((current) => current.map((answer, index) => index === questionIndex ? optionIndex : answer))}>
            <span>{String.fromCharCode(65 + optionIndex)}</span>{option}{correct && <b>✓</b>}{wrong && <b>×</b>}
          </button>;
        })}</div>
        {submitted && <div className={`cloze-explanation${answers[questionIndex] === question.answer ? "" : " is-incorrect"}`}>
          <strong>{answers[questionIndex] === question.answer ? "回答正确" : "回答错误"} · 正确答案：{String.fromCharCode(65 + question.answer)}. {question.options[question.answer]}</strong>
          <div className="cloze-explanation-section"><b>上下文逻辑线索</b><p>{question.explanation.contextLogic}</p></div>
          <div className="cloze-explanation-section"><b>词汇 / 短语辨析</b><p>{question.explanation.optionAnalysis}</p></div>
          {question.explanation.translation && <div className="cloze-translation"><b>句意参考</b><p>{question.explanation.translation}</p></div>}
        </div>}
      </article>)}
      {!submitted ? <div className="reading-submit-row"><span>{answers.filter((answer) => answer !== null).length} / {article.questions.length} 空已完成</span><button type="button" className="primary-button" onClick={submit} disabled={!allAnswered}>提交答案 <span>→</span></button></div> : <button className="reading-restart-button" type="button" onClick={() => { setAnswers(article.questions.map(() => null)); setSubmitted(false); }}>再做一次 <span>↻</span></button>}
    </section>
  </div>;
}
