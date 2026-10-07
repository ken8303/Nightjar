type Options={online:()=>boolean;visible:()=>boolean;now?:()=>number;intervalMs?:number;pollIntervalMs?:number;schedule?:(task:()=>void,interval:number)=>()=>void};
// Check a long-lived foreground app periodically and on return, without reloading it.
export function watchPwaUpdateChecks(update:()=>Promise<unknown>,page:EventTarget,visibility:EventTarget,options:Options){
 const now=options.now??Date.now;
 let lastCheck=now(),checking=false,stopped=false;
 async function check(){
  const time=now();
  if(stopped||checking||!options.online()||!options.visible()||time-lastCheck<(options.intervalMs??60000))return;
  lastCheck=time;checking=true;
  try{await update()}catch{/* A failed background check leaves the current app usable. */}
  finally{checking=false}
 }
 const schedule=options.schedule??((task:()=>void,interval:number)=>{const timer=setInterval(task,interval);return()=>clearInterval(timer)});
 const cancelPoll=schedule(check,options.pollIntervalMs??15*60*1000);
 page.addEventListener('online',check);page.addEventListener('pageshow',check);visibility.addEventListener('visibilitychange',check);
 return()=>{stopped=true;cancelPoll();page.removeEventListener('online',check);page.removeEventListener('pageshow',check);visibility.removeEventListener('visibilitychange',check)};
}
