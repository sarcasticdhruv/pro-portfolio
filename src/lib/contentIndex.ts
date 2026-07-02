// Searchable index over everything on the site: blog posts (full markdown,
// already bundled by blog.ts) plus static records mirroring the home page
// sections. Pure client-side keyword scoring - no API calls.
import { ALL_POSTS } from './blog';

export interface ContentRecord {
  id: string;
  kind: 'blog' | 'project' | 'experience' | 'skills' | 'achievement' | 'about';
  title: string;
  url: string; // internal route or hash link
  tags: string[];
  text: string;
}

export interface ScoredMatch {
  record: ContentRecord;
  score: number;
  snippet: string;
}

const STATIC_RECORDS: ContentRecord[] = [
  {
    id: 'about',
    kind: 'about',
    title: 'About Dhruv Choudhary',
    url: '/#about',
    tags: ['bio', 'about', 'dhruv'],
    text: `Dhruv Choudhary (@sarcasticdhruv) is an AI Engineer at AI LifeBOT (Ignited Wings
Technology). B.Tech IT (IoT) at MITS Gwalior, CGPA 8.94, Department Rank 2, graduating May 2026.
Based across Bhopal, Raipur and Hyderabad. Builds GenAI solutions that ship to production.
Email nrdhruv654@gmail.com, GitHub github.com/sarcasticdhruv,
LinkedIn linkedin.com/in/dhruv-choudhary-india, Twitter @SarcasticDhruv.`,
  },
  {
    id: 'exp-ai-lifebot',
    kind: 'experience',
    title: 'AI Engineer @ AI LifeBOT (Nov 2025-Present)',
    url: '/#experience',
    tags: ['experience', 'work', 'job', 'genai'],
    text: `AI Engineer (GenAI Solutions) at AI LifeBOT, Ignited Wings Technology, Nov 2025 to
present. Built a GPT-based enterprise knowledge base on AWS for CHMSCL. Built an AI Grievance
Management System for DPDMIS on Oracle Cloud (OCI). Contributed .NET code to the EMIS live
production system.`,
  },
  {
    id: 'exp-intern',
    kind: 'experience',
    title: 'AI Engineer Intern @ AI LifeBOT (Oct 2024-Oct 2025)',
    url: '/#experience',
    tags: ['experience', 'internship', 'intern'],
    text: `AI Engineer Intern at AI LifeBOT, Oct 2024 to Oct 2025. Built an SEO Automation Agent
that increased lead coverage 35 percent. Built an OCR Invoice Validator that cut manual effort
60 percent. Worked on a no-code omnichannel chatbot builder platform.`,
  },
  {
    id: 'proj-helix',
    kind: 'project',
    title: 'Helix Framework',
    url: '/#projects',
    tags: ['Python', 'AI Agents', 'LLM', 'Framework', 'PyPI', 'open source', 'project'],
    text: `Helix is a Python framework for building production AI agents, comparable to CrewAI,
AutoGen, LangChain and LangGraph. Published on PyPI as helix-framework (pip install
helix-framework). Gives agents that behave in production: hard budget limits and cost
governance, semantic caching that cuts API costs 40 to 70 percent, persistent memory,
multi-agent teams, group chat, YAML-based task pipelines, workflows, sessions and a 5-scorer
evaluation suite. Works out of the box with OpenAI, Anthropic, Gemini, Groq, Mistral and
8 other providers. GitHub github.com/sarcasticdhruv/helix-agent, PyPI
pypi.org/project/helix-framework.`,
  },
  {
    id: 'proj-kisaan',
    kind: 'project',
    title: 'AI Kisaan Sahayak',
    url: '/#projects',
    tags: ['Python', 'Langgraph', 'YOLO', 'TypeScript', 'Multimodal AI', 'project'],
    text: `Voice-first agricultural AI assistant for farmers in 10+ languages. Built with
Langgraph and YOLO-LF. Voice control, on-demand crop image capture, cloud vision for pest and
disease diagnosis, real-time market data and government scheme queries. RAG plus LLM.`,
  },
  {
    id: 'proj-brain-tumor',
    kind: 'project',
    title: 'Brain Tumor Detection',
    url: '/#projects',
    tags: ['Python', 'CNN', 'ResNet-18', 'TensorFlow', 'OpenCV', 'project', 'research'],
    text: `Deep learning MRI brain tumor classification using an enhanced CNN with attention
mechanisms and ResNet-18. Published at IEEE International Conference MPCON-2025, Jabalpur.`,
  },
  {
    id: 'proj-boardbrief',
    kind: 'project',
    title: 'BoardBrief',
    url: '/#projects',
    tags: ['JavaScript', 'Python', 'Node.js', 'MongoDB', 'project'],
    text: `AI meeting summarizer with CRM integration. Processes meeting recordings and
transcripts into concise summaries with actionable next steps and automated CRM logging.`,
  },
  {
    id: 'proj-fire-notes',
    kind: 'project',
    title: 'Fire Notes',
    url: '/#projects',
    tags: ['React', 'Firebase', 'CSS', 'project'],
    text: `Real-time note-taking app with secure Firebase cloud sync, authentication and a
clean React UI. Live on the web.`,
  },
  {
    id: 'skills',
    kind: 'skills',
    title: 'Skills & Stack',
    url: '/#skills',
    tags: ['skills', 'stack', 'tech'],
    text: `Languages: Python, C, C++, TypeScript, JavaScript, SQL. AI/ML: PyTorch, TensorFlow,
OpenCV, Langgraph, YOLO, LLM finetuning, RAG, agentic AI. Backend: REST APIs, MongoDB, Redis,
PostgreSQL, microservices. Cloud and DevOps: AWS, GCP, OCI, Docker, Kubernetes, CI/CD, GitHub
Actions. Frontend: React, React Native. Tools: Playwright, Puppeteer, Postman, Retool.`,
  },
  {
    id: 'achievements',
    kind: 'achievement',
    title: 'Achievements & Certifications',
    url: '/#achievements',
    tags: ['achievements', 'certifications', 'awards'],
    text: `IEEE MPCON-2025 published paper on brain tumor classification. Live demo to Union
Minister Jyotiraditya Scindia at IMC 2025. Odoo Hackathon functional prototype in 6 hours.
Google Cyber Security certification 96.83 percent. Kaggle Machine Learning certification.
Google Cloud certifications: GenAI apps with Gemini, Cloud Vision API, compute basics,
Gen AI Study Jams.`,
  },
  {
    id: 'contact',
    kind: 'about',
    title: 'Contact',
    url: '/#contact',
    tags: ['contact', 'email', 'hire', 'reach'],
    text: `Reach Dhruv at nrdhruv654@gmail.com, GitHub github.com/sarcasticdhruv, LinkedIn
linkedin.com/in/dhruv-choudhary-india, Twitter @SarcasticDhruv, Linktree
linktr.ee/Dhruv.Choudhary. Open to AI engineering opportunities.`,
  },
];

