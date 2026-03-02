---
title: "BoardBrief: On Building Meeting Intelligence That Doesn't Get in the Way"
date: "2025-11-28"
excerpt: "Design and engineering notes on building an AI system for board meeting summarisation — and why the hardest problem wasn't the AI."
tags: ["AI", "product engineering", "NLP", "LLM"]
coverImage: ""
published: true
---

Board meetings generate a specific kind of document: dense, formal, and full of context that exists only in the room. The decision to expand into South-East Asia means something different six months later, when you need to trace why that direction was approved, who was in the room, and what alternatives were considered and rejected. The minutes are there, but reading them is slow.

BoardBrief was an attempt to build something that could retrieve that context quickly.

---

The original scope was summarization. Feed in a meeting recording or transcript, get out a structured summary with decisions, action items, and key discussion points. This is a solved problem technically — the combination of Whisper-quality transcription and a capable LLM can produce a reasonable summary of most meeting content.

The honest insight from early testing was that summaries are not actually what people want.

After showing the first version to a few people who run organizations with regular board meetings, the feedback was consistent: summarization is nice for people who weren't in the meeting. For people who were in the meeting, what they want is a searchable record. They know approximately what was decided. They want to find who said what, what the objections were, when a specific topic last came up.

This shifted the project from summarization to retrieval-augmented memory.

---

The architecture change sounds small but required rethinking almost everything. Instead of generating a single summary document, the system needed to:

1. Segment transcripts into meaningful units — not fixed-window chunks, but semantic segments corresponding to topic transitions
2. Embed and index those segments for retrieval
3. Maintain entity metadata: speaker attribution, timestamps, follow-up assignments
4. Support conversational queries against the indexed meeting history

The segmentation problem is where I spent the most time. Naive approaches — splitting at silence gaps, splitting at fixed token counts — produced segments that either cut mid-thought or combined unrelated discussion into a single chunk. Topic boundary detection using a small classifier on sentence embeddings worked better. The model wasn't perfect, but the segmentation was good enough for retrieval purposes.

Speaker attribution, pulled from the transcription pipeline, was the most practically valuable piece. When someone queries "what was the CFO's position on the acquisition," the system needs to be able to filter on speaker. This required a clean entity normalization step — the same person might appear as "Mehra," "Mr. Mehra," "Rahul," or just referenced as "he" across a long transcript.

---

Action item extraction was the feature that showed up most in feedback as genuinely useful. The LLM prompt for this was more constrained than a general summarization prompt — I needed structured output with assignee, task, and deadline, not prose. JSON output with a defined schema, validated against expected fields. Most LLMs handle this well with appropriate prompting, but the failure mode when they don't handle it well is worth being careful about: a missed action item or a wrong assignee is a real problem, not a cosmetic one.

I added a confidence mechanism — action items identified with low confidence were flagged rather than presented as definitive. Low confidence was determined by whether the context around the identified item was ambiguous (passive voice, indirect reference, conditional framing). This is the kind of heuristic that matters more in practice than in evaluation metrics.

---

The interface question turned out to be as interesting as the ML question.

BoardBrief could answer specific queries, but users also needed to browse. Not everything is retrievable if you don't know what to ask for. The browseable timeline view — meeting by meeting, with topics color-coded and action items flagged — was added based on this requirement. It's not an ML feature. It's just good information architecture.

This is something worth noting: in most AI products, the AI does a part of the job. The rest is product thinking about how people actually navigate information. Getting the AI right and getting the product right are separate problems.

---

The thing I'm proudest of in BoardBrief is not the summarisation accuracy or the retrieval performance. It's the fact that the system genuinely reduces the cognitive load of going back to check a decision from three meetings ago.

That's a functional improvement in how an organization uses its own institutional memory. It's modest. But it's real, and it works consistently, and it doesn't require the users to change anything about how they run their meetings.

That last part — building something that fits into existing behavior rather than requiring behavioral change — is an underappreciated constraint in product engineering. The technology is rarely the bottleneck. The adoption is.
