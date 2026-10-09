import {parseObservingInstant} from './observing-time';
import {serializePlannerContext,currentPlannerContextKey,recoveryPlannerContextKey} from './planner-state';
import {type Place} from './sky';
let liveContext:string|null=null;
export function savePlannerTime(date:Date,local?:Pick<Storage,'setItem'>,session?:Pick<Storage,'setItem'>,place?:Place){
 const time=JSON.stringify(date.toISOString());
 try{liveContext=place?serializePlannerContext(date,place):null}catch{liveContext=null}
 try{(local??localStorage).setItem('nightjar-observing-time',time)}catch{}
 try{(session??sessionStorage).setItem('nightjar-current-time-v1',time)}catch{}
 if(liveContext)try{(session??sessionStorage).setItem(currentPlannerContextKey,liveContext)}catch{}
}
function storedPlannerTime(source:Pick<Storage,'getItem'>,key:string){
 try{const raw=source.getItem(key);if(raw===null||raw.length>128)return null;const date=parseObservingInstant(JSON.parse(raw));return date?JSON.stringify(date.toISOString()):null}catch{return null}
}
export function preservePlannerTime(local?:Pick<Storage,'getItem'>,session?:Pick<Storage,'getItem'|'setItem'>&Partial<Pick<Storage,'removeItem'>>){
 try{
  const target=session??sessionStorage;
  if(liveContext){
   target.setItem(recoveryPlannerContextKey,liveContext);
   // The paired snapshot is sufficient for this version; keep a legacy time
   // token when possible without undoing successful context preservation.
   try{target.setItem('nightjar-recovery-time-v1',JSON.stringify(JSON.parse(liveContext).time))}catch{}
   return true;
  }
  const time=storedPlannerTime(target,'nightjar-current-time-v1')||storedPlannerTime(local??localStorage,'nightjar-observing-time');
  if(!time)return false;
  if(target.getItem(recoveryPlannerContextKey)!==null){if(target.removeItem)target.removeItem(recoveryPlannerContextKey);else target.setItem(recoveryPlannerContextKey,'null')}
  target.setItem('nightjar-recovery-time-v1',time);return true;
 }catch{return false}
}

export function reloadPlanner(){if(!preservePlannerTime())return false;window.location.reload();return true}
