# Nightjar first-release checks

The app remains a beta. Automated and desktop-browser results do not establish live-phone camera alignment or installed-PWA reliability.

## Verified locally

- 405 automated tests pass, with the earlier 183-test suite passing three consecutive runs after isolating parallel test caches; TypeScript, lint (without warnings) and production build pass.
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

- Camera thumbnail retry recovered controlled failed images manually and after a simulated connection-return event, preserving the followed ID. Photo-off disabled retry/rendering; 320/390-pixel guidance fit without overflow or console errors. Actual phone network transitions remain pending.

- Forecast/eclipse event identities now distinguish same-named observing sites and include coordinates. UTC/DST, fractional boundaries, contact validation and Unicode tests pass. Browser checks prepared real penumbral/partial/total events and reset messages after site/date changes at 320/390 pixels without overflow/errors. Native import remains pending.

- Imaging bounds reject extreme/non-finite calculations while preserving legacy profiles and typed input. Fractional engineering values are natively valid, unsupported rotation/RA disable export, and rounded RA display wraps canonically. Full-width mobile centre fields passed 320/390-pixel and desktop checks without overflow/errors.

- Local-time conversion retains historical second offsets and exact modern clock-change choices, rejects unsupported UTC year crossings and preserves canonical startup recovery precision. Mobile/desktop checks verified missing/repeated-hour handling, retained-time display and cancellation/focus without overflow/errors.

- Current-view form recovery copies prepared during actual quota and malformed-store failures without changing stored data. Retained text survived repair/retry, and copy messages hid after edits. Full-capacity Unicode/country metadata tests pass; compact controls fit without overflow/errors. Native file receipt remains pending.

## After the next GitHub Desktop push

Repeated Edit preserves the active diary form; a different-entry Edit refuses replacing unfinished changes until save/cancel. Local mobile/desktop checks confirmed focus, reload, save-then-switch and malformed-store recovery behavior. Include repeated/different-entry clicks in physical-phone diary acceptance.

Diary cards, controls and report/CSV local times now include offsets and precise seconds; offline timestamps retain milliseconds. Clock-change entries and invalid planner-time fallback passed local compact/desktop checks. Phone diary/report checks should distinguish both occurrences of a repeated local hour and verify original UTC instants.

Local integrated PWA verification passed two waiting-worker updates, retaining millisecond observing time, favourite/note and unfinished diary site/time/Unicode text. A subsequent rebuilt CSS update verified wrapped diary actions at 320/390 pixels, including snapshot and clear/undo behavior. Panel-bound checks supplement document-overflow checks because a clipped internal control can leave document width unchanged. Installed-phone and production-origin update checks below remain required.

1. Check the **Validate Nightjar** action. Its first hosted run and clean Linux installation are still pending.
2. Set the Workers Builds build command to `npm run verify`, with the existing deploy command `npm run deploy`. The GitHub check alone does not gate an independently configured Cloudflare build.
3. Confirm the production home page, weather/place/aurora API responses, manifest, service worker and `/offline` page on the final HTTPS origin.
4. Import a backup on that final origin if needed. Browser data is separate between localhost, the prior hosted site and Cloudflare.

## Phone acceptance tests

Use an actual phone on the final HTTPS origin. Record browser, OS, installed/browser mode and what happened. Keep a backup before these checks.

