# Phase 1: Opt-in EXIF Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner opt in to reading the camera settings (EXIF) from their own photos, keep them on the device, and offer a gear profile detected from them.

**Architecture:** Photo features are a separate, off-by-default mode. Pure helpers in `src/engine/` turn raw EXIF into `PhotoRecord`s and detect gear. Storage grows to IndexedDB version 2 with `photos` and `settings` stores. A thin importer wraps `exifr`, reads only EXIF (the image bytes are never stored or sent anywhere), and reports a summary. The UI is one new card that appears only when the mode is on.

**Tech Stack:** TypeScript strict, React, `exifr` (new dependency), `idb`, Vitest + fake-indexeddb, Tailwind with the Photo-App theme classes.

**Spec:** `docs/superpowers/specs/2026-11-23-settings-suggestor-design.md` (Modes, Goals, Non-goals, Calls from the builder check). MVP plan for conventions: `docs/superpowers/plans/2026-11-23-mvp.md`.

## Global Constraints

- Fully client-side: photos and EXIF never leave the browser. No network request of any kind is added.
- Photo features are off by default. With the mode off, no photo UI shows and no photo is read.
- New users must never hit a wall: the default experience (gear form, scenario, suggestion) is unchanged.
- TypeScript strict, no `any`, named exports. `src/engine/` stays pure: no React, DOM or storage imports.
- Never suggest or save gear the gear limits forbid: detected gear passes `validateGear`.
- `samples/` is gitignored; no real photos in tests or commits. Tests use hand-built fixtures.
- Use the theme classes (`card`, `input`, `banner-error`, `btn-primary`, `btn-secondary`, `btn-ghost`); touch targets stay 44px via the theme.
- TDD (red, then green); `npm test`, `npm run lint`, `npm run build` pass before each commit; commit locally, never push without the owner's "push".

## Review Focus

Failure modes the spec implies but no obvious test covers, most likely first. Each has a pinning test in the task named in brackets.

1. **Importing the same folder twice** must not double-count: re-import is idempotent. [Task 3]
2. **Files that are not usable photos** (no EXIF, screenshots, PDFs, corrupt JPEGs, a missing aperture or shutter, `FNumber` or `ExposureTime` of 0) are skipped and counted; one bad file never aborts the batch. [Tasks 2, 4]
3. **Odd EXIF shapes:** `ISO` as an array, a string where a number is expected, a manual lens with no lens name and focal length 0, a date that is missing or invalid. [Task 2]
4. **Large imports** (thousands of files): files are read one or a few at a time, never all into memory, progress is reported, the page stays responsive, and a storage quota error is reported rather than thrown. [Tasks 3, 4]
5. **Mixed cameras and wrong detection:** detected gear never overwrites the owner's gear without a click, says which fields are guesses (EXIF has no stabilization, narrowest aperture or shutter limits), and picks the most common body and lens when several appear. Turning photo mode off hides everything but keeps the data; only the explicit delete clears it. [Tasks 5, 6]

---

### Task 1: Storage foundation (IndexedDB v2 and the photo-mode setting)

**Files:**
- Create: `src/storage/db.ts`, `src/storage/settingsStore.ts`, `src/storage/db.test.ts`, `src/storage/settingsStore.test.ts`
- Modify: `src/storage/gearStore.ts` (use the shared opener)

**Interfaces:**
- Produces: `openAppDb(): Promise<IDBPDatabase>` (database `settings-suggestor`, version 2, stores `gear` (out-of-line keys), `photos` (out-of-line keys), `settings` (out-of-line keys)); `loadPhotoMode(): Promise<boolean>` (false if unset or storage unavailable, never throws); `savePhotoMode(on: boolean): Promise<boolean>` (false if storage unavailable, never throws).
- Consumes: existing `loadGear` and `saveGear` behaviour, unchanged.

- [ ] **Step 1: Write failing tests**
  - `db.test.ts`: `opens at version 2 with gear, photos and settings stores`; `upgrading a version-1 database keeps the saved gear` (create a v1 db with a `gear` store and a profile under key `current` by hand, then call `loadGear()` and expect the same profile).
  - `settingsStore.test.ts`: `photo mode defaults to false`; `saves and loads photo mode true then false`; `savePhotoMode returns false when storage is unavailable` (spy on `indexedDB.open` to throw).
