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
       4038, 4039, 4449, 4490, 6302, 6818, 7023, 7635,
       1360, 1850, 2070, 2298, 2438, 2451, 2506, 2547, 3918, 4372,
       4833, 6025, 6067, 6087, 6188, 6210, 6231, 6357, 6388, 6441,
       6520, 6723, 6744, 6811, 6934, 7009, 7380, 7793, 6369, 7027,
       772, 1097, 1300, 1313, 1316, 1566, 1672, 2281, 2354, 2371,
       2997, 3199, 3293, 3324, 3576, 3621, 4147, 4236, 4361, 4945,
       5189, 5466, 5986, 6207, 6229, 6362, 6541, 6781, 6905, 7129,
       40, 292, 1275, 1317, 1977, 1980, 1981, 2301, 2360, 2537,
       2685, 2736, 3928, 4194, 4435, 4438, 4567, 4568, 4609, 4651,
       6309, 6537, 6741, 6819, 6822,
       134, 488, 936, 1808, 2022, 2539, 2655, 2976, 3079, 3184, 3718,
       4214, 4244,
       4559, 4725, 5248, 5315, 7006, 7217, 7479, 1549, 1947, 2100,
       5927, 6167, 6326, 6802, 278, 925, 1055, 3486, 5005, 5033,
       7048, 6569, 6251, 2186, 2383, 2395, 2482, 2587, 2613, 2708,
       2784, 2835, 3109, 3384, 3504, 3640, 3686, 3773, 3783, 3955,
       4203, 4459, 4535, 4636, 4697, 4762, 5053, 5694, 5634, 6058,
       6101, 6139, 6144, 6284, 6304, 6316, 6401, 6426, 6522, 6535]
IDS = [f'NGC{number:04d}' for number in NGC] + ['IC1396', 'IC1805', 'IC0405', 'IC2391', 'IC2574', 'IC2602', 'IC5146', 'IC0348', 'IC0443', 'IC2944', 'IC4604',
        'IC5070', 'IC1613', 'IC0342', 'IC4182', 'IC4665', 'IC4756', 'IC4662', 'IC5152']
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