| Area | Test | Pass condition |
| --- | --- | --- |
| Mobile navigation | In browser and installed mode, open Explore at different scroll positions, select sections, follow atlas anchors and close the sheet. Repeat with the keyboard visible and after rotation. | Controls remain reachable around safe areas; headings/anchors clear the sticky bar, closing returns focus, and search feedback stays readable. Desktop viewport checks passed; physical keyboard/safe-area acceptance is pending. |
| Location cancellation | Start device location, leave My places before it completes, then return and request it again. | Busy state clears, an obsolete callback does not replace the selected site, and a fresh request succeeds or offers an actionable failure. Synthetic callback checks passed; actual GPS is pending. |
| Red-light feedback | Enable red light, change sections and observing time, then synchronize the preference from another tab. | Guidance does not cover controls, status/error messages occupy separate rows, and genuine preference updates synchronize. Synthetic save failure and 320/390/1280-pixel checks passed. |
| Camera discovery | Start camera and enable motion yourself. Slowly turn through cardinal directions and tilt. | Predicted labels move with the view; they do not remain fixed to the screen. No repeated unexplained disappearance or frozen video. |
| Compass setup | On iPhone, begin upright, enable motion, then tilt slightly away from upright when prompted. | The initial compass setup cue clears after north is anchored; names track when returning upright. Physical verification remains pending. |
| Compass uncertainty | On Safari, inspect the reported compass uncertainty and repeat near magnetic interference, then in a clear location. | Magnetic source and supplied uncertainty are identified; quiet/dropout states do not claim fresh accuracy. Feedback does not reset selection or labels. It is not measured label-alignment accuracy. Physical verification remains pending. |
| Camera alignment | Use a clearly identifiable bright target and the alignment controls. Repeat after rotation. | The label remains near the target after alignment, with understandable recalibration guidance if needed. Accuracy is not yet established by desktop tests. |
| Camera fallback | Decline motion or use manual mode. | The manual controls work and the UI identifies manual operation. Labels remaining fixed while moving the phone in manual mode are expected. |
| Reference thumbnails | Enable thumbnails, follow an object, interrupt/reconnect the network and use Reload reference thumbnails if needed. | The name remains usable when a photo fails; recovered references appear without resetting the followed target or alignment. Mission/survey images are labelled as reference imagery. Physical network transitions remain unverified. |
| Messier shortcut | Select a Messier object in the explorer and choose Find in camera view. Compare with a known bright-star alignment before following a faint target. | The chosen object uses current viewer time/site; below-horizon guidance is clear. Camera/motion stay off until enabled. Returning to ordinary camera restores its default catalogue. |
| Full screen | Enter full screen, rotate portrait/landscape, scroll the control region to guidance/alignment, return and close. | Sky retains at least half the viewport; all controls remain reachable around notches/safe areas, with keyboard/touch scrolling. Video/orientation recover; closing restores launch focus. Physical verification remains pending. |
| Permissions | Deny or revoke camera/motion permission, then retry through supported browser controls. | A useful message and recovery path appear. Permission should never be requested silently on page load. |
| Lifecycle | Background/resume or interrupt the camera. | Video/labels pause or recover coherently; stale sensor/video data is not presented as current. |
| Install | Install from the final origin and reopen it. | Correct icon/name and standalone layout; required live data still indicates network dependence. |
| Offline fallback | Open online once, save targets/notes/diary records, then enable flight mode and reopen. | Saved records appear on the offline page. Full planner startup offline is not a supported release promise. |
| Offline recovery copy | On the cached offline page, open Copy saved plans for recovery, download and inspect the JSON. | Stored values/forms and malformed text remain exact; unreadable keys are listed. No source storage changes. The format is manual recovery, not a normal importable backup; native phone receipt remains unverified. |
| Reconnect | Turn flight mode off and use the retry control. | The planner returns, saved records remain and live requests can refresh. |
| Drafts | Type a diary draft, switch tabs, reload and return. | Text and original site/time recover; changing the snapshot requires the explicit action. |
| Draft conflicts | Open the same unfinished form in two browser tabs, edit both and review a refused save. | Both versions are readable before choosing. A newer change after review prevents an outdated choice; unrelated forms remain saved. |
| Form recovery | When a form save fails, use Download form recovery copy before leaving Sky atlas and inspect the received JSON. | The file contains the current unsaved text and original site/time. The UI keeps the text; the copy is manual recovery and the normal backup importer rejects it. Native phone receipt remains unverified. |
| Backup | Export and review-import on another device or origin. | Counts and conflict handling are clear; existing local versions are preserved as described. Drafts are excluded. |
| Import review changes | Review a backup, change saved plans in another tab, then choose Import. Repeat with a newly full collection. | The first action refreshes review without writing, identifying newer conflicts/counts; another action imports the current review. Over-capacity guidance removes the obsolete review, names the limit and receives focus. Native phone file selection remains pending. |
| Downloads | Download a diary report/CSV; open the report and print/save as PDF. | Original times/sites and complete notes are retained. Native phone download/PDF handling remains unverified. |
| Calendar imports | Download a forecast window, deep-sky window and eclipse event; open each in the phone calendar before saving. Repeat a window across a clock change and compare same-named sites at different coordinates. | Target/site, local start/end and elapsed duration match the planner; deep-sky events remain tentative. Same-named sites have distinct identities. Native receipt and phone import remain unverified. |
| Updates | Deploy a later release and accept Update and reload. | Saved data and selected observing time survive; update does not loop or silently discard unfinished forms. |

