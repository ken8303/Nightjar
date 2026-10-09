import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {observingWindowLabel}=await vite.ssrLoadModule('/lib/observing-window-label.ts');
test('observing interval labels identify both calendar dates across midnight and year boundaries',()=>{
 const start=new Date('2026-12-31T23:00Z'),before=+start,label=observingWindowLabel(start,2,'UTC');
 assert.match(label,/31 Dec 2026, 23:00/);assert.match(label,/1 Jan 2027, 01:00/);assert.equal(+start,before);
});
test('repeated local hours remain distinct and elapsed UTC duration is reflected in offsets',()=>{
 const label=observingWindowLabel(new Date('2026-10-25T00:00Z'),2,'Europe/London');
 assert.match(label,/25 Oct 2026, 01:00 GMT\+1/);assert.match(label,/25 Oct 2026, 02:00 GMT/);
 const hour=observingWindowLabel(new Date('2026-10-25T00:00Z'),1,'Europe/London');
 assert.match(hour,/01:00 GMT\+1/);assert.match(hour,/01:00 GMT(?:\+0)?$/);
});
test('labels use the site date rather than the UTC date for offset zones',()=>{
 const label=observingWindowLabel(new Date('2026-10-09T23:00Z'),2,'Asia/Hong_Kong');
 assert.equal((label.match(/10 Oct 2026/g)||[]).length,2);assert.match(label,/07:00 GMT\+8/);assert.match(label,/09:00 GMT\+8/);
});
test('invalid, unsupported and malformed intervals are refused before formatting',()=>{
 for(const [start,hours] of [[new Date(NaN),1],[new Date('9999-12-31T23:30Z'),1],[new Date('0000-01-01T00:00Z'),1],[new Date('2026-10-09T20:00Z'),0],[new Date('2026-10-09T20:00Z'),1.5],[new Date('2026-10-09T20:00Z'),3]])assert.throws(()=>observingWindowLabel(start,hours,'UTC'),/Invalid observing window/);
});
test('site dates that cross into BCE retain an explicit era instead of a plausible AD label',()=>{
 const label=observingWindowLabel(new Date('0001-01-01T00:00Z'),2,'America/New_York');
 assert.match(label,/31 Dec 1 BC/);assert(!label.includes('31 Dec 1 AD'));
});
