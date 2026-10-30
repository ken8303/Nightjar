import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const [elements]=JSON.parse(await readFile(new URL('../fixtures/iss-2026-10-19.json',import.meta.url),'utf8'));
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
  const time='2026-10-19T00:00:00.000Z',start=Date.parse(time)/1000;await page.clock.setFixedTime(new Date(time));
  await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place:{name:'Test site',latitude:40,longitude:0,timezone:'UTC'}}));localStorage.setItem('nightjar-language-v1','zh-Hant');localStorage.setItem('nightjar-sky-view-v1','2d');},{origin:base.origin,time});
  await page.route('**/api/satellite?*',route=>route.fulfill({json:{version:1,elements,fetchedAt:time,nextRefreshAt:'2026-10-19T02:00:00.000Z',refreshPaused:false,issue:''}}));
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:Array.from({length:25},(_,i)=>start+i*3600),cloud_cover:Array(25).fill(20)}}}));await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'星空圖',exact:true}).tap();
  const panel=page.locator('.satellite-tracker');await panel.getByRole('button',{name:'載入國際太空站方向'}).tap();const passes=panel.locator('.satellite-passes');await passes.getByRole('button',{name:'搜尋未來 24 小時的國際太空站通過'}).tap();const window=passes.locator('.satellite-viewing-windows.has-window').first();await window.waitFor({timeout:30000});assert.match(await window.innerText(),/每小時雲量：約 20%/);assert.match(await window.innerText(),/使用中點/);
  const downloadPromise=page.waitForEvent('download');await window.getByRole('button',{name:/下載 .* 的國際太空站時段行事曆/}).tap();const download=await downloadPromise;assert.match(download.suggestedFilename(),/^nightjar-iss-.*\.ics$/);const text=await readFile(await download.path(),'utf8');assert.match(text,/BEGIN:VCALENDAR/);assert.match(text,/Test site/);assert.match(text.replace(/\r\n[ \t]/g,''),/國際太空站觀測時段/);assert.match(await window.innerText(),/已準備行事曆檔案/);
  await page.locator('#planner-language').selectOption('en');assert.match(await window.innerText(),/Hourly cloud cover: about 20%/);assert.match(await window.innerText(),/Calendar file prepared/);assert.equal(await page.locator('#observing-time').inputValue(),'2026-10-19T00:00');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated sunlit window, cloud context and calendar passed`);
 }
}finally{await browser.close()}