## Scope limits

The camera overlays predicted catalogue positions; it does not recognize sky objects from camera pixels. The optional Messier/combined camera catalogues provide predicted directions for 109 deep-sky objects, with optional reference thumbnails alongside labels; full photos/details open in the separate explorer. Most need binoculars or a telescope, and camera pixels are not analyzed. Light-pollution maps, cloud accounts, push alerts, an AI assistant, a photo gallery and full reference-site feature parity remain outside this first-release implementation.

Completion percentages previously reported were estimates. Release acceptance is based on these checks, especially the remaining physical-phone and production-origin tests.

- [x] Desktop and mobile section changes protect notes/unfinished diary forms after save failures; each retry releases only its own warning, and explicit leaving keeps saved records unchanged.
- [x] A waiting PWA update pauses while view-only edits remain; activation-race tests prevent reload after a new failed save. Local update retained planner time.
- [x] Diary country survives editing, backups, recovery and offline/report output; CSV adds Country as its final column.
- [ ] Verify native reload/close warnings on supported physical phones and installed PWAs; browsers may suppress these prompts. Verify recovery-copy receipt before deliberately leaving unsaved text.
- [x] Failed-view reload buttons pause while another Sky atlas view holds unsaved text; retrying enables recovery and saved notes survive reload.
- [x] Diary search includes stored country, with legacy records and Unicode matching preserved.
- [x] Camera and inline/expanded 3D module failures stay inside recovery panels; surrounding planner and unsaved notes remain available, 2D switching works, and restored modules load normally.
- [x] Failed site renames restore only their own unchanged writes, preserve newer active/saved site values and keep the typed name available for retry.
- [x] Backup export dates must be exact generated UTC formats; legacy files remain readable, malformed calendar dates produce focused errors, and reviews retain seconds/milliseconds.
- [x] Retried target notes preserve newer same-target values until version review. Both choices preserve unrelated data; later edits invalidate stale review, Cancel retains text, and long versions are keyboard-scrollable.

- [x] Failed imaging-draft saves pause PWA/recovery reload while section changes retain the fields. Retry releases the guard; a local waiting-worker update retained the exact Unicode name, unfinished focal length and planner time. Manual recovery content is covered; native file receipt remains pending.

- [x] Each production release has an isolated offline page/recovery-module cache. A real waiting worker preserved the active pair during server failure; activation removed the old cache and restored the planner with its original site/time. Failed second-cache-write isolation is covered automatically.

- [x] Aurora rejects repaired/non-UTC/reversed forecast dates, retains the previous outlook after an invalid refresh and distinguishes stale from far-future clock guidance. High-latitude nearest cells use angular distance; the card fits compact mobile and desktop layouts. Current public NOAA feed validation passed.
- [x] Deployment and packaging checks use an isolated build snapshot. Only identical, unreferenced numbered copies of hashed generated code are omitted; source output, distinct files, referenced copies and photos remain intact. The isolated artifact passed a local mobile browser smoke test.

- [x] Meteor cloud averages identify their sampled hours and partial/missing coverage, including Moon-free filtering and nights without dark hours; compact mobile navigation and refresh were checked.

