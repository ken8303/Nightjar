# Nightjar

A responsive stargazing planner built with React, TypeScript, Vinext and Astronomy Engine.

## Included in this beta

- Live hourly Open-Meteo weather, an explained planning score, and a best-hour recommendation.
- Low/middle/high cloud cover, near-surface visibility, dew point and temperature margin for the selected forecast hour. Dew guidance is a heuristic; visibility is not astronomical seeing or transparency.
- Location search, coordinates, optional browser geolocation, an OpenStreetMap view, and device-local saved places. Rename a selected site with a readable name; saved sites retain their coordinates, time zone and sky rating.
- Optional, user-entered Bortle class (1–9) for observing sites, shown in saved places, comparisons and the offline plan. It is separate from the weather score and is not a light-pollution map measurement.
- Shared observing time in UTC with local-time display; bright-star sky chart and calculated planetary positions. On first open, the time starts at the next astronomical-dark period for the restored site, or evening civil twilight when full darkness is unavailable in the next two days. If neither occurs, it starts at the next hour.
- Search the 42 existing sky targets by name, including Unicode-compatible and spaced text. Filter by horizon visibility or a strict altitude above 30°, inspect altitude/azimuth, and highlight a target in the atlas.
- Twelve-hour Moon/planet altitude table: only objects with a sample above 30° are shown, ordered by peak altitude. Peak-hour jumps, daylight context and above-30° shortcuts after civil twilight share target selection with the atlas. Mobile controls browse the same order; chart/details links preserve the selected object and time.
- Moon phase, illumination and horizon position; next Sun/Moon rise/set and astronomical darkness crossings.
- Latest NOAA OVATION aurora outlook, hemisphere grid, local model estimate, timestamps and stale-data warnings.
- Typical annual meteor peak windows with calculated Moon illumination and downloadable all-day calendar events. Recommendations include only complete hours remaining after the selected time, and move to the next annual occurrence when the site-local window has ended.
- Golden-hour and blue-hour windows for morning/evening, based on Sun altitude and the shared observing time. The Milky Way direction marker uses galactic longitude/latitude zero in a defined J2000 frame, transformed to the observing date; it marks a regional sightline.
- Camera field-of-view, 35 mm equivalent focal length, image scale and guiding RMS conversion.
- Named equipment setups saved on this device.
- Small-field mosaic planner with overlap, rotated panel centres and CSV export.
- Interactive 3D Moon with NASA surface imagery, labelled landmarks, phase lighting and a lunar phase timeline.
- Compare up to four saved/current locations at the same UTC forecast hour, with weather, Moon visibility and an explained planning score. Previous successful forecasts remain visible during refresh/failure with explicit update status; highest-score labels require fresh results for every selected site. Each site also shows its best remaining dark forecast window and can open the Tonight planner at that site and time.
- Upcoming lunar eclipses with global contact times and local Moon altitude at each contact, plus UTC-safe calendar downloads containing the full event and contact notes.
- A feature-detected WebMCP location tool. Coordinate-only selections preserve known time zone, country and Bortle metadata for matching sites; explicitly supplied values win.
- Interactive 3D bright-sky atlas and optional camera overlay with predicted labels, thumbnails, manual alignment and full-screen controls. Camera discovery offers 42 star/solar-system targets, 109 Messier targets or 151 combined; the default stays stars/solar system. Mercury, Uranus and Neptune have attributed NASA reference photos; solar-system magnitudes follow the selected date. Camera target search includes names, catalogue numbers, aliases and Unicode/spaced text, retaining a followed object outside the search. Messier details open in the explorer at the viewer’s time/site. Most deep-sky objects require optical equipment and are not recognizable in phone pixels. Camera alignment still requires real-phone verification.
- A 109-object Messier explorer with archival reference fields, attributed featured M13/M31 mission images, precessed coordinates, 24-hour altitude planning, imaging handoff and a direct camera shortcut. The camera shortcut uses current viewer time at the selected site, selects the object and centres its manual preview when above the horizon; camera and motion remain explicit actions. An optional dark-sky filter keeps only objects with a sampled altitude above 30° during full darkness in the next 24 hours, ranked by their highest qualifying altitude.
- Saved deep-sky shortlists, six-object observing-window comparisons and Moon-down filtering. Each complete qualifying interval can be downloaded as a tentative UTC calendar event with target/site metadata and its own sampled peak.
- An observing diary with recoverable unfinished forms, search/result/UTC date filters, in-app report previews, printable reports and CSV downloads. Saved observations can be removed to free space, with Undo for the latest removal while Sky atlas remains open.
- Version 4 saved-plan backups up to 5 MiB (versions 1–3 remain importable), including full-capacity Unicode notes, legacy-file import and a PWA fallback that displays local saved records after network/server failures. Browser storage capacity can still prevent saving.
- A separate raw recovery download preserves selected Nightjar storage values, including malformed text and unfinished forms, with unreadable entries listed. It is for manual recovery and is not an importable plan backup.
- Local release verification and GitHub checks; deployment preparation is documented in [CLOUDFLARE.md](./CLOUDFLARE.md).

