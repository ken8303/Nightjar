import {deviceCameraBasis,safariHeadingOffset,rotateCameraBearing,type CameraBasis} from './camera-sky';
type Events=Pick<EventTarget,'addEventListener'|'removeEventListener'>;
export type CameraOrientationReading={basis:CameraBasis;absolute:boolean;needsNorthAnchor?:boolean;northReference?:'magnetic';compassAccuracy?:number};
type Reading=CameraOrientationReading;
type Callbacks={onReading:(reading:Reading)=>void;onQuiet:(quiet:boolean)=>void;onUnavailable:(reason:'waiting'|'invalid'|'rotated'|'compass')=>void;onAbsolute:()=>void;onRelative:()=>void};
type Options={angle:()=>number;now?:()=>number;schedule?:(tick:()=>void)=>()=>void;defer?:(tick:()=>void,delay:number)=>()=>void};
// Orientation events can be change-driven. Silence is not proof of failure:
// retain the last pose and mark it explicitly; never reuse it after rotation.
export function watchCameraOrientation(events:Events,screenEvents:Events|null,callbacks:Callbacks,options:Options){
 const now=options.now??(()=>performance.now());
 let lastReading=now(),lastRender=-Infinity,available=false,absolutePreferred=false,lastAbsolute=false,quiet=false,disposed=false;
 let compassOffset:number|null=null,lastCompass=-Infinity,safariStream=false,verticalCompass=false;
 const defer=options.defer??((callback,delay)=>{const timer=setTimeout(callback,delay);return()=>clearTimeout(timer)});
 let pending:Reading|null=null,cancelPending:(()=>void)|null=null;
 const clearPending=()=>{cancelPending?.();cancelPending=null;pending=null};
 const emit=(reading:Reading)=>{lastRender=now();callbacks.onReading(reading)};
 const setQuiet=(next:boolean)=>{if(quiet!==next){quiet=next;callbacks.onQuiet(next)}};
 const read=(raw:Event)=>{
  if(disposed)return;
  const event=raw as DeviceOrientationEvent & {webkitCompassHeading?:number;webkitCompassAccuracy?:number};
  if(typeof event.webkitCompassHeading==='number')safariStream=true;
  // Safari can temporarily omit compass fields while still delivering gyro
  // poses on its primary stream. Keep treating those as compass dropouts.
  const safari=typeof event.webkitCompassHeading==='number'||(safariStream&&event.type==='deviceorientation');
  // Some browsers emit both streams. Once absolute data is preferred, a
  // secondary relative event must not clear its pose or refresh its quiet timer.
  if(absolutePreferred&&!safari&&!event.absolute&&event.type!=='deviceorientationabsolute')return;
  const compass=safari&&Number.isFinite(event.webkitCompassHeading)&&event.webkitCompassHeading!>=0&&event.webkitCompassHeading!<360&&Number.isFinite(event.webkitCompassAccuracy)&&event.webkitCompassAccuracy!>=0;
  const relative=deviceCameraBasis(event.alpha,event.beta,event.gamma,options.angle());
  if(!relative){clearPending();compassOffset=null;verticalCompass=false;available=false;lastRender=-Infinity;setQuiet(false);callbacks.onUnavailable(safari?'compass':'invalid');return}
  const time=now();
  // Heading becomes unstable as the device top edge approaches vertical.
  // Resume correction farther from that cutoff than where we suspend it.
  if(safari){
   const device=deviceCameraBasis(event.alpha,event.beta,event.gamma,0)!;
   const horizontal=Math.hypot(device.up[0],device.up[1]);
   if(horizontal<.1)verticalCompass=true;
   else if(horizontal>=.2)verticalCompass=false;
  }
  const correction=compass&&!verticalCompass?safariHeadingOffset(event.alpha,event.beta,event.gamma,event.webkitCompassHeading!):null;
  if(correction!==null)compassOffset=correction;
  if(compass)lastCompass=time;
  // The device top edge has no stable horizontal heading when upright.
  // Keep the north correction, but use each fresh gyro pose (never a frozen pose).
  // A failed compass reading gets only a brief 500 ms grace period.
  const anchored=safari&&compassOffset!==null&&(compass||time-lastCompass<=500);
  const absolute=safari?anchored:event.absolute||event.type==='deviceorientationabsolute';
  if(absolutePreferred&&!absolute&&!safari)return;
  const basis=anchored?rotateCameraBearing(relative,compassOffset!):relative;
  const changedSource=absolute&&!lastAbsolute;
  const sourceTransition=absolute!==lastAbsolute;lastAbsolute=absolute;
  if(changedSource){absolutePreferred=true;callbacks.onAbsolute()}
  // A correction calibrated against north cannot be reused against raw gyro
  // bearings. Clear it before delivering the first relative fallback pose.
  else if(sourceTransition)callbacks.onRelative();
  const refresh=quiet||!available||sourceTransition;
  lastReading=now();available=true;setQuiet(false);
  const reading:Reading={basis,absolute,...(safari&&anchored?{northReference:'magnetic' as const,...(compass?{compassAccuracy:event.webkitCompassAccuracy!}:{})}:{}),...(safari&&compass&&compassOffset===null&&verticalCompass?{needsNorthAnchor:true}:{})};
  // Coalesce busy sensor events, but deliver the final pose even if the phone
  // stops moving before another event arrives. Never replay it after invalidation.
  if(!refresh&&lastReading-lastRender<80){
   pending=reading;
   if(!cancelPending)cancelPending=defer(()=>{
    const latest=pending;cancelPending=null;pending=null;
    if(!disposed&&available&&latest)emit(latest);
   },80-(lastReading-lastRender));
   return;
  }
  clearPending();emit(reading);
 };
 const rotated=()=>{if(disposed)return;clearPending();available=false;lastReading=now();lastRender=-Infinity;setQuiet(false);callbacks.onUnavailable('rotated')};
 let warned=false;
 const tick=()=>{
  if(disposed)return;
  if(now()-lastReading<4000){warned=false;return}
  if(available)setQuiet(true);
  else if(!warned){warned=true;callbacks.onUnavailable('waiting')}
 };
 const schedule=options.schedule??(callback=>{const timer=setInterval(callback,1000);return()=>clearInterval(timer)});
 events.addEventListener('deviceorientation',read);events.addEventListener('deviceorientationabsolute',read);events.addEventListener('orientationchange',rotated);screenEvents?.addEventListener('change',rotated);
 const cancelTimer=schedule(tick);
 return ()=>{disposed=true;clearPending();cancelTimer();events.removeEventListener('deviceorientation',read);events.removeEventListener('deviceorientationabsolute',read);events.removeEventListener('orientationchange',rotated);screenEvents?.removeEventListener('change',rotated)};
}
