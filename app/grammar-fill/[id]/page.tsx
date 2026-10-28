import grammarFillData from "@/data/grammar-fill.json";
import GrammarFillPractice from "@/components/grammar/GrammarFillPractice";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return grammarFillData.map((article) => ({ id: article.id }));
}

export default async function GrammarFillArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = grammarFillData.find((item) => item.id === id);
  if (!article) notFound();

  return <main className="app-shell subpage-shell grammar-fill-shell">
    <header className="site-header"><a className="brand" href="/"><span className="brand-mark">J</span><span>Junior<span className="brand-light">Study</span></span></a><a className="back-link" href="/grammar-fill">← 返回语法填空列表</a></header>
    <section className="reading-article-heading"><span className="section-kicker">GRAMMAR FILL · {article.difficulty}</span><h1>{article.title}</h1><p>{article.gaps.length} 个空 <i>·</i> 根据语境和语法填写答案</p></section>
    <GrammarFillPractice article={article} />
    <footer className="site-footer"><span>JUNIOR STUDY</span><span>NOTICE THE CONTEXT · CHECK THE GRAMMAR</span></footer>
  </main>;
}
