import additional from '../data/additional-deep-sky-ids.json';
const additionalIds=new Set(additional);
export const deepSkyListLimit=109+additional.length;
export const deepSkyListKey='nightjar-deep-targets-v1';
export function validMessierId(value:unknown):value is string{return typeof value==='string'&&/^M(?:[1-9]|[1-9]\d|10[013-9]|110)$/.test(value)}
export function validDeepSkyId(value:unknown):value is string{return validMessierId(value)||typeof value==='string'&&additionalIds.has(value)}
export function validDeepSkyList(value:unknown):value is string[]{return Array.isArray(value)&&value.length<=deepSkyListLimit&&value.every(validDeepSkyId)}
export function readDeepSkyList(storage:Pick<Storage,'getItem'>):string[]{
 const raw=storage.getItem(deepSkyListKey);
 if(raw!==null&&raw.length>5*1024*1024)throw Error('Saved deep-sky targets are too large to read.');
 const value:unknown=JSON.parse(raw===null?'[]':raw);
 if(!Array.isArray(value)||!value.every(validDeepSkyId))throw Error('Saved deep-sky targets could not be read.');
 return [...new Set(value)];
}
export function saveDeepSkyList(value:string[],storage:Pick<Storage,'setItem'>){
 if(!validDeepSkyList(value))throw Error('The deep-sky list is invalid.');
 storage.setItem(deepSkyListKey,JSON.stringify([...new Set(value)]));
}
