type Events=Pick<EventTarget,'addEventListener'|'removeEventListener'>;
type Options={visible:()=>boolean;online:()=>boolean};
// Remember a restored connection while suspended; visible return requests one
// fresh image attempt, without restarting camera or motion hardware.
export function watchPhotoReconnect(retry:()=>void,page:Events,visibility:Events,options:Options){
 let pending=false,pageHidden=false,disposed=false,wasOnline=options.online();
 const readNetwork=()=>{const online=options.online();if(!wasOnline&&online)pending=true;wasOnline=online;return online};
 const resume=()=>{if(disposed)return;const online=readNetwork();if(!pending||pageHidden||!options.visible()||!online)return;pending=false;retry()};
 const reconnect=()=>{if(disposed)return;pending=true;resume()};
 const offline=()=>{if(!disposed)wasOnline=false};
 const hide=()=>{if(disposed)return;pageHidden=true;readNetwork()};
 const show=()=>{pageHidden=false;resume()};
 page.addEventListener('online',reconnect);page.addEventListener('offline',offline);page.addEventListener('pagehide',hide);page.addEventListener('pageshow',show);visibility.addEventListener('visibilitychange',resume);
 return()=>{disposed=true;pending=false;page.removeEventListener('online',reconnect);page.removeEventListener('offline',offline);page.removeEventListener('pagehide',hide);page.removeEventListener('pageshow',show);visibility.removeEventListener('visibilitychange',resume)};
}
