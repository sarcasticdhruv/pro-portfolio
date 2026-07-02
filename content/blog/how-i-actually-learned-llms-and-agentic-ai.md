---
title: "How I Actually Learned LLMs and Agentic AI (Not How I Wish I Had)"
date: "2026-06-25"
excerpt: "A full, practical roadmap for learning LLMs and agentic AI specifically - what to read, what to build by hand before touching a framework, and the exact project ladder I'd tell a friend to follow."
tags: ["AI", "LLM", "agentic AI", "learning", "guide"]
coverImage: "https://images.unsplash.com/photo-1761322572550-967ea8c0bfd9?fm=jpg&q=80&w=1600&auto=format&fit=crop"
published: true
---

People ask me some version of "how do I get into AI engineering" often enough that I finally sat down and wrote out the actual path, not the vague version. This is that path. It's specific on purpose. If you follow it in order, you should come out the other end able to build a real agent, not just describe one in an interview.

---

## Step 0: the prerequisites nobody likes to state

You need to be comfortable reading and writing Python without googling every second line. You need to be fine with JSON and basic HTTP requests, because that's what every LLM API actually is underneath the SDK. And you need just enough math to not be scared of it: what a vector is, what a dot product measures, roughly what gradient descent is doing when it "trains" something. You do not need a machine learning degree. I don't have one either.

## Step 1: understand what an LLM actually is before you use one

Don't skip this to get to the fun part faster. It costs you later.

- Watch 3Blue1Brown's neural network series for the visual intuition. It's free and it's the best fifteen minutes you'll spend on this whole path.
- Watch Andrej Karpathy's "Neural Networks: Zero to Hero," specifically the "Let's build GPT: from scratch, in code" video. Actually type the code out with him. It will be small and slow and nothing like a real model, and that's the point.
- Read "Attention Is All You Need" once, don't worry about following every equation on the first pass. Read it again a week later. The second read is when it clicks.
- Then go play with a provider's raw API directly (OpenAI, Anthropic, Groq, whichever), no framework in between. Get a feel for tokens, context windows, temperature, and what changes when you adjust them.

## Step 2: prompting is a real skill, treat it like one

Before retrieval, before tools, before any of it: learn to write prompts that actually constrain the model's behavior. System prompt versus user prompt, few-shot examples, asking for structured JSON output and validating it. Build something small and useless-sounding, like a CLI tool that classifies support tickets by category, using nothing but a raw SDK call. No retrieval yet. No tools yet. Just you and the prompt.

## Step 3: build RAG by hand before you touch a framework

This is the step people skip and pay for later.

1. Chunk a handful of your own documents (notes, a PDF, anything).
2. Embed the chunks with a real embedding model.
3. Store the vectors in something dumb, a Python list or a numpy array is genuinely fine for learning.
4. Write the cosine similarity retrieval yourself. It's about ten lines.
5. Stuff the top results into a prompt and generate an answer.

Read the original RAG paper, Lewis et al. 2020, around this point. It'll explain, in the limitations section nobody quotes, exactly why this approach struggles with questions that need multiple hops of reasoning across documents. Only after you've built this by hand should you open LangChain or LlamaIndex. Now you'll actually understand what they're abstracting, instead of trusting it blindly.

## Step 4: agentic AI, the part everyone asks me about specifically

Strip away the branding and an "agent" is a loop. The model reasons about what to do, picks a tool, observes the result, reasons again, and either calls another tool or gives you a final answer. That's the ReAct pattern (Yao et al. 2022, "ReAct: Synergizing Reasoning and Acting in Language Models"), and it's been public knowledge since 2022. Read that paper before you read any agent framework's documentation.

Then write the loop yourself. It's smaller than people expect. Something roughly like this:

```python
def run_agent(user_input, tools, model, max_steps=6):
    messages = [{"role": "user", "content": user_input}]

    for step in range(max_steps):
        response = model.chat(messages, tools=tools)

        if response.tool_call is None:
            return response.content  # model is done, this is the final answer

        name = response.tool_call.name
        args = response.tool_call.arguments
        result = tools[name](**args)

        messages.append({"role": "assistant", "tool_call": response.tool_call})
        messages.append({"role": "tool", "name": name, "content": str(result)})

    return "gave up after max_steps, something's probably looping"
```

That's roughly the whole trick. Give the model a couple of real tools, a calculator function and something that reads a local file is enough to start, and run this loop by hand before you ever open LangGraph or CrewAI. Once you've written it yourself, every framework you touch afterward stops looking like magic and starts looking like a specific set of opinions layered on top of that same loop.

A few things worth understanding at this stage, not just doing:

- **Memory** is just architecture. Short-term memory is whatever's still in the running message list. Long-term memory is a vector store or database you deliberately write to and read from across sessions. There's no third kind hiding underneath.
- **Multi-agent systems** are the same loop, more than once, passing messages between instances instead of tool results. It sounds more complicated in the marketing than it is in the code.
- **Tool calling APIs** (OpenAI's tool calling, Anthropic's tool use) are just a structured, provider-supported version of the loop above. Learn the raw version first so the structured version doesn't feel like a black box either.

