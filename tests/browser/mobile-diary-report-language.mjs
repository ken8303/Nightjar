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
  await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;const place={name:'London',latitude:51.5,longitude:0,timezone:'UTC'},entry={id:'entry-one',target:'M31',observedAt:time,place,outcome:'seen',equipment:'',notes:'User 星空 <test>'};sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place}));localStorage.setItem('nightjar-language-v1','zh-Hant');localStorage.setItem('nightjar-sky-view-v1','2d');localStorage.setItem('nightjar-deep-targets-v1',JSON.stringify(['M31']));localStorage.setItem('nightjar-observing-diary-v1',JSON.stringify([entry]));},{origin:base.origin,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}}));await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'星空圖',exact:true}).tap();await page.getByRole('button',{name:'選擇已儲存的 M31'}).tap();
  const diary=page.locator('#observing-diary');await diary.getByRole('button',{name:'預覽日誌報告'}).tap();const dialog=page.locator('.document-preview-dialog'),frame=dialog.locator('iframe');let html=await frame.getAttribute('srcdoc');assert.match(html,/<html lang="zh-Hant">/);assert.match(html,/觀測日誌/);assert.match(html,/User 星空 &lt;test&gt;/);
  const [download]=await Promise.all([page.waitForEvent('download'),dialog.getByRole('button',{name:'下載 HTML'}).tap()]);html=await readFile(await download.path(),'utf8');assert.match(html,/<html lang="zh-Hant">/);assert.match(html,/User 星空 &lt;test&gt;/);await dialog.getByRole('button',{name:'關閉預覽'}).tap();
  await page.locator('#planner-language').selectOption('en');await diary.getByRole('button',{name:'Preview diary report'}).tap();html=await frame.getAttribute('srcdoc');assert.match(html,/<html lang="en">/);assert.match(html,/OBSERVING DIARY/);await dialog.getByRole('button',{name:'Close preview'}).tap();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('nightjar-observing-diary-v1'))[0].notes),'User 星空 <test>');assert.equal(await page.locator('#observing-time').inputValue(),'2026-10-27T00:00');assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated diary report preview and download preserve observations`);
 }
}finally{await browser.close()}
