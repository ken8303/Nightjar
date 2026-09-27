# Nightjar

A responsive stargazing planner built with React, TypeScript, Vinext and Astronomy Engine.

## Included in this beta

- Live hourly Open-Meteo weather, an explained planning score, and a best-hour recommendation.
- Location search, coordinates, optional browser geolocation, an OpenStreetMap view, and device-local saved places.
- Shared observing time in UTC with local-time display; bright-star sky chart and calculated planetary positions.
- Moon phase, illumination and horizon position.
- Typical annual meteor peak windows with calculated Moon illumination.
- Camera field-of-view and 35 mm equivalent focal-length calculations.
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

Not implemented: light pollution data, multi-model comparison, aurora alerts, AR, full deep-sky catalogue, sky-photo recognition, 3D Moon, mosaics, cloud accounts and push notifications.

## Sources

- https://open-meteo.com/
- https://github.com/cosinekitty/astronomy
- https://www.openstreetmap.org/copyright
- https://www.imo.net/resources/calendar/
