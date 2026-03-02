export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  updated_at: string;
  created_at: string;
  fork: boolean;
  archived: boolean;
  open_issues_count: number;
}

export interface GitHubProfile {
  login: string;
  name: string;
  avatar_url: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  location: string;
  blog: string;
  twitter_username: string | null;
  created_at: string;
}

export interface GitHubStats {
  profile: GitHubProfile | null;
  repos: GitHubRepo[];
  loading: boolean;
  error: string | null;
  totalStars: number;
  languageCounts: Record<string, number>;
}

export type Theme = 'dark' | 'light';

export interface ThemeTransitionState {
  isTransitioning: boolean;
  fromTheme: Theme;
  toTheme: Theme;
}

export interface ExperienceItem {
  company: string;
  companyUrl?: string;
  location: string;
  roles: {
    title: string;
    type: string;
    start: string;
    end: string;
    bullets: string[];
  }[];
  current?: boolean;
}

export interface SkillGroup {
  category: string;
  icon: string;
  skills: string[];
}

export interface Achievement {
  title: string;
  description: string;
  year: string;
  icon: string;
  link?: string;
}
