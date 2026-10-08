import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,mkdir,writeFile,readFile,access,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {stageCloudflareBuild} from '../scripts/stage-cloudflare-build.mjs';
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'nightjar-stage-test-')),build=join(root,'dist');
 async function put(name,text){const path=join(build,name);await mkdir(join(path,'..'),{recursive:true});await writeFile(path,text);return path}
 await put('server/wrangler.json',JSON.stringify({main:'index.js',assets:{directory:'../client'}}));await put('server/index.js','export default {};');await mkdir(join(build,'client'),{recursive:true});
 return {root,build,put,cleanup:()=>rm(root,{recursive:true,force:true})};
}
test('isolated packaging removes only identical unreferenced generated copies while leaving original output unchanged',async()=>{
 const f=await fixture();let stage;
 try{
  const original='client/_next/static/chunks/view-abcdefgh.js',copy='client/_next/static/chunks/view-abcdefgh 2.js';
  await f.put(original,'export const view=true;');await f.put(copy,'export const view=true;');
  await f.put('client/_next/static/css/index.abcdefgh.css','body{}');await f.put('client/_next/static/css/index.abcdefgh 10.css','body{}');
  await f.put('server/rsc/_next/static/view-abcdefgh.js','export const server=true;');await f.put('server/rsc/_next/static/view-abcdefgh 3.js','export const server=true;');
  await f.put('client/photo 2.jpg','reference photo');await f.put('client/_next/static/chunks/changed-abcdefgh.js','new');await f.put('client/_next/static/chunks/changed-abcdefgh 2.js','old');await f.put('client/_next/static/chunks/orphan-abcdefgh 2.js','orphan');
  stage=await stageCloudflareBuild(f.build,f.root);assert.equal(stage.removedCopies.length,3);assert(stage.root.startsWith(f.root));assert.notEqual(stage.root,f.build);
  await access(join(f.build,copy));await assert.rejects(access(join(stage.root,copy)));assert.equal(await readFile(join(stage.root,original),'utf8'),'export const view=true;');
  for(const name of ['client/photo 2.jpg','client/_next/static/chunks/changed-abcdefgh 2.js','client/_next/static/chunks/orphan-abcdefgh 2.js'])await access(join(stage.root,name));
  const config=JSON.parse(await readFile(stage.config,'utf8'));assert.equal(config.assets.directory,'../client');await stage.cleanup();await stage.cleanup();await assert.rejects(access(stage.root));await access(join(f.build,copy));
 }finally{await stage?.cleanup();await f.cleanup()}
});
test('generated copies referenced by code, manifests or encoded URLs remain in the isolated artifact',async()=>{
 const f=await fixture();let stage;
 try{
  for(const name of ['required-abcdefgh','encoded-abcdefgh','manifest-abcdefgh']){await f.put(`client/_next/static/chunks/${name}.js`,'export const required=true;');await f.put(`client/_next/static/chunks/${name} 2.js`,'export const required=true;')}
  await f.put('server/index.js',"import '../client/_next/static/chunks/required-abcdefgh 2.js'; const uri='encoded-abcdefgh%202.js'; export default {};");await f.put('client/manifest.json',JSON.stringify({file:'_next/static/chunks/manifest-abcdefgh 2.js'}));
  stage=await stageCloudflareBuild(f.build,f.root);assert.deepEqual(stage.removedCopies,[]);for(const name of ['required-abcdefgh','encoded-abcdefgh','manifest-abcdefgh'])await access(join(stage.root,`client/_next/static/chunks/${name} 2.js`));
 }finally{await stage?.cleanup();await f.cleanup()}
});
test('missing and escaped build configuration fails before creating a deployable snapshot',async()=>{
 const f=await fixture();
 try{
  await assert.rejects(stageCloudflareBuild(join(f.root,'missing'),f.root),/Run npm run build/);
  await f.put('server/wrangler.json',JSON.stringify({main:'index.js',assets:{directory:'../../other'}}));await assert.rejects(stageCloudflareBuild(f.build,f.root),/client assets/);
  await f.put('server/wrangler.json',JSON.stringify({main:join(f.build,'server/index.js'),assets:{directory:'../client'}}));await assert.rejects(stageCloudflareBuild(f.build,f.root),/relative paths/);
  await f.put('server/wrangler.json',JSON.stringify({main:'index.js',assets:{directory:join(f.build,'client')}}));await assert.rejects(stageCloudflareBuild(f.build,f.root),/relative paths/);
  await f.put('server/wrangler.json',JSON.stringify({main:'../outside.js',assets:{directory:'../client'}}));await assert.rejects(stageCloudflareBuild(f.build,f.root),/entry must be inside/);
  await f.put('server/wrangler.json',JSON.stringify({main:'missing.js',assets:{directory:'../client'}}));await assert.rejects(stageCloudflareBuild(f.build,f.root),/entry is unavailable/);
  await f.put('server/wrangler.json',JSON.stringify({main:'index.js',assets:{directory:'../client'}}));await symlink(join(f.build,'server/index.js'),join(f.build,'client/link.js'));await assert.rejects(stageCloudflareBuild(f.build,f.root),/symbolic link/);
 }finally{await f.cleanup()}
});
test('packaging-check entry rejects configuration and publish overrides before invoking Wrangler',()=>{
 for(const args of [['check','--dry-run=false'],['check','--no-dry-run'],['check','--env','production'],['check','--outdir'],['check','--config','other.json'],['deploy','--config=other.json'],['unknown']]){
  const result=spawnSync(process.execPath,['scripts/run-cloudflare.mjs',...args],{cwd:new URL('../',import.meta.url),encoding:'utf8'});assert.notEqual(result.status,0);assert(!result.stdout.includes('Prepared isolated'));
 }
});
