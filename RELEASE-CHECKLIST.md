# Nightjar first-release checks

The app remains a beta. Automated and desktop-browser results do not establish live-phone camera alignment or installed-PWA reliability.

## Verified locally

- 175 automated tests pass; TypeScript, lint and production build pass.
- Cloudflare Worker packaging dry-run passes without publishing or requiring app storage bindings.
- Camera mathematical projection, label bounds, interruption state and manual-preview flows have regression coverage.
- Deep-sky catalogue search, coordinates, altitude/Moon filtering and imaging geometry have calculation coverage.
- Saved plans, backups, diary drafts and downloads have validation and recovery coverage.
- The actual service worker recovered from server errors and stalled navigation on an isolated browser test origin.
- The actual app recovered from delayed town search and photo responses using isolated local test fixtures.
- Relevant UI flows were checked at desktop, 390-pixel mobile and 320-pixel compact widths. This is not a claim that every screen was tested at every width.

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
| Camera alignment | Use a clearly identifiable bright target and the alignment controls. Repeat after rotation. | The label remains near the target after alignment, with understandable recalibration guidance if needed. Accuracy is not yet established by desktop tests. |
| Camera fallback | Decline motion or use manual mode. | The manual controls work and the UI identifies manual operation. Labels remaining fixed while moving the phone in manual mode are expected. |
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

The camera overlays predicted positions from the bright-star/solar-system selection; it does not recognize sky objects from camera pixels. Deep-sky Messier objects are a separate explorer and are not part of camera discovery. Light-pollution maps, cloud accounts, push alerts, an AI assistant, a photo gallery and full reference-site feature parity remain outside this first-release implementation.

Completion percentages previously reported were estimates. Release acceptance is based on these checks, especially the remaining physical-phone and production-origin tests.
