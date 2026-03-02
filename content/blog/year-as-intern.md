---
title: "What a Year Inside a GenAI Startup Actually Taught Me"
date: "2025-12-30"
excerpt: "Honest notes on the gap between what I expected to learn as an AI engineering intern and what I actually learned."
tags: ["reflection", "career", "AI", "engineering"]
coverImage: ""
published: true
---

I joined AI LifeBOT in October 2024 expecting to spend the year working on interesting AI problems with interesting people.

That happened. But it wasn't what actually changed how I work.

---

What actually changed things was the amount of time I spent debugging infrastructure that had nothing to do with AI. Cloud permissions that weren't configured correctly. Redis caches that weren't invalidating on schema updates. API authentication flows that worked in development and failed in ways that were inexplicable until they weren't.

This sounds like a complaint. It isn't. The infrastructure work was where I learned the most durable things.

AI systems live inside larger systems. The reliability of the larger system is the ceiling on the reliability of the AI component. A model that performs beautifully in isolation performs as well as its infrastructure in production. You can optimize the model indefinitely without improving the product if the deployment infrastructure is unreliable.

The SEO Automation Agent I built - the one that improved lead coverage by 35% - didn't work when I first deployed it. Not because the model was wrong. Because the rate limiting on the APIs I was calling wasn't handling failures gracefully. The model did exactly what I trained it to do. The system around it failed silently. Those failures were invisible until we set up proper logging.

Logging. Not a beautiful insight. But I think about it more than I think about most model architecture decisions now.

---

The other thing that changed was how I think about scope. My second project, the OCR invoice validator, was scoped initially as a full document understanding system. I built it as a full document understanding system. The 60% reduction in manual effort that I cite in my resume came from a much simpler version of what I originally built, which we shipped three weeks in because a simpler version was enough and a simpler version was stable.

The original version was more capable. It was also more brittle. The simpler version handled the common case reliably and fell back to human review for the edge cases. That's the version that worked.

I've carried this forward. When I'm scoping a new system, the first question I ask is not what the complete version looks like but what the minimum version looks like that would be genuinely useful to real users. Often those are quite far apart.

---

The no-code chatbot builder was the project I initially least wanted to work on. It didn't feel like AI work. It felt like product work - building an interface for other people to build things. That turned out to be exactly the point.

Building tools that other people use to build things forces a level of robustness that building systems for yourself doesn't. You can't depend on users knowing what the system expects. You can't depend on them reading documentation. You have to build systems robust enough to work incorrectly and degrade gracefully rather than fail catastrophically.

That mindset is useful even when you're not building tools.

---

The year taught me several things I didn't expect to learn. That infrastructure is where AI systems live or die in production. That scope discipline is a form of engineering rigor. That building something that works reliably for real users is harder and more valuable than building something that works impressively in ideal conditions.

And that the gaps in my knowledge, which felt embarrassing to encounter at the time, were exactly the places where I was actually learning something.

I don't miss being a student, exactly. But I miss having the curriculum tell me clearly what I didn't know yet, so I could find it intentionally. In production, the things you don't know find you.
