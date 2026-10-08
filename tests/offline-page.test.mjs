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
 remove(){this.removed=true}
}
function load(data={},blocked=false,{rawOverrides={},sessionBlocked=false,importFailed=false}={}){
 const elements=new Map([...html.matchAll(/id="([^"]+)"/g)].map(match=>[match[1],new Element()]));
 const raw=new Map(Object.entries(data).map(([key,value])=>[key,key==='nightjar-red-light'?value:JSON.stringify(value)]));
 for(const [key,value] of Object.entries(rawOverrides))raw.set(key,value);
 const session=new Map(),listeners=new Map(),navigator={onLine:false},root=new Element(),body=new Element(),blobs=[],timers=[],revoked=[],reads=[],parseSizes=[];
 const context={document:{documentElement:root,body,getElementById:id=>{assert(elements.has(id));return elements.get(id)},createElement:()=>new Element()},localStorage:{getItem:key=>{reads.push(key);if(blocked)throw Error('Storage denied');return raw.get(key)??null}},sessionStorage:{getItem:key=>{if(sessionBlocked)throw Error('Session denied');return session.get(key)??null},setItem:(key,value)=>session.set(key,value)},navigator,window:{addEventListener:(name,callback)=>listeners.set(name,callback)},Error,Blob,URL:{createObjectURL:blob=>{blobs.push(blob);return 'blob:qa-recovery'},revokeObjectURL:url=>revoked.push(url)},setTimeout:(callback,delay)=>timers.push({callback,delay}),JSON:{parse:value=>{parseSizes.push(value.length);return JSON.parse(value)}},loadRecovery:async()=>{if(importFailed)throw Error('Module unavailable');return {makePlannerRecovery}}};
 // vm scripts cannot load browser URL modules. Supply the real shipped module
 // through a loader while exercising the actual offline click handler.
 for(const script of scripts)vm.runInNewContext(script.replace("import('/planner-recovery.mjs')",'loadRecovery()'),context);
 return {elements,raw,session,listeners,navigator,root,body,blobs,timers,revoked,reads,parseSizes};
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
 const partial=load({'nightjar-targets-v1':['Vega']},false,{sessionBlocked:true});await partial.elements.get('download-recovery').listeners.get('click')();assert(partial.elements.get('recovery-status').textContent.includes('2 unreadable'));assert.equal(JSON.parse(await partial.blobs[0].text()).unreadable.length,2);
 for(const page of [load({},true,{sessionBlocked:true}),load({},false,{importFailed:true})]){await page.elements.get('download-recovery').listeners.get('click')();assert.equal(page.blobs.length,0);assert(!page.elements.get('recovery-status').textContent.includes('copy prepared'));assert.equal(page.elements.get('download-recovery').disabled,false)}
});
