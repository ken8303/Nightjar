import {deviceCameraBasis,type CameraBasis} from './camera-sky';
type Events=Pick<EventTarget,'addEventListener'|'removeEventListener'>;
type Reading={basis:CameraBasis;absolute:boolean};
type Callbacks={onReading:(reading:Reading)=>void;onQuiet:(quiet:boolean)=>void;onUnavailable:(reason:'waiting'|'invalid'|'rotated')=>void;onAbsolute:()=>void};
type Options={angle:()=>number;now?:()=>number;schedule?:(tick:()=>void)=>()=>void};
// Orientation events can be change-driven. Silence is not proof of failure:
// retain the last pose and mark it explicitly; never reuse it after rotation.
export function watchCameraOrientation(events:Events,screenEvents:Events|null,callbacks:Callbacks,options:Options){
 const now=options.now??(()=>performance.now());
 let lastReading=now(),lastRender=-Infinity,available=false,absolutePreferred=false,quiet=false,disposed=false;
 const setQuiet=(next:boolean)=>{if(quiet!==next){quiet=next;callbacks.onQuiet(next)}};
 const read=(raw:Event)=>{
  if(disposed)return;
  const event=raw as DeviceOrientationEvent;
  const absolute=event.absolute||event.type==='deviceorientationabsolute';
  if(absolutePreferred&&!absolute)return;
  const basis=deviceCameraBasis(event.alpha,event.beta,event.gamma,options.angle());
  if(!basis){available=false;lastRender=-Infinity;setQuiet(false);callbacks.onUnavailable('invalid');return}
  const changedSource=absolute&&!absolutePreferred;
  if(changedSource){absolutePreferred=true;callbacks.onAbsolute()}
  const refresh=quiet||!available||changedSource;
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
