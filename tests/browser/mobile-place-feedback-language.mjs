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
  await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place:{name:'London',latitude:51.5,longitude:0,timezone:'UTC'}}));localStorage.setItem('nightjar-language-v1','zh-Hant');localStorage.setItem('nightjar-sky-view-v1','2d');},{origin:base.origin,time});
  let provider='Location search is unavailable. Try again or enter coordinates.';await page.route('**/api/locations?*',route=>route.fulfill({status:503,json:{error:provider}}));await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}}));await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'觀測地點',exact:true}).tap();
  const search=page.locator('#location-search'),feedback=page.locator('#location-search-feedback'),language=page.locator('#planner-language');await search.fill('A');await search.press('Enter');assert.match(await feedback.innerText(),/至少輸入兩個字元/);await language.selectOption('en');assert.match(await feedback.innerText(),/Enter at least two letters/);assert.equal(await search.inputValue(),'A');await language.selectOption('zh-Hant');
  await search.fill('London');await search.press('Enter');await feedback.getByText(/無法使用地點搜尋/).waitFor();await language.selectOption('en');assert.match(await feedback.innerText(),/Location search is unavailable/);provider='Provider diagnostic: try later';await search.fill('York');await search.press('Enter');await feedback.getByText('Provider diagnostic: try later').waitFor();await language.selectOption('zh-Hant');assert.equal(await feedback.innerText(),'Provider diagnostic: try later');
  await page.getByRole('button',{name:'儲存此地點'}).tap();const notice=page.locator('#planner-notice');assert.match(await notice.innerText(),/地點已儲存於此裝置/);await language.selectOption('en');assert.match(await notice.innerText(),/Place saved on this device/);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('nightjar-places'))[0].name),'London');await language.selectOption('zh-Hant');
  await page.getByRole('button',{name:'移除 London'}).tap();assert.match(await notice.innerText(),/已從儲存地點中移除 London/);await language.selectOption('en');assert.match(await notice.innerText(),/London removed from saved places/);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('nightjar-places')).length),0);
  assert.equal(await page.locator('#observing-time').inputValue(),'2026-10-27T00:00');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated location failures and saved-place feedback passed`);
 }
}finally{await browser.close()}
