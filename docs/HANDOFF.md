# Handoff: Settings Suggestor

## Task board (open)

| ID | Task | Status | Est | Use |
|----|------|--------|-----|-----|
| A2 | MVP T2: theme, fonts, app shell | active | 20 min | Light |
| A3 | MVP T3-5: gear types, storage, form | pending | 50 min | Medium |
| A4 | MVP T6-7: exposure math + suggest engine | pending | 60 min | Heavy |
| A5 | MVP T8: scenario picker + result card | pending | 30 min | Medium |
| A6 | MVP T9: polish, README, deploy prep | pending | 25 min | Medium |
| A7 | Phase 1: EXIF import (opt-in) | pending | 60 min | Heavy |
| A8 | Phase 4: Habits dashboard (opt-in) | pending | 45 min | Medium |
| A9 | Phase 5: Personalization (opt-in) | pending | 60 min | Heavy |
| A10 | Phase 6: Polish, GIF, final ship | pending | 45 min | Medium |
| SEC | Security review of pending changes | pending | 15 min | Medium |
| FINAL | Full check, merge, push, confirm deploy+CI | pending | 20 min | Heavy |

MVP plan: `docs/superpowers/plans/2026-11-23-mvp.md` (Tasks 1-9). Phases 1, 4, 5, 6 get their own plans later.

## Archive

| ID | Task | Done |
|----|------|------|
| A1 | Design doc, builder check, MVP plan, Phase 0 scaffold (MVP T1) | 2026-11-23: test, lint, build pass; dev server served 200 |

## Current work

- **Goal:** web app that suggests camera settings (aperture, shutter, ISO) for a scenario, limited by the user's gear. For the owner's reference and for new camera users. Fully client-side; deployed on Vercel.
- **Repo:** `~/Photo-Settings`, remote `https://github.com/gene500/Photo-Settings` (was empty). Local branch `main`; one local commit (scaffold + docs); nothing pushed yet. Pushing waits for the owner's "push".
- **Execution:** Native (I implement tasks in-session), one fresh Opus review of the whole branch at the end (FINAL). Owner said "start working on everything" on 2026-11-23; local commits after each working step follow the owner's spec.
- **Owner decisions (2026-11-23):** design approved; scenario goal input and output shape approved; MVP-first phase order approved.
- **Just finished:** MVP Task 1 (scaffold). Vite 8, React 19, Tailwind v4, Vitest, ESLint, Prettier. TypeScript pinned to 6.0.x because typescript-eslint does not support TS 7 yet (unpin when it does).
- **Next:** MVP Task 2 (theme, fonts, shell), then Tasks 3-9 in order.
- **Blocked:** nothing.

## Decisions
- Default mode is rule-based only, no photo analysis for new users (owner, 2026-11-23). Photo import, dashboard and personalization are an opt-in mode, off by default.
- Manual gear entry is the primary path; EXIF detection is a shortcut (changes the original Phase 2). Generic kit-lens defaults on first run.
- Theme copied from Photo-App: light default (`#ECE6D8` page, `#F7F2E6` card, `#1F1B14` text, `#26201A` button), dark follows system (`#0E0E0D`, `#1B1B19`, accent `#B9A47A`). Fonts Geist and Bricolage Grotesque.

## How to run
`npm install`, then `npm run dev` (port 5173 by default), `npm test`, `npm run lint`, `npm run build`, `npm run format`.

## Owner follow-ups (not code)
- Add 50-100 own photos to `samples/` (gitignored) for Phase 1.
- Link `gene500/Photo-Settings` to a new Vercel project (done in Phase 6, or earlier if wanted).

## Standing rules
See `~/.claude/CLAUDE.md`: test before claiming done; no commit or push until the owner says "push" (push goes to `main`); max 2 agents with servers or browsers; Opus for the final full check; clean up any browser or dev server I start.
