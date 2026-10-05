# Messier catalogue data

`messier.json` is adapted from OpenNGC by Mattia Verga and contributors, downloaded 2026-10-05 from:
- https://github.com/mattiaverga/OpenNGC/blob/master/database_files/NGC.csv
- https://github.com/mattiaverga/OpenNGC/blob/master/database_files/addendum.csv

Source and adapted data are licensed under [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/). This applies to the catalogue data, not automatically to the application code. Changes: selected non-duplicate Messier records; renamed fields; converted J2000 sexagesimal coordinates to decimal hours/degrees; expanded type codes; retained V-band magnitudes and angular dimensions in arcminutes; omitted other fields. Missing values are null. 109 objects: M102 is absent from the source cross-references and is deliberately not assigned an identity.
