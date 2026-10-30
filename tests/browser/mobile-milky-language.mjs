import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(30000);
  const time='2026-04-20T14:00:00.000Z',start=Date.parse(time)/1000;await page.clock.setFixedTime(new Date(time));
  await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place:{name:'Sydney',latitude:-33.86,longitude:151.2,timezone:'Australia/Sydney'}}));localStorage.setItem('nightjar-language-v1','zh-Hant');localStorage.setItem('nightjar-sky-view-v1','2d');},{origin:base.origin,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}}));await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'星空圖',exact:true}).tap();
  const planner=page.locator('.milky-way-planner');await planner.getByRole('heading',{name:'尋找銀河中心方向。'}).waitFor();await planner.getByRole('button',{name:'將觀測時間設為最高點'}).waitFor();assert.match(await planner.innerText(),/太陽低於 −18°/);const values=await planner.locator('.milky-way-facts strong').allTextContents();
  const language=page.locator('#planner-language');await language.selectOption('en');await planner.getByRole('heading',{name:'Find the galactic core direction.'}).waitFor();assert.deepEqual(await planner.locator('.milky-way-facts strong').allTextContents(),values.map((value,index)=>index===0?value.replace('高度 ','')+' up':index===2?value.replace(/(.+) 高度 (.+)/,'$2 at $1'):value));
  await language.selectOption('zh-Hant');await planner.getByRole('heading',{name:'尋找銀河中心方向。'}).waitFor();assert.deepEqual(await planner.locator('.milky-way-facts strong').allTextContents(),values);assert.equal(await page.locator('#observing-time').inputValue(),'2026-04-20T14:00');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated Milky Way planning and stable observing time passed`);
 }
}finally{await browser.close()}
