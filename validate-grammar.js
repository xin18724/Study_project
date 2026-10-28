const fs = require("node:fs");
const path = require("node:path");

const filePath =
  process.argv[2] ||
  path.join(__dirname, "data", "grammar-fill.json");

const functionWords = new Set([
  "a", "an", "the",
  "in", "on", "at", "by", "from", "with", "for", "of", "to",
  "and", "but", "or", "if", "whether", "that", "because", "although", "while", "since", "as", "unless",
  "who", "whom", "whose", "which", "where", "when", "why", "how",
]);

function fail(message) {
  throw new Error(message);
}

function countWords(text) {
  return text
    .replace(/__\d+__(?:\([^)]+\))?/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

try {
  const articles = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (!Array.isArray(articles) || articles.length !== 2) {
    fail("文件必须包含 2 篇文章。");
  }

  const articleIds = new Set();

  for (const article of articles) {
    if (!article.id || articleIds.has(article.id)) {
      fail(`文章 id 缺失或重复：${article.id || "(空)"}`);
    }
    articleIds.add(article.id);

    if (!Array.isArray(article.paragraphs) || !Array.isArray(article.gaps)) {
      fail(`${article.id}: paragraphs 和 gaps 必须是数组。`);
    }

    const text = article.paragraphs.join(" ");
    const words = countWords(text);

    if (words < 100 || words > 150) {
      fail(`${article.id}: 正文为 ${words} 词，要求 100–150 词。`);
    }

    if (article.gaps.length !== 5) {
      fail(`${article.id}: 必须恰好有 5 个空。`);
    }

    const ids = article.gaps.map(gap => gap.number);
    if (
      new Set(ids).size !== 5 ||
      [1, 2, 3, 4, 5].some(id => !ids.includes(id))
    ) {
      fail(`${article.id}: gaps 的 number 必须恰好是 1–5，且不能重复。`);
    }

    const prompted = article.gaps.filter(gap =>
      Object.prototype.hasOwnProperty.call(gap, "prompt")
    );
    const unprompted = article.gaps.filter(gap =>
      !Object.prototype.hasOwnProperty.call(gap, "prompt")
    );

    if (prompted.length < 2 || prompted.length > 3) {
      fail(`${article.id}: 有提示词的空必须为 2–3 个。`);
    }
    if (unprompted.length < 2 || unprompted.length > 3) {
      fail(`${article.id}: 无提示词的空必须为 2–3 个。`);
    }

    for (const gap of article.gaps) {
      const hasPrompt = Object.prototype.hasOwnProperty.call(gap, "prompt");
      const escapedPrompt = hasPrompt
        ? escapeRegExp(String(gap.prompt))
        : null;
      const promptPattern = hasPrompt
        ? new RegExp(`__${gap.number}__\\(${escapedPrompt}\\)(?![\\w])`, "g")
        : new RegExp(`__${gap.number}__(?!\\([^)]+\\))`, "g");

      const matches = text.match(promptPattern) || [];
      if (matches.length !== 1) {
        const expected = hasPrompt
          ? `__${gap.number}__(${gap.prompt})`
          : `__${gap.number}__（且不带提示词括号）`;
        fail(`${article.id} 第 ${gap.number} 空：正文必须恰好出现 ${expected}。`);
      }

      if (
        typeof gap.answer !== "string" ||
        !gap.answer.trim() ||
        /\s/.test(gap.answer.trim())
      ) {
        fail(`${article.id} 第 ${gap.number} 空：答案必须是一个词。`);
      }

      if (!hasPrompt) {
        if (!functionWords.has(gap.answer.toLowerCase())) {
          fail(
            `${article.id} 第 ${gap.number} 空：无提示词答案 "${gap.answer}" ` +
            "不在允许的虚词列表中。"
          );
        }
      } else {
        if (typeof gap.prompt !== "string" || !gap.prompt.trim()) {
          fail(`${article.id} 第 ${gap.number} 空：prompt 必须是非空字符串。`);
        }
        if (functionWords.has(gap.prompt.toLowerCase())) {
          fail(`${article.id} 第 ${gap.number} 空：prompt 不能是虚词。`);
        }
      }

      if (
        !gap.explanation ||
        typeof gap.explanation.context !== "string" ||
        typeof gap.explanation.grammar !== "string" ||
        typeof gap.explanation.reason !== "string" ||
        !gap.explanation.context.trim() ||
        !gap.explanation.grammar.trim() ||
        !gap.explanation.reason.trim()
      ) {
        fail(`${article.id} 第 ${gap.number} 空：解析必须包含 context、grammar 和 reason。`);
      }
    }
  }

  console.log(`校验通过：${articles.length} 篇文章，所有空格规则均符合要求。`);
} catch (error) {
  console.error(`校验失败：${error.message}`);
  process.exit(1);
}


