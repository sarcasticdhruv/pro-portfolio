// Extracts question/answer pairs from a post's "## FAQ" markdown section, for
// FAQPage JSON-LD. This is worth doing because it's dual-purpose: Google can
// render individual Q&As as rich results in search, and it's the exact shape
// generative answer engines (Perplexity, ChatGPT browsing, AI Overviews) pull
// almost verbatim when citing a source. No DOM/React deps, so it's shared
// between the Vite app (BlogPostPage.tsx) and the plain-Node
// scripts/prerender.mjs, same pattern as relatedPosts.mjs.
export function extractFaqPairs(markdown) {
  const heading = markdown.match(/^##\s+FAQ\s*$/im);
  if (!heading) return [];

  const afterHeading = markdown.slice(heading.index + heading[0].length);
  const nextHeading = afterHeading.match(/^#{1,2}\s+\S/m);
  const section = nextHeading ? afterHeading.slice(0, nextHeading.index) : afterHeading;

  const questionLine = /^\*\*(.+?)\*\*\s*$/gm;
  const questions = [];
  let m;
  while ((m = questionLine.exec(section))) {
    questions.push({ text: m[1].trim(), start: m.index, end: questionLine.lastIndex });
  }

  const pairs = [];
  for (let i = 0; i < questions.length; i++) {
    const answerStart = questions[i].end;
    const answerEnd = i + 1 < questions.length ? questions[i + 1].start : section.length;
    const answer = section.slice(answerStart, answerEnd).trim();
    if (questions[i].text && answer) pairs.push({ question: questions[i].text, answer });
  }
  return pairs;
}
