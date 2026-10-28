"use client";

import { useEffect, useState } from "react";
import clozeData from "@/data/cloze.json";
import { readCompletedClozes } from "@/components/reading/clozeProgress";

export default function ClozePage() {
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  useEffect(() => setCompletedIds(readCompletedClozes()), []);

  return <main className="app-shell subpage-shell cloze-shell">
    <header className="site-header"><a className="brand" href="/"><span className="brand-mark">J</span><span>Junior<span className="brand-light">Study</span></span></a><a className="back-link" href="/reading">← 返回题型分类</a></header>
    <section className="subpage-intro"><span className="section-kicker">CLOZE PRACTICE</span><h1>完形填空</h1><p>选择一篇文章开始练习上下文逻辑与词义判断。</p></section>
    <section className="reading-list">{clozeData.map((article, index) => {
      const completed = completedIds.includes(article.id);
      return <a className={`cloze-article-card${completed ? " is-completed" : ""}`} href={`/cloze/${article.id}`} key={article.id}>
        {completed && <span className="cloze-completed-badge">✓ 已练习</span>}
        <span className="cloze-article-index">CLOZE {String(index + 1).padStart(2, "0")}</span>
        <span className="cloze-article-info"><strong>{article.title}</strong><small>{article.difficulty} · {article.questions.length} 个空</small></span>
        <span className="cloze-article-arrow">{completed ? "重新练习" : "开始练习"} <b>↗</b></span>
      </a>;
    })}</section>
    <footer className="site-footer"><span>JUNIOR STUDY</span><span>READ THE CONTEXT · CHOOSE WITH REASONS</span></footer>
  </main>;
}
