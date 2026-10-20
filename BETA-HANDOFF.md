# Nightjar beta handoff

Nightjar remains a beta. Desktop-browser and automated checks do not establish physical-phone camera alignment, native phone file handling or installed-PWA reliability.

Reference-feature coverage and the remaining implementation backlog are tracked separately in [FEATURE-STATUS.md](./FEATURE-STATUS.md). This handoff records release evidence rather than a full-parity completion percentage.

Current user priority (19 October 2026): photo recognition and further photo-feature development are paused while the other work is completed. Existing photo tools/images stay available. Focus on confirmed bugs, mobile/PWA reliability, camera discovery and remaining sky features; physical-device and final-origin checks remain explicit release gates.

## Latest local batch — 20 October 2026

- ISS midpoint actions and fixed window calendar files, with feed/clock/epoch checks at export: `0f94540`, `b5ae572`.
- Main-site and comparison selection requests now reset the foreground weather refresh timer: `dca07a2`, `8e65f02`.
- Offline saved times identify missing-zone UTC fallback: `8e33bcc`.
- Camera view shows device-reported horizontal accuracy and the original fix timestamp, without changing the saved planner context: `c723c25`.
- Four PWA menu shortcuts are declared; cold/warm section URLs follow the edit guard and exact target focus: `1844767`.
- High-latitude/date-line and clipped ISS pass regression coverage: `50d2b1d`.
- Cloudflare packaging now gates Wrangler on the generated client/offline fingerprint, quoted relative code/style imports, source-matched recovery/manifest/icon bytes and app identity. The standalone `npm run test:release-assets` checks the existing build without publishing; normal verify/deploy wrappers use the same gate.
- ISS modelled windows show hourly cloud context from the matching planner forecast, with complete-hour coverage, retrieval-time/freshness checks and a shared Refresh weather action. Refresh retains computed passes and unfinished time drafts; the orbital/lighting criteria and calendar scope stay unchanged.
- Weather, aurora and location-search routes cancel unread non-success provider bodies; cleanup rejection or a pending cancellation cannot block public error guidance or retry.
- Numeric brightness sampling now has three additional published-popup/real-tile references across Sydney, Atacama and Reykjavík, with offline geometry/conversion regressions. No decoder change was needed; this does not establish global or physical accuracy.
- Saved-place rows retain their identity and keyboard focus through peer removal/reordering, including named aliases at the same coordinates. Removal also uses the rendered place snapshot, so an update queued before redraw cannot redirect a click to another list entry.
- Simultaneous same-coordinate weather requests share one provider read within each server instance. Failure releases the request for retry; tracking is bounded at 32 active coordinate keys, with independent reads beyond that limit. No additional forecast cache or cross-instance guarantee is introduced.

All commits above are local. Native phone tracking, installed-PWA update/relaunch/offline behavior, actual calendar receipt/import and native shortcut-menu launch remain device acceptance tasks. The next user batch push still needs its own exact-head CI and final Cloudflare-origin checks; see the phone report and deployment instructions below.

## Current release evidence — 20 October 2026

- **The local ISS-direction/pass-search, lunar-libration, map/site-selection and numeric-brightness features, equipment row identity, saved-list focus recovery and generated-PNG packaging cleanup, including imaging-draft fix `9d108d8`, pass all 794 tests, TypeScript, lint, production build and Cloudflare packaging dry-run on Node 22.16.0.** This macOS run reuses existing dependencies and stages 124 assets with the SATELLITE_FEED Durable Object binding. It still needs an exact-head hosted run after the next push.
- **Your pushed commit `b2552602ee809d40b39469071fb724cb8f3bd630` passed all 680 tests and the complete verification command on GitHub's Ubuntu 24.04 runner with Node 22.16.0.** Its [exact-head run](https://github.com/ken8303/Nightjar/actions/runs/39166796103) passed locked dependency installation, TypeScript, lint, tests, build and Cloudflare dry-run, with zero failed/cancelled/skipped tests, 105 packaged assets and no bindings. This includes the atlas-framing feature, 3D recovery fixes and explicit Ubuntu runner pin; it supersedes the older `24b479a` hosted baseline.
- The latest full npm run verify passes all 794 tests, typecheck, lint, production build, compiled Worker checks and Cloudflare dry-run. Packaging now automatically verifies emitted release assets before Wrangler runs.
- The latest full verification includes ISS directions/shared acquisition, lunar libration, short-screen sizing and the equipment row-identity fix. It also runs the compiled Worker persistence/concurrency check with fixture-only source traffic.
- The local client/offline service-worker fingerprint `fccc135216d2fc5129fdac23319cc376c6dccedaf1887d2707d30f8553fa1d2e` reconstructs from 97 emitted/recovery inputs. All 366 scanned literal relative asset references resolve; manifest/icon dimensions and offline/recovery source bytes pass. The isolated snapshot contains 114 client files, with no generated copies requiring omission in this build. This local digest is not a hosted-byte equivalence claim.
- `b255260` is the last inspected remote/hosted-verified baseline. Today's lunar/map features and saved-data fixes are newer and remain local. The development agent has not pushed or deployed.
- The final Cloudflare HTTPS origin remains unverified. Follow [CLOUDFLARE.md](./CLOUDFLARE.md) for build configuration and deployed-origin acceptance.

