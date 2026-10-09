const localKeys=[
 'nightjar-place','nightjar-places','nightjar-targets-v1','nightjar-target-notes-v1','nightjar-equipment','nightjar-deep-targets-v1','nightjar-observing-diary-v1','nightjar-diary-drafts-v1','nightjar-imaging-draft-v1','nightjar-observing-time','nightjar-sky-view-v1','nightjar-sky-layers-v1','nightjar-camera-settings-v1','nightjar-camera-settings-v2'
];
const sessionKeys=['nightjar-current-time-v1','nightjar-recovery-time-v1','nightjar-current-context-v1','nightjar-recovery-context-v1'];
export const plannerRecoveryMaxBytes=32*1024*1024;
// Count JSON's escaped UTF-8 representation without allocating an oversized
// serialized copy. Lone surrogates are escaped by well-formed JSON.stringify.
/** @param {string} value @param {number} limit */
function stringBytes(value,limit){
 let bytes=2;
 for(let index=0;index<value.length;index++){
  const code=value.charCodeAt(index);
  if(code===34||code===92)bytes+=2;
  else if(code<32)bytes+=(code===8||code===9||code===10||code===12||code===13)?2:6;
  else if(code<128)bytes++;
  else if(code<2048)bytes+=2;
  else if(code>=0xd800&&code<=0xdbff){const next=value.charCodeAt(index+1);if(next>=0xdc00&&next<=0xdfff){bytes+=4;index++}else bytes+=6}
  else bytes+=code>=0xdc00&&code<=0xdfff?6:3;
  if(bytes>limit)return bytes;
 }
 return bytes;
}
/** @param {{getItem:(key:string)=>string|null}} local
 * @param {{getItem:(key:string)=>string|null}} session
 * @param {Date} [now] */
export function makePlannerRecovery(local,session,now=new Date()){
 /** @type {{area:'local'|'session',key:string}[]} */
 const unreadable=[];
 let readCount=0;
 /** @param {{getItem:(key:string)=>string|null}} source
  * @param {readonly string[]} keys
  * @param {'local'|'session'} area */
 const read=(source,keys,area)=>Object.fromEntries(keys.flatMap(key=>{
  try{const raw=source.getItem(key);if(raw!==null&&raw.length>8*1024*1024)throw Error('oversized');readCount++;return [[key,raw]]}
  catch{unreadable.push({area,key});return []}
 }));
 const stores={local:read(local,localKeys,'local'),session:read(session,sessionKeys,'session')};
 if(!readCount)throw Error('Browser storage could not be read. Keep this view open and restore storage access before trying again.');
 const recovery={format:'nightjar-raw-recovery',version:1,exportedAt:now.toISOString(),notice:'Exact stored values for manual recovery. This is not a Nightjar plan backup and cannot be imported directly. Missing keys are null; unreadable keys are listed separately. Values may contain private sites, notes and unfinished forms.',stores,unreadable};
 const empty=area=>Object.fromEntries(Object.keys(stores[area]).map(key=>[key,null]));
 let bytes=new TextEncoder().encode(JSON.stringify({...recovery,stores:{local:empty('local'),session:empty('session')}},null,2)).length;
 for(const raw of [...Object.values(stores.local),...Object.values(stores.session)])if(typeof raw==='string'){
  bytes+=stringBytes(raw,plannerRecoveryMaxBytes-bytes+4)-4;
  if(bytes>plannerRecoveryMaxBytes)throw Error('The recovery copy is too large to prepare safely. Existing storage has not been changed.');
 }
 const text=JSON.stringify(recovery,null,2);
 return {text,exportedAt:recovery.exportedAt,unreadable};
}