// Strip the markdown syntax that would pollute snippets (links, code fences, headings)
function stripMd(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildIndex(): ContentRecord[] {
  const blogRecords: ContentRecord[] = ALL_POSTS.map(p => ({
    id: `blog-${p.slug}`,
    kind: 'blog',
    title: p.title,
    url: `/blog/${p.slug}`,
    tags: p.tags,
    text: `${p.excerpt} ${stripMd(p.content)}`,
  }));
  return [...STATIC_RECORDS, ...blogRecords];
}

// Built once at module load - all content is bundled, nothing async.
export const CONTENT_INDEX: ContentRecord[] = buildIndex();

// Generic words that would otherwise match half the index
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'these', 'those', 'what',
  'when', 'where', 'which', 'who', 'why', 'how', 'about', 'tell', 'does', 'has',
  'have', 'had', 'was', 'were', 'are', 'can', 'could', 'would', 'should', 'his',
  'her', 'him', 'you', 'your', 'their', 'they', 'them', 'its', 'it', 'is', 'me',
  'more', 'most', 'some', 'any', 'all', 'into', 'out', 'over', 'under', 'used',
  'use', 'uses', 'using', 'made', 'make', 'makes', 'built', 'build', 'builds',
  'work', 'works', 'working', 'like', 'also', 'been', 'being', 'will', 'other',
]);

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t));
}

function makeSnippet(text: string, tokens: string[]): string {
  const lower = text.toLowerCase();
  let pos = -1;
  for (const t of tokens) {
    pos = lower.indexOf(t);
    if (pos !== -1) break;
  }
  if (pos === -1) pos = 0;
  const start = Math.max(0, pos - 60);
  const slice = text.slice(start, start + 220).trim();
  return `${start > 0 ? '…' : ''}${slice}…`;
}

export function searchContent(query: string, limit = 4): ScoredMatch[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const scored: ScoredMatch[] = CONTENT_INDEX.map(record => {
    const title = record.title.toLowerCase();
    const tags = record.tags.join(' ').toLowerCase();
    const text = record.text.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (title.includes(t)) score += 4;
      if (tags.includes(t)) score += 3;
      // Count body occurrences, capped so one long doc doesn't dominate
      let idx = text.indexOf(t);
      let hits = 0;
      while (idx !== -1 && hits < 5) {
        hits++;
        idx = text.indexOf(t, idx + t.length);
      }
      score += hits;
    }
    return { record, score, snippet: '' };
  })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(m => ({ ...m, snippet: makeSnippet(m.record.text, tokens) }));
}
