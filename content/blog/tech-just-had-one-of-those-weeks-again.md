---
title: "Tech Just Had One of Those Weeks Again"
date: "2026-07-09"
excerpt: "Microsoft playing landlord with its own AI vendors, Apple losing to the EU, Claude Fable getting banned then un-banned, agentic browsers becoming a hacker's favorite toy, and regulators calling AI a financial stability risk. One week, five stories, all the same underlying shift."
tags: ["AI", "Big Tech", "regulation", "security", "tech news"]
coverImage: "https://images.unsplash.com/photo-1745015446589-7ee6f702d8c1?fm=jpg&q=60&w=1600&auto=format&fit=crop"
published: true
---

I was going to write about chess boards this week. Instead the entire tech industry decided to have a full blown identity crisis in the span of about seven days, so here we are. Grab a coffee, this one's got Microsoft playing landlord, Apple losing in court, an AI model that got banned then un-banned like a group chat member, browsers turning into hacker bait, and European regulators discovering that AI can also just... break the economy. Fun times.

## Microsoft quietly fired OpenAI and Anthropic from its own apps

So this one is kind of savage if you think about it. Microsoft has been paying OpenAI (and using Anthropic) to power a chunk of the AI features inside Excel and Outlook. Makes sense, they're good models, everyone loves a good model. But apparently someone in Redmond looked at the inference bill and went "why are we paying rent when we could just build the building."

Microsoft has started swapping out select OpenAI and Anthropic models for its own in house MAI family in production workloads inside Excel and Outlook, and we're talking tens of thousands of weekly prompts already rerouted. This comes right after Microsoft dropped new MAI reasoning and multimodal models in June, trained from scratch on licensed data, not just a GPT wrapper with a new coat of paint.

Is it a huge chunk of total Copilot traffic yet? No, still small. But that's not really the point. The point is the direction. If you're building anything on top of a third party LLM API right now (hi, fellow builders), this is basically Microsoft telling you exactly what the next five years of enterprise AI look like: everyone eventually wants to own their own model so they stop bleeding money on inference costs. Vendor lock-in cuts both ways, and apparently it cuts Microsoft too, so they're just... leaving.

If you're building a product on someone else's API today, this is your reminder to have a backup plan that isn't "hope the pricing stays the same forever."

## Apple lost its fight with the EU and the App Store will never be the same

![EU flags outside the Berlaymont building in Brussels](https://images.unsplash.com/photo-1608817576136-0f3a56922823?fm=jpg&q=60&w=1600&auto=format&fit=crop)

Apple has been trying to wiggle out of the EU's Digital Markets Act for a while now, and this week a court basically said no, sit down. The EU General Court upheld classifying iOS and the App Store as "gatekeeper" services, which is Brussels legal speak for "you're too big to play by your own rules anymore."

This is the same DMA that's already been forcing Apple to allow alternative app stores and payment systems in Europe, and now the legal foundation for all of that just got a lot sturdier. Apple's whole argument has always been some version of "our walled garden keeps you safe," and Europe's answer has consistently been "cool story, open it anyway."

Funny enough this ties into the same DMA drama that made Apple delay upgraded Siri AI features in Europe entirely, blaming privacy and interoperability headaches created by the law. So now you've got this weird spiral where regulation aimed at opening up Big Tech is also slowing down AI feature rollouts for regular users. Nobody wins, everybody's mad, very on brand for 2026.

If you ship anything on iOS, even a side project, this is worth watching. The rules of app distribution in Europe are shifting under everyone's feet right now.

## Claude Fable 5 got un-banned and honestly the whole saga is wild

![Abstract blue network of connected nodes](https://images.unsplash.com/photo-1644088379091-d574269d422f?fm=jpg&q=60&w=1600&auto=format&fit=crop)

Okay this one hits close to home for me since I use Claude daily. Quick recap in case you missed it: Anthropic released Fable 5 and Mythos 5 back in June. A few days later, the US Department of Commerce slapped export controls on them over cybersecurity concerns, and access got suspended basically overnight. Then at the end of June the Commerce Department lifted those controls, and Anthropic flipped access back on July 1st.

Mythos 5, the more advanced of the two, is still only available to a small number of vetted organizations, cybersecurity outfits mostly, under tighter safeguards. Fable 5 is back for everyone else.

What I find genuinely interesting here isn't the ban itself, it's how fast the reversal happened. A frontier AI model going dark and then coming back online within a month is not something that happened to software five years ago. AI models are becoming geopolitical objects now, not just products. Access to a model can get switched on and off based on export policy the same way access to advanced chips does. If you're building anything serious on top of frontier models, that's a new kind of infrastructure risk to think about, right up there with rate limits and pricing changes.

## AI browsers are apparently a hacker's new favorite toy

![Code displayed on a screen in yellow and blue](https://images.unsplash.com/photo-1533709752211-118fcaf03312?fm=jpg&q=60&w=1600&auto=format&fit=crop)

This one's less dramatic on the surface but genuinely worth paying attention to if you care about security at all. Security researchers have been sounding alarms that AI powered "agentic" browsers, the ones that can click around, fill forms, and take actions on your behalf, might be opening up a whole new attack surface for hackers.

Think about it for a second. A regular browser just renders what it's told to render. An agentic browser reads a page, interprets instructions on that page, and then goes and does stuff, sometimes with your accounts, your data, your sessions. That's a fundamentally different trust model, and it means a malicious website doesn't need to hack you anymore, it just needs to convince your AI browser to do something dumb on its behalf. Prompt injection but now it has hands.

We are extremely early in figuring out how to secure this category of product, and I'd bet real money this becomes a much bigger story before the year's out.

## Europe just told regulators that AI is now a financial stability problem

![Low angle view of financial district high-rises](https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?fm=jpg&q=60&w=1600&auto=format&fit=crop)

Last one and it's a bit of a curveball. The European Systemic Risk Board put out a warning on July 7th saying frontier AI models could create systemic cyber risks for the entire financial system, not just individual banks getting hacked one at a time.

The concern is basically this: powerful AI models can accelerate the discovery of vulnerabilities, speed up phishing campaigns, and generate malware faster than defenders can keep up, and if that hits enough banks at once in a coordinated way, it stops being an IT problem and starts being an "entire economy has a bad day" problem.

What's notable is who's saying it. This is a systemic risk regulator, the people whose entire job is watching for the next 2008, putting AI on the same list as the stuff that actually keeps them up at night. That's a pretty big shift from "AI safety" being a philosophical debate to it being an actual line item on a central bank's risk dashboard.

## So what's the actual thread connecting all five of these

If you zoom out, every single story this week is really about the same thing: AI stopped being a feature and became infrastructure, and infrastructure comes with infrastructure problems. Microsoft wants to own its models instead of renting them. Apple and the EU are fighting over who controls the App Store. Claude Fable got caught in an actual export-policy squeeze. AI browsers opened up a security hole nobody's finished patching. And now financial regulators are treating AI as a systemic risk instead of a product feature. Different fights, same underlying shift.

Anyway, back to figuring out why my chess board looks like a Windows 95 screensaver in the middle rows. Priorities.
