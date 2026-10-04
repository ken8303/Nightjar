import {type Place} from './sky';
import {validPlace} from './planner-state';
import {type Equipment,validEquipment} from './photography';

export type SavedPlan={places:Place[];targets:string[];notes:Record<string,string>;equipment:Equipment[]};
export type PlannerBackup={format:'nightjar-backup';version:1;exportedAt:string;data:SavedPlan};
const keys=['nightjar-places','nightjar-targets-v1','nightjar-target-notes-v1','nightjar-equipment'] as const;
type StorageAccess=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
const record=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
const name=(value:unknown):value is string=>typeof value==='string'&&value.trim().length>0&&value.length<=100&&!['__proto__','constructor','prototype'].includes(value);
function plan(value:unknown):SavedPlan{
 if(!record(value)||!Array.isArray(value.places)||value.places.length>100||!value.places.every(validPlace)||!Array.isArray(value.targets)||value.targets.length>39||!value.targets.every(name)||!record(value.notes)||Object.keys(value.notes).length>100||!Object.entries(value.notes).every(([key,text])=>name(key)&&typeof text==='string'&&text.length<=2000)||!Array.isArray(value.equipment)||value.equipment.length>100||!value.equipment.every(validEquipment))throw Error('This backup contains invalid saved plans. Nothing has been imported.');
 return {
  places:value.places.map(p=>({name:p.name,latitude:p.latitude,longitude:p.longitude,...(p.country!==undefined?{country:p.country}:{}),...(p.timezone!==undefined?{timezone:p.timezone}:{}),...(p.bortle!==undefined?{bortle:p.bortle}:{})})),
  targets:[...new Set(value.targets)],notes:Object.fromEntries(Object.entries(value.notes).map(([key,text])=>[key,text as string])),
  equipment:value.equipment.map(e=>({name:e.name,width:e.width,height:e.height,focal:e.focal,pixel:e.pixel}))
 };
}
export function parsePlannerBackup(text:string):PlannerBackup{
 if(new TextEncoder().encode(text).length>1024*1024)throw Error('Choose a Nightjar backup smaller than 1 MB.');
 let raw:unknown;try{raw=JSON.parse(text)}catch{throw Error('This file is not valid JSON. Choose a Nightjar backup file.')}
 if(!record(raw)||raw.format!=='nightjar-backup'||raw.version!==1||typeof raw.exportedAt!=='string'||!Number.isFinite(+new Date(raw.exportedAt)))throw Error('This is not a supported Nightjar backup. Nothing has been imported.');
 return {format:'nightjar-backup',version:1,exportedAt:raw.exportedAt,data:plan(raw.data)};
}
export function readSavedPlan(storage:StorageAccess):SavedPlan{
 try{return plan({places:JSON.parse(storage.getItem(keys[0])||'[]'),targets:JSON.parse(storage.getItem(keys[1])||'[]'),notes:JSON.parse(storage.getItem(keys[2])||'{}'),equipment:JSON.parse(storage.getItem(keys[3])||'[]')})}
 catch{throw Error('Saved plans could not be read. Your existing data has not been changed.')}
}
export function makePlannerBackup(storage:StorageAccess,now=new Date()):PlannerBackup{return parsePlannerBackup(JSON.stringify({format:'nightjar-backup',version:1,exportedAt:now.toISOString(),data:readSavedPlan(storage)}))}
export function mergeSavedPlans(existing:SavedPlan,incoming:SavedPlan):SavedPlan{
 const places=[...existing.places];for(const p of incoming.places)if(!places.some(site=>Math.abs(site.latitude-p.latitude)<.0001&&Math.abs(site.longitude-p.longitude)<.0001))places.push(p);
 const equipment=[...existing.equipment];for(const e of incoming.equipment)if(!equipment.some(setup=>setup.name.trim()===e.name.trim()))equipment.push(e);
 return plan({places,equipment,targets:[...new Set([...existing.targets,...incoming.targets])],notes:{...incoming.notes,...existing.notes}});
}
export function previewPlannerMerge(existing:SavedPlan,incoming:SavedPlan){
 const merged=mergeSavedPlans(existing,incoming);
 const different=(a:unknown,b:unknown)=>JSON.stringify(a)!==JSON.stringify(b);
 return {
  merged,
  added:{places:merged.places.length-existing.places.length,targets:merged.targets.length-existing.targets.length,notes:Object.keys(merged.notes).length-Object.keys(existing.notes).length,equipment:merged.equipment.length-existing.equipment.length},
  kept:{
   places:incoming.places.flatMap(site=>{const saved=existing.places.find(p=>Math.abs(site.latitude-p.latitude)<.0001&&Math.abs(site.longitude-p.longitude)<.0001);return saved&&different(saved,site)?[saved.name]:[]}),
   notes:Object.keys(incoming.notes).filter(key=>Object.hasOwn(existing.notes,key)&&existing.notes[key]!==incoming.notes[key]),
   equipment:incoming.equipment.flatMap(setup=>{const saved=existing.equipment.find(e=>setup.name.trim()===e.name.trim());return saved&&different(saved,setup)?[saved.name]:[]})
  }
 };
}
export function restorePlannerBackup(storage:StorageAccess,backup:PlannerBackup):SavedPlan{
 // Revalidate even when called outside the file picker, and read the latest
 // local data so imports preserve edits made after the preview was opened.
 const incoming=plan(backup.data),merged=mergeSavedPlans(readSavedPlan(storage),incoming);
 const previous=keys.map(key=>storage.getItem(key));
 const values=[merged.places,merged.targets,merged.notes,merged.equipment].map(value=>JSON.stringify(value));
 let written=0;
 try{for(let i=0;i<keys.length;i++){storage.setItem(keys[i],values[i]);written++}}
 catch{
  let rollbackFailed=false;
  for(let i=0;i<written;i++){try{const value=previous[i];if(value===null)storage.removeItem(keys[i]);else storage.setItem(keys[i],value)}catch{rollbackFailed=true}}
  throw Error(rollbackFailed?'Storage failed and some changes could not be undone. Keep your backup file and check your saved plans.':'This browser could not save the imported plans. Your existing data has not been changed.');
 }
 return merged;
}
