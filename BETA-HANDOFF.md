# Nightjar beta handoff

Nightjar remains a beta. Local checks do not establish physical-phone camera alignment, native file handling or installed-PWA reliability.

## Current release evidence — 16 October 2026

- **651 tests pass on Node 22.16.0 and Node 24.19.0.** TypeScript, lint, production build and Cloudflare packaging dry-run pass. Offline-setup retry focus also passes compact and desktop production-browser checks.
- The compiled worker release is `6118ca14b11d6e6234e305b58d9228d6f0b4aa946d4b7aa5eca69696bf6ddf34`. It reconstructs from 92 emitted/recovery inputs (accounting for the build tool’s later `.vite` ignore-line append); all 339 scanned literal relative asset references resolve. Packaging stages 114 client files without bindings. Manifest/icon dimensions and offline/recovery bytes pass their checks.
- Read-only GitHub checks confirm your push at `eb4fc3c` with successful [Run #14](https://github.com/ken8303/Nightjar/actions/runs/38872054685), covering the preceding 643-test batch. The new review fixes remain local and are not covered by that hosted run.
- No Cloudflare deployment result appears in the checked GitHub statuses/check runs. An empty status list is not evidence of a pending deployment. The final Cloudflare origin still needs verification.
- The new review changes remain local for your next GitHub Desktop push. The development agent has not pushed or deployed. Temporary review servers, owned browser tabs and disposable test-origin data were cleaned up.

## Current local batch since your last push

| Commit | Change and verified behaviour |
| --- | --- |
| `f1a94ae` | Offline-setup retry focuses success or usable retry/error guidance. Delayed results leave a newer editor alone. |
| `c0e009b` | Offline snapshots keep named site aliases and their separate ratings at identical coordinates. Recovery and online return keep the selected context. |
| `0fe3af5` | Saved red-light mode applies before the loading screen. Off and denied-storage startup remain usable; hydration stays clean. |
| `c88e34d` | Backup export refuses changed/unverifiable source reads before offering a file. Failed backup/recovery downloads clear obsolete success feedback. This is guarded verification, not an atomic storage snapshot. |
| `505aa54` | Recorded controlled camera-location cancellation, suspension, close/reopen and unfinished-time handoff acceptance. No runtime change. |
| `4d19a91` | Survey photo panels and enlarged viewers use 800 × 800 previews with a direct original-survey link. Actual M33 decoding fell from 3564 × 3571 to 800 × 800; retry/zoom/close and featured NASA photos pass. |
| `5356d20` | Smaller NASA camera thumbnails: seven planet/Moon references request a 200-pixel long side; Saturn’s listed thumbnail decodes at 640 × 309. Main reference images are unchanged. |

Compact and desktop browser checks used controlled fixtures where needed. Camera positions remain predictions, not image recognition. Image dimensions establish decoded-pixel reduction, not a timing, RAM or battery benchmark. Existing feature scope and limitations remain in [README.md](./README.md).

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
