# Phase 5: Personalization (opt-in)

Owner said "keep going", so I made these calls; change any freely.

**Goal:** let the owner's habits nudge suggestions, only if they turn it on.

**Calls:**
- Second opt-in toggle inside the Personalize card ("Nudge suggestions toward my usual aperture"), off by default, saved in the `settings` store under `personalize`. It only works with photo mode on and at least 20 photos (`MIN_PHOTOS_FOR_HABITS`).
- Only aperture is nudged, only the everyday starting aperture, by at most one stop toward the most used aperture (`suggest(gear, scenario, { favoriteAperture })`). Blur-background, freeze-motion and night-sky ignore it, and limits always win. The result carries `personalized: true` only if the final aperture is still the nudged one, and the card says so in a line.
- Not done on purpose (too little evidence to tune, and riskier): nudging ISO or shutter, per-subject habits, learning from ratings.

**Tests:** engine (limits sweep with favourites 1.2 to 32, ignored cases, bad numbers), `usualAperture`, settings flag, PhotoMode toggle (default off, remembered, disabled under 20 photos, null after delete or photo mode off), ResultCard note, and an App test that nothing changes until the owner opts in.
