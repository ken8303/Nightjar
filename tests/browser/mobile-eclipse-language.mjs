import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright'),A=require('astronomy-engine');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const place={name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'},time='2026-10-25T00:00:00.000Z';
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
  await page.clock.setFixedTime(new Date(time));await page.addInitScript(({origin,place,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place}));localStorage.setItem('nightjar-language-v1','zh-Hant');},{origin:base.origin,place,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[Date.parse(time)/1000],cloud_cover:[20]}}}));await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.lang==='zh-Hant');await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'月球',exact:true}).tap();
  const panel=page.locator('.eclipse-panel'),language=page.locator('#planner-language');await panel.getByText('即將發生的月食').waitFor();assert.match(await panel.innerText(),/只顯示處於完全天文黑夜的接觸時刻/);assert.match(await panel.locator('.eclipse-contacts').innerText(),/半影食始|初虧|食既|食甚|生光|復圓|半影食終/);
  const stamps=await panel.locator('.eclipse-contacts time').evaluateAll(nodes=>nodes.map(node=>node.dateTime));assert(stamps.length>0);const observer=new A.Observer(place.latitude,place.longitude,0);
  for(const stamp of stamps){const date=new Date(stamp),sun=A.Equator(A.Body.Sun,date,observer,true,true);assert(A.Horizon(date,observer,sun.ra,sun.dec).altitude< -18)}
  const chosen=await panel.locator('.eclipse-picker button[aria-pressed=true]').innerText(),pending=page.waitForEvent('download');await panel.getByRole('button',{name:'下載英文月食行事曆',exact:true}).tap();const file=await pending,calendar=await readFile(await file.path(),'utf8');assert(calendar.includes('BEGIN:VCALENDAR'));assert(calendar.includes('GEO:51.5;0'));assert.match(await panel.innerText(),/行事曆檔案已準備好/);
  await language.selectOption('en');assert.match(await panel.innerText(),/Calendar file ready/);assert.deepEqual(await panel.locator('.eclipse-contacts time').evaluateAll(nodes=>nodes.map(node=>node.dateTime)),stamps);assert.equal(await panel.locator('.eclipse-picker button[aria-pressed=true]').count(),1);await language.selectOption('zh-Hant');assert.equal(await panel.locator('.eclipse-picker button[aria-pressed=true]').innerText(),chosen);assert.deepEqual(await panel.locator('.eclipse-contacts time').evaluateAll(nodes=>nodes.map(node=>node.dateTime)),stamps);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: lunar eclipse translation, dark contacts, calendar and language switching passed`);
 }
}finally{await browser.close()}
