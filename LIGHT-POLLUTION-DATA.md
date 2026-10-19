# Light-pollution layer implementation brief

Research and live source responses checked 19 October 2026. My places now has an optional native visual layer for David Lorenz’s 2025 model, alongside the source atlas link. Loading it explicitly requests the viewed area from the map providers. Personal Bortle ratings remain observations supplied by the user. Numeric point sampling, combined weather/aurora layers and offline map downloads are not implemented.

## Data choice

The first actual sky-brightness layer should use a model of zenith sky brightness with a documented release. Satellite views of lights on the ground can be a separate layer. They cannot supply an automatic Bortle rating or be silently relabelled as sky brightness.

| Candidate | What it represents | Suitability and unresolved work |
| --- | --- | --- |
| [David Lorenz Light Pollution Atlas](https://djlorenz.github.io/astronomy/lp/) | Atmospheric modelling of artificial light at the zenith, using annual satellite-derived sources; the current page identifies 2025 input data. Published world-map coverage is 65°S–75°N, with a date-line seam. | Selected for the visual layer. The source page explicitly invites use of its maps and asks that they not be conflated with Bortle classes. Nightjar attributes the provider and requests its year-specific published tiles directly; it does not redistribute the world raster. There is no promised service availability or immutable processing release. GitHub hosting is not itself a software/data licence. |
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

The visual layer has a narrower acceptance scope than a numeric raster sampler. FEATURE-STATUS must keep numeric point sampling and full reference-feature parity pending until their separate checks pass.


## Native visual layer — 19 October 2026

- The descriptor in `lib/light-pollution.ts` pins the `tiles2025` endpoint, EPSG:3857 Leaflet display, 1024 px tiles, zoom offset −2 and maximum native map zoom 8, matching the provider’s published map configuration. Nightjar limits display zoom to 12; higher display zooms enlarge the existing native tiles and do not create finer model data. The provider identifies 2025 satellite inputs, but supplies no separate immutable processing/version identifier. Do not call this a current sky measurement.
- The [source page](https://djlorenz.github.io/astronomy/lp/) permits use of the maps with the stated semantic distinction. Direct service availability remains best effort. Source metadata and image endpoints can change independently of Nightjar; errors keep location selection and the source link available. No contact message, provider account, key or agreement acceptance was needed or performed.
- A normal HTTPS response from `tiles2025/tile_4_7_5.png` returned a valid 1024 × 1024 PNG on 19 October. Its complete set of fifteen RGB colours matches the in-app expanded-zone swatches. The numeric ratio thresholds were checked against the provider’s published viewer; the text definitions explain the assumed 22.0 mag/arcsec² natural background. No map-image or raster-data copy is committed.
- A separate 2025 binary tile for the synthetic London coordinates returned HTTP 200, `application/gzip`, permissive CORS and 360001 decompressed bytes. This is research evidence only. Nightjar does not request/decode that binary product and shows no numeric reading for the map centre or selected site. A sampled value still needs independent pixel/index, boundary, interpolation and nodata validation before implementation.
- Coverage accepts latitude −65° inclusive to 75° exclusive, matching the provider’s numeric-domain edge, and both entered date-line spellings ±180°. Rendering normalizes +180° to −180° without modifying the saved site. Polar areas are shaded; a site outside coverage has an explicit text fallback and does not load the model. The selected-site dot is distinct from the displayed map centre.
- Both layers request only the current viewport: no tile buffer or prefetch feature, updates after idle/zoom completion, obsolete requests managed by Leaflet. Per-layer tracking forgets unloaded/aborted tiles and ignores their late events. Failed tiles load a labelled hatch placeholder while retaining their failed status; its successful image load cannot claim model data. Tile errors, prolonged loading and module startup failure have retry/close paths.
- [OpenStreetMap’s tile policy](https://operations.osmfoundation.org/policies/tiles/) requires visible attribution, a browser Referer, normal HTTP caching and no bulk/offline downloads. Nightjar uses the exact HTTPS host and normal browser image requests, does not override their cache/referrer policy, and does not proxy or pre-download tiles. The existing service worker ignores cross-origin map requests. Automated pan/zoom acceptance uses local synthetic fixtures rather than driving repeated provider downloads.
- Leaflet 1.9.4 and its types are pinned. The runtime is imported only after the user opens the map; no CDN script, provider analytics, geocoder or tracking code is copied. The bundled library’s BSD notice is served at `/licenses/leaflet.txt` and linked beside visible map attribution.


## Explicit map-centre site selection

The crosshair marks the map centre independently of the outlined selected-site dot. **Use map centre** snapshots the actual map centre into a valid coordinate-only place and uses the same planner navigation guard as other site selectors. The button is disabled while a view move is unsettled, and invalid coordinates cannot be chosen. It stays in My places and preserves the exact observing instant. The coordinate label rounds for readability; stored latitude/longitude retain full precision. Existing matching-site metadata follows the planner’s existing identity rules, while a genuinely new coordinate does not inherit a distant site’s rating/country. A weather response may later supply that point’s time zone.

Name/time Keep editing and explicit continuation passed compiled-browser checks. The input and focus are retained after Keep editing; changing the site explicitly keeps the selected UTC instant. Retained manual-coordinate drafts survive, including an incomplete southern latitude and unfinished longitude. A changed-coordinate selection collapses the optional map for the new site; selecting the same coordinates can leave the existing map open. Selection does not save a favourite place automatically. The user can rename or Save this place above, and the map does not infer any numeric sky-brightness or Bortle value from the picked colour.
