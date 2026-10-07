import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {milkyWayPlanning,galacticCentrePosition,bodyPosition,A}=await vite.ssrLoadModule('/lib/sky.ts');
test('an overnight core window contains its peak and only adjacent eligible dark samples',()=>{
 const date=new Date('2026-04-20T20:00Z'),place={name:'Sydney QA',latitude:-33.86,longitude:151.2,timezone:'Australia/Sydney'};
 const plan=milkyWayPlanning(date,place);assert(plan.best&&plan.first&&plan.last);
 assert(+plan.first.date>=+date&&+plan.last.date<=+date+86400000);
 assert(+plan.first.date<=+plan.best.date&&+plan.best.date<=+plan.last.date);
 const day=new Intl.DateTimeFormat('en-GB',{timeZone:place.timezone,day:'numeric'});
 assert.notEqual(day.format(plan.first.date),day.format(plan.last.date),'this fixture must cross local midnight');
 for(let instant=+plan.first.date;instant<=+plan.last.date;instant+=900000){
  const sample=new Date(instant),position=galacticCentrePosition(sample,place);
  assert(bodyPosition(A.Body.Sun,sample,place).altitude<=-18);assert(position.altitude>=10);
  assert(position.altitude<=plan.best.altitude+1e-10);
 }
 for(let offset=0;offset<=86400000;offset+=900000){
  const sample=new Date(+date+offset),position=galacticCentrePosition(sample,place);
  if(bodyPosition(A.Body.Sun,sample,place).altitude<=-18&&position.altitude>=10)assert(position.altitude<=plan.best.altitude+1e-10,'no eligible sample may exceed the ranked peak');
 }
 assert.deepEqual(plan.current,galacticCentrePosition(date,place));
});
test('polar daylight has no invented dark core window but retains a finite current direction',()=>{
 const plan=milkyWayPlanning(new Date('2026-06-21T12:00Z'),{name:'North Pole QA',latitude:90,longitude:0,timezone:'UTC'});
 assert.equal(plan.first,null);assert.equal(plan.last,null);assert.equal(plan.best,null);
 assert(Number.isFinite(plan.current.altitude)&&Number.isFinite(plan.current.azimuth));
});