The existing generated-document preview also passed a focused browser review: saved M31 content and exact site/time metadata, temporary checklist reset, Escape from inside the sandboxed frame, Close preview focus return, and no horizontal overflow at 390 × 844. Header/actions fit at 800 × 300 while the document scrolls independently. This does not establish downloaded file bytes or native print/PDF acceptance.

All seven loaded main sections also fit a 320 × 568 browser frame without horizontal page overflow. Compact navigation places focus on the chosen section heading and returns it to Explore after Escape. This is responsive desktop-browser evidence; phone and assistive-technology acceptance remain separate.

## Additional PWA browser evidence — 20 October 2026

The final compiled release’s calculator asset enters `nightjar-static-v1` after an online search. On a disposable origin with immutable asset headers, simulated offline asset/API failures still allow a new selected-time search from the cached calculator and retained valid orbital feed. The service error remains visible; the original retrieval timestamp, observing site and selected instant are kept. The cached path makes no failed asset request. Returning online recovers the service.

A separate fresh origin starts with no cached calculator. Its first simulated-offline search shows reconnect/retry guidance and retains the selected-time directions. The failed script is not stored in Cache Storage. Restoring online and retrying returns six geometric passes and one modelled window using the existing orbital feed; one blocked script request and one successful orbital-data request are recorded by the fixture.

A controlled seven-hour clock shift plus pageshow hides stale directions and retires pass/window results with the six-hour retrieval-age message. Restoring the native fixture clock restores eligible directions but does not resurrect the retired list or automatically request orbital data. These checks use CUA IAB, mocked network/online state, local response replays and separate disposable localhost origins. They do not verify native connectivity switching, installed-PWA launch, physical-phone behavior or final Cloudflare-origin deployment. No runtime change was needed.

## New local fix: camera heading-source recovery

Recent absolute heading data still wins over secondary relative events. After four seconds without a valid absolute reading, a fresh valid relative pose can resume movement through a source transition that clears north-based calibration first. Names require a new known-object alignment in relative mode. Invalid relative events cannot erase the last good compass pose; a returning absolute event immediately restores compass mode and clears the relative correction. A stationary phone with no new events still retains its explicitly marked last pose.

Three regression cases cover the dropout boundary/recovery, invalid/queued events and current screen axes after rotation. Synthetic compiled-browser checks cover recent-absolute priority, alignment-required fallback, moving after relative alignment, absolute recovery, ordinary/fullscreen controls, compact/landscape containment and close/reopen cleanup. No physical camera, sensor permission or wake lock was started: the fixture mocks permission and dispatches synthetic readings. This does not replace the real-phone acceptance gates.

## New local fix: time shortcuts protect unfinished time entries

An unfinished time entry now blocks shortcuts that would replace its selected instant. The warning shows the queued UTC instant and any destination section. **Keep editing** cancels that request and focuses the original time field; **Use selected time** explicitly applies it and focuses the planner heading. Direct valid entry, choosing a repeated-hour occurrence and Now still work; an already-selected instant preserves the draft without a warning. Other retained drafts do not block a same-section time change.

Before the fix, an empty time field silently reverted to Saturn's peak time when its shortcut was clicked. Compiled browser checks now preserve blank and London clock-change entries, both occurrence choices, and an unrelated site-name draft. Sky-calendar exploration queues the time and Sky atlas destination together so a second navigation request cannot discard the guard. Portrait 320x568, landscape 800x360 and desktop 1100x800 fit. Three new regressions cover retained edit detection and queued time identity/replacement. Physical-phone file/sensor/PWA acceptance remains pending.

