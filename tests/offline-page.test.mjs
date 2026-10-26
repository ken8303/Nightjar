import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {makePlannerRecovery} from '../public/planner-recovery.mjs';
const html=readFileSync(new URL('../public/offline.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
class Element{
 children=[];hidden=true;dataset={};listeners=new Map();text='';
 append(child){this.children.push(child)}
 set textContent(value){this.text=String(value)}
 get textContent(){return this.text+this.children.map(child=>child.textContent).join('')}
 set innerHTML(_value){throw Error('Offline saved text must never use innerHTML')}
 addEventListener(name,callback){this.listeners.set(name,callback)}
 click(){this.clicked=true}
 focus(){this.focused=true}
 remove(){this.removed=true}
}
function load(data={},blocked=false,{rawOverrides={},sessionBlocked=false,sessionWriteBlocked=false,sessionOverrides={},importFailed=false,recoveryLoader=null}={}){
 const elements=new Map([...html.matchAll(/id="([^"]+)"/g)].map(match=>[match[1],new Element()]));
 const raw=new Map(Object.entries(data).map(([key,value])=>[key,key==='nightjar-red-light'?value:JSON.stringify(value)]));
 for(const [key,value] of Object.entries(rawOverrides))raw.set(key,value);
 const session=new Map(Object.entries(sessionOverrides)),listeners=new Map(),visibilityListeners=new Map(),navigator={onLine:false},root=new Element(),body=new Element(),blobs=[],timers=[],revoked=[],reads=[],parseSizes=[];
 const context={document:{hidden:false,addEventListener:(name,callback)=>visibilityListeners.set(name,callback),documentElement:root,body,getElementById:id=>{assert(elements.has(id));return elements.get(id)},createElement:()=>new Element()},localStorage:{getItem:key=>{reads.push(key);if(blocked)throw Error('Storage denied');return raw.get(key)??null}},sessionStorage:{getItem:key=>{if(sessionBlocked)throw Error('Session denied');return session.get(key)??null},setItem:(key,value)=>{if(sessionWriteBlocked)throw Error('Session writes denied');session.set(key,value)},removeItem:key=>{if(sessionWriteBlocked)throw Error('Session writes denied');session.delete(key)}},navigator,window:{addEventListener:(name,callback)=>listeners.set(name,callback)},Error,Blob,URL:{createObjectURL:blob=>{blobs.push(blob);return 'blob:qa-recovery'},revokeObjectURL:url=>revoked.push(url)},setTimeout:(callback,delay)=>timers.push({callback,delay}),JSON:{parse:value=>{parseSizes.push(value.length);return JSON.parse(value)},stringify:JSON.stringify},loadRecovery:async()=>{if(importFailed)throw Error('Module unavailable');return recoveryLoader?recoveryLoader():{makePlannerRecovery}}};
 // vm scripts cannot load browser URL modules. Supply the real shipped module
 // through a loader while exercising the actual offline click handler.
 for(const script of scripts)vm.runInNewContext(script.replace("import('/planner-recovery.mjs')",'loadRecovery()'),context);
 return {allowSessionWrites:()=>{sessionWriteBlocked=false},storage:context.localStorage,document:context.document,elements,raw,session,listeners,visibilityListeners,navigator,root,body,blobs,timers,revoked,reads,parseSizes};
}
test('offline notes retain 2,000 characters, newlines and text markup without interpreting HTML',()=>{
 const note='<img src=x onerror=alert(1)>\n'+ 'x'.repeat(1971);
 const page=load({'nightjar-targets-v1':['Vega','Vega',null],'nightjar-target-notes-v1':{Vega:note,Saturn:'Retained after removing favourite\nSecond line'}});
 assert.equal(page.elements.get('targets').children.length,1);
 assert.equal(page.elements.get('targets').children[0].children[1].textContent,note.slice(0,2000));
 assert(page.elements.get('other-notes').textContent.includes('Second line'));assert.equal(page.elements.get('other-notes-card').hidden,false);
 assert.equal(page.session.size,0,'displaying saved plans must not create a recovery token');
});
test('invalid numeric fields are skipped, and valid collections extend past the old 30-item cap',()=>{
 const places=Array.from({length:40},(_,i)=>({name:'Site '+i,latitude:i,longitude:0,bortle:2})),equipment=Array.from({length:40},(_,i)=>({name:'Camera '+i,focal:400,width:36,height:24,pixel:3.76}));
 places.unshift({name:'Bad null coordinate',latitude:null,longitude:0});equipment.unshift({name:'Bad string focal',focal:'400',width:36,height:24,pixel:3.76});
 const page=load({'nightjar-places':places,'nightjar-equipment':equipment});
 assert.equal(page.elements.get('places').children.length,40);assert.equal(page.elements.get('equipment').children.length,40);assert(page.elements.get('equipment').textContent.includes('3.76 µm'));
});
test('retry preserves the selected instant and reconnect only updates the status',()=>{
 const date='2026-10-25T01:30:00.000Z',page=load({'nightjar-observing-time':date,'nightjar-place':{name:'London',latitude:51,longitude:0,timezone:'Europe/London'},'nightjar-red-light':'on'});
 assert(page.elements.get('session').textContent.includes('2026-10-25 01:30'));assert.equal(page.root.dataset.redLight,'on');
 assert(page.elements.get('connection').textContent.includes('You are offline'));
 page.navigator.onLine=true;page.listeners.get('online')();assert(page.elements.get('connection').textContent.includes('may be available'));assert.equal(page.session.size,0);
 page.elements.get('retry').listeners.get('click')();assert.equal(page.session.get('nightjar-recovery-time-v1'),JSON.stringify(date));
});
test('offline time labels disclose missing or invalid site zones without changing the UTC snapshot',()=>{
 const time='2026-10-25T00:30:59.987Z';
 for(const timezone of [undefined,'Invalid/Zone']){
  const place={name:'Unknown zone site',latitude:51.5,longitude:0,...(timezone===undefined?{}:{timezone})};
  const page=load({'nightjar-observing-time':time,'nightjar-place':place}),before=structuredClone(page.raw),text=page.elements.get('session').textContent;
  assert(text.includes('UTC · site time zone unavailable'));assert(text.includes('00:30:59.987 GMT'));assert(text.includes('2026-10-25 00:30:59.987 UTC'));
  page.elements.get('retry').listeners.get('click')();assert.equal(JSON.parse(page.session.get('nightjar-recovery-time-v1')),time);assert.deepEqual(page.raw,before);
 }
});
test('offline time labels identify genuine saved zones and use the current window context first',()=>{
 const time='2026-10-25T00:30:59.987Z',site={name:'Saved zone site',latitude:51.5,longitude:0};
 for(const [timezone,clock] of [['UTC','00:30:59.987 GMT'],['Europe/London','01:30:59.987 GMT+1']]){
  const page=load({'nightjar-observing-time':time,'nightjar-place':{...site,timezone}}),text=page.elements.get('session').textContent;
  assert(text.includes(`${timezone} · time at saved site`));assert(text.includes(clock));assert(!text.includes('site time zone unavailable'));
 }
 const own={...site,name:'Own UTC window',timezone:'UTC'},shared={...site,name:'Other London window',timezone:'Europe/London'};
 const paired=load({'nightjar-observing-time':time,'nightjar-place':shared},false,{sessionOverrides:{'nightjar-current-context-v1':JSON.stringify({version:1,time,place:own})}}),text=paired.elements.get('session').textContent;
 assert(text.includes('Own UTC window'));assert(text.includes('UTC · time at saved site'));assert(!text.includes('Europe/London'));assert(text.includes('00:30:59.987 GMT'));
});
test('unavailable storage leaves a warning and usable retry control',()=>{
 const page=load({},true);assert.equal(page.elements.get('storage-warning').hidden,false);assert.equal(page.elements.get('targets-empty').hidden,false);assert.doesNotThrow(()=>page.elements.get('retry').listeners.get('click')());
 const invalid=load({'nightjar-observing-time':'bad date'});invalid.elements.get('retry').listeners.get('click')();assert.equal(invalid.session.size,0);
});

test('offline deep-sky lists show only distinct catalogue identifiers without making position claims',()=>{
 const page=load({'nightjar-deep-targets-v1':['M31','M45','M31','M102','<script>','M110']});
 assert.equal(page.elements.get('deep-targets').children.length,3);assert(page.elements.get('deep-targets').textContent.includes('M45'));assert(!page.elements.get('deep-targets').textContent.includes('<script>'));assert(page.elements.get('deep-targets').textContent.includes('Reconnect for object details and positions.'));assert.equal(page.elements.get('deep-targets-empty').hidden,true);
});

test('offline diary renders snapshot notes as text and skips malformed observations',()=>{
 const entry={target:'M31',observedAt:'2026-10-05T20:00:00.000Z',place:{name:'London',latitude:51.5,longitude:0},outcome:'seen',equipment:'Binoculars',notes:'Line one\n<img src=x>'};
 const page=load({'nightjar-observing-diary-v1':[entry,{...entry,target:'M102'},{...entry,observedAt:'bad'},{...entry,place:{name:'bad',latitude:null,longitude:0}}]});
 assert.equal(page.elements.get('diary').children.length,1);assert(page.elements.get('diary').textContent.includes('2026-10-05 20:00 UTC'));assert(page.elements.get('diary').textContent.includes('Line one\n<img src=x>'));assert.equal(page.elements.get('diary-empty').hidden,true);
});

test('offline saved-target listing retains all 42 identities including the three added planets',()=>{
 const targets=[...Array.from({length:39},(_,i)=>`Existing ${i}`),'Mercury','Uranus','Neptune'],page=load({'nightjar-targets-v1':targets});
 assert.equal(page.elements.get('targets').children.length,42);
 for(const name of ['Mercury','Uranus','Neptune'])assert(page.elements.get('targets').textContent.includes(name));
});
test('offline timestamps retain sub-minute precision and reject normalized or unsupported recovery dates without rewriting storage',()=>{
 const precise='2026-10-25T01:30:59.987Z',entry={target:'M31',observedAt:precise,place:{name:'London',latitude:51.5,longitude:0},outcome:'seen',equipment:'',notes:'Exact timestamp'};
 const page=load({'nightjar-observing-time':precise,'nightjar-place':{...entry.place,timezone:'Europe/London'},'nightjar-observing-diary-v1':[entry,{...entry,observedAt:'2026-02-30T01:00:00.000Z'}]});
 assert(page.elements.get('session').textContent.includes('2026-10-25 01:30:59.987 UTC'));assert(page.elements.get('session').textContent.includes('01:30:59.987 GMT'));assert(page.elements.get('diary').textContent.includes('2026-10-25 01:30:59.987 UTC'));assert.equal(page.elements.get('diary').children.length,1);
 page.elements.get('retry').listeners.get('click')();assert.equal(page.session.get('nightjar-recovery-time-v1'),JSON.stringify(precise));
 for(const time of ['2026-02-30T01:00:00.000Z','0000-01-01T00:00:00.000Z','2026-10-25T24:00:00.000Z','2026-10-25T01:30:00Z']){const invalid=load({'nightjar-observing-time':time});assert.equal(invalid.elements.get('session').children.length,0);assert.equal(invalid.elements.get('storage-warning').hidden,false);invalid.elements.get('retry').listeners.get('click')();assert.equal(invalid.session.size,0)}
});
test('oversized saved values are not parsed and bounded legacy target arrays do not block other offline plans',()=>{
 const oversized='x'.repeat(5*1024*1024+1),page=load({'nightjar-places':[{name:'Kept site',latitude:51,longitude:0}],'nightjar-targets-v1':Array.from({length:500},(_,i)=>i<200?null:'Vega')},false,{rawOverrides:{'nightjar-target-notes-v1':oversized}});
 assert.equal(page.elements.get('storage-warning').hidden,false);assert(page.elements.get('places').textContent.includes('Kept site'));assert(!page.elements.get('targets').textContent.includes('Vega'));assert(page.parseSizes.every(size=>size<=5*1024*1024));assert.equal(page.raw.get('nightjar-target-notes-v1'),oversized);
});
test('offline recovery click preserves exact stored text, excludes unrelated keys and releases the download URL',async()=>{
 const page=load({},false,{rawOverrides:{'nightjar-target-notes-v1':'{broken\n星空','nightjar-diary-drafts-v1':'pending forms','unrelated-secret':'excluded'}}),before=structuredClone(page.raw);
 page.reads.length=0;const pending=page.elements.get('download-recovery').listeners.get('click')();await page.elements.get('download-recovery').listeners.get('click')();await pending;
 assert.equal(page.blobs.length,1);const copy=JSON.parse(await page.blobs[0].text());assert.equal(copy.format,'nightjar-raw-recovery');assert.equal(copy.stores.local['nightjar-target-notes-v1'],'{broken\n星空');assert.equal(copy.stores.local['nightjar-diary-drafts-v1'],'pending forms');assert(!page.reads.includes('unrelated-secret'));assert.deepEqual(page.raw,before);assert.equal(page.session.size,0);
 assert(page.elements.get('recovery-status').textContent.includes('cannot be imported'));assert.equal(page.elements.get('download-recovery').disabled,false);assert(page.body.children[0].clicked);assert(page.body.children[0].removed);assert(page.body.children[0].download.startsWith('nightjar-raw-recovery-'));assert.equal(page.timers[0].delay,60000);page.timers[0].callback();assert.deepEqual(page.revoked,['blob:qa-recovery']);
});
test('offline recovery reports partial access and unavailable module/storage without empty-success claims',async()=>{
 const partial=load({'nightjar-targets-v1':['Vega']},false,{sessionBlocked:true});await partial.elements.get('download-recovery').listeners.get('click')();assert(partial.elements.get('recovery-status').textContent.includes('4 unreadable'));assert.equal(JSON.parse(await partial.blobs[0].text()).unreadable.length,4);
 for(const page of [load({},true,{sessionBlocked:true}),load({},false,{importFailed:true})]){await page.elements.get('download-recovery').listeners.get('click')();assert.equal(page.blobs.length,0);assert(!page.elements.get('recovery-status').textContent.includes('copy prepared'));assert.equal(page.elements.get('download-recovery').disabled,false)}
});
test('offline diary country metadata is rendered as text alongside the original site without interpreting markup',()=>{
 const entry={target:'M31',observedAt:'2026-10-08T20:00:00.000Z',place:{name:'Paris QA',country:'France <country> 星空',latitude:48.85,longitude:2.35},outcome:'seen',equipment:'',notes:''},page=load({'nightjar-observing-diary-v1':[entry]});
 assert(page.elements.get('diary').textContent.includes('Paris QA · France <country> 星空'));assert.equal(page.elements.get('diary').children[0].children.length,2);
});


test('offline missing collections remain empty but present empty/null/wrong-shape values identify unavailable data',()=>{
 const keys={'targets':'nightjar-targets-v1','deep-targets':'nightjar-deep-targets-v1','diary':'nightjar-observing-diary-v1','places':'nightjar-places','equipment':'nightjar-equipment','session':'nightjar-observing-time'};
 const absent=load();assert.equal(absent.elements.get('storage-warning').hidden,true);
 for(const [id,key] of Object.entries(keys)){
  for(const raw of ['', 'null', '{}','42']){
   const page=load({},false,{rawOverrides:{[key]:raw}});
   assert.equal(page.elements.get('storage-warning').hidden,false);assert.equal(page.elements.get(id).children.length,0);
   assert(page.elements.get(id+'-empty').textContent.includes('unavailable'));assert.equal(page.raw.get(key),raw);assert.equal(page.session.size,0);
  }
 }
 for(const raw of ['', 'null', '[]','42']){
  const page=load({'nightjar-targets-v1':['Vega']},false,{rawOverrides:{'nightjar-target-notes-v1':raw}});
  assert.equal(page.elements.get('storage-warning').hidden,false);assert.equal(page.elements.get('targets').children.length,1);assert.equal(page.raw.get('nightjar-target-notes-v1'),raw);
 }
 const valid=load(Object.fromEntries(Object.values(keys).filter(k=>k!=='nightjar-observing-time').map(k=>[k,[]])));
 assert.equal(valid.elements.get('storage-warning').hidden,true);
});


test('offline bounded and filtered views identify omitted collections without treating duplicates as missing identities',()=>{
 const site={name:'Site QA',latitude:51,longitude:0},setup={name:'Setup QA',focal:400,width:36,height:24,pixel:3.76};
 const page=load({'nightjar-targets-v1':Array.from({length:43},(_,i)=>'Target '+i),'nightjar-deep-targets-v1':Array(201).fill('M31'),'nightjar-target-notes-v1':Object.fromEntries(Array.from({length:101},(_,i)=>['Note '+i,'Text QA'])),'nightjar-places':Array(101).fill(site),'nightjar-equipment':Array(101).fill(setup)}),before=structuredClone(page.raw);
 const coverage=page.elements.get('coverage-warning');assert.equal(coverage.hidden,false);
 for(const name of ['Saved targets','Saved deep-sky list','Target notes','Your places','Imaging setups'])assert(coverage.textContent.includes(name));
 assert.equal(page.elements.get('targets').children.length,42);assert.equal(page.elements.get('places').children.length,100);assert.equal(page.elements.get('equipment').children.length,100);assert.deepEqual(page.raw,before);assert.equal(page.session.size,0);
 const duplicate=load({'nightjar-targets-v1':['Vega','Vega'],'nightjar-deep-targets-v1':['M31','M31']});assert.equal(duplicate.elements.get('coverage-warning').hidden,true);
 const filtered=load({'nightjar-targets-v1':[null],'nightjar-equipment':[{...setup,focal:'400'}],'nightjar-observing-diary-v1':[{}]});
 assert.equal(filtered.elements.get('coverage-warning').hidden,false);for(const id of ['targets','equipment','diary'])assert(filtered.elements.get(id+'-empty').textContent.includes('omitted'));
});


test('offline clipped note and legacy label text report partial content while retaining exact raw recovery sources',()=>{
 const note='n'.repeat(2001),longName='s'.repeat(301),entry={target:'M31',observedAt:'2026-10-09T20:30:00.000Z',place:{name:'Site',latitude:51,longitude:0},outcome:'seen',equipment:'',notes:note};
 const page=load({'nightjar-targets-v1':['Vega'],'nightjar-target-notes-v1':{Vega:note},'nightjar-observing-diary-v1':[entry],'nightjar-places':[{...entry.place,name:longName}],'nightjar-equipment':[{name:longName,focal:400,width:36,height:24,pixel:3.76}]});
 const coverage=page.elements.get('coverage-warning');assert.equal(coverage.hidden,false);for(const label of ['Target notes','Observing diary','Your places','Imaging setups'])assert(coverage.textContent.includes(label));
 assert.equal(page.elements.get('targets').children[0].children[1].textContent.length,2000);assert.equal(page.elements.get('diary').children[0].children[2].textContent.length,2000);
 assert.equal(JSON.parse(page.raw.get('nightjar-target-notes-v1')).Vega,note);assert.equal(JSON.parse(page.raw.get('nightjar-places'))[0].name,longName);assert.equal(page.session.size,0);
});


test('offline paired views and return tokens retain this tab while keeping a newer shared site visible and unchanged',()=>{
 const own={name:'Own window QA',latitude:51.5,longitude:0,timezone:'UTC'},peer={name:'Shared peer QA',latitude:48.85,longitude:2.35,timezone:'Europe/Paris'},time='2026-10-09T21:45:17.123Z',raw=JSON.stringify({version:1,time,place:own});
 const page=load({'nightjar-place':peer,'nightjar-observing-time':'2026-10-09T20:30:00.000Z'},false,{sessionOverrides:{'nightjar-current-context-v1':raw}}),before=structuredClone(page.raw);
 assert(page.elements.get('session').textContent.includes('Own window QA'));assert(page.elements.get('session').textContent.includes('21:45:17.123 UTC'));assert(page.elements.get('places').textContent.includes('Shared peer QA'));assert(page.elements.get('places').textContent.includes('Own window QA'));
 page.elements.get('retry').listeners.get('click')();const recovery=JSON.parse(page.session.get('nightjar-recovery-context-v1'));assert.deepEqual(recovery,{version:1,time,place:own});assert.deepEqual(page.raw,before);
 const blocked=load({'nightjar-place':peer,'nightjar-observing-time':time},false,{sessionOverrides:{'nightjar-current-context-v1':raw},sessionWriteBlocked:true});let prevented=false;
 blocked.elements.get('retry').listeners.get('click')({preventDefault:()=>{prevented=true}});assert(prevented);assert(blocked.elements.get('connection').textContent.includes('could not be preserved'));assert.equal(blocked.session.get('nightjar-recovery-context-v1'),undefined);
 const invalid=load({'nightjar-place':peer,'nightjar-observing-time':time},false,{sessionOverrides:{'nightjar-current-context-v1':'{broken'}});assert.equal(invalid.elements.get('storage-warning').hidden,false);assert(invalid.elements.get('session').textContent.includes('Shared peer QA'));
 const missing=load({'nightjar-place':peer},false,{sessionOverrides:{'nightjar-recovery-context-v1':raw,'nightjar-recovery-time-v1':JSON.stringify(time)}});missing.elements.get('retry').listeners.get('click')();assert(!missing.session.has('nightjar-recovery-context-v1'));assert(!missing.session.has('nightjar-recovery-time-v1'));
});

test('offline paired site aliases at the same coordinates retain their separate names and sky ratings',()=>{
 const own={name:'Dark garden',latitude:51.5,longitude:0,timezone:'Europe/London',bortle:3},peer={...own,name:'Street entrance',bortle:7},time='2026-10-16T20:00:37.125Z',context=JSON.stringify({version:1,time,place:own});
 for(const saved of [[peer],[own,peer],[]]){
  const page=load({'nightjar-place':peer,'nightjar-places':saved,'nightjar-observing-time':time},false,{sessionOverrides:{'nightjar-current-context-v1':context}}),before=new Map(page.raw);
  const rows=page.elements.get('places').children.map(row=>row.textContent);
  assert.equal(rows.length,2,'both named site snapshots must remain visible without duplicating an existing named site');
  assert(rows.some(row=>row.includes('Dark garden')&&row.includes('Bortle 3')));
  assert(rows.some(row=>row.includes('Street entrance')&&row.includes('Bortle 7')));
  assert(page.elements.get('session').textContent.includes('Dark garden'));
  page.elements.get('retry').listeners.get('click')();
  assert.deepEqual(JSON.parse(page.session.get('nightjar-recovery-context-v1')),{version:1,time,place:own});
  assert.deepEqual(page.raw,before);
 }
});

test('offline snapshots disclose relevant changes from another local-storage view without rewriting saved data',()=>{
 const page=load({'nightjar-targets-v1':['Vega']}),before=Array.from(page.raw);
 assert.equal(page.elements.get('snapshot-warning').hidden,true);
 page.listeners.get('storage')({key:'nightjar-targets-v1',storageArea:page.storage});
 assert.equal(page.elements.get('snapshot-warning').hidden,false);assert.deepEqual(Array.from(page.raw),before);
 assert.equal(page.elements.get('targets').textContent,'Vega');assert.match(html,/id="refresh-details" href="\/offline"/);
});
test('offline snapshot notices ignore unrelated stores and include clearing relevant local data',()=>{
 const page=load();page.listeners.get('storage')({key:'nightjar-targets-v1',storageArea:{}});page.listeners.get('storage')({key:'unrelated-app',storageArea:page.storage});assert.equal(page.elements.get('snapshot-warning').hidden,true);
 page.listeners.get('storage')({key:null,storageArea:page.storage});assert.equal(page.elements.get('snapshot-warning').hidden,false);
});
test('offline diary omits unsupported year-zero observations while preserving their raw stored values',()=>{
 const entry={target:'M31',observedAt:'0000-12-31T23:59:00.000Z',place:{name:'QA site',latitude:0,longitude:0},outcome:'seen',notes:'Unsupported QA record'},valid={...entry,target:'M45',observedAt:'0001-01-01T00:00:00.000Z',notes:'Supported QA record'};
 const page=load({'nightjar-observing-diary-v1':[entry,valid]});assert.equal(page.elements.get('diary').children.length,1);assert(page.elements.get('diary').textContent.includes('Supported QA record'));assert(!page.elements.get('diary').textContent.includes('Unsupported QA record'));assert.equal(page.elements.get('coverage-warning').hidden,false);assert.deepEqual(JSON.parse(page.raw.get('nightjar-observing-diary-v1')),[entry,valid]);
});


test('ordinary pageshow resamples a missed network event without implying the snapshot changed at mount',()=>{
 const page=load({'nightjar-targets-v1':['Vega']});page.navigator.onLine=true;
 page.listeners.get('pageshow')?.({persisted:false});
 assert(page.elements.get('connection').textContent.includes('may be available'));assert.equal(page.elements.get('snapshot-warning').hidden,true);
 assert.equal(page.session.size,0);assert.equal(page.elements.get('targets').textContent,'Vega');
});
test('cached-page return defers silent network recovery until pageshow and keeps saved text as a snapshot',()=>{
 const note='Retained 星空\nSecond line',page=load({'nightjar-targets-v1':['Vega'],'nightjar-target-notes-v1':{Vega:note}}),before=new Map(page.raw);
 page.listeners.get('pagehide')?.();page.navigator.onLine=true;
 page.visibilityListeners.get('visibilitychange')?.();assert(page.elements.get('connection').textContent.includes('You are offline'));assert.equal(page.elements.get('snapshot-warning').hidden,true);
 page.listeners.get('pageshow')?.({persisted:true});assert(page.elements.get('connection').textContent.includes('may be available'));assert.equal(page.elements.get('snapshot-warning').hidden,false);
 assert(page.elements.get('snapshot-message').textContent.includes('may have changed'));assert(page.elements.get('targets').textContent.includes(note));assert.deepEqual(page.raw,before);assert.equal(page.session.size,0);
});
test('visible return resamples a missed disconnect and a later storage notice names a known change',()=>{
 const page=load({'nightjar-targets-v1':['Polaris']});page.navigator.onLine=true;page.listeners.get('online')();
 page.document.hidden=true;page.visibilityListeners.get('visibilitychange')?.();page.navigator.onLine=false;
 page.visibilityListeners.get('visibilitychange')?.();assert(page.elements.get('connection').textContent.includes('may be available'));
 page.document.hidden=false;page.visibilityListeners.get('visibilitychange')?.();assert(page.elements.get('connection').textContent.includes('You are offline'));assert.equal(page.elements.get('snapshot-warning').hidden,false);
 assert(page.elements.get('snapshot-message').textContent.includes('may have changed'));
 page.listeners.get('storage')({key:'nightjar-targets-v1',storageArea:page.storage});assert(page.elements.get('snapshot-message').textContent.includes('changed in another view'));
 assert.equal(page.elements.get('targets').textContent,'Polaris');assert.equal(page.session.size,0);
});


test('network return cannot hide a failed context-preservation message; a successful explicit retry clears it',()=>{
 const time='2026-10-25T01:30:17.456Z',page=load({'nightjar-observing-time':time,'nightjar-place':{name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'}},false,{sessionWriteBlocked:true});let prevented=false;
 page.elements.get('retry').listeners.get('click')({preventDefault:()=>prevented=true});assert(prevented);assert(page.elements.get('connection').textContent.includes('could not be preserved'));
 page.navigator.onLine=true;page.listeners.get('online')();assert(page.elements.get('connection').textContent.includes('could not be preserved'));
 page.listeners.get('pagehide')?.();page.listeners.get('pageshow')?.({persisted:true});assert(page.elements.get('connection').textContent.includes('could not be preserved'));
 page.allowSessionWrites();prevented=false;page.elements.get('retry').listeners.get('click')({preventDefault:()=>prevented=true});assert.equal(prevented,false);assert(page.elements.get('connection').textContent.includes('may be available'));
 assert.equal(JSON.parse(page.session.get('nightjar-recovery-context-v1')).time,time);
});


test('cancelling recovery preparation ignores a module that arrives later without downloading or replacing feedback',async()=>{
 let release;const page=load({'nightjar-targets-v1':['Polaris']},false,{recoveryLoader:()=>new Promise(resolve=>release=resolve)});
 const pending=page.elements.get('download-recovery').listeners.get('click')();
 page.elements.get('cancel-recovery')?.listeners.get('click')?.();release({makePlannerRecovery});await pending;
 assert.equal(page.blobs.length,0);assert.equal(page.elements.get('download-recovery').disabled,false);assert(page.elements.get('recovery-status').textContent.includes('cancelled'));
 assert.equal(page.elements.get('cancel-recovery').hidden,true);assert.equal(page.raw.get('nightjar-targets-v1'),'["Polaris"]');
});
test('an obsolete recovery completion cannot enable a newer request or download its snapshot',async()=>{
 const work=[],page=load({'nightjar-targets-v1':['Polaris']},false,{recoveryLoader:()=>new Promise(resolve=>work.push(resolve))});
 const first=page.elements.get('download-recovery').listeners.get('click')();page.elements.get('cancel-recovery')?.listeners.get('click')?.();
 const second=page.elements.get('download-recovery').listeners.get('click')();work[0]({makePlannerRecovery});await first;
 assert.equal(work.length,2);assert.equal(page.blobs.length,0);assert.equal(page.elements.get('download-recovery').disabled,true);assert.equal(page.elements.get('cancel-recovery').hidden,false);
 page.raw.set('nightjar-target-notes-v1',JSON.stringify({Polaris:'Current copy 星空'}));work[1]({makePlannerRecovery});await second;
 assert.equal(page.blobs.length,1);assert.equal(page.elements.get('download-recovery').disabled,false);assert.equal(page.elements.get('cancel-recovery').hidden,true);
 assert.equal(JSON.parse(await page.blobs[0].text()).stores.local['nightjar-target-notes-v1'],JSON.stringify({Polaris:'Current copy 星空'}));
});
test('a cancelled module failure cannot replace a newer pending recovery request with an error',async()=>{
 const work=[],page=load({},false,{recoveryLoader:()=>new Promise((resolve,reject)=>work.push({resolve,reject}))});
 const first=page.elements.get('download-recovery').listeners.get('click')();page.elements.get('cancel-recovery')?.listeners.get('click')?.();const second=page.elements.get('download-recovery').listeners.get('click')();
 work[0].reject(Error('Late module failure'));await first;
 assert.equal(work.length,2);assert.equal(page.elements.get('download-recovery').disabled,true);assert.equal(page.elements.get('recovery-status').textContent,'Preparing a recovery copy…');
 work[1].resolve({makePlannerRecovery});await second;assert.equal(page.blobs.length,1);assert(page.elements.get('recovery-status').textContent.includes('Recovery copy prepared'));
});

test('offline diary search filters the rendered snapshot across Unicode, notes and site text without rereading stores',()=>{
 const entry={target:'M31',observedAt:'2026-10-08T20:00:00.000Z',place:{name:'Hill 星空',latitude:51.5,longitude:0},outcome:'seen',equipment:'Binoculars',notes:'Clear <night>'};
 const page=load({'nightjar-observing-diary-v1':[entry,{...entry,target:'M45',place:{...entry.place,name:'Garden'},notes:'Faint cluster'}]});
 const search=page.elements.get('diary-search'),clear=page.elements.get('diary-search-clear'),rows=page.elements.get('diary').children,before=[...page.reads],raw=[...page.raw];
 const find=query=>{search.value=query;search.listeners.get('input')()};
 assert.equal(page.elements.get('diary-search-tools').hidden,false);
 find('Ｍ３１');assert.deepEqual(rows.map(row=>row.hidden),[false,true]);
 assert.equal(page.elements.get('diary-search-count').textContent,'1 of 2 saved observations shown.');
 find('星空');assert.deepEqual(rows.map(row=>row.hidden),[false,true]);
 find('<NIGHT>');assert.deepEqual(rows.map(row=>row.hidden),[false,true]);
 find('no matching note');assert(rows.every(row=>row.hidden));assert.equal(page.elements.get('diary-search-empty').hidden,false);
 clear.listeners.get('click')();assert(rows.every(row=>!row.hidden));assert.equal(search.value,'');assert(search.focused);assert(clear.disabled);
 assert.deepEqual(page.reads,before);assert.deepEqual([...page.raw],raw);
});
test('offline diary search stays hidden for empty or unreadable observations',()=>{
 for(const page of [load(),load({},true),load({'nightjar-observing-diary-v1':[{}]})])assert.equal(page.elements.get('diary-search-tools').hidden,true);
});
