type Options={online:()=>boolean;visible:()=>boolean;now?:()=>number;intervalMs?:number};
// Returning to a long-lived app should check for a newer worker without reloading it.
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
 page.addEventListener('online',check);page.addEventListener('pageshow',check);visibility.addEventListener('visibilitychange',check);
 return()=>{stopped=true;page.removeEventListener('online',check);page.removeEventListener('pageshow',check);visibility.removeEventListener('visibilitychange',check)};
}
