"""Build Nightjar's on-demand OpenNGC reference index from the pinned source."""
import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data' / 'opengc-complete.csv'
OUTPUT = ROOT / 'data' / 'opengc-reference-index.json'
SHA256 = '54abea0b57b0a103831bfc7a8e3a99a23acfbf4bb581fcf3d8af539cbb826c84'

def build():
    if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != SHA256:
        raise ValueError('OpenNGC source differs from the pinned revision')
    with SOURCE.open(encoding='utf-8', newline='') as source:
        rows = list(csv.DictReader(source, delimiter=';'))
    names = set()
    records = []
    for row in rows:
        name = row['Name']
        if not name or name in names:
            raise ValueError(f'Invalid or repeated source identifier: {name}')
        names.add(name)
        # Retain source strings, including blank coordinates and V magnitude.
        records.append([name, row['Type'], row['RA'], row['Dec'], row['Const'],
                        row['V-Mag'], row['Common names'], row['M'], row['NGC'], row['IC']])
    return records

if __name__ == '__main__':
    records = build()
    OUTPUT.write_text(json.dumps(records, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8')
    print(f'Wrote {len(records)} OpenNGC reference entries to {OUTPUT}')
