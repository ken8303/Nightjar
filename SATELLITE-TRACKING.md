# Satellite tracking implementation brief

Research checked 18 October 2026. Satellite tracking is not implemented. This brief prepares a bounded first slice; it adds no dependency, orbital feed, cache binding or public endpoint.

## Source and propagation choice

Use CelesTrak GP JSON with OMM field names, initially one allowlisted object: ISS, catalogue number 25544. The [format documentation](https://celestrak.org/NORAD/documentation/gp-data-formats.php) supports explicit CATNR and FORMAT queries. It warns that new six-digit catalogue numbers cannot be represented in legacy TLEs; do not introduce a five-digit parser or rely on the default response format. Its compact JSON can omit redundant Earth/TEME/UTC/SGP4 metadata. Validate those documented defaults explicitly.

The [usage policy](https://celestrak.org/usage-policy.php) says GP updates occur every two hours, requests should retrieve only needed data once per update, and automated clients must stop on non-200 responses for human investigation. A single read-only attempt at the documented ISS JSON endpoint was inaccessible through the research tool; no HTTP status or feed bytes were returned. No retries or alternate-client requests were made. Live endpoint acceptance remains pending.

[satellite.js](https://github.com/shashwatak/satellite-js) is an MIT-licensed candidate with OMM ingestion, SGP4 propagation and coordinate transforms. Its README demonstrates json2satrec, propagate, eciToEcf and ecfToLookAngles, and requires handling a null propagation result. The reviewed [develop package metadata](https://raw.githubusercontent.com/shashwatak/satellite-js/develop/package.json) identifies 7.1.0 and ESM exports; this does not establish a published npm release or compatible locked build. Select and verify a released version before installing. Do not copy the README's old sample orbit into a live feature.

## Proposed first slice

Show ISS calculated altitude/azimuth/range at the existing selected site and UTC instant, plus a bounded next-pass list. Keep this outside camera discovery until ordinary atlas/list behavior is verified. No brightness guarantee, pass notifications, whole-catalogue animation or historical-orbit claim belongs in this first slice.

Preserve both the orbital epoch and the successful source-fetch time. The selected observing date must not become the feed date. Define and validate a short permitted distance from epoch before exposing shortcuts; an old/current orbit cannot support the planner's entire year 1–9999 range. Treat a future epoch/device-clock discrepancy separately from stale data. Explain unavailability without changing the selected plan.

Parse UTC epoch strings independently of the browser's local zone, including the source's documented omitted UTC designator and fractional-second precision. Validate required finite orbital fields, supported theory/frame, unique allowlisted identity, bounded response size and valid timestamps before propagation. A display name must not determine identity. Decayed/null/nonfinite propagation results remove the corresponding position and pass actions.

Keep TEME/SGP4 transforms inside the propagation adapter. Feed calculated horizontal directions into atlas geometry; do not pass these vectors through the J2000 catalogue projector. Document angle and distance units at each boundary. The existing observing site has no elevation field: use an explicit sea-level assumption until elevation is separately designed.

Above the geometric horizon does not establish naked-eye visibility. Illumination, observer twilight, brightness, weather and obstructions need distinct treatment. Any future visible-pass label requires a validated shadow/lighting model; the initial list should identify geometric passes as such.

## Fetch and mobile architecture

A browser request per user, tab, second or animated frame would not meet the intended provider cadence. Coordinate upstream acquisition through shared server state. A per-isolate variable or independent per-region cache alone cannot guarantee one acquisition across the deployment. Choose a shared coordinator/cache or a permitted mirror before shipping; a new storage binding would change the current Cloudflare requirements and must be documented and dry-run verified.

Coalesce concurrent refreshes, retain the original fetch timestamp in cached responses, bound deadlines and body size, and latch upstream non-200 failures for investigation instead of automatic retries. A page Retry action must not bypass provider policy. Never cache the feed as an immutable app-shell asset or turn unavailable data into an empty sky that implies no satellites.

Propagate only the selected object and bounded pass interval. Run pass searches away from touch/render work, support cancellation when site/time changes, reject stale completions and suspend live animation while hidden. Use separate Live and selected-time behavior. Pass shortcuts must use the existing unfinished-edit/navigation guard.

## Acceptance before implementation is called complete

- Verify actual OMM response bytes, permitted serving/attribution, a released library and clean Node 22/Cloudflare builds.
- Compare frozen independent reference vectors/look angles, including epoch offsets, radians/degrees, date-line sites and polar observers. Include six-digit identities, fractional epochs, decay and invalid fields.
- Compare rise/peak/set against independent pass references; refine crossings and handle grazing/no-pass intervals. Establish the epoch validity policy with evidence.
- Exercise concurrent acquisition, expired cache, future clock, upstream non-200 latch, timeout and cancellation without repeated provider requests.
- Check 320 px portrait, short landscape, keyboard labels/actions and unchanged site/time after selection. Verify PWA fallback remains useful when satellite data is unavailable.

The native satellite feature remains missing in FEATURE-STATUS. Existing camera labels and all-sky star charts are not satellite tracking evidence.