For current release gates and phone checks, see [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md).

## Run locally

Requires Node 22.13 or newer.

```sh
npm ci
npm run dev
```

`npm run build` creates the Cloudflare-compatible deployment output. Site identity is in `.openai/hosting.json`.

## Data and limitations

Weather and place search are fetched server-side from Open-Meteo; no API key is configured. Review provider terms and capacity before commercial use. Saved places are browser-local and are not account-synced. Location coordinates are sent to the weather provider and map provider when those views are used.

The planning score is a transparent heuristic, not astronomical seeing or transparency. There is no terrain horizon correction. The star catalogue is a small bright-star selection with approximate fixed coordinates; this is not a navigation instrument. Meteor peaks are typical annual dates, not year-specific forecasts. The annual calendar links to IMO for detailed current bulletins.

Not implemented: light pollution data, multi-model comparison, aurora alerts (the short-term outlook is included), automatic camera-lens calibration, full deep-sky catalogue, sky-photo recognition, full-sky framing overlays, cloud accounts and push notifications.

## Sources

- https://open-meteo.com/
- https://github.com/cosinekitty/astronomy
- https://www.openstreetmap.org/copyright
- https://skyandtelescope.org/astronomy-resources/light-pollution-and-astronomy-the-bortle-dark-sky-scale/
- https://www.imo.net/resources/calendar/

Aurora: https://www.spaceweather.gov/products/aurora-30-minute-forecast. The polar grid is sampled for display; the local estimate uses the nearest full-resolution cell. Aurora is always the latest feed, independent of the planner date.

Mosaic centres use a tangent-plane projection around the supplied equatorial target. The supplied coordinate epoch is preserved; no precession, mount control, exact spherical overlap or per-panel camera-angle correction is provided. Fields are limited to 10 degrees and target declination to ±75 degrees.

Moon texture: NASA’s Scientific Visualization Studio / LRO, https://svs.gsfc.nasa.gov/4720/. Landmark centres: IAU/USGS Gazetteer of Planetary Nomenclature. The smooth globe approximates phase lighting; it does not model libration, local sky orientation, elevation, terrain shadows or eclipses.


### Mobile and PWA
- Phone navigation displays every section in a two-row grid. Controls use larger touch targets, 16px form text and safe-area padding; data tables scroll inside their own panel.
- `/manifest.webmanifest` provides standalone launch and 192/512px icons; Apple touch icon included. Installation help is at the bottom of the page. Supported browsers can offer a native install prompt.
- Production registers `/sw.js`. Navigation is network-first with a cached `/offline` fallback; the hosting asset server canonicalizes `offline.html` to `/offline`. The fallback reads the last selected observing time, saved targets and full notes (including notes for targets removed from favourites), the last selected site and up to 100 saved places and imaging setups from this browser's local storage. It displays the time in the site's time zone and UTC, but does not update positions, visibility, or forecasts offline. The service worker also keeps up to 80 previously fetched, same-origin `/_next/static/` app files for an open session across brief connection drops. It never caches authenticated app documents or live forecasts. The full planner requires internet when reopening.
- Browser installation and private-site sign-in should also be checked on a physical iPhone/Android device.

Waiting PWA updates reload only after the user chooses Update and reload. If activation fails or takes more than 15 seconds, the controls recover and offer an explicit reload action. The selected observing time has a separate per-tab session copy, so an update or recovery reload cannot accidentally use another tab's time when session storage is available. Saved places, targets, notes, equipment and atlas preferences remain in local storage. Tests cover activation races, timeout/message failures, listener cleanup and per-tab time isolation. Local browser checks cover a real worker update with two different tab times, a deliberately stalled test worker, the mobile recovery controls and reload preserving the chosen time. Physical installed-app updates remain untested.

Long-lived sessions request a service-worker update check when the page becomes visible, returns from browser history, or reconnects. Checks require both a visible page and an online browser, run at most once per minute and cannot overlap. Background failures stay quiet and can retry on a later event. These checks never activate a waiting worker or reload the planner. Tests cover event throttling, hidden/offline gating, pending requests, cleanup and retry after failure; a local browser smoke check verifies planner rendering and the waiting-update area without console errors. Physical-phone resume/reconnect testing remains outstanding.

