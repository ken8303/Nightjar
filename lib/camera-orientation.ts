import {deviceCameraBasis,safariHeadingOffset,rotateCameraBearing,type CameraBasis} from './camera-sky';
type Events=Pick<EventTarget,'addEventListener'|'removeEventListener'>;
type Reading={basis:CameraBasis;absolute:boolean};
type Callbacks={onReading:(reading:Reading)=>void;onQuiet:(quiet:boolean)=>void;onUnavailable:(reason:'waiting'|'invalid'|'rotated'|'compass')=>void;onAbsolute:()=>void};
type Options={angle:()=>number;now?:()=>number;schedule?:(tick:()=>void)=>()=>void};
// Orientation events can be change-driven. Silence is not proof of failure:
// retain the last pose and mark it explicitly; never reuse it after rotation.
export function watchCameraOrientation(events:Events,screenEvents:Events|null,callbacks:Callbacks,options:Options){
 const now=options.now??(()=>performance.now());
 let lastReading=now(),lastRender=-Infinity,available=false,absolutePreferred=false,lastAbsolute=false,quiet=false,disposed=false;
 let compassOffset:number|null=null,lastCompass=-Infinity,safariStream=false;
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
  if(!relative){compassOffset=null;available=false;lastRender=-Infinity;setQuiet(false);callbacks.onUnavailable(safari?'compass':'invalid');return}
  const time=now();
  const correction=compass?safariHeadingOffset(event.alpha,event.beta,event.gamma,event.webkitCompassHeading!):null;
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
  const refresh=quiet||!available||sourceTransition;
  lastReading=now();available=true;setQuiet(false);
  if(!refresh&&lastReading-lastRender<80)return;
  lastRender=lastReading;callbacks.onReading({basis,absolute});
 };
 const rotated=()=>{if(disposed)return;available=false;lastReading=now();lastRender=-Infinity;setQuiet(false);callbacks.onUnavailable('rotated')};
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
 return ()=>{disposed=true;cancelTimer();events.removeEventListener('deviceorientation',read);events.removeEventListener('deviceorientationabsolute',read);events.removeEventListener('orientationchange',rotated);screenEvents?.removeEventListener('change',rotated)};
}
