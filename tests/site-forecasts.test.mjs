import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {storeSiteForecast,siteForecastState}=await vite.ssrLoadModule('/lib/site-forecasts.ts');
const data={timezone:'Europe/London',hourly:{time:[1791403200],cloud_cover:[20]}};
test('failed site refresh preserves the exact successful forecast and timestamp, then retry replaces both',()=>{
 const previous={a:{data,requestKey:'a:0',fetchedAt:1000}},before=structuredClone(previous);
 const failed=storeSiteForecast(previous,'a',{requestKey:'a:1',error:'Unavailable'},['a']);
 assert.equal(failed.a.data,data);assert.equal(failed.a.fetchedAt,1000);assert.equal(failed.a.error,'Unavailable');assert.deepEqual(previous,before);
 const fresh={...data,hourly:{...data.hourly,cloud_cover:[50]}};
 const recovered=storeSiteForecast(failed,'a',{requestKey:'a:2',data:fresh,fetchedAt:5000},['a']);
 assert.equal(recovered.a.data,fresh);assert.equal(recovered.a.fetchedAt,5000);assert.equal(recovered.a.error,undefined);assert.equal(failed.a.data,data);
});
test('site results remain isolated by coordinates and only active site records are retained',()=>{
 const previous={a:{data,requestKey:'old',fetchedAt:1000},b:{data:{...data,timezone:'Asia/Tokyo'},requestKey:'old',fetchedAt:2000}};
 const result=storeSiteForecast(previous,'c',{requestKey:'new',error:'Unavailable'},['b','c']);
 assert.deepEqual(Object.keys(result).sort(),['b','c']);assert.equal(result.c.data,undefined);assert.equal(result.c.fetchedAt,undefined);assert.equal(result.b,previous.b);
 assert.deepEqual(storeSiteForecast(previous,'a',{requestKey:'late',data},['b']),{b:previous.b});
});
test('refresh state hides an obsolete error while loading and exposes failure and stale age after settlement',()=>{
 assert.deepEqual(siteForecastState(undefined,'new',1000),{loading:true,error:'',stale:false});
 const result={data,requestKey:'old',fetchedAt:1000,error:'Failed'};
 assert.deepEqual(siteForecastState(result,'new',1000),{loading:true,error:'',stale:false});
 assert.deepEqual(siteForecastState(result,'old',1800999),{loading:false,error:'Failed',stale:false});
 assert.deepEqual(siteForecastState(result,'old',1801000),{loading:false,error:'Failed',stale:true});
 assert.deepEqual(siteForecastState({requestKey:'new',error:'Failed'},'new',1801000),{loading:false,error:'Failed',stale:false});
});
