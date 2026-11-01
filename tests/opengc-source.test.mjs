import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
test('pinned OpenNGC snapshot retains all records and identifies unpositioned entries',()=>{
 const result=JSON.parse(execFileSync('python3',['scripts/audit-opengc.py'],{cwd:root,encoding:'utf8'}));
 assert.equal(result.records,13970);assert.equal(result.types.Dup,651);assert.equal(result.types.NonEx,10);
 assert.deepEqual(result.without_coordinates,['IC1064','IC1326','IC1642','IC2688','IC2915','IC3398','IC5112']);
});
test('reference index is reproducible and retains unpositioned and historical records',async()=>{
 const {readFile}=await import('node:fs/promises');
 const expected=JSON.parse(execFileSync('python3',['-c',"import json,runpy; print(json.dumps(runpy.run_path('scripts/build-opengc-index.py')['build'](), ensure_ascii=False))"],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024}));
 const actual=JSON.parse(await readFile(new URL('../data/opengc-reference-index.json',import.meta.url),'utf8'));
 assert.deepEqual(actual,expected);assert.equal(actual.length,13970);
 assert(actual.some(row=>row[0]==='IC1064'&&row[1]==='NonEx'&&!row[2]&&!row[3]));
 assert(actual.some(row=>row[1]==='Dup'));assert(actual.some(row=>row[0].includes('NED')));
});
