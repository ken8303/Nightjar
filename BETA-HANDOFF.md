# Nightjar beta handoff

Nightjar remains a beta. Desktop Safari and automated checks do not establish physical-phone camera alignment, native phone file handling or installed-PWA reliability.

## Current release evidence — 17 October 2026

- **662 tests pass on Node 22.16.0 and Node 24.19.0.** TypeScript, lint, production build and Cloudflare packaging dry-run pass on the final source. Packaging stages 114 asset files without bindings.
- Worker release `1ff6da7b65bee2aedf9b49961ff6350ce10784b15cde909df0e079d3bef51b32` reconstructs from 92 emitted/recovery inputs in the isolated packaging snapshot after the build tool’s later `.vite` ignore-line append. All 340 scanned literal relative asset references resolve; manifest/icon dimensions and offline/recovery source bytes pass.
- The final build-folder audit found late numbered generated copies. The existing packaging guard omitted 83 identical, unreferenced copies in its isolated snapshot; the source/build folder was preserved. The isolated release/asset checks and repeated packaging dry-run pass.
- Your push at `63b0f6e` passed [GitHub Run #16](https://github.com/ken8303/Nightjar/actions/runs/38965552284). The final mobile input-label fix and this evidence update remain local for your next batch push. The development agent has not pushed or deployed.
- The final Cloudflare HTTPS origin remains unverified. Follow [CLOUDFLARE.md](./CLOUDFLARE.md) for build configuration and deployed-origin acceptance.

## Final local fix

The observing-time input now has an explicit accessible name. At narrow widths, CSS hides its visible label; native Safari previously exposed an unnamed date/time area. Safari now exposes “Observing time” at 320 × 800 and 380 × 800. The date calculations and native control remain unchanged.

## Reviewed changes included in your latest push

| Commit | Change |
| --- | --- |
| `c4b2f6f` | Aurora identifies the UTC fallback when the site’s time zone is unknown. |
| `f348300` | Missing nearby aurora coverage stays unavailable instead of borrowing a distant cell. The 2° limit checks coverage, not model accuracy. |
| `e08c40c` | Full-hour Sun/Moon checks catch brief altitude crossings between samples. |
| `1db9d45` | Twilight planning shares the geometric Sun-centre convention used by milestones and camera lighting; apparent object-viewing positions are preserved. See [USNO definitions](https://aa.usno.navy.mil/faq/RST_defs). |
| `ff6828b` | UTC/local zone buttons cannot silently discard an unfinished time edit or unresolved repeated-hour choice. |
| `63b0f6e` | Calendar feedback follows the exported forecast window and conditions; Milky Way dates reuse the era-aware formatter. |

Earlier batches and detailed reproductions remain in [DEVELOPMENT-NOTES.md](./DEVELOPMENT-NOTES.md). Feature scope and limitations are in [README.md](./README.md).

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

Physical iPhone/Android sensors, installed-PWA lifecycle, native keyboards/readers/files and the final Cloudflare deployment remain unverified. GitHub validation for the reviewed batch passed. Detailed evidence and release gates are in [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md); development history is in [DEVELOPMENT-NOTES.md](./DEVELOPMENT-NOTES.md).
