import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390])for(const polar of [false,true]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(30000);
  const time=polar?'2026-06-21T12:00:00.000Z':'2026-10-27T12:00:00.000Z',start=Date.parse(time)/1000,place=polar?{name:'North Pole',latitude:90,longitude:0,timezone:'UTC'}:{name:'London',latitude:51.5,longitude:0,timezone:'UTC'};await page.clock.setFixedTime(new Date(time));
  await page.addInitScript(({origin,time,place})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place}));localStorage.setItem('nightjar-language-v1','zh-Hant');localStorage.setItem('nightjar-sky-view-v1','2d');},{origin:base.origin,time,place});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}}));await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'目前不在完全天文黑夜'}).waitFor();await page.getByRole('button',{name:'下一次黑夜'}).tap();const notice=page.locator('#planner-notice');await notice.waitFor();assert.match(await notice.innerText(),polar?/找不到完全天文黑夜/:/已選擇 London 的天文黑夜時間/);const chosen=await page.locator('#observing-time').inputValue();if(polar)assert.equal(chosen,'2026-06-21T12:00');else assert.notEqual(chosen,'2026-10-27T12:00');
  const language=page.locator('#planner-language');await language.selectOption('en');assert.match(await notice.innerText(),polar?/No astronomical darkness occurs within 48 hours/:/Astronomical darkness selected for London/);await language.selectOption('zh-Hant');assert.match(await notice.innerText(),polar?/找不到完全天文黑夜/:/已選擇 London 的天文黑夜時間/);assert.equal(await page.locator('#observing-time').inputValue(),chosen);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width} ${polar?'polar no-darkness':'next darkness'}: translated notice and observing time passed`);
 }
}finally{await browser.close()}
