# Nightjar beta handoff

Nightjar remains a beta. Local checks do not establish physical-phone camera alignment, native file handling or installed-PWA reliability.

## Current release evidence — 16 October 2026

- **649 tests pass on Node 22.16.0 and Node 24.19.0.** TypeScript, lint, production build and Cloudflare packaging dry-run pass. Offline-setup retry focus also passes compact and desktop production-browser checks.
- The compiled worker release is `94978d3fa4faabd149f547625ef6aedef157bb54241e14d23439a80e601c25f4`. It reconstructs from 92 emitted/recovery inputs (accounting for the build tool’s later `.vite` ignore-line append); all 339 scanned literal relative asset references resolve. Packaging stages 114 client files without bindings. Manifest/icon dimensions and offline/recovery bytes pass their checks.
- Read-only GitHub checks confirm your push at `eb4fc3c` with successful [Run #14](https://github.com/ken8303/Nightjar/actions/runs/38872054685), covering the preceding 643-test batch. The new review fixes remain local and are not covered by that hosted run.
- No Cloudflare deployment result appears in the checked GitHub statuses/check runs. An empty status list is not evidence of a pending deployment. The final Cloudflare origin still needs verification.
- The new review changes remain local for your next GitHub Desktop push. The development agent has not pushed or deployed. Temporary review servers, owned browser tabs and disposable test-origin data were cleaned up.

## What this release improves

- **Camera and reference imagery:** compatible catalogue changes keep the followed object; excluding catalogues clear it. Search retains a followed object outside the query. Survey thumbnails request bounded 200 × 200 cutouts while full references remain available. Controlled failures/retries retain names. Manual preview, live-time details handoff, paused-playback recovery and synthetic compass/lifecycle checks pass. These are predicted positions, not image recognition or measured phone alignment.
- **Sky and Moon viewers:** 2D/3D selection, zoom, keyboard controls, bounded labels and recovery preserve context. Above-30° shortcuts rank by their qualifying observing altitude. Lunar landmark centring and eclipse selection retain their intended targets/times. Framing guides have readable panel numbers and an enlarged scrollable view.
- **Time and exports:** original UTC instants retain seconds/milliseconds through recovery and reports. Local date/offset/era labels distinguish clock-change and boundary-year cases. Unknown site zones stay explicit in atlas, calendar, diary and print-plan output; a genuinely known UTC zone keeps its local-time identity. Actual received compact/desktop files were inspected.
- **Saved plans:** name/rating writes verify their final snapshots and preserve peer changes. Coordinate aliases and legacy equipment names keep distinct identities. The offline snapshot keeps same-coordinate site aliases and their separate ratings visible. Backup reads can be cancelled; exports refuse changed or unverifiable source reads before preparing a file, and import reviews refuse stale versions. A failed download clears obsolete success feedback. Empty legacy notes can be removed to free capacity, with ordinary Undo retained for note text.
- **Unfinished text and recovery:** form/draft readers match their bounded writers, including full-capacity escaped text. Failed target-note saves offer a manual in-memory recovery download with exact text, originals and removals. It does not mark edits saved or become an importable plan backup. Diary/imaging/raw-storage recovery remains separate from normal saved-plan backups.
- **Phone interaction:** saved red-light mode applies to the loading screen before hydration, with safe startup when storage is denied. Retry and version-review actions preserve useful keyboard focus. Offline-setup retries focus their completion message or retry/error guidance; delayed results and repeated worker signals leave a newer active editor alone. A 568 × 320 browser tour checked all seven sections, framing zoom/scroll, lunar controls and camera manual fullscreen; camera controls scroll within 45% of height, leaving 55% for the sky. Native touch, safe areas and keyboards remain pending.
- **Live data:** weather route boundaries reject invalid coordinates without provider contact and return public retry guidance for failed/malformed feeds. Aurora callers in the same Worker instance share an in-flight provider read, keep the five-minute success cache and can retry failures. Concurrent compiled local-Worker requests returned valid NOAA data; this is not a distributed cache guarantee.
- **Cloudflare packaging:** copied entry/assets paths must remain valid inside the isolated snapshot. Nonportable paths are refused before Wrangler, temporary directories are cleaned and the original build is unchanged. Equivalent portable spellings and the actual normal packaging dry-run pass.

Detailed reproductions, logs, historical test counts and their limitations are retained in [DEVELOPMENT-NOTES.md](./DEVELOPMENT-NOTES.md). The full gates are in [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md); feature scope and known limitations are in [README.md](./README.md).

## After your batch push

1. Check the GitHub validation workflow result for the pushed commit. Read its verification summary and step log; download the validation-log artifact when available. Local passing checks do not establish a hosted CI result.
2. Check the Cloudflare build and final HTTPS origin. Confirm the planner, weather, manifest, service worker and offline fallback there. Follow [CLOUDFLARE.md](./CLOUDFLARE.md) for build configuration.
3. Use test entries for the checks below. Verify any backup/recovery file is actually received before clearing text or leaving a failed-save view.

## Phone acceptance checks

| Flow | Expected result |
| --- | --- |
| Camera discovery | In Safari or Chrome on HTTPS, choose the correct observing site and intentionally start camera/motion. Turning the phone moves predicted labels; stopped/paused video hides live labels. Check a known bright object and alignment. These are predicted positions, not image recognition. |
| Camera display | Fullscreen, portrait/landscape, reference thumbnails and scrollable controls remain usable. Closing or backgrounding stops camera/motion/screen awake; return does not silently restart hardware. |
| Sky chart recovery | In the 2D chart, tap a visible name and a dot; both select the intended target. If 3D rendering stops, use the fallback chart or Retry 3D sky. Retry preserves site, time, selection and unfinished edits. Test portrait/landscape and foreground return on the phone. |
| Page return | Leave the browser/app, then return; also navigate away and Back. Recommendations/forecast age refresh when visible, without replacing unfinished observing-time text. Native cached-page restoration still needs verification. |
| Delayed loading | On a slow connection, background while a view or offline setup is still loading, then return. Recovery deadlines allow a fresh foreground wait; an unfinished time edit keeps reload disabled and its review action returns to the retained input. |
| Installation and update | Install from the browser/home-screen flow. A pending install cannot be tapped repeatedly. For a real deployed update, save/copy unfinished text first and confirm the selected site/time survive the explicit update. |
| Offline return | Open online once and save test plans. Reopen without connectivity: the fallback shows saved device data. Full planner startup, fresh positions and weather offline are not supported promises. Restore connectivity and verify return. |
| Numeric entry | Try a decimal comma such as focal 12,5 and confirm a saved setup shows 12.5 mm. Invalid/unfinished text stays in the draft and disables relevant calculations/exports. Verify the native keyboard permits required signs and separators. |
| Failed saves | Keep the view open. Direct review actions return to time, coordinates, imaging, diary, target-note or site-name recovery. Retry after storage is usable; verify retained text and original observation metadata. |
| Files and accessibility | Confirm actual receipt/import/printing of intended files. Test screen-reader labels, focus after review/close, large text, and short landscape screens. Local screenshots and download-prepared messages do not prove these native behaviours. |

Physical iPhone/Android sensors, installed-PWA lifecycle, native keyboards/readers/files and hosted GitHub/Cloudflare results for the new local batch remain unverified. Detailed evidence and release gates are in [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md); development history is in [DEVELOPMENT-NOTES.md](./DEVELOPMENT-NOTES.md).
