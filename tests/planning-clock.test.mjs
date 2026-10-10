import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {watchPlanningClock}=await vite.ssrLoadModule('/lib/planning-clock.ts');
function fixture(hiddenInitially=false){
 const events=new EventTarget(),scheduled=[],calls=[];let hidden=hiddenInitially;
 const stop=watchPlanningClock(events,()=>calls.push('update'),{hidden:()=>hidden,schedule:(tick,interval)=>{const task={tick,interval,cancelled:false};scheduled.push(task);return()=>{task.cancelled=true}}});
 return {scheduled,calls,stop,visibility(value){hidden=value;events.dispatchEvent(new Event('visibilitychange'))},hideWithoutEvent(){hidden=true}};
}
test('planning ticks stop while hidden and returning refreshes before restarting the cadence',()=>{
 const f=fixture();assert.equal(f.scheduled[0].interval,30000);f.scheduled[0].tick();assert.deepEqual(f.calls,['update']);
 f.visibility(true);assert(f.scheduled[0].cancelled);f.scheduled[0].tick();assert.equal(f.calls.length,1);
 f.visibility(false);assert.equal(f.calls.length,2);assert.equal(f.scheduled.length,2);f.scheduled[1].tick();assert.equal(f.calls.length,3);f.stop();
});
test('a background mount starts no timer and hidden state suppresses a queued foreground tick',()=>{
 const f=fixture(true);assert.equal(f.scheduled.length,0);assert.equal(f.calls.length,0);
 f.visibility(false);assert.equal(f.scheduled.length,1);assert.equal(f.calls.length,1);
 f.hideWithoutEvent();f.scheduled[0].tick();assert.equal(f.calls.length,1);f.stop();assert(f.scheduled[0].cancelled);
});
test('disposal removes visibility handling and ignores stale timer callbacks',()=>{
 const f=fixture();f.stop();f.scheduled[0].tick();f.visibility(false);assert.equal(f.calls.length,0);assert.equal(f.scheduled.length,1);
});
test('a subscriber removed during immediate return refresh leaves no new timer',()=>{
 const events=new EventTarget();let hidden=true,schedules=0,stop;
 stop=watchPlanningClock(events,()=>stop(),{hidden:()=>hidden,schedule:()=>{schedules++;return()=>{}}});
 hidden=false;events.dispatchEvent(new Event('visibilitychange'));assert.equal(schedules,0);
});

test('camera cadence stays at fifteen seconds through hide, return and disposal',()=>{
 const events=new EventTarget(),tasks=[];let hidden=false,updates=0;
 const stop=watchPlanningClock(events,()=>updates++,{hidden:()=>hidden,intervalMs:15000,schedule:(tick,interval)=>{const task={tick,interval,cancelled:false};tasks.push(task);return()=>{task.cancelled=true}}});
 assert.equal(tasks[0].interval,15000);tasks[0].tick();assert.equal(updates,1);
 hidden=true;events.dispatchEvent(new Event('visibilitychange'));assert(tasks[0].cancelled);tasks[0].tick();assert.equal(updates,1);
 hidden=false;events.dispatchEvent(new Event('visibilitychange'));assert.equal(updates,2);assert.equal(tasks[1].interval,15000);
 stop();assert(tasks[1].cancelled);tasks[1].tick();assert.equal(updates,2);
});
