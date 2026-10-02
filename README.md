# Nightjar

A responsive stargazing planner built with React, TypeScript, Vinext and Astronomy Engine.

## Included in this beta

- Live hourly Open-Meteo weather, an explained planning score, and a best-hour recommendation.
- Low/middle/high cloud cover, near-surface visibility, dew point and temperature margin for the selected forecast hour. Dew guidance is a heuristic; visibility is not astronomical seeing or transparency.
- Location search, coordinates, optional browser geolocation, an OpenStreetMap view, and device-local saved places.
- Optional, user-entered Bortle class (1–9) for observing sites, shown in saved places, comparisons and the offline plan. It is separate from the weather score and is not a light-pollution map measurement.
- Shared observing time in UTC with local-time display; bright-star sky chart and calculated planetary positions. On first open, the time starts at the next astronomical-dark period for the restored site, or evening civil twilight when full darkness is unavailable in the next two days. If neither occurs, it starts at the next hour.
- Search the 39 existing sky targets by name, filter by horizon visibility, inspect altitude/azimuth, and highlight a target in the atlas.
- Twelve-hour Moon/bright-planet altitude table, daylight context and highest-after-civil-twilight sample shortcuts.
- Moon phase, illumination and horizon position; next Sun/Moon rise/set and astronomical darkness crossings.
- Latest NOAA OVATION aurora outlook, hemisphere grid, local model estimate, timestamps and stale-data warnings.
- Typical annual meteor peak windows with calculated Moon illumination and downloadable all-day calendar events.
- Golden-hour and blue-hour windows for morning/evening, based on Sun altitude and the shared observing time.
- Camera field-of-view, 35 mm equivalent focal length, image scale and guiding RMS conversion.
- Named equipment setups saved on this device.
- Small-field mosaic planner with overlap, rotated panel centres and CSV export.
- Interactive 3D Moon with NASA surface imagery, labelled landmarks, phase lighting and a lunar phase timeline.
- Compare up to four saved/current locations at the same UTC forecast hour, with weather, Moon visibility and an explained planning score. Each site also shows its best remaining dark forecast window and can open the Tonight planner at that site and time.
- Upcoming lunar eclipses with global contact times and local Moon altitude at each contact, plus UTC-safe calendar downloads containing the full event and contact notes.
- A feature-detected WebMCP location tool.

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

Not implemented: light pollution data, multi-model comparison, aurora alerts (the short-term outlook is included), AR, full deep-sky catalogue, sky-photo recognition, full-sky framing overlays, cloud accounts and push notifications.

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

Mobile visibility uses an object picker and a three-column hourly card grid. Desktop retains the comparison table. The header links directly to expanded installation instructions.

The Sky atlas tools, Places comparison, Aurora, Sky calendar, Moon explorer and Photo tools load when their tabs are first opened. This reduces the initial Tonight JavaScript download on mobile. An uncached tab needs a connection on its first visit; previously fetched app files may be available offline while the planner remains open, subject to browser cache eviction. Each deferred view has its own loading and error boundary: a failed download or rendering error shows a reload action while the rest of the planner remains usable. The recovery reload keeps the last saved observing time using a one-use session value. The offline fallback remains limited to saved device data.

Mobile observing navigation includes a fixed Explore button that opens all seven sections in a modal menu, a selected-target chart shortcut and a return-to-search link. Selecting a section preserves the observing site and time, closes the menu, and scrolls and focuses its heading. Escape or cancelling restores focus to the Explore button; keyboard focus stays inside the open menu. A Skip to planner link bypasses the header and tabs. Anchor destinations are keyboard-focusable, and the menu scrolls on short landscape screens with standalone safe-area padding.

## Cloudflare deployment from GitHub

See [CLOUDFLARE.md](./CLOUDFLARE.md) for Workers Builds settings. Build with `npm run build`, deploy with `npm run deploy`, and validate packaging without publishing with `npm run deploy:check`.

Optional red-light display mode tints the page, including charts and Moon imagery, and remembers the setting in browser local storage. It does not control screen brightness or browser/OS surfaces; colour-coded charts change appearance while enabled.

Sky atlas saved targets: save/remove catalogue objects locally, with current altitude and horizon status. The list persists across reloads and remains visible independently of search/horizon filters.

Saved sky targets can be downloaded as a plain-text observing checklist with UTC and local time, coordinates, altitude, azimuth, horizon status and space for notes. The list is a snapshot of the selected observing time and place.

Each sky target supports up to 2,000 characters of personal notes, automatically saved on the current browser and included when exporting favourites. Removing a favourite retains its notes; clearing the notes field removes that note. Notes do not sync between devices or hosting domains.

The full sky atlas offers independent star-pattern line and object-label display controls. Hiding labels retains the selected target label and cardinal directions. The small bright-star chart remains an approximate planning view.

