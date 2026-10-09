export const savedTargetsKey='nightjar-targets-v1';
export function validSavedTargetName(value:unknown):value is string{return typeof value==='string'&&Boolean(value.trim())&&value.length<=100&&!['__proto__','constructor','prototype'].includes(value)}
export function readSavedTargets(storage:Pick<Storage,'getItem'>){
 const raw=storage.getItem(savedTargetsKey);
 if(raw&&raw.length>5*1024*1024)throw Error('Saved targets could not be read.');
 const value:unknown=JSON.parse(raw===null?'[]':raw);
 if(!Array.isArray(value)||!value.every(validSavedTargetName))throw Error('Saved targets contain invalid data. Your stored list was kept.');
 return [...new Set(value)];
}
// The desired action comes from the rendered control. Rereading must not turn
// a stale Save click into removal, or a stale Remove click into an addition.
export function setTargetSaved(current:string[],name:string,save:boolean,limit:number,valid:(value:unknown)=>boolean){
 if(!valid(name)||!current.every(valid))throw Error('This saved target list contains invalid entries.');
 const unique=[...new Set(current)];
 const next=save?unique.includes(name)?unique:[...unique,name]:unique.filter(value=>value!==name);
 if(next.length>limit&&next.length>unique.length)throw Error('Your saved list is full. Remove a target before saving or restoring this one.');
 return next;
}
