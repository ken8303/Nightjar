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
  await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place:{name:'London',latitude:51.5,longitude:0,timezone:'UTC'}}));localStorage.setItem('nightjar-language-v1','zh-Hant');localStorage.setItem('nightjar-sky-view-v1','2d');localStorage.setItem('nightjar-targets-v1',JSON.stringify(['Vega']));localStorage.setItem('nightjar-target-notes-v1',JSON.stringify({Vega:'Original note'}));const native=Storage.prototype.setItem;window.__nightjarSetItem=native;Storage.prototype.setItem=function(key,value){if(key==='nightjar-target-notes-v1'&&window.__blockNotes)throw new DOMException('Full','QuotaExceededError');return native.call(this,key,value)};},{origin:base.origin,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}}));await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'星空圖',exact:true}).tap();
  const finder=page.locator('#target-finder');await finder.locator('.saved-target-select').filter({hasText:'Vega'}).tap();const detail=finder.locator('#target-details'),note=detail.locator('#target-notes');await note.waitFor();assert.match(await detail.innerText(),/視星等/);assert.equal(await note.inputValue(),'Original note');
  await page.evaluate(()=>{window.__blockNotes=true});await note.fill('Draft 星空');await detail.getByText(/無法儲存你的編輯/).waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('nightjar-target-notes-v1')).Vega),'Original note');
  await page.evaluate(()=>{window.__blockNotes=false;window.__nightjarSetItem.call(localStorage,'nightjar-target-notes-v1',JSON.stringify({Vega:'Peer note'}))});await finder.getByRole('button',{name:'查看已儲存的筆記版本'}).tap();const review=finder.locator('.target-note-review');await review.waitFor();assert.match(await review.innerText(),/確認衝突的筆記/);assert.match(await review.innerText(),/Draft 星空/);assert.match(await review.innerText(),/Peer note/);
  const language=page.locator('#planner-language');await language.selectOption('en');assert.match(await review.innerText(),/Review conflicting notes/);await language.selectOption('zh-Hant');assert.match(await review.innerText(),/確認衝突的筆記/);await review.getByRole('button',{name:'保留我確認的版本'}).tap();await review.waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('nightjar-target-notes-v1')).Vega),'Draft 星空');assert.equal(await note.inputValue(),'Draft 星空');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated bright-target details and safe note conflict review passed`);
 }
}finally{await browser.close()}
