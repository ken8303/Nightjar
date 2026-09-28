# Nightjar

A responsive stargazing planner built with React, TypeScript, Vinext and Astronomy Engine.

## Included in this beta

- Live hourly Open-Meteo weather, an explained planning score, and a best-hour recommendation.
- Low/middle/high cloud cover, near-surface visibility, dew point and temperature margin for the selected forecast hour. Dew guidance is a heuristic; visibility is not astronomical seeing or transparency.
- Location search, coordinates, optional browser geolocation, an OpenStreetMap view, and device-local saved places.
- Shared observing time in UTC with local-time display; bright-star sky chart and calculated planetary positions.
- Moon phase, illumination and horizon position; next Sun/Moon rise/set and astronomical darkness crossings.
- Latest NOAA OVATION aurora outlook, hemisphere grid, local model estimate, timestamps and stale-data warnings.
- Typical annual meteor peak windows with calculated Moon illumination and downloadable all-day calendar events.
- Golden-hour and blue-hour windows for morning/evening, based on Sun altitude and the shared observing time.
- Camera field-of-view, 35 mm equivalent focal length, image scale and guiding RMS conversion.
- Named equipment setups saved on this device.
- Small-field mosaic planner with overlap, rotated panel centres and CSV export.
- Interactive 3D Moon with NASA surface imagery, labelled landmarks, phase lighting and a lunar phase timeline.
- Compare up to four saved/current locations at the same UTC forecast hour, with weather, Moon visibility and an explained planning score.
- Upcoming lunar eclipses with global contact times and local Moon altitude at each contact, plus UTC-safe calendar downloads containing the full event and contact notes.
- A feature-detected WebMCP location tool.

## Run locally

Requires Node 22.13 or newer.

```sh
npm ci
npm run dev
```

`npm run build` creates the Cloudflare-compatible deployment output. Site identity is in `.openai/hosting.json`.

## Data and limitations

Weather and place search are fetched server-side from Open-Meteo; no API key is configured. Review provider terms and capacity before commercial use. Saved places are browser-local and are not account-synced. Location coordinates are sent to the weather provider and map provider when those views are used.

The planning score is a transparent heuristic, not astronomical seeing or transparency. There is no terrain horizon correction. The star catalogue is a small bright-star selection with approximate fixed coordinates; this is not a navigation instrument. Meteor peaks are typical annual dates, not year-specific forecasts. The annual calendar links to IMO for detailed current bulletins.

Not implemented: light pollution data, multi-model comparison, aurora alerts (the short-term outlook is included), AR, full deep-sky catalogue, sky-photo recognition, full-sky framing overlays, cloud accounts and push notifications.

## Sources

- https://open-meteo.com/
- https://github.com/cosinekitty/astronomy
- https://www.openstreetmap.org/copyright
- https://www.imo.net/resources/calendar/

Aurora: https://www.spaceweather.gov/products/aurora-30-minute-forecast. The polar grid is sampled for display; the local estimate uses the nearest full-resolution cell. Aurora is always the latest feed, independent of the planner date.

Mosaic centres use a tangent-plane projection around the supplied equatorial target. The supplied coordinate epoch is preserved; no precession, mount control, exact spherical overlap or per-panel camera-angle correction is provided. Fields are limited to 10 degrees and target declination to ±75 degrees.

Moon texture: NASA’s Scientific Visualization Studio / LRO, https://svs.gsfc.nasa.gov/4720/. Landmark centres: IAU/USGS Gazetteer of Planetary Nomenclature. The smooth globe approximates phase lighting; it does not model libration, local sky orientation, elevation, terrain shadows or eclipses.
