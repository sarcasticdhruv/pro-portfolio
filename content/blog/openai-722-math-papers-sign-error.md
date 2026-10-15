---
title: "OpenAI Dropped 722 Math Papers in One Night. The 3 It Pulled Back Tell You More."
date: "2026-10-15"
excerpt: "On October 6, OpenAI published 722 AI-written math manuscripts claiming progress on hundreds of open problems. A day later, one sign error took down three of them. Here's what actually happened, why mathematicians are split, and what it says about the real bottleneck in AI right now: not generating answers, but checking them."
tags: ["AI", "OpenAI", "mathematics", "AI research", "verification"]
coverImage: "/blog/openai-722-math-papers.webp"
coverBg: "#f6f3ec"
published: true
---

At 6 p.m. Eastern on October 6, OpenAI pushed a GitHub repository with 722 mathematical manuscripts in it. All of them were produced by an unreleased internal model. They were grouped into 372 "result families," and according to [Scientific American](https://www.scientificamerican.com/article/openai-unleashes-hundreds-more-math-results-upon-a-field-already-in-shock/), OpenAI says they resolve or substantially advance major open questions in mathematics and theoretical computer science. The list includes claimed work on the four-dimensional Kakeya conjecture, a new zero-free region for the Riemann zeta function, and the Hodge conjecture for a class of abelian varieties.

Less than 24 hours later, three of those papers were gone.

Not because anyone proved them wrong in a dramatic takedown. Because of a sign error. A plus that should have been a minus, or the other way around, in one paper, and two other papers that were built on top of it.

That part of the story got a lot less attention than "722 papers." I think it's the more important part.

---

## What actually got released

Here's what OpenAI says in the [repository README](https://github.com/openai/math/blob/main/README.md), which is the most reliable source for any of this:

- The model was posed **about 4,000 problems** during the evaluation.
- Each result used, on average, **three hours of ChatGPT Pro thinking compute**.
- The outputs were filtered for significance and grouped into **372 families**, currently **719 manuscripts** after the withdrawals.
- **About 42%** of the top-line results have machine-checked proofs in Lean, a language where a computer verifies every logical step.
- And this line, which is doing a lot of work: *"Some of the unformalized results could have issues."*

A spokesperson told Scientific American that almost every result came from a single prompt to a single agent, and that many of the new results are not yet understood by OpenAI's own mathematicians.

Sit with that last sentence for a second. The company publishing the results is saying its own experts haven't fully understood them yet.

This also didn't come out of nowhere. On September 8, OpenAI announced that its system had produced a finite-time singularity construction for the forced 3D Navier-Stokes equations, reportedly using around 10,000 coordinating agents and millions of dollars of compute, per [Fortune](https://fortune.com/2026/09/08/openai-says-it-cracked-navier-stokes-math-grand-challenge-buckmaster-accusation-cheating-intimidation-tao-lament/). That release came with a messy priority dispute: mathematicians Tristan Buckmaster and Levent Alpöge said OpenAI built on their approach, which OpenAI denies. Mathematicians [told NPR](https://www.npr.org/2026/09/22/nx-s1-5968588/openai-navier-stokes-problem-mathematicians-learn-little) they learned little from the proof itself. So the field was already on edge when 722 more papers landed in one evening.

---

## The three papers, and why one sign error took them all

The [revision history](https://github.com/openai/math/blob/main/history.md) for October 7 is short and honest. In a paper titled "Algebraicity of Weil classes on split abelian eightfolds," a sign error invalidated a cancellation argument, and the construction from that paper was used by two others. All three were withdrawn:

1. Algebraicity of Weil classes on split abelian eightfolds
2. Algebraicity of Kuga-Satake Correspondences for K3 Surfaces
3. The rational Hodge conjecture for products of K3 surfaces

The same day, OpenAI revised **14 more manuscripts** with proof repairs and corrected statements, and updated **13 others** to cite the fixed versions. That's 30 papers touched within roughly a day of release.

![A single sign error in one paper propagates through two dependent papers, and all three are withdrawn](/blog/openai-sign-error-chain.webp "fit:1800/700")

If you write software, you've seen this exact shape before. One bug in a low-level library, and everything that imports it breaks. I wrote about the scarier version of this in [the xz backdoor post](/blog/the-xz-backdoor-nobody-saw-coming): when everyone builds on top of something nobody fully checked, the failure doesn't stay local. It travels up the graph.

Math is the most dependency-heavy field there is. Every theorem sits on lemmas, and every lemma sits on earlier results. When a model writes papers that cite its own other papers, a single unchecked step can become a whole family of wrong results that look right.

To OpenAI's credit, they caught this one fast and handled it the right way: the withdrawn papers stay accessible with notices that explain the gap, instead of quietly disappearing. That's better than a lot of human-run corrections. But it was caught **after** publication, not before.

---

## The real bottleneck isn't generation anymore

Here's the part I keep coming back to as someone who builds with these models every day.

Producing a result cost about three hours of compute. Checking a serious research paper by hand can take an expert weeks or months, and some long technical papers take years to referee. Melissa Lee, a mathematician at Monash University, [wrote in The Conversation](https://theconversation.com/is-this-the-mathocalypse-why-openais-latest-results-dump-has-left-mathematicians-in-shock-293837) that people have described the release as a "dump," a "carpet bombing," and a "mathocalypse." One of her colleagues looked at a paper on a problem he cared about and said that as a journal editor, it "would have gone straight into the bin."

That's the asymmetry. AI made writing a proof cheap. It didn't make checking one cheap.

The only thing that scales on the checking side right now is formal verification, and that's the 42%. In software terms, Lean proofs are the test suite. A Lean-checked result has been verified step by step by a machine. The other 58% are, for now, a very well-formatted pull request that nobody has reviewed yet.

Would you merge a 722-file PR where 58% of the files have no tests, and the author says some of them "could have issues"? That's basically the same argument I made about [vibe coding](/blog/vibe-coding-is-a-starting-point-not-a-strategy). Generated output is a starting point. Verification is the actual work.

---

## Mathematicians are split, and both sides have a point

This isn't a story where everyone is mad. The reactions are genuinely mixed, and the disagreement is useful.

**The case for releasing it all.** Daniel Litt at the University of Toronto told Scientific American: *"I see no reason why we should ask the company to keep them secret from us."* If a model really did crack open problems, hiding the answers helps nobody. Publishing them, errors and all, lets the community start checking.

**The case for skepticism.** Andrew Sutherland at MIT said one-agent, one-shot claims should be treated as unverified until the model is released and people can replicate the results. His version: *"We should ask for receipts."* Terence Tao, probably the most famous living mathematician, has publicly criticized the "insane" pace at which frontier labs are pushing out AI-generated results.

And the receipts question is concrete. After the Navier-Stokes release, OpenAI set up an independent advisory group of mathematicians, which recommended that labs disclose specific things. Here's how the October release compares:

| What the advisory group asked for | What OpenAI released |
|---|---|
| Release the model | Unreleased internal model (OpenAI says it's working on it) |
| Exact prompts for each result | No prompts |
| Compute time per result | Average only (~3 hours) |
| Reasoning behind results | Abridged reasoning summaries for 10 of 372 families |
| Repositories outside the lab's control | OpenAI's GitHub (it says it's exploring community-hosted options) |

OpenAI isn't bound by those recommendations. But when your own advisors ask for five things and you give one and a half, you can't be surprised when people read the release as marketing first and science second. The Conversation piece points out the timing too: OpenAI is reportedly preparing for a stock market listing, and "our model is producing new mathematics" is a very good line for a prospectus.

---

## What I'm taking from this

I don't think this release is fake, and I don't think it's a revolution. Some of these results will hold up and will matter. Some will turn out to be wrong in ways that take months to find. The interesting part is what the episode says about where AI actually is right now.

**1. Generation is solved enough. Verification is the product.** That's true for math papers, and it's true for code, contracts, and medical summaries. The teams that win won't be the ones generating the most output. They'll be the ones who can prove which output is right.

**2. Dependencies multiply errors.** One sign error became three withdrawals and 27 more edits. If your AI pipeline lets model outputs feed other model outputs, like agents calling agents or a RAG system indexing its own summaries, you need checks between the steps, not just at the end.

**3. Receipts build trust faster than volume.** Ten fully reproducible results with prompts, compute and a released model would have convinced more mathematicians than 722 that need taking on faith. Same goes for anyone shipping AI to customers: show your evals, show your failure cases.

**4. The honest correction was the best part.** A public history file, withdrawn papers kept online with explanations, fixes logged within a day. That's the behavior I want to see more of from AI labs. I'd just like it before the press cycle next time, not after.

The 719 papers still in that repository are going to keep mathematicians busy for years. The three that came out are the ones I'd point anyone to if they want to understand AI in 2026. The model can write a proof in three hours. Making sure it's right still takes people.

## FAQ

**What did OpenAI release on October 6, 2026?**

OpenAI published a GitHub repository of mathematical manuscripts produced by an unreleased internal model: 722 manuscripts at launch, grouped into 372 result families, now 719 after withdrawals. OpenAI says the results resolve or substantially advance open problems in mathematics and theoretical computer science, including claimed work on the Kakeya conjecture, the Riemann zeta function and the Hodge conjecture.

**Why did OpenAI withdraw three math papers?**

A sign error in "Algebraicity of Weil classes on split abelian eightfolds" invalidated a key cancellation argument. Two other papers depended on a construction from that paper, so all three were withdrawn on October 7, 2026. OpenAI also revised 14 other manuscripts and updated 13 more to cite corrected versions.

**How many of OpenAI's math results are formally verified?**

According to OpenAI's repository, about 42% of top-line results (300 of 719) have Lean formalizations, meaning a computer has checked every logical step. OpenAI says some of the unformalized results "could have issues."

**Are OpenAI's AI-generated proofs peer reviewed?**

Not yet. The manuscripts were posted directly to GitHub, not through journals. Peer review of serious research mathematics can take months or years, which is exactly why the volume of this release worries many mathematicians.

**Did OpenAI solve the Riemann hypothesis?**

No. The release includes claimed progress related to the Riemann zeta function, a new zero-free region, which is not the same thing as proving the Riemann hypothesis. OpenAI notes this particular result was produced outside its standard procedure and that the writeup was human edited for readability.

**What does this mean for developers building with AI?**

The lesson carries over directly: generating output is now cheap, but verifying it is not. Any system where AI outputs feed into other AI outputs needs checks between steps, and the most valuable part of an AI product is increasingly the part that proves the output is correct.
