import {parseObservingInstant} from './observing-time';
export function savePlannerTime(date:Date,local?:Pick<Storage,'setItem'>,session?:Pick<Storage,'setItem'>){
 const time=JSON.stringify(date.toISOString());
 try{(local??localStorage).setItem('nightjar-observing-time',time)}catch{}
 try{(session??sessionStorage).setItem('nightjar-current-time-v1',time)}catch{}
}
function storedPlannerTime(source:Pick<Storage,'getItem'>,key:string){
 try{const raw=source.getItem(key);if(raw===null||raw.length>128)return null;const date=parseObservingInstant(JSON.parse(raw));return date?JSON.stringify(date.toISOString()):null}catch{return null}
}
export function preservePlannerTime(local?:Pick<Storage,'getItem'>,session?:Pick<Storage,'getItem'|'setItem'>){
 try{
  const target=session??sessionStorage;
  const time=storedPlannerTime(target,'nightjar-current-time-v1')||storedPlannerTime(local??localStorage,'nightjar-observing-time');
  if(!time)return false;
  target.setItem('nightjar-recovery-time-v1',time);return true;
 }catch{return false}
}

export function reloadPlanner(){if(!preservePlannerTime())return false;window.location.reload();return true}
