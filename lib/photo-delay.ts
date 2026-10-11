type Visibility=Pick<Document,'hidden'|'addEventListener'|'removeEventListener'>;
type Events=Pick<EventTarget,'addEventListener'|'removeEventListener'>;
type Options={pageEvents?:Events;Observer?:typeof IntersectionObserver;schedule?:typeof setTimeout;cancel?:typeof clearTimeout;delay?:number;visibility?:Visibility};
export function watchPhotoDelay(element:Element,onSlow:()=>void,{Observer=globalThis.IntersectionObserver,schedule=setTimeout,cancel=clearTimeout,delay=15000,visibility=globalThis.document,pageEvents=globalThis.window}:Options={}){
 let timer:ReturnType<typeof setTimeout>|null=null,disposed=false,fired=false,observer:IntersectionObserver|undefined,intersecting=false,generation=0,pageHidden=false;
 const hidden=()=>pageHidden||Boolean(visibility?.hidden);
 const unlisten=()=>{visibility?.removeEventListener('visibilitychange',changed);pageEvents?.removeEventListener('pagehide',hide);pageEvents?.removeEventListener('pageshow',show)};
 const stop=()=>{generation++;if(timer!==null){cancel(timer);timer=null}};
 const start=()=>{if(disposed||fired||timer!==null||hidden())return;const request=++generation;timer=schedule(()=>{if(request!==generation||disposed||fired)return;timer=null;if(hidden())return;fired=true;observer?.disconnect();unlisten();onSlow()},delay)};
 const changed=()=>{if(intersecting&&!hidden())start();else stop()};
 const hide=()=>{pageHidden=true;stop()};
 const show=()=>{pageHidden=false;changed()};
 visibility?.addEventListener('visibilitychange',changed);pageEvents?.addEventListener('pagehide',hide);pageEvents?.addEventListener('pageshow',show);
 try{
  if(!Observer){intersecting=true;start()}
  else{observer=new Observer(entries=>{const entry=entries.find(entry=>entry.target===element);if(!entry)return;intersecting=entry.isIntersecting;changed()});observer.observe(element)}
 }catch{observer?.disconnect();intersecting=true;start()}
 return()=>{disposed=true;stop();observer?.disconnect();unlisten()};
}
