"""Check the complete pinned OpenNGC source before importing it into Nightjar.

The complete source contains historical and duplicate entries that must not be
presented as confirmed observable objects. This audit does not alter the app's
curated planning catalogue.
"""
import collections
import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data' / 'opengc-complete.csv'
SHA256 = '54abea0b57b0a103831bfc7a8e3a99a23acfbf4bb581fcf3d8af539cbb826c84'

def audit():
    if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != SHA256:
        raise ValueError('OpenNGC source differs from the documented revision')
    with SOURCE.open(encoding='utf-8', newline='') as source:
        rows = list(csv.DictReader(source, delimiter=';'))
    identifiers = [row['Name'] for row in rows]
    if len(identifiers) != len(set(identifiers)):
        raise ValueError('OpenNGC contains duplicate record identifiers')
    missing = [row['Name'] for row in rows if not row['RA'] or not row['Dec']]
    return {'records': len(rows), 'types': dict(sorted(collections.Counter(row['Type'] for row in rows).items())), 'without_coordinates': missing}

if __name__ == '__main__':
    print(json.dumps(audit(), indent=2))
