# Settings Suggestor

Suggests camera settings (aperture, shutter speed and ISO) for the shot you are about to take, based on your own gear. Made for personal reference and for people new to their camera.

Pick a subject, the light, what you want from the shot and your focal length. You get one set of settings, the mode to use on your dial, any warnings, and a sentence or two on why.

## How it works

- **Your gear:** enter your lens and camera limits by hand. A generic kit lens (18-55mm f/3.5-5.6, ISO 100-6400) is filled in on first run.
- **Rule-based, no photo analysis.** The suggestion comes from exposure math and a few photography rules of thumb (the reciprocal rule for handheld shutter speed, the 500 rule for stars). It never returns a value your gear cannot set; when the light is too dark or too bright for your gear it says so.

## Photo mode (optional)

Off by default. Switch on "Personalize with my photos" and choose some photos to let the app learn your camera and lens.

- It reads only the camera settings stored inside each photo (camera, lens, focal length, aperture, shutter speed, ISO and the time it was taken). It does not keep the picture, the file name or where the file is.
- Photos without a capture time are skipped. Importing the same photo twice does not count it twice.
- The detected camera and lens are only suggested. Nothing changes until you press "Use this gear".
- Once photos are imported, a "How you shoot" card shows your most used aperture, ISO, shutter and focal length, how often you use high ISO or slow shutters, your busiest time of day, and bars for apertures and ISO.
- A second switch, "Nudge suggestions toward my usual aperture", is off by default and needs at least 20 imported photos. When on, the everyday starting aperture moves up to one stop toward the one you use most. Blur, motion and star rules still win, your gear's limits always win, and the result says when this happened.
- Everything stays in your browser. "Delete imported photo data" removes it, and turning the switch off hides the feature without deleting anything.

## Privacy

Everything runs in your browser. There is no account, no server and no analytics. Your gear profile (and, if you switch on photo mode, the camera settings read from your photos) is saved only in your browser's own storage (IndexedDB) on your device. If your browser blocks storage, the app still works but tells you the gear will not be saved. Fonts are served from the app itself, not from a third party.

## Run it

```sh
npm install
npm run dev       # development server
npm test          # unit and component tests
npm run lint
npm run build     # production build into dist/
npm run preview   # serve dist/ locally
```

Built with Vite, React, TypeScript, Tailwind CSS and Vitest. The suggestion engine lives in `src/engine/` and has no UI code in it.

## Deploy

A static site: build with `npm run build` and serve `dist/`. On Vercel the Vite defaults work; `vercel.json` adds a Content-Security-Policy that blocks all outside requests, plus other security headers.

## Project notes

Design and plans are in `docs/superpowers/`. Work in progress and decisions are tracked in `docs/HANDOFF.md`.
