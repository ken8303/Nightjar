# Light-pollution layer implementation brief

Research checked 18 October 2026. No new map layer is shipped by this document. My places now offers an attributed external atlas link, without transferring the selected coordinates or implementing a native layer. Existing personal Bortle ratings remain observations supplied by the user.

## Data choice

The first actual sky-brightness layer should use a model of zenith sky brightness with a documented release. Satellite views of lights on the ground can be a separate layer. They cannot supply an automatic Bortle rating or be silently relabelled as sky brightness.

| Candidate | What it represents | Suitability and unresolved work |
| --- | --- | --- |
| [David Lorenz Light Pollution Atlas](https://djlorenz.github.io/astronomy/lp/) | Atmospheric modelling of artificial light at the zenith, using annual satellite-derived sources; the current page identifies 2025 input data. Published world-map coverage is 65°S–75°N, with a date-line seam. | Best semantic match for the sky-brightness feature. Verify redistribution and tile-service usage terms for the exact release before integration; the page's invitation to use maps does not establish a versioned service contract. Do not treat its availability on GitHub as a software/data licence. |
| [EOG VIIRS Nighttime Lights](https://eogdata.mines.edu/products/vnl/) | Satellite radiance in nW/cm²/sr. Product specifications include 15-arcsecond geographic grids and 65°S–75°N coverage. | Useful as a separate ground-light layer or as input to a separately validated model. Check the linked licence document for the exact product; the overview says many products use CC BY 4.0, which is not a blanket claim for every file. Requires raster processing and a serving plan. |
| [NASA GIBS Black Marble metadata](https://raw.githubusercontent.com/nasa-gibs/worldview-options-eosdis/master/common/config/metadata/viirs/EarthAtNight.md) | The documented composite layers show anthropogenic light sources, with 2012/2016 snapshots. Enhanced nighttime imagery is a different product and can include natural illumination. | A possible separate historical satellite-imagery layer. Verify the actual layer identifier, matrix set, date and metadata from current capabilities. A familiar image name does not establish that it is a current zenith-brightness model. |

Lorenz's [colour definitions](https://djlorenz.github.io/astronomy/lp/colors.html) distinguish a modelled artificial/natural brightness ratio from total brightness in mag/arcsec², with an assumed natural background. Preserve that distinction in both the legend and a numeric sample. His [Bortle explanation](https://djlorenz.github.io/astronomy/lp/bortle.html) expressly separates the visual scale from zenith brightness. Never convert the atlas's zones into Bortle classes by renaming them.

EOG's coverage warnings also matter: missing valid observations must not appear as zero light. Render unavailable data as a separate state, rather than a dark colour that implies a pristine observing site.

For a NASA layer, [Earthdata's use policy](https://www.earthdata.nasa.gov/engage/open-data-services-software/data-use-policy) distinguishes NASA-led data from third-party restrictions and requires checking marked exceptions. [GIBS documentation](https://nasa-gibs.github.io/gibs-api-docs/) supplies its acknowledgement guidance. Keep the exact dataset citation and service acknowledgement with the layer; NASA branding must not imply endorsement.

## Implementation contract

Use a pinned layer descriptor containing provider, product/release identifier, source observation period, processing/version date, units, coverage bounds, attribution links, permitted use, tile or raster endpoint, projection, zoom range and nodata policy. Keep modelled data, measured radiance and the user's rating as distinct types. No provider key belongs in the client bundle.

Load the map only when its section is opened. Bound the number of simultaneous tile requests, cancel obsolete view requests and retain a working location selector if the layer is unavailable. A partial tile failure must remain visible as missing coverage; do not clear a useful base map or silently substitute a different product. Avoid putting a global raster or all map tiles in the app-shell service-worker cache.

Keep observing coordinates and time unchanged while panning, switching layers or opening source information. A deliberate Use this site action should pass through the existing unfinished-edit guard. The data year must remain visible independently of the planner date: changing the observing time cannot make an annual historical layer a live forecast.

Provide keyboard pan/zoom, a visible selected-site marker, a labelled opacity control, readable numeric legend values and a text fallback. State the model's horizon/atmosphere assumptions and that local glare, clouds and terrain can change actual conditions. Do not derive the existing weather planning score from this layer without a separate model and validation.

## Acceptance before calling the layer implemented

- Confirm source terms, a versioned dataset and the actual service response. Record attribution and any usage limits; no external contact has been sent during this research.
- Check known reference pixels/legend boundaries against provider values; document interpolation and nodata handling. Screenshots of coloured tiles alone do not verify numeric sampling.
- Verify longitude wrapping at ±180°, exact northern/southern coverage edges and explicit unavailable states outside them. Preserve the user's entered longitude and saved-site identity.
- Test missing/slow tiles, failed retry, stale requests after rapid panning, and recovery without changing the selected plan.
- At 320 px portrait and short landscape, verify pan/zoom, legend scrolling, focus order, touch controls and absence of page overflow. Test keyboard navigation independently of touch.
- Confirm bounded network/memory behavior and that offline/PWA recovery still opens saved plans without requiring the map provider.

Until these checks pass, FEATURE-STATUS must continue to list the actual light-pollution layer as missing.
