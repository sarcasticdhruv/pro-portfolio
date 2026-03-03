import { useState } from 'react';
import { Star, GitFork, ExternalLink, ArrowUpRight, RefreshCw } from 'lucide-react';
import type { GitHubStats } from '../types';
import { LANG_COLORS, formatDate } from '../utils/api';
import { useScrollReveal } from '../hooks/useScrollReveal';

interface Props { github: GitHubStats; }

const FEATURED = [
  {
    name: 'ai-kisaan-sahayak',
    displayName: 'AI Kisaan Sahayak',
    tagline: 'Voice-first agricultural AI · 10+ languages',
    description: 'Voice-controlled farmer assistant built with Langgraph + YOLO-LF. Supports 10 languages, on-demand crop image capture, cloud vision for pest/disease diagnosis, real-time market data and government scheme queries.',
    tags: ['Python', 'Langgraph', 'YOLO', 'TypeScript', 'Multimodal AI'],
    github: 'https://github.com/sarcasticdhruv',
    highlight: true,
  },
  {
    name: 'brain-tumor-detection',
    displayName: 'Brain Tumor Detection',
    tagline: 'IEEE MPCON-2025 published research',
    description: 'Deep learning model using enhanced CNN + attention mechanisms + ResNet-18 for MRI brain tumor classification. Published at IEEE International Conference MPCON-2025, Jabalpur.',
    tags: ['Python', 'CNN', 'ResNet-18', 'TensorFlow', 'OpenCV'],
    github: 'https://github.com/sarcasticdhruv/brain-tumor-detection',
    highlight: true,
  },
  {
    name: 'Board-Brief',
    displayName: 'BoardBrief',
    tagline: 'AI meeting summarizer with CRM integration',
    description: 'AI-powered application that processes meeting recordings and transcripts into concise summaries with actionable next steps and automated CRM logging.',
    tags: ['JavaScript', 'Python', 'Node.js', 'MongoDB'],
    github: 'https://github.com/sarcasticdhruv/Board-Brief',
    highlight: false,
  },
  {
    name: 'Fire-Notes',
    displayName: 'Fire Notes',
    tagline: 'Real-time notes with Firebase sync',
    description: 'Real-time note-taking app with secure Firebase cloud sync, authentication, and clean React UI. Live on the web.',
    tags: ['React', 'Firebase', 'CSS'],
    github: 'https://github.com/sarcasticdhruv/Fire-Notes',
    highlight: false,
  },
];

const FILTERS = ['all', 'Python', 'JavaScript', 'TypeScript', 'C++', 'Jupyter Notebook'];

