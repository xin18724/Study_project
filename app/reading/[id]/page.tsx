import readingData from "@/data/reading.json";
import ReadingQuiz from "@/components/reading/ReadingQuiz";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return readingData.map((article) => ({ id: article.id }));
}

export default async function ReadingArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = readingData.find((item) => item.id === id);
  if (!article) notFound();

  return <main className="app-shell subpage-shell reading-shell">
    <header className="site-header"><a className="brand" href="/"><span className="brand-mark">J</span><span>Junior<span className="brand-light">Study</span></span></a><a className="back-link" href="/reading/comprehension">← 返回文章列表</a></header>
    <section className="reading-article-heading"><span className="section-kicker">READING COMPREHENSION · {article.difficulty}</span><h1>{article.title}</h1><p>{article.questions.length} 道单选题 <i>·</i> 建议先读完文章再答题</p></section>
    <ReadingQuiz questions={article.questions} paragraphs={article.paragraphs} />
    <footer className="site-footer"><span>JUNIOR STUDY</span><span>READ · THINK · FIND THE EVIDENCE</span></footer>
  </main>;
}
