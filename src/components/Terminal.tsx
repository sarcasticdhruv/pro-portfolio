import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from 'react';

import { Maximize2, Minimize2, X, Terminal as TermIcon } from 'lucide-react';
import type { GitHubStats } from '../types';

interface Props {
  github: GitHubStats;
  onClose?: () => void;
  isFloating?: boolean;
}

type LineType = 'cmd' | 'out' | 'err' | 'blank' | 'neofetch';

interface Line {
  id: string;
  type: LineType;
  content: React.ReactNode;
  cwd?: string;
  cmdText?: string;
}

const GROQ_MODEL = 'llama-3.1-8b-instant';
const USERNAME = 'dhruv';
const HOSTNAME = 'arch';
const PAGE_LOAD_TIME = Date.now();

let lineId = 0;
const lid = () => String(lineId++);

// Virtual filesystem
const VFS: Record<string, string[]> = {
  '~': ['README.md', 'resume.txt', 'projects/', 'about/', 'skills/'],
  '~/projects': ['ai-kisaan-sahayak/', 'brain-tumor-detection/', 'boardbrief/', 'fire-notes/', 'ipl-analysis/', 'vaccine-mgmt/'],
  '~/about': ['bio.txt', 'contact.txt'],
  '~/skills': ['stack.txt', 'certifications.txt'],
};

const FILE_CONTENTS: Record<string, string> = {
  'README.md': `# Dhruv Choudhary
AI Engineer · MITS Gwalior · Dept Rank 2

Currently @ AI LifeBOT (Ignited Wings Technology)
Building GenAI solutions that ship to production.

Run 'whoami' for more info or 'help' for all commands.`,

  'resume.txt': `DHRUV CHOUDHARY — AI ENGINEER
================================
Email:    nrdhruv654@gmail.com
GitHub:   github.com/sarcasticdhruv
LinkedIn: linkedin.com/in/dhruv-choudhary-india
Location: Bhopal/Raipur/Hyderabad

EXPERIENCE
----------
AI Engineer (GenAI Solutions) · AI LifeBOT · Nov 2025–Present
  > GPT-based enterprise knowledge on AWS for CHMSCL
  > AI Grievance Management System for DPDMIS (OCI)
  > .NET contributions to EMIS live production

AI Engineer Intern · AI LifeBOT · Oct 2024–Oct 2025
  > SEO Automation Agent: +35% lead coverage
  > OCR Invoice Validator: -60% manual effort
  > No-code chatbot builder platform (omnichannel)

EDUCATION
---------
B.Tech IT (IoT) · MITS Gwalior · CGPA 8.94 · Rank #2

ACHIEVEMENTS
------------
> IEEE MPCON-2025: Brain Tumor Classification paper
> IMC 2025: Demo to Union Minister Scindia
> Odoo Hackathon: Prototype in 6 hours
> Google Cyber Security: 96.83%`,

  'bio.txt': `Name:     Dhruv Choudhary
Handle:   sarcasticdhruv
Role:     AI Engineer
Company:  AI LifeBOT (Ignited Wings Technology Pvt. Ltd.)
Location: Bhopal → Raipur/Hyderabad
Grad:     May 2026 (MITS Gwalior)

Passionate about building AI systems that actually work
in production — not just demos. Python purist, occasional
C++ masochist, cloud architecture enthusiast.`,

  'contact.txt': `Email:    nrdhruv654@gmail.com
LinkedIn: linkedin.com/in/dhruv-choudhary-india
GitHub:   github.com/sarcasticdhruv
Twitter:  @SarcasticDhruv
Linktree: linktr.ee/Dhruv.Choudhary`,

  'stack.txt': `LANGUAGES
  Python · C/C++ · TypeScript · JavaScript · SQL

FRAMEWORKS & AI
  PyTorch · TensorFlow · OpenCV · Langgraph · YOLO
  React JS · React Native · LLM Finetuning · RAG

BACKEND
  REST APIs · MongoDB · Redis · PostgreSQL
  Microservices · Automation Pipelines

CLOUD & DEVOPS
  AWS · GCP · OCI · Docker · Kubernetes
  CI/CD · GitHub Actions

TOOLS
  Playwright · Puppeteer · Postman · Retool`,

  'certifications.txt': `Google Cloud Compute Basics       — Aug 2024
Analyze Images (Cloud Vision API) — Sep 2024
Develop GenAI Apps (Gemini)       — Oct 2024
Gen AI Study Jams (Batch 1 & 2)  — 2024
Google Cyber Security             — 96.83% · 2023–2024
Kaggle Machine Learning           — 2024`,
};

