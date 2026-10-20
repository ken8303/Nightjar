import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {readSkyShortcutHash,skyShortcutSections,previousShortcutURL}=await vite.ssrLoadModule('/lib/sky-shortcuts.ts');
test('known sky shortcuts reopen their exact named sections including encoded fragments',()=>{
 for(const [id,label] of skyShortcutSections){assert.deepEqual(readSkyShortcutHash('#'+id),{id,label});assert.deepEqual(readSkyShortcutHash('#'+id.replace('-','%2D')),{id,label})}
});
test('guarded links restore only a prior fragment from the exact same page',()=>{
 assert.equal(previousShortcutURL('https://example.test/#sky-chart','https://example.test/#observing-diary'),'/#sky-chart');
 assert.equal(previousShortcutURL('https://example.test/','https://example.test/#observing-diary'),'/');
 assert.equal(previousShortcutURL('https://example.test/?visit=1#old','https://example.test/?visit=1#sky-chart'),'/?visit=1#old');
 for(const previous of [null,{},'bad URL','https://other.test/#sky-chart','https://example.test/other#sky-chart','https://example.test/?visit=2#sky-chart'])assert.equal(previousShortcutURL(previous,'https://example.test/#observing-diary'),null);
 assert.equal(previousShortcutURL('https://example.test/','invalid'),null);
});
test('installed-app shortcuts stay in scope, target supported sections and reference real matching icons',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
 assert.equal(manifest.id,'/');assert.equal(manifest.start_url,'/');assert.equal(manifest.scope,'/');assert.equal(manifest.display,'standalone');
 assert.equal(manifest.shortcuts.length,4);assert.equal(new Set(manifest.shortcuts.map(item=>item.name)).size,4);
 const sections=[];
 for(const item of manifest.shortcuts){
  assert(typeof item.name==='string'&&item.name.trim()&&item.name.length<=100);assert(typeof item.short_name==='string'&&item.short_name.trim()&&item.short_name.length<=24);assert(typeof item.description==='string'&&item.description.trim());
  const url=new URL(item.url,'https://example.test/manifest.webmanifest');
  assert.equal(url.origin,'https://example.test');assert.equal(url.pathname,'/');assert.equal(url.search,'');
  const section=readSkyShortcutHash(url.hash);assert(section);sections.push(section.id);
  assert(item.icons.length>0);
  for(const icon of item.icons){
   assert(manifest.icons.some(existing=>existing.src===icon.src&&existing.sizes===icon.sizes&&existing.type===icon.type));
   const bytes=await readFile(new URL('../public'+icon.src,import.meta.url));assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(icon.sizes,`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`);
  }
 }
 assert.deepEqual(sections.sort(),skyShortcutSections.map(([id])=>id).sort());
});
test('unknown, oversized and malformed fragments do not redirect planner startup',()=>{
 for(const hash of [null,undefined,{},'', 'visibility-planner','#','#places','#visibility-planner?next=sky','#%E0%A4','#'+ 'a'.repeat(256)])assert.equal(readSkyShortcutHash(hash),null);
});
