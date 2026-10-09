import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {createPendingEdits,preventPendingEditUnload,watchPendingEditUnload}=await vite.ssrLoadModule('/lib/pending-edits.ts');
test('independent pending-edit owners retain a stable section summary until each saves or unmounts',()=>{
 const store=createPendingEdits(),diary=Symbol(),notes=Symbol(),otherNotes=Symbol(),other=Symbol();let updates=0;const unsubscribe=store.subscribe(()=>updates++);
 store.change(diary,{section:'sky',label:'diary'});store.change(notes,{section:'sky',label:'notes'});store.change(otherNotes,{section:'sky',label:'notes'});store.change(other,{section:'tools',label:'equipment'});
 assert.equal(store.snapshot('sky'),'diary, notes');assert.equal(store.snapshot(),'diary, equipment, notes');assert.equal(store.snapshot('tonight'),'');
 store.change(notes,{section:'sky',label:'notes'});assert.equal(updates,4);store.change(notes,null);assert.equal(store.snapshot('sky'),'diary, notes');store.change(otherNotes,null);assert.equal(store.snapshot('sky'),'diary');store.change(diary,null);assert.equal(store.snapshot('sky'),'');
 unsubscribe();store.change(other,null);assert.equal(updates,7);assert.equal(store.snapshot(),'');
});
test('unload prompts are requested only while a pending view edit exists',()=>{
 const event={returnValue:'unchanged',preventDefault(){this.prevented=true}};preventPendingEditUnload(event,'');assert.equal(event.prevented,undefined);assert.equal(event.returnValue,'unchanged');preventPendingEditUnload(event,'notes');assert.equal(event.prevented,true);assert.equal(event.returnValue,'true');
});
test('unload listeners attach synchronously for pending edits and detach only after every owner clears',()=>{
 const store=createPendingEdits(),target=new EventTarget(),first=Symbol(),second=Symbol();let adds=0,removes=0;
 const events={addEventListener(...args){adds++;target.addEventListener(...args)},removeEventListener(...args){removes++;target.removeEventListener(...args)}};
 const unload=()=>{const event=new Event('beforeunload',{cancelable:true});target.dispatchEvent(event);return event.defaultPrevented};
 const stop=watchPendingEditUnload(events,store);assert.equal(adds,0);assert.equal(unload(),false);
 store.change(first,{section:'sky',label:'notes'});assert.equal(adds,1);assert.equal(unload(),true);
 store.change(first,{section:'sky',label:'notes'});store.change(second,{section:'sky',label:'diary'});store.change(first,null);assert.equal(adds,1);assert.equal(removes,0);assert.equal(unload(),true);
 store.change(second,null);assert.equal(removes,1);assert.equal(unload(),false);
 stop();store.change(first,{section:'sky',label:'notes'});assert.equal(adds,1);assert.equal(unload(),false);
});
test('unload watching protects existing edits on mount and cleans up across remounts',()=>{
 const store=createPendingEdits(),owner=Symbol(),target=new EventTarget();let adds=0,removes=0;
 const events={addEventListener(...args){adds++;target.addEventListener(...args)},removeEventListener(...args){removes++;target.removeEventListener(...args)}};
 store.change(owner,{section:'sky',label:'notes'});const stop=watchPendingEditUnload(events,store);assert.equal(adds,1);
 stop();stop();assert.equal(removes,1);const stopAgain=watchPendingEditUnload(events,store);assert.equal(adds,2);
 const event=new Event('beforeunload',{cancelable:true});target.dispatchEvent(event);assert.equal(event.defaultPrevented,true);
 store.change(owner,null);assert.equal(removes,2);stopAgain();assert.equal(removes,2);
});

test('root-retained edits protect reload without blocking section changes and policy changes notify subscribers',()=>{
 const store=createPendingEdits(),imaging=Symbol(),notes=Symbol();let updates=0;store.subscribe(()=>updates++);
 store.change(imaging,{section:'tools',label:'imaging draft',retainedAcrossSections:true});assert.equal(store.snapshot(),'imaging draft');assert.equal(store.snapshot('tools'),'');
 store.change(notes,{section:'sky',label:'notes'});assert.equal(store.snapshot(),'imaging draft, notes');assert.equal(store.snapshot('sky'),'notes');
 store.change(imaging,{section:'tools',label:'imaging draft'});assert.equal(store.snapshot('tools'),'imaging draft');assert.equal(updates,3);
 store.change(imaging,{section:'tools',label:'imaging draft',retainedAcrossSections:true});assert.equal(store.snapshot('tools'),'');assert.equal(updates,4);
 store.change(notes,null);assert.equal(store.snapshot(),'imaging draft');store.change(imaging,null);assert.equal(store.snapshot(),'');
});

test('context-sensitive retained edits guard site changes from every section without blocking tab navigation',()=>{
 const store=createPendingEdits(),time=Symbol(),imaging=Symbol(),notes=Symbol();let updates=0;store.subscribe(()=>updates++);
 store.change(time,{section:'observing-time',label:'observing-time changes',retainedAcrossSections:true,contextSensitive:true});
 store.change(imaging,{section:'tools',label:'imaging draft',retainedAcrossSections:true});
 store.change(notes,{section:'sky',label:'notes'});
 assert.equal(store.snapshot('tonight'),'');assert.equal(store.snapshot('sky'),'notes');
 assert.equal(store.contextSnapshot('tonight'),'observing-time changes');
 assert.equal(store.contextSnapshot('sky'),'notes, observing-time changes');
 assert.equal(store.contextSnapshot('tools'),'observing-time changes');
 assert.equal(store.snapshot(),'imaging draft, notes, observing-time changes');
 store.change(time,{section:'observing-time',label:'observing-time changes',retainedAcrossSections:true,contextSensitive:false});
 assert.equal(updates,4);assert.equal(store.contextSnapshot('sky'),'notes');
 store.change(time,null);assert.equal(store.snapshot(),'imaging draft, notes');
});
