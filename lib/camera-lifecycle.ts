type Events=Pick<EventTarget,'addEventListener'|'removeEventListener'>;
type Callbacks={hidden:()=>boolean;onSuspend:()=>void;onResume:()=>void};
// Keep visibility handling for app switches; pagehide also covers history
// navigation. Resume refreshes the viewer, never restarts hardware itself.
export function watchCameraLifecycle(page:Events,visibility:Events,callbacks:Callbacks){
 let suspended=false,disposed=false;
 const suspend=()=>{if(disposed||suspended)return;suspended=true;callbacks.onSuspend()};
 const resume=()=>{if(disposed||!suspended||callbacks.hidden())return;suspended=false;callbacks.onResume()};
 const changed=()=>{if(callbacks.hidden())suspend();else resume()};
 page.addEventListener('pagehide',suspend);page.addEventListener('pageshow',resume);visibility.addEventListener('visibilitychange',changed);
 if(callbacks.hidden())suspend();
 return ()=>{disposed=true;page.removeEventListener('pagehide',suspend);page.removeEventListener('pageshow',resume);visibility.removeEventListener('visibilitychange',changed)};
}
