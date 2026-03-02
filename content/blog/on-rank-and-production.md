---
title: "Department Rank 2 Didn't Teach Me What Production Taught Me"
date: "2026-01-28"
excerpt: "On the specific kind of competence that exams measure and the different kind of competence that production systems require."
tags: ["reflection", "engineering", "growth"]
coverImage: ""
published: true
---

I am, by the metric of my department's grade point system, the second most academically capable student in my graduating class. I tell people this when it seems relevant. I believe it reflects genuine work and not nothing.

It also tells you almost nothing about whether I can be trusted with a production system that processes real government data.

---

Academic performance measures a specific kind of competence: the ability to understand and apply known solutions to well-defined problems within a time constraint. This is a useful ability. If you're good at it, you can demonstrate that you understand how things work, that you can absorb a large volume of information, that you can execute under pressure.

What it doesn't measure: what to do when the problem is not well-defined, when there is no established solution, when there is no time limit because the system just needs to keep working, when the cost of a wrong answer is not a lost point on a rubric but a failed deployment or incorrect data flowing into a live government database.

These are different problems. They require different muscles.

---

The .NET contributions I made to EMIS - a live production system - were initially terrifying in a way that no exam has ever been. Not because the technical content was harder, but because the system was live. Real users. Real data. No version of "I misread the question" that gets you partial credit. You either understand what the change is supposed to do, trace all the places it touches, verify the change doesn't break the invariants the system depends on, and deploy carefully - or something goes wrong in a way that other people notice.

The first time I deployed something to production and nothing broke, I felt a kind of relief I've never felt handing in an exam. That feeling is different from satisfaction. It's specifically relief because you were trying to do something careful and it turned out you did it carefully enough.

Academic performance taught me that I can learn things. Production taught me how to be careful.

---

Being careful is not the same as being slow. It's a mode of attention. You build a model in your head of how a system works - data flows, dependencies, assumptions baked into the code - and you run mental simulations of what your change does to that model before you touch anything. Good engineers do this fast and mostly correctly. I'm getting better at it.

The academic mode is something like: here is a clearly bounded problem, what is the answer. The production mode is: here is a system with state and history and dependencies, what changes can I safely make and how do I verify I made them correctly.

---

I sometimes wonder what the equivalent of "rank 2" would look like for production engineering. You can't rank people on carefulness. You can't rank people on the quality of their mental model of a system they've never seen before. These things aren't measurable in the way that standardized exam performance is measurable.

That's probably fine. The unmeasurability is part of what makes it interesting.

What I know is that my CGPA got me through some doors. What I've learned since walking through those doors is what I'll be using for the rest of my career.
