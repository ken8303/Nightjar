import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
  await page.clock.setFixedTime(new Date('2026-10-27T00:00:00Z'));await page.addInitScript(origin=>{if(location.origin!==origin)return;localStorage.setItem('nightjar-language-v1','zh-Hant');localStorage.setItem('nightjar-place','{broken');localStorage.setItem('nightjar-places','[broken');},base.origin);
  const start=Date.parse('2026-10-27T00:00Z')/1000;await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}}));await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});const warning=page.locator('.startup-site-warning');await warning.waitFor();assert.match(await warning.innerText(),/無法取得已儲存的觀測地點/);assert.match(await warning.innerText(),/儲存的資料未更改/);
  const language=page.locator('#planner-language');await language.selectOption('en');assert.match(await warning.innerText(),/Stored observing site unavailable/);await language.selectOption('zh-Hant');await warning.getByRole('button',{name:'重試讀取觀測地點'}).tap();assert.equal(await page.evaluate(()=>localStorage.getItem('nightjar-place')),'{broken');
  await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'觀測地點',exact:true}).tap();const saved=page.locator('.saved-places-read-error');await saved.waitFor();assert.match(await saved.innerText(),/儲存的資料未更改/);await saved.getByRole('button',{name:'重試讀取已儲存地點'}).tap();assert.equal(await page.evaluate(()=>localStorage.getItem('nightjar-places')),'[broken');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated site recovery retains unreadable data`);
 }
}finally{await browser.close()}
