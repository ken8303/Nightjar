type Video=Pick<HTMLVideoElement,'paused'|'readyState'|'srcObject'|'addEventListener'|'removeEventListener'>;
// Track mute and video playback are independent. A live track can still feed a
// paused player; suppress projection until playback has usable frames again.
export function watchCameraPlayback(video:Video,onPaused:(paused:boolean)=>void){
 let last=false,disposed=false;
 const changed=(event?:Event)=>{
  if(disposed)return;
  // 'playing' allows the current frame; waiting/canplay require future data.
  const minimum=event?.type==='playing'||event?.type==='pause'?2:3;
  const paused=Boolean(video.srcObject)&&(video.paused||video.readyState<minimum);
  if(paused!==last){last=paused;onPaused(paused)}
 };
 const events=['pause','waiting','stalled','playing','canplay','emptied'] as const;
 events.forEach(name=>video.addEventListener(name,changed));changed();
 return()=>{disposed=true;events.forEach(name=>video.removeEventListener(name,changed))};
}