Visible stars, planets and the Moon can be selected directly from the full sky chart by pointer or keyboard. Selection highlights the object and links back to its details; the small dashboard preview remains a static overview.

The Sky atlas also has a separate Milky Way planner. Its optional dashed marker shows the direction of the galactic centre when above the horizon, using NASA's published position. The card reports altitude and azimuth at the chosen time, then samples the next 24 hours in 15-minute steps for fully dark periods with the direction at least 10° up. It shows the best contiguous dark window, the highest sampled point, Moon status, and a shortcut to that observing time. This is a sightline for planning, not a visible point source or a full Milky Way map; local obstructions, clouds and light pollution are not modelled.

The meteor calendar sorts the next annual occurrences after the selected observing time. For each typical local peak date pair, it samples hourly astronomical darkness and Moon-below-horizon conditions, identifies the longest contiguous Moon-free window, and shows an average cloud forecast when that date is covered by the seven-day weather data. Shower rates remain ideal reference values; radiant height and the exact annual peak are not calculated. Calendar downloads retain their typical overnight all-day window.

The Tonight dashboard groups future hourly weather into local observing nights (noon to noon) and shows up to seven nights with astronomical darkness. Each card scores the best consecutive dark forecast-hour pair using the existing cloud/darkness/Moon heuristic, displays forecast coverage, and sets the shared observing time when selected. At an incomplete forecast edge it can use one hour. A card can also download a tentative timed calendar event with the site, forecast score and cloud/Moon context; calendar apps display its UTC event times in their own time zone. This is a planning comparison, not a seeing or transparency prediction.

The 3D Moon renderer is isolated from lunar facts and eclipses and uses static Three.js imports so unused exports can be removed from the production bundle. Partial initialization and texture failures dispose allocated WebGL resources. A failed globe download has its own recovery boundary.

When an updated service worker is waiting, Nightjar offers Update and reload. Activation requires that action; automatic first installation does not reload the planner. The selected observing time is saved for one-use recovery, while saved places, targets, notes and equipment stay in local storage. Real-device installation/update behavior still needs iPhone and Android validation.

Live forecast refresh: weather and site comparisons refresh every 15 minutes while visible and online; aurora refreshes every five minutes. Returning to a stale tab or reconnecting triggers a refresh, with duplicate lifecycle events throttled. Refreshing never changes the chosen observing time. Tonight retains its last successful forecast for the same coordinates if a refresh fails, labels that fallback, and warns once it was fetched over 30 minutes ago. The displayed retrieval time is not the weather model's issue time. Requests revalidate browser caches and have a 20-second client timeout; manual refresh remains available after a failure. No forecast is persisted for offline use.

Observing time entry supports UTC or the observing site's local time zone. The local date picker uses the site's zone rather than the device's zone, including non-hour offsets. Missing daylight-saving hours are rejected without changing the selected sky. Repeated hours require an explicit choice between the two UTC offsets. Switching entry modes preserves the selected instant; UTC remains the initial entry mode. Pending invalid or ambiguous entries do not change forecasts, exports or saved observing time.

Manual plan backup is available in My places. Download a versioned JSON file containing saved sites (including Bortle ratings), favourite targets, target notes and imaging equipment. Import reads a file locally and previews its contents before any write. Merge preserves existing sites within 0.0001° in each coordinate, equipment with matching trimmed names, and notes for the same target; favourites are combined. It preserves the current site and observing instant and refreshes the affected UI without reloading. It does not perform cloud sync or include live forecasts. Backups are limited to 1 MB, 100 saved sites, 39 targets, 100 notes of up to 2,000 characters, and 100 equipment profiles. Invalid files and unsupported versions are rejected. Storage write failures attempt to roll back completed writes and explicitly report if rollback fails. Keep a copy of the file before moving to another device or domain.

Run `npm run test:backup` for backup validation, merge, round-trip and storage rollback regression checks.

Offline recovery retains the selected UTC instant when Try again online is used. The offline page preserves red-light display mode, shows connection hints without automatically navigating away, retains note line breaks and up to 2,000 characters, and warns when storage cannot be read. Numeric saved fields are validated without coercing missing coordinates to zero. Its updated offline document uses the v4 service-worker cache, so existing installations receive it through the normal update prompt. Run `npm run test:offline` for standalone offline-page regression checks.

Sky atlas also offers Download print-ready plan for saved targets. The self-contained HTML file includes interactive checkboxes, full notes and blank note space, exact UTC and site-local time with UTC offset, site coordinates/Bortle rating, snapshot Sun/Moon conditions and validated saved equipment. It opens without external resources and offers the browser's Print or save as PDF action. Tick marks persist only while the file stays open. Print styles remove the controls and use a paper layout; live weather is not included. Names and notes are escaped as plain text. The HTML checklist does not replace the JSON data backup.

Run `npm test` for all repository regression tests, or `npm run test:plan` for standalone observing-plan export checks.
