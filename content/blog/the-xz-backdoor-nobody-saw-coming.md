---
title: "The Linux Backdoor That Almost Worked, and the Postgres Guy Who Caught It"
date: "2026-03-27"
excerpt: "A look back at the xz/liblzma backdoor, a two-year social engineering campaign that nearly compromised SSH on major Linux distributions, caught by a Microsoft engineer chasing a half-second slowdown."
tags: ["security", "open source", "opinion", "Linux"]
coverImage: "https://images.unsplash.com/photo-1695668548342-c0c1ad479aee?fm=jpg&q=80&w=1600&auto=format&fit=crop"
published: true
---

Every so often a security story comes along that's less about a technical exploit and more about human patience, and the xz backdoor is the best example of that I've seen in my lifetime.

Quick recap for anyone who missed it. xz-utils is a compression library, and liblzma, the library underneath it, ends up linked into a huge number of Linux systems because of how deeply it sits in the base toolchain. In early 2024, versions 5.6.0 and 5.6.1 of that library shipped with a backdoor hidden in the build scripts, not in the readable source code. It targeted OpenSSH indirectly, through a chain involving systemd, and with the right private key it would let an attacker slip commands past SSH authentication entirely.

---

The person who found it wasn't looking for a backdoor. Andres Freund, a Microsoft engineer who's also a well known PostgreSQL contributor, was benchmarking Postgres and noticed SSH logins on a test machine were about half a second slower than they should have been. Half a second. Most people would not have noticed that, and if they noticed it, most people would not have gone digging. He went digging.

What he found was a supply chain attack with a timeline of roughly two years. An account using the name Jia Tan had been quietly contributing to the xz project since 2021, doing solid, boring, trustworthy work. Around the same time, a handful of other accounts started pressuring the sole maintainer, Lasse Collin, about slow release cycles and burnout, the kind of pressure that reads completely normal in isolation and only looks coordinated in hindsight. Jia Tan eventually earned commit access and maintainer trust. The backdoor went in through that door, not through a broken lock.

---

Fedora Rawhide and the Fedora 41 beta had already picked up the compromised release. So had Debian's unstable branch, openSUSE's Tumbleweed, and a few rolling-release distributions. None of the stable, widely deployed releases had it yet, which is the only reason this is a story about a close call and not a story about the worst breach in the history of Linux.

---

My opinion on this, for what it's worth: the technical sophistication is impressive, but it's not the part that should keep you up at night. The part that should keep you up at night is that the attack vector was patience and reputation, aimed at exactly the kind of maintainer burnout that's extremely common in open source. Most critical infrastructure software is maintained by a small number of people who are tired, unpaid, and under constant pressure to hand off work to whoever offers to help. That's not a flaw you patch with a CVE. That's a structural weakness in how the internet's plumbing gets maintained, and it was sitting there before this incident and it's still sitting there now.

I don't have a clean fix to offer. I just think anyone who works with open source dependencies, which is all of us, should sit with how close this one came before assuming the next one also gets caught in time.