- [ ] **Step 2:** Run them; expect failures (modules missing).
- [ ] **Step 3: Implement** `openAppDb` with an `upgrade(db, oldVersion)` that creates each store only if missing, so v1 and fresh databases both end at v2. Point `gearStore.ts` at `openAppDb`; keep its public behaviour and tests as they are.
- [ ] **Step 4:** `npm test` (all prior tests still pass), `npm run lint`, `npm run build`.
- [ ] **Step 5: Commit** `feat: storage v2 with photos and settings stores`.

### Task 2: Pure photo helpers

**Files:**
- Create: `src/engine/photo.ts`, `src/engine/photo.test.ts`
- Modify: `src/engine/exposure.ts` (add `exposureValue`), `src/engine/exposure.test.ts`

**Interfaces:**
- Produces: `exposureValue(aperture: number, shutterS: number, iso: number): number` (the EV100 of a shot, the inverse of `shutterFor`; `exposureValue(8, 1/512, 100)` is 15 to within 1e-9); `toPhotoRecord(raw: unknown): PhotoRecord | null`; `photoKey(p: PhotoRecord): string`.
- `toPhotoRecord` reads the exifr field names `Make`, `Model`, `LensModel`, `FocalLength`, `FNumber`, `ExposureTime`, `ISO`, `DateTimeOriginal`, `Rating`. `camera` is `Model` (prefixed with `Make` unless `Model` already starts with it); `lens` is `LensModel` or `''`; `timestamp` is `DateTimeOriginal` in ms; `ev` is `exposureValue(...)`.

- [ ] **Step 1: Write failing tests** (exact values, hand-built objects):
  - `exposureValue(8, 1/512, 100)` is about 15; `exposureValue(2.8, 1/60, 3200)` is about 3.1 (compute and pin the exact value in the test).
  - `toPhotoRecord` of a complete object gives camera `Canon EOS R50`, lens, focal, aperture, shutter, ISO, a numeric timestamp and an `ev`.
  - `rejects a missing aperture, a missing shutter, aperture 0, shutter 0, a non-object, null` (returns null).
  - `accepts ISO as an array and takes the first value`; `accepts numeric strings`; `a manual lens with no LensModel and focal length 0 is kept with lens '' and focalMm 0`; `a missing or invalid date is null for the whole record` (a photo without a time cannot be deduplicated reliably, so it is skipped).
  - `rating is kept only when it is a number from 0 to 5`.
  - `photoKey` is identical for the same shot and differs when any of camera, lens, timestamp, focal, aperture, shutter or ISO differs.
- [ ] **Step 2:** Run; see them fail.
- [ ] **Step 3: Implement** both modules; keep `toPhotoRecord` tolerant of types but strict about positive finite numbers.
- [ ] **Step 4:** `npm test`, lint, build; confirm `grep -rE "react|document|window|indexedDB" src/engine` shows nothing outside tests.
- [ ] **Step 5: Commit** `feat: photo record parsing and exposure value`.

### Task 3: Photo store

**Files:**
- Create: `src/storage/photoStore.ts`, `src/storage/photoStore.test.ts`

**Interfaces:**
- Consumes: `openAppDb`, `PhotoRecord`, `photoKey`.
- Produces: `addPhotos(records: PhotoRecord[]): Promise<{ added: number; duplicates: number } | null>` (null if storage failed, including quota errors; never throws); `loadPhotos(): Promise<PhotoRecord[]>` (empty on failure); `countPhotos(): Promise<number>`; `clearPhotos(): Promise<boolean>`.

- [ ] **Step 1: Write failing tests:** `adds new photos and counts them`; `importing the same photos again adds none and counts them as duplicates` (Review Focus 1); `a repeat inside one call is counted once`; `loadPhotos returns what was saved`; `clearPhotos empties the store and returns true`; `addPhotos returns null when the transaction fails` (mock a quota error); `works for 5000 records in a few seconds` (batch the writes in one transaction).
- [ ] **Step 2:** Run; see failures.
- [ ] **Step 3: Implement** with one read-write transaction per call, key = `photoKey`, skipping keys that already exist.
- [ ] **Step 4:** `npm test`, lint, build.
- [ ] **Step 5: Commit** `feat: photo store with de-duplication`.

