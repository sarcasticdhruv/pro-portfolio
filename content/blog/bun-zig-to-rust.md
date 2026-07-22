---
title: "Bun Rewrote Itself From Zig to Rust in 11 Days and I Use Bun, So Now I'm a Little Nervous"
date: "2026-07-16"
excerpt: "Jarred Sumner ported 535,000 lines of Zig to Rust in 11 days using a fleet of Claude agents. I run bun install on this very portfolio. Let's talk about it."
tags: ["Bun", "Rust", "AI Agents", "engineering"]
coverImage: "https://static0.makeuseofimages.com/wordpress/wp-content/uploads/2022/08/BunjsLogoOnLaptop-1.jpg?w=1600&h=900&fit=crop"
published: true
---

If you've cloned this portfolio you already know I'm a bun person. It's right there in the README, first line of setup, `bun install`, "bun works great here." So when the news broke that Bun's entire runtime got yanked out of Zig and dropped into Rust in eleven days, I did not read it as a neutral bystander. I read it the way you check a text from a friend who just said "so, funny story."

Here's the funny story.

## What actually happened

Jarred Sumner, the guy who built Bun, took 535,496 lines of Zig, excluding comments, and rewrote the whole thing in Rust. Not over a year. Not over a quarter. Eleven days. He did it by spinning up roughly 50 parallel Claude Code agent workflows, hit a peak of about 1,300 lines of code per minute at points, and generated over a million lines of Rust in the process. The API bill for this stunt has been estimated around $165,000.

Read that again. A production JavaScript runtime, the thing powering who knows how many `bun run dev` commands right now, got its foundation replaced in less time than it takes some teams to agree on a linter config.

![bun](https://images.openai.com/static-rsc-4/-B-elnWzvxOEdH5NVauHxE0FntxGG5Wr1A--4-51B9xUsZO-DuYk0gnVHOuwy-pCkIkTR_YzYONrnNMp0SxOTSSBvA_PwZa_ltcwXQWDzhOARvIJGq4RE7PgBYA11IiO1Q1gGSCcKzuZGxA_9TCQfb_2GcjJbipNlmh4P4Z3x9A?purpose=inline)

## Why bother

The honest answer is memory leaks. Zig gives you manual memory management and all the sharp edges that come with it, use-after-free bugs, double frees, the kind of error-path leak that only shows up after your process has been running in production for three days and someone quietly restarts it every night as a workaround. Sumner has said some of these bugs were serious enough to be implicated in other incidents downstream, including issues traced back during the Claude Code source leak investigation.

Rust's whole personality is refusing to compile code that has these problems. The borrow checker is annoying right up until the moment it saves your production server from eating 6.7 gigabytes of RAM. Which, according to the numbers Bun published, is roughly what memory usage looked like after 2,000 builds before the rewrite. After, it stabilized around 609 megabytes. Builds also got a bit faster, 2 to 5 percent, and binaries shrank by about 20 percent. Not a rounding error. A real result.

## The drama, because there's always drama

Andrew Kelley, the creator of Zig, was not thrilled about the framing. He came out and called the rewrite "unreviewed slop," which is a genuinely great insult and also a fair question dressed up as an insult. His actual point was that Bun's memory problems were a Sumner problem, bad practices in the code Sumner wrote, not a Zig problem, and he didn't love his language being cast as the villain in someone else's post-mortem.

I don't have a side in this fight, mostly because I don't write memory-unsafe systems languages for a living. But I recognize the shape of the argument instantly. It's the same argument that happens every time something breaks in production and two teams both go "not it."

![Computer screen displaying lines of code](https://images.unsplash.com/photo-1759661881353-5b9cc55e1cf4?fm=jpg&q=60&w=1600&auto=format&fit=crop)

## My actual take

I build AI systems for a living, and the thing I care about most is whether AI ships something that survives contact with real users, not whether it looks good in a demo. A million lines of AI-generated Rust replacing half a million lines of hand-written Zig, in eleven days, is either the most impressive engineering flex of the year or the setup to a much funnier blog post six months from now. Possibly both. I've shipped agent pipelines at a scale where I know exactly how good a first pass can look and exactly how much review it still needs before it touches anything real.

That said, I'm rooting for it. The reported numbers are real and specific, not "trust me" marketing copy, and specific numbers are usually a good sign someone actually measured something instead of vibing. If it holds up under six more months of real world traffic without a wave of regressions, this becomes one of the more interesting case studies in what agentic coding can responsibly take on. If it doesn't hold up, well, I already have my Bun version pinned in this project, and I know exactly which command rolls it back.

For now I'm still typing `bun run dev` every morning. I'm just watching the changelog a little more closely than usual.

Sources:
- [Rewriting Bun in Rust](https://bun.com/blog/bun-in-rust)
- [Zig creator calls Bun's Claude Rust rewrite "unreviewed slop"](https://www.theregister.com/devops/2026/07/14/zig-creator-calls-buns-claude-rust-rewrite-unreviewed-slop/5270743)
- [Bun Rewrites 535K Lines of Zig to Rust in 11 Days Using Claude](https://www.developersdigest.tech/blog/bun-rust-rewrite-535k-lines)
