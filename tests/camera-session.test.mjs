import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {createCameraSession}=await vite.ssrLoadModule('/lib/camera-session.ts');
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}}
class Track extends EventTarget{
 muted=false;readyState='live';stops=0;
 stop(){this.stops++;this.readyState='ended';this.dispatchEvent(new Event('ended'))}
 mute(value){this.muted=value;this.dispatchEvent(new Event(value?'mute':'unmute'))}
 end(){this.readyState='ended';this.dispatchEvent(new Event('ended'))}
}
function stream(count=1){const tracks=Array.from({length:count},()=>new Track());return {getTracks:()=>tracks,getVideoTracks:()=>tracks,tracks}}
function harness(){
 const events={states:[],paused:[],errors:[],ended:0,attached:null};
 const session=createCameraSession({attach:value=>events.attached=value,onState:value=>events.states.push(value),onPaused:value=>events.paused.push(value),onError:error=>events.errors.push(error),onEnded:()=>events.ended++});
 return {session,events};
}
test('a permission grant after cancellation stops every track without attaching or playing',async()=>{
 const {session,events}=harness(),permission=deferred(),late=stream(2);let plays=0;
 const attempt=session.start(()=>permission.promise,async()=>{plays++});session.stop();
 permission.resolve(late);assert.equal(await attempt,'cancelled');
 assert.equal(plays,0);assert.equal(events.attached,null);assert.equal(events.states.at(-1),'off');assert(late.tracks.every(track=>track.stops===1));assert.equal(events.ended,0);
});
test('an old permission request cannot replace a newer active camera',async()=>{
 const {session,events}=harness(),oldPermission=deferred(),old=stream(),current=stream();
 const attempt=session.start(()=>oldPermission.promise,async()=>{});
 assert.equal(await session.start(async()=>current,async()=>{}),'started');
 oldPermission.resolve(old);assert.equal(await attempt,'cancelled');
 assert.equal(events.attached,current);assert.equal(events.states.at(-1),'on');assert.equal(current.tracks[0].stops,0);assert.equal(old.tracks[0].stops,1);session.stop();
});
test('cancelled playback cannot clear a newer stream when its rejection arrives',async()=>{
 const {session,events}=harness(),play=deferred(),old=stream(),current=stream();
 const attempt=session.start(async()=>old,()=>play.promise);await Promise.resolve();
 assert.equal(events.attached,old);session.stop();
 await session.start(async()=>current,async()=>{});play.reject(Error('Old playback aborted'));
 assert.equal(await attempt,'cancelled');assert.equal(events.attached,current);assert.equal(events.errors.length,0);assert.equal(current.tracks[0].stops,0);session.stop();
});
test('current acquisition and playback failures release the camera and report recovery',async()=>{
 const {session,events}=harness(),denied={name:'NotAllowedError'};
 assert.equal(await session.start(async()=>{throw denied},async()=>{}),'failed');assert.equal(events.errors[0],denied);assert.equal(session.hasStream(),false);
 const active=stream(),failed=Error('Playback failed');
 assert.equal(await session.start(async()=>active,async()=>{throw failed}),'failed');
 assert.equal(active.tracks[0].stops,1);assert.equal(events.attached,null);assert.equal(events.states.at(-1),'off');assert.equal(events.errors[1],failed);
});
test('muted camera tracks pause the overlay until all tracks resume; stopped sessions ignore events',async()=>{
 const {session,events}=harness(),active=stream(2);await session.start(async()=>active,async()=>{});
 active.tracks[0].mute(true);assert.equal(events.paused.at(-1),true);
 active.tracks[1].mute(true);active.tracks[0].mute(false);assert.equal(events.paused.at(-1),true);
 active.tracks[1].mute(false);assert.equal(events.paused.at(-1),false);
 session.stop();const count=events.paused.length;active.tracks[0].mute(true);active.tracks[0].end();
 assert.equal(events.paused.length,count);assert.equal(events.ended,0);assert(active.tracks.every(track=>track.stops===1));
});
test('natural camera end closes the active session once and prevents playback from reviving it',async()=>{
 const {session,events}=harness(),active=stream(2),play=deferred();
 const attempt=session.start(async()=>active,()=>play.promise);await Promise.resolve();active.tracks[0].end();
 play.resolve();assert.equal(await attempt,'cancelled');assert.equal(events.ended,1);assert.equal(events.states.at(-1),'off');assert.equal(events.attached,null);assert(active.tracks.every(track=>track.stops===1));
});
test('hidden and disposed viewers cannot attach or start a granted stream',async()=>{
 const {session,events}=harness(),hidden=stream();
 assert.equal(await session.start(async()=>hidden,async()=>assert.fail('Cannot play while hidden'),()=>false),'cancelled');assert.equal(hidden.tracks[0].stops,1);assert.equal(events.attached,null);
 const permission=deferred(),late=stream();const attempt=session.start(()=>permission.promise,async()=>{});
 session.stop(false);const states=events.states.length,pauses=events.paused.length;
 permission.resolve(late);assert.equal(await attempt,'cancelled');assert.equal(late.tracks[0].stops,1);assert.equal(events.states.length,states);assert.equal(events.paused.length,pauses);
});

test('initially muted streams stay paused and a hidden viewer cannot finish pending playback',async()=>{
 const {session,events}=harness(),active=stream(),play=deferred();let visible=true;
 active.tracks[0].muted=true;
 const attempt=session.start(async()=>active,()=>play.promise,()=>visible);await Promise.resolve();
 assert.equal(events.paused.at(-1),true);assert.equal(events.states.at(-1),'starting');
 visible=false;play.resolve();assert.equal(await attempt,'cancelled');
 assert.equal(events.states.at(-1),'off');assert.equal(events.attached,null);assert.equal(active.tracks[0].stops,1);
});
