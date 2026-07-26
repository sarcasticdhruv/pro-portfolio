export interface RelatedPostLike {
  slug: string;
  tags: string[];
  date: string;
}

export function getRelatedPosts<T extends RelatedPostLike>(post: T, allPosts: T[], limit?: number): T[];
