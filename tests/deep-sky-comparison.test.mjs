import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {compareDeepSky,deepSkyOpportunity}=await vite.ssrLoadModule('/lib/deep-sky-comparison.ts');
const {findDeepSky,deepSkyWindow,bestDeepSkySample}=await vite.ssrLoadModule('/lib/deep-sky.ts');
const place={name:'London',latitude:51.508,longitude:-.126,timezone:'Europe/London'},date=new Date('2026-10-05T20:00Z');
test('comparison uses the same astronomical samples, sorts highest eligible peaks first and limits computation',()=>{
 const targets=['M31','M45','M57'].map(id=>findDeepSky(id,'')[0]),rows=compareDeepSky(targets,date,place);
 assert.equal(rows.length,3);
 for(const row of rows){const reference=deepSkyWindow(row.target,date,place);assert.deepEqual(row.samples.map(sample=>{const original={...sample};delete original.moonAltitude;return original}),reference);const best=bestDeepSkySample(reference);assert.equal(row.best?.altitude,best?.altitude);assert.equal(+row.best?.time,+best?.time);assert.equal(row.samples.length,97)}
 for(let i=1;i<rows.length;i++)assert((rows[i-1].best?.altitude??-Infinity)>=(rows[i].best?.altitude??-Infinity));
 assert.throws(()=>compareDeepSky(Array(7).fill(targets[0]),date,place));assert.deepEqual(compareDeepSky([],date,place),[]);
 assert(compareDeepSky(targets,new Date('2026-06-21T12:00Z'),{name:'North pole',latitude:89,longitude:0}).every(row=>!row.best&&row.minutes===0));
});
test('opportunity intervals exclude threshold samples and gaps, split windows and retain isolated peaks',()=>{
 const sample=(index,altitude=40,sun=-18)=>({time:new Date(+date+index*900000),altitude,sun,azimuth:0,ra:0,dec:0});
 const result=deepSkyOpportunity([sample(0),sample(1),sample(2,30),sample(3),sample(4),sample(5,50,-17.99),sample(6,80)]);
 assert.equal(result.minutes,30);assert.equal(result.windows.length,2);assert.equal(result.windows[0].minutes,15);assert.equal(result.best.altitude,80);
 assert.equal(deepSkyOpportunity([sample(0),sample(2)]).minutes,0);assert.equal(deepSkyOpportunity([sample(0,30)]).best,null);assert.equal(deepSkyOpportunity([]).minutes,0);
});
test('clock-change comparisons preserve absolute durations and distinguish repeated local hours',()=>{
 const rows=compareDeepSky([findDeepSky('M31','')[0]],new Date('2026-10-25T00:00Z'),place),row=rows[0];
 const stamp=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/London',timeZoneName:'shortOffset'});
 assert.notEqual(stamp.format(row.samples[0].time),stamp.format(row.samples[4].time));
 for(const window of row.windows)assert.equal(window.minutes,(+window.end-+window.start)/60000);
});
