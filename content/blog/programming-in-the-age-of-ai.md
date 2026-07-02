---
title: "Programming in the Age of AI Is Weirder Than Anyone Admits"
date: "2026-07-01"
excerpt: "On hallucinated function names, the quiet death of Stack Overflow shame, and what's actually still hard about writing software now that the model can write most of the syntax for you."
tags: ["programming", "AI", "opinion", "reflection"]
coverImage: "https://images.unsplash.com/photo-1754548930550-be9fa88874f4?fm=jpg&q=80&w=1600&auto=format&fit=crop"
published: true
---

Somewhere in the last two years I stopped Googling error messages and started arguing with an autocomplete instead, and I'm not totally sure that's an upgrade. It's faster. It's also a little humiliating in a way Googling never was, because Google never confidently told me a function existed when it didn't.

That's still my favorite part of this whole era, honestly. The AI will invent a method name so plausible, so exactly the kind of thing that should exist in that library, that I've spent genuine minutes searching the docs for `array.smartFilter()` before admitting to myself that it made it up on the spot, with total confidence, the way a toddler explains where the missing cookies went.

---

There used to be a small ritual to copying code from Stack Overflow. You'd find the answer, change the variable names so it looked a bit more like yours, maybe delete a comment that gave it away, and never speak of it again. There was a tiny flicker of shame in it, which, weirdly, made you pay a little more attention to what you were pasting. Now I just ask directly and paste the answer straight in, no disguise required, and the shame has mostly evaporated. I'm not sure that's healthy. I've caught myself accepting a whole function because it "looked right" and only actually reading it after it broke, in a way that made me feel, correctly, a little stupid.

---

None of this means the tools aren't genuinely useful, because they obviously are. Boilerplate that used to eat twenty minutes now takes two. Explaining a regex someone else wrote at 1 a.m. three years ago is instant instead of an archaeology project. Refactoring a function while keeping the tests green is a conversation now instead of a slow, careful manual process. I'm not going to pretend to be a curmudgeon about this for the sake of a good blog post. It's a real productivity gain and only a fool would pretend otherwise.

What's changed is which skill is actually scarce. Typing code fast stopped being the bottleneck a while ago. The skill that matters now is reading code fast and knowing, almost by smell, when something is subtly wrong even though it compiles and passes the obvious tests. That's a harder skill to build than typing speed ever was, and it's the one nobody's really teaching, because it only comes from having been burned by confidently wrong code often enough to develop the instinct.

---

Debugging with an AI is its own specific flavor of strange. It's like having a rubber duck that talks back, except sometimes the duck gaslights you with total sincerity, insists the bug is somewhere it isn't, and you have to be the adult in the room and say no, actually, look here. There's something almost funny about being more confident than your debugging tool. I don't remember the last time a compiler tried to convince me of something wrong with that much conviction.

---

Some days I do wonder, half joking, whether I'm still a programmer or have quietly become a very expensive prompt engineer who occasionally remembers how for loops work. Then I hit a bug that the model cheerfully "fixes" three times in a row without actually fixing it, I close the chat, read the stack trace myself, and find it in ninety seconds. That's usually when I remember what the actual job still is. Not typing. Judgment.
