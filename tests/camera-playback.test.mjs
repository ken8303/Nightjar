import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {watchCameraPlayback}=await vite.ssrLoadModule('/lib/camera-playback.ts');
class Video extends EventTarget{
 srcObject=null;paused=true;readyState=0;
 send(type,values={}){Object.assign(this,values);this.dispatchEvent(new Event(type))}
}
test('a live stream with stopped playback pauses until current frames are playing again',()=>{
 const video=new Video(),calls=[];const stop=watchCameraPlayback(video,value=>calls.push(value));
 video.send('playing',{srcObject:{},paused:false,readyState:4});assert.deepEqual(calls,[]);
 video.send('pause',{paused:true});assert.deepEqual(calls,[true]);
 video.send('canplay',{readyState:4});assert.deepEqual(calls,[true]);
 video.send('playing',{paused:false,readyState:2});assert.deepEqual(calls,[true,false]);stop();
});
test('waiting and stalled frames suppress labels without duplicate updates or trusting stale events',()=>{
 const video=new Video(),calls=[];Object.assign(video,{srcObject:{},paused:false,readyState:4});
 const stop=watchCameraPlayback(video,value=>calls.push(value));
 video.send('waiting',{readyState:2});video.send('stalled');assert.deepEqual(calls,[true]);
 video.send('canplay',{readyState:3});assert.deepEqual(calls,[true,false]);
 // A queued pause/wait event must not stop a player that has already recovered.
 video.send('pause');video.send('waiting');assert.deepEqual(calls,[true,false]);
 video.send('playing',{readyState:2});video.send('pause');assert.deepEqual(calls,[true,false]);stop();
});
test('camera detach clears playback suspension and disposal ignores later media events',()=>{
 const video=new Video(),calls=[];Object.assign(video,{srcObject:{},paused:true,readyState:4});
 const stop=watchCameraPlayback(video,value=>calls.push(value));assert.deepEqual(calls,[true]);
 video.send('emptied',{srcObject:null,readyState:0});assert.deepEqual(calls,[true,false]);
 stop();video.send('pause',{srcObject:{},paused:true});assert.deepEqual(calls,[true,false]);
});