## Step 5: build an eval before you trust anything

A model topping MMLU tells you almost nothing about whether it behaves sensibly on your actual data, in your domain, phrased the way your actual users phrase things. Write your own small eval instead. Ten real examples from your actual use case is enough to start. Score them by hand first, on whatever axes matter for your task, relevance, faithfulness to any retrieved context, completeness against the original ask. Then automate the scoring so you can rerun it on every change. This is the difference between "I think this got better" and actually knowing.

## Step 6: the production layer, once it already works

This is the part demos never show and the part that determines whether your project survives contact with real users. Add a hard budget limit that kills a run before it overspends, not after. Add caching for near-duplicate queries. Add a max-iteration cap on any agent loop so a stuck agent can't spiral forever. Log every tool call and model response somewhere you can actually read later, because you will need to, at an inconvenient time.

If you get this far, you've independently rediscovered why frameworks like LangGraph, CrewAI, and the one I built, Helix, exist in the first place. Now you're in a position to pick one, or not, with actual judgment instead of guessing.

## The project ladder, laid out plainly

1. A CLI tool using raw API calls, prompting only, no retrieval, no tools.
2. A hand-rolled RAG chatbot over your own documents, no framework.
3. A hand-rolled single agent with two or three real tools, using the loop above.
4. A small eval suite for that agent, five to ten real cases, scored by hand then automated.
5. Budget limits, caching, and logging added to that same agent.
6. Only now, open a framework and rebuild the same agent inside it. Notice exactly what got easier and exactly what control you gave up.

## What I'd actually read, in order

<div class="resource-list">
  <a class="resource-card" href="https://www.youtube.com/playlist?list=PLZZWrBYkx7Otcjr3eCLZDCgfpqnxMY29s" target="_blank" rel="noopener noreferrer">
    <span class="resource-kind">video series</span>
    <span class="resource-title">3Blue1Brown - Neural Networks</span>
    <span class="resource-desc">The visual intuition for what's actually happening inside a network, done in under an hour.</span>
  </a>
  <a class="resource-card" href="https://karpathy.ai/zero-to-hero.html" target="_blank" rel="noopener noreferrer">
    <span class="resource-kind">course</span>
    <span class="resource-title">Karpathy - Neural Networks: Zero to Hero</span>
    <span class="resource-desc">Build a tiny GPT from scratch in code, including the "Let's build GPT" video specifically.</span>
  </a>
  <a class="resource-card" href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noopener noreferrer">
    <span class="resource-kind">paper - 2017</span>
    <span class="resource-title">Attention Is All You Need</span>
    <span class="resource-desc">The transformer paper. Read it once, then again a week later.</span>
  </a>
  <a class="resource-card" href="https://arxiv.org/abs/2005.11401" target="_blank" rel="noopener noreferrer">
    <span class="resource-kind">paper - 2020</span>
    <span class="resource-title">Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks</span>
    <span class="resource-desc">The original RAG paper. The limitations section explains what tutorials never do.</span>
  </a>
  <a class="resource-card" href="https://arxiv.org/abs/2210.03629" target="_blank" rel="noopener noreferrer">
    <span class="resource-kind">paper - 2022</span>
    <span class="resource-title">ReAct: Synergizing Reasoning and Acting in Language Models</span>
    <span class="resource-desc">The paper behind almost every agent loop you'll ever use, including your own.</span>
  </a>
  <a class="resource-card" href="https://platform.openai.com/docs" target="_blank" rel="noopener noreferrer">
    <span class="resource-kind">docs</span>
    <span class="resource-title">OpenAI Platform Docs</span>
    <span class="resource-desc">Read the provider's own documentation before any third-party framework's docs.</span>
  </a>
  <a class="resource-card" href="https://docs.anthropic.com" target="_blank" rel="noopener noreferrer">
    <span class="resource-kind">docs</span>
    <span class="resource-title">Anthropic Docs</span>
    <span class="resource-desc">Same idea, for Claude and tool use specifically.</span>
  </a>
  <a class="resource-card" href="https://console.groq.com/docs" target="_blank" rel="noopener noreferrer">
    <span class="resource-kind">docs</span>
    <span class="resource-title">Groq Docs</span>
    <span class="resource-desc">Fast, cheap inference for when you're iterating and don't want to wait on every test run.</span>
  </a>
</div>

---

One last thing that isn't a step so much as a habit: write about what you're building while you're still confused about it, not after you've figured it out cleanly. Explaining a RAG failure mode to a stranger forces a kind of precision that quietly fixing the bug never does. You find the actual gaps in your understanding exactly at the point where you have to write the next sentence and realize you can't yet.

None of this is the fast path. It's slower than watching a course end to end. It's also the only version of learning this that survives contact with a production system that doesn't behave the way the tutorial promised it would.
