---
title: "Vibe Coding Is a Starting Point, Not a Strategy"
date: "2026-05-30"
excerpt: "Andrej Karpathy's phrase for AI-assisted, half-supervised programming took over the discourse fast. Here's where I think it's genuinely useful, and where I've watched it quietly wreck production codebases."
tags: ["AI", "engineering", "opinion", "software"]
coverImage: ""
published: true
---

Andrej Karpathy coined the phrase "vibe coding" to describe a specific mode of working with AI coding tools: you describe what you want in plain language, you accept what the model generates without reading it closely, and when something breaks you paste the error back in and let the model fix it. You mostly forget the code exists. The phrase caught on fast, fast enough that within months half the coding tool landscape was marketing itself around it.

I use AI coding assistants every day. I'm not writing this as someone who thinks the tools are bad. I'm writing this because I've watched the vibe coding mindset applied to the wrong kind of project, and I think that's become a real problem the discourse mostly glosses over.

---

For a prototype, a weekend project, a proof of concept you're going to throw away in a week, vibe coding is genuinely great. The whole point of a prototype is speed of iteration and low cost of being wrong, and not reading every line of generated code is a completely reasonable trade in that context. I've built things this way. It's fun. It's fast.

The problem starts when the same mindset gets applied to something that's going to sit in production, handle real user data, or get built on top of for the next two years. I've reviewed code, some of it from junior engineers, some of it from my own past self on a rushed day, that clearly nobody actually read before shipping. It works, until the input is slightly different from what the model assumed, or until you need to modify it six months later and discover the person who "wrote" it, meaning accepted it, can't explain what it does.

---

This connects to something I've written about before: the gap between a demo and a deployed system isn't a gap in time, it's a gap in kind. Vibe coding optimizes hard for getting something that looks correct quickly. It does nothing, by design, for the parts of engineering that matter under load: edge cases, failure modes, the ability of the person who owns the code to actually reason about it under pressure at two in the morning when it breaks.

My take is simple. Use the tools. Move fast with them, especially early in a project. But treat what they produce as a first draft written by a very fast, very confident junior engineer who has never met your users and doesn't know your failure modes. Read it before it ships anywhere that matters. The vibe is a fine place to start. It's a bad place to stop.
