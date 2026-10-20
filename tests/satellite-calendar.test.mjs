import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {satelliteWindowCalendar:calendar}=await vite.ssrLoadModule('/lib/satellite-calendar.ts');
const {parseSatelliteFeed:parse}=await vite.ssrLoadModule('/lib/satellite-elements.ts');
const {findSatellitePasses:find}=await vite.ssrLoadModule('/lib/satellite-passes.ts');
const [elements]=JSON.parse(await readFile(new URL('fixtures/iss-2026-10-19.json',import.meta.url),'utf8'));
const created=new Date('2026-10-19T12:00:00Z');
const feed=parse({version:1,elements,fetchedAt:'2026-10-19T11:00:00.000Z',nextRefreshAt:'2026-10-19T13:00:00.000Z',refreshPaused:false,issue:''});
const place={name:'London test site',latitude:51.5,longitude:-.1257,timezone:'Europe/London'};
const window=find(feed.elements,+created,place.latitude,place.longitude).passes[2].viewing[0];assert(window);
const input={window,feed,place};
const unfold=value=>value.replace(/\r\n[ \t]/g,'');
const property=(text,name)=>unfold(text).split('\r\n').find(line=>line.startsWith(name+':'))?.slice(name.length+1);
const textProperty=(text,name)=>property(text,name)?.replace(/\\([n\\;,])/g,(_,char)=>char==='n'?'\n':char);

test('a real modelled window becomes a single UTC event rounded inside its interval',()=>{
 const original=structuredClone(input),text=calendar(input,created);
 assert.equal(property(text,'DTSTART'),'20261020T051925Z');assert.equal(property(text,'DTEND'),'20261020T052220Z');
 assert.equal(property(text,'DTSTAMP'),'20261019T120000Z');assert.equal(property(text,'STATUS'),'TENTATIVE');assert.equal(property(text,'TRANSP'),'TRANSPARENT');
 assert.equal(property(text,'SUMMARY'),'ISS observing window at London test site');assert.equal(property(text,'GEO'),'51.5;-0.1257');
 const description=textProperty(text,'DESCRIPTION');
 for(const detail of ['above 30 degrees','below -6 degrees','2026-10-19T04:14:45.011040','2026-10-19T11:00:00.000Z','fixed planning snapshot','Weather, terrain, brightness','does not refresh'])assert(description.includes(detail),detail);
 assert.equal((text.match(/BEGIN:VEVENT/g)||[]).length,1);assert.equal((text.match(/END:VEVENT/g)||[]).length,1);assert(text.endsWith('END:VCALENDAR\r\n'));
 assert(!/VALARM|ATTENDEE|ORGANIZER|RRULE/.test(text));assert.deepEqual(input,original);
});
test('UTF-8 folding and text escaping preserve a site name without injecting calendar properties',()=>{
 const name='山 🌌'.repeat(30)+',;\\\nBEGIN:VEVENT';
 const text=calendar({...input,place:{...place,name}},created);
 for(const line of text.split('\r\n'))assert(Buffer.byteLength(line,'utf8')<=75);
 assert(!text.includes('\uFFFD'));
 assert.equal(unfold(text).split('\r\n').filter(line=>line==='BEGIN:VEVENT').length,1);
 assert.equal(property(text,'LOCATION'),name.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,'));
});
test('calendar identities survive a new download timestamp but distinguish sites, windows and epochs',()=>{
 const uid=property(calendar(input,created),'UID');
 assert.equal(property(calendar(input,new Date(+created+60000)),'UID'),uid);
 assert.equal(property(calendar({...input,feed:{...feed,fetchedAt:'2026-10-19T11:10:00.000Z'}},created),'UID'),uid);
 for(const next of [{...input,place:{...place,name:'Other site'}},{...input,place:{...place,longitude:0}},{...input,window:{...window,start:window.start+1}},{...input,feed:{...feed,elements:{...feed.elements,EPOCH:'2026-10-19T04:15:45.011040'}}}])assert.notEqual(property(calendar(next,created),'UID'),uid);
});
test('a download rechecks retrieval age, device clock and the supported epoch range',()=>{
 assert.throws(()=>calendar(input,new Date('2026-10-19T17:00:00.001Z')),/six hours/);
 assert.throws(()=>calendar(input,new Date('2026-10-19T10:54:59.999Z')),/ahead/);
 const edge=+new Date('2026-10-22T04:14:45.011Z');
 assert.throws(()=>calendar({...input,window:{...window,start:edge-10000,end:edge+1}},created),/three days/);
 assert.throws(()=>calendar({...input,feed:{...feed,elements:{...feed.elements,EPOCH:'2026-10-15T04:14:45Z'}}},created),/supported three-day/);
 assert.throws(()=>calendar(input,new Date(NaN)),/invalid/);
});
test('invalid, too-short or unsupported window metadata cannot create an event',()=>{
 for(const patch of [{start:NaN},{end:Infinity},{end:window.start},{end:window.start+9999},{end:window.start+86400001},{startsAtBoundary:undefined},{endsAtBoundary:1}])assert.throws(()=>calendar({...input,window:{...window,...patch}},created));
 for(const patch of [{latitude:91},{longitude:NaN},{name:''},{timezone:'Invalid/Zone'}])assert.throws(()=>calendar({...input,place:{...place,...patch}},created));
 assert.throws(()=>calendar({...input,feed:{...feed,elements:{...feed.elements,NORAD_CAT_ID:123}}},created),/identity/);
 const unsupported=Date.parse('2051-01-01T12:00:00Z');
 assert.throws(()=>calendar({...input,window:{...window,start:unsupported,end:unsupported+10000},feed:{...feed,elements:{...feed.elements,EPOCH:new Date(unsupported).toISOString()},fetchedAt:new Date(unsupported).toISOString(),nextRefreshAt:new Date(unsupported+7200000).toISOString()}},new Date(unsupported)),/invalid/);
});
test('a still-valid last-good feed keeps its original retrieval time and paused-source warning',()=>{
 const paused={...feed,refreshPaused:true,issue:'Provider returned HTTP 403. Refresh paused.'},text=calendar({...input,feed:paused},created),description=textProperty(text,'DESCRIPTION');
 assert(description.includes('2026-10-19T11:00:00.000Z'));assert(description.includes('last successfully cached elements were used'));assert(description.includes(paused.issue));
 assert.throws(()=>calendar({...input,feed:paused},new Date('2026-10-19T17:00:00.001Z')),/six hours/);
});
test('search boundary clipping is retained in the file and missing time zones remain explicit',()=>{
 const text=calendar({...input,window:{...window,startsAtBoundary:true,endsAtBoundary:true},place:{name:place.name,latitude:place.latitude,longitude:place.longitude}},created),description=textProperty(text,'DESCRIPTION');
 assert(description.includes('begins at the search boundary'));assert(description.includes('ends at the search boundary'));assert(description.includes('Site time zone unavailable; event times use UTC.'));
 const ordinary=textProperty(calendar(input,created),'DESCRIPTION');assert(!ordinary.includes('begins at the search boundary'));assert(!ordinary.includes('ends at the search boundary'));
});
