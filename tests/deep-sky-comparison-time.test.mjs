import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {deepSkyTimestampFormatter}=await vite.ssrLoadModule('/lib/deep-sky-time.ts');

test('comparison timestamps distinguish local BC and AD within the same supported UTC day',()=>{
 const start=new Date('0001-01-01T02:00:00.123Z'),original=+start;
 const format=deepSkyTimestampFormatter(start,'America/New_York');
 assert.match(format.format(start),/31 Dec 1 BC/);
 assert.match(format.format(new Date('0001-01-01T06:00:00Z')),/1 Jan 1 AD/);
 assert.match(format.format(start),/GMT-4:56:02/);
 assert.equal(+start,original);
});
test('modern year transitions and repeated local hours retain years and UTC offsets',()=>{
 const format=deepSkyTimestampFormatter(new Date('2026-12-31T23:30:00Z'),'Europe/London');
 assert.match(format.format(new Date('2026-12-31T23:30:00Z')),/31 Dec 2026/);
 assert.match(format.format(new Date('2027-01-01T00:30:00Z')),/1 Jan 2027/);
 const repeated=deepSkyTimestampFormatter(new Date('2026-10-25T00:30:00Z'),'Europe/London');
 const first=repeated.format(new Date('2026-10-25T00:30:00Z')),second=repeated.format(new Date('2026-10-25T01:30:00Z'));
 assert.match(first,/01:30 GMT\+1/);assert.match(second,/01:30 GMT(?:\+0)?$/);assert.notEqual(first,second);
});
test('unsupported comparison dates and invalid time zones are rejected before formatting',()=>{
 for(const value of ['invalid','0000-12-31T23:59:59Z','+010000-01-01T00:00:00Z'])assert.throws(()=>deepSkyTimestampFormatter(new Date(value),'UTC'),/Invalid deep-sky planning date/);
 assert.throws(()=>deepSkyTimestampFormatter(new Date('2026-10-13T20:00:00Z'),'Unknown/Zone'),RangeError);
});
test('Traditional Chinese dates preserve distinct offsets and eras',()=>{
 const repeated=deepSkyTimestampFormatter(new Date('2026-10-25T00:30:00Z'),'Europe/London','zh-Hant');
 const parts=date=>Object.fromEntries(repeated.formatToParts(new Date(date)).filter(part=>['hour','minute','timeZoneName'].includes(part.type)).map(part=>[part.type,part.value]));
 const first=parts('2026-10-25T00:30:00Z'),second=parts('2026-10-25T01:30:00Z');
 assert.equal(first.hour,second.hour);assert.equal(first.minute,second.minute);assert.notEqual(first.timeZoneName,second.timeZoneName);
 const ancient=deepSkyTimestampFormatter(new Date('0001-01-01T02:00:00Z'),'America/New_York','zh-Hant');
 const era=date=>ancient.formatToParts(new Date(date)).find(part=>part.type==='era').value;
 assert.notEqual(era('0001-01-01T02:00:00Z'),era('0001-01-01T06:00:00Z'));
});