## New local feature: ISS directions

Sky atlas → **Load ISS directions** shows geometric altitude/bearing/range at the selected site/time. Opening the panel opts into a shared orbital-data request; coordinates/time stay in the browser. Data is bounded by epoch/retrieval age with separate stale/device-clock guidance. Changing the selected time recomputes locally. Cancel, close, retry and timeout retain useful focus/data and retire obsolete responses. **Find next 24 hours of ISS passes** now searches in a cancellable background worker using the loaded elements. It shows chronological UTC rise/highest/set times, bearings and peak altitude, with explicit already-up and epoch-limited boundaries. Pass cards now also show approximate sunlight/shadow and Sun-centre altitude at the highest point. Each pass also shows modelled observing windows when ISS is above 30 degrees, fully sunlit in the spherical shadow model, and the Sun is below -6 degrees, for at least ten seconds. No qualifying window is separate from unavailable calculation. Clipped search boundaries are labelled. Weather, brightness and obstructions still affect visibility; live animation and atlas/camera markers are absent. Changed site/time/data retires old results; unavailable orbital data cannot produce an empty-sky claim. **Set observing time to this peak** applies the exact computed millisecond instant through the unfinished-time guard. A successful shortcut focuses the planner heading and updates directions without another feed request; it does not add an ISS chart marker.

The source Worker now exports a SQLite-backed `SatelliteCoordinator` and requires the committed `SATELLITE_FEED` binding/initial migration. All observers of this deployment share one two-hour acquisition fence; non-200 source responses halt automatic refresh for investigation. End-user Retry cannot reset it. The ordinary app/offline routes and compiled persistence checks pass locally, but hosted namespace/migration acceptance is pending. Review [SATELLITE-TRACKING.md](./SATELLITE-TRACKING.md) and [CLOUDFLARE.md](./CLOUDFLARE.md) before the next batch push. No resource was provisioned or deployed by the agent.

Numerical checks use published Vallado vectors and independent observer transforms. Browser QA uses local response replays, covering opt-in, date changes without another request, stale/future/wrong identity, service failure, cancellation, timeout, close/reopen and 320/800/1100 px containment. Physical phone and empirical sky-position acceptance remain pending.

## New local feature: lunar libration

Moon now displays geocentric sub-Earth longitude/latitude and apparent diameter for the selected time. **Earth-facing view** keeps lunar north up and follows time changes; toolbar zoom retains that mode. Rotation, pointer interaction and landmark centring return to free exploration; Near side/Home restores the mean near side. Active mode has text, a visible highlight and pressed state. The Earth-facing renderer uses an orthographic projection with matching labels/limb handling. Lighting remains approximate; observer parallax, local sky roll, terrain shadows and eclipse shadows are excluded. See [LUNAR-VIEW.md](./LUNAR-VIEW.md).

Independent comparison covers all 8760 hourly NASA 2026 references, with latitude error below 0.03° and longitude below 0.004°. Five new regression cases retain six frozen NASA samples plus date, frame, lighting-angle and projection checks. Compiled browser acceptance covers time updates, keyboard/toolbar exploration, fully-lit mode, context loss, missing texture/failing retry, prolonged texture loading and recovery. The final rebuilt Worker restores Earth-facing mode and focuses its active control after retry. Widths fit 320×568, 800×360 and 1100×800. Short landscape now uses a 198 px globe at 800×360, leaving room beside the interaction surface for scrolling and nearby controls. Portrait stays 320 px and desktop 440 px. Pointer dragging and a resize cycle retain the expected view-mode behavior. Physical touch, installed-PWA and final-origin acceptance remain pending.

## New local feature: light-pollution map

In **My places → Explore a darker site**, load the optional 2025 map, then pan/zoom or adjust its opacity. The outlined marker represents the selected site and a crosshair marks the map centre. Short landscape screens use a smaller map so surrounding page controls remain reachable; resizing preserves the explored geographic centre. Panning alone keeps the plan unchanged. **Use map centre** deliberately selects its precise coordinates, keeps the observing time and stays in My places. Unfinished site-name/time edits use the existing Keep editing / Leave without saving guard; retained manual-coordinate drafts are preserved. New coordinates do not inherit the previous site’s darkness rating or country. Successful selection focuses the page heading, where the site can be renamed or saved. The ratio-zone legend, model year, natural reference and provider attribution stay separate from personal Bortle ratings and weather scores.

