export function normalizeFillAnswer(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[’‘]/g, "'")
    .trim()
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .replace(/\bcan't\b/g, "can not")
    .replace(/\bwon't\b/g, "will not")
    .replace(/\bshan't\b/g, "shall not")
    .replace(/n't\b/g, " not")
    .replace(/'re\b/g, " are")
    .replace(/'s\b/g, " is")
    .replace(/'ve\b/g, " have")
    .replace(/'ll\b/g, " will")
    .replace(/'d\b/g, " would")
    .replace(/'m\b/g, " am")
    .replace(/\s+/g, " ")
    .trim();
}
