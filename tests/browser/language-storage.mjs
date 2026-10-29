import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 await context.addInitScript(origin=>{if(location.origin!==origin)return;const place={name:'London',latitude:51.5,longitude:0,timezone:'UTC'};sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-10-27T00:00:00.000Z',place}));},base.origin);
 const start=Date.parse('2026-10-27T00:00Z')/1000;await context.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}}));
 await context.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
 const first=await context.newPage(),second=await context.newPage();await first.goto(base.href);await second.goto(base.href);await second.locator('#observing-time').fill('');await first.locator('#planner-language').selectOption('zh-Hant');
 await second.waitForFunction(()=>document.documentElement.lang==='zh-Hant');assert.equal(await second.locator('#observing-time').inputValue(),'');assert.match(await second.locator('.time-entry-warning').textContent(),/請輸入完整的觀測日期與時間/);await context.close();
 const blocked=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 await blocked.addInitScript(origin=>{if(location.origin!==origin)return;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='nightjar-language-v1')throw new DOMException('blocked','QuotaExceededError');return original.call(this,key,value)};const place={name:'London',latitude:51.5,longitude:0,timezone:'UTC'};sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-10-27T00:00:00.000Z',place}));},base.origin);
 await blocked.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}}));await blocked.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
 const page=await blocked.newPage();await page.goto(base.href);await page.locator('#planner-language').selectOption('zh-Hant');await page.waitForFunction(()=>document.documentElement.lang==='zh-Hant');assert.match(await page.locator('.language-control [role=status]').textContent(),/無法儲存語言設定/);assert.equal(await page.locator('#observing-time').inputValue(),'2026-10-27T00:00');await blocked.close();
 console.log('language preference: cross-tab update preserves a draft; storage failure remains usable');
}finally{await browser.close()}
