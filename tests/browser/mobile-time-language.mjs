import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const place={name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'},time='2026-10-25T00:00:00.000Z';
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
  await page.clock.setFixedTime(new Date(time));await page.addInitScript(({origin,place,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place}));localStorage.setItem('nightjar-language-v1','zh-Hant');},{origin:base.origin,place,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:Array.from({length:24},(_,i)=>Date.parse(time)/1000+i*3600),cloud_cover:Array(24).fill(20)}}}));await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.lang==='zh-Hant');const control=page.locator('.time-entry'),input=page.locator('#observing-time'),language=page.locator('#planner-language');await control.getByRole('button',{name:'地點當地時間'}).tap();await input.fill('2026-10-25T01:30');
  const warning=control.locator('.time-entry-warning');assert.match(await warning.innerText(),/此當地時間會出現兩次/);assert.equal(await warning.locator('button').count(),3);const initial=await page.evaluate(()=>localStorage.getItem('nightjar-place'));
  await language.selectOption('en');assert.equal(await input.inputValue(),'2026-10-25T01:30');assert.match(await warning.innerText(),/occurs twice/);assert.equal(await page.evaluate(()=>localStorage.getItem('nightjar-place')),initial);await language.selectOption('zh-Hant');assert.match(await warning.innerText(),/此當地時間會出現兩次/);
  const buttons=warning.locator('button');assert.match(await buttons.nth(0).innerText(),/00:30:00 UTC/);assert.match(await buttons.nth(1).innerText(),/01:30:00 UTC/);await buttons.nth(1).tap();await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('nightjar-current-time-v1')||'null')==='2026-10-25T01:30:00.000Z');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: navigation, repeated time choice and language switching passed`);
 }
}finally{await browser.close()}
