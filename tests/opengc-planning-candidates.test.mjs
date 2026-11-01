import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=async path=>JSON.parse(await readFile(new URL(`../data/${path}`,import.meta.url),'utf8'));
test('prepared OpenNGC candidates reproduce the pinned source without changing existing IDs',async()=>{
 const generated=JSON.parse(execFileSync('python3',['-c',"import json,runpy; print(json.dumps(runpy.run_path('scripts/build-opengc-planning.py')['build'](), ensure_ascii=False))"],{cwd:root,encoding:'utf8',maxBuffer:12*1024*1024}));
 const candidates=await read('opengc-planning-candidates.json'),existing=[...await read('messier.json'),...await read('additional-deep-sky.json')];
 assert.deepEqual(candidates,generated);assert.equal(candidates.length,12842);assert.deepEqual(await read('opengc-planning-ids.json'),candidates.map(target=>target.id));
 const ids=[...existing,...candidates].map(target=>target.id);assert.equal(new Set(ids).size,ids.length);
 assert(!candidates.some(target=>target.id==='NGC224'||target.id==='NGC7000'));
 const first=candidates.find(target=>target.id==='NGC1');assert.equal(first.catalogue,'NGC0001');assert.equal(first.type,'Galaxy');assert(Math.abs(first.ra-(7/60+15.84/3600))<1e-12);
 const rounded=candidates.find(target=>target.id==='IC3322A');assert(Math.abs(rounded.dec-(7+13/60))<1e-12);
 for(const target of candidates){assert(target.ra>=0&&target.ra<24);assert(Math.abs(target.dec)<=90);assert(target.positionAngle===null||target.positionAngle>=0&&target.positionAngle<360)}
});
