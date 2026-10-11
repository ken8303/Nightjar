type Options={online:()=>boolean;visible:()=>boolean;now?:()=>number;intervalMs?:number;pollIntervalMs?:number;schedule?:(task:()=>void,interval:number)=>()=>void};
// Check a long-lived foreground app periodically and on return, without reloading it.
export function watchPwaUpdateChecks(update:()=>Promise<unknown>,page:EventTarget,visibility:EventTarget,options:Options){
 const now=options.now??Date.now;
 let lastCheck=now(),checking=false,stopped=false,pageHidden=false;
 const available=()=>!stopped&&!pageHidden&&options.online()&&options.visible();
 async function check(){
  const time=now();
  if(!available()||checking||time-lastCheck<(options.intervalMs??60000))return;
  lastCheck=time;checking=true;
  try{await update()}catch{/* A failed background check leaves the current app usable. */}
  finally{checking=false}
 }
 const schedule=options.schedule??((task:()=>void,interval:number)=>{const timer=setInterval(task,interval);return()=>clearInterval(timer)});
 let cancelPoll:(()=>void)|null=null,pollGeneration=0;
 const sync=()=>{
  if(!available()){pollGeneration++;cancelPoll?.();cancelPoll=null;return}
  if(!cancelPoll){const generation=++pollGeneration;cancelPoll=schedule(()=>{if(generation===pollGeneration)void check()},options.pollIntervalMs??15*60*1000)}
 };
 const changed=()=>{sync();void check()};
 const hide=()=>{pageHidden=true;sync()};
 const show=()=>{pageHidden=false;changed()};
 page.addEventListener('online',changed);page.addEventListener('offline',changed);page.addEventListener('pagehide',hide);page.addEventListener('pageshow',show);visibility.addEventListener('visibilitychange',changed);
 sync();
 return()=>{stopped=true;sync();page.removeEventListener('online',changed);page.removeEventListener('offline',changed);page.removeEventListener('pagehide',hide);page.removeEventListener('pageshow',show);visibility.removeEventListener('visibilitychange',changed)};
}
