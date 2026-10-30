import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
  const time='2026-10-27T00:00:00.000Z',start=Date.parse(time)/1000;await page.clock.setFixedTime(new Date(time));
  await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;const place={name:'London',latitude:51.5,longitude:0,timezone:'UTC'};sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place}));localStorage.setItem('nightjar-places',JSON.stringify([place]));localStorage.setItem('nightjar-target-notes-v1',JSON.stringify({Vega:'Original note'}));localStorage.setItem('nightjar-language-v1','zh-Hant');},{origin:base.origin,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}}));await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'觀測地點',exact:true}).tap();
  const panel=page.locator('.planner-backup'),input=panel.locator('input[type=file]');await panel.waitFor();assert.match(await panel.innerText(),/備份你的觀測計畫/);
  await input.setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{')});await panel.getByRole('alert').waitFor();assert.match(await panel.getByRole('alert').innerText(),/不是有效的 JSON/);
  const language=page.locator('#planner-language');await language.selectOption('en');assert.match(await panel.getByRole('alert').innerText(),/not valid JSON/);await language.selectOption('zh-Hant');
  const backup={format:'nightjar-backup',version:4,exportedAt:time,data:{places:[{name:'Other London',latitude:51.5,longitude:0}],targets:['Vega'],deepTargets:['M31'],diary:[],notes:{Vega:'Incoming note'},equipment:[]}};
  await input.setInputFiles({name:'nightjar.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});const preview=panel.locator('.backup-preview');await preview.waitFor();assert.match(await preview.innerText(),/匯入前確認/);assert.match(await preview.innerText(),/保留目前已儲存版本/);assert.match(await preview.innerText(),/Vega 的筆記/);
  await language.selectOption('en');assert.match(await preview.innerText(),/Review before importing/);await language.selectOption('zh-Hant');assert.match(await preview.innerText(),/匯入前確認/);
  await page.evaluate(()=>localStorage.setItem('nightjar-target-notes-v1',JSON.stringify({Vega:'Peer note'})));await preview.getByRole('button',{name:'匯入已儲存計畫'}).tap();await preview.getByText(/確認後已儲存計畫發生變更/).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('nightjar-deep-targets-v1')),null);
  await preview.getByRole('button',{name:'匯入已儲存計畫'}).tap();await panel.getByText(/已匯入儲存計畫/).waitFor();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('nightjar-deep-targets-v1'))),['M31']);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('nightjar-target-notes-v1')).Vega),'Peer note');assert.equal(await page.locator('#observing-time').inputValue(),'2026-10-27T00:00');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated backup validation, conflict review and safe import passed`);
 }
}finally{await browser.close()}
