# Phase 4: Habits dashboard (opt-in)

Spec: `docs/superpowers/specs/2026-11-23-settings-suggestor-design.md`. Owner calls made by me (owner said "keep going"): change any of them freely.

**Goal:** when photo mode is on and photos are imported, show how the owner actually shoots.

**Calls:** shown inside the existing Personalize card (no new opt-in, no new storage); built only from stored settings; plain CSS bars, no chart library; the engine function is pure.

- Task 1: `src/engine/habits.ts` `summarizeHabits(photos): HabitSummary | null` (null for no photos). Fields: `total`, `firstTimestamp`, `lastTimestamp`, `favorite {aperture, iso, shutterS, focalMm}` (most common after snapping to third-stop values; focal rounded to the nearest mm), `apertures`, `isos`, `shutters`, `focals` (sorted `{value, count}` lists), `hours` (24 counts), `highIsoShare` (ISO >= 3200), `slowShutterShare` (slower than 1/60 s). Tests first.
- Task 2: `src/components/HabitsCard.tsx` `HabitsCard({ photos })`: favorites sentence list, bar rows for aperture, ISO and hour of day (each bar has the count as text, so it is readable without the colour), and the two shares in words. Wire into `PhotoMode` below the detected gear (it already loads photos).
- Task 3: tests, lint, build, quick browser check, README line, handoff.
