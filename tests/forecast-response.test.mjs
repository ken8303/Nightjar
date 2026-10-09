import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {readForecastResponse,forecastFailureMessage}=await vite.ssrLoadModule('/lib/forecast-response.ts');
test('failed HTTP forecasts reject before parsing an arbitrary error body',async()=>{
 let reads=0;
 for(const status of [401,429,502,503]){
  await assert.rejects(readForecastResponse({ok:false,json:async()=>{reads++;throw new SyntaxError(`Proxy response ${status}`)}}),/Forecast unavailable\. Please try again\./);
 }
 assert.equal(reads,0);
});
test('successful HTTP responses with unreadable bodies show retry guidance without exposing parser details',async()=>{
 for(const error of [new SyntaxError('Unexpected token < in <!DOCTYPE html>'),new TypeError('Body stream disturbed')]){
  await assert.rejects(readForecastResponse({ok:true,json:async()=>{throw error}}),{message:'Forecast response could not be read. Please retry.'});
 }
});
test('forecast decoding retains timeout identity and valid sample validation',async()=>{
 const aborted=new DOMException('The request was aborted.','AbortError');
 await assert.rejects(readForecastResponse({ok:true,json:async()=>{throw aborted}}),error=>error===aborted);
 const source={timezone:'UTC',hourly:{time:[1791547200],cloud_cover:[0]}};
 assert.deepEqual(await readForecastResponse({ok:true,json:async()=>source}),source);
 await assert.rejects(readForecastResponse({ok:true,json:async()=>({hourly:{time:[1791547200],cloud_cover:[]}})}),/cloud coverage is unavailable/);
});
test('network failures and timeouts have useful messages, while validated forecast guidance survives',()=>{
 assert.equal(forecastFailureMessage(new TypeError('Failed to fetch')),'Forecast unavailable. Please try again.');
 assert.equal(forecastFailureMessage(null),'Forecast unavailable. Please try again.');
 assert.equal(forecastFailureMessage(new DOMException('Aborted','AbortError')),'Weather request timed out. Please retry.');
 assert.equal(forecastFailureMessage(new Error('Forecast timestamps are unavailable. Please retry.')),'Forecast timestamps are unavailable. Please retry.');
});
