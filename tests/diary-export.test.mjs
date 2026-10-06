import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {diaryReport,diaryCSV}=await vite.ssrLoadModule('/lib/diary-export.ts');
const entry={id:'night-1',target:'M31',observedAt:'2026-10-25T00:30:00.000Z',place:{name:'London <site>',latitude:51.508,longitude:-.126,timezone:'Europe/London',bortle:4},outcome:'seen',equipment:'Binoculars "10×50"',notes:'First line\n星空 <img src=x onerror=alert(1)>'};
function parseCSV(text){const rows=[],row=[];let value='',quoted=false;for(let i=0;i<text.length;i++){const char=text[i];if(char==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++}else quoted=!quoted}else if(char===','&&!quoted){row.push(value);value=''}else if(char==='\r'&&!quoted&&text[i+1]==='\n'){row.push(value);rows.push([...row]);row.length=0;value='';i++}else value+=char}return rows}
test('diary report escapes text, preserves all records and has no remote resources',()=>{
 const many=Array.from({length:200},(_,i)=>({...entry,id:`night-${i}`})),html=diaryReport(many);
 assert.equal([...html.matchAll(/<article>/g)].length,200);assert(html.includes('200 saved observations'));assert(html.includes('London &lt;site&gt;'));assert(html.includes('星空 &lt;img'));assert(!html.includes('<img'));assert(!/<[^>]+\b(?:src|href)\s*=/i.test(html));assert(html.includes('Print or save as PDF'));assert(html.includes(entry.observedAt));assert.deepEqual(many[0],{...entry,id:'night-0'});
 assert(diaryReport([]).includes('No saved observations'));assert.throws(()=>diaryReport([{...entry,target:'M102'}]));
});
test('CSV preserves Unicode, commas, quotes, multiline notes and clock-change offsets',()=>{
 const later={...entry,id:'night-2',observedAt:'2026-10-25T01:30:00.000Z',place:{...entry.place,name:'Dark field, London'}},csv=diaryCSV([entry,later]);
 assert(csv.startsWith('\uFEFF'));const rows=parseCSV(csv.slice(1));assert.equal(rows.length,3);assert.equal(rows[0].length,12);assert(rows.every(row=>row.length===12));assert.equal(rows[1][0],'night-2');assert.equal(rows[1][5],later.place.name);assert.equal(rows[1][10],entry.equipment);assert.equal(rows[1][11],entry.notes);assert(rows[1][3].includes('GMT'));assert(rows[2][3].includes('GMT+1'));assert.equal(rows[1][7],String(entry.place.longitude));assert.equal(rows[1][2],later.observedAt);
});
test('CSV prefixes formula-like text and rejects malformed diary records',()=>{
 for(const text of ['=HYPERLINK("https://example.com")','+SUM(1,2)','-1+2','@SUM(1,2)','  =1+1','\t=1+1','\r=1+1']){
  const rows=parseCSV(diaryCSV([{...entry,notes:text,equipment:text,place:{...entry.place,name:text}}]).slice(1));
  for(const index of [5,10,11])assert.equal(rows[1][index],"'"+text);
 }
 assert.throws(()=>diaryCSV([{...entry,notes:'x'.repeat(2001)}]));assert.equal(parseCSV(diaryCSV([]).slice(1)).length,1);
});
