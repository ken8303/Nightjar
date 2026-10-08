import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {cameraLightPhase,cameraSkyContext,cameraCompassContext}=await vite.ssrLoadModule('/lib/camera-context.ts');
test('lighting classifications follow geometric Sun-centre twilight boundaries',()=>{
 for(const [altitude,label] of [[10,'Daylight'],[0,'Daylight'],[-.01,'Civil twilight'],[-5.99,'Civil twilight'],[-6,'Nautical twilight'],[-11.99,'Nautical twilight'],[-12,'Astronomical twilight'],[-17.99,'Astronomical twilight'],[-18,'Astronomical darkness'],[-40,'Astronomical darkness']])assert.equal(cameraLightPhase(altitude).label,label);
 assert.equal(cameraLightPhase(NaN).label,'Lighting unavailable');assert.equal(cameraLightPhase(Infinity).label,'Lighting unavailable');
});
test('camera context uses the supplied site and live date rather than a fixed day or location',()=>{
 const london={name:'London',latitude:51.508,longitude:-.126};
 const noon=cameraSkyContext(new Date('2026-10-04T12:00:00Z'),london),night=cameraSkyContext(new Date('2026-10-04T00:00:00Z'),london);
 assert.equal(noon.label,'Daylight');assert(noon.altitude>30&&noon.altitude<40);
 assert.equal(night.label,'Astronomical darkness');assert(night.altitude<-40);
 const opposite=cameraSkyContext(new Date('2026-10-04T12:00:00Z'),{name:'Opposite meridian',latitude:51.508,longitude:179.874});
 assert.equal(opposite.label,'Astronomical darkness');
});
test('compass context reports bounded magnetic-source uncertainty without claiming label accuracy for unknown or relative sensors',()=>{
 for(const reading of [null,{absolute:false,northReference:'magnetic',compassAccuracy:5},{absolute:true}])assert.equal(cameraCompassContext(reading),null);
 const reading={absolute:true,northReference:'magnetic',compassAccuracy:5.1},before=structuredClone(reading),context=cameraCompassContext(reading);
 assert(context.summary.includes('reported uncertainty ±6°'));assert(context.detail.includes('not a measured label-alignment error'));assert(context.detail.includes('Magnetic north'));assert(cameraCompassContext(reading,true).summary.includes('last reported'));
 for(const value of [undefined,NaN,Infinity,-1,181])assert(cameraCompassContext({...reading,compassAccuracy:value}).summary.includes('unavailable'));
 for(const value of [0,180])assert(cameraCompassContext({...reading,compassAccuracy:value}).summary.includes(`±${value}°`));assert.deepEqual(reading,before);
});
