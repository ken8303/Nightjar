import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {messierCatalogue,findDeepSky,deepSkyPosition,bestDeepSkyTime}=await vite.ssrLoadModule('/lib/deep-sky.ts');
const {A,bodyPosition}=await vite.ssrLoadModule('/lib/sky.ts');
const place={name:'London',latitude:51.508,longitude:-.126,timezone:'Europe/London'};
test('full constellation names and Unicode identifiers work without losing catalogue codes',async()=>{
 const {constellationName}=await vite.ssrLoadModule('/lib/constellations.ts');
 for(const code of new Set(messierCatalogue.map(t=>t.constellation)))assert(code==='Leo'||constellationName(code)!==code);
 assert.equal(constellationName('Se1'),'Serpens Caput');assert.equal(constellationName('Se2'),'Serpens Cauda');assert.equal(constellationName('XYZ'),'XYZ');
 const result=findDeepSky('Ursa Major','');assert(result.length);assert(result.every(t=>t.constellation==='UMa'));const serpens=findDeepSky('Serpens','');assert(serpens.length);assert(serpens.every(t=>['Se1','Se2'].includes(t.constellation)));assert.equal(findDeepSky('Ｍ ０３１','')[0].id,'M31');
});
test('constellation and magnitude filters compose with catalogue search and object type',()=>{
 const andromeda=findDeepSky('','Galaxy',{constellation:'And',maximumMagnitude:9});assert(andromeda.some(target=>target.id==='M31'));assert(andromeda.every(target=>target.constellation==='And'&&target.type==='Galaxy'&&target.magnitude<=9));assert.deepEqual(findDeepSky('M31','',{constellation:'And',maximumMagnitude:6}).map(t=>t.id),['M31']);assert.equal(findDeepSky('M31','',{constellation:'Cyg'}).length,0);assert.equal(findDeepSky('M31','',{maximumMagnitude:0}).length,0);
});
test('unknown magnitudes remain in unfiltered searches and cannot pass a brightness limit',()=>{
 const original=messierCatalogue[0],unknown={...original,magnitude:null};messierCatalogue[0]=unknown;
 try{assert(findDeepSky(unknown.id,'').some(target=>target.id===unknown.id));assert(!findDeepSky(unknown.id,'',{maximumMagnitude:15}).some(target=>target.id===unknown.id));assert.equal(findDeepSky('','',{maximumMagnitude:NaN}).length,0);assert.equal(findDeepSky('','',{maximumMagnitude:Infinity}).length,0)}finally{messierCatalogue[0]=original}
});
test('Messier search handles common names, spaced identifiers and object-type filters',()=>{
 assert.equal(messierCatalogue.length,109);assert.equal(new Set(messierCatalogue.map(t=>t.id)).size,109);
 assert.equal(findDeepSky('M 31','')[0].name,'Andromeda Galaxy');
 assert.equal(findDeepSky('NGC 224','')[0].id,'M31');
 assert.equal(findDeepSky('NGC 0224','')[0].id,'M31');
 assert.equal(findDeepSky('pleiades','')[0].id,'M45');
 assert.equal(findDeepSky('andromeda','Open cluster').length,0);
 for(const t of messierCatalogue){assert(t.ra>=0&&t.ra<24);assert(Math.abs(t.dec)<=90);assert(t.major===null||t.major>0)}
});
test('J2000 positions are precessed to the selected epoch before horizon conversion',()=>{
 const t=findDeepSky('M31','')[0],date=new Date('2050-01-01T20:00:00Z');
 A.DefineStar(A.Body.Star1,t.ra,t.dec,1000);
 const eq=A.Equator(A.Body.Star1,date,new A.Observer(place.latitude,place.longitude,0),true,false);
 const expected=A.Horizon(date,new A.Observer(place.latitude,place.longitude,0),eq.ra,eq.dec,'normal');
 const position=deepSkyPosition(t,date,place);
 assert(Math.abs(position.altitude-expected.altitude)<.001);assert(Math.abs(position.azimuth-expected.azimuth)<.001);
});
test('best-time recommendation honours darkness, strict altitude threshold and highest sampled position',()=>{
 const target=findDeepSky('M31','')[0],date=new Date('2026-10-05T20:00:00Z'),best=bestDeepSkyTime(target,date,place);
 assert(best);assert(best.altitude>30);assert(bodyPosition(A.Body.Sun,best.date,place).altitude<=-18);
 assert(+best.date>=+date&&+best.date<=+date+86400000);
 for(let m=0;m<=1440;m+=15){const d=new Date(+date+m*60000);if(bodyPosition(A.Body.Sun,d,place).altitude<=-18)assert(deepSkyPosition(target,d,place).altitude<=best.altitude+1e-9)}
 assert.equal(bestDeepSkyTime(target,new Date('2026-06-21T12:00:00Z'),{name:'North pole',latitude:89,longitude:0}),null);
});
test('deep-sky survey images use source J2000 coordinates and label cropped large targets',async()=>{
 const {deepSkyPhoto}=await vite.ssrLoadModule('/lib/deep-sky.ts');
 const m31=deepSkyPhoto(findDeepSky('M31','')[0]),url=new URL(m31.src);
 assert.equal(url.searchParams.get('r'),'0:42:44');assert.equal(url.searchParams.get('d'),'+41:16:09');assert.equal(url.searchParams.get('e'),'J2000');
 assert.equal(url.searchParams.get('w'),'60');assert.equal(url.searchParams.get('h'),'60');assert.match(m31.caption,/extends beyond/);assert(m31.credit.includes('STScI'));
 const compact=deepSkyPhoto(findDeepSky('M57','')[0]);assert.equal(new URL(compact.src).searchParams.get('w'),'15');assert(!compact.caption.includes('extends beyond'));
 for(const target of messierCatalogue){const photo=deepSkyPhoto(target);const size=Number(new URL(photo.src).searchParams.get('w'));assert(size>=15&&size<=60)}
});
test('altitude timeline preserves UTC spacing through the repeated London clock-change hour',async()=>{
 const {deepSkyWindow,bestDeepSkySample}=await vite.ssrLoadModule('/lib/deep-sky.ts');
 const start=new Date('2026-10-25T00:00:00Z'),samples=deepSkyWindow(findDeepSky('M31','')[0],start,place);
 assert.equal(samples.length,97);assert.equal(+samples.at(-1).time-+samples[0].time,86400000);
 for(let i=1;i<samples.length;i++)assert.equal(+samples[i].time-+samples[i-1].time,900000);
 const format=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/London',timeZoneName:'shortOffset'});
 assert.notEqual(format.format(samples[0].time),format.format(samples[4].time));
 assert.equal(bestDeepSkySample([{...samples[0],sun:-18,altitude:30}]),null);
 assert.equal(bestDeepSkySample([{...samples[0],sun:-17.99,altitude:70}]),null);
 assert.equal(bestDeepSkySample([{...samples[0],sun:-18,altitude:30.01}]).altitude,30.01);
});

