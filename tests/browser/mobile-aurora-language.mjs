import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
  const time='2026-10-27T00:00:00.000Z',start=Date.parse(time)/1000;
  await page.clock.setFixedTime(new Date(time));await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place:{name:'London',latitude:51.5,longitude:0,timezone:'UTC'}}));localStorage.setItem('nightjar-language-v1','zh-Hant');},{origin:base.origin,time});
  let fail=false,forecast=time;await page.route('**/api/aurora',route=>fail?route.fulfill({status:503,json:{}}):route.fulfill({json:{forecastAt:forecast,observedAt:new Date(Date.parse(forecast)-1800000).toISOString(),fetchedAt:time,cells:Array.from({length:100},(_,i)=>[i,52,50])}}));
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start,start+3600],cloud_cover:[20,20]}}}));
  await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'極光',exact:true}).tap();
  const panel=page.locator('.aurora-outlook'),cloud=page.locator('.aurora-cloud-context');await panel.waitFor();await cloud.waitFor();assert.match(await panel.innerText(),/模式估算/);assert.match(await cloud.innerText(),/預測雲量：20%/);assert.match(await page.locator('.aurora-grid svg').getAttribute('aria-label'),/北半球極光模式/);
  const language=page.locator('#planner-language');await language.selectOption('en');assert.match(await panel.innerText(),/MODEL ESTIMATE/);assert.match(await cloud.innerText(),/Forecast cloud cover at London: 20%/);await language.selectOption('zh-Hant');
  fail=true;await page.getByRole('button',{name:'更新',exact:true}).tap();await page.getByRole('alert').filter({hasText:'NOAA 極光預報暫時無法取得'}).waitFor();assert.match(await page.locator('.aurora-intro').locator('..').innerText(),/更新失敗，現顯示先前預報/);
  fail=false;forecast='2026-10-27T12:00:00.000Z';await page.getByRole('button',{name:'重試極光預報'}).tap();await page.getByRole('heading',{name:'極光預報時間不在完全天文黑夜'}).waitFor();assert.equal(await page.locator('.aurora-value').count(),0);assert.equal(await page.locator('.aurora-cloud-context').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: Chinese and English aurora, cloud context, error and bright-time hiding passed`);
 }
}finally{await browser.close()}
