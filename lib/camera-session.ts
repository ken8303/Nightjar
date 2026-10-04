import {stopCameraStream} from './camera-sky';
type Callbacks={
 attach:(stream:MediaStream|null)=>void;
 onState:(state:'off'|'starting'|'on')=>void;
 onPaused:(paused:boolean)=>void;
 onError:(error:unknown)=>void;
 onEnded:()=>void;
};
// Own streams and listeners together. A cancelled permission/playback promise
// cannot attach a stream or change a newer session's UI.
export function createCameraSession(callbacks:Callbacks){
 let generation=0,active:MediaStream|null=null;
 let removeListeners=()=>{};
 function stop(notify=true){
  generation++;removeListeners();removeListeners=()=>{};
  const stream=active;active=null;stopCameraStream(stream);callbacks.attach(null);
  if(notify){callbacks.onPaused(false);callbacks.onState('off')}
 }
 async function start(acquire:()=>Promise<MediaStream>,play:()=>Promise<void>,canUse=()=>true){
  stop();const request=generation;callbacks.onState('starting');
  try{
   const stream=await acquire();
   if(request!==generation){stopCameraStream(stream);return 'cancelled' as const}
   if(!canUse()){stopCameraStream(stream);stop();return 'cancelled' as const}
   active=stream;
   const tracks=stream.getVideoTracks();
   const current=()=>request===generation&&active===stream;
   const ended=()=>{if(!current())return;stop();callbacks.onEnded()};
   const paused=()=>{if(current())callbacks.onPaused(tracks.some(track=>track.muted))};
   removeListeners=()=>tracks.forEach(track=>{track.removeEventListener('ended',ended);track.removeEventListener('mute',paused);track.removeEventListener('unmute',paused)});
   tracks.forEach(track=>{track.addEventListener('ended',ended);track.addEventListener('mute',paused);track.addEventListener('unmute',paused)});
   if(!tracks.length||tracks.some(track=>track.readyState==='ended')){ended();return 'cancelled' as const}
   callbacks.attach(stream);paused();await play();
   if(!current())return 'cancelled' as const;
   if(!canUse()){stop();return 'cancelled' as const}
   callbacks.onState('on');return 'started' as const;
  }catch(error){
   if(request!==generation)return 'cancelled' as const;
   stop();callbacks.onError(error);return 'failed' as const;
  }
 }
 return {start,stop,hasStream:()=>active!==null};
}
