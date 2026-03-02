# Dhruv Choudhary — Portfolio v2

Vite + React + TypeScript. No UI library. Fully custom.

## Setup

```bash
# 1. Install (bun works great here)
bun install
# or: npm install

# 2. Add your Groq API key
cp .env.example .env
# Edit .env and add: VITE_GROQ_API_KEY=your_key_here
# Get a free key at https://console.groq.com

# 3. Run
bun run dev
# or: npm run dev
```

## Terminal Commands

The Arch Linux terminal in the hero section supports:
`help` `whoami` `neofetch` `ls` `cat` `cd` `pwd` `git log`
`skills` `projects` `resume` `contact` `open <target>`
`search "<query>"` — Groq AI web search
`ask "<question>"` — Groq AI Q&A
`history` `echo` `date` `uname -a` `uptime` `ping` `clear` `exit`

Keyboard shortcuts: ↑/↓ for history, Tab for completion, Ctrl+L to clear, Ctrl+C to cancel.

## Theme Transitions

- **Dark → Light**: Stars waterfall from top-right → bottom-left with sparkles, comet tails, and burst effects
- **Light → Dark**: Triple meteor streaks from top-right with electric sparks, shockwave ring, and radial dark wipe

## Build & Deploy

```bash
bun run build   # outputs to dist/
```

Deploy to Netlify/Vercel — build command: `bun run build`, output: `dist/`

## Customization

All personal data is in the component files — easy to find and update.
