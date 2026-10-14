export const viewingModeKey='nightjar-red-light';
type Source=Pick<Storage,'getItem'>;
// Storage events are queued. Read the current preference instead of replaying
// an older newValue, and keep the visit's display if storage is unavailable.
export function readViewingModeChange(event:{key:string|null;storageArea:Source|null},source:()=>Source=()=>localStorage):boolean|null{
 if(event.key!==viewingModeKey&&event.key!==null)return null;
 try{const storage=source();return event.storageArea===storage?storage.getItem(viewingModeKey)==='on':null}catch{return null}
}
