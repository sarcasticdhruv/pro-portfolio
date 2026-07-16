---
title: "SSH and Me: A Short, Slightly Funny History of the Little Padlock I Use Every Day"
date: "2026-07-14"
excerpt: "SSH gets blamed for problems it never caused, including one I personally accused it of last week. Here's the real history, how I actually use it, and what I still don't know about it."
tags: ["SSH", "git", "dev tools", "engineering"]
coverImage: "https://images.unsplash.com/photo-1633265486064-086b219458ec?fm=jpg&q=80&w=1600&auto=format&fit=crop"
published: true
---

Last week my GitHub contribution graph looked like a crime scene. Dozens of real commits, almost no green squares. My first instinct, the instinct of every engineer since the dawn of time, was to blame the thing closest to the failure that I understood the least. That thing was SSH.

I was wrong. SSH had done nothing. The actual problem was that my laptop had no `git config user.email` set, so every commit was signed with a garbage local address that GitHub could never verify. SSH just moved the bytes. It didn't care whose name was on them.

I bring this up because it's a very on-brand SSH story. Half of what people believe SSH does, it doesn't do. So here's the real, non-scary version.

## A history, kept deliberately short

Before SSH there was Telnet and rlogin. Both shipped your password across the network in plain text, which was fine in 1993 the way leaving your house keys under the mat is fine, right up until it isn't. In 1995 a Finnish researcher named Tatu Ylönen got his own university network sniffed in a password-stealing attack and, reasonably annoyed, wrote SSH over a weekend-ish burst of effort. It caught on fast because it solved an embarrassing problem: everyone was sending secrets in the clear and pretending that was normal.

SSH-1 had its own cryptographic issues later on, so the protocol was redesigned properly into SSH-2 in the late 90s, which is still what you're using today whether you know it or not. That's really the whole history. No twist ending, no billion dollar acquisition. A guy got hacked, got annoyed, fixed it for everyone.

![Red padlock resting on a black computer keyboard](https://cybersecuritynews.com/wp-content/uploads/2026/04/OpenSSH-10.3-Release.webp)

## What I actually use it for

Honestly, two things. Pushing code, and getting into machines that aren't mine.

For git, I don't type a password or a token every time, because that would be a special kind of self-inflicted suffering. I generated a key pair once (`ssh-keygen`), dropped the public half into GitHub's settings, and now my machine and GitHub just recognize each other, like two people who've met at enough conferences to skip the handshake.

I actually run two GitHub identities off one laptop, personal and work, which meant learning `~/.ssh/config` properly instead of pretending it doesn't exist:

```
Host github-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_personal

Host github-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_work
```

Then my remotes just point at `github-personal` or `github-work` instead of `github.com`, and SSH quietly picks the right key. No prompts, no drama, no accidentally pushing a side project under my work identity.

The other use case is logging into actual servers, mostly AWS boxes. Same idea, key based, no password, `.pem` file if AWS handed me one, agent forwarding if I'm feeling brave that day. It is, unglamorously, the least exciting part of my job that I use the most.

![Padlock and keys resting on a computer keyboard](https://images.unsplash.com/photo-1768839722988-91767bb82b10?fm=jpg&q=60&w=1600&auto=format&fit=crop)

## What I don't actually know, and I'm fine admitting it

I could not, at gunpoint, walk you through the Diffie-Hellman key exchange math that lets two machines agree on a shared secret over an insecure channel without ever sending the secret itself. I know it happens, I know it's clever, I know it's the reason a man-in-the-middle can't just read your session. That's about where my understanding politely stops.

I also just click "yes" on that host key fingerprint prompt most of the time, the one that asks if you trust this server you've never seen before. In theory you're supposed to verify that fingerprint through some other channel first. In practice, almost nobody does this for a random EC2 box they just spun up, myself included. I'm not proud of it, I'm just being honest about it.

That's really the whole relationship. SSH is the plumbing under my desk. I don't need to understand the sewage treatment plant to know the toilet should flush. I just need it to keep working, keep my keys straight between two identities, and stop getting unfairly blamed every time my git config is actually the one at fault.
