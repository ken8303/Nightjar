import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {deferFocusAndScroll}=await vite.ssrLoadModule('/lib/deferred-focus.ts');
function fixture(){
 const calls=[],frames=[],owner={},body={},page={hidden:false,activeElement:owner,body};
 const destination={isConnected:true,closest:()=>null,focus:options=>calls.push(['focus',options]),scrollIntoView:options=>calls.push(['scroll',options])};
 return {calls,frames,owner,body,page,destination,queue:resolve=>deferFocusAndScroll(resolve??(()=>destination),{page,schedule:task=>frames.push(task)}),flush:()=>frames.splice(0).forEach(task=>task(0))};
}
test('ordinary navigation and a removed dialog owner both hand focus to the destination',()=>{
 for(const closed of [false,true]){const f=fixture();f.queue();if(closed)f.page.activeElement=f.body;f.flush();assert.deepEqual(f.calls,[['focus',{preventScroll:true}],['scroll',{block:'start',behavior:'instant'}]])}
});
test('a different active editor retains focus and a background page cannot receive the handoff',()=>{
 for(const changed of ['field','hidden']){const f=fixture();let resolved=false;f.queue(()=>{resolved=true;return f.destination});if(changed==='field')f.page.activeElement={value:'Unfinished edit'};else f.page.hidden=true;f.flush();assert.deepEqual(f.calls,[]);assert.equal(resolved,false)}
});
test('a removed or modal-hidden destination cannot be focused or scrolled',()=>{
 for(const changed of ['removed','hidden','missing']){const f=fixture();f.queue(()=>changed==='missing'?null:f.destination);if(changed==='removed')f.destination.isConnected=false;if(changed==='hidden')f.destination.closest=()=>({});f.flush();assert.deepEqual(f.calls,[])}
});
test('deferred navigation resolves the destination after the current render',()=>{
 const f=fixture(),stale={...f.destination,focus:()=>assert.fail('stale destination')};let current=stale;f.queue(()=>current);current=f.destination;f.flush();assert.equal(f.calls[0][0],'focus');assert.equal(f.calls[1][0],'scroll');
});

test('an explicit action owner survives late dialog cleanup without claiming a newly active editor',()=>{
 const f=fixture(),actionOwner=f.owner,editor={value:'Text entered before dialog cleanup'};f.page.activeElement=editor;
 deferFocusAndScroll(()=>f.destination,{page:f.page,schedule:task=>f.frames.push(task),owner:actionOwner});
 f.flush();assert.equal(f.page.activeElement,editor);assert.deepEqual(f.calls,[]);
});
