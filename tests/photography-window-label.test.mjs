import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {photographyWindowLabels}=await vite.ssrLoadModule('/lib/photography-window-label.ts');

test('light interval labels distinguish repeated local hours without changing the source instants',()=>{
 const start=new Date('2026-10-25T00:30:00.123Z'),end=new Date('2026-10-25T01:30:00.456Z'),before=[+start,+end];
 const labels=photographyWindowLabels(start,end,'Europe/London');
 assert.equal(labels.start.time,'01:30');assert.equal(labels.end.time,'01:30');assert.equal(labels.start.offset,'GMT+1');assert.match(labels.end.offset,/^GMT(?:\+0)?$/);assert.equal(labels.date,'25 Oct 2026');assert.deepEqual([+start,+end],before);
});

test('light interval dates retain midnight boundaries and local BC/AD eras',()=>{
 const modern=photographyWindowLabels(new Date('2026-12-31T23:30Z'),new Date('2027-01-01T00:30Z'),'UTC');
 assert.equal(modern.date,'31 Dec 2026 – 1 Jan 2027');assert.equal(modern.start.time,'23:30');assert.equal(modern.end.time,'00:30');assert.match(modern.start.offset,/^GMT(?:\+0)?$/);assert.match(modern.end.offset,/^GMT(?:\+0)?$/);
 const boundary=photographyWindowLabels(new Date('0001-01-01T00:00Z'),new Date('0001-01-01T06:00Z'),'America/New_York');
 assert.match(boundary.date,/31 Dec 1 BC – 1 Jan 1 AD/);assert.equal(boundary.start.offset,'GMT-4:56:02');assert.equal(boundary.end.offset,'GMT-4:56:02');
});

test('light interval labels refuse unsupported dates and nonpositive intervals before formatting',()=>{
 const modern=new Date('2026-10-13T00:00Z');
 for(const [start,end] of [[modern,modern],[new Date(+modern+1),modern],[new Date(NaN),modern],[new Date('0000-12-31T23:00Z'),modern],[modern,new Date('+010000-01-01T00:00Z')]])assert.throws(()=>photographyWindowLabels(start,end,'UTC'),/Invalid photography window/);
});
