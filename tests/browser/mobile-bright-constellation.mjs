import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const place={name:'London',latitude:51.5,longitude:0,timezone:'UTC'},time='2026-10-27T00:00:00.000Z';
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
  await page.clock.setFixedTime(new Date(time));await page.addInitScript(({origin,place,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place}));localStorage.setItem('nightjar-language-v1','zh-Hant');localStorage.setItem('nightjar-sky-view-v1','2d');},{origin:base.origin,place,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:Array.from({length:48},(_,i)=>Date.parse(time)/1000+i*3600),cloud_cover:Array(48).fill(20)}}}));await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.lang==='zh-Hant');
  async function section(name){await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name,exact:true}).tap()}
  await section('星空圖');const filter=page.locator('#bright-constellation'),language=page.locator('#planner-language');await filter.waitFor();await filter.selectOption('Aries');assert.match(await filter.locator('option[value="Aries"]').textContent(),/牡羊座/);assert.match(await page.locator('#target-results').textContent(),/月球/);
  await page.locator('#observing-time').fill('2026-10-28T00:00');await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('nightjar-current-time-v1')||'null')==='2026-10-28T00:00:00.000Z');
  assert.equal(await filter.inputValue(),'Aries');assert.equal(await page.locator('#target-results button').count(),0);assert.match(await filter.locator('option[value="Aries"]').textContent(),/牡羊座/);
  await language.selectOption('en');assert.equal(await filter.inputValue(),'Aries');assert.match(await filter.locator('option[value="Aries"]').textContent(),/Aries/);await language.selectOption('zh-Hant');assert.match(await filter.locator('option[value="Aries"]').textContent(),/牡羊座/);
  await section('觀測地點');await section('星空圖');await filter.waitFor();assert.equal(await filter.inputValue(),'Aries');assert.match(await filter.locator('option[value="Aries"]').textContent(),/牡羊座/);assert.equal(await page.locator('#target-results button').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated constellation filter survives target movement, language change and view changes`);
 }
}finally{await browser.close()}
