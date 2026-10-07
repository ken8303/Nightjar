const localKeys=[
 'nightjar-place','nightjar-places','nightjar-targets-v1','nightjar-target-notes-v1','nightjar-equipment','nightjar-deep-targets-v1','nightjar-observing-diary-v1','nightjar-diary-drafts-v1','nightjar-imaging-draft-v1','nightjar-observing-time','nightjar-sky-view-v1','nightjar-sky-layers-v1','nightjar-camera-settings-v1','nightjar-camera-settings-v2'
] as const;
const sessionKeys=['nightjar-current-time-v1','nightjar-recovery-time-v1'] as const;
export const plannerRecoveryMaxBytes=32*1024*1024;
type Reader=Pick<Storage,'getItem'>;
export function makePlannerRecovery(local:Reader,session:Reader,now=new Date()){
 const unreadable:{area:'local'|'session';key:string}[]=[];
 let readCount=0;
 const read=(source:Reader,keys:readonly string[],area:'local'|'session')=>Object.fromEntries(keys.flatMap(key=>{
  try{const raw=source.getItem(key);if(raw!==null&&raw.length>8*1024*1024)throw Error('oversized');readCount++;return [[key,raw]]}
  catch{unreadable.push({area,key});return []}
 }));
 const stores={local:read(local,localKeys,'local'),session:read(session,sessionKeys,'session')};
 if(!readCount)throw Error('Browser storage could not be read. Keep this view open and restore storage access before trying again.');
 const recovery={format:'nightjar-raw-recovery',version:1,exportedAt:now.toISOString(),notice:'Exact stored values for manual recovery. This is not a Nightjar plan backup and cannot be imported directly. Missing keys are null; unreadable keys are listed separately. Values may contain private sites, notes and unfinished forms.',stores,unreadable};
 const text=JSON.stringify(recovery,null,2);
 if(new TextEncoder().encode(text).length>plannerRecoveryMaxBytes)throw Error('The recovery copy is too large to prepare safely. Existing storage has not been changed.');
 return {text,exportedAt:recovery.exportedAt,unreadable};
}
