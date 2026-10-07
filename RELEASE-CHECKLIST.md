# Nightjar first-release checks

The app remains a beta. Automated and desktop-browser results do not establish live-phone camera alignment or installed-PWA reliability.

## Verified locally

- 291 automated tests pass, with the earlier 183-test suite passing three consecutive runs after isolating parallel test caches; TypeScript, lint (without warnings) and production build pass.
- Cloudflare Worker packaging dry-run passes without publishing or requiring app storage bindings.
- Camera mathematical projection, label bounds, interruption state and manual-preview flows have regression coverage.
- Deep-sky catalogue search, coordinates, altitude/Moon filtering and imaging geometry have calculation coverage.
- Saved plans, backups, diary drafts and downloads have validation and recovery coverage.
- The actual service worker recovered from server errors and stalled navigation on an isolated browser test origin.
- The actual app recovered from delayed town search and photo responses using isolated local test fixtures.
- Relevant UI flows were checked at desktop, 390-pixel mobile and 320-pixel compact widths. This is not a claim that every screen was tested at every width.
- The latest built-app smoke check confirmed update-and-reload recovery, retained saved targets/diary records, mobile tab navigation and compact photo-tool/atlas layouts without horizontal page overflow. Camera manual target centring, thumbnail display, full-screen entry/exit and closing were checked at 320 × 568; no camera or motion permission was requested.

- Camera shortcuts restore launch-button focus; delayed diary navigation, 15-second timeout and retry were checked on isolated local origins. A late section load does not move focus after timeout.

- An isolated browser origin was filled to its actual local-storage quota. Target-note, deep-list and camera-preference failures showed accurate temporary-state messages; freeing space and retrying saved the existing note without retyping, and reload retained it. Test data and cache registrations were removed.
- New filters and camera manual/fullscreen/settings controls were checked at 800 × 400 landscape without document overflow. Hardware permissions were not requested.

- All nine file-export actions use a shared synchronous download request, attach and remove the temporary anchor, and retain the file URL for 60 seconds. Failure cleanup and retry are covered by four tests. The 320-pixel browser check showed no temporary anchor left in the DOM or console errors. The in-app browser did not return a downloadable file, so native file receipt remains unverified.

- Generated reports were checked at 320 × 568: a diary retained a 2,000-character note and long equipment/site text without overflow. A long unbroken plan site name caused horizontal overflow; its heading now wraps. Catalogue plans label their metadata correctly, and the checklist remains usable. Native download and print/PDF handling remain unverified.

- Weather feed validation rejects empty/oversized/duplicate/reversed/overlapping timestamps and misaligned arrays before they reach scoring. Invalid percentages and negative wind/visibility become unavailable. An isolated 390-pixel browser test retained a previous forecast after malformed refresh and recovered through Retry without console errors; its disposable origin storage and caches were removed.

- Long-lived PWA update checks now poll every 15 minutes while visible and online, sharing the event cooldown and pending-request guard. Unit tests cover polling, hidden/offline suppression and cleanup; an actual installed-PWA deployment update remains pending. The final built app also loaded real provider weather successfully without console errors.

- In-app previews for saved bright-target plans, deep-sky plans and filtered diary reports were checked at 320/390-pixel portrait and 800 × 400 landscape sizes. Closing from a frame with Escape returns focus to the trigger, filters determine included saved records, and download preparation keeps the preview open. Native file receipt and printing remain pending.
- Deep-sky exports now retain original J2000 RA/declination when adding current altitude/azimuth. Previously downloaded deep-sky plans should be regenerated to correct coordinate metadata.

- Diary observation removal and Undo preserve original metadata, refuse stale deletions/newer overwrites and respect the 200-record cap. A mobile quota test retained unfinished edit text, kept Undo after a failed restore, recovered after freeing test storage and retained original records after reload. Recovery feedback appears beside Undo; test-origin storage, workers and caches were removed.

- Moon phase labels now wrap correctly through 360°/0°, and the Moon dashboard, forecasts and deep-sky context share the same calculated illuminated fraction. Tests cover an actual new-moon crossing and a full lunation; the mobile Moon screen was checked before the crossing and the original time restored.

- Bright-star atlas positions now use the same J2000-to-date horizontal transformation as deep-sky objects, with one shared rotation per star catalogue pass. Tests cover equal-coordinate agreement at 2000/2026/2100, source/photo preservation and polar bounds. Built-app 3D selection and compact manual camera centring/fullscreen were checked without hardware permissions; real phone accuracy remains pending.

- Full-capacity Unicode/escaped-text backups now fit within a shared 5 MB file bound; export validates the actual formatted JSON, and diary reads allow their validated serialized capacity. Country metadata is bounded to 199 characters. A generated 1.27 MB backup was reviewed/imported through the normal chooser on a disposable mobile origin; all 200 records and 2,000-character Chinese notes survived reload and could be prepared for re-export. Test-origin storage, workers and caches were removed.

- Target-note management was checked with 100 imported archived notes on an isolated origin. A new note remained visible at capacity, survived another-tab updates, saved after freeing a slot and survived reload alongside unrelated newer text. Removal/Undo worked, including restoring editor focus, at 390/320-pixel widths without overflow or console errors. The disposable origin was cleaned.

