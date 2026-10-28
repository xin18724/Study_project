const categories = [
  { title: "阅读理解", description: "单篇精读，练习回到原文寻找依据。", href: "/reading/comprehension", status: "开始练习", active: true, icon: "▤" },
  { title: "完形填空", description: "结合上下文，理解词义与篇章逻辑。", href: "/cloze", status: "开始练习", active: true, icon: "✳" },
  { title: "语法填空", description: "在语篇中运用语法知识。", href: "/grammar-fill", status: "开始练习", active: true, icon: "Aa" },
];

export default function ReadingPage() {
  return <main className="app-shell subpage-shell reading-shell">
    <header className="site-header"><a className="brand" href="/"><span className="brand-mark">J</span><span>Junior<span className="brand-light">Study</span></span></a><a className="back-link" href="/">← 返回首页</a></header>
    <section className="subpage-intro"><span className="section-kicker">READING PRACTICE</span><h1>选择题型</h1><p>按题型进行针对练习，一次专注读懂一篇文章。</p></section>
    <section className="reading-category-list">{categories.map((item, index) => {
      const body = <><span className="reading-category-number">0{index + 1}</span><span className="reading-category-icon">{item.icon}</span><span className="reading-category-copy"><strong>{item.title}</strong><small>{item.description}</small></span><span className={`reading-category-status${item.active ? "" : " is-coming"}`}>{item.status}</span><span className="feature-arrow">{item.active ? "↗" : "· · ·"}</span></>;
      return item.active ? <a className="reading-category-card" href={item.href} key={item.title}>{body}</a> : <div className="reading-category-card is-disabled" key={item.title} aria-label={`${item.title}，${item.status}`}>{body}</div>;
    })}</section>
    <footer className="site-footer"><span>JUNIOR STUDY</span><span>READ · THINK · FIND THE EVIDENCE</span></footer>
  </main>;
}
