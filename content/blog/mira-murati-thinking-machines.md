---
title: "raised $2 Billion Before Shipping a Product, and I Have ;;Thoughts"
date: "2026-07-22"
excerpt: "I spent an evening reading about Mira Murati's new startup instead of sleeping. $12 billion valuation, zero products, and then a plot twist nobody saw coming. Here's the whole story, with receipts."
tags: ["AI", "startups", "OpenAI", "Mira Murati"]
coverImage: "https://static.digit.in/inkling.png"
published: true
---

So I spent my evening reading about Mira Murati instead of sleeping, and here's the blog that came out of it. Story time.

You know Mira Murati, the OpenAI CTO who for about 48 hours in November 2023 was literally the interim CEO of OpenAI during that whole Sam Altman fired-then-un-fired soap opera. Yeah, her. She left OpenAI in September 2024, saying she wanted to "do her own exploration," which is corporate speak for "I'm about to do something insane." In February 2025 she came out of stealth with a new startup called **Thinking Machines Lab**.

Cool name, not gonna lie. Very "we are definitely not overthinking this" energy.

![Silhouette of a person against a wall of illuminated server racks](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?fm=jpg&q=80&w=1600&auto=format&fit=crop)

## The team and the money that made me stare at the ceiling

She didn't come alone. She pulled in John Schulman, an OpenAI co-founder, as chief scientist, and Barret Zoph, who used to lead post-training at OpenAI, as CTO. Roughly two-thirds of the whole company is ex-OpenAI people. So it's basically OpenAI's B-team, except it's arguably not the B-team, it's just also very much the A-team. Confusing power move.

And here's the part that made me put my phone down and stare at the ceiling for a minute: they raised **$2 billion** in a seed round. Seed. Led by Andreessen Horowitz, with Nvidia, AMD, Cisco, Accel, ServiceNow, and Jane Street all throwing money in too. That valued the company at **$12 billion** before they'd shipped a single product. Not a beta. Not a waitlist landing page. Nothing. Just vibes, a manifesto, and a rolodex of ex-OpenAI researchers.

I need everyone to sit with that number for a second. Twelve billion dollars, for vibes.

(Reminder to self: next time I have an idea in the shower, immediately call a16z.)

## Okay but what does it actually do

After months of "we're cooking" energy, they finally shipped their first real product: **Tinker**.

Tinker is a platform that lets developers fine-tune open-source AI models without dealing with the nightmare of distributed computing infrastructure themselves. Say you want to take an open model and make it good at your specific thing, legal docs, customer support, whatever. Normally that's a whole infra headache. Tinker abstracts it away. You bring the data, they handle the GPU cluster chaos behind the curtain.

Their whole philosophical bet, and this is actually kind of interesting, is different from the "bigger model equals better model" race that OpenAI, Google, and Anthropic are all running. Thinking Machines is betting on smarter post-training techniques and more customization instead. Less "biggest brain," more "most useful brain for your specific problem." Underdog energy, but with $2 billion, so a very well-funded underdog.

Then, and this is basically breaking news as I write this, on **July 15, 2026** they dropped their first actual foundation model: **Inkling**. It's a 975-billion-parameter mixture-of-experts model, fully open weights on Hugging Face, with native audio and vision support, and a dial for "thinking effort" depending on how much reasoning you want it to do, which is a clever way to save compute.

Here's the funniest part. They said, in their own blog post, that Inkling is "not the strongest overall model available today, open or closed." Which is a wild thing to publicly announce about your own $12 billion company's first baby. Most companies would spin that into "revolutionary" or "groundbreaking." Murati's team just shrugged and said yeah, it's fine, it's not the best, but you can make it yours. Respect the honesty. Still a kind of unhinged strategy though.

![Abstract network of glowing blue nodes and connections representing a neural network](https://images.unsplash.com/photo-1620712943543-bcc4688e7485?fm=jpg&q=80&w=1600&auto=format&fit=crop)

## Inkling vs. everyone else, in actual numbers

Since half the point of reading all this was to figure out whether Inkling is actually a big deal or just a headline, here's how it stacks up against the models everyone already knows:

| Model | Company | Parameters | Weights | Standout feature | Founded / raised |
|---|---|---|---|---|---|
| **Inkling** | Thinking Machines Lab | 975B (MoE) | Fully open | Adjustable "thinking effort" dial, native audio + vision | Founded 2025, $2B seed |
| GPT-5.x | OpenAI | Not disclosed | Closed | Broadest general capability, huge ecosystem | Founded 2015, backed by Microsoft |
| Claude (Sonnet/Opus 5) | Anthropic | Not disclosed | Closed | Long-context reasoning, safety-first tuning | Founded 2021, ~$60B+ raised |
| Llama 4 | Meta | Up to ~400B (MoE) | Open | Free commercial use at scale, broad fine-tuning ecosystem | Backed by Meta's ad revenue |
| Grok | xAI | Not disclosed | Partially open | Real-time X data integration | Founded 2023, multi-billion raises |

A few things jump out once it's laid out like this. Inkling is genuinely one of the largest open-weight models anyone has shipped, bigger on paper than Llama 4. But "biggest open model" and "best model" aren't the same claim, and Thinking Machines themselves said so. The real differentiator isn't raw size, it's that dial: you can trade reasoning depth for speed and cost on the same model, which matters a lot more to a company burning through API bills than a benchmark leaderboard does.

## The plot twist nobody saw coming (okay, some people saw it coming)

This is where it gets messy, and I love messy. Around the same window as the Inkling launch, several senior people, including Barret Zoph, the CTO, reportedly left Thinking Machines and went back to OpenAI. The company they all left in the first place. Some reports frame it as disagreements over product direction and how to spend that giant war chest of cash.

Imagine leaving your job, joining your friend's brand-new $12 billion startup, and then a year later going "actually never mind" and walking back to your old job. The AI industry right now is genuinely just a few hundred people playing musical chairs across four companies, and I am simply here for the drama.

## My actual opinion, unsolicited but you're getting it anyway

Here's my take: Thinking Machines Lab is a fascinating case study in how insane the AI funding landscape has become. A company can raise more money in a seed round than most companies raise in their entire lifetime, based purely on "these specific humans used to work somewhere impressive." That's the whole thesis investors bought into.

To be fair, it's not nothing. Tinker is a genuinely useful product for the fine-tuning niche, and Inkling being fully open-weight is a nice contribution to the ecosystem when everyone else is locking their models behind APIs. The whole "customization over raw scale" bet is intellectually interesting too, not just hype.

But also, $12 billion, before a product existed. I keep coming back to that number because my brain cannot process it. That's not a startup valuation, that's a small country's GDP.

Anyway. Will Thinking Machines actually become the Anthropic-tier rival everyone hyped it up to be, or is it going to be a cautionary tale about pedigree-based valuations in a bubble? No clue. Ask me again in a year. For now I'm just enjoying the show from the cheap seats.

Sources:
- [Thinking Machines Lab is ex-OpenAI CTO Mira Murati's new startup](https://techcrunch.com/2025/02/18/thinking-machines-lab-is-ex-openai-cto-mira-muratis-new-startup)
- [Thinking Machines Lab, Wikipedia](https://en.wikipedia.org/wiki/Thinking_Machines_Lab)
- [Tinker product page](https://thinkingmachines.ai/tinker/)
- [Thinking Machines amps up its bet against one-size-fits-all AI with Inkling](https://techcrunch.com/2026/07/15/thinking-machines-amps-up-its-bet-against-one-size-fits-all-ai-with-its-first-open-model-inkling/)
