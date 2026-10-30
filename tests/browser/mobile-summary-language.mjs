import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true,acceptDownloads:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(30000);
  const time='2026-10-27T00:00:00.000Z',start=Date.parse(time)/1000;await page.clock.setFixedTime(new Date(time));
  await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place:{name:'London',latitude:51.5,longitude:0,timezone:'UTC'}}));localStorage.setItem('nightjar-language-v1','zh-Hant');Object.defineProperty(navigator,'share',{value:data=>{window.__shared=data;return new Promise(resolve=>{window.__finishShare=resolve})},configurable:true});},{origin:base.origin,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20],temperature_2m:[8]}}}));await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.locator('.hour').first().waitFor();const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'下載觀測摘要'}).tap()]);const text=await readFile(await download.path(),'utf8');assert.match(text,/NIGHTJAR 觀測摘要/);assert.match(text,/雲量：20%/);assert.match(text,/氣溫：8 °C/);assert.match(text,/2026-10-27T00:00:00.000Z/);
  const notice=page.locator('#planner-notice'),language=page.locator('#planner-language');assert.match(await notice.innerText(),/觀測摘要已準備好/);await language.selectOption('en');assert.match(await notice.innerText(),/Observing summary prepared/);await language.selectOption('zh-Hant');
  await page.getByRole('button',{name:'分享觀測摘要'}).tap();await page.waitForFunction(()=>Boolean(window.__shared));const shared=await page.evaluate(()=>window.__shared);assert.equal(shared.title,'Nightjar 觀測摘要');assert.match(shared.text,/雲量：20%/);await language.selectOption('en');await page.evaluate(()=>window.__finishShare());await notice.getByText(/Share options completed for London/).waitFor();await language.selectOption('zh-Hant');assert.match(await notice.innerText(),/分享選項已結束/);assert.equal(await page.locator('#observing-time').inputValue(),'2026-10-27T00:00');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated summary download and captured share snapshot passed`);
 }
}finally{await browser.close()}