- Simulated orientation streams now identify an initially upright Safari pose that needs a north anchor, clear the cue after tilting establishes one, and keep it cleared on return upright. Regular/fullscreen camera guidance exposes this setup state. Physical iPhone initialization and alignment remain pending.

- Mosaic CSV rounds coordinates to seven decimals while wrapping RA at 24 hours back to zero. Boundary and rotated-grid tests preserve panel order, precision and original coordinate values.

- Milky Way windows show dates and UTC offsets at both endpoints and at the peak. A built-app overnight window crossed 21–22 April correctly at 320/390-pixel mobile widths without horizontal overflow or console errors; original location/time were restored.

- Exported checklist labels wrap long unbroken names. A valid 98-character label was checked at 320 pixels: the document no longer overflowed, all text remained present and the checkbox worked.

- Milky Way calculation tests cover a real overnight Sydney window, eligible adjacent samples, peak ranking across the full 24-hour search and no invented window during polar daylight.

- Site comparisons retain each last successful forecast during refresh or failure, show update times and suppress highest-score claims until all selected feeds are fresh. Partial failure, retry, initial failure, delayed refresh and deselection were checked on a disposable origin at 320/390-pixel mobile and 1280-pixel desktop widths without overflow or console errors.

- Saved places reread the latest stored collection before mutations and synchronize other-tab changes. Stale removal is refused, Undo preserves newer settings and quota failure retains Undo with adjacent mobile guidance. A disposable origin checked cross-tab additions/re-saving, actual storage failure and recovery surviving reload; test data and resources were cleaned.

- Equipment profiles preserve cross-tab additions/newer dimensions without changing the current imaging draft. Actual quota failure retained Undo with adjacent 320-pixel guidance; freeing space restored the original profile, and reload retained restored/newer/unrelated profiles and the draft. The disposable origin was cleaned.

- Site renaming was checked at 320/390-pixel mobile and 1280-pixel desktop widths, including Unicode, 199-character unbroken names, empty validation, Escape/focus restoration and actual quota rollback/retry. The name and observing time survived reload; saved metadata and unrelated sites were retained. Test-origin data/resources were cleaned.

- Optional Messier/combined camera discovery was checked in manual preview. M13 centred within a degree and opened matching explorer details at the viewer time/site with correct focus; combined selection included all 148 identities available at that stage (now 151 after planetary expansion), below-horizon preview was disabled and the original Polaris handoff still worked at 320 pixels. Hardware permissions were not requested; survey thumbnail receipt was not established and the fallback icon remained usable. The disposable origin was cleaned.

- The Milky Way marker now uses an explicit galactic-coordinate origin and precesses it to the observing date. Independent vector-pipeline tests cover 2000/2026/2100 and polar latitudes. A 390-pixel browser check confirmed agreement between the 2D marker and card before/after using the peak time, without overflow or console errors; the disposable origin was cleaned.

- Camera picker search matched NGC aliases and Unicode names while retaining a followed object outside the filter, including fullscreen. Empty results kept guidance available; Clear restored all options and focus to search. Final 320/390-pixel portrait and 800 × 400 landscape checks had no overflow or console errors; the disposable origin was cleaned.

- Observing-plan UTC metadata retains seconds and milliseconds; local time includes seconds and offset. Regression tests cover repeated-clock occurrences and local year rollover. A generated 320-pixel report showed the full UTC instant and Kathmandu next-day time without overflow, and its checklist worked. Native print/download receipt remains pending.

- Meteor planning preserves early calendar years, validates export dates and folds calendar lines within UTF-8 bounds. Upcoming cards advance at site-local noon and recommend only remaining complete hours, bounded at both ends. Browser checks confirmed year 99, London rollover, a future Explore action and compact 320/390-pixel layouts without errors; the disposable origin was cleaned.

- Mercury, Uranus and Neptune now share the sky/camera/visibility catalogue, increasing it to 42 targets (151 combined with Messier). Planet magnitudes are calculated at the selected date. A mobile check loaded Neptune’s attributed image/details, centred Mercury in manual camera preview, prepared a version 4 backup and displayed all 42 targets plus notes offline. Older backup versions remain importable; native file receipt and live-phone alignment remain pending. The test origin was cleaned.

- Both saved-target lists preserve the explicit Save/Remove action against latest storage, retain Undo after quota failure and preserve other-tab additions. Imported names without current catalogue positions have explicit removal controls. A 320/390-pixel disposable test checked capacity, both actual quota failures/retries, deep-sky additions, reload and unchanged notes; the origin was cleaned.

- Messier details directly open the selected object in current-time manual camera preview. Disposable 320/390-pixel portrait and 800 × 400 landscape browser checks verified above-horizon centring, full-screen entry/exit, return focus, ordinary-camera reset and below-horizon guidance without requesting hardware permissions. The planner time stayed unchanged when closing. All 273 tests, type checking, lint, production build and Cloudflare packaging passed; the disposable origin was cleaned.

