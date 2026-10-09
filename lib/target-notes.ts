export const targetNotesKey='nightjar-target-notes-v1',targetNotesLimit=100;
export type TargetNotes=Record<string,string>;
const validName=(name:string)=>Boolean(name.trim())&&name.length<=100&&!['__proto__','constructor','prototype'].includes(name);
export function normalizeTargetNotes(value:unknown,allowOversized=false):TargetNotes{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Saved target notes contain invalid entries.');
 const entries=Object.entries(value);
 if(!entries.every(([name,text])=>validName(name)&&typeof text==='string'&&text.length<=2000))throw Error('Saved target notes contain invalid entries.');
 if(!allowOversized&&entries.length>targetNotesLimit)throw Error('You can save up to 100 target notes. Remove an older note in Manage target notes to make room.');
 return Object.fromEntries(entries) as TargetNotes;
}
export function readTargetNotes(storage:Pick<Storage,'getItem'>){
 const raw=storage.getItem(targetNotesKey);
 if(raw&&raw.length>5*1024*1024)throw Error('Saved target notes are too large to read.');
 // Preserve oversized legacy collections so the user can explicitly free space.
 return normalizeTargetNotes(JSON.parse(raw===null?'{}':raw),true);
}
export function overlayTargetNoteEdits(notes:TargetNotes,edits:TargetNotes){
 const next={...notes,...edits};for(const [name,value] of Object.entries(edits))if(value==='')delete next[name];return next;
}
export function applyTargetNoteEdits(notes:TargetNotes,edits:TargetNotes){return normalizeTargetNotes(overlayTargetNoteEdits(notes,edits))}
export function saveTargetNotes(notes:TargetNotes,storage:Pick<Storage,'setItem'>){storage.setItem(targetNotesKey,JSON.stringify(normalizeTargetNotes(notes)))}

export type TargetNoteBase=Record<string,string|null>;
const noteValue=(notes:TargetNotes,name:string)=>Object.hasOwn(notes,name)?notes[name]||null:null;
export function targetNoteConflicts(base:TargetNoteBase,edits:TargetNotes,latest:TargetNotes){
 const desired=normalizeTargetNotes(edits,true),stored=normalizeTargetNotes(latest,true);
 return Object.keys(desired).filter(name=>{
  if(!Object.hasOwn(base,name)||base[name]!==null&&(typeof base[name]!=='string'||base[name]!.length>2000))throw Error('The original note version is unavailable. Keep this view open and copy your text before leaving.');
  const value=noteValue(stored,name),next=desired[name]||null;
  return value!==(base[name]||null)&&value!==next;
 });
}
export function mergeTargetNoteChanges(base:TargetNoteBase,edits:TargetNotes,latest:TargetNotes){
 if(targetNoteConflicts(base,edits,latest).length)throw Error('Saved notes changed elsewhere. Your edits remain here. Review saved note versions before choosing which text to keep.');
 return applyTargetNoteEdits(latest,edits);
}
export function resolveTargetNoteConflicts(base:TargetNoteBase,edits:TargetNotes,reviewed:TargetNotes,current:TargetNotes,choice:'local'|'stored'){
 current=normalizeTargetNotes(current,true);
 const nextBase={...base},nextEdits={...edits};
 for(const name of targetNoteConflicts(base,edits,reviewed)){
  if(noteValue(current,name)!==noteValue(reviewed,name))throw Error('A reviewed note changed again. Review saved note versions again before choosing.');
  nextBase[name]=noteValue(current,name);if(choice==='stored')delete nextEdits[name];
 }
 return {base:nextBase,edits:nextEdits};
}
