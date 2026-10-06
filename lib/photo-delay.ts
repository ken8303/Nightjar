type Options={Observer?:typeof IntersectionObserver;schedule?:typeof setTimeout;cancel?:typeof clearTimeout;delay?:number};
export function watchPhotoDelay(element:Element,onSlow:()=>void,{Observer=globalThis.IntersectionObserver,schedule=setTimeout,cancel=clearTimeout,delay=15000}:Options={}){
 let timer:ReturnType<typeof setTimeout>|null=null,disposed=false,fired=false,observer:IntersectionObserver|undefined;
 const stop=()=>{if(timer!==null){cancel(timer);timer=null}};
 const start=()=>{if(disposed||fired||timer!==null)return;timer=schedule(()=>{timer=null;if(disposed||fired)return;fired=true;observer?.disconnect();onSlow()},delay)};
 try{
  if(!Observer)start();
  else{observer=new Observer(entries=>{const entry=entries.find(entry=>entry.target===element);if(!entry)return;if(entry.isIntersecting)start();else stop()});observer.observe(element)}
 }catch{observer?.disconnect();start()}
 return()=>{disposed=true;stop();observer?.disconnect()};
}
