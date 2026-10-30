import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(30000);
  const time='2026-10-27T00:00:00.000Z',start=Date.parse(time)/1000;await page.clock.setFixedTime(new Date(time));
  await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;const place={name:'London',latitude:51.5,longitude:0,timezone:'UTC'},entry={id:'entry-one',target:'M31',observedAt:time,place,outcome:'seen',equipment:'',notes:'User 星空'};sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place}));localStorage.setItem('nightjar-language-v1','zh-Hant');localStorage.setItem('nightjar-sky-view-v1','2d');localStorage.setItem('nightjar-deep-targets-v1',JSON.stringify(['M31']));localStorage.setItem('nightjar-observing-diary-v1',JSON.stringify([entry]));},{origin:base.origin,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}}));await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'星空圖',exact:true}).tap();await page.getByRole('button',{name:'選擇已儲存的 M31'}).tap();
  const finder=page.locator('#deep-sky-finder'),diary=finder.locator('#observing-diary'),entry=diary.locator('#diary-entries article').first();await entry.waitFor();const chinese=await entry.innerText();assert.match(chinese,/User 星空/);assert.match(chinese,/2026年/);
  const language=page.locator('#planner-language');await language.selectOption('en');assert.match(await entry.innerText(),/Oct/);assert.match(await entry.innerText(),/User 星空/);await language.selectOption('zh-Hant');assert.match(await entry.innerText(),/2026年/);
  await finder.getByRole('button',{name:'移除已儲存的 M31'}).tap();await finder.getByText('深空清單已儲存於此瀏覽器。').first().waitFor();await language.selectOption('en');await finder.getByText('Deep-sky list saved on this browser.').first().waitFor();await language.selectOption('zh-Hant');await finder.getByRole('button',{name:'復原移除 M31'}).tap();await finder.getByText('已將 M31 還原至深空清單。').first().waitFor();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('nightjar-deep-targets-v1'))),['M31']);assert.match(await entry.innerText(),/User 星空/);
  assert.equal(await page.locator('#observing-time').inputValue(),'2026-10-27T00:00');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated shortlist feedback and diary dates preserve data`);
 }
}finally{await browser.close()}
