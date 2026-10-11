type Events=Pick<EventTarget,'addEventListener'|'removeEventListener'>;
type Options={visible:()=>boolean;online:()=>boolean};
// Remember a restored connection while suspended; visible return requests one
// fresh image attempt, without restarting camera or motion hardware.
export function watchPhotoReconnect(retry:()=>void,page:Events,visibility:Events,options:Options){
 let pending=false,pageHidden=false,disposed=false;
 const resume=()=>{if(disposed||!pending||pageHidden||!options.visible()||!options.online())return;pending=false;retry()};
 const reconnect=()=>{if(disposed)return;pending=true;resume()};
 const hide=()=>{pageHidden=true};
 const show=()=>{pageHidden=false;resume()};
 page.addEventListener('online',reconnect);page.addEventListener('pagehide',hide);page.addEventListener('pageshow',show);visibility.addEventListener('visibilitychange',resume);
 return()=>{disposed=true;pending=false;page.removeEventListener('online',reconnect);page.removeEventListener('pagehide',hide);page.removeEventListener('pageshow',show);visibility.removeEventListener('visibilitychange',resume)};
}
