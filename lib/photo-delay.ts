type Visibility=Pick<Document,'hidden'|'addEventListener'|'removeEventListener'>;
type Options={Observer?:typeof IntersectionObserver;schedule?:typeof setTimeout;cancel?:typeof clearTimeout;delay?:number;visibility?:Visibility};
export function watchPhotoDelay(element:Element,onSlow:()=>void,{Observer=globalThis.IntersectionObserver,schedule=setTimeout,cancel=clearTimeout,delay=15000,visibility=globalThis.document}:Options={}){
 let timer:ReturnType<typeof setTimeout>|null=null,disposed=false,fired=false,observer:IntersectionObserver|undefined,intersecting=false,generation=0;
 const stop=()=>{generation++;if(timer!==null){cancel(timer);timer=null}};
 const start=()=>{if(disposed||fired||timer!==null||visibility?.hidden)return;const request=++generation;timer=schedule(()=>{if(request!==generation||disposed||fired)return;timer=null;if(visibility?.hidden)return;fired=true;observer?.disconnect();visibility?.removeEventListener('visibilitychange',changed);onSlow()},delay)};
 const changed=()=>{if(intersecting&&!visibility?.hidden)start();else stop()};
 visibility?.addEventListener('visibilitychange',changed);
 try{
  if(!Observer){intersecting=true;start()}
  else{observer=new Observer(entries=>{const entry=entries.find(entry=>entry.target===element);if(!entry)return;intersecting=entry.isIntersecting;changed()});observer.observe(element)}
 }catch{observer?.disconnect();intersecting=true;start()}
 return()=>{disposed=true;stop();observer?.disconnect();visibility?.removeEventListener('visibilitychange',changed)};
}
