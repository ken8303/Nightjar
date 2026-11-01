"""Prepare physical OpenNGC entries with stable IDs, without changing the live planner."""
import csv
import hashlib
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data' / 'opengc-complete.csv'
OUTPUT = ROOT / 'data' / 'opengc-planning-candidates.json'
SHA256 = '54abea0b57b0a103831bfc7a8e3a99a23acfbf4bb581fcf3d8af539cbb826c84'
TYPES = {'G':'Galaxy','GCl':'Globular cluster','OCl':'Open cluster','HII':'H II region',
         'Neb':'Nebula','PN':'Planetary nebula','SNR':'Supernova remnant',
         'Cl+N':'Cluster with nebulosity','RfN':'Reflection nebula','EmN':'Emission nebula',
         'GPair':'Galaxy pair','GTrpl':'Galaxy triplet','GGroup':'Galaxy group',
         '*':'Star','**':'Double star','*Ass':'Star association','Nova':'Nova','Other':'Other'}

def canonical(value):
    match = re.fullmatch(r'(NGC|IC)(\d+)(.*)', value.strip(), re.I)
    if not match:
        return value.strip().upper()
    return match[1].upper() + str(int(match[2])) + match[3].upper()

def coordinate(value, is_ra):
    match = re.fullmatch(r'(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)' if is_ra else r'([+-])(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)', value)
    if not match:
        raise ValueError(f'Invalid source coordinate: {value}')
    shift = 0 if is_ra else 1
    major, minute, second = int(match[1+shift]), int(match[2+shift]), float(match[3+shift])
    if minute >= 60 or second > 60 or (is_ra and major >= 24) or (not is_ra and major > 90):
        raise ValueError(f'Invalid source coordinate: {value}')
    result = major + minute/60 + second/3600
    if not is_ra and result > 90:
        raise ValueError(f'Invalid source coordinate: {value}')
    if is_ra and result == 24:
        result = 0
    return -result if not is_ra and match[1] == '-' else result

def number(value):
    if not value:
        return None
    result = float(value)
    if not math.isfinite(result):
        raise ValueError('Non-finite source value')
    return result

def build():
    if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != SHA256:
        raise ValueError('OpenNGC source differs from the pinned revision')
    existing = json.loads((ROOT/'data'/'messier.json').read_text()) + json.loads((ROOT/'data'/'additional-deep-sky.json').read_text())
    aliases = {}
    for target in existing:
        for alias in [target['id'], target['catalogue'], *target.get('crossReferences', [])]:
            key = canonical(alias)
            if key in aliases and aliases[key] != target['id']:
                raise ValueError(f'Ambiguous existing alias: {alias}')
            aliases[key] = target['id']
    with SOURCE.open(encoding='utf-8', newline='') as source:
        rows = list(csv.DictReader(source, delimiter=';'))
    result, seen = [], set(target['id'] for target in existing)
    for row in rows:
        if row['Type'] in ('Dup', 'NonEx'):
            continue
        source_id = canonical(row['Name'])
        if source_id in aliases:
            continue
        if row['Type'] not in TYPES or source_id in seen:
            raise ValueError(f'Unsupported or repeated source entry: {row["Name"]}')
        seen.add(source_id)
        refs = []
        for prefix in ('M', 'NGC', 'IC'):
            for item in row[prefix].split(','):
                item = item.strip()
                if not item:
                    continue
                reference = canonical(prefix+item)
                if reference != source_id and reference not in refs:
                    refs.append(reference)
        angle = number(row['PosAng'])
        entry = {'id':source_id,'catalogue':row['Name'],'name':row['Common names'],
                 'type':TYPES[row['Type']],'constellation':row['Const'],
                 'ra':coordinate(row['RA'],True),'dec':coordinate(row['Dec'],False),
                 'magnitude':number(row['V-Mag']),'major':number(row['MajAx']),
                 'minor':number(row['MinAx']),'positionAngle':angle if angle is not None and 0<=angle<360 else None}
        if refs:
            entry['crossReferences'] = refs
        result.append(entry)
    return result

if __name__ == '__main__':
    result = build()
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':'))+'\n',encoding='utf-8')
    OUTPUT.with_name('opengc-planning-ids.json').write_text(json.dumps([entry['id'] for entry in result], ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8')
    print(f'Prepared {len(result)} non-historical OpenNGC candidates in {OUTPUT}')
