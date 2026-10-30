import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
  const time='2026-10-20T19:00:17.125Z';await page.clock.setFixedTime(new Date('2026-10-20T18:30:00Z'));
  await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;const place={name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'};sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place}));localStorage.setItem('nightjar-places',JSON.stringify([place,{name:'Paris',latitude:48.8566,longitude:2.3522,timezone:'Europe/Paris'}]));localStorage.setItem('nightjar-language-v1','zh-Hant');},{origin:base.origin,time});
  await page.route('**/api/weather?*',route=>{const paris=new URL(route.request().url()).searchParams.get('lat')==='48.8566';return route.fulfill({json:{hourly:{time:[Date.parse('2026-10-20T19:00Z')/1000],cloud_cover:[paris?0:80]}}})});
  await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'觀測地點',exact:true}).tap();
  const comparison=page.locator('.place-comparison'),action=comparison.getByRole('button',{name:'在 Paris 規劃觀測'});await action.waitFor();assert.match(await comparison.innerText(),/比較觀測地點/);assert.match(await comparison.innerText(),/觀測評分/);const saved=await page.evaluate(()=>localStorage.getItem('nightjar-places'));
  await page.clock.setFixedTime(new Date('2026-10-20T19:01:00Z'));await action.tap();const issue=comparison.locator('#comparison-planning-status');await issue.waitFor();assert.match(await issue.innerText(),/觀測地點與時間保持不變/);
  const language=page.locator('#planner-language');await language.selectOption('en');assert.match(await issue.innerText(),/Your site and observing time were kept/);await language.selectOption('zh-Hant');assert.match(await issue.innerText(),/觀測地點與時間保持不變/);
  await comparison.getByRole('button',{name:'更新預報',exact:true}).tap();await action.waitFor();assert.equal(await issue.count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('nightjar-places')),saved);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated site comparison, freshness guard and language switching passed`);
 }
}finally{await browser.close()}
