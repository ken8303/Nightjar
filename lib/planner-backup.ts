import {diaryKey,diaryLimit,normalizeDiary,mergeDiary,type Observation} from './observing-diary';
import {deepSkyListKey,validDeepSkyList} from './deep-sky-list';
import {type Place,skyTargetLimit} from './sky';
import {validPlace} from './planner-state';
import {type Equipment,validEquipment} from './photography';
import {savedPlacesLimit,equipmentProfilesLimit} from './saved-collections';

export const plannerBackupMaxBytes=5*1024*1024;
export type SavedPlan={places:Place[];targets:string[];notes:Record<string,string>;equipment:Equipment[];deepTargets?:string[];diary?:Observation[]};
export type PlannerBackup={format:'nightjar-backup';version:4;exportedAt:string;data:SavedPlan};
const keys=['nightjar-places','nightjar-targets-v1','nightjar-target-notes-v1','nightjar-equipment',deepSkyListKey,diaryKey] as const;
type StorageAccess=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export class PlannerReviewChangedError extends Error{
 constructor(public current:SavedPlan){super('Saved plans changed since this review. Review the updated counts and conflicts before importing again.');this.name='PlannerReviewChangedError'}
}
const record=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
const name=(value:unknown):value is string=>typeof value==='string'&&value.trim().length>0&&value.length<=100&&!['__proto__','constructor','prototype'].includes(value);
function plan(value:unknown):SavedPlan{
 if(record(value)&&value.deepTargets!==undefined&&!validDeepSkyList(value.deepTargets))throw Error('This backup contains invalid deep-sky targets. Nothing has been imported.');
 if(!record(value)||!Array.isArray(value.places)||value.places.length>savedPlacesLimit||!value.places.every(validPlace)||!Array.isArray(value.targets)||value.targets.length>skyTargetLimit||!value.targets.every(name)||!record(value.notes)||Object.keys(value.notes).length>100||!Object.entries(value.notes).every(([key,text])=>name(key)&&typeof text==='string'&&text.length<=2000)||!Array.isArray(value.equipment)||value.equipment.length>equipmentProfilesLimit||!value.equipment.every(validEquipment))throw Error('This backup contains invalid saved plans. Nothing has been imported.');
 return {
  diary:normalizeDiary(value.diary===undefined?[]:value.diary),places:value.places.map(p=>({name:p.name,latitude:p.latitude,longitude:p.longitude,...(p.country!==undefined?{country:p.country}:{}),...(p.timezone!==undefined?{timezone:p.timezone}:{}),...(p.bortle!==undefined?{bortle:p.bortle}:{})})),
  deepTargets:[...new Set((value.deepTargets||[]) as string[])],targets:[...new Set(value.targets)],notes:Object.fromEntries(Object.entries(value.notes).map(([key,text])=>[key,text as string])),
  equipment:value.equipment.map(e=>({name:e.name,width:e.width,height:e.height,focal:e.focal,pixel:e.pixel}))
 };
}
// Exports use ISO UTC instants. Legacy files may omit seconds or milliseconds; require
// an exact calendar round trip so Date parsing cannot silently repair a day.
function validBackupExportTime(value:unknown):value is string{
 if(typeof value!=='string'||value.length>27||!/^(?:\d{4}|[+-]\d{6})-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?Z$/.test(value))return false;
 const expected=value.includes('.')?value:value.slice(0,-1)+(/T\d{2}:\d{2}Z$/.test(value)?':00.000Z':'.000Z');
 const date=new Date(value);return Number.isFinite(+date)&&date.toISOString()===expected;
}
export function parsePlannerBackup(text:string):PlannerBackup{
 if(new TextEncoder().encode(text).length>plannerBackupMaxBytes)throw Error('Choose a Nightjar backup no larger than 5 MB.');
 let raw:unknown;try{raw=JSON.parse(text)}catch{throw Error('This file is not valid JSON. Choose a Nightjar backup file.')}
 if(!record(raw)||raw.format!=='nightjar-backup'||(raw.version!==1&&raw.version!==2&&raw.version!==3&&raw.version!==4))throw Error('This is not a supported Nightjar backup. Nothing has been imported.');
 if(!validBackupExportTime(raw.exportedAt))throw Error('The backup export time is invalid. Choose an original Nightjar backup file. Nothing has been imported.');
 return {format:'nightjar-backup',version:4,exportedAt:raw.exportedAt,data:plan(raw.data)};
}
export function readSavedPlan(storage:StorageAccess):SavedPlan{
 const read=(key:string,fallback:string)=>{const raw=storage.getItem(key);if(raw!==null&&raw.length>plannerBackupMaxBytes)throw Error('Oversized saved plans');return JSON.parse(raw||fallback)};
 try{return plan({places:read(keys[0],'[]'),targets:read(keys[1],'[]'),notes:read(keys[2],'{}'),equipment:read(keys[3],'[]'),deepTargets:read(keys[4],'[]'),diary:read(keys[5],'[]')})}
 catch{throw Error('Saved plans could not be read. Your existing data has not been changed.')}
}
export function makePlannerBackup(storage:StorageAccess,now=new Date()):PlannerBackup{return parsePlannerBackup(JSON.stringify({format:'nightjar-backup',version:4,exportedAt:now.toISOString(),data:readSavedPlan(storage)},null,2))}
export function mergeSavedPlans(existing:SavedPlan,incoming:SavedPlan):SavedPlan{
 existing=plan(existing);incoming=plan(incoming);
 const places=[...existing.places];for(const p of incoming.places)if(!places.some(site=>Math.abs(site.latitude-p.latitude)<.0001&&Math.abs(site.longitude-p.longitude)<.0001))places.push(p);
 const equipment=[...existing.equipment];for(const e of incoming.equipment)if(!equipment.some(setup=>setup.name.trim()===e.name.trim()))equipment.push(e);
 const targets=[...new Set([...existing.targets,...incoming.targets])],notes={...incoming.notes,...existing.notes},knownDiary=new Set((existing.diary||[]).map(entry=>entry.id));
 const capacity=(size:number,limit:number,label:string)=>{if(size>limit)throw Error(`The combined plan would exceed ${limit} saved ${label}. Free space or choose a smaller backup. Nothing has been imported.`)};
 capacity(places.length,savedPlacesLimit,'sites');capacity(equipment.length,equipmentProfilesLimit,'equipment setups');capacity(targets.length,skyTargetLimit,'bright-sky targets');capacity(Object.keys(notes).length,100,'target notes');capacity(knownDiary.size+(incoming.diary||[]).filter(entry=>!knownDiary.has(entry.id)).length,diaryLimit,'observations');
 return plan({places,equipment,diary:mergeDiary(existing.diary||[],incoming.diary||[]),deepTargets:[...new Set([...(existing.deepTargets||[]),...(incoming.deepTargets||[])])],targets,notes});
}
export function previewPlannerMerge(existing:SavedPlan,incoming:SavedPlan){
 const merged=mergeSavedPlans(existing,incoming);
 const different=(a:unknown,b:unknown)=>JSON.stringify(a)!==JSON.stringify(b);
 return {
  merged,
  added:{diary:(merged.diary||[]).length-(existing.diary||[]).length,deepTargets:(merged.deepTargets||[]).length-(existing.deepTargets||[]).length,places:merged.places.length-existing.places.length,targets:merged.targets.length-existing.targets.length,notes:Object.keys(merged.notes).length-Object.keys(existing.notes).length,equipment:merged.equipment.length-existing.equipment.length},
  kept:{
   diary:(incoming.diary||[]).flatMap(entry=>{const saved=(existing.diary||[]).find(value=>value.id===entry.id);return saved&&different(saved,entry)?[entry.target+' · '+entry.observedAt]:[]}),
   places:incoming.places.flatMap(site=>{const saved=existing.places.find(p=>Math.abs(site.latitude-p.latitude)<.0001&&Math.abs(site.longitude-p.longitude)<.0001);return saved&&different(saved,site)?[saved.name]:[]}),
   notes:Object.keys(incoming.notes).filter(key=>Object.hasOwn(existing.notes,key)&&existing.notes[key]!==incoming.notes[key]),
   equipment:incoming.equipment.flatMap(setup=>{const saved=existing.equipment.find(e=>setup.name.trim()===e.name.trim());return saved&&different(saved,setup)?[saved.name]:[]})
  }
 };
}
export function restorePlannerBackup(storage:StorageAccess,backup:PlannerBackup,reviewed?:SavedPlan):SavedPlan{
 // Revalidate even when called outside the file picker, and read the latest
 // local data so imports preserve edits made after the preview was opened.
 const incoming=plan(backup.data),current=readSavedPlan(storage);
 if(reviewed&&JSON.stringify(current)!==JSON.stringify(plan(reviewed)))throw new PlannerReviewChangedError(current);
 const merged=mergeSavedPlans(current,incoming);
 const previous=keys.map(key=>storage.getItem(key));
 const values=[merged.places,merged.targets,merged.notes,merged.equipment,merged.deepTargets||[],merged.diary||[]].map(value=>JSON.stringify(value));
 let written=0;
 try{for(let i=0;i<keys.length;i++){storage.setItem(keys[i],values[i]);written++}}
 catch{
  let rollbackFailed=false;
  for(let i=0;i<written;i++){try{if(storage.getItem(keys[i])!==values[i]){rollbackFailed=true;continue}const value=previous[i];if(value===null)storage.removeItem(keys[i]);else storage.setItem(keys[i],value)}catch{rollbackFailed=true}}
  throw Error(rollbackFailed?'Storage failed and some changes could not be undone. Keep your backup file and check your saved plans.':'This browser could not save the imported plans. Your existing data has not been changed.');
 }
 return merged;
}
