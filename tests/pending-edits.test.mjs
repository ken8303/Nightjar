import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {createPendingEdits,preventPendingEditUnload}=await vite.ssrLoadModule('/lib/pending-edits.ts');
test('independent pending-edit owners retain a stable section summary until each saves or unmounts',()=>{
 const store=createPendingEdits(),diary=Symbol(),notes=Symbol(),otherNotes=Symbol(),other=Symbol();let updates=0;const unsubscribe=store.subscribe(()=>updates++);
 store.change(diary,{section:'sky',label:'diary'});store.change(notes,{section:'sky',label:'notes'});store.change(otherNotes,{section:'sky',label:'notes'});store.change(other,{section:'tools',label:'equipment'});
 assert.equal(store.snapshot('sky'),'diary, notes');assert.equal(store.snapshot(),'diary, equipment, notes');assert.equal(store.snapshot('tonight'),'');
 store.change(notes,{section:'sky',label:'notes'});assert.equal(updates,4);store.change(notes,null);assert.equal(store.snapshot('sky'),'diary, notes');store.change(otherNotes,null);assert.equal(store.snapshot('sky'),'diary');store.change(diary,null);assert.equal(store.snapshot('sky'),'');
 unsubscribe();store.change(other,null);assert.equal(updates,7);assert.equal(store.snapshot(),'');
});
test('unload prompts are requested only while a pending view edit exists',()=>{
 const event={returnValue:'unchanged',preventDefault(){this.prevented=true}};preventPendingEditUnload(event,'');assert.equal(event.prevented,undefined);assert.equal(event.returnValue,'unchanged');preventPendingEditUnload(event,'notes');assert.equal(event.prevented,true);assert.equal(event.returnValue,'');
});
