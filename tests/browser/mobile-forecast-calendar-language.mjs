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
  const time='2026-10-20T20:00:00.000Z',start=Date.parse(time)/1000;await page.clock.setFixedTime(new Date('2026-10-20T18:30:00Z'));
  await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place:{name:'London',latitude:51.5,longitude:0,timezone:'UTC'}}));localStorage.setItem('nightjar-language-v1','zh-Hant');},{origin:base.origin,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:Array.from({length:10},(_,i)=>start+i*3600),cloud_cover:Array(10).fill(20)}}}));await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});const panel=page.locator('.seven-night-outlook');const button=panel.getByRole('button',{name:/下載 .* 的行事曆活動/}).first();await button.waitFor();const [download]=await Promise.all([page.waitForEvent('download'),button.tap()]);const calendar=(await readFile(await download.path(),'utf8')).replace(/\r\n[ \t]/g,'');assert.match(calendar,/觀星時段/);assert.match(calendar,/規劃分數/);const status=panel.locator('.night-download-status');assert.match(await status.innerText(),/已準備.*行事曆檔案/);const before=await page.locator('#observing-time').inputValue(),language=page.locator('#planner-language');await language.selectOption('en');assert.match(await status.innerText(),/Calendar file prepared for/);await language.selectOption('zh-Hant');assert.match(await status.innerText(),/已準備.*行事曆檔案/);assert.equal(await page.locator('#observing-time').inputValue(),before);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated forecast calendar and stable confirmation passed`);
 }
}finally{await browser.close()}
