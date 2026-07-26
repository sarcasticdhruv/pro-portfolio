// Pure tag-overlap scoring, no React/DOM - imported by both the Vite app
// (BlogPostPage.tsx/RelatedPosts.tsx) and the plain-Node scripts/prerender.mjs,
// so both stay in sync from one source (same pattern as
// src/content/searchExamples.mjs / imagineExamples.mjs).
export function getRelatedPosts(post, allPosts, limit = 3) {
  const tagSet = new Set(post.tags);
  const scored = allPosts
    .filter(p => p.slug !== post.slug)
    .map(p => ({ post: p, score: p.tags.filter(t => tagSet.has(t)).length }))
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.post.date).getTime() - new Date(a.post.date).getTime());
  return scored.slice(0, limit).map(p => p.post);
}
