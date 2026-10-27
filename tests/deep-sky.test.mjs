import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {messierCatalogue,deepSkyCatalogue,findDeepSky,deepSkyPosition,bestDeepSkyTime}=await vite.ssrLoadModule('/lib/deep-sky.ts');
const {A,bodyPosition}=await vite.ssrLoadModule('/lib/sky.ts');
const place={name:'London',latitude:51.508,longitude:-.126,timezone:'Europe/London'};
test('saved-target scope composes with catalogue filters without changing saved identities',()=>{
 const saved=['M31','M45','M31'],before=[...saved];
 assert.deepEqual(findDeepSky('','',{savedIds:saved}).map(target=>target.id).sort(),['M31','M45']);
 assert.deepEqual(findDeepSky('Andromeda','Galaxy',{savedIds:saved,constellation:'And',maximumMagnitude:6}).map(target=>target.id),['M31']);
 assert.deepEqual(findDeepSky('M57','',{savedIds:saved}),[]);
 assert.deepEqual(findDeepSky('','Galaxy',{savedIds:['M45']}),[]);
 assert.deepEqual(findDeepSky('','',{savedIds:[]}),[]);
 assert.deepEqual(findDeepSky('','',{savedIds:['M102','not-a-target']}),[]);
 assert.equal(findDeepSky('','',{savedIds:undefined}).length,254);
 assert.deepEqual(saved,before);
});
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
 const original=deepSkyCatalogue[0],unknown={...original,magnitude:null};deepSkyCatalogue[0]=unknown;
 try{assert(findDeepSky(unknown.id,'').some(target=>target.id===unknown.id));assert(!findDeepSky(unknown.id,'',{maximumMagnitude:15}).some(target=>target.id===unknown.id));assert.equal(findDeepSky('','',{maximumMagnitude:NaN}).length,0);assert.equal(findDeepSky('','',{maximumMagnitude:Infinity}).length,0)}finally{deepSkyCatalogue[0]=original}
});
test('Messier search handles common names, spaced identifiers and object-type filters',()=>{
 assert.equal(messierCatalogue.length,109);assert.equal(new Set(messierCatalogue.map(t=>t.id)).size,109);
 assert.equal(findDeepSky('M 31','')[0].name,'Andromeda Galaxy');
 assert.equal(findDeepSky('NGC 224','')[0].id,'M31');
 assert.equal(findDeepSky('NGC 0224','')[0].id,'M31');
 assert.equal(findDeepSky('pleiades','')[0].id,'M45');
 assert.equal(findDeepSky('andromeda','Open cluster',{catalogue:'messier'}).length,0);
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
 const m31=deepSkyPhoto(findDeepSky('M31','')[0],'survey'),url=new URL(m31.src);
 assert.equal(url.searchParams.get('r'),'0:42:44');assert.equal(url.searchParams.get('d'),'+41:16:09');assert.equal(url.searchParams.get('e'),'J2000');
 assert.equal(url.searchParams.get('w'),'60');assert.equal(url.searchParams.get('h'),'60');assert.match(m31.caption,/extends beyond/);assert(m31.credit.includes('STScI'));
 const compact=deepSkyPhoto(findDeepSky('M57','')[0]);assert.equal(new URL(compact.src).searchParams.get('w'),'15');assert(!compact.caption.includes('extends beyond'));
 for(const target of messierCatalogue){const photo=deepSkyPhoto(target,'survey');const size=Number(new URL(photo.src).searchParams.get('w'));assert(size>=15&&size<=60)}
});
test('altitude timeline preserves UTC spacing through the repeated London clock-change hour',async()=>{
 const {deepSkyWindow,bestDeepSkySample}=await vite.ssrLoadModule('/lib/deep-sky.ts');
 const start=new Date('2026-10-25T00:00:00Z'),samples=deepSkyWindow(findDeepSky('M31','')[0],start,place);
 assert.equal(samples.length,97);assert.equal(+samples.at(-1).time-+samples[0].time,86400000);
 for(let i=1;i<samples.length;i++)assert.equal(+samples[i].time-+samples[i-1].time,900000);
 const format=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/London',timeZoneName:'shortOffset'});
 assert.notEqual(format.format(samples[0].time),format.format(samples[4].time));
 assert.equal(bestDeepSkySample([{...samples[0],sun:-19,altitude:30}]),null);
 assert.equal(bestDeepSkySample([{...samples[0],sun:-18,altitude:60}]),null);
 assert.equal(bestDeepSkySample([{...samples[0],sun:-17.99,altitude:70}]),null);
 assert.equal(bestDeepSkySample([{...samples[0],sun:-19,altitude:30.01}]).altitude,30.01);
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

test('adding current horizontal positions preserves catalogue J2000 coordinates in saved plans and survey images',async()=>{
 const {deepSkyPlanNotes,deepSkyPhoto}=await vite.ssrLoadModule('/lib/deep-sky.ts');
 const target=messierCatalogue.find(target=>target.id==='M31'),before=structuredClone(target);
 for(const date of [new Date('2026-10-07T20:00Z'),new Date('2100-01-01T00:00Z')]){
  const position=deepSkyPosition(target,date,place),saved={...target,...position};
  assert.deepEqual(Object.keys(position).sort(),['altitude','azimuth']);
  assert.equal(saved.ra,target.ra);assert.equal(saved.dec,target.dec);
  assert(deepSkyPlanNotes(saved).includes(`J2000: RA ${target.ra.toFixed(5)} h · Dec ${target.dec.toFixed(5)}°`));
  assert.equal(deepSkyPhoto(saved).src,deepSkyPhoto(target).src);
  assert.deepEqual(target,before);
 }
});


test('featured deep-sky photos distinguish processed/core views and retain an explicit source-coordinate survey alternative',async()=>{
 const {deepSkyPhoto}=await vite.ssrLoadModule('/lib/deep-sky.ts');
 for(const id of ['M13','M31']){const target=findDeepSky(id,'').find(t=>t.id===id),reference=deepSkyPhoto(target),survey=deepSkyPhoto(target,'survey'),before=structuredClone(target);assert.equal(new URL(reference.src).hostname,'assets.science.nasa.gov');assert.equal(new URL(reference.src).searchParams.get('w'),'800');assert.equal(new URL(reference.thumbnailSrc).searchParams.get('w'),'200');assert.equal(new URL(reference.source).hostname,'science.nasa.gov');assert(!reference.survey);assert(survey.survey);assert.equal(new URL(survey.src).searchParams.get('e'),'J2000');assert.notEqual(reference.src,survey.src);assert.deepEqual(target,before)}
 assert.match(deepSkyPhoto(findDeepSky('M13','')[0]).caption,/core of M13/);assert.match(deepSkyPhoto(findDeepSky('M31','')[0]).caption,/infrared mosaic/);
 const other=findDeepSky('M57','')[0];assert.deepEqual(deepSkyPhoto(other),deepSkyPhoto(other,'survey'));
});


test('shared catalogue positions and dark-window transforms preserve all individual calculations and source coordinates',async()=>{
 const {deepSkyPositions,deepSkyRecommendations}=await vite.ssrLoadModule('/lib/deep-sky.ts');
 const original=structuredClone(messierCatalogue);
 for(const [iso,site] of [['2026-10-07T20:00Z',place],['2026-04-21T08:00Z',{name:'Sydney fixture',latitude:-33.86,longitude:151.21}],['2026-06-21T12:00Z',{name:'Polar fixture',latitude:89,longitude:0}]]){
  const date=new Date(iso),positions=deepSkyPositions(messierCatalogue,date,site);
  positions.forEach((position,index)=>{const target=messierCatalogue[index];assert.deepEqual(position,{...target,...deepSkyPosition(target,date,site)});assert.equal(position.ra,target.ra);assert.equal(position.dec,target.dec)});
  const targets=['M31','M13','M42','M45','M57','M104'].map(id=>messierCatalogue.find(t=>t.id===id)),recommendations=deepSkyRecommendations(targets,date,site);
  for(const target of targets){const reference=bestDeepSkyTime(target,date,site);assert.deepEqual(recommendations.get(target.id)??null,reference)}
 }
 assert.deepEqual(messierCatalogue,original);assert.equal(deepSkyRecommendations([],new Date(NaN),place).size,0);
});
test('deep-sky windows and shared recommendations stop before unsupported UTC dates',async()=>{
 const {deepSkyWindow,deepSkyRecommendations}=await vite.ssrLoadModule('/lib/deep-sky.ts');
 const start=new Date('9999-12-31T23:30:00Z'),targets=['M31','M45','M57'].map(id=>findDeepSky(id,'')[0]);
 for(const target of targets){
  const samples=deepSkyWindow(target,start,place);assert.equal(samples.length,2);assert.equal(samples.at(-1).time.toISOString(),'9999-12-31T23:45:00.000Z');
  const best=bestDeepSkyTime(target,start,place);if(best)assert(best.date.getUTCFullYear()===9999);
 }
 const shared=deepSkyRecommendations(messierCatalogue,start,place);for(const value of shared.values())assert(value.date.getUTCFullYear()===9999);
 const single=deepSkyWindow(targets[0],new Date('9999-12-31T23:59:00Z'),place);assert.equal(single.length,1);
 assert.equal(deepSkyWindow(targets[0],new Date('0001-01-01T00:00:00Z'),place).length,97);
});
test('deep-sky planning rejects unsupported starting instants',async()=>{
 const {deepSkyWindow,deepSkyRecommendations}=await vite.ssrLoadModule('/lib/deep-sky.ts'),target=findDeepSky('M31','')[0];
 for(const date of [new Date(NaN),new Date('+010000-01-01T00:00:00Z'),new Date('0000-12-31T23:00:00Z')]){
  assert.throws(()=>deepSkyWindow(target,date,place),/UTC years 1–9999/);assert.throws(()=>deepSkyRecommendations([target],date,place),/UTC years 1–9999/);
 }
});

test('full Messier designations and smart apostrophes match the same catalogue and camera objects',async()=>{
 const {cameraCatalogueTargets,searchCameraTargets}=await vite.ssrLoadModule('/lib/camera-catalogue.ts');
 const before=structuredClone(messierCatalogue),targets=cameraCatalogueTargets(new Date('2026-10-14T20:00:00Z'),place,'all');
 for(const [query,id] of [['Messier 31','M31'],['messier0031','M31'],['Ｍｅｓｓｉｅｒ ００３１','M31'],['Bode’s Galaxy','M81'],['Bode‘s Galaxy','M81'],['Ptolemy’s Cluster','M7']]){
  assert.deepEqual(findDeepSky(query,'').map(target=>target.id),[id]);
  assert.deepEqual(searchCameraTargets(targets,query).map(target=>target.name),[id]);
 }
 assert.deepEqual(findDeepSky('Messier 31','Open cluster'),[]);assert.deepEqual(findDeepSky('Messier -31',''),[]);
 assert.deepEqual(findDeepSky('Messier 31','',{constellation:'Cyg'}),[]);
 assert.deepEqual(messierCatalogue,before);
});

test('survey display previews bound decoded pixels while preserving fields, centres and original images',async()=>{
 const {deepSkyPhoto}=await vite.ssrLoadModule('/lib/deep-sky.ts'),{objectPhoto}=await vite.ssrLoadModule('/lib/object-photos.ts');
 const before=structuredClone(messierCatalogue),photos=[objectPhoto('Vega'),...messierCatalogue.map(target=>deepSkyPhoto(target,'survey'))];
 for(const photo of photos){
  assert(photo.previewSrc,'survey references need a bounded display preview');
  const full=new URL(photo.src),preview=new URL(photo.previewSrc),thumbnail=new URL(photo.thumbnailSrc);
  assert.equal(full.hostname,'archive.stsci.edu');assert.equal(full.searchParams.get('e'),'J2000');
  assert.equal(preview.origin+preview.pathname,'https://alasky.cds.unistra.fr/hips-image-services/hips2fits');
  assert.equal(preview.searchParams.get('width'),'800');assert.equal(preview.searchParams.get('height'),'800');assert.equal(preview.searchParams.get('format'),'jpg');
  assert.equal(Number(preview.searchParams.get('fov')),Number(full.searchParams.get('h'))/60);
  for(const key of ['ra','dec','fov','hips','projection','coordsys','format'])assert.equal(preview.searchParams.get(key),thumbnail.searchParams.get(key));
  assert.equal(thumbnail.searchParams.get('width'),'200');assert.equal(thumbnail.searchParams.get('height'),'200');
 }
 for(const id of ['M13','M31'])assert.equal(deepSkyPhoto(messierCatalogue.find(target=>target.id===id)).previewSrc,undefined,'featured NASA references keep their existing image');
 assert.deepEqual(messierCatalogue,before);
});
