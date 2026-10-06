import assert from 'node:assert/strict';import {test,after} from 'node:test';import {fileURLToPath} from 'node:url';import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {printableObservingPlan}=await vite.ssrLoadModule('/lib/observing-plan.ts');
const input=()=>({date:new Date('2026-10-25T01:30:00Z'),place:{name:'London',latitude:51.5085,longitude:-.1257,timezone:'Europe/London',bortle:4},targets:[{name:'Below',altitude:-12,azimuth:90},{name:'Vega',altitude:35,azimuth:270}],notes:{Vega:'First line\nSecond line'},equipment:[{name:'Camera',width:36,height:24,focal:400,pixel:3.76}]});
test('plan records exact UTC and DST offset, horizon status, notes, Moon and equipment',()=>{
 const plan=input(),html=printableObservingPlan(plan);
 assert(html.includes('2026-10-25 01:30 UTC'));assert(html.includes('01:30 GMT+0'));assert(html.includes('Bortle 4'));assert(html.includes('Moon:'));assert(html.includes('Below horizon'));assert(html.includes('First line\nSecond line'));assert(html.includes('3.76 µm pixels'));
 assert(html.indexOf('<label for="target-0">Vega')<html.indexOf('>Below</label>'));assert.equal(plan.targets[0].name,'Below','export must not reorder app state');
 plan.date=new Date('2026-10-25T00:30:00Z');assert(printableObservingPlan(plan).includes('01:30 GMT+1'));
});
test('user-provided names and notes are escaped; output has no remote resource dependencies',()=>{
 const plan=input();plan.place.name='Field </title><img src=x onerror=alert(1)>';plan.notes.Vega='</script><script>alert(1)</script>\n& "quote"';plan.equipment[0].name='<b>Camera</b>';
 const html=printableObservingPlan(plan);assert(!html.includes('<img'));assert(!html.includes('<b>Camera'));assert(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));assert(html.includes('&lt;b&gt;Camera&lt;/b&gt;'));assert.equal([...html.matchAll(/<script>/g)].length,1);assert(!/<[^>]+\b(?:src|href)\s*=/i.test(html));
});
test('full notes, empty notes and unavailable equipment remain explicit',()=>{
 const plan=input();plan.notes.Vega='x'.repeat(2000)+'excluded';plan.equipmentUnavailable=true;const html=printableObservingPlan(plan);assert(html.includes('x'.repeat(2000)));assert(!html.includes('excluded'));assert(html.includes('Space for observing notes'));assert(html.includes('Equipment could not be read'));assert(html.includes('@media print'));assert(html.includes('type="checkbox"'));
});
test('invalid dates, coordinates, target positions and equipment are rejected',()=>{
 for(const change of [{date:new Date(NaN)},{place:{...input().place,latitude:91}},{targets:[{name:'Bad',altitude:NaN,azimuth:0}]},{targets:[{name:'Bad',altitude:91,azimuth:0}]},{equipment:[{...input().equipment[0],focal:0}]}])assert.throws(()=>printableObservingPlan({...input(),...change}));
});
