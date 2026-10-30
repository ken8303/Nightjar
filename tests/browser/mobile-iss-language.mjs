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
  const time='2026-10-19T02:00:00.000Z',start=Date.parse(time)/1000;await page.clock.setFixedTime(new Date(time));
  await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place:{name:'London',latitude:51.5,longitude:0,timezone:'UTC'}}));localStorage.setItem('nightjar-language-v1','zh-Hant');localStorage.setItem('nightjar-sky-view-v1','2d');},{origin:base.origin,time});
  let calls=0;await page.route('**/api/satellite?*',route=>{calls++;return route.fulfill({json:{version:1,elements,fetchedAt:time,nextRefreshAt:'2026-10-19T04:00:00.000Z',refreshPaused:true,issue:'The orbital provider could not be reached. Refresh is paused until the next two-hour window.'}})});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}}));await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'星空圖',exact:true}).tap();
  const panel=page.locator('.satellite-tracker');await panel.getByRole('button',{name:'載入國際太空站方向'}).tap();await panel.locator('.satellite-facts').waitFor();assert.equal(calls,1);assert.match(await panel.innerText(),/幾何高度角/);assert.match(await panel.innerText(),/無法連線至軌道資料供應商/);assert.match(await panel.innerText(),/伺服器調查期間暫停更新/);
  const passes=panel.locator('.satellite-passes');await passes.getByRole('button',{name:'搜尋未來 24 小時的國際太空站通過'}).tap();await passes.getByText(/此搜尋時段找到/).waitFor({timeout:30000});assert.match(await passes.innerText(),/完全天文黑夜/);assert.equal(await passes.locator('.satellite-pass-list>li').count(),2);assert.match(await passes.locator('.satellite-pass-list').innerText(),/最高高度角/);
  const language=page.locator('#planner-language');await language.selectOption('en');await passes.getByText(/geometric pass(?:es)? found in this search window/).waitFor();assert.match(await passes.locator('.satellite-pass-list').innerText(),/highest altitude/);await language.selectOption('zh-Hant');await passes.getByText(/此搜尋時段找到/).waitFor();
  await page.clock.setFixedTime(new Date('2026-10-19T09:00:00.000Z'));await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await panel.getByText(/快取的軌道資料已超過六小時/).waitFor();assert.equal(await panel.locator('.satellite-facts').count(),0);
  await language.selectOption('en');await panel.getByText(/Cached orbital data is more than six hours old/).waitFor();await language.selectOption('zh-Hant');await panel.getByText(/快取的軌道資料已超過六小時/).waitFor();assert.equal(calls,1);assert.equal(await page.locator('#observing-time').inputValue(),'2026-10-19T02:00');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: localized ISS directions, provider warning and stale-data guard passed`);
 }
}finally{await browser.close()}
