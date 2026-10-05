import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../public/offline.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
class Element{
 children=[];hidden=true;dataset={};listeners=new Map();text='';
 append(child){this.children.push(child)}
 set textContent(value){this.text=String(value)}
 get textContent(){return this.text+this.children.map(child=>child.textContent).join('')}
 set innerHTML(_value){throw Error('Offline saved text must never use innerHTML')}
 addEventListener(name,callback){this.listeners.set(name,callback)}
}
function load(data={},blocked=false){
 const elements=new Map([...html.matchAll(/id="([^"]+)"/g)].map(match=>[match[1],new Element()]));
 const raw=new Map(Object.entries(data).map(([key,value])=>[key,key==='nightjar-red-light'?value:JSON.stringify(value)]));
 const session=new Map(),listeners=new Map(),navigator={onLine:false},root=new Element();
 const context={document:{documentElement:root,getElementById:id=>{assert(elements.has(id));return elements.get(id)},createElement:()=>new Element()},localStorage:{getItem:key=>{if(blocked)throw Error('Storage denied');return raw.get(key)??null}},sessionStorage:{setItem:(key,value)=>session.set(key,value)},navigator,window:{addEventListener:(name,callback)=>listeners.set(name,callback)}};
 for(const script of scripts)vm.runInNewContext(script,context);
 return {elements,raw,session,listeners,navigator,root};
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
