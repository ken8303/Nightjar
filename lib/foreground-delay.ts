type Events=Pick<EventTarget,'addEventListener'|'removeEventListener'>;
type Options={hidden:()=>boolean;delay?:number;schedule?:typeof setTimeout;cancel?:typeof clearTimeout};
// A suspended page has not had a usable loading window. Give it a fresh
// deadline on return, and reject callbacks from a cancelled countdown.
export function watchForegroundDelay(onDelay:()=>void,page:Events,visibility:Events,{hidden,delay=15000,schedule=setTimeout,cancel=clearTimeout}:Options){
 let timer:ReturnType<typeof setTimeout>|null=null,generation=0,pageHidden=false,disposed=false,fired=false;
 const unavailable=()=>pageHidden||hidden();
 const stop=()=>{generation++;if(timer!==null){cancel(timer);timer=null}};
 const unlisten=()=>{page.removeEventListener('pagehide',hide);page.removeEventListener('pageshow',show);visibility.removeEventListener('visibilitychange',changed)};
 const start=()=>{if(disposed||fired||timer!==null||unavailable())return;const request=++generation;timer=schedule(()=>{if(disposed||fired||request!==generation)return;timer=null;if(unavailable())return;fired=true;unlisten();onDelay()},delay)};
 const changed=()=>{if(unavailable())stop();else start()};
 const hide=()=>{pageHidden=true;stop()};
 const show=()=>{pageHidden=false;changed()};
 page.addEventListener('pagehide',hide);page.addEventListener('pageshow',show);visibility.addEventListener('visibilitychange',changed);start();
 return()=>{disposed=true;stop();unlisten()};
}
