const features = [
  { number: "01", title: "单词记忆", description: "按自己的节奏记忆高中必背词汇。", href: "/study", icon: "Aa", tone: "feature-active", tag: "开始学习" },
  { number: "02", title: "学习进度", description: "查看已掌握词汇与今天的记忆记录。", href: "/progress", icon: "↗", tone: "feature-active", tag: "查看进度" },
  { number: "03", title: "语法练习", description: "整理语法要点，逐步补齐知识断层。", href: "/grammar", icon: "✳", tone: "feature-active", tag: "开始练习" },
  { number: "04", title: "阅读训练", description: "练习定位信息，建立更稳定的阅读方法。", href: "/reading", icon: "▤", tone: "feature-active", tag: "开始练习" },
];

export default function HomePage() {
  return <main className="app-shell home-shell">
    <header className="site-header"><a className="brand" href="/"><span className="brand-mark">J</span><span>Junior<span className="brand-light">Study</span></span></a><span className="header-caption">为每一次进步，搭一块踏实的台阶</span></header>
    <section className="home-hero"><div className="hero-kicker"><span className="kicker-line"/> HIGH SCHOOL ENGLISH · STUDY SPACE</div><h1>今天，向目标<br/><em>再靠近一点。</em></h1><p>从高频词开始，把英语学习拆成清晰、可完成的小步。</p><div className="hero-stamp"><span>01</span><small>从这里<br/>开始</small><b>↘</b></div></section>
    <section className="feature-section"><div className="feature-heading"><div><span className="section-kicker">YOUR STUDY TOOLS</span><h2>选择一个学习方向</h2></div><span className="feature-count">01 <i> / 04</i></span></div><div className="feature-list">{features.map((feature) => <a className={`feature-card ${feature.tone}`} href={feature.href} key={feature.number} aria-disabled={feature.tone === "feature-muted"}><span className="feature-number">{feature.number}</span><span className="feature-icon">{feature.icon}</span><span className="feature-copy"><strong>{feature.title}</strong><small>{feature.description}</small></span><span className="feature-tag">{feature.tag}</span><span className="feature-arrow">↗</span></a>)}</div></section>
    <footer className="site-footer"><span>JUNIOR STUDY</span><span>每天一点积累，离目标更近一步。</span></footer>
  </main>;
}
