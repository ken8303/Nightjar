# Lunar libration and Earth-facing view

The Moon explorer offers a time-following Earth-facing view and numerical sub-Earth longitude/latitude and apparent diameter. The mean near side and free globe exploration remain available. This is a smooth-sphere illustration, not a telescope simulator or local sky orientation.

## Model and coordinates

`lib/lunar-view.ts` calls the installed Astronomy Engine `Libration` function for the selected UTC instant. It retains its geocentric sub-Earth latitude and east-positive longitude, distance in kilometres and apparent diameter converted from degrees to arcminutes. Invalid/out-of-planner dates or nonfinite/out-of-domain results are unavailable. The helper takes no observing location: observer parallax and the roll of the lunar axis relative to the local sky are excluded. Altitude elsewhere in the Moon panel still uses the selected observing site.

The globe and catalogue landmarks share axes +X at lunar 90°E, +Y at lunar north and +Z at longitude zero. A surface direction is `(sin(lon)*cos(lat), sin(lat), cos(lon)*cos(lat))`. Earth-facing mode points at the sub-Earth coordinates with lunar north up. It uses an orthographic rendering camera so the illustrative near camera distance cannot cut off the correct 90° limb; zoom controls change framing, not the physical angular diameter reported in the facts. Label projection and limb visibility use that same rendering camera.

The existing mean-side/free modes retain their perspective renderer. Earth-facing mode follows date changes and keeps its zoom. Toolbar/keyboard rotation, landmark centring and pointer interactions return to free exploration; Home/Near side selects the mean near side. Programmatic zoom and the fully-lit/label controls retain the active Earth-facing mode. Retrying a rebuilt globe restores Earth-facing orientation if selected; a free view starts again at the mean near side with matching status.

Approximate phase illumination is placed in the same sub-Earth frame, with a unit eastward tangent and viewing direction. This preserves the phase angle when the Earth-facing latitude/longitude change. It does not implement an independently calculated subsolar latitude, full physical scattering, terrain relief/shadows or an eclipse shadow model. Fully lit surface remains a separate exploration setting.

## Independent numerical evidence — 19 October 2026

The [NASA SVS 2026 phase/libration page](https://svs.gsfc.nasa.gov/5587/) explains the sub-Earth point and distinguishes libration from the position angle of the axis. Its [hourly JSON data](https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005587/mooninfo_2026.json) supplies an independent reference, rather than values calculated from the application helper.

All 8760 UTC-hour samples of 2026 were compared locally against the installed library. Maximum absolute differences: longitude 0.003203°, latitude 0.027915°, distance 52.272 km and apparent diameter 0.319 arcseconds (bounds rounded upward). The UI rounds libration to 0.1° and diameter to 0.1 arcminute. These comparisons validate the stated 2026 samples, not global historical/future accuracy across the planner’s entire supported calendar range. No empirical offset was applied to force agreement.

Six frozen NASA samples across the year are regression references, with tolerances of 0.005° longitude, 0.03° latitude, 60 km and 0.4 arcseconds. Additional tests cover unsupported dates, finite results at planner boundaries, east/north axis signs, unit-length view/lighting vectors, phase-angle preservation and centred/north-up orthographic projection. The whole NASA dataset is not bundled or fetched during app use. There is no new runtime library, service, permission or Cloudflare binding.

Physical phone rendering, native touch/zoom, assistive technology and the final hosted origin still require acceptance. Existing NASA surface-map attribution remains visible in the Moon explorer.
