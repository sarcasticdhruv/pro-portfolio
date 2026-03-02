---
title: "Building AI Kisaan Sahayak: Voice Interfaces for Farmers Who Don't Read English"
date: "2025-10-15"
excerpt: "A look at what it actually takes to build a voice-first AI assistant for smallholder farmers in India — the hard parts nobody talks about."
tags: ["AI", "RAG", "LLM", "product"]
coverImage: ""
published: true
---

There is a specific kind of problem that reveals every assumption you've ever made about who uses software. AI Kisaan Sahayak was that problem for me.

The project started simply enough: build an agricultural advisory assistant that farmers could ask about crop diseases, irrigation schedules, and market prices. The brief was multilingual. The users would be smallholder farmers in central India — people who grow food for the country but often operate without reliable connectivity, sometimes without formal education.

I had built chatbots before. This felt like an extension of that.

It wasn't.

---

The first thing I learned is that "multilingual" in Indian agriculture is not a clean engineering problem. Hindi is not a single language. Regional dialects compound into something that a standard tokenizer simply hasn't seen. The farmers I was building for might speak Chhattisgarhi, Bundeli, or a Malwa dialect. When they describe a crop disease, they don't use the botanical terms — they describe the color change, the smell, the pattern on the leaf. The vocabulary I needed wasn't in any standard training corpus.

The second thing I learned: voice UI is not a simpler version of text UI. It is a fundamentally different mode of communication. When someone types a question, they tend to phrase it as a question. When someone speaks, especially someone who has never interacted with a digital assistant before, they narrate. They describe the situation. They give context first, question later — sometimes never explicitly asking at all.

My first RAG implementation failed because of this. I was embedding the spoken input and retrieving the top-k chunks from an agricultural knowledge base. The problem was that the natural language spoken by real farmers had almost no lexical overlap with the formal agricultural content. The vector distances were uniformly high. The retrieved context was consistently irrelevant.

---

What worked, eventually, was a two-stage approach. The first stage was translation and normalization — not just from one language to Hindi, but from colloquial spoken descriptions into more structured agricultural language. A small fine-tuned model handled this. The second stage was the actual RAG retrieval on the normalized input.

This introduced latency. Latency in a voice UI is catastrophic in ways it isn't in a text UI. When you read, you naturally pause. When you listen and there's silence, you assume the system broke. We had to engineer around this with interim acknowledgment responses — the assistant would confirm it heard the user and repeat back a summary of what it understood, buying time for the backend to actually retrieve and generate the answer.

The LLM prompt structure was the thing I spent the most time on. Agricultural advice has to be grounded. A small farmer acting on incorrect information can lose an entire season's crop. I couldn't let the model hallucinate. Every response had to be traceable to a source in the knowledge base. This meant building a citation mechanism into the prompt structure itself, not just tacking it on as a postprocessing step.

---

The hardest part wasn't any of this.

The hardest part was that I couldn't properly evaluate whether the system was actually helping. I didn't have ground truth for the correctness of agricultural advice. I didn't have a baseline to compare against. What I had was a small set of domain expert reviewers and anecdotal feedback from limited testing.

This is a recurring problem with AI systems built for contexts that mainstream AI development has largely ignored. There are no established benchmarks for agricultural advisory in Indian regional dialects. There are no established best practices for voice-first RAG in low-connectivity environments. You're building with intuition and iteration, which is uncomfortable when the stakes of a wrong answer are not an inconvenient wrong search result but a failed harvest.

---

Looking back at the system architecture, I can see several decisions I'd make differently now. The normalization model is a bottleneck — I'd explore whether a single larger model could handle dialect understanding and knowledge retrieval in a single pass. The caching strategy was insufficient for truly offline-first usage. And the evaluation pipeline was too informal.

But what I wouldn't change is the fundamental approach of treating the user's communication style as a first-class constraint rather than something to educate users out of.

The system had to work in the world the farmers lived in, not in the world I was comfortable building for.

That, more than any architectural decision, is what I was really learning to build.