- Unfinished diary forms preserve newer unrelated object drafts and refuse conflicting edits. Two-tab and actual-quota retry checks retained 1800 characters and unrelated equipment/notes through reload at 320 pixels; no console errors or overflow. Test resources were cleaned.

- Conflicting unfinished diary forms can be reviewed side by side in selectable note fields. Both version choices retain unrelated peer forms, and stale local/saved reviews refuse overwriting. Two-tab 320-pixel mobile/1280-pixel desktop checks passed without overflow or console errors; reviewed local copies remained available after choosing stored text.

- M13/M31 featured mission references and smaller camera thumbnails decoded in a disposable browser. Survey switching retained the J2000 request; enlarged zoom and processed/core captions were verified at 320/390-pixel portrait and 800 × 400 landscape without overflow or console errors. Hardware alignment remains pending.

- Raw recovery downloads preserve whitelisted stored text and list unreadable entries without modifying storage. A disposable malformed-notes flow verified normal backup refusal and raw preparation at 320/390 pixels with no overflow/errors. The raw format cannot be imported directly; native file receipt remains pending.

- Deep-sky comparison windows prepare tentative UTC calendar events after validating all adjacent eligible samples. Mobile/desktop checks verified target/interval selection, Moon-filtered bounds and scoped confirmations. Calendar text/DST/Unicode bounds pass automated checks; native receipt and phone calendar import remain pending.

## After the next GitHub Desktop push

1. Check the **Validate Nightjar** action. Its first hosted run and clean Linux installation are still pending.
2. Set the Workers Builds build command to `npm run verify`, with the existing deploy command `npm run deploy`. The GitHub check alone does not gate an independently configured Cloudflare build.
3. Confirm the production home page, weather/place/aurora API responses, manifest, service worker and `/offline` page on the final HTTPS origin.
4. Import a backup on that final origin if needed. Browser data is separate between localhost, the prior hosted site and Cloudflare.

## Phone acceptance tests

Use an actual phone on the final HTTPS origin. Record browser, OS, installed/browser mode and what happened. Keep a backup before these checks.

| Area | Test | Pass condition |
| --- | --- | --- |
| Camera discovery | Start camera and enable motion yourself. Slowly turn through cardinal directions and tilt. | Predicted labels move with the view; they do not remain fixed to the screen. No repeated unexplained disappearance or frozen video. |
| Compass setup | On iPhone, begin upright, enable motion, then tilt slightly away from upright when prompted. | The initial compass setup cue clears after north is anchored; names track when returning upright. Physical verification remains pending. |
| Camera alignment | Use a clearly identifiable bright target and the alignment controls. Repeat after rotation. | The label remains near the target after alignment, with understandable recalibration guidance if needed. Accuracy is not yet established by desktop tests. |
| Camera fallback | Decline motion or use manual mode. | The manual controls work and the UI identifies manual operation. Labels remaining fixed while moving the phone in manual mode are expected. |
| Messier shortcut | Select a Messier object in the explorer and choose Find in camera view. Compare with a known bright-star alignment before following a faint target. | The chosen object uses current viewer time/site; below-horizon guidance is clear. Camera/motion stay off until enabled. Returning to ordinary camera restores its default catalogue. |
| Full screen | Enter full screen, rotate portrait/landscape, return and close. | Labels and essential controls remain usable around notches/safe areas; video and orientation recover. |
| Permissions | Deny or revoke camera/motion permission, then retry through supported browser controls. | A useful message and recovery path appear. Permission should never be requested silently on page load. |
| Lifecycle | Background/resume or interrupt the camera. | Video/labels pause or recover coherently; stale sensor/video data is not presented as current. |
| Install | Install from the final origin and reopen it. | Correct icon/name and standalone layout; required live data still indicates network dependence. |
| Offline fallback | Open online once, save targets/notes/diary records, then enable flight mode and reopen. | Saved records appear on the offline page. Full planner startup offline is not a supported release promise. |
| Reconnect | Turn flight mode off and use the retry control. | The planner returns, saved records remain and live requests can refresh. |
| Drafts | Type a diary draft, switch tabs, reload and return. | Text and original site/time recover; changing the snapshot requires the explicit action. |
| Backup | Export and review-import on another device or origin. | Counts and conflict handling are clear; existing local versions are preserved as described. Drafts are excluded. |
| Downloads | Download a diary report/CSV; open the report and print/save as PDF. | Original times/sites and complete notes are retained. Native phone download/PDF handling remains unverified. |
| Updates | Deploy a later release and accept Update and reload. | Saved data and selected observing time survive; update does not loop or silently discard unfinished forms. |

## Scope limits

The camera overlays predicted catalogue positions; it does not recognize sky objects from camera pixels. The optional Messier/combined camera catalogues provide predicted directions for 109 deep-sky objects; their photos/details open in the separate explorer. Most need binoculars or a telescope, and camera pixels are not analyzed. Light-pollution maps, cloud accounts, push alerts, an AI assistant, a photo gallery and full reference-site feature parity remain outside this first-release implementation.

Completion percentages previously reported were estimates. Release acceptance is based on these checks, especially the remaining physical-phone and production-origin tests.