function Colored({ col, children }: { col: string; children: React.ReactNode }) {
  return <span style={{ color: col }}>{children}</span>;
}

function Dim({ children }: { children: React.ReactNode }) {
  return <span style={{ color: '#4A6A52' }}>{children}</span>;
}

export default function Terminal({ github, onClose, isFloating = false }: Props) {
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [cwd, setCwd] = useState('~');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [booted, setBooted] = useState(false);

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addLines = useCallback((newLines: Line[]) => {
    setLines(prev => [...prev, ...newLines]);
  }, []);

  const out = (content: React.ReactNode, type: LineType = 'out'): Line => ({ id: lid(), type, content });
  const blank = (): Line => ({ id: lid(), type: 'blank', content: '' });
  const err = (msg: string): Line => out(<Colored col="#FF6B6B">{msg}</Colored>, 'err');
  const success = (msg: React.ReactNode): Line => out(<Colored col="#00D96D">{msg}</Colored>);
  const dim = (msg: React.ReactNode): Line => out(<Dim>{msg}</Dim>);

  // Scroll to bottom and keep the prompt focused whenever new lines
  // are added (so typing doesn't lose focus after submitting a command).
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
    inputRef.current?.focus();
  }, [lines]);

  // Boot sequence — run neofetch once on mount
  useEffect(() => {
    if (booted) return;
    setBooted(true);
    const bootLines: Line[] = [
      dim('Arch Linux 6.9.3-arch1-1 (tty1)'),
      // blank(),
      // out(<span><Dim>[  </Dim><Colored col="#28C840"> OK </Colored><Dim>  ] Reached target </Dim><span style={{color:'#DFF0E3'}}>Multi-User System</span></span>),
      // out(<span><Dim>[  </Dim><Colored col="#28C840"> OK </Colored><Dim>  ] Started </Dim><span style={{color:'#DFF0E3'}}>Network Manager</span></span>),
      // out(<span><Dim>[  </Dim><Colored col="#28C840"> OK </Colored><Dim>  ] Started </Dim><span style={{color:'#DFF0E3'}}>OpenSSH Daemon</span></span>),
      // blank(),
      out(<span><Colored col="#1E90FF">arch</Colored> <Dim>login:</Dim> <span style={{color:'#DFF0E3'}}>dhruv</span></span>),
      out(<span><Dim>Password: </Dim><span style={{color:'#070F09', userSelect:'none'}}>••••••••</span></span>),
      blank(),
      out(<span><Dim>Last login: </Dim><span style={{color:'#7A9E82'}}>{new Date().toDateString()} on tty1</span></span>),
      blank(),
    ];
    setLines(bootLines);
    setTimeout(() => {
      runNeofetch(github);
    }, 420);
  }, []);

  // Update neofetch if github data loads
  useEffect(() => {
    if (!github.loading && booted) {
      // Don't re-run, just silently available for next 'neofetch' call
    }
  }, [github.loading]);

  function runNeofetch(gh: GitHubStats) {
    const uptime = Math.floor((Date.now() - PAGE_LOAD_TIME) / 1000);
    const mins = Math.floor(uptime / 60);
    const secs = uptime % 60;
    const uptimeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    const res = `${window.innerWidth}x${window.innerHeight}`;
    const repos = gh.profile?.public_repos ?? '...';
    const stars = gh.totalStars;
    const followers = gh.profile?.followers ?? '...';

    const archArt = [
      '                   -`                 ',
      '                  .o+`                ',
      '                 `ooo/               ',
      '                `+oooo:              ',
      '               `+oooooo:             ',
      '               -+oooooo+:            ',
      '             `/+-:++oooo+:           ',
      '            `/+++++/+++++++:         ',
      '           `/++++++++++++++:         ',
      '          `/+++ooooooooooooo/`        ',
      '         ./ooosssso++osssssso+`       ',
      '        .oossssso-````/ossssss+`      ',
      '       -osssssso.      :sssss+.      ',
      '      :osssssss/        /sss+.       ',
      '     /ossssssss/        +ss:         ',
      '    /ossssso+++.        +s/           ',
      '   +ossso++.           ./+            ',
      '  `+sso+:-`          -:/+            ',
      '   `+/-             -/+.`            ',
      '    `.`             `.               ',
    ];

    const info = [
      [<Colored col="#1E90FF">{USERNAME}</Colored>, <span style={{color:'#DFF0E3'}}>@</span>, <Colored col="#1E90FF">{HOSTNAME}</Colored>],
      ['──────────────────────────────────────'],
      ['OS', 'Arch Linux x86_64'],
      ['Host', 'ThinkPad-X1-Carbon'],
      ['Kernel', '6.9.3-arch1-1 #1 SMP'],
      ['Uptime', uptimeStr],
      ['Shell', 'zsh 5.9'],
      ['Terminal', 'Alacritty 0.13.2'],
      ['Font', 'JetBrains Mono 11'],
      ['Resolution', res],
      [''],
      ['colors'],
    ];

    const neofetchLine: Line = {
      id: lid(),
      type: 'neofetch',
      content: (
        <div style={{ display: 'flex', gap: '20px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', lineHeight: 1.55 }}>
          {/* ASCII art */}
          <div style={{ flexShrink: 0, userSelect: 'none', lineHeight: 1.28 }}>
            {archArt.map((line, i) => {
              // gradient: top rows deeper blue, bottom rows cyan/lighter
              const ratio = i / (archArt.length - 1);
              const r = Math.floor(30 + ratio * 0);
              const g = Math.floor(100 + ratio * 100);
              const b = Math.floor(255 - ratio * 60);
              return <div key={i} style={{ color: `rgb(${r},${g},${b})`, whiteSpace: 'pre' }}>{line}</div>;
            })}
          </div>
          {/* Info */}
          <div>
            {info.map((item, i) => {
              if (Array.isArray(item) && item.length === 3) {
                return <div key={i}>{item[0]}{item[1]}{item[2]}</div>;
              }
              if (Array.isArray(item) && item.length === 1 && String(item[0]).startsWith('──')) {
                return <div key={i} style={{ color: '#2A5A3A' }}>{item[0]}</div>;
              }
              if (Array.isArray(item) && item.length === 1 && item[0] === '') {
                return <div key={i}>&nbsp;</div>;
              }
              if (Array.isArray(item) && item.length === 1 && item[0] === 'colors') {
                const cols = ['#1A1A2E','#16213E','#0F3460','#1E90FF','#4FC3F7','#81D4FA','#B3E5FC','#E1F5FE'];
                const cols2 = ['#FF5F57','#FEBC2E','#28C840','#00D96D','#BF5AF2','#FF9F0A','#FF6B6B','#DFF0E3'];
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', gap: '3px', marginTop: '3px' }}>
                      {cols.map((c, ci) => (
                        <span key={ci} style={{ display: 'inline-block', width: '16px', height: '16px', background: c, borderRadius: '2px' }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '3px', marginTop: '3px' }}>
                      {cols2.map((c, ci) => (
                        <span key={ci} style={{ display: 'inline-block', width: '16px', height: '16px', background: c, borderRadius: '2px' }} />
                      ))}
                    </div>
                  </div>
                );
              }
              if (Array.isArray(item) && item.length === 2) {
                return (
                  <div key={i}>
                    <span style={{ color: '#1E90FF' }}>{(item[0] as string).padEnd(12)}</span>
                    <span style={{ color: '#4A7A6A' }}>: </span>
                    <span style={{ color: '#C8E6D0' }}>{item[1]}</span>
                  </div>
                );
              }
              return <div key={i}>&nbsp;</div>;
            })}
          </div>
        </div>
      ),
    };

    addLines([neofetchLine, blank()]);
  }

  async function runGroq(prompt: string, systemPrompt: string): Promise<string> {
    // import.meta is not typed by default in TS; cast to any to access env vars
    const key = (import.meta as any).env?.VITE_GROQ_API_KEY;
    if (!key) throw new Error('VITE_GROQ_API_KEY not set in .env');

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 600,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message ?? `API error ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? 'No response.';
  }

  function formatGroqOutput(text: string): React.ReactNode[] {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('##') || line.startsWith('**')) {
        const clean = line.replace(/^#+\s*/, '').replace(/\*\*/g, '');
        return <div key={i}><Colored col="#00D96D">{clean}</Colored></div>;
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <div key={i}><Colored col="#4A6A52">  › </Colored><span style={{ color: '#DFF0E3' }}>{line.slice(2)}</span></div>;
      }
      if (line.startsWith('`') && line.endsWith('`')) {
        return <div key={i}><span style={{ color: '#FEBC2E' }}>{line}</span></div>;
      }
      return <div key={i} style={{ color: '#A8C8B0' }}>{line || '\u00a0'}</div>;
    });
  }

  async function handleCommand(rawCmd: string) {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    // Add to history
    setCmdHistory(prev => [trimmed, ...prev.slice(0, 99)]);
    setHistIdx(-1);

    // Echo command
    const cmdLine: Line = {
      id: lid(), type: 'cmd', content: trimmed, cwd, cmdText: trimmed,
    };
    addLines([cmdLine]);

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    const argStr = args.join(' ');

    switch (cmd) {
      case 'clear':
      case 'cls':
        setLines([]);
        return;

      case 'neofetch':
        runNeofetch(github);
        return;

      case 'help': {
        addLines([
          blank(),
          out(<Colored col="#00D96D">Available commands:</Colored>),
          blank(),
          ...([
            ['help', 'Show this help message'],
            ['whoami', 'Display user information'],
            ['neofetch', 'Show system info with ASCII art'],
            ['ls [dir]', 'List directory contents'],
            ['cat <file>', 'Display file contents'],
            ['cd <dir>', 'Change directory'],
            ['pwd', 'Print working directory'],
            ['git log', 'Show recent git history'],
            ['skills', 'Display tech stack overview'],
            ['projects', 'List featured projects'],
            ['resume', 'Show resume summary'],
            ['contact', 'Show contact details'],
            ['open <target>', 'Open: github | linkedin | twitter | email'],
            ['search "<query>"', 'Web search'],
            ['ask "<question>"', 'Ask anything (AI Powered)'],
            ['history', 'Show command history'],
            ['echo <text>', 'Print text'],
            ['date', 'Show current date and time'],
            ['uname -a', 'Show system information'],
            ['uptime', 'Show session uptime'],
            ['clear', 'Clear the terminal'],
            ['exit', 'Close terminal'],
          ] as [string, string][]).map(([c, d]) =>
            out(
              <span>
                <Colored col="#00D96D">{c.padEnd(22)}</Colored>
                <Dim>{d}</Dim>
              </span>
            )
          ),
          blank(),
          dim('Tip: use ↑/↓ for history, Tab for completion'),
          blank(),
        ]);
        return;
      }

      case 'whoami': {
        addLines([
          blank(),
          out(<span><Colored col="#00D96D">uid=1000(dhruv)</Colored> <Dim>gid=1000(dhruv)</Dim> <Colored col="#00D96D">groups=1000(dhruv),wheel,ai-engineers</Colored></span>),
          blank(),
          out(<span><Colored col="#DFF0E3">Name:   </Colored><span style={{ color: '#A8C8B0' }}>Dhruv Choudhary (sarcasticdhruv)</span></span>),
          out(<span><Colored col="#DFF0E3">Role:   </Colored><span style={{ color: '#A8C8B0' }}>AI Engineer @ Ignited Wings Technology Pvt. Ltd.</span></span>),
          out(<span><Colored col="#DFF0E3">Edu:    </Colored><span style={{ color: '#A8C8B0' }}>B.Tech IT (IoT) · MITS Gwalior · CGPA 8.94 · Rank #2</span></span>),
          out(<span><Colored col="#DFF0E3">Stack:  </Colored><span style={{ color: '#A8C8B0' }}>Python, TypeScript, GenAI, AWS, Docker</span></span>),
          out(<span><Colored col="#DFF0E3">Paper:  </Colored><span style={{ color: '#A8C8B0' }}>IEEE MPCON-2025 — Brain Tumor Classification</span></span>),
          out(<span><Colored col="#DFF0E3">Avail:  </Colored><Colored col="#00D96D">Open to full-time AI/ML roles from May 2026</Colored></span>),
          blank(),
        ]);
        return;
      }

      case 'pwd':
        addLines([out(cwd === '~' ? `/home/${USERNAME}` : `/home/${USERNAME}/${cwd.slice(2)}`)]);
        return;

      case 'date':
        addLines([out(new Date().toString())]);
        return;

      case 'echo':
        addLines([out(argStr || '')]);
        return;

      case 'uname': {
        const flags = args.join('');
        if (flags.includes('a')) {
          addLines([out(`Linux arch 6.9.3-arch1-1 #1 SMP PREEMPT_DYNAMIC Mon, 01 Jan 2025 00:00:00 +0000 x86_64 GNU/Linux`)]);
        } else {
          addLines([out('Linux')]);
        }
        return;
      }

      case 'uptime': {
        const elapsed = Math.floor((Date.now() - PAGE_LOAD_TIME) / 1000);
        const m = Math.floor(elapsed / 60);
        const s = elapsed % 60;
        const now = new Date();
        const timeStr = now.toTimeString().slice(0, 8);
        addLines([out(` ${timeStr} up ${m} min ${s} sec,  1 user,  load average: 0.42, 0.38, 0.35`)]);
        return;
      }

      case 'history': {
        if (cmdHistory.length === 0) {
          addLines([dim('No history yet.')]);
          return;
        }
        addLines(cmdHistory.slice(0, 30).reverse().map((h, i) =>
          out(<span><Dim>{String(i + 1).padStart(4)}  </Dim><span style={{ color: '#A8C8B0' }}>{h}</span></span>)
        ));
        return;
      }

      case 'ls': {
        const target = args[0] ? (args[0].startsWith('~/') ? args[0] : `${cwd}/${args[0]}`.replace(/\/\//g, '/')) : cwd;
        const dir = target === '~' ? '~' : target;
        const entries = VFS[dir] ?? (
          github.repos.length && dir.startsWith('~/projects')
            ? github.repos.slice(0, 12).map(r => `${r.name}/`)
            : null
        );
        if (!entries) {
          addLines([err(`ls: cannot access '${args[0] ?? dir}': No such file or directory`)]);
          return;
        }
        const cols = 4;
        const rows: Line[] = [];
        for (let i = 0; i < entries.length; i += cols) {
          const row = entries.slice(i, i + cols);
          rows.push(
            out(
              <span>
                {row.map((e, ri) => {
                  const isDir = e.endsWith('/');
                  return (
                    <span key={ri} style={{ display: 'inline-block', minWidth: '22ch' }}>
                      {isDir
                        ? <Colored col="#1E90FF">{e}</Colored>
                        : <span style={{ color: '#DFF0E3' }}>{e}</span>
                      }
                    </span>
                  );
                })}
              </span>
            ) as Line
          );
        }
        addLines([blank(), ...rows, blank()] as Line[]);
        return;
      }

      case 'cd': {
        const target = args[0] ?? '~';
        if (target === '..' || target === '../') {
          setCwd('~');
          return;
        }
        if (target === '~' || target === '/home/' + USERNAME) {
          setCwd('~');
          return;
        }
        const fullPath = target.startsWith('~') ? target : `${cwd}/${target}`.replace(/\/\//g, '/');
        const normalised = fullPath.replace(`/home/${USERNAME}`, '~');
        if (VFS[normalised] !== undefined) {
          setCwd(normalised);
        } else {
          addLines([err(`cd: ${target}: No such file or directory`)]);
        }
        return;
      }

      case 'cat': {
        if (!args[0]) { addLines([err('cat: missing operand')]); return; }
        const fname = args[0];
        const content = FILE_CONTENTS[fname];
        if (content) {
          const fileLines = content.split('\n').map(l =>
            out(<span style={{ color: '#A8C8B0' }}>{l || '\u00a0'}</span>)
          );
          addLines([blank(), ...fileLines, blank()]);
        } else {
          addLines([err(`cat: ${fname}: No such file or directory`)]);
        }
        return;
      }

      case 'git': {
        if (args[0] === 'log') {
          const fakeCommits = [
            ['3f9a1c2', 'feat(ai): deploy GPT knowledge base on AWS for CHMSCL'],
            ['8d2e5b7', 'fix(rag): improve chunking strategy for unstructured docs'],
            ['1a4c8f3', 'chore: add kubernetes health checks to prod deployment'],
            ['9e7b2d1', 'feat(ocr): enhance invoice entity extraction accuracy'],
            ['4c1f6a8', 'perf(api): add Redis caching layer, reduce latency 40%'],
            ['2b8e4c5', 'feat(ml): integrate attention mechanisms into tumor CNN'],
            ['7f3a9d2', 'docs: add IEEE paper citation and results table'],
            ['5c2b1e7', 'feat(chatbot): add omnichannel webhook integration'],
          ];
          const now = new Date();
          addLines([
            blank(),
            ...fakeCommits.map(([hash, msg], i) => {
              const d = new Date(now.getTime() - i * 86400000 * (i + 1));
              const dStr = d.toDateString();
              return out(
                <span>
                  <Colored col="#FEBC2E">commit {hash}</Colored>
                  <Dim> ({dStr})</Dim>
                  {'\n'}
                  <span style={{ color: '#A8C8B0', display: 'block', paddingLeft: '4px' }}>    {msg}</span>
                </span>
              );
            }),
            blank(),
          ]);
        } else if (args[0] === 'status') {
          addLines([
            out(<span><Colored col="#00D96D">On branch</Colored> main</span>),
            out('Your branch is up to date with origin/main.'),
            blank(),
            dim('nothing to commit, working tree clean'),
          ]);
        } else {
          addLines([err(`git: '${args[0]}' is not a git command. Try 'git log' or 'git status'.`)]);
        }
        return;
      }

      case 'skills': {
        addLines([
          blank(),
          out(<Colored col="#00D96D">─── Tech Stack ─────────────────────────────</Colored>),
          blank(),
          ...[
            ['Languages', 'Python · C/C++ · TypeScript · JavaScript · SQL'],
            ['AI/ML', 'PyTorch · TensorFlow · Langgraph · YOLO · RAG'],
            ['Backend', 'REST APIs · MongoDB · Redis · PostgreSQL · Microservices'],
            ['Cloud', 'AWS · GCP · OCI · Docker · Kubernetes · CI/CD'],
            ['Frontend', 'React JS · React Native · Vite'],
            ['Tools', 'Playwright · Puppeteer · OCR · Postman · Retool'],
          ].map(([cat, vals]) =>
            out(
              <span>
                <Colored col="#00D96D">{(cat + ':').padEnd(12)}</Colored>
                <span style={{ color: '#A8C8B0' }}>{vals}</span>
              </span>
            )
          ),
          blank(),
        ]);
        return;
      }

      case 'projects': {
        const featured = [
          ['AI Kisaan Sahayak', 'Voice AI for farmers · 10 languages · Langgraph + YOLO'],
          ['Brain Tumor Detection', 'CNN + ResNet-18 · IEEE MPCON-2025 published'],
          ['BoardBrief', 'AI meeting summarizer · CRM integration'],
          ['Fire Notes', 'Real-time notes · Firebase sync'],
        ];
        addLines([
          blank(),
          out(<Colored col="#00D96D">─── Featured Projects ──────────────────────</Colored>),
          blank(),
          ...featured.map(([name, desc]) =>
            out(
              <span>
                <Colored col="#1E90FF">{name.padEnd(26)}</Colored>
                <span style={{ color: '#7A9E82' }}>{desc}</span>
              </span>
            )
          ),
          blank(),
          dim(`Total public repos: ${github.repos.length || 27} · Run 'ls ~/projects' to see all`),
          blank(),
        ]);
        return;
      }

      case 'resume':
      case 'cv': {
        const content = FILE_CONTENTS['resume.txt'];
        const fileLines = content.split('\n').map(l =>
          out(<span style={{ color: '#A8C8B0' }}>{l || '\u00a0'}</span>)
        );
        addLines([blank(), ...fileLines, blank()]);
        return;
      }

      case 'contact': {
        addLines([
          blank(),
          out(<span><Colored col="#00D96D">Email:    </Colored><span style={{ color: '#A8C8B0' }}>nrdhruv654@gmail.com</span></span>),
          out(<span><Colored col="#00D96D">LinkedIn: </Colored><span style={{ color: '#A8C8B0' }}>linkedin.com/in/dhruv-choudhary-india</span></span>),
          out(<span><Colored col="#00D96D">GitHub:   </Colored><span style={{ color: '#A8C8B0' }}>github.com/sarcasticdhruv</span></span>),
          out(<span><Colored col="#00D96D">Twitter:  </Colored><span style={{ color: '#A8C8B0' }}>@SarcasticDhruv</span></span>),
          blank(),
        ]);
        return;
      }

      case 'open': {
        const targets: Record<string, string> = {
          github: 'https://github.com/sarcasticdhruv',
          linkedin: 'https://linkedin.com/in/dhruv-choudhary-india',
          twitter: 'https://twitter.com/SarcasticDhruv',
          email: 'mailto:nrdhruv654@gmail.com',
          portfolio: 'https://developer-dhruv.netlify.app',
        };
        const t = args[0]?.toLowerCase();
        if (!t) {
          addLines([err('open: specify target — github | linkedin | twitter | email')]);
          return;
        }
        if (targets[t]) {
          window.open(targets[t], '_blank', 'noopener,noreferrer');
          addLines([success(`Opening ${t}...`)]);
        } else {
          addLines([err(`open: unknown target '${t}'`)]);
        }
        return;
      }

      case 'search': {
        const rawQuery = argStr.replace(/^["']|["']$/g, '').trim();
        if (!rawQuery) {
          addLines([err('search: provide a query — e.g. search "react hooks"')]);
          return;
        }
        setIsLoading(true);
        addLines([dim(`Searching: ${rawQuery}...`)]);
        const sys = `You are a terminal search assistant. The user has run a web search from their portfolio terminal. 
Respond in a concise, structured terminal-friendly format (no markdown headers with #, no **bold**, use plain text and dashes).
Format results as a clean list. Max 10 lines. Be direct and informative.`;
        try {
          const result = await runGroq(`Search query: ${rawQuery}`, sys);
          const resultLines = formatGroqOutput(result);
          addLines([
            blank(),
            out(<Colored col="#00D96D">Search results for: "{rawQuery}"</Colored>),
            out(<Dim>────────────────────────────────────────</Dim>),
            ...resultLines.map(r => out(r)),
            blank(),
          ]);
        } catch (e) {
          addLines([err(`search: ${e instanceof Error ? e.message : 'API error'}`)]);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      case 'ask': {
        const question = argStr.replace(/^["']|["']$/g, '').trim();
        if (!question) {
          addLines([err('ask: provide a question — e.g. ask "what is RAG?"')]);
          return;
        }
        setIsLoading(true);
        addLines([dim(`Thinking...`)]);
        const sys = `You are a helpful AI assistant in a terminal. Answer concisely and clearly.
Format your response in plain text suitable for a terminal (no markdown, use simple dashes for lists).
Be direct. Max 15 lines.`;
        try {
          const result = await runGroq(question, sys);
          const resultLines = formatGroqOutput(result);
          addLines([
            blank(),
            out(<Colored col="#00D96D">Answer:</Colored>),
            out(<Dim>────────────────────────────────────────</Dim>),
            ...resultLines.map(r => out(r)),
            blank(),
          ]);
        } catch (e) {
          addLines([err(`ask: ${e instanceof Error ? e.message : 'API error'}`)]);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      case 'exit':
      case 'quit':
        if (onClose) onClose();
        return;

      case 'sudo':
        addLines([err('You are not in the sudoers file. This incident will be reported.')]);
        return;

      case 'rm':
        if (args.includes('-rf') || args.includes('--recursive')) {
          addLines([out(<span><Colored col="#FF6B6B">Nice try. </Colored><Dim>Not deleting anything.</Dim></span>)]);
        } else {
          addLines([err(`rm: cannot remove '${argStr}': Operation not permitted`)]);
        }
        return;

      case 'vim':
      case 'nvim':
      case 'nano':
        addLines([err(`${cmd}: not opening an editor in a portfolio terminal. Use VS Code like a normal person.`)]);
        return;

      case 'ssh':
        addLines([dim('Connection refused. (This is a browser.)'), blank()]);
        return;

      case 'ping':
        addLines([
          out(`PING ${args[0] ?? 'github.com'}: 56 data bytes`),
          out(`64 bytes from 140.82.114.4: icmp_seq=0 ttl=55 time=12.4 ms`),
          out(`64 bytes from 140.82.114.4: icmp_seq=1 ttl=55 time=11.8 ms`),
          dim(`--- ${args[0] ?? 'github.com'} ping statistics ---`),
          dim('2 packets transmitted, 2 received, 0% packet loss'),
        ]);
        return;

      default: {
        addLines([err(`${cmd}: command not found. Try 'help' for available commands.`)]);
        return;
      }
    }
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleCommand(input);
      setInput('');
      // re-focus the input after the command has been sent so the user
      // can immediately continue typing without clicking again
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIdx = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(nextIdx);
      setInput(cmdHistory[nextIdx] ?? '');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = Math.max(histIdx - 1, -1);
      setHistIdx(nextIdx);
      setInput(nextIdx === -1 ? '' : (cmdHistory[nextIdx] ?? ''));
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      // Basic tab completion
      const all = ['help', 'whoami', 'neofetch', 'ls', 'cat', 'cd', 'pwd', 'git', 'skills', 'projects',
        'resume', 'contact', 'open', 'search', 'ask', 'history', 'echo', 'date', 'uname', 'uptime', 'clear', 'exit'];
      const match = all.find(c => c.startsWith(input));
      if (match) setInput(match + ' ');
      return;
    }
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
      return;
    }
    if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      const cancelled: Line = { id: lid(), type: 'cmd', content: input + '^C', cwd };
      addLines([cancelled]);
      setInput('');
      return;
    }
  }

  const promptColor = '#00D96D';
  const cwdDisplay = cwd.replace(`/home/${USERNAME}`, '~');
  const promptUser = <span style={{ color: '#1E90FF', fontWeight: 600 }}>{USERNAME}</span>;
  const promptAt = <span style={{ color: '#4A6A52' }}>@</span>;
  const promptHost = <span style={{ color: '#1E90FF' }}>{HOSTNAME}</span>;
  const promptBracketL = <span style={{ color: '#4A6A52' }}>[</span>;
  const promptBracketR = <span style={{ color: '#4A6A52' }}>]</span>;
  const promptDir = <span style={{ color: promptColor }}>{cwdDisplay}</span>;
  const promptDollar = <span style={{ color: promptColor }}> $ </span>;

  const windowStyle: React.CSSProperties = isFullscreen ? {
    position: 'fixed',
    inset: '16px',
    zIndex: 500,
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 0 80px rgba(0,0,0,0.8), 0 0 0 1px #1C3024',
  } : {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: isFloating ? '10px' : '8px',
  };

  return (
    <div style={windowStyle} onClick={() => inputRef.current?.focus()}>
      {/* Window chrome */}
      <div style={{
        height: '36px',
        background: 'linear-gradient(180deg, #0E1E16 0%, #0A1810 100%)',
        borderBottom: '1px solid #1A2E20',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: '8px',
        flexShrink: 0,
        userSelect: 'none',
      }}>
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c, i) => (
            <div
              key={i}
              onClick={i === 0 ? onClose : i === 2 ? () => setIsFullscreen(v => !v) : undefined}
              style={{
                width: '12px', height: '12px', borderRadius: '50%', background: c,
                cursor: i !== 1 ? 'pointer' : 'default',
                opacity: 0.9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {i === 0 && onClose && <X size={7} style={{ opacity: 0, transition: 'opacity 0.15s' }} />}
            </div>
          ))}
        </div>

        {/* Title */}
        <div style={{
          flex: 1, textAlign: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.73rem',
          color: '#4A6A52',
          pointerEvents: 'none',
        }}>
          <TermIcon size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '5px' }} />
          {USERNAME}@{HOSTNAME}: {cwdDisplay}
        </div>

        {/* Fullscreen toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); setIsFullscreen(v => !v); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A6A52', padding: '2px', display: 'flex' }}
        >
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>

      {/* Output area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#050D08' }}>
        <div className="term-scanline" />
      <div
        ref={outputRef}
        className="term-output"
        style={{
          height: '100%',
          overflowY: 'auto',
          padding: '12px 16px 10px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.78rem',
          lineHeight: 1.62,
          background: 'transparent',
          cursor: 'text',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {lines.map(line => {
          if (line.type === 'blank') return <div key={line.id} style={{ height: '0.5em' }} />;
          if (line.type === 'neofetch') return <div key={line.id}>{line.content}</div>;
          if (line.type === 'cmd') {
            const lineCwd = (line.cwd ?? '~').replace(`/home/${USERNAME}`, '~');
            return (
              <div key={line.id} style={{ display: 'flex', gap: '0', flexWrap: 'wrap' }}>
                <span style={{ flexShrink: 0 }}>
                  {promptBracketL}{promptUser}{promptAt}{promptHost} <span style={{ color: promptColor }}>{lineCwd}</span>{promptBracketR}{promptDollar}
                </span>
                <span style={{ color: '#DFF0E3' }}>{line.content}</span>
              </div>
            );
          }
          return (
            <div key={line.id} style={{ paddingLeft: '0' }}>
              {line.content}
            </div>
          );
        })}

        {/* Loading indicator */}
        {isLoading && (
          <div style={{ color: '#4A7A5A', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="cursor-blink" style={{ color: '#1E90FF' }}>▋</span>
            <span style={{ color: '#1E90FF' }}>processing</span><Dim>...</Dim>
          </div>
        )}

        {/* Input line */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
          <span style={{ flexShrink: 0 }}>
            {promptBracketL}{promptUser}{promptAt}{promptHost} {promptDir}{promptBracketR}{promptDollar}
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={isLoading}
            autoFocus
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#DFF0E3',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.78rem',
              caretColor: '#00D96D',
              padding: 0,
              minWidth: 0,
            }}
          />
        </div>
      </div>
      </div>

      {/* Scanline + scrollbar styles */}
      <style>{`
        .term-output div::-webkit-scrollbar { width: 4px; }
        .term-output::-webkit-scrollbar { width: 4px; }
        .term-output::-webkit-scrollbar-track { background: #070F09; }
        .term-output::-webkit-scrollbar-thumb { background: #1C3024; border-radius: 2px; }
        /* smaller font on very narrow viewports */
        @media (max-width: 480px) {
          .term-output { font-size: 0.68rem !important; }
        }
        .term-scanline {
          position: absolute; inset: 0;
          background: repeating-linear-gradient(
            to bottom,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.04) 2px,
            rgba(0,0,0,0.04) 4px
          );
          pointer-events: none;
          z-index: 2;
        }
      `}</style>
    </div>
  );
}
