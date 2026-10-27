# Deep-sky catalogue data

`messier.json` is adapted from OpenNGC by Mattia Verga and contributors, downloaded 2026-10-05 from:
- https://github.com/mattiaverga/OpenNGC/blob/master/database_files/NGC.csv
- https://github.com/mattiaverga/OpenNGC/blob/master/database_files/addendum.csv

Source and adapted data are licensed under [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/). This applies to the catalogue data, not automatically to the application code. Changes: selected non-duplicate Messier records; renamed fields; converted J2000 sexagesimal coordinates to decimal hours/degrees; expanded type codes; retained V-band magnitudes, angular dimensions in arcminutes and listed major-axis position angles in degrees east of north; omitted other fields. Missing values are null. 109 objects: M102 is absent from the source cross-references and is deliberately not assigned an identity.

## Curated NGC/IC expansion

`additional-deep-sky.json` adds 200 non-Messier objects, bringing the planning catalogue to 309. The original 109 Messier records and their IDs are unchanged. The expansion selects northern and southern galaxies, clusters, nebulae and remnants; it is a curated subset, not the full NGC/IC catalogue. Camera discovery remains on the original Messier selection.

Source: [OpenNGC NGC.csv at revision be3cd6c5498806a2fbb2f7e0452ef802dbb02be0](https://github.com/mattiaverga/OpenNGC/blob/be3cd6c5498806a2fbb2f7e0452ef802dbb02be0/database_files/NGC.csv), retrieved 27 October 2026. CSV SHA-256: `54abea0b57b0a103831bfc7a8e3a99a23acfbf4bb581fcf3d8af539cbb826c84`.

Attribution: OpenNGC by Mattia Verga and contributors. Adapted data remain under CC BY-SA 4.0; a [local copy of the licence](./LICENSE-CC-BY-SA-4.0.txt) is included. Changes: selected 200 rows with no Messier cross-reference or duplicate type, retained source common names, expanded type codes, converted J2000 sexagesimal positions to decimal hours/degrees and renamed fields. V-band magnitudes, major/minor dimensions (arcminutes) and position angles (degrees east of north) are retained from this pinned source; absent values remain null. Magnitude values are source estimates, not a guarantee of visual visibility or surface brightness.

Regenerate with `python3 scripts/import-deep-sky-expansion.py /path/to/OpenNGC/database_files/NGC.csv`. The importer checks the pinned CSV hash, rejects duplicate/Messier records and writes the record file plus the lightweight `additional-deep-sky-ids.json` validation list. When changing the curated selection, also update the offline page's supported-ID set; the offline regression verifies that every expansion ID is retained in saved lists and diary records.
