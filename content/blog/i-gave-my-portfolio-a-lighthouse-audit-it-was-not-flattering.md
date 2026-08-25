---
title: "I Ran Lighthouse on My Own Portfolio. It Was Not Flattering."
date: "2026-08-25"
excerpt: "My own site's CLS score was 0.31, which is the kind of number you'd roast a client for shipping. Here's the actual fix, the actual before/after numbers, and the one image that was quietly costing everyone 648KB for no reason."
tags: ["performance", "Core Web Vitals", "engineering", "React", "Vite"]
coverImage: "/blog/audited.webp"
published: true
---

I build things for a living, so obviously I never ran Lighthouse on my own portfolio until it flagged itself. This is the professional equivalent of the plumber whose own sink drips. The number that got me looking was a Cumulative Layout Shift score of 0.31 on one of my own blog posts, measured under throttled network and CPU. For reference, Google's own threshold for "good" is 0.1. My site was shipping a CLS score three times over the line, on a portfolio whose entire pitch is "I know what I'm doing."

So I fixed it, on the actual site, and I'm writing down the real before/after numbers instead of the vague "we improved performance" line every case study seems to reach for.

## The actual culprit: images with no reserved space

The blog posts on this site embed markdown images from pasted URLs, editorial photography, mostly, the kind of thing you'd expect on a personal blog. Those images have no intrinsic size the browser can know ahead of time. So the page renders with zero height where the image will eventually go, the image loads, and everything below it jumps. Every. Single. Time. If you were reading the [Mira Murati post](/blog) on a slow connection, you'd have felt this: the page settles into its final shape a beat *after* you started reading, and if you'd started scrolling based on where things were, you were now scrolling into the wrong spot.

The fix wasn't clever. It's the boring, correct answer: reserve a `16/9` aspect-ratio box for every in-body image, matching the actual editorial photography being used, with `object-fit: cover` so the image fills that reserved space without distorting. The browser now knows exactly how much room to leave before a single byte of the image has downloaded.

```tsx
// src/components/blog/MarkdownRenderer.tsx
renderer.image = (href, title, text) => {
  return `<img src="${href}" alt="${text}" title="${title ?? ''}"
    width="1600" height="900" loading="lazy" decoding="async"
    style="aspect-ratio: 16/9; object-fit: cover;" />`;
};
```

Measured CLS on that same throttled setup, same post, same network conditions: 0.31 down to 0. Not "improved." Zero. The layout shift wasn't reduced, it stopped existing, because the browser had somewhere to put the image before it needed to.

## The second offender: a GitHub widget with no skeleton

My Projects section pulls live data from GitHub, stars, last-commit info, the stuff that makes a portfolio feel current instead of frozen in whatever month you built it. That fetch takes a moment, and until this fix, the section it lives in had no reserved height while waiting. Same disease as the images: content pops in, everything below it jumps down to make room.

The fix here was a loading skeleton sized to match the eventual real content, so the space is claimed the instant the component mounts, not the instant the fetch resolves.

```tsx
// src/components/Projects.tsx
{isLoading ? (
  <div className="h-[88px] animate-pulse rounded-lg bg-muted" />
) : (
  <GitHubStats data={repoData} />
)}
```

Eighty-eight pixels, chosen to match what the real card actually renders at, not a round number that looked fine in the editor.

## The one I'm slightly embarrassed about

While I was in Lighthouse's report anyway, I noticed my own profile picture, the one in the chat widget and the blog author bio, was serving the full 800×800 source PNG at 648KB, to display at 64 pixels or smaller, on every single page load. Every visitor to this site was downloading a 648KB image to look at something the size of a large emoji.

I made a 160×160 WebP sized for retina at the actual largest render size it's used at. It comes in at 4.7KB.

```
648KB → 4.7KB
```

That's not a typo and not a rounding trick, that's roughly a 138x reduction, for an image most visitors never even consciously looked at. `profile.png` still exists at full size, it's kept specifically for Open Graph previews, which actually benefit from a larger source when a link gets shared on Slack or Twitter. Everywhere else on the site, `profile-avatar.webp` does the job at a fraction of the weight.

## What I'd tell someone about to run this same audit on their own site

Lighthouse doesn't care that you're a professional. Run it before someone else does and finds the 0.31 for you. The fixes, in nearly every case I've hit, are some version of "the browser didn't know how much space to reserve before the content arrived." Images, async widgets, injected banners, all the same root cause. Reserve the space up front, and the shift has nowhere left to happen.

## FAQ

**What was your portfolio's actual CLS score before and after?**

0.31 on the affected blog post under throttled network/CPU conditions, verified down to 0 under the same conditions after adding a 16/9 aspect-ratio reservation to in-body images. Google's "good" threshold is 0.1, so the before number wasn't a minor miss, it was roughly 3x over.

**Is CLS actually worth fixing, or is it a vanity metric?**

It's one of Google's three Core Web Vitals, and unlike some SEO metrics, it maps directly to something a real user feels: the page jumping while they're reading or about to click something. A bad CLS score isn't an abstract penalty, it's the literal experience of misclicking because a button moved.

**Why was your profile picture 648KB in the first place?**

Because it was never resized after being uploaded once at 800×800 for OG-preview purposes, and every other usage, the chat widget, the blog author bio, both under 64px, just pointed at that same full-size source without anyone (me) noticing. It's the classic "one image, five contexts, one size" mistake.

**What's the fastest way to find this kind of issue on my own site?**

Run Lighthouse in Chrome DevTools with network and CPU throttling turned on, not your default fast home connection, that hides exactly this class of bug. Look specifically at the CLS breakdown, it names the actual DOM elements causing the shift, which is usually enough to go straight to the fix without guessing.