### Task 4: EXIF importer

**Files:**
- Create: `src/import/importPhotos.ts`, `src/import/importPhotos.test.ts`
- Dependency: `npm install exifr`. Confirm its licence and bundle size with `npm ls exifr` and the build output; report both in the commit message. If the package has no usable types, add a minimal typed wrapper rather than `any`.

**Interfaces:**
- Consumes: `exifr`, `toPhotoRecord`, `addPhotos`.
- Produces: `readPhotoExif(file: File): Promise<PhotoRecord | null>` (null for anything unreadable, never throws); `importPhotos(files: File[], onProgress?: (done: number, total: number) => void): Promise<ImportSummary>` where `ImportSummary = { total: number; added: number; duplicates: number; skipped: number; storageFailed: boolean }`.
- Behaviour: reads EXIF only (never the full pixel data into memory), processes a few files at a time (at most 4), calls `onProgress` after each file, then writes the records in one `addPhotos` call per chunk of 500.

- [ ] **Step 1: Write failing tests** (mock `exifr` with `vi.mock`): `returns a PhotoRecord for a file with full EXIF`; `returns null when exifr throws`; `returns null when exifr returns undefined`; `a mixed batch of good, bad and duplicate files gives the right summary counts` (Review Focus 2 and 1); `onProgress is called once per file and ends at total/total`; `never has more than 4 files in flight` (count concurrent calls in the mock); `reports storageFailed when addPhotos returns null` and still counts skipped files; `an empty list returns an all-zero summary`.
- [ ] **Step 2:** Run; see failures.
- [ ] **Step 3: Implement** both functions. Use `exifr.parse(file, { pick: [...] })` limited to the fields `toPhotoRecord` reads; check the exact option names against the installed package's types.
- [ ] **Step 4: Integration test with the real exifr:** add a small helper in `src/import/exifFixture.ts` that builds a minimal JPEG with an EXIF segment (Make, Model, LensModel, FNumber, ExposureTime, ISO, FocalLength, DateTimeOriginal) as bytes, and a test that `readPhotoExif(new File([bytes], 'a.jpg'))` returns the expected record. This proves the field names are right against the real parser, not only against the mock.
- [ ] **Step 5:** `npm test`, lint, build.
- [ ] **Step 6: Commit** `feat: EXIF importer`.

### Task 5: Gear detection

**Files:**
- Create: `src/engine/detectGear.ts`, `src/engine/detectGear.test.ts`

**Interfaces:**
- Consumes: `PhotoRecord`, `GearProfile`, `DEFAULT_GEAR`, `validateGear`.
- Produces: `parseLensName(name: string): { focalMinMm: number; focalMaxMm: number; apertureMaxWide?: number; apertureMaxTele?: number } | null`; `detectGear(photos: PhotoRecord[]): DetectedGear | null` with `DetectedGear = { gear: GearProfile; photoCount: number; guessed: string[] }` (`guessed` lists plain-language names of fields EXIF cannot tell us).
- Rules: the body is the most common `camera`; the lens is the most common non-empty `lens` among that body's photos; the focal range and aperture come from `parseLensName` when it can read the name, otherwise from the observed range (observed values are a lower bound on the lens's range, so say so in `guessed`); ISO range is the default range widened to include the observed values; stabilization, narrowest aperture and shutter limits come from `DEFAULT_GEAR` and are always listed in `guessed`. The result must pass `validateGear`, else return null. No photos, or no camera name, returns null.

