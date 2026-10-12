# Nightjar beta handoff

The latest local code passed 536 automated tests, TypeScript, lint, production build and Cloudflare packaging dry-run. Changes are committed locally for a batch push through GitHub Desktop. No push or deployment was performed by the development agent.

Latest batches repair the Node 22 CI fixtures and improve camera/image lifecycle recovery, keyboard focus, supported-date shortcuts, saved-collection return checks, forecast reconnect throttling and PWA indicators. All 536 tests also pass under Node 24.19. Detailed reproductions and limitations are recorded in the development notes.

The reviewed production build also passed an actual service-worker fallback/retry check with saved Vega, its multiline note and the selected London/time snapshot. Compact and landscape camera checks decoded the actual M31 reference thumbnail, showed Fomalhaut using generated video and a synthetic phone pose, and kept camera/motion off after background return. These local checks complement the physical-phone and deployed-origin checks below.

## After your batch push

1. Check the GitHub validation workflow result for the pushed commit. Local passing checks do not establish a hosted CI result.
2. Check the Cloudflare build and final HTTPS origin. Confirm the planner, weather, manifest, service worker and offline fallback there. Follow [CLOUDFLARE.md](./CLOUDFLARE.md) for build configuration.
3. Use test entries for the checks below. Verify any backup/recovery file is actually received before clearing text or leaving a failed-save view.

## Phone acceptance checks

| Flow | Expected result |
| --- | --- |
| Camera discovery | In Safari or Chrome on HTTPS, choose the correct observing site and intentionally start camera/motion. Turning the phone moves predicted labels; stopped/paused video hides live labels. Check a known bright object and alignment. These are predicted positions, not image recognition. |
| Camera display | Fullscreen, portrait/landscape, reference thumbnails and scrollable controls remain usable. Closing or backgrounding stops camera/motion/screen awake; return does not silently restart hardware. |
| Sky chart recovery | In the 2D chart, tap a visible name and a dot; both select the intended target. If 3D rendering stops, use the fallback chart or Retry 3D sky. Retry preserves site, time, selection and unfinished edits. Test portrait/landscape and foreground return on the phone. |
| Page return | Leave the browser/app, then return; also navigate away and Back. Recommendations/forecast age refresh when visible, without replacing unfinished observing-time text. Native cached-page restoration still needs verification. |
| Installation and update | Install from the browser/home-screen flow. A pending install cannot be tapped repeatedly. For a real deployed update, save/copy unfinished text first and confirm the selected site/time survive the explicit update. |
| Offline return | Open online once and save test plans. Reopen without connectivity: the fallback shows saved device data. Full planner startup, fresh positions and weather offline are not supported promises. Restore connectivity and verify return. |
| Numeric entry | Try a decimal comma such as focal 12,5 and confirm a saved setup shows 12.5 mm. Invalid/unfinished text stays in the draft and disables relevant calculations/exports. Verify the native keyboard permits required signs and separators. |
| Failed saves | Keep the view open. Direct review actions return to time, coordinates, imaging, diary, target-note or site-name recovery. Retry after storage is usable; verify retained text and original observation metadata. |
| Files and accessibility | Confirm actual receipt/import/printing of intended files. Test screen-reader labels, focus after review/close, large text, and short landscape screens. Local screenshots and download-prepared messages do not prove these native behaviours. |

Physical iPhone/Android sensors, installed-PWA lifecycle, native keyboards/readers/files and hosted GitHub/Cloudflare results remain unverified. Detailed evidence and release gates are in [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md); development history is in [DEVELOPMENT-NOTES.md](./DEVELOPMENT-NOTES.md).
