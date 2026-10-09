import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {observingTimeCandidates,observingTimeValue,parseObservingInstant,observingTimeZone}=await vite.ssrLoadModule('/lib/observing-time.ts');
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


test('historical second-resolution offsets retain the exact entered local minute instead of shifting it',()=>{
 const paris=observingTimeCandidates('1899-01-01T12:00','Europe/Paris');assert.equal(paris.length,1);assert.equal(paris[0].toISOString(),'1899-01-01T11:50:39.000Z');
 const local=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(paris[0]);assert.equal(local,'12:00:00');assert.equal(observingTimeValue(paris[0],'Europe/Paris'),'1899-01-01T12:00');
 const early=observingTimeCandidates('0099-10-25T12:00','Europe/Paris');assert.equal(early.length,1);assert.equal(early[0].toISOString(),'0099-10-25T11:50:39.000Z');
});
test('local inputs cannot create unsupported UTC years when an offset crosses the year boundary',()=>{
 assert.deepEqual(observingTimeCandidates('0001-01-01T00:00','Asia/Kathmandu'),[]);assert.deepEqual(observingTimeCandidates('9999-12-31T23:59','America/New_York'),[]);
 assert(observingTimeCandidates('0001-01-02T12:00','Asia/Kathmandu').every(date=>date.getUTCFullYear()===1));assert.equal(observingTimeCandidates('9999-12-30T23:59','America/New_York').length,1);
});
test('half-hour transitions and a skipped civil day retain only exact round-trip local minutes',()=>{
 assert.deepEqual(observingTimeCandidates('2011-12-30T12:00','Pacific/Apia'),[]);
 const repeated=observingTimeCandidates('2026-04-05T01:45','Australia/Lord_Howe');assert.equal(repeated.length,2);assert.equal(+repeated[1]-+repeated[0],1800000);assert(repeated.every(date=>observingTimeValue(date,'Australia/Lord_Howe')==='2026-04-05T01:45'));
 assert.deepEqual(observingTimeCandidates('2026-10-04T02:15','Australia/Lord_Howe'),[]);
});


test('recovery instants preserve exact canonical timestamps and refuse normalized or unsupported dates',()=>{
 const exact='2026-10-07T23:59:59.987Z';assert.equal(parseObservingInstant(exact).toISOString(),exact);
 for(const value of ['2026-02-30T20:00:00.000Z','0000-01-01T00:00:00.000Z','+010000-01-01T00:00:00.000Z','2026-10-07T20:00Z','not a date',null,0])assert.equal(parseObservingInstant(value),null);
});


test('unknown time zones are explicit UTC fallbacks while valid UTC remains a known site zone',()=>{
 for(const value of [undefined,null,'','Invalid/Zone',42,{}])assert.deepEqual(observingTimeZone(value),{zone:'UTC',known:false});
 assert.deepEqual(observingTimeZone('UTC'),{zone:'UTC',known:true});assert.deepEqual(observingTimeZone('Asia/Hong_Kong'),{zone:'Asia/Hong_Kong',known:true});
});
test('time-zone availability keeps UTC fallback and actual local entry interpretations distinct',()=>{
 const input='2026-10-09T20:00',fallback=observingTimeZone(undefined),known=observingTimeZone('Asia/Hong_Kong');
 assert.equal(observingTimeCandidates(input,fallback.zone)[0].toISOString(),'2026-10-09T20:00:00.000Z');
 assert.equal(observingTimeCandidates(input,known.zone)[0].toISOString(),'2026-10-09T12:00:00.000Z');
});
