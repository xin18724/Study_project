"use client";

import { useEffect, useState } from "react";

type Question = {
  type: string;
  stem: string;
  options: string[];
  answer: number;
  explanation: string;
  evidence: string;
  optionExplanations: string[];
};
type Paragraph = { segments: { text: string; translation?: string }[] };

export default function ReadingQuiz({ questions, paragraphs }: { questions: Question[]; paragraphs: Paragraph[] }) {
  const [answers, setAnswers] = useState<(number | null)[]>(questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const [activeEvidenceQuestion, setActiveEvidenceQuestion] = useState<number | null>(null);
  const [studentEvidence, setStudentEvidence] = useState<Record<number, string>>({});
  const [selectionNotice, setSelectionNotice] = useState("");
  const [activeTranslation, setActiveTranslation] = useState<string | null>(null);

  useEffect(() => {
    function closeTranslation(event: PointerEvent) {
      if (!(event.target instanceof Element) || !event.target.closest(".long-sentence")) {
        setActiveTranslation(null);
      }
    }
    document.addEventListener("pointerdown", closeTranslation);
    return () => document.removeEventListener("pointerdown", closeTranslation);
  }, []);

  function submit() {
    if (answers.some((answer) => answer === null)) return;
    setSubmitted(true);
  }

  function activateEvidence(questionIndex: number) {
    setActiveEvidenceQuestion(questionIndex);
    setSelectionNotice("");
    setStudentEvidence((current) => {
      const next = { ...current };
      delete next[questionIndex];
      return next;
    });
    document.getElementById("reading-passage")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function captureSelection() {
    if (activeEvidenceQuestion === null) return;
    const selection = window.getSelection()?.toString().trim();
    if (!selection) {
      setSelectionNotice("请在文章正文中拖动鼠标，划出你认为包含答案线索的内容。");
      return;
    }
    setStudentEvidence((current) => ({ ...current, [activeEvidenceQuestion]: selection }));
    setSelectionNotice("");
  }

  return <>
    <section id="reading-passage" className={`reading-passage${activeEvidenceQuestion !== null ? " is-finding-evidence" : ""}`} aria-label="英文短文" onMouseUp={captureSelection} onTouchEnd={captureSelection}>
      {activeEvidenceQuestion !== null && <div className="evidence-instruction">正在为第 {activeEvidenceQuestion + 1} 题找依据：请回到原文，用鼠标划出你认为包含答案线索的句子（可以跨句）。</div>}
      {paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph.segments.map((segment, segmentIndex) => {
        if (!segment.translation) return <span key={segmentIndex}>{segment.text}</span>;
        const isOpen = activeTranslation === `${paragraphIndex}-${segmentIndex}`;
        const translationId = `translation-${paragraphIndex}-${segmentIndex}`;
        return <span className={`long-sentence${isOpen ? " is-open" : ""}`} key={segmentIndex}>
          <button type="button" className="long-sentence-trigger" aria-expanded={isOpen} aria-controls={translationId} onClick={(event) => { event.stopPropagation(); setActiveTranslation(isOpen ? null : `${paragraphIndex}-${segmentIndex}`); }}>{segment.text}</button>
          {isOpen && <span id={translationId} className="long-sentence-translation" role="status">{segment.translation}</span>}
        </span>;
      })}</p>)}
      {selectionNotice && <div className="selection-notice" role="status">{selectionNotice}</div>}
    </section>
    <section className="reading-quiz" aria-label="阅读理解题目">
      <div className="reading-quiz-heading"><span className="section-kicker">ONE PASSAGE · THREE QUESTIONS</span><h2>单篇精读</h2><p>先独立作答；答错后回到原文划出你认为的依据。</p></div>
      {questions.map((question, questionIndex) => {
        const selected = answers[questionIndex];
        const correct = selected === question.answer;
        const drawnEvidence = studentEvidence[questionIndex];
        const answerRevealed = correct || drawnEvidence !== undefined;
        return <article className="reading-question" key={question.stem}>
          <div className="reading-question-label">QUESTION {String(questionIndex + 1).padStart(2, "0")}</div>
          <span className="reading-type-tag">{question.type}</span>
          <h3>{question.stem}</h3>
          <div className="reading-options">{question.options.map((option, optionIndex) => {
            const isCorrect = submitted && answerRevealed && optionIndex === question.answer;
            const isWrong = submitted && selected === optionIndex && !correct;
            const className = `reading-option${selected === optionIndex ? " is-selected" : ""}${isCorrect ? " is-correct" : ""}${isWrong ? " is-wrong" : ""}`;
            return <button className={className} type="button" key={option} disabled={submitted} aria-pressed={selected === optionIndex} onClick={() => setAnswers((current) => current.map((answer, index) => index === questionIndex ? optionIndex : answer))}>
              <span>{String.fromCharCode(65 + optionIndex)}</span><b>{option}</b>{isCorrect && <i>✓</i>}{isWrong && <i>×</i>}
            </button>;
          })}</div>
          {submitted && correct && <div className="reading-explanation">
            <div className="reading-result"><b>回答正确</b><span>正确答案：{String.fromCharCode(65 + question.answer)}. {question.options[question.answer]}</span></div>
            <p>{question.explanation}</p><blockquote><strong>原文依据</strong>{question.evidence}</blockquote>
          </div>}
          {submitted && !correct && <div className="reading-explanation is-incorrect">
            {!drawnEvidence ? <><div className="reading-result"><b>请先回到原文找依据</b><span>划出的内容可以跨句，我们会把它和标准依据并排展示。</span></div><button type="button" className="find-evidence-button" onClick={() => activateEvidence(questionIndex)}>开始划选原文 <span>↑</span></button></> : <>
              <div className="evidence-comparison"><div><strong>这是你划出的依据</strong><p>{drawnEvidence}</p></div><div><strong>这是标准的原文依据</strong><p>{question.evidence}</p></div></div>
              <p className="evidence-reflection">这是你划出的依据，这是标准的原文依据。请对比一下，看看是不是同义替换，或者你找错了段落？</p>
              <div className="reading-result"><b>正确答案：{String.fromCharCode(65 + question.answer)}. {question.options[question.answer]}</b></div>
              <p>{question.explanation}</p>
              <div className="reading-option-analysis"><strong>错因分析</strong>{question.options.map((option, optionIndex) => <div key={option}><b>{String.fromCharCode(65 + optionIndex)}.</b><span>{optionIndex === selected ? `你的选择：“${option}”。${question.optionExplanations[optionIndex]}` : question.optionExplanations[optionIndex]}</span></div>)}</div>
              <button type="button" className="find-evidence-again" onClick={() => activateEvidence(questionIndex)}>重新划选依据</button>
            </>}
          </div>}
        </article>;
      })}
      {!submitted && <div className="reading-submit-row"><span>{answers.filter((answer) => answer !== null).length} / {questions.length} 题已完成</span><button type="button" className="primary-button" onClick={submit} disabled={answers.some((answer) => answer === null)}>提交答案 <span>→</span></button></div>}
      {submitted && <button className="reading-restart-button" type="button" onClick={() => { setAnswers(questions.map(() => null)); setSubmitted(false); setStudentEvidence({}); setActiveEvidenceQuestion(null); }}>再做一次 <span>↻</span></button>}
    </section>
  </>;
}
