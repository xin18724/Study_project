import readingData from "@/data/reading.json";

export default function ReadingListPage() {
  return <main className="app-shell subpage-shell reading-shell">
    <header className="site-header"><a className="brand" href="/"><span className="brand-mark">J</span><span>Junior<span className="brand-light">Study</span></span></a><a className="back-link" href="/reading">← 返回题型分类</a></header>
    <section className="subpage-intro"><span className="section-kicker">READING COMPREHENSION</span><h1>阅读理解</h1><p>选择一篇文章开始单篇精读。</p></section>
    <section className="reading-list">{readingData.map((article, index) => <a className="reading-article-card" href={`/reading/${article.id}`} key={article.id}>
      <span className="reading-article-index">PASSAGE {String(index + 1).padStart(2, "0")}</span><span className="reading-article-info"><strong>{article.title}</strong><small>{article.difficulty} <i>·</i> {article.questions.length} 道题</small></span><span className="reading-article-arrow">开始精读 <b>↗</b></span>
    </a>)}</section>
    <footer className="site-footer"><span>JUNIOR STUDY</span><span>READ · THINK · FIND THE EVIDENCE</span></footer>
  </main>;
}
