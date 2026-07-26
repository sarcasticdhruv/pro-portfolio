// Static, always-visible example questions shown on /search - the same
// content every visitor (human or crawler) sees, so the page has real
// indexable substance instead of an empty shell. Imported by SearchPage.tsx
// (client UI) and scripts/prerender.mjs (build-time static HTML + JSON-LD)
// so both stay in sync from one source. `.mjs` (not `.ts`) so the plain
// Node build script can import it directly with no loader.
//
// `answerSummary` describes the KIND of answer the live agent gives - it is
// authored copy, not a captured/literal response from a real search run.
export const SEARCH_EXAMPLES = [
  {
    question: 'What projects has Dhruv built?',
    answerSummary: 'A grounded summary of his shipped work - GenAI platforms, RAG systems, and production ML - pulled from the site\'s own project and experience content, with links back to the relevant pages.',
  },
  {
    question: 'What is RAG and when does it fail?',
    answerSummary: 'A plain-language explanation of retrieval-augmented generation, plus the common failure modes (stale indexes, poor chunking, retrieval mismatch) drawn from current web sources.',
  },
  {
    question: 'What is his experience with GenAI in production?',
    answerSummary: 'A synthesis of his GenAI engineering roles and shipped systems, citing specific projects and the problems they solved.',
  },
  {
    question: 'Explain agentic AI in simple terms',
    answerSummary: 'A short, jargon-free explanation of what makes an AI system "agentic" versus a single LLM call, with real-world examples.',
  },
  {
    question: 'What is semantic caching for LLMs?',
    answerSummary: 'A concise technical explanation of semantic caching, why it cuts latency and cost, and where it tends to break down.',
  },
  {
    question: 'How do I contact Dhruv?',
    answerSummary: 'Direct contact details and links pulled straight from the site\'s contact section.',
  },
];
