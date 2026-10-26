"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const amounts = [15, 20, 25, 30];

export default function StudyAmountSelector() {
  const router = useRouter();
  const [amount, setAmount] = useState(15);
  return <main className="app-shell amount-shell">
    <header className="site-header"><a className="brand" href="/"><span className="brand-mark">J</span><span>Junior<span className="brand-light">Study</span></span></a><a className="back-link" href="/">← 首页</a></header>
    <section className="amount-heading"><span className="section-kicker">WORD MEMORY · DAILY PLAN</span><h1>高中必背3500词</h1><p>选择今天想记忆的单词数量</p></section>
    <section className="amount-picker" aria-label="选择学习量"><div className="amount-picker-title"><span>今日学习量</span><small>建议每天循序渐进</small></div><div className="amount-options">{amounts.map((value) => <button key={value} type="button" className={`amount-option ${amount === value ? "amount-option-selected" : ""}`} onClick={() => setAmount(value)} aria-pressed={amount === value}><strong>{value}</strong><span>个单词</span></button>)}</div><div className="amount-range"><span>轻松开始</span><i/><span>挑战更多</span></div><button className="start-button" onClick={() => router.push(`/memory?amount=${amount}`)}>开始记忆 <span>→</span></button></section>
    <p className="amount-note"><span>✦</span> 今日队列会从尚未掌握的词汇中随机生成。</p>
    <footer className="site-footer"><span>JUNIOR STUDY</span><span>一次专注一点，记忆更牢固。</span></footer>
  </main>;
}
