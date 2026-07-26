---
title: "Why I Built Helix (And What Shipping an Agent Framework Actually Taught Me)"
date: "2026-03-09"
excerpt: "The story behind Helix Framework, why the existing agent tools weren't enough for what I was building at work, and what happened once strangers started using it."
tags: ["AI Agents", "Python", "engineering", "open source"]
coverImage: ""
published: true
---

I built Helix because I was angry at a billing dashboard.

I was a few months into building agent pipelines at AI LifeBOT, and every week I was pulling a number off our LLM provider's usage page that made me wince. Agents calling agents calling agents, and nobody, including me, had a clean answer for why one support workflow was burning through tokens like it owed someone money.

---

The agent framework landscape at the time, and honestly still now, was full of tools that were excellent at the demo and vague about the parts that matter once you have real users. LangGraph gives you real control over execution graphs, which I respect. CrewAI gives you a nice mental model for multi-agent coordination. Neither one, out of the box, stops a runaway agent loop from spending fifty dollars in retries before anyone notices.

So I started writing what became Helix as an internal tool. Hard budget limits that kill a run before it goes over, not after. Semantic caching so near-duplicate queries don't hit the API twice, which alone cut our costs somewhere between 40 and 70 percent depending on the workload. Persistent memory that survives across sessions instead of resetting every time. A YAML format for task pipelines so the flow of a system is readable by someone who isn't me.

---

The eval suite is the part I didn't expect to care about this much. It's a five-scorer setup, covering things like relevance, faithfulness, and completeness, that runs against every pipeline change. Before I had that, "did this change make the agent better or worse" was a vibe. Now it's a number I can defend in a meeting.

---

I put it on PyPI mostly because I was tired of copy-pasting the same module between projects. `pip install helix-framework`, and it supports OpenAI, Anthropic, Gemini, Groq, and Mistral, because I got tired of rewriting the same adapter every time a client wanted a different provider.

What I didn't expect was for strangers to start using it. Watching issues come in from people I've never met, for use cases I never designed for, is a different kind of pressure than shipping something only your own team depends on. It forces you to write documentation you'd normally skip. It forces you to think about backward compatibility for an API you used to be able to just change on a whim.

---

If you want to look at it, the code is on [GitHub](https://github.com/sarcasticdhruv/helix-agent), and the package is on [PyPI](https://pypi.org/project/helix-framework/). It's still actively evolving, and I'd rather it stay a little rough and genuinely useful than polished and generic.

The honest lesson from building it isn't really about agents. It's that most of the interesting engineering in AI systems is the boring infrastructure sitting around the model call, not the model call itself. Nobody puts budget limits in a demo video. They're the reason the system survives contact with real traffic.

## FAQ

**How is Helix actually different from something like LangGraph or CrewAI?**

It's not trying to out-graph LangGraph or out-orchestrate CrewAI. Both of those get the execution model right and leave the survival stuff, hard budget limits, semantic caching, memory that persists, as an exercise for you. Helix bakes those in because that's the part that was actually breaking things at AI LifeBOT.

**Did semantic caching really cut costs by 40 to 70 percent, or is that a best-case number?**

That's the real range I saw across our workloads, not a cherry-picked demo stat, it just depends heavily on how repetitive your queries are. A support workflow with lots of near-duplicate questions sits at the high end; something more open-ended sits at the low end.

**What changed once people outside your team started using Helix?**

Mostly the accountability. When it's your own team, you can leave the docs half-written and change an API on a whim because everyone just asks you in Slack. Strangers filing issues for use cases you never imagined forces you to actually document the thing and think twice before breaking backward compatibility.