- [ ] **Step 1: Write failing tests:** `parseLensName` reads `SIGMA 18-50mm F2.8 DC DN | C` as 18 to 50mm at f/2.8 both ends; reads `EF-S18-55mm f/3.5-5.6 IS STM` as 18 to 55mm at f/3.5 and f/5.6; reads `RF50mm F1.8 STM` as a 50mm prime at f/1.8; returns null for `''` and for text with no focal length. `detectGear`: `picks the most common body and lens`; `uses the lens name when it can be parsed`; `falls back to the observed focal range for an unparseable lens name`; `widens the ISO range to include observed ISO above the default maximum`; `lists the guessed fields`; `returns null for an empty list`; `returns null when no photo has a camera`; `ignores photos with no lens name when choosing the lens`; `the result always passes validateGear` (including a manual-lens-only set).
- [ ] **Step 2:** Run; see failures.
- [ ] **Step 3: Implement** both functions, pure and with no storage imports.
- [ ] **Step 4:** `npm test`, lint, build, engine-purity grep.
- [ ] **Step 5: Commit** `feat: detect gear from photo EXIF`.

### Task 6: Photo mode UI

**Files:**
- Create: `src/components/PhotoMode.tsx`, `src/components/PhotoMode.test.tsx`
- Modify: `src/App.tsx`, `src/App.test.tsx` or a new `src/App.photo.test.tsx`

**Interfaces:**
- Consumes: `loadPhotoMode`, `savePhotoMode`, `loadPhotos`, `countPhotos`, `clearPhotos`, `importPhotos`, `detectGear`, `GearProfile`.
- Produces: `PhotoMode({ currentGear, onUseGear }: { currentGear: GearProfile; onUseGear: (g: GearProfile) => void })`, rendered by `App` as its own card below "Your gear". The toggle label is `Personalize with my photos`.

- [ ] **Step 1: Write failing tests:**
  - `App shows no photo UI beyond the toggle by default` (off by default; no file input).
  - `turning the toggle on shows the import button and remembers the choice after a remount`.
  - `choosing files imports them and shows "Imported N, skipped M, already imported K"` (mock `importPhotos`).
  - `shows progress while importing` and `the toggle and delete button are disabled while importing`.
  - `shows the storage-failed notice` when the summary says so.
  - `shows the detected gear with the guessed fields and a "Use this gear" button; clicking it calls onUseGear with that gear and does nothing else` (Review Focus 5); `never calls onUseGear on its own`.
  - `turning the toggle off hides the import UI but does not delete photos`; `"Delete imported photo data" asks for a second click, then clears the store and the detected gear`.
  - `says the photos stay on this device and are not uploaded`.
- [ ] **Step 2:** Run; see failures.
- [ ] **Step 3: Implement** `PhotoMode` and wire it into `App`. When `onUseGear` fires, `App` calls its existing gear-change handler and bumps a key on `GearForm` so the form shows the new values (the form documents that an outside change needs a remount).
- [ ] **Step 4:** `npm test`, lint, build.
- [ ] **Step 5: Commit** `feat: opt-in photo mode UI`.

### Task 7: Verify, privacy check and handoff

**Files:** Modify `README.md`, `docs/HANDOFF.md`.

- [ ] **Step 1:** README: add a "Photo mode (optional)" section: off by default, reads only camera settings (EXIF), nothing is uploaded or stored apart from those settings, how to delete it. Keep the privacy note true.
- [ ] **Step 2: Privacy check:** build, serve with `npm run preview`, and in a browser confirm the network log shows no request other than the app's own files while importing at least 20 generated fixture JPEGs (generate them with the Task 4 fixture helper; use no real photos unless the owner has put some in `samples/`). Stop the server and close the browser; confirm with `pgrep`.
- [ ] **Step 3: Flow check** at phone and desktop widths in light and dark: toggle on, import, re-import (counts show duplicates), see detected gear, "Use this gear" updates the form and the suggestion, reload keeps everything, delete clears it.
- [ ] **Step 4:** Update `docs/HANDOFF.md` (board, decisions, how to run) and commit `docs: phase 1 handoff`.

## Left to the implementer

Component layout and copy inside the photo card, exact progress wording, and the fixture helper's internal byte layout.

## Open points for the owner

- This stores camera settings only (no image data, no filenames or paths). Confirm that is the right amount to keep.
- A photo with no capture time is skipped, because it cannot be told apart from a duplicate. Say if you would rather keep those.
