# Handoff: Settings Suggestor

## Task board (open)

| ID | Task | Status | Est | Use |
|----|------|--------|-----|-----|
| A6 | MVP T9: empty/error states, README, verify, deploy prep | paused | 30 min | Medium |
| A7 | Phase 1: EXIF import (opt-in) | pending | 60 min | Heavy |
| A8 | Phase 4: Habits dashboard (opt-in) | pending | 45 min | Medium |
| A9 | Phase 5: Personalization (opt-in) | pending | 60 min | Heavy |
| A10 | Phase 6: Polish, GIF, final ship | pending | 45 min | Medium |
| A12 | Dataset check: R50 + Sigma 18-50 coverage | blocked | 25 min | Medium |
| A11 | Swap in Photo-App theme CSS (owner paste) | pending | 30 min | Medium |
| SEC | Security review of pending changes | pending | 15 min | Medium |
| FINAL | Full check, merge, push, confirm deploy+CI | pending | 20 min | Heavy |

MVP plan: `docs/superpowers/plans/2026-11-23-mvp.md` (Tasks 1-9). Phases 1, 4, 5, 6 get their own plans later.

## Archive

| ID | Task | Done |
|----|------|------|
| A1 | Design doc, builder check, MVP plan, Phase 0 scaffold (MVP T1) | 2026-11-23: test, lint, build pass; dev server served 200 |
| A5 | MVP T8: scenario picker + result card | 2026-11-23: 80 tests, lint, build pass; suggestion updates with scenario and gear; focal clamps to lens |
| A4 | MVP T6-7: exposure math + suggest engine | 2026-11-23: 66 tests, lint, build pass; 315-case sweep stays inside gear limits on 3 gear kinds; engine imports no UI; sample outputs sanity-checked by eye |
| A3 | MVP T3-5: gear types, storage, form | 2026-11-23: 31 tests, lint, build pass; storage handles corrupt and blocked IndexedDB; saveGear returns boolean (plan updated) |
| A2 | MVP T2: theme, fonts, app shell | 2026-11-23: 3 tests, lint, build pass; computed colors match Photo-App in light and dark; no horizontal scroll at 390px |

## Current work

- **Goal:** web app that suggests camera settings (aperture, shutter, ISO) for a scenario, limited by the user's gear. For the owner's reference and for new camera users. Fully client-side; deployed on Vercel.
- **Repo:** `~/Photo-Settings`, remote `https://github.com/gene500/Photo-Settings` (was empty). Local branch `main`; one local commit (scaffold + docs); nothing pushed yet. Pushing waits for the owner's "push".
- **Execution:** Native (I implement tasks in-session), one fresh Opus review of the whole branch at the end (FINAL). Owner said "start working on everything" on 2026-11-23; local commits after each working step follow the owner's spec.
- **Owner decisions (2026-11-23):** design approved; scenario goal input and output shape approved; MVP-first phase order approved.
- **Just finished:** MVP Tasks 1-7 (scaffold, theme, Card, types, gear helpers, storage, gear form wired into App, exposure math, suggestion engine with explanations).
- **Known limits (not bugs, decide later):** night-sky really wants Manual mode but `ExposureMode` only has aperture/shutter priority; the engine raises ISO before opening the aperture (plan decision), so low light can use a slightly higher ISO than needed. Vite 8, React 19, Tailwind v4, Vitest, ESLint, Prettier. TypeScript pinned to 6.0.x because typescript-eslint does not support TS 7 yet (unpin when it does). Theme runtime vars are `--c-*`, mapped to Tailwind colours in `@theme inline` in `src/index.css`.
- **A12 finding (2026-11-23):** Unsplash Lite (25k photos, 21,108 with model+ISO+f+shutter+focal) has 0 EOS R50 shots (R10: 0, R7: 1), and EXIF has no lens field, so the Sigma 18-50 cannot be identified. Only good for generic per-camera-class stats. FlickrExif (CC-BY-4.0, 13 MB labels) is gated on Hugging Face: owner must request access and log in (`! huggingface-cli login`) before A12 can continue. Raw data and scripts are in the session scratchpad, not the repo.
- **Next:** MVP Task 9 (empty/error states, README, full-flow check), then A11 theme swap last. Format helpers `formatAperture` and `formatShutter` in `src/engine/format.ts` are ready for the result card.
- **Blocked:** nothing.

## Decisions
- Default mode is rule-based only, no photo analysis for new users (owner, 2026-11-23). Photo import, dashboard and personalization are an opt-in mode, off by default.
- Manual gear entry is the primary path; EXIF detection is a shortcut (changes the original Phase 2). Generic kit-lens defaults on first run.
- Theme copied from Photo-App: light default (`#ECE6D8` page, `#F7F2E6` card, `#1F1B14` text, `#26201A` button), dark follows system (`#0E0E0D`, `#1B1B19`, accent `#B9A47A`). Fonts Geist and Bricolage Grotesque.

## How to run
`npm install`, then `npm run dev` (port 5173 by default), `npm test`, `npm run lint`, `npm run build`, `npm run format`.

- **A11 (owner, 2026-11-23: "do this at the end"):** the owner pasted their Photo-App one-file theme; it is saved verbatim at `docs/reference/photo-app-theme.css`. Swap it in as `src/index.css` after the other work. Calls to make then: (1) drop its Google Fonts `@import` and keep the self-hosted fontsource fonts (a third-party request would break the privacy promise; font family names there are "Geist" and "Bricolage Grotesque", so the `@theme` font names need adjusting to the fontsource "... Variable" names); (2) rename token classes in components from `bg-card`, `text-ink`, `bg-field`, `ring-line` to the theme's `bg-surface`, `text-foreground`, `.input`, `ring-border` and use its `.btn-*`, `.card`, `.input`, `.banner*` classes; (3) re-check light, dark and phone width; (4) record the README GIF after this swap.

## Owner follow-ups (not code)
- Add 50-100 own photos to `samples/` (gitignored) for Phase 1.
- Link `gene500/Photo-Settings` to a new Vercel project (done in Phase 6, or earlier if wanted).

## Standing rules
See `~/.claude/CLAUDE.md`: test before claiming done; no commit or push until the owner says "push" (push goes to `main`); max 2 agents with servers or browsers; Opus for the final full check; clean up any browser or dev server I start.
