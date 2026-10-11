type Events=Pick<EventTarget,'addEventListener'|'removeEventListener'>;
// Saved observations can change while a mobile page is suspended. Reread
// on return without replacing the separately managed unfinished forms.
export function watchDiaryRefresh(read:()=>void,page:Events,visibility:Events,options:{storage:()=>Storage;key:string;hidden:()=>boolean}){
 let disposed=false,pageHidden=false;
 const refresh=()=>{if(!disposed&&!pageHidden&&!options.hidden())read()};
 const stored=(event:Event)=>{const change=event as StorageEvent;if(change.key!==options.key&&change.key!==null)return;try{if(change.storageArea===options.storage())refresh()}catch{refresh()}};
 const hide=()=>{pageHidden=true};
 const show=()=>{pageHidden=false;refresh()};
 page.addEventListener('storage',stored);page.addEventListener('pagehide',hide);page.addEventListener('pageshow',show);visibility.addEventListener('visibilitychange',refresh);
 return()=>{disposed=true;page.removeEventListener('storage',stored);page.removeEventListener('pagehide',hide);page.removeEventListener('pageshow',show);visibility.removeEventListener('visibilitychange',refresh)};
}
