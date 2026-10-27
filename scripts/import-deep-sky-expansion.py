"""Regenerate the curated extension from OpenNGC's NGC.csv (see data/README.md)."""
import csv
import hashlib
import json
from pathlib import Path
import sys

NGC = [104, 253, 281, 457, 663, 869, 884, 1499, 2024, 2237, 2264, 2516,
       2808, 3132, 3372, 3532, 3766, 4755, 5139, 6397, 6543, 6633, 6752,
       6888, 6960, 6992, 7000, 7293,
       55, 247, 300, 404, 752, 891, 1023, 1365, 1535, 1851, 2392, 2403,
       2683, 2903, 3115, 3242, 3628, 4565, 4631, 5128, 5907, 6826,
       6946, 7331, 7662,
       129, 147, 185, 246, 288, 362, 654, 7789, 1232, 1501, 1514, 1931,
       2174, 2359, 2362, 2419, 2420, 2440, 2477, 2841, 3521, 3603,
       4038, 4039, 4449, 4490, 6302, 6818, 7023, 7635]
IDS = [f'NGC{number:04d}' for number in NGC] + ['IC1396', 'IC1805']
TYPES = {'G': 'Galaxy', 'GCl': 'Globular cluster', 'OCl': 'Open cluster',
         'HII': 'H II region', 'Neb': 'Nebula', 'PN': 'Planetary nebula',
         'SNR': 'Supernova remnant', 'Cl+N': 'Cluster with nebulosity'}

def angle(value, hours=False):
    parts = value.lstrip('+-').split(':')
    result = float(parts[0]) + float(parts[1])/60 + float(parts[2])/3600
    return -result if value.startswith('-') and not hours else result

source_path = Path(sys.argv[1])
if hashlib.sha256(source_path.read_bytes()).hexdigest() != '54abea0b57b0a103831bfc7a8e3a99a23acfbf4bb581fcf3d8af539cbb826c84':
    raise ValueError('Use the pinned OpenNGC revision documented in data/README.md')
with source_path.open(encoding='utf-8') as source:
    rows = {row['Name']: row for row in csv.DictReader(source, delimiter=';')}
records = []
for identifier in IDS:
    row = rows[identifier]
    if row['M'] or row['Type'] not in TYPES:
        raise ValueError(f'{identifier} is a duplicate, Messier cross-reference or unsupported type')
    prefix = 'NGC' if identifier.startswith('NGC') else 'IC'
    record = dict(id=prefix+str(int(identifier[len(prefix):])), catalogue=identifier,
                  name=row['Common names'], type=TYPES[row['Type']], constellation=row['Const'],
                  ra=angle(row['RA'], True), dec=angle(row['Dec']))
    for field, column in [('magnitude','V-Mag'), ('major','MajAx'), ('minor','MinAx'), ('positionAngle','PosAng')]:
        record[field] = float(row[column]) if row[column] else None
    records.append(record)
output = Path(__file__).resolve().parents[1] / 'data' / 'additional-deep-sky.json'
output.write_text(json.dumps(records, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
output.with_name('additional-deep-sky-ids.json').write_text(json.dumps([record['id'] for record in records])+'\n', encoding='utf-8')
print(f'Wrote {len(records)} non-Messier, non-duplicate OpenNGC records to {output}')
