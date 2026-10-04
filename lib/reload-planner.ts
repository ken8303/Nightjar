export function savePlannerTime(date:Date,local?:Pick<Storage,'setItem'>,session?:Pick<Storage,'setItem'>){
 const time=JSON.stringify(date.toISOString());
 try{(local??localStorage).setItem('nightjar-observing-time',time)}catch{}
 try{(session??sessionStorage).setItem('nightjar-current-time-v1',time)}catch{}
}
export function preservePlannerTime(local?:Pick<Storage,'getItem'>,session?:Pick<Storage,'getItem'|'setItem'>){
 try{
  const target=session??sessionStorage;
  let time=target.getItem('nightjar-current-time-v1');
  if(!time){try{time=(local??localStorage).getItem('nightjar-observing-time')}catch{}}
  if(time)target.setItem('nightjar-recovery-time-v1',time);
 }catch{}
}

export function reloadPlanner(){preservePlannerTime();window.location.reload()}
