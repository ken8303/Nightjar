import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const sky=await vite.ssrLoadModule('/lib/sky.ts');
const {A,observer,bodyPosition,observingMilestones,scoreAt}=sky;
const {cameraSkyContext}=await vite.ssrLoadModule('/lib/camera-context.ts');
const {messierCatalogue,deepSkyWindow}=await vite.ssrLoadModule('/lib/deep-sky.ts');
const {compareDeepSky}=await vite.ssrLoadModule('/lib/deep-sky-comparison.ts');
const {planetVisibilityWindow}=await vite.ssrLoadModule('/lib/visibility-window.ts');
const {sevenNightOutlook}=await vite.ssrLoadModule('/lib/night-outlook.ts');
const place={name:'London twilight',latitude:51.5,longitude:0,timezone:'Europe/London'};
function geometric(date,site=place){const obs=observer(site),eq=A.Equator(A.Body.Sun,date,obs,true,true);return A.Horizon(date,obs,eq.ra,eq.dec).altitude}

test('darkness milestones, camera lighting and target planners agree just after astronomical dusk',()=>{
 const milestone=observingMilestones(new Date('2026-10-16T12:00:00Z'),place).find(row=>row.label==='Full darkness begins').date;
 assert(milestone);const date=new Date(+milestone+1000),expected=geometric(date),target=messierCatalogue.find(row=>row.id==='M31');
 assert(expected<-18);assert(bodyPosition(A.Body.Sun,date,place).altitude>-18,'fixture distinguishes apparent and geometric contours');
 assert.equal(cameraSkyContext(date,place).label,'Astronomical darkness');
 assert(Math.abs(deepSkyWindow(target,date,place)[0].sun-expected)<1e-10);
 assert(Math.abs(compareDeepSky([target],date,place)[0].samples[0].sun-expected)<1e-10);
 assert(Math.abs(planetVisibilityWindow(+date,place).hours[0].sun-expected)<1e-10);
});
test('a clear forecast can score after geometric civil dusk without waiting for a refracted threshold',()=>{
 const date=A.SearchAltitude(A.Body.Sun,observer(place),-1,new Date('2026-10-16T12:00:00Z'),1,-6).date;
 const after=new Date(+date+1000);assert(geometric(after)<-6);assert(bodyPosition(A.Body.Sun,after,place).altitude>-6);
 assert(scoreAt(0,after,place)>0);
});
test('a full geometric dark hour is not rejected because apparent solar positions use refraction',()=>{
 const site={name:'Polar darkness',latitude:85.07938514866692,longitude:-2.4,timezone:'UTC'},date=new Date('2026-12-21T12:00:00Z');
 for(let minute=0;minute<=60;minute++)assert(geometric(new Date(+date+minute*60000),site)<-18);
 const nights=sevenNightOutlook({time:[+date/1000],cloud_cover:[0]},site,date);
 assert.equal(nights.length,1);assert.equal(nights[0].best?.hours,1);
});
test('default Sun and Moon viewing positions retain normal atmospheric refraction',()=>{
 const date=new Date('2026-10-16T18:55:39.863Z'),before=structuredClone(place);
 for(const body of [A.Body.Sun,A.Body.Moon]){const obs=observer(place),eq=A.Equator(body,date,obs,true,true),expected=A.Horizon(date,obs,eq.ra,eq.dec,'normal');assert.equal(bodyPosition(body,date,place).altitude,expected.altitude)}
 assert.deepEqual(place,before);
});


test('first-open timing retains the next geometrically dark hour near the twilight boundary',()=>{
 const site={...place,longitude:-0.9},from=new Date('2026-10-16T18:50:00Z'),next=new Date('2026-10-16T19:00:00Z');
 assert(geometric(next,site)<-18);assert(bodyPosition(A.Body.Sun,next,site).altitude>-18);
 assert.equal(+sky.nextObservingTime(from,site),+next);
});
