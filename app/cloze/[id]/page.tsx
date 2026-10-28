import clozeData from "@/data/cloze.json";
import ClozePractice from "@/components/reading/ClozePractice";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return clozeData.map((article) => ({ id: article.id }));
}

export default async function ClozeArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = clozeData.find((item) => item.id === id);
  if (!article) notFound();

  return <main className="app-shell subpage-shell cloze-shell">
    <header className="site-header"><a className="brand" href="/"><span className="brand-mark">J</span><span>Junior<span className="brand-light">Study</span></span></a><a className="back-link" href="/cloze">← 返回完形文章列表</a></header>
    <section className="reading-article-heading"><span className="section-kicker">CLOZE · {article.difficulty}</span><h1>{article.title}</h1><p>{article.questions.length} 个空 <i>·</i> 结合上下文线索完成短文</p></section>
    <ClozePractice article={article} />
    <footer className="site-footer"><span>JUNIOR STUDY</span><span>READ THE CONTEXT · CHOOSE WITH REASONS</span></footer>
  </main>;
}