export default function Projects({ github }: Props) {
  const { ref, visible } = useScrollReveal();
  const [filter, setFilter] = useState('all');
  const [showAll, setShowAll] = useState(false);

  const featuredWithGH = FEATURED.map(f => ({
    ...f,
    ghRepo: github.repos.find(r => r.name.toLowerCase() === f.name.toLowerCase()),
  }));

  const featuredNames = new Set(FEATURED.map(f => f.name.toLowerCase()));
  const otherRepos = github.repos
    .filter(r => !featuredNames.has(r.name.toLowerCase()))
    .filter(r => filter === 'all' || r.language === filter)
    .slice(0, showAll ? undefined : 6);

  return (
    <section id="projects" ref={ref} className="section" style={{
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: 'opacity 0.65s ease, transform 0.65s ease',
      background: 'var(--surface)',
    }}>
      <div className="container">
        <p className="label" style={{ marginBottom: '14px' }}>03 / projects</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '44px', flexWrap: 'wrap', gap: '14px' }}>
          <h2 className="section-heading">Things I've<br /><span style={{ color: 'var(--accent)' }}>built.</span></h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            <RefreshCw size={11} className={github.loading ? 'spin' : ''} />
            {github.loading ? 'fetching from GitHub...' : `${github.repos.length} public repos · live`}
          </div>
        </div>

        {/* Featured grid */}
        <div className="projects-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '18px', marginBottom: '48px' }}>
          {featuredWithGH.map(p => <FeaturedCard key={p.name} project={p} />)}
        </div>

        {/* Repo list header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            all repos
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '4px 11px', borderRadius: '4px',
                border: '1px solid', borderColor: filter === f ? 'var(--accent)' : 'var(--border)',
                background: filter === f ? 'var(--accent-glow)' : 'transparent',
                color: filter === f ? 'var(--accent)' : 'var(--text-dim)',
                fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem',
                cursor: 'pointer', transition: 'all 0.18s ease',
              }}>{f}</button>
            ))}
          </div>
        </div>

        {github.loading ? (
          <div style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem' }}>Loading repositories...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {otherRepos.map(repo => <RepoRow key={repo.id} repo={repo} />)}
          </div>
        )}

        {github.repos.length > 6 && (
          <button onClick={() => setShowAll(v => !v)} className="btn btn-outline" style={{ marginTop: '20px', fontSize: '0.76rem' }}>
            {showAll ? '− show less' : `+ ${github.repos.length - 6} more on GitHub`}
          </button>
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1.2s linear infinite; }
        @media (max-width: 640px) {
          .projects-grid { grid-template-columns: 1fr !important; }
          .repo-meta .repo-date { display: none; }
        }
        @media (max-width: 420px) {
          .repo-meta { gap: 8px !important; }
          .repo-meta .repo-lang-label { display: none; }
        }
      `}</style>
    </section>
  );
}

function FeaturedCard({ project }: { project: typeof FEATURED[number] & { ghRepo?: any } }) {
  const [hovered, setHovered] = useState(false);
  const { ghRepo } = project;

  return (
    <a href={project.github} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', padding: '22px',
        background: 'var(--bg)', border: '1px solid',
        borderColor: hovered ? 'var(--accent-dim)' : 'var(--border)',
        borderRadius: '10px', textDecoration: 'none',
        transition: 'all 0.22s ease',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        position: 'relative', overflow: 'hidden',
      }}>
      {project.highlight && (
        <span style={{
          position: 'absolute', top: '14px', right: '14px',
          padding: '2px 7px', background: 'var(--accent-glow)', border: '1px solid var(--tag-border)',
          borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.58rem', color: 'var(--accent)', letterSpacing: '0.08em',
        }}>FEATURED</span>
      )}

      <div style={{ marginBottom: '11px' }}>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.07rem', color: 'var(--text)', marginBottom: '3px' }}>
          {project.displayName}
        </h3>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: 'var(--accent)' }}>
          {project.tagline}
        </p>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.65, flex: 1, marginBottom: '14px' }}>
        {project.description}
      </p>

      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '11px' }}>
        {project.tags.map(t => <span key={t} className="tag" style={{ fontSize: '0.67rem' }}>{t}</span>)}
      </div>

      {ghRepo && (
        <div style={{ display: 'flex', gap: '14px', color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', borderTop: '1px solid var(--border)', paddingTop: '11px', alignItems: 'center' }}>
          {ghRepo.stargazers_count > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={10} /> {ghRepo.stargazers_count}
            </span>
          )}
          {ghRepo.forks_count > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <GitFork size={10} /> {ghRepo.forks_count}
            </span>
          )}
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={9} /> {formatDate(ghRepo.updated_at)}
          </span>
        </div>
      )}

      <ArrowUpRight size={14} style={{
        position: 'absolute', top: '14px', right: project.highlight ? '76px' : '14px',
        color: hovered ? 'var(--accent)' : 'var(--text-dim)',
        transition: 'color 0.18s ease',
      }} />
    </a>
  );
}

function RepoRow({ repo }: { repo: any }) {
  const [hovered, setHovered] = useState(false);
  const color = LANG_COLORS[repo.language] || '#666';

  return (
    <a href={repo.html_url} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '12px 14px', background: hovered ? 'var(--surface-2)' : 'transparent',
        borderRadius: '6px', textDecoration: 'none', transition: 'background 0.18s ease',
      }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.83rem', color: hovered ? 'var(--accent)' : 'var(--text)', transition: 'color 0.18s' }}>
            {repo.name}
          </span>
          {repo.archived && <span className="tag" style={{ fontSize: '0.58rem' }}>archived</span>}
        </div>
        {repo.description && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {repo.description}
          </p>
        )}
      </div>
      <div className="repo-meta" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.69rem', color: 'var(--text-dim)', flexShrink: 0 }}>
        {repo.language && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block' }} />
            <span className="repo-lang-label">{repo.language}</span>
          </span>
        )}
        {repo.stargazers_count > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Star size={9} /> {repo.stargazers_count}
          </span>
        )}
        <span className="repo-date">{formatDate(repo.updated_at)}</span>
        <ExternalLink size={11} style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.18s', color: 'var(--accent)' }} />
      </div>
    </a>
  );
}
