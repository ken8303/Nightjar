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
  await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place:{name:'London',latitude:51.5,longitude:0,timezone:'UTC'}}));localStorage.setItem('nightjar-language-v1','zh-Hant');},{origin:base.origin,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}}));
  await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});const pwa=page.locator('#install-app');await pwa.waitFor();assert.match(await pwa.innerText(),/隨身使用 Nightjar/);assert.match(await pwa.innerText(),/在 iPhone 或 iPad 上/);
  await page.locator('#observing-time').fill('');await pwa.getByRole('button',{name:'查看時間編輯'}).waitFor();assert.match(await pwa.innerText(),/暫停重新載入/);
  const language=page.locator('#planner-language');await language.selectOption('en');await pwa.getByRole('button',{name:'Review time edit'}).waitFor();assert.match(await pwa.innerText(),/Reload is paused for unfinished edits/);await language.selectOption('zh-Hant');await pwa.getByRole('button',{name:'查看時間編輯'}).waitFor();
  await page.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));await pwa.getByText('Nightjar 已安裝。').waitFor();await page.context().setOffline(true);await pwa.getByText(/目前離線，無法更新即時狀況/).waitFor();
  assert.equal(await page.locator('#observing-time').inputValue(),'');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: localized install, offline and unfinished-edit guidance passed`);
 }
}finally{await browser.close()}