- [x] Sky calendar provides weather refresh/retry, dated fetch timestamps and stale guidance alongside meteor cloud averages; failed updates retain earlier forecasts with explicit status, and retry clears warnings.

- [x] Moon graphics-context loss switches to a surface map with retry; texture/fallback failures have readable recovery states and retry recreates working controls. Actual local WebGL event and mobile layouts checked; physical-phone memory pressure remains pending.

- [x] Visible lunar texture stalls offer retry after 15 seconds; fresh retries work while old responses are held and remain healthy after release. Continued waiting completes normally; loading placeholders hide untextured graphics and fit compact phones.

- [x] 3D sky selection distinguishes taps from orbit drags, pinches and cancellations; native canvas clicks, right-click rejection, orbiting and mobile remount/fallback passed. Verify two-finger pinch selection on a physical phone.

- Location search differentiates malformed/unusable responses from genuine empty searches, deduplicates safe IDs and bounds administrative labels. Disposable 320/390-pixel checks preserved the selected site on errors and selected valid results; live provider/device acceptance remains separate.

- Mobile Explore uses a sticky section bar instead of covering bottom-screen feedback. 320/390-pixel checks verified section/anchor clearance and menu focus return; verify real phone keyboard and installed-PWA safe areas before release.

- Returning to My places after leaving a pending device-location request clears busy state. Synthetic desktop/mobile checks ignored obsolete success and accepted a fresh request; physical GPS acceptance remains pending.

- Collection/preference synchronization accepts localStorage events only. Two disposable tabs verified red light, stars, notes, deep-sky targets and diary synchronization; an unrelated frame session clear preserved red light at mobile width.

- Header red-light guidance and save-failure feedback occupy separate rows above observing controls. Synthetic failure/recovery passed at 320/390-pixel phone and 1280-pixel desktop widths without overflow or overlapping messages.

- Saved-equipment read failures now show persistent Retry guidance and retain cached setups/draft fields. Mixed-invalid input, failed Retry, repaired input and damaged/repaired cross-context updates passed, with Save/remove paused during unreadable states and the Retry control fitting 320-pixel layouts.

- Equipment Save/Remove/Undo also enter the persistent Retry state if storage becomes unreadable after loading. Synthetic failed reads preserved data and drafts and recovered all three actions; physical storage acceptance is pending.

- Startup preserves malformed/unreadable selected-site values, clearly identifies the fallback and offers Retry/My places recovery. Synthetic forecast/reload checks made zero writes; repaired-site Retry kept the observing time, explicit choice replaced the value once, and older forecasts preserved newer stored selections. Valid time-zone updates retain additional stored fields.

- Saved-place failures show persistent Retry guidance, retain cached sites and pause collection-dependent changes. Invalid startup, late Save/Remove/Undo/rename/rating failures and cross-context repair passed; site, rating, time and form fields remained intact in the tested flows. Valid 101-site legacy collections remain readable for explicit removal.

- Unfinished site-name edits now guard navigation and PWA reload. Site/comparison/camera plans queue their full context until an explicit continuation; Keep editing and newer requests cancel/replace the prior intent. Phone-width checks preserved drafts/site/time and applied a comparison's future site/time together. Native phone exit/keyboard behavior remains pending.

- Stored-site Retry respects unfinished edits and adopts reviewed data without rewriting it. Same-coordinate recovery cleared the name editor/guard only after explicit continuation; completed site choices cleared older location-search feedback.

- Tonight distinguishes unavailable cloud scores from known poor conditions, reports partial coverage and evaluates the current outlook at the exact selected minute. Hour rows stay within twelve elapsed hours and include date/UTC-offset labels. Missing/partial/full/dawn cases and narrow phone layouts were checked on a disposable origin.

- Long saved-place/equipment/comparison lists display twenty entries initially, with progressive expansion and keyboard focus. Synthetic 101-record collections retained last-entry access; selected comparison cards remain manageable after picker collapse.

