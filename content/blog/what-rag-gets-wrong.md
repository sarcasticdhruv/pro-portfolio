---
title: "What RAG Gets Wrong, and What to Do About It"
date: "2026-02-05"
excerpt: "A practical critique of retrieval-augmented generation as it's commonly implemented - the failure modes that don't show up in benchmarks."
tags: ["RAG", "LLM", "engineering", "opinion"]
coverImage: ""
published: true
---

Retrieval-augmented generation has become the default architecture for LLM-based knowledge systems, and for good reason. The core idea is right: don't bake knowledge into model weights, retrieve it at inference time, ground the generation in retrieved context.

But the way it's usually implemented misses several things that matter significantly in production.

---

**The chunk problem**

Most RAG tutorials tell you to split your documents into chunks of N tokens, embed those chunks, and retrieve the top-k most similar chunks for any given query. This is the path of least resistance. It's also the path most likely to produce a retrieval system that returns adjacent paragraphs without the context that makes them meaningful.

A document is not a bag of chunks. The context that makes a paragraph interpretable is often not in that paragraph. It's in the heading above it, the introduction three pages earlier, the definition buried in a footnote. When you retrieve a chunk in isolation, you retrieve content that was written to be read in context.

The consequence: your LLM receives retrieved content that is syntactically correct but contextually incomplete. It fills in the gaps with inference. That inference is not always wrong, but it is not grounded in your knowledge base, which defeats the purpose.

The better approach is to build hierarchical context into the retrieval. Retrieve the chunk, but also retrieve or inject the parent document summary, the section heading, and any definitional content that the chunk references. This adds tokens, which adds cost, which is why it's often skipped.

---

**The embedding mismatch problem**

Embedding models are trained on specific data distributions. The text in your knowledge base and the queries your users submit are often distributed very differently. Domain-specific knowledge bases are particularly vulnerable to this - the formal, technical language in a policy document or an engineering specification sits far in embedding space from the natural language question a user might ask.

The symptom is poor recall: queries that should return relevant results don't, because the semantic similarity between the query and the matching document is low by the embedding model's metric.

The fix depends on severity. Hybrid search - combining BM25 keyword matching with dense vector retrieval - helps in most cases. Fine-tuning the embedding model on domain-specific examples helps in severe cases. Adding a reranker over the initial retrieval pool is effective and relatively cheap.

The one thing that doesn't help is adding more data to the knowledge base. More data with the same mismatch problem means more irrelevant results to sift through.

---

**The confidence problem**

Standard RAG architectures return an answer. They do not return an uncertainty estimate. When retrieval fails - when the knowledge base simply doesn't contain the information needed to answer the query - a naive RAG pipeline will generate a plausible-sounding answer anyway, using the LLM's parametric knowledge as a fallback.

This is the most dangerous failure mode, especially in domains with high stakes. A system that expresses confident uncertainty - "I don't find information in the knowledge base about this, here's what I do have" - is more useful than a system that confidently generates a plausible answer that isn't grounded in your knowledge base.

Implementing this requires checking the relevance of retrieved context against the query before passing it to the generation step. If no retrieved chunk exceeds a relevance threshold, the system should flag this rather than proceed. You can use the retrieval similarity scores as a rough proxy, though a small separate classification step on "is this retrieved content actually useful for this query" is more reliable.

---

**The staleness problem**

Knowledge bases go stale. Regulations change. Procedures are updated. In most deployed RAG systems I've seen, there is no robust mechanism for invalidating cached embeddings when source documents change. The knowledge base is re-indexed periodically at best, and users can receive answers grounded in outdated information without any indication that the source document has since been revised.

This is an infrastructure problem more than an ML problem. Document versioning, change detection, and selective re-indexing are necessary for any RAG system deployed on a knowledge base that changes over time. They're also almost always deprioritized until a user reports a wrong answer.

---

None of this is a critique of RAG as an approach. It's a correct architecture for the problem it solves. But the gap between a RAG prototype that performs well in a demo and a RAG system that performs reliably in production is almost entirely explained by these four issues.

They're not glamorous. They don't improve benchmark numbers. But they're where the actual deployment work lives.