The model is annual artificial zenith brightness, not a measurement or live forecast. Missing tiles have a labelled hatch pattern and explicit retry guidance; a successfully loaded placeholder remains unavailable. Polar coverage and the date line have explicit handling. Source links remain available without loading the map. The feature uses online tiles, with no offline map download. Explicit numeric readings now load one bounded 2025 tile and display magnitude, artificial/natural ratio, provider zone and sampled cell coordinates. They remain separate from personal ratings and weather scores. See [LIGHT-POLLUTION-DATA.md](./LIGHT-POLLUTION-DATA.md) for provenance and scope. Local compiled-browser checks cover 320 px portrait, short landscape, the expanded legend, keyboard exploration, unchanged site/time, partial/complete/slow tile failure and retry, close focus, rename retention and coverage/date-line edges. The tile-failure/pan checks use synthetic local images; live provider responses and palette were checked separately. Physical touch, installed-PWA and final-origin acceptance remain pending.


Numeric acceptance: the real provider popup at 51.4916°, −0.0714° agrees with the decoder (17.53 mag/arcsec², ratio 60.2, zone 7b). Grid/domain, signed row/column deltas, malformed/truncated/oversized data, native gzip availability, abort and timeout have regression coverage. Compiled browser checks verify explicit-only loading, success, failed retry/recovery, corrupt/oversized responses, Cancel focus, cell-change retirement, a 20-second timeout, unchanged site/time and 320/800/1100 px containment. Map images are synthetic and numeric replies are local replays; these are not global live-data or physical-browser acceptance.

## Equipment framing on the atlas

In Sky atlas, choose **Imaging grid: on** to overlay the current Photo tools camera/mosaic draft on either the 2D chart or 3D dome, including expanded views. **Edit in Photo tools** opens the same draft; loading a saved setup updates the overlay when you return. The toggle stays selected across planner sections for this visit. **Centre imaging grid** moves the 3D view to its target while keeping the selected atlas object.

The grid shares Photo tools validation and its J2000 tangent plane. Rotation is east of J2000 north, each frame is at most 10°, and the centre stays within ±75° declination. Small fields retain their angular scale; the separate framing guide is useful for close inspection. Invalid or unfinished fields remove the overlay with an explanation. An invalid or unreadable stored draft cannot silently draw the fallback defaults. If storage cannot be read, Photo tools offers **Retry reading imaging draft**; failed retries retain the saved record and focus, and successful recovery focuses the restored Setup name field. Editing the displayed defaults explicitly starts a new draft.

Local browser checks cover a saved-equipment change and 45° rotation, preserved Vega/site/time, a time change, 320/390 px portrait, expanded 2D/3D views, short landscape scrolling and Escape focus return. A horizon-straddling grid shows only its above-horizon portion; its below-horizon centre cannot be centred. Physical-phone rendering/performance and final hosted-origin acceptance remain pending.

## New local fix: imaging edits from more than one view

Saving an imaging draft reads its latest stored values and applies only fields edited in this view. A stale Setup name edit no longer restores an older focal length or unrelated target/grid fields. Failed saves retain all pending edits; Retry reads the latest stored data again. Successful read/save retries focus Setup name, while a failed retry retains its button. Browser checks cover an unfinished RA, Unicode setup text, a newer focal length/rotation, and the resulting atlas grid at compact/landscape sizes.

Edits to the same field still use the latest explicit save. Browser storage does not provide an atomic transaction across tabs; this is field-level merging and verification, not conflict-free collaboration.

## New local fix: equipment rows keep their identity

Equipment rows now use content identity with duplicate-occurrence keys rather than array positions. A peer removal/reorder keeps keyboard focus on the same unchanged setup. If that setup’s dimensions change, the old row retires and existing list focus recovery moves to a safe control/count message. Legacy same-name profiles retain distinct dimensions; no saved-record IDs, migration or backup changes were introduced.

Before the fix, focus on Remove setup 02 silently changed to Remove setup 03 after a peer removed row 01; pressing Enter removed 03. The compiled fix keeps focus on 02 and removes 02, retaining 03. Same-count replacement moves focus to Showing all 3 saved setups; reordering and same-name legacy cases retain the intended row. Ordinary Undo returns focus to Saved equipment. Physical assistive-technology acceptance remains pending.

