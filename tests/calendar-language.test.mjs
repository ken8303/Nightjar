import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {meteorCalendar,lunarEclipseCalendar,observingWindowCalendar}=await vite.ssrLoadModule('/lib/calendar.ts');
const unfold=value=>value.replace(/\r\n[ \t]/g,'');
const property=(text,key)=>unfold(text).split('\r\n').find(line=>line.startsWith(key+':'));
const preserve=(en,zh)=>{for(const key of ['UID','DTSTART','DTEND','GEO','STATUS'])assert.equal(property(en,key),property(zh,key),key);for(const line of zh.split('\r\n'))assert(Buffer.byteLength(line,'utf8')<=75);assert.equal((unfold(zh).match(/^BEGIN:VEVENT$/gm)||[]).length,1)};
test('meteor calendar translates event text while keeping the identity and all-day dates',()=>{
 const en=meteorCalendar('Perseids',2026,7,12),zh=meteorCalendar('Perseids',2026,7,12,'zh-Hant');
 assert.match(unfold(zh),/英仙座流星雨/);assert.match(unfold(zh),/典型極大期/);assert.equal(property(en,'UID'),property(zh,'UID'));assert.deepEqual(unfold(en).match(/DT(?:START|END);VALUE=DATE:[^\r]+/g),unfold(zh).match(/DT(?:START|END);VALUE=DATE:[^\r]+/g));
 for(const line of zh.split('\r\n'))assert(Buffer.byteLength(line,'utf8')<=75);
});
test('lunar eclipse and observing calendars translate descriptions without changing event bounds',()=>{
 const created=new Date('2026-10-27T00:00Z'),start=new Date('2026-10-27T00:00Z'),peak=new Date(+start+900000),end=new Date(+start+1800000);
 const eclipse={kind:'partial',peak,place:'London',latitude:51.5,longitude:0,timezone:'UTC',contacts:[{label:'Partial begins',time:start,altitude:42},{label:'Greatest eclipse',time:peak,altitude:43},{label:'Partial ends',time:end,altitude:44}]};
 const en=lunarEclipseCalendar(eclipse,created),zh=lunarEclipseCalendar({...eclipse,language:'zh-Hant'},created);preserve(en,zh);assert.match(unfold(zh),/偏月食/);assert.match(unfold(zh),/初虧/);assert.match(unfold(zh),/月球高度/);
 const window={start,hours:1,place:'London',latitude:51.5,longitude:0,timezone:'UTC',score:80,cloud:20,moonAbove:true,moonIllumination:.4,nightOnly:true,weather:{fetchedAt:+created-31*60000}};
 const enWindow=observingWindowCalendar(window,created),zhWindow=observingWindowCalendar({...window,language:'zh-Hant'},created);preserve(enWindow,zhWindow);assert.match(unfold(zhWindow),/觀星時段/);assert.match(unfold(zhWindow),/規劃分數：80\/100/);assert.match(unfold(zhWindow),/警告：天氣資料/);
});
