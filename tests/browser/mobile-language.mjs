import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:true}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
  await page.clock.setFixedTime(new Date('2026-10-27T00:00Z'));
  await page.addInitScript(origin=>{if(location.origin!==origin)return;const place={name:'London',latitude:51.5,longitude:0,timezone:'UTC'};sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-10-27T00:00:00.000Z',place}));localStorage.setItem('nightjar-sky-view-v1','2d');},base.origin);
  const start=Date.parse('2026-10-27T00:00Z')/1000;let weatherCalls=0,locationLanguage='';
  await context.route('**/api/weather?*',route=>{weatherCalls++;return route.fulfill({json:{hourly:{time:Array.from({length:24},(_,i)=>start+i*3600),cloud_cover:Array.from({length:24},(_,i)=>[20,30,45,10][i%4])}}})});
  await context.route('**/api/locations?*',route=>{locationLanguage=new URL(route.request().url()).searchParams.get('lang')||'';return route.fulfill({json:{results:[{id:1,name:'臺北市',latitude:25.0478,longitude:121.5319,timezone:'Asia/Taipei'}]}})});
  await context.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});assert.match(await page.title(),/Nightjar/);
  const language=page.locator('#planner-language'),time=page.locator('#observing-time');await language.waitFor();await page.locator('.hour').first().waitFor();assert.equal(await language.inputValue(),'en');
  const site=await page.evaluate(()=>localStorage.getItem('nightjar-place')),calls=weatherCalls;await time.fill('');await language.selectOption('zh-Hant');
  await page.waitForFunction(()=>document.documentElement.lang==='zh-Hant');assert.equal(await page.evaluate(()=>localStorage.getItem('nightjar-language-v1')),'zh-Hant');assert.equal(await time.inputValue(),'');assert.equal(await page.evaluate(()=>localStorage.getItem('nightjar-place')),site);assert.equal(weatherCalls,calls);
  assert.match(await page.locator('.time-entry-warning').textContent(),/請輸入完整的觀測日期與時間/);assert.match(await page.locator('.mobile-night-glance').textContent(),/觀測評分/);assert.match(await page.locator('.language-coverage').textContent(),/部分詳細功能仍顯示英文/);
  await page.locator('.mobile-night-glance .forecast-best-hour-action').tap();await page.getByRole('heading',{name:'尚未儲存變更'}).waitFor();await page.getByRole('button',{name:'繼續編輯',exact:true}).tap();assert.equal(await time.inputValue(),'');await page.getByRole('button',{name:'取消時間編輯',exact:true}).tap();
  await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'星空圖',exact:true}).tap();
  await page.getByRole('link',{name:'深空探索',exact:true}).waitFor();const finder=page.locator('#deep-sky-finder'),search=finder.locator('#deep-sky-browsing input[type=search]');assert.equal(await search.getAttribute('placeholder'),'M31, NGC 224, Andromeda…');await search.fill('M31');
  const type=finder.locator('#deep-sky-browsing select').nth(1);await type.selectOption('Galaxy');assert.equal(await type.inputValue(),'Galaxy');assert.match(await finder.locator('.deep-sky-matches-shortcut').textContent(),/查看 1 個結果/);
  await language.selectOption('en');assert.equal(await search.inputValue(),'M31');assert.equal(await type.inputValue(),'Galaxy');await language.selectOption('zh-Hant');assert.equal(await search.inputValue(),'M31');assert.equal(await type.inputValue(),'Galaxy');
  await page.getByRole('link',{name:'明亮天體',exact:true}).tap();const bright=page.locator('#target-search');await bright.fill('織女星');assert.match(await page.locator('#target-results').textContent(),/織女星 \(Vega\)/);await page.locator('#target-results button').first().tap();assert.equal(await page.locator('#target-results button').first().getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'觀測地點',exact:true}).tap();
  const bortle=page.locator('#site-bortle');await bortle.selectOption('4');assert.match(await bortle.locator('option[value="4"]').textContent(),/Bortle 4 級/);await language.selectOption('en');assert.equal(await bortle.inputValue(),'4');assert.match(await bortle.locator('option[value="4"]').textContent(),/Bortle class 4/);await language.selectOption('zh-Hant');assert.equal(await bortle.inputValue(),'4');
  await page.getByRole('searchbox',{name:'城鎮或城市'}).fill('Taipei');await page.locator('.search-form').getByRole('button',{name:'搜尋',exact:true}).tap();await page.getByRole('button',{name:/臺北市/}).waitFor();assert.equal(locationLanguage,'zh-Hant');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.lang==='zh-Hant');assert.equal(await language.inputValue(),'zh-Hant');assert.equal(await time.inputValue(),'2026-10-27T00:00');
  await time.fill('2026-10-27T12:00');await page.getByRole('heading',{name:'目前不在完全天文黑夜'}).waitFor();assert.equal(await page.locator('[data-night-content="tonight"]').isVisible(),false);
  await language.selectOption('en');await page.waitForFunction(()=>document.documentElement.lang==='en');await page.getByRole('heading',{name:'Outside full astronomical darkness'}).waitFor();assert.equal(await time.inputValue(),'2026-10-27T12:00');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await context.close();console.log(`${width}: language, pending edits, search filters, localized locations, reload and darkness passed`);
 }
}finally{await browser.close()}
