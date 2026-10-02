export function preservePlannerTime(){
 try{
  const time=localStorage.getItem('nightjar-observing-time');
  if(time)sessionStorage.setItem('nightjar-recovery-time-v1',time);
 }catch{}
}

export function reloadPlanner(){preservePlannerTime();window.location.reload()}
