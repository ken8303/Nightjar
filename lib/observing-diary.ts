import {validMessierId} from './deep-sky-list';
import {validPlace} from './planner-state';
import {type Place} from './sky';
export const diaryKey='nightjar-observing-diary-v1';
export const diaryLimit=200,diaryMaxStoredChars=5*1024*1024;
export type Observation={id:string;target:string;observedAt:string;place:Place;outcome:'seen'|'not-seen'|'imaged';equipment:string;notes:string};
export function validObservation(value:unknown):value is Observation{
 if(!value||typeof value!=='object')return false;
 const entry=value as Record<string,unknown>;
 return typeof entry.id==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(entry.id)&&validMessierId(entry.target)&&typeof entry.observedAt==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(entry.observedAt)&&Number.isFinite(+new Date(entry.observedAt))&&new Date(entry.observedAt).toISOString()===entry.observedAt&&validPlace(entry.place)&&['seen','not-seen','imaged'].includes(entry.outcome as string)&&typeof entry.equipment==='string'&&entry.equipment.length<=100&&typeof entry.notes==='string'&&entry.notes.length<=2000;
}
export function normalizeDiary(value:unknown):Observation[]{
 if(!Array.isArray(value)||value.length>diaryLimit||!value.every(validObservation)||new Set(value.map(entry=>entry.id)).size!==value.length)throw Error('The observing diary contains invalid entries.');
 return value.map(entry=>({id:entry.id,target:entry.target,observedAt:entry.observedAt,place:{name:entry.place.name,latitude:entry.place.latitude,longitude:entry.place.longitude,...(entry.place.timezone?{timezone:entry.place.timezone}:{}),...(entry.place.bortle?{bortle:entry.place.bortle}:{})},outcome:entry.outcome,equipment:entry.equipment,notes:entry.notes}));
}
export function readDiary(storage:Pick<Storage,'getItem'>){const raw=storage.getItem(diaryKey);if(raw&&raw.length>diaryMaxStoredChars)throw Error('The saved diary is too large.');return normalizeDiary(JSON.parse(raw||'[]'))}
export function saveDiary(value:Observation[],storage:Pick<Storage,'setItem'>){storage.setItem(diaryKey,JSON.stringify(normalizeDiary(value)))}
export function mergeDiary(existing:Observation[],incoming:Observation[]){const known=new Set(existing.map(entry=>entry.id));return normalizeDiary([...existing,...incoming.filter(entry=>!known.has(entry.id))])}
