import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
  const time='2026-10-21T22:00:00.000Z',start=Date.parse(time)/1000;await page.clock.setFixedTime(new Date(time));
  await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place:{name:'London',latitude:51.5,longitude:0,timezone:'UTC'}}));localStorage.setItem('nightjar-language-v1','zh-Hant');},{origin:base.origin,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:Array.from({length:48},(_,i)=>start+i*3600),cloud_cover:Array(48).fill(20)}}}));
  await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'天象日曆',exact:true}).tap();
  const cards=page.locator('.event-card');await cards.first().waitFor();assert.equal(await cards.count(),7);const orion=cards.filter({hasText:'獵戶座流星雨'});assert.equal(await orion.count(),1);assert.match(await orion.innerText(),/流星／小時，理想條件/);assert.match(await orion.innerText(),/雲量預報|雲量預報。|黑夜小時/);assert.match(await page.locator('.calendar-forecast').innerText(),/LONDON 的雲量預報/);
  const language=page.locator('#planner-language');await language.selectOption('en');assert.match(await cards.first().innerText(),/Orionids/);await language.selectOption('zh-Hant');assert.match(await cards.first().innerText(),/獵戶座流星雨/);
  const downloadPromise=page.waitForEvent('download');await cards.first().getByRole('button',{name:'下載高峰日期參考'}).tap();const download=await downloadPromise;assert.match(download.suggestedFilename(),/orionids-2026\.ics/);const calendar=await readFile(await download.path(),'utf8');assert.match(calendar.replace(/\r\n[ \t]/g,''),/獵戶座流星雨/);assert.match(await page.locator('#planner-notice').innerText(),/典型高峰日期/);await language.selectOption('en');assert.match(await page.locator('#planner-notice').innerText(),/Typical peak-date reference prepared/);await language.selectOption('zh-Hant');assert.match(await page.locator('#planner-notice').innerText(),/典型高峰日期/);
  await page.locator('#observing-time').fill('2026-10-22T12:00');await page.locator('[data-night-content="events"]').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated meteor cards, forecast, calendar and night gating passed`);
 }
}finally{await browser.close()}