## New local fix: list updates retain useful focus

When another view removes a focused row or pagination button from a controlled saved list, focus moves to a remaining pagination control or a visible count message. Row replacement is covered even when the collection count stays unchanged. It stays with an unrelated editor or a separately focused document. Compiled-browser checks cover full/partial control removal, empty lists, regular pagination, a retained name draft and compact/landscape layouts. Saved-place checks cover peer row removal/replacement and ordinary Remove/Undo focus, as well as pagination. This is not blanket acceptance of every other saved-list workflow or physical screen-reader behavior.

The packaging snapshot also omits identical, unreferenced numbered PNG copies in the generated media directory, with binary regression coverage. Referenced/different/orphaned files and ordinary public photos stay included; the original build output is untouched. This resolved an observed local release-audit mismatch caused by extra generated image copies.

## Earlier verified fixes

The earlier push at `24b479a` included these runtime changes and their scope/acceptance records.

| Commit | Runtime change | Verification scope |
| --- | --- | --- |
| `fb578c9` | Keep manual camera labels visible on short landscape screens. | Camera-off layout at 640 × 320 and 800 × 360, fullscreen/portrait checks; physical video pending. |
| `00c2782` | Prevent an already-saved site's stale Save action from overwriting peer settings. | Two-tab rename/draft preservation, reload persistence and adding a separate site. |
| `20128b0` | Include the year/era in expanded 2D chart labels. | Modern and local-BC browser cases, exact UTC metadata and Escape focus return. |
| `4ff2af6` | Preserve the aurora provider snapshot's expiry in HTTP cache headers. | Header boundary regression and isolated compiled-Worker requests. |
| `ea2f7b3` | Stop restoring an already-completed diary edit after failed draft cleanup. | Before/after mobile-frame reproduction and retention of genuine peer conflicts. |
| `d3f0956` | Recognize +180°/−180° as the same observing-site longitude. | Metadata recovery and duplicate-save browser reproduction; tolerance, aliases, Undo and backup merge regressions. |
| `267da1c` | Show equivalent date-line endpoints once in site comparison. | One comparison choice/card, deselect/reselect, and separate cards for a distinct latitude. |
| `dd7b70a` | Separate zoom controls and captions in short landscape viewers. | Photo/framing views at 800 × 300, 800 × 360 and 390 × 844; zoom, Reset, caption/source access and close-focus return. |
| `c9f1fb2` | Select only the chosen object and hour in When to look. | Component rendering regression plus desktop/mobile checks for Saturn, Uranus and browsing without changing the selection. |

The successful exact-head GitHub run for `b255260` includes all runtime changes listed above. Deployment and physical-device acceptance remain separate gates.

When to look now highlights the chosen object and sampled hour together. Previously selecting Saturn highlighted every planet at that hour and exposed all those cells as pressed. Desktop and mobile checks confirm a single visible selected cell; browsing another planet does not falsely select it. The regression also covers an unselected atlas, a selected star and a time just off the hourly sample.

Enlarged photo and framing viewers no longer place captions over the zoom controls on short landscape screens. The framing viewer previously had 35 px of overlap at 800 × 300. Separate sidebar rows now keep Reset and the heading visible while the caption scrolls; at that size both viewers fit without whole-dialog scrolling. The taller landscape and portrait checks also pass. M31's featured reference decodes at 800 × 800, and its source-credit link remains reachable in the short caption area.

Coordinate matching now handles the +180°/−180° longitude seam with the existing tolerance. Choosing an equivalent date-line coordinate keeps the saved country and Bortle rating without changing the entered longitude; Save recognizes the already-saved site. The shared identity check also prevents a duplicate during Undo or backup merge. Different sites and ambiguous named aliases retain their existing safeguards. The 390 × 844 browser reproduction previously lost the rating and created two records; the rebuilt app keeps the rating and one saved record.

Site comparison also recognizes the exact +180°/−180° endpoints as one forecast selection/cache identity, preventing two cards for the same physical site. It keeps all other coordinate precision. Browser checks confirm one card for the equivalent endpoints, working deselection/reselection, and two cards after changing latitude to a genuinely different site. Stored and displayed coordinates are unchanged.