- Deep-sky imaging actions defer centre replacement when unsaved edits exist, including retained imaging drafts. Cancellation keeps exact fields; explicit approval changes only the centre/catalogue and focuses the mosaic. Synthetic autosave-failure/retry and narrow mobile review checks passed.

- Missing selected-hour forecast timestamps retain later samples/recommendations without borrowing their current metrics. Selecting an actual period or refreshing a repaired feed restores ordinary scores; timestamp gaps stay explicit.

- When to look distinguishes repeated local hours with dates/UTC offsets on mobile and desktop. A UK fallback fixture selected the second 01:00 occurrence as 01:00 UTC; highest-first/above-30° calculations are unchanged.

- Sky atlas has a direct When to look shortcut. Delayed loading and loaded-section jumps focus the named section below the mobile bar; the narrow layout gives the shortcut its own row.

- Known Sky atlas section fragments reopen the named section after lazy loading. Pointer/keyboard activity cancels deferred focus; unknown fragments keep Tonight. Direct-link, delayed-load, search-cancellation and unknown-link browser checks passed.

- Site-name saves retain newer selected-site metadata and refuse stale selected names/coordinates. Synthetic cross-context rename failures kept the exact name draft and made no extra site/list writes; between-write changes preserve the newer selection during rollback.

- Present empty-string collections enter recovery rather than new-user defaults. Six-key synthetic checks preserved raw values with zero application collection writes; explicit repair restored Retry, saving and normal-backup preparation.

- Observing reports use strict equipment reads and mark unreadable collections unavailable. Valid legacy equipment beyond the hundred-row checklist limit is explicitly counted as omitted, while storage remains intact. Both preview paths and the compact coverage note were checked.

- Target-note read recovery is read-only. Reports label unreadable/shown snapshots and unsaved edits; selected-target Retry saves only actual pending fields and preserves unrelated newer notes. Synthetic repair, quota failure, peer-note update and compact preview checks passed.

- Backup import uses one bounded snapshot for merge/rollback, checks keys before replacing them and tracks attempted writes. Synthetic later-key changes updated review without overwriting peer equipment; an injected adapter failure after writing restored touched collections. These are not transactional or physical-device guarantees.

- Valid oversized legacy bright-target lists retain all names and allow incremental removal; additions/Undo respect the 42-target capacity. Older names reveal in twenty-row groups. Repeated deep-sky IDs are deduplicated only in memory; raw recovery retains the source. Synthetic desktop/mobile checks passed; physical-phone acceptance remains pending.

- Bright/deep saved-list read failures retain cached names with earlier-read guidance and read-only Retry; edits, Undo and list exports pause until recovery. Synthetic startup/later failure, repair and retained Undo checks passed at desktop and compact widths.

- Saved-diary read recovery retains cached observations and unfinished forms, pauses saved mutations/reports and offers read-only Retry. Synthetic startup, during-Save and later-event failure/recovery/Undo checks passed, including a compact recovery view.

- Bright-target HTML/text checklists explicitly count older names and associated notes omitted for unavailable catalogue positions. Singular/plural/complete HTML coverage and source preservation passed; native text/file receipt remains pending.

- Unfinished diary forms offer read-only recovery and retain local edits/unrelated drafts. Repaired conflicts require explicit version review; synthetic read/merge/save/conflict and compact recovery checks passed.

- Desktop CUA file-chooser import and browser-received JSON backup now pass on a disposable origin. Received version-4 JSON matches all six synthetic collections including Unicode notes; selected site/time remain unchanged. Physical mobile file selection/download/share-sheet and other export formats remain pending. The received Downloads file dated 9 October is a QA backup, not a backup of real observing plans.

- The offline viewer distinguishes missing/valid empty collections from unreadable empty/null/wrong-shape values, preserves exact source text and identifies unavailable cards. Actual fallback-document repair/reload and compact layout checks passed; physical installed-PWA acceptance remains separate.

- Partial offline views name affected collections and distinguish omitted rows/clipped legacy text from genuinely empty data. Raw recovery appears before long lists. Exact-source/read-only, repair/reload and compact disclosure checks passed.
