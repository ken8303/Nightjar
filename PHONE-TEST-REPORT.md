# Nightjar phone acceptance report

Copy this report for each device/browser and deployed build. All checks below start **Not run**. Use Pass, Fail, Not run or Unable to test; record what actually happened. Existing desktop-browser and automated evidence is in [BETA-HANDOFF.md](./BETA-HANDOFF.md).

## Test context

- Date and time, including time zone:
- Deployed HTTPS URL:
- Deployed Git commit (from the deployment record):
- Device model and OS version:
- Browser and version; browser tab or installed home-screen app:
- Observing site name/coordinates and selected UTC instant:
- Network conditions:
- Test object(s) and camera alignment/calibration settings:

Use a disposable observing note and save/copy important unfinished work before an update test. Do not replace an unknown result with the result from another phone or an older build.

## Results

| Check | Status | Actual result / evidence |
| --- | --- | --- |
| Camera discovery: deliberately enable camera and motion, point at a known visible bright object, then slowly turn through a full circle. Names should move with the predicted sky directions. | Not run | Record the object, alignment offset and any persistent drift, wrong direction or labels staying fixed on the screen. |
| Camera location: explicitly request device location, inspect its reported horizontal accuracy/fix time, then restore the planner site. | Not run | Record the reported estimate and source time, whether returning from interruption keeps the original fix time, and whether restoring/closing clears its viewer-only metadata. This does not measure label alignment. |
| Label stability: hold the phone steady, then move slowly past an object and back. | Not run | Record disappearing/reappearing labels and whether video or motion showed an interruption. |
| Camera layout: thumbnails, fullscreen, portrait/landscape and returning to Settings. | Not run | Record any clipped label, hidden control or unusable scrolling. |
| Interruption: background/lock and return; close and reopen the viewer. | Not run | Check that hardware stops and does not silently restart; record explicit restart and recovery behavior. |
| Atlas framing: load your equipment in Photo tools, set a known rotation, and enable Imaging grid in ordinary/expanded 2D and 3D views. Rotate the phone and change observing time. | Not run | Record equipment dimensions/focal length, panel layout and rotation. Check the grid follows that draft, preserves the selected object/site/time, clips at the ideal horizon and remains usable in portrait/landscape. Small fields retain their angular scale. |
| Installed PWA: install/open, then exercise an actual deployed update with a known site/time and a disposable unfinished edit. | Not run | Record whether the unfinished edit blocks reload, and the site/exact UTC time before and after the eventual explicit update. |
| Offline recovery: open online, save test data, disconnect and reopen; reconnect and return. | Not run | Record which fallback data appears and whether returning online succeeds. If using Photo tools, record whether the saved imaging fields are retained on return. Fresh weather/positions and full offline planner startup are not promised. |
| Native files: receive a backup, calendar event and print-ready plan using the normal UI. | Not run | Record actual receipt and, where tested, import/printing results. A download-prepared message alone is insufficient. |
| Native input/accessibility: time entry, decimal/sign entry, large text, screen-reader names and focus after closing/reviewing. | Not run | Record the exact control and settings tested; list untested portions separately. |

Camera labels are calculated from location, time and orientation; this is not recognition of objects from camera pixels. A label seen indoors or in daylight is not evidence that its astronomical object was detected.

## Reproduce a failure

- Check name and exact steps:
- Expected result:
- Actual result:
- Frequency (every attempt, intermittent, once):
- Screenshot/video or diagnostic text, if available:
- Does an explicit stop/restart or page return recover it?
- Saved data or unfinished text affected, if any:

Keep failed and untested checks visible when summarizing the build. A successful result for one device/browser does not establish acceptance on every supported phone.
