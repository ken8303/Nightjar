import {normalizeTargetNotes,targetNoteConflicts,type TargetNotes,type TargetNoteBase} from './target-notes';

export const targetNoteRecoveryMaxBytes=5*1024*1024;
// Read the in-memory edits only: storage may be unavailable or contain a
// conflicting version. This copy must never turn a recovery action into a save.
export function makeTargetNoteRecovery(base:TargetNoteBase,edits:TargetNotes,created=new Date()){
 if(!Number.isFinite(+created))throw Error('A valid recovery-copy time is required.');
 const pending=normalizeTargetNotes(edits,true),names=Object.keys(pending);
 if(!names.length)throw Error('There are no unsaved target notes to copy.');
 targetNoteConflicts(base,pending,{});
 const original=Object.fromEntries(names.map(name=>[name,base[name]])),exportedAt=created.toISOString();
 const copy={format:'nightjar-target-note-recovery',version:1,exportedAt,notice:'Manual recovery copy of unsaved target note edits held in this view. Empty edit text means removal. Original values are the versions seen before editing, not the latest saved versions. This file may contain private notes, is not a full backup, and cannot be imported as a Nightjar plan backup.',data:{base:original,edits:pending}};
 const text=JSON.stringify(copy,null,2);
 if(new TextEncoder().encode(text).length>targetNoteRecoveryMaxBytes)throw Error('This note recovery copy is too large to prepare. Your text is still in this view; copy it before leaving.');
 return {text,exportedAt,notes:names.length};
}
