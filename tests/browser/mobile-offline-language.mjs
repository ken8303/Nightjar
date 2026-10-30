import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
  await page.addInitScript(()=>{const place={name:'London',latitude:51.5,longitude:0,timezone:'UTC',bortle:4};localStorage.setItem('nightjar-language-v1','zh-Hant');localStorage.setItem('nightjar-place',JSON.stringify(place));localStorage.setItem('nightjar-observing-time',JSON.stringify('2026-10-27T00:00:00.000Z'));localStorage.setItem('nightjar-deep-targets-v1',JSON.stringify(['M31','NGC7000']));localStorage.setItem('nightjar-target-notes-v1',JSON.stringify({Vega:'Keep 星空 note'}));localStorage.setItem('nightjar-targets-v1',JSON.stringify(['Vega']));});
  await page.goto(new URL('/offline',base).href,{waitUntil:'load'});assert.equal(await page.locator('html').getAttribute('lang'),'zh-Hant');assert.equal(await page.locator('h1').textContent(),'暫時離線');assert.match(await page.locator('#targets').innerText(),/Keep 星空 note/);assert.match(await page.locator('#targets').innerText(),/織女星 \(Vega\)/);assert.match(await page.locator('#places').innerText(),/波特爾 4 級/);
  const before=await page.evaluate(()=>localStorage.getItem('nightjar-deep-targets-v1'));await page.evaluate(()=>import('/offline-darkness.mjs'));await page.context().setOffline(true);
  const search=page.getByRole('searchbox',{name:'搜尋已儲存的深空天體'});await search.fill('仙女座星系');assert.match(await page.locator('#deep-search-count').innerText(),/顯示 1／2/);assert.match(await page.locator('#deep-targets li:visible').innerText(),/M31/);await search.fill('NGC 7000');assert.match(await page.locator('#deep-search-count').innerText(),/顯示 1／2/);assert.equal(await page.locator('#deep-targets li:visible').count(),1);
  await page.getByRole('button',{name:'檢查已儲存時間的黑夜狀態'}).tap();await page.getByText(/剩餘完全天文黑夜/).waitFor();await page.getByRole('button',{name:'計算天體位置'}).tap();await page.getByText(/M31.*於 London.*高度角/).waitFor();const target=page.locator('#offline-target-select');await target.selectOption('bright:Vega');assert.match(await target.locator('option[value=\"bright:Vega\"]').textContent(),/織女星 \(Vega\)/);await page.getByRole('button',{name:'計算天體位置'}).tap();await page.getByText(/織女星 \(Vega\) 於 London.*高度角/).waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('nightjar-deep-targets-v1')),before);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: Chinese offline snapshot, search and dark-time position passed`);
 }
}finally{await browser.close()}
