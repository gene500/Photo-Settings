# Settings Suggestor: design (DRAFT, awaiting owner approval)

## Intent and why
A web app that suggests camera settings (aperture, shutter speed, ISO) for a shooting
scenario. Built for the owner's personal reference and for **new camera users**.
New users have no photo history, so the core experience must work with no photos at all.

## Goals
- A new user gets a useful, achievable suggestion in seconds, with no photos and no setup.
- Every suggestion carries a one- or two-sentence plain-language explanation.
- Never suggest settings the user's gear cannot do.
- Fully client-side: photos and EXIF never leave the browser.
- Owner can optionally personalize from their own photos.

## Non-goals
- No accounts, backend or database. No photo upload to any server.
- No photo analysis for new users (owner decision, 2026-11-23).

## Anti-goals
- A first-time visitor hitting a wall (import prompt, empty dashboard) before seeing value.
- Any suggestion the gear cannot achieve.

## Modes
1. **Default (everyone):** pick gear by hand (or use generic kit-lens defaults, e.g. f/3.5-5.6),
   choose a scenario (subject + light), get a suggestion with explanation. Rule-based only.
2. **Personalize with my photos (optional, off by default):** EXIF import, gear detected from EXIF,
   habits dashboard, personalized adjustments with sample size shown; falls back to rules when
   data is thin and says so.

## Constraints / stack (owner's spec)
Vite, React, TypeScript (strict), Tailwind, exifr, idb (IndexedDB), Recharts or D3, Vitest.
Static site deployed on Vercel from `gene500/Photo-Settings` (deploys on push to `main`).
Engine in `src/engine/` as pure, unit-tested functions with no UI imports.
Types in `src/types.ts`: PhotoRecord, GearProfile, Scenario, Suggestion. No `any`, named exports.
`samples/` is gitignored; never commit personal photos.

## Visual style (matches owner's Photo-App, read from the live site)
- Light default: page `#ECE6D8`, card `#F7F2E6`, text `#1F1B14`, primary button `#26201A` on `#FAF6EC`,
  inputs `rgba(61,48,25,.07)` with 1px `rgba(61,48,25,.13)` ring, 12px radii, soft card shadow.
- Dark (follows system): bg `#0E0E0D`, surface `#1B1B19`, fg `#EDEDEA`, muted `#A09F98`,
  accent `#B9A47A` / strong `#DCC99F` / soft `#34301F`, danger `#F19A92`.
- Fonts: Geist (body), Bricolage Grotesque (headings, 600).

## Approaches considered
- **A. Static Vite SPA on Vercel (chosen, recommended):** matches spec, no backend, private by design.
- B. Next.js on Vercel: more machinery, nothing needed from server rendering.
- C. Photo-first (import required): rejected, it blocks new users.

## Phases (MVP first; owner approved this order 2026-11-23)
MVP: 0 Setup, then 2 Gear profile (manual entry, persisted in IndexedDB), then 3 Rule-based
suggestor + scenario picker + result card, then a first Vercel deploy.
After MVP: 1 EXIF import (opt-in mode, also enables EXIF gear detection), 4 Habits dashboard (opt-in),
5 Personalization (opt-in), 6 Polish, README with GIF and privacy note.

## Scenario and Suggestion scope (owner approved 2026-11-23)
Scenario = subject + light + optional goal (freeze motion, blur background, balanced; default balanced).
Suggestion = one triple (aperture, shutter, ISO) + recommended mode (aperture or shutter priority)
+ warnings + one- or two-sentence explanation. No metering, focus or white balance.

## Calls I made (owner to check)
- Manual gear entry is the primary path; EXIF detection is a shortcut (changes spec's Phase 2).
- Generic kit-lens defaults on first run.
- Beginner-friendly wording in explanations.
- Photo features hidden behind an opt-in toggle rather than a separate build.
- Theme tokens and fonts copied from Photo-App.

## Calls from the builder check (my calls, owner to check)
- **GearProfile** holds: focal range, max aperture at the wide and tele ends (so zoom lenses like
  f/3.5-5.6 are handled), min aperture, ISO min/max, shutter min/max (default 30 s to 1/4000),
  and stabilization yes/no. Body and lens are separate entries.
- **Impossible exposures** are clamped to the gear's limits and flagged with a plain warning
  ("too dark for your lens, expect noise or blur"). The Suggestion type has a `warnings` field.
  A suggestion is never outside the gear's limits.
- **PhotoRecord** keeps the fields later phases need: camera, lens, focal length, aperture,
  shutter, ISO, timestamp, rating, plus a computed exposure value. EXIF has no subject or light,
  so Phase 5 will infer light from exposure value; defined when Phase 5 is planned.
- **Fonts** are self-hosted (fontsource), so the app makes no third-party request and the privacy
  note stays true.
- **Mobile-first layout** (phone at a shoot), keyboard-usable and readable contrast.
- **Repo and Vercel:** the repo was empty; the Vercel project is created in Phase 6 (earlier if wanted).

## Left to the builder
Component layout, exact scenario list, exposure-math details, chart library choice (Recharts vs D3).
