"use client";

import { useEffect, useState } from "react";
import grammarFillData from "@/data/grammar-fill.json";
import { readCompletedGrammarFill } from "@/components/grammar/grammarFillProgress";

export default function GrammarFillListPage() {
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  useEffect(() => setCompletedIds(readCompletedGrammarFill()), []);

  return <main className="app-shell subpage-shell grammar-fill-shell">
    <header className="site-header"><a className="brand" href="/"><span className="brand-mark">J</span><span>Junior<span className="brand-light">Study</span></span></a><a className="back-link" href="/reading">← 返回题型分类</a></header>
    <section className="subpage-intro"><span className="section-kicker">GRAMMAR FILL-IN</span><h1>语法填空</h1><p>在语境中运用语法知识，完成短文练习。</p></section>
    <section className="reading-list">{grammarFillData.map((article, index) => {
      const completed = completedIds.includes(article.id);
      return <a className={`grammar-fill-article-card${completed ? " is-completed" : ""}`} href={`/grammar-fill/${article.id}`} key={article.id}>
        {completed && <span className="grammar-fill-completed-badge">✓ 已练习</span>}
        <span className="cloze-article-index">ARTICLE {String(index + 1).padStart(2, "0")}</span>
        <span className="cloze-article-info"><strong>{article.title}</strong><small>{article.difficulty} · {article.gaps.length} 个空</small></span>
        <span className="cloze-article-arrow">{completed ? "重新练习" : "开始练习"} <b>↗</b></span>
      </a>;
    })}</section>
    <footer className="site-footer"><span>JUNIOR STUDY</span><span>NOTICE THE CONTEXT · CHECK THE GRAMMAR</span></footer>
  </main>;
}
