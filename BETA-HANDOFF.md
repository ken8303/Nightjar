# Nightjar beta handoff

Nightjar remains a beta. Desktop Safari and automated checks do not establish physical-phone camera alignment, native phone file handling or installed-PWA reliability.

## Current release evidence — 18 October 2026

- **5 dated-label/zoom tests pass for the expanded-chart header update**, with TypeScript, lint, production build and Cloudflare dry-run passing on Node 24.19.0. The preceding full 662-test run covers site-Save protection at `00c2782`. Packaging stages 103 asset files without bindings.
- Worker release `69f2379854cf4a67ecfab901bcaf6d193759f8ecb31611b7215abe38b4afa234` reconstructs from 81 emitted/recovery inputs in the isolated packaging snapshot after the build tool’s later `.vite` ignore-line append. All 312 scanned literal relative asset references resolve; manifest/icon dimensions and offline/recovery source bytes pass. The packaging guard omitted 24 identical, unreferenced generated copies from this isolated snapshot; the build folder was preserved.
- Your latest push at `c025022df21597bcdd9dd35f8d06ebd80c2bdf4a` passed [GitHub validation](https://github.com/ken8303/Nightjar/actions/runs/39018687628). The exact-head validate job passed locked dependency installation and the complete TypeScript → lint → tests → build → Cloudflare dry-run command. This includes the input naming, meteor labels, guarded home navigation and mobile camera/photo acceptance. Later local work includes short-screen manual preview, stale site-Save protection, dated expanded-chart labels and evidence updates. The development agent has not pushed or deployed.
- The final Cloudflare HTTPS origin remains unverified. Follow [CLOUDFLARE.md](./CLOUDFLARE.md) for build configuration and deployed-origin acceptance.

## Latest verified fixes

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