Mobile visibility uses an object picker and a three-column hourly card grid. Desktop retains the comparison table. The header links directly to expanded installation instructions.

The Sky atlas tools, Places comparison, Aurora, Sky calendar, Moon explorer and Photo tools load when their tabs are first opened. This reduces the initial Tonight JavaScript download on mobile. An uncached tab needs a connection on its first visit; previously fetched app files may be available offline while the planner remains open, subject to browser cache eviction. Each deferred view has its own loading and error boundary: a failed download or rendering error shows a reload action while the rest of the planner remains usable. The recovery reload keeps the last saved observing time using a one-use session value. The offline fallback remains limited to saved device data.

Mobile observing navigation includes a fixed Explore button that opens all seven sections in a modal menu, a selected-target chart shortcut and a return-to-search link. Selecting a section preserves the observing site and time, closes the menu, and scrolls and focuses its heading. Escape or cancelling restores focus to the Explore button; keyboard focus stays inside the open menu. A Skip to planner link bypasses the header and tabs. Anchor destinations are keyboard-focusable, and the menu scrolls on short landscape screens with standalone safe-area padding.

## Saved data and recovery

- If saving bright-target notes fails, the text remains while Sky atlas is open and a Retry saving notes button is available. Leaving the tab or reloading may lose unsaved edits; retry can save them after storage becomes available. Camera preference failures likewise apply only while that viewer remains open.
- Saved places and equipment setups are limited to 100 each, matching backup validation. Existing entries can be updated at capacity. An addition or Undo that would exceed capacity shows a message without silently dropping records. Oversized legacy lists remain available for manual cleanup.
- Target notes include a manager for imported/older catalogue names, removal with Undo, and retained unsaved edits during storage failures or cross-tab updates. Saving enforces the same 100-note bound as backups; oversized legacy collections stay readable until you explicitly free space.
- Saved-place mutations reread the latest stored collection and reflect other-tab updates. Removing a changed record is refused. Failed saves leave the saved list unchanged; the selected observing site remains usable. Saved places offer Undo for the latest removal until another place is removed or the page reloads. Equipment mutations likewise reread the latest saved list, refuse changed-dimension removals and synchronize other-tab updates without replacing the imaging draft. Equipment Undo lasts while Photo tools is open. Both target lists reread the latest stored IDs before saving or Undo, preserving other-tab additions. Failed writes keep the saved list unchanged and retain Undo with nearby recovery guidance. Older imported bright-target names can be removed explicitly without deleting their notes. Both target lists offer Undo while Sky atlas is open. Recovery preserves a record already re-saved and keeps current settings, notes and diary records.
- Diary records and unfinished forms are separate. Drafts retain their original site/time until explicitly changed and are excluded from backups, offline listings and downloads. The app stores no cloud account data.
- Sky atlas shortcuts open camera discovery or jump to the chart, deep-sky explorer and diary. A deferred section can load for up to 15 seconds before retry guidance appears. Closing camera returns focus to its launch button; camera and motion access remain explicit actions inside the viewer.

## Verification and deployment

```sh
npm run verify
```

This runs TypeScript, lint, all tests, the production build and a Cloudflare packaging dry-run. The current suite has 300 passing tests; lint has no warnings. Parallel test files use isolated temporary Vite caches that are removed when their servers close.

See [CLOUDFLARE.md](./CLOUDFLARE.md) for GitHub-connected Workers Builds configuration. The GitHub check runs on pushes and pull requests. Hosted CI, the final Cloudflare origin, live-phone camera alignment and installed-PWA acceptance remain release checks in [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md).

Catalogue lists, comparisons and imaging selectors use the first common name for readability. Alternate names remain searchable and appear in the object details; raw catalogue data is retained. Downloaded deep-sky plans include aliases, catalogue identity and full constellation names in their notes.

## Deep-sky attribution

The 109-object Messier catalogue is adapted from [OpenNGC by Mattia Verga and contributors](https://github.com/mattiaverga/OpenNGC), under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). M102 has no source cross-reference. Full constellation labels follow [IAU names](https://iauarchive.eso.org/public/themes/constellations/), with the source's Serpens Caput/Cauda split retained. Magnitude filters use integrated visual magnitude and do not establish surface brightness or equipment visibility.

## Technical reference

[Development notes](./DEVELOPMENT-NOTES.md) retain detailed feature behaviour, calculations, attribution and earlier local QA evidence. Historical test counts there describe individual development batches; use the release checklist for current status and remaining acceptance tests.
