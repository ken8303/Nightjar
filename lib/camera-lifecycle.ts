type Events=Pick<EventTarget,'addEventListener'|'removeEventListener'>;
type Callbacks={hidden:()=>boolean;onSuspend:()=>void;onResume:()=>void};
// Keep visibility handling for app switches; pagehide also covers history
// navigation. Resume refreshes the viewer, never restarts hardware itself.
export function watchCameraLifecycle(page:Events,visibility:Events,callbacks:Callbacks){
 let suspended=false,disposed=false,pageHidden=false;
 const suspend=()=>{if(disposed||suspended)return;suspended=true;callbacks.onSuspend()};
 const resume=()=>{if(disposed||!suspended||pageHidden||callbacks.hidden())return;suspended=false;callbacks.onResume()};
 const changed=()=>{if(callbacks.hidden())suspend();else resume()};
 const hide=()=>{pageHidden=true;suspend()};
 const show=()=>{pageHidden=false;resume()};
 page.addEventListener('pagehide',hide);page.addEventListener('pageshow',show);visibility.addEventListener('visibilitychange',changed);
 if(callbacks.hidden())suspend();
 return ()=>{disposed=true;page.removeEventListener('pagehide',hide);page.removeEventListener('pageshow',show);visibility.removeEventListener('visibilitychange',changed)};
}
