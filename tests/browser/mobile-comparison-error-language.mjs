import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(30000);
  const time='2026-10-20T19:00:00.000Z',start=Date.parse(time)/1000;await page.clock.setFixedTime(new Date(time));
  await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;const place={name:'London',latitude:51.5,longitude:0,timezone:'UTC'};sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place}));localStorage.setItem('nightjar-places',JSON.stringify([place,{name:'Paris',latitude:48.8566,longitude:2.3522,timezone:'Europe/Paris'}]));localStorage.setItem('nightjar-language-v1','zh-Hant');},{origin:base.origin,time});
  let calls=0;await page.route('**/api/weather?*',route=>{calls++;return new URL(route.request().url()).searchParams.get('lat')==='48.8566'?route.fulfill({json:{error:'Provider diagnostic QA'}}):route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}})});await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'觀測地點',exact:true}).tap();const panel=page.locator('.place-comparison');await panel.getByText('預報錯誤：Provider diagnostic QA').waitFor();const count=calls,language=page.locator('#planner-language');await language.selectOption('en');await panel.getByText('Provider diagnostic QA',{exact:true}).waitFor();await language.selectOption('zh-Hant');await panel.getByText('預報錯誤：Provider diagnostic QA').waitFor();assert.equal(calls,count);assert.equal(await page.locator('#observing-time').inputValue(),'2026-10-20T19:00');assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated comparison preserves provider detail`);
 }
}finally{await browser.close()}
