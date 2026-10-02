# Nightjar observatory visual refresh

## Visual direction

Generated desktop and mobile concepts are retained in this folder as design references. The implementation uses code-native graphics and existing astronomy data rather than a raster mockup.

- Palette: charcoal #0b1115; panel #101b21; raised surface #16232b; border #2d3d46; sage #c1df93; white #e9eeef.
- Typography: native system sans; semibold headings; tabular numbers; 40px desktop / 31px mobile page titles; 11px section labels; 14px body text.
- Spacing: 16px desktop panel gaps, 14px mobile gaps, 22px desktop / 18px mobile panel padding.
- Geometry: 8px panels, 6px controls, thin gauge strokes and SVG guide lines.
- Components: compact brand/navigation header, location/display utilities, single desktop time toolbar, forecast overview, enlarged polar atlas, metric band, forecast cards, shared secondary-view surfaces.
- Copy: preserve scientific explanations and functional labels; remove decorative header taglines and page eyebrow.

## Intentional deviations from generated images

1. Use calculated positions from the existing bright-star catalogue, rather than the concept's decorative star field. Ring labels are 30° and 60°, matching the actual projection.
2. Forecast scores, moon phases, times and weather are live values. The concept's sample values and seeing/transparency predictions are not implemented.
3. Keep the hourly interactive forecast and its actual fields rather than the concept's invented table.
4. Keep all seven forecast nights and full explanations; use two columns on phones and one at 320px so offset-aware windows remain legible.
5. Keep the accessible native datetime control, existing chart keyboard support, PWA controls and modal mobile Explore navigation.
6. Red-light control sits beside location so its status and error messages have a stable place across desktop and mobile.

## Verification and fidelity ledger

Desktop inspected at 1440×1100 and the desktop concept’s native 1210×1300 viewport. Mobile inspected at 390×844 (the portrait concept scaled to phone width) and 320×812. Browser scrollbars reduce content width by 15px where present. Concepts and final screenshots were opened with the image viewer before sign-off.

| Reference anchor | Implemented and visually checked | Intentional difference |
| --- | --- | --- |
| Compact horizontal header | 68px desktop header; wordmark, seven tabs, bordered install action | Red-light control sits beside location; icons retained in the wordmark |
| Strong title hierarchy | Semibold native sans; compact heading/subtitle spacing | Native fonts avoid a third-party font dependency |
| Contained time toolbar | Outlined surface, segmented zone controls, sage Now action | Native date/time editor; stacked Now action below 360px |
| Two-panel observing overview | Equal desktop columns, consistent 16px gap, restrained backgrounds | Best available forecast hour replaces invented best-window details |
| Polar sky graphic | Larger 400px SVG stage, compass ticks, labelled altitude rings, planet halos and adaptive label placement | Only catalogue objects and calculated positions are drawn |
| Sage planning gauges | Large summary gauge and compact nightly progress rings | Values follow the actual forecast, including low scores |
| Weather metric band | Four desktop columns, two phone columns; tabular values and thin icons | Keep the explanatory subtitles |
| Forecast card rhythm | Four desktop columns, two phone columns, divided calendar action | All seven cards remain visible in the flow; one column below 360px |
| Mobile navigation | Two-row header tabs and fixed sage Explore control | Existing accessible modal menu and focus restoration are preserved |

## Verification

- Production build, TypeScript, ESLint and whitespace checks passed.
- All 16 automated regression tests passed, including three new chart-label tests for dense clusters, drawing boundaries and selected-target visibility.
- All seven fully rendered sections checked at 320px: document scroll width equals client width (305px with scrollbar); data scrollers remain contained.
- Forecast card selection updates observing time and pressed state.
- Keyboard selection of Vega highlights the chart target. Further inspection confirmed Mizar remains labelled when ordinary labels are disabled, and crowded labels reposition without moving stars.
- Mobile Explore navigation preserves site/time and focuses the page heading after selection.
- Final browser error/warning log was empty.
- Existing build warning for the lazy Moon/Three.js chunk over 500KB remains; this refresh adds no graphics library or remote font dependency.
- Temporary QA tab and viewport override were cleaned up. User’s existing tab was preserved.

Final review images: [desktop](desktop-result.png), [mobile](mobile-result.png), [desktop atlas](desktop-atlas-result.png), [mobile atlas](mobile-atlas-result.png). Generated references: [desktop concept](desktop-concept.png), [mobile concept](mobile-concept.png).

This is a functional adaptation of the generated direction, not a pixel-for-pixel copy of its invented scientific content. No visual blockers remain in the inspected viewports. Changes remain local for the next GitHub batch.
