# Nightjar beta handoff

Nightjar remains a beta. Desktop Safari and automated checks do not establish physical-phone camera alignment, native phone file handling or installed-PWA reliability.

Reference-feature coverage and the remaining implementation backlog are tracked separately in [FEATURE-STATUS.md](./FEATURE-STATUS.md). This handoff records release evidence rather than a full-parity completion percentage.

## Current release evidence — 19 October 2026

- **The local map/site-selection features, saved-list focus recovery and generated-PNG packaging cleanup, including imaging-draft fix `9d108d8`, passes all 692 tests, TypeScript, lint, production build and Cloudflare packaging dry-run on Node 22.16.0.** This macOS run reuses existing dependencies and stages 116 assets without bindings. It still needs an exact-head hosted run after the next push.
- **Your pushed commit `b2552602ee809d40b39469071fb724cb8f3bd630` passed all 680 tests and the complete verification command on GitHub's Ubuntu 24.04 runner with Node 22.16.0.** Its [exact-head run](https://github.com/ken8303/Nightjar/actions/runs/39166796103) passed locked dependency installation, TypeScript, lint, tests, build and Cloudflare dry-run, with zero failed/cancelled/skipped tests, 105 packaged assets and no bindings. This includes the atlas-framing feature, 3D recovery fixes and explicit Ubuntu runner pin; it supersedes the older `24b479a` hosted baseline.
- The new local macOS Worker release `b2f5f71af036c0291a5098d7d714d209670be90e8d9b6263b73c1e93f842d21c` reconstructs from 90 emitted/recovery inputs. All 330 scanned literal relative asset references resolve; manifest/icon dimensions and offline/recovery source bytes pass. The isolated snapshot contains 106 client files and no duplicate copies requiring omission. This local digest is not a hosted-byte equivalence claim.
- `b255260` is the current remote/hosted-verified baseline. Today's map layer and imaging-save fix are newer and remain local. The development agent has not pushed or deployed.
- The final Cloudflare HTTPS origin remains unverified. Follow [CLOUDFLARE.md](./CLOUDFLARE.md) for build configuration and deployed-origin acceptance.

The existing generated-document preview also passed a focused browser review: saved M31 content and exact site/time metadata, temporary checklist reset, Escape from inside the sandboxed frame, Close preview focus return, and no horizontal overflow at 390 × 844. Header/actions fit at 800 × 300 while the document scrolls independently. This does not establish downloaded file bytes or native print/PDF acceptance.

All seven loaded main sections also fit a 320 × 568 browser frame without horizontal page overflow. Compact navigation places focus on the chosen section heading and returns it to Explore after Escape. This is responsive desktop-browser evidence; phone and assistive-technology acceptance remain separate.

## New local feature: light-pollution map

In **My places → Explore a darker site**, load the optional 2025 map, then pan/zoom or adjust its opacity. The outlined marker represents the selected site and a crosshair marks the map centre. Panning alone keeps the plan unchanged. **Use map centre** deliberately selects its precise coordinates, keeps the observing time and stays in My places. Unfinished site-name/time edits use the existing Keep editing / Leave without saving guard; retained manual-coordinate drafts are preserved. New coordinates do not inherit the previous site’s darkness rating or country. Successful selection focuses the page heading, where the site can be renamed or saved. The ratio-zone legend, model year, natural reference and provider attribution stay separate from personal Bortle ratings and weather scores.

The model is annual artificial zenith brightness, not a measurement or live forecast. Missing tiles have a labelled hatch pattern and explicit retry guidance; a successfully loaded placeholder remains unavailable. Polar coverage and the date line have explicit handling. Source links remain available without loading the map. The feature uses online tiles, with no offline map download or numeric point sampler. See [LIGHT-POLLUTION-DATA.md](./LIGHT-POLLUTION-DATA.md) for provenance and scope. Local compiled-browser checks cover 320 px portrait, short landscape, the expanded legend, keyboard exploration, unchanged site/time, partial/complete/slow tile failure and retry, close focus, rename retention and coverage/date-line edges. The tile-failure/pan checks use synthetic local images; live provider responses and palette were checked separately. Physical touch, installed-PWA and final-origin acceptance remain pending.

## Equipment framing on the atlas

In Sky atlas, choose **Imaging grid: on** to overlay the current Photo tools camera/mosaic draft on either the 2D chart or 3D dome, including expanded views. **Edit in Photo tools** opens the same draft; loading a saved setup updates the overlay when you return. The toggle stays selected across planner sections for this visit. **Centre imaging grid** moves the 3D view to its target while keeping the selected atlas object.

The grid shares Photo tools validation and its J2000 tangent plane. Rotation is east of J2000 north, each frame is at most 10°, and the centre stays within ±75° declination. Small fields retain their angular scale; the separate framing guide is useful for close inspection. Invalid or unfinished fields remove the overlay with an explanation. An invalid or unreadable stored draft cannot silently draw the fallback defaults. If storage cannot be read, Photo tools offers **Retry reading imaging draft**; failed retries retain the saved record and focus, and successful recovery focuses the restored Setup name field. Editing the displayed defaults explicitly starts a new draft.

Local browser checks cover a saved-equipment change and 45° rotation, preserved Vega/site/time, a time change, 320/390 px portrait, expanded 2D/3D views, short landscape scrolling and Escape focus return. A horizon-straddling grid shows only its above-horizon portion; its below-horizon centre cannot be centred. Physical-phone rendering/performance and final hosted-origin acceptance remain pending.

## New local fix: imaging edits from more than one view

Saving an imaging draft reads its latest stored values and applies only fields edited in this view. A stale Setup name edit no longer restores an older focal length or unrelated target/grid fields. Failed saves retain all pending edits; Retry reads the latest stored data again. Successful read/save retries focus Setup name, while a failed retry retains its button. Browser checks cover an unfinished RA, Unicode setup text, a newer focal length/rotation, and the resulting atlas grid at compact/landscape sizes.

Edits to the same field still use the latest explicit save. Browser storage does not provide an atomic transaction across tabs; this is field-level merging and verification, not conflict-free collaboration.

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
