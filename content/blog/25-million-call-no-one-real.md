---
title: "The $25 Million Call With No One Real On It"
date: "2026-08-10"
excerpt: "A finance employee at a British engineering firm joined a video call with his CFO and colleagues and wired $25.6 million after they approved it. None of them were real. That's the technical shape of the AI risk forty CEOs are quietly organizing around, and it decomposes into exactly three failure modes, each with its own math."
tags: ["AI", "AI Safety", "engineering", "finance"]
coverImage: "https://upload.wikimedia.org/wikipedia/commons/0/03/The_Treasury_Department_North_side_20240601.jpg"
published: true
---

*Cover photo: the U.S. Treasury Department building, Washington, D.C. Via Wikimedia Commons, licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).*

In February 2024, a finance employee at the British engineering firm Arup joined a video call with people who looked and sounded exactly like his CFO and several other colleagues. Over the course of the call, they approved a transfer. He made it. Fifteen separate transactions, $25.6 million total, out the door.

Every single person on that call was a deepfake. Faces, voices, mannerisms, all synthesized from publicly available footage of real executives who had never joined that call at all.

I wrote about the business side of this a few days back: Jamie Dimon personally recruiting more than 40 CEOs into an AI risk alliance while his own bank rolls out AI agents internally. What I didn't get into is what "AI risk" actually means once you stop treating it as one vague category and start treating it as an engineer would: three separate, well-documented failure modes, each with its own mechanism and its own numbers.

---

**The fraud is the easiest one to point at, because it already has a body count.** The Arup case wasn't a one-off. A finance director at a multinational in Singapore authorized a $499,000 transfer after a Zoom call where every face and voice was fabricated from public media. A Swiss businessman was talked into wiring several million francs over a two-week run of calls with cloned audio of someone he trusted. A Fortune 500 company lost $28 million to the same pattern earlier this year. The FBI's 2025 Internet Crime Report logged more than 22,000 AI-related fraud complaints totaling over $893 million, and separate reporting puts total US deepfake fraud losses at $1.1 billion for the year, with congressional researchers estimating fewer than 5% of voice-clone victims ever report it. This is the half of "AI made cyber risk much worse" that's concrete: voice and video synthesis turned social engineering, previously limited by an attacker's ability to personally impersonate someone convincingly, into something that scales.

**The hallucination problem is quieter and more embarrassing, because it shows up in exactly the kind of work banks are now automating.** Earlier this year, Deloitte had to refund part of its fee on a government report after the report turned out to contain fabricated citations. The mechanism behind that isn't mysterious if you've worked with these systems: a model generating a citation isn't running a verification step, it's completing a pattern. It produces a reference that looks like the kind of thing that should follow a claim like that, and the citation's plausibility is not the same thing as it being causally tied to anything the model actually retrieved. Retrieval-augmented generation was built specifically to fix this by grounding answers in retrieved documents, and it still doesn't close the gap; a 2026 Gartner survey found 67% of enterprises running production RAG systems had at least one hallucination incident in the past year. JPMorgan's LLM Suite is built to do writing and research-analyst-level summarization for its wealth management staff. That's precisely the surface area where this failure mode lives.

**The third one is the least discussed and, to me, the most structurally interesting: multi-step agents compound errors instead of averaging them.** If each step in a pipeline is correct independently 85% of the time, the odds the full ten-step chain comes out right aren't 85%, they're 0.85 raised to the tenth power, which works out to about 20%. Push per-step accuracy to 95% and ten steps still only clears 59%. Gartner's Q1 2026 numbers put the agentic AI pilot failure rate at 78%, and separate 2026 benchmarking found leading models scoring 80-90% on single-turn tasks but dropping to somewhere around 18-24% on sustained, multi-step workflows that cross applications. The dangerous part isn't the failure rate itself, it's that an agent can produce a perfectly plausible-looking output at step nine built entirely on a wrong answer from step two, and nothing about the final output signals that anything upstream went wrong. JPMorgan says more AI agents are coming this year. Loan approvals, regulatory filings, and treasury forecasts are exactly the kind of multi-step, cross-application workflows where this math applies.

---

None of this is being figured out from scratch. In February 2026, the same month the underlying Alliance for Critical Infrastructure was originally founded, the US Treasury issued its Financial Services AI Risk Management Framework, built on top of NIST's existing AI RMF and developed with the Cyber Risk Institute. It lays out 230 control objectives across four functions, Govern, Map, Measure, and Manage, aimed specifically at fraud, model risk, explainability, and cybersecurity for banks, credit unions, and insurers. The framework exists. What it explicitly says is the hard part is execution: it touches governance, legal, compliance, technology, vendor management, HR, and the board all at once, and assumes an organization actually has the coordination and executive backing to run all of that together. That's a fair description of exactly what a 40-company alliance would be useful for, not writing the rules, but getting that many different institutions' compliance and technology teams to actually operationalize the same 230 objectives instead of each reinventing a thinner version alone.

What strikes me most, looking at this as someone who builds these systems rather than reports on them, is that none of the three failure modes above are exotic. Synthetic voice and video are commodity tools now. Citation hallucination in RAG is a known, published, still-unsolved problem, not an edge case. Error compounding in chained agent calls is basic probability, the kind of math you'd check before shipping any pipeline with more than a couple of steps. Forty CEOs organizing around this isn't an overreaction to something theoretical. If anything, it's a fairly late response to three failure modes that were already sitting in production systems before anyone called a meeting about them.

## FAQ

**What actually happened in the Arup deepfake fraud case?**

In February 2024, a finance employee at the British engineering firm Arup joined a video call where AI-generated deepfakes impersonated the company's CFO and other colleagues, convincingly enough that he approved and made 15 separate transfers totaling $25.6 million. No one on the call was a real person.

**Why do RAG systems still hallucinate if they retrieve real documents?**

Retrieval-augmented generation grounds a model's answer in retrieved documents, but the model's citation-generation step is still pattern completion, not a verification process. It can produce a citation that looks plausible without that citation being causally tied to what it actually retrieved, and if the retrieval layer itself surfaces noisy or irrelevant results, hallucination becomes close to guaranteed. A 2026 Gartner survey found 67% of enterprises running production RAG systems had at least one hallucination incident in the past year.

**Why do multi-step AI agents fail more than single-step ones?**

Because errors compound multiplicatively, not additively. If each step in a chain is correct 85% of the time independently, a ten-step chain only succeeds end-to-end about 20% of the time (0.85 to the power of 10). Gartner's Q1 2026 data put the agentic AI pilot failure rate at 78%, and 2026 benchmarks found models scoring 80-90% on single-turn tasks but only 18-24% on sustained multi-step workflows.

**Is there already a regulatory framework for AI risk in banking?**

Yes. In February 2026, the US Treasury issued the Financial Services AI Risk Management Framework, built on NIST's AI Risk Management Framework and developed with the Cyber Risk Institute. It defines 230 control objectives across four functions (Govern, Map, Measure, Manage) covering fraud, model risk, explainability, and cybersecurity, applicable to banks, credit unions, and insurers.

**How big is AI-driven fraud right now?**

The FBI's 2025 Internet Crime Report recorded more than 22,000 AI-related fraud complaints with losses exceeding $893 million, and total US deepfake fraud losses were estimated at $1.1 billion for 2025. Researchers believe fewer than 5% of voice-clone fraud victims ever report the incident, meaning the real total is likely significantly higher.