Reopening the diary no longer restores an already-saved changed edit as unfinished when its draft-cleanup write failed. An edit is cleared from the recovered view only when its changed draft exactly matches the saved observation. Drafts differing from newer peer data and explicitly opened unchanged edits stay recoverable. A 390 × 844 before/after browser check confirms removal of the false save conflict and retention of genuine peer conflicts. No saved diary or stored draft is rewritten by this recovery filter.

Aurora responses now give HTTP caches only the remaining lifetime of the server's five-minute provider snapshot. Previously a request near expiry advertised another full five minutes. Regression checks cover middle-of-life, the last millisecond and the refresh boundary, including shared-request and failure recovery. The isolated compiled Worker returned the same NOAA snapshot with max-age decreasing from 299 to 288 seconds. This is local HTTP evidence; final hosted-origin caching remains a deployment acceptance check.

The expanded 2D chart identifies the year and, where needed, BC/AD using the shared planning formatter. Mobile browser checks show both 18 Oct 2026 and the supported UTC-year-1 case that falls on 31 Dec 1 BC in New York. The exact UTC instant remains in the chart metadata; Escape returns focus to Expand 2D chart.

Save now adds new locations and keeps an already-saved location’s latest settings. A reproduced two-tab case previously let the stale tab silently undo a peer’s site rename by pressing “Saved on this device.” The fixed action preserves the peer’s name and the stale tab’s unfinished draft, with guidance to review Saved places. Fresh reload confirms the name remains saved; adding another location still works. Desktop and 390 px mobile checks have no console warnings/errors.

Normal camera-mode manual preview now fits short landscape screens. Back to sky view previously returned a 585 px-tall canvas in a 640 × 320 viewport, putting the selected name below the screen. It now uses at most half the viewport height when the camera is off. In-app browser checks pass at 640 × 320 and 800 × 360, including Settings return, fullscreen scrolling and portrait close-focus. This is manual-preview layout evidence; physical video and sensor acceptance remain pending.

The observing-time input now has an explicit accessible name. At narrow widths, CSS hides its visible label; native Safari previously exposed an unnamed date/time area. Safari now exposes “Observing time” at 320 × 800 and 380 × 800. The date calculations and native control remain unchanged.

Meteor windows now include dates, years and UTC offsets. The supported Dublin Orionids example spanning the October 1995 clock change displays its eight-hour window as 21:00 GMT+1 → 04:00 GMT/GMT+0. Browser checks at 320/380 px confirm wrapping without horizontal overflow, and Explore window selects its expected time.

The brand now uses the app’s guarded navigation to return to Tonight. The former framework home link both failed on click and emitted a prefetch setup error when the page had a query string. Verified desktop return, retention of the selected mobile Dublin site/time, and the unfinished site-name warning with Keep editing preserving text. No new console errors appeared in this tested flow after the fix; this is scoped browser evidence, not an exhaustive console audit. Removing the unused routing imports reduces packaged client assets from 114 to 103.


## Earlier reviewed changes also included in your push

