import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {observingTimeCandidates,observingTimeValue}=await vite.ssrLoadModule('/lib/observing-time.ts');
test('UTC and quarter-hour local inputs preserve the intended instant',()=>{
 assert.equal(observingTimeCandidates('2026-10-06T20:00','UTC')[0].toISOString(),'2026-10-06T20:00:00.000Z');
 assert.equal(observingTimeCandidates('2026-10-07T01:45','Asia/Kathmandu')[0].toISOString(),'2026-10-06T20:00:00.000Z');
 assert.equal(observingTimeValue(new Date('2026-10-06T20:00Z'),'Asia/Kathmandu'),'2026-10-07T01:45');
});
test('clock-change gaps have no candidate and repeated hours remain two distinct UTC instants',()=>{
 assert.deepEqual(observingTimeCandidates('2026-03-29T01:30','Europe/London'),[]);
 assert.deepEqual(observingTimeCandidates('2026-10-25T01:30','Europe/London').map(date=>date.toISOString()),['2026-10-25T00:30:00.000Z','2026-10-25T01:30:00.000Z']);
});
test('four-digit year boundaries do not throw when offset samples cross the input range',()=>{
 for(const value of ['0001-01-01T00:00','9999-12-31T23:59'])assert.equal(observingTimeCandidates(value,'UTC')[0].toISOString().slice(0,16),value);
 assert.equal(observingTimeValue(new Date('0001-01-01T00:00:00Z'),'UTC'),'0001-01-01T00:00');
});
test('invalid zones, calendar dates and unfinished inputs return no candidate instead of throwing',()=>{
 for(const value of ['','2026-02-30T20:00','0000-01-01T00:00','2026-10-06T25:00','2026-10-06'])assert.deepEqual(observingTimeCandidates(value,'UTC'),[]);
 assert.deepEqual(observingTimeCandidates('2026-10-06T20:00','Invalid/Zone'),[]);
});
