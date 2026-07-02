---
title: "The DeepSeek Moment, One Year Later"
date: "2026-06-18"
excerpt: "Looking back at the week a Chinese open-weight reasoning model wiped out hundreds of billions in Nvidia's market cap in a single day, and what actually held up once the panic settled."
tags: ["AI", "opinion", "LLM", "industry"]
coverImage: "https://images.unsplash.com/photo-1555618565-9f2b0323a10d?fm=jpg&q=80&w=1600&auto=format&fit=crop"
published: true
---

For about a week in early 2025, the entire AI industry's story about itself, more compute always wins, only a handful of labs can build frontier models, the moat is the training bill, got a serious dent in it. A Chinese lab called DeepSeek released an open-weight reasoning model, R1, that matched OpenAI's o1 on a meaningful chunk of hard benchmarks, released the weights openly, and claimed a training cost that was a fraction of what the incumbent labs were reportedly spending. Nvidia lost close to six hundred billion dollars of market cap in a single day. That's not a rounding error. That's one of the largest single-day losses for any company in market history, driven almost entirely by a research paper and a model release.

---

The panic, in hindsight, was somewhat overcorrected. The specific training cost figure DeepSeek reported got scrutinized hard afterward, and a lot of people who looked closely argued the real all-in cost, counting the infrastructure and prior research that fed into it, was higher than the headline number suggested. Nvidia's business didn't collapse. Frontier labs didn't stop needing enormous compute. A single strong release doesn't erase the value of years of infrastructure investment, and the market recovered a meaningful chunk of that loss within weeks.

But I think it would be a mistake to write the whole episode off as an overreaction, because something real did shift. Before R1, the working assumption across a lot of the industry was that reasoning-capable models were a closed-lab privilege, something you needed a nine or ten figure training budget and a stack of proprietary techniques to reach. After R1, that assumption had a visible, working counterexample, released with open weights, that anyone could download, inspect, and build on. Distilled smaller versions of it showed up running credible reasoning on hardware that would have seemed absurd for that capability a year earlier.

---

My opinion is that the actual lesson wasn't "compute doesn't matter." It clearly still matters enormously. The lesson was that algorithmic and training efficiency matter more than the dominant narrative had been pricing in, and that the gap between the best closed labs and the best open efforts was smaller and closing faster than most public commentary assumed. That's a healthier way for this field to develop than a world where a handful of companies own the entire frontier permanently by outspending everyone else.

I don't think DeepSeek "won" anything, and I don't think Nvidia lost anything durable. What actually happened is the market got a rough, overdue reminder that a moat measured purely in GPU spend isn't as deep as it looked, and I think the field is better for having that tested this early instead of ten years and a trillion dollars further in.
