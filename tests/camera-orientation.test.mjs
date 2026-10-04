import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {watchCameraOrientation}=await vite.ssrLoadModule('/lib/camera-orientation.ts');
function harness(){
 const events=new EventTarget(),screen=new EventTarget(),result={reading:null,quiet:false,unavailable:[],absolute:0,reads:0,cancelled:false};
 let time=0,angle=0,tick;
 const dispose=watchCameraOrientation(events,screen,{onReading:reading=>{result.reading=reading;result.reads++},onQuiet:quiet=>result.quiet=quiet,onUnavailable:reason=>{result.reading=null;result.unavailable.push(reason)},onAbsolute:()=>result.absolute++},{angle:()=>angle,now:()=>time,schedule:callback=>{tick=callback;return()=>{result.cancelled=true}}});
 function read(values={},type='deviceorientation'){
  const event=Object.assign(new Event(type),{alpha:0,beta:90,gamma:0,absolute:false},values);events.dispatchEvent(event);
 }
 return {events,screen,result,dispose,read,advance:delta=>{time+=delta;tick()},setTime:value=>time=value,rotate:value=>{angle=value;screen.dispatchEvent(new Event('change'))}};
}
test('a quiet stationary phone retains its pose and marks the last reading instead of losing labels',()=>{
 const h=harness();h.read({absolute:true});const pose=h.result.reading;
 h.advance(3999);assert.equal(h.result.quiet,false);h.advance(1);assert.equal(h.result.quiet,true);
 h.advance(60000);assert.equal(h.result.reading,pose);assert.deepEqual(h.result.unavailable,[]);
 h.read({alpha:270,absolute:true});assert.equal(h.result.quiet,false);assert.notEqual(h.result.reading,pose);h.dispose();
});
test('a device that never provides a reading shows waiting once without inventing a pose',()=>{
 const h=harness();h.advance(4000);h.advance(4000);
 assert.equal(h.result.reading,null);assert.equal(h.result.quiet,false);assert.deepEqual(h.result.unavailable,['waiting']);h.dispose();
});
test('invalid readings clear the pose and rapid valid recovery bypasses throttling',()=>{
 const h=harness();h.read();h.setTime(10);h.read({alpha:null});
 assert.equal(h.result.reading,null);assert.equal(h.result.unavailable.at(-1),'invalid');
 h.setTime(20);h.read({alpha:45});assert.equal(h.result.reads,2);assert(h.result.reading);h.dispose();
});
test('screen rotation pauses the old projection until a fresh reading uses the new axes',()=>{
 const h=harness();h.read({alpha:90,beta:0,gamma:-90});h.rotate(90);
 assert.equal(h.result.reading,null);assert.equal(h.result.unavailable.at(-1),'rotated');
 h.setTime(10);h.read({alpha:90,beta:0,gamma:-90});
 const {right,up}=h.result.reading.basis;assert(Math.abs(right[0]-1)<1e-10);assert(Math.abs(up[2]-1)<1e-10);h.dispose();
});
test('absolute compass readings supersede relative data even within the render throttle',()=>{
 const h=harness();h.read();h.setTime(10);h.read({alpha:270},'deviceorientationabsolute');
 assert.equal(h.result.absolute,1);assert.equal(h.result.reading.absolute,true);assert.equal(h.result.reads,2);
 const pose=h.result.reading;h.setTime(200);h.read({alpha:45});assert.equal(h.result.reading,pose);
 h.read({alpha:270,absolute:true});assert.equal(h.result.absolute,1);h.dispose();
});
test('high-frequency readings are throttled and disposal removes listeners and the timer',()=>{
 const h=harness();h.read();h.setTime(40);h.read({alpha:10});assert.equal(h.result.reads,1);
 h.setTime(80);h.read({alpha:20});assert.equal(h.result.reads,2);h.dispose();
 const pose=h.result.reading;h.read({alpha:30});h.rotate(90);h.events.dispatchEvent(new Event('orientationchange'));h.advance(10000);
 assert.equal(h.result.reading,pose);assert.equal(h.result.reads,2);assert.equal(h.result.quiet,false);assert.equal(h.result.cancelled,true);
});
