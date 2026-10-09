import assert from 'node:assert/strict';import {test,after} from 'node:test';import {fileURLToPath} from 'node:url';import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {printableObservingPlan,targetCoverageNotice}=await vite.ssrLoadModule('/lib/observing-plan.ts');
const input=()=>({date:new Date('2026-10-25T01:30:00Z'),place:{name:'London',latitude:51.5085,longitude:-.1257,timezone:'Europe/London',bortle:4},targets:[{name:'Below',altitude:-12,azimuth:90},{name:'Vega',altitude:35,azimuth:270}],notes:{Vega:'First line\nSecond line'},equipment:[{name:'Camera',width:36,height:24,focal:400,pixel:3.76}]});
test('plan records exact UTC and DST offset, horizon status, notes, Moon and equipment',()=>{
 const plan=input(),html=printableObservingPlan(plan);
 assert(html.includes('2026-10-25 01:30:00.000 UTC'));assert(html.includes('01:30:00 GMT+0'));assert(html.includes('Bortle 4'));assert(html.includes('Moon:'));assert(html.includes('Below horizon'));assert(html.includes('First line\nSecond line'));assert(html.includes('3.76 µm pixels'));
 assert(html.indexOf('<label for="target-0">Vega')<html.indexOf('>Below</label>'));assert.equal(plan.targets[0].name,'Below','export must not reorder app state');
 plan.date=new Date('2026-10-25T00:30:00Z');assert(printableObservingPlan(plan).includes('01:30:00 GMT+1'));
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

test('catalogue reference exports identify supplied metadata without changing personal-note plans',()=>{
 const plan=input();
 const catalogue=printableObservingPlan({...plan,notesHeading:'Catalogue reference'});
 assert(catalogue.includes('<h3>Catalogue reference</h3>'));assert(!catalogue.includes('<h3>Personal notes</h3>'));
 assert(catalogue.includes('First line\nSecond line'));
 assert(printableObservingPlan(plan).includes('<h3>Personal notes</h3>'));
});

test('plan UTC metadata round trips exact seconds and milliseconds across repeated-clock occurrences',()=>{
 for(const instant of ['2026-10-25T00:30:17.456Z','2026-10-25T01:30:17.456Z']){
  const plan={...input(),date:new Date(instant)},html=printableObservingPlan(plan),stamp=html.match(/<strong>UTC INSTANT<\/strong><span>([^<]+)<\/span>/)[1];
  assert.equal(new Date(stamp.replace(' UTC','Z').replace(' ','T')).getTime(),+plan.date);
  assert(html.includes('01:30:17 GMT+'+(instant.includes('T00:')?'1':'0')));assert.equal(plan.date.toISOString(),instant);
 }
});
test('local date rollover keeps the export UTC instant exact and includes quarter-hour offsets',()=>{
 const plan={...input(),date:new Date('2026-12-31T23:59:59.987Z'),place:{...input().place,timezone:'Asia/Kathmandu'}},html=printableObservingPlan(plan);
 assert(html.includes('2026-12-31 23:59:59.987 UTC'));assert(html.includes('1 Jan 2027'));assert(html.includes('05:44:59 GMT+5:45'));
});


test('unreadable notes are identified while retaining the shown snapshot',()=>{
 const plan=input();plan.notesUnavailable=true;plan.notes.Vega='Earlier 星空 snapshot';const html=printableObservingPlan(plan);assert(html.includes('Personal notes could not be read from browser storage'));assert(html.includes('earlier successful read'));assert(html.includes('Earlier 星空 snapshot'));
});
test('unsaved note edits are labelled separately from unavailable stored notes',()=>{
 const plan=input();plan.notesUnsaved=true;plan.notes.Vega='Unsaved text';let html=printableObservingPlan(plan);assert(html.includes('includes unsaved note edits'));assert(!html.includes('Personal notes could not be read'));assert(html.includes('Unsaved text'));plan.notesUnavailable=true;html=printableObservingPlan(plan);assert(html.includes('includes unsaved note edits'));assert(html.includes('Personal notes could not be read'));
});


test('checklists explicitly identify older names and notes omitted without catalogue positions',()=>{
 assert.equal(targetCoverageNotice(0),'');
 assert(!printableObservingPlan(input()).includes('targets-coverage'));
 for(const count of [1,44]){
  const plan={...input(),targetsOmitted:count},html=printableObservingPlan(plan),notice=targetCoverageNotice(count);
  assert(notice.includes(`${count} older saved ${count===1?'name':'names'}`));
  assert(notice.includes('associated notes'));assert(html.includes(`<p class="hint targets-coverage">${notice}</p>`));
  assert(html.indexOf('targets-coverage')<html.indexOf('<article>'));
  assert(html.includes('Target checklist · 2'));assert.equal(plan.targets.length,2);
 }
});
test('invalid omission counts cannot make inaccurate checklist coverage claims',()=>{
 for(const count of [-1,1.5,NaN,Infinity,'2',Number.MAX_SAFE_INTEGER+1]){
  assert.throws(()=>targetCoverageNotice(count));assert.throws(()=>printableObservingPlan({...input(),targetsOmitted:count}));
 }
 assert.throws(()=>printableObservingPlan({...input(),targetsOmitted:Number.MAX_SAFE_INTEGER}));
});
