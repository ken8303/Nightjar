export const deepSkyListKey='nightjar-deep-targets-v1';
export function validMessierId(value:unknown):value is string{return typeof value==='string'&&/^M(?:[1-9]|[1-9]\d|10[013-9]|110)$/.test(value)}
export function validDeepSkyList(value:unknown):value is string[]{return Array.isArray(value)&&value.length<=109&&value.every(validMessierId)}
export function readDeepSkyList(storage:Pick<Storage,'getItem'>):string[]{
 const raw=storage.getItem(deepSkyListKey);
 if(raw!==null&&raw.length>5*1024*1024)throw Error('Saved deep-sky targets are too large to read.');
 const value:unknown=JSON.parse(raw===null?'[]':raw);
 if(!validDeepSkyList(value))throw Error('Saved deep-sky targets could not be read.');
 return [...new Set(value)];
}
export function saveDeepSkyList(value:string[],storage:Pick<Storage,'setItem'>){
 if(!validDeepSkyList(value))throw Error('The deep-sky list is invalid.');
 storage.setItem(deepSkyListKey,JSON.stringify([...new Set(value)]));
}