test('primary display names keep aliases searchable and leave catalogue records unchanged',async()=>{
 const {deepSkyName,deepSkyNames}=await vite.ssrLoadModule('/lib/deep-sky.ts');
 const target=findDeepSky('M76','')[0],original=structuredClone(target),names=deepSkyNames(target);
 assert.equal(names.primary,'Barbell Nebula');assert.deepEqual(names.aliases,['Cork Nebula','Little Dumbbell Nebula']);assert.equal(deepSkyName(target),'Barbell Nebula');
 for(const name of [names.primary,...names.aliases])assert(findDeepSky(name,'').some(t=>t.id===target.id));assert.deepEqual(target,original);
 assert.equal(deepSkyName({name:'',catalogue:'NGC1234',id:'M1'}),'NGC1234');assert.equal(deepSkyName({name:'',catalogue:'',id:'M1'}),'M1');assert.deepEqual(deepSkyNames({name:' One ,Two, One,, Three ',catalogue:'',id:'M1'}),{primary:'One',aliases:['Two','Three']});
});

test('offline plan notes preserve catalogue identity and aliases alongside angular context',async()=>{
 const {deepSkyPlanNotes}=await vite.ssrLoadModule('/lib/deep-sky.ts');
 const target=findDeepSky('M76','')[0],notes=deepSkyPlanNotes(target);
 assert(notes.includes('Perseus (Per)'));assert(notes.includes('Catalogue: NGC0650'));assert(notes.includes('Also known as: Cork Nebula, Little Dumbbell Nebula'));assert(notes.includes('J2000: RA'));assert(notes.includes('Visual magnitude: 10.1'));
 const {printableObservingPlan}=await vite.ssrLoadModule('/lib/observing-plan.ts');const html=printableObservingPlan({date:new Date('2026-10-06T20:00Z'),place,targets:[{name:'M76 · Barbell Nebula',altitude:45,azimuth:60}],notes:{'M76 · Barbell Nebula':notes},equipment:[]});assert(html.includes('Cork Nebula, Little Dumbbell Nebula'));assert(html.includes('Perseus (Per)'));assert(html.includes('NGC0650'));
 const missing=deepSkyPlanNotes({...target,name:'',major:null,magnitude:null});assert(missing.includes('Visual magnitude: not listed'));assert(missing.includes('Angular major axis: not listed'));assert(!missing.includes('Also known as:'));
});
