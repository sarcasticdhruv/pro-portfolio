import { useState, useEffect } from 'react';
import type { GitHubStats } from '../types';
import {
  fetchProfile,
  fetchRepos,
  computeLanguageCounts,
  computeTotalStars,
} from '../utils/api';

export function useGitHub(): GitHubStats {
  const [state, setState] = useState<GitHubStats>({
    profile: null,
    repos: [],
    loading: true,
    error: null,
    totalStars: 0,
    languageCounts: {},
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [profile, repos] = await Promise.all([fetchProfile(), fetchRepos()]);
        if (cancelled) return;
        setState({
          profile,
          repos,
          loading: false,
          error: null,
          totalStars: computeTotalStars(repos),
          languageCounts: computeLanguageCounts(repos),
        });
      } catch (err) {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load GitHub data',
        }));
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}
