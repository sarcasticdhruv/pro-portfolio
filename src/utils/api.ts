import type { GitHubProfile, GitHubRepo } from '../types';

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const USERNAME = 'sarcasticdhruv';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`gh_cache_${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(`gh_cache_${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(`gh_cache_${key}`, JSON.stringify(entry));
  } catch {
    // Storage full — ignore
  }
}

export async function fetchProfile(): Promise<GitHubProfile> {
  const cached = getCache<GitHubProfile>('profile');
  if (cached) return cached;

  const res = await fetch(`https://api.github.com/users/${USERNAME}`);
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data: GitHubProfile = await res.json();
  setCache('profile', data);
  return data;
}

export async function fetchRepos(): Promise<GitHubRepo[]> {
  const cached = getCache<GitHubRepo[]>('repos');
  if (cached) return cached;

  const res = await fetch(
    `https://api.github.com/users/${USERNAME}/repos?sort=updated&per_page=50&type=public`
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data: GitHubRepo[] = await res.json();
  const filtered = data.filter((r) => !r.fork);
  setCache('repos', filtered);
  return filtered;
}

export function computeLanguageCounts(repos: GitHubRepo[]): Record<string, number> {
  const counts: Record<string, number> = {};
  repos.forEach((r) => {
    if (r.language) {
      counts[r.language] = (counts[r.language] || 0) + 1;
    }
  });
  return counts;
}

export function computeTotalStars(repos: GitHubRepo[]): number {
  return repos.reduce((sum, r) => sum + r.stargazers_count, 0);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return 'today';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

// Language colors (subset)
export const LANG_COLORS: Record<string, string> = {
  Python: '#3572A5',
  JavaScript: '#F1E05A',
  TypeScript: '#2B7489',
  'Jupyter Notebook': '#DA5B0B',
  CSS: '#563D7C',
  HTML: '#E34C26',
  C: '#555555',
  'C++': '#F34B7D',
  Shell: '#89E051',
  Go: '#00ADD8',
  Rust: '#DEA584',
};