| Commit | Change |
| --- | --- |
| `c4b2f6f` | Aurora identifies the UTC fallback when the site’s time zone is unknown. |
| `f348300` | Missing nearby aurora coverage stays unavailable instead of borrowing a distant cell. The 2° limit checks coverage, not model accuracy. |
| `e08c40c` | Full-hour Sun/Moon checks catch brief altitude crossings between samples. |
| `1db9d45` | Twilight planning shares the geometric Sun-centre convention used by milestones and camera lighting; apparent object-viewing positions are preserved. See [USNO definitions](https://aa.usno.navy.mil/faq/RST_defs). |
| `ff6828b` | UTC/local zone buttons cannot silently discard an unfinished time edit or unresolved repeated-hour choice. |
| `63b0f6e` | Calendar feedback follows the exported forecast window and conditions; Milky Way dates reuse the era-aware formatter. |

Earlier batches and detailed reproductions remain in [DEVELOPMENT-NOTES.md](./DEVELOPMENT-NOTES.md). Feature scope and limitations are in [README.md](./README.md).

## Additional browser acceptance — 18 October 2026

Controlled weather failures pass at 390 × 844: an unsuccessful same-site refresh keeps the previous forecast with an explicit warning; a failed new-site request shows unavailable values rather than the old site's weather. Retry loads the new site's conditions and time zone without changing the selected UTC instant. This is HTTP-failure/retry evidence, not device-offline or installed-PWA testing.

Synthetic absolute orientation events also pass in a 390 × 844 camera-off preview: a north/east/south/west/north sequence updates the displayed bearing and projected names. A quiet north pose retains Polaris with last-orientation feedback. Invalid data and a screen-orientation invalidation remove the old labels; a fresh valid pose restores them. Fullscreen fits the iframe width, and reopening the viewer leaves motion off. These events were supplied by visible controls in an isolated local fixture, with no camera/video stream or real sensor calibration; physical-phone acceptance remains pending.

Import review also passes at 390 × 844. A synthetic peer save after file selection causes the first Import action to refresh the review rather than write a stale merge. A second confirmation imports the incoming records. Reloading confirms both the peer's Polaris note and incoming Vega note are saved, while London and the selected 19:00 UTC observing time remain unchanged. Download backup reports a prepared file, but the browser download observer timed out; downloaded-file bytes were not verified in this pass.

The actual production service worker also passes a controlled HTTP 503 navigation check in a 390 × 844 browser frame. Its cached fallback shows the saved site, Vega and its Unicode/multiline note, an additional Sirius note, M31 and equipment. Restoring the server and choosing Try again online returns to the same site and exact `2026-10-18T19:00:17.125Z` instant. The recovery page fits without horizontal overflow and the inspected browser log is clean. This tests a server failure while the browser is online; it does not establish disconnected-device or installed-PWA lifecycle behavior.

## Native Safari acceptance — 16 October 2026

Browser automation was unavailable, but CUA native Safari worked in a separate private window. A disposable local frame served the compiled app at exact 320 × 800 and 380 × 800 viewports, with controlled weather/aurora responses. Desktop Safari was also checked.

| Flow | Verified result |
| --- | --- |
| Page and layout | Correct Nightjar page, meaningful content and no visible framework overlay. Document/body widths were 303 px in the 320 px frame and 363 px in the 380 px frame, accounting for the native scrollbar; no horizontal overflow. Screenshots were emitted in the conversation. |
| Time entry | Empty and London repeated-hour edits survive zone-button taps. Both DST occurrences remain available; choosing the later occurrence selects `2026-10-25T01:30:00.000Z`. Cancel restores the controls. |
| PWA update | An unfinished edit disables Update and reload. After Cancel and explicit update, London QA and `2026-10-25T00:30:17.125Z` are restored exactly. This was a browser-tab update, not installed-PWA lifecycle testing. |
| Calendar feedback | Safari reports a completed 654-byte calendar download. The app names the full exported window. Changing fixture coverage moves the recommended window and removes the old confirmation. The file’s configured download location and calendar import were not inspected. |
| Aurora | Unknown-zone metadata says UTC. A nearby fixture cell shows 33%; missing regional coverage shows an unavailable estimate and explanation; restoring coverage recovers 33%. |

Console logs were not inspected through native Safari. The remaining Milky Way era case has calculation/source evidence; it was not rendered in this Safari pass. Physical phone sensors, native mobile keyboards/readers/files, installed-PWA behavior and final Cloudflare-origin acceptance remain pending.

The fixture confirmed clearing local/session test data and requested worker/cache cleanup through its controls. The private QA window was closed, leaving the original Safari window. Local download settings still showed Ask. Review servers are stopped. No camera, motion, geolocation or wake-lock permission was requested.

## Phone acceptance checks

Use [PHONE-TEST-REPORT.md](./PHONE-TEST-REPORT.md) to record the actual deployed commit, device/browser and results. Its initial Not run statuses are placeholders, not acceptance evidence.

| Flow | Expected result |
| --- | --- |
| Camera discovery | In Safari or Chrome on HTTPS, choose the correct observing site and intentionally start camera/motion. Turning the phone moves predicted labels; stopped/paused video hides live labels. Check a known bright object and alignment. These are predicted positions, not image recognition. |
| Camera display | Fullscreen, portrait/landscape, reference thumbnails and scrollable controls remain usable. Closing or backgrounding stops camera/motion/screen awake; return does not silently restart hardware. |
| Sky chart recovery | In the 2D chart, tap a visible name and a dot; both select the intended target. If 3D rendering stops, use the fallback chart or Retry 3D sky. Retry preserves site, time, selection and unfinished edits. Test portrait/landscape and foreground return on the phone. |
| Page return | Leave the browser/app, then return; also navigate away and Back. Recommendations/forecast age refresh when visible, without replacing unfinished observing-time text. Native cached-page restoration still needs verification. |
| Delayed loading | On a slow connection, background while a view or offline setup is still loading, then return. Recovery deadlines allow a fresh foreground wait; an unfinished time edit keeps reload disabled and its review action returns to the retained input. |
| Installation and update | Install from the browser/home-screen flow. A pending install cannot be tapped repeatedly. For a real deployed update, save/copy unfinished text first and confirm the selected site/time survive the explicit update. |
| Offline return | Open online once and save test plans. Reopen without connectivity: the fallback shows saved device data. Full planner startup, fresh positions and weather offline are not supported promises. Restore connectivity and verify return. |
| Time entry zone | Clear the observing-time input and try switching UTC/local mode; the buttons stay disabled and the edit remains. With Europe/London local entry, type 25 October 2026 at 01:30 and verify both occurrence choices remain until one is selected or Cancel is chosen. After resolving, zone switching is available again. |
| Numeric entry | Try a decimal comma such as focal 12,5 and confirm a saved setup shows 12.5 mm. Invalid/unfinished text stays in the draft and disables relevant calculations/exports. Verify the native keyboard permits required signs and separators. |
| Failed saves | Keep the view open. Direct review actions return to time, coordinates, imaging, diary, target-note or site-name recovery. Retry after storage is usable; verify retained text and original observation metadata. |
| Files and accessibility | Confirm actual receipt/import/printing of intended files. Test screen-reader labels, focus after review/close, large text, and short landscape screens. Local screenshots and download-prepared messages do not prove these native behaviours. |

Physical iPhone/Android sensors, installed-PWA lifecycle, native keyboards/readers/files and the final Cloudflare deployment remain unverified. GitHub validation passed for your pushed commit `b255260`; any later local commits need their own exact-head run after the next push. Detailed evidence and release gates are in [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md); development history is in [DEVELOPMENT-NOTES.md](./DEVELOPMENT-NOTES.md).

## Offline saved-time labels — 20 October 2026

Missing or invalid saved site time zones now say UTC · site time zone unavailable. A genuine UTC site instead says UTC · time at saved site; other valid sites show their saved zone alongside the formatted clock. The UTC snapshot retains seconds/milliseconds, and the current window's paired site/time takes precedence over shared site storage. Two regressions fail on the prior page and pass after the change. Compiled browser checks cover all four zone states, paired-window recovery to the planner, 320/800/1100-pixel containment and empty warning/error logs. This is browser evidence, not native installed-PWA acceptance.

## Camera location quality — 20 October 2026

An explicitly requested device location now shows its reported horizontal accuracy and original acquisition timestamp in ordinary and fullscreen camera controls. Coarse and unavailable values are explicit. This describes the position estimate, not object-label alignment. Metadata stays in the viewer: cancelling/failing a newer request keeps the previous fix, returning from suspension does not restamp it, restoring the planner site clears it, and close/reopen rejects obsolete callbacks. The saved planner site/time is unchanged. Four new regressions and synthetic compiled-browser 320/800/1100 checks pass without camera, motion, geolocation permission or wake-lock access. Actual device measurements and native permission behavior remain pending.

## PWA menu declarations and live section links — 20 October 2026

The manifest declares Sky atlas, Deep-sky explorer, When to look and Observing diary shortcuts using existing app icons and same-origin, in-scope URLs. All four actual served URLs cold-open/focus the correct section. A known fragment received while the planner is already open now selects Sky and follows the same deferred focus path. Previously #observing-diary could appear in the address while Tonight stayed selected and the diary was absent.

A link that would leave an unfinished non-retained edit uses the existing navigation guard, identifies the requested section and restores the prior fragment while waiting. Keep editing preserves text/focus; explicit Leave without saving applies only the confirmed link. Retained time drafts survive section jumps. Accepted navigation away from Sky clears its old section fragment so the same link can reopen it later. Unknown fragments do not select another tab. Browser checks cover cold/warm URLs, retained time, guarded/cancelled/confirmed links, exact site/time preservation and 320/800/1100-pixel containment with no warning/error logs. Native installed menu availability and launch behavior remain Not run in the phone report. Shortcut format reference: [W3C Web Application Manifest](https://www.w3.org/TR/appmanifest/#shortcuts-member).
