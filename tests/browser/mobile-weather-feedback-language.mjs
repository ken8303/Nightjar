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
  await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place:{name:'London',latitude:51.5,longitude:0,timezone:'UTC'}}));localStorage.setItem('nightjar-language-v1','zh-Hant');},{origin:base.origin,time});
  let requests=0,badSamples=false;await page.route('**/api/weather?*',route=>{requests++;return badSamples?route.fulfill({json:{hourly:{time:[start],cloud_cover:[]}}}):route.fulfill({status:503,json:{error:'offline'}})});await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});const freshness=page.locator('.forecast-freshness').first();await freshness.getByText(/無法取得預報，請重試/).waitFor();const count=requests,language=page.locator('#planner-language');await language.selectOption('en');await freshness.getByText(/Forecast unavailable. Please try again/).waitFor();await language.selectOption('zh-Hant');await freshness.getByText(/無法取得預報，請重試/).waitFor();assert.equal(requests,count);
  badSamples=true;await freshness.getByRole('button',{name:'重試預報'}).tap();await freshness.getByText(/無法取得預報雲量/).waitFor();await language.selectOption('en');await freshness.getByText(/Forecast cloud coverage is unavailable/).waitFor();assert.equal(await page.locator('#observing-time').inputValue(),'2026-10-27T00:00');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated forecast failures and stable selected time passed`);
 }
}finally{await browser.close()}
