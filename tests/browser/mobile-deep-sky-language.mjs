import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright'),A=require('astronomy-engine');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const place={name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'},time='2026-10-27T00:00:00.000Z';
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
  await page.clock.setFixedTime(new Date(time));
  await page.addInitScript(({origin,place,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place}));localStorage.setItem('nightjar-language-v1','zh-Hant');localStorage.setItem('nightjar-sky-view-v1','2d');localStorage.setItem('nightjar-deep-targets-v1',JSON.stringify(['M31']));},{origin:base.origin,place,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:Array.from({length:24},(_,i)=>Date.parse(time)/1000+i*3600),cloud_cover:Array(24).fill(20)}}}));
  await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.lang==='zh-Hant');
  await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'星空圖',exact:true}).tap();
  await page.getByRole('button',{name:'選擇已儲存的 M31',exact:true}).tap();
  const search=page.locator('#deep-sky-browsing input[type=search]'),constellation=page.locator('#deep-sky-browsing select').nth(2);assert.match(await page.locator('#deep-sky-object-details h3').innerText(),/仙女座星系 \(Andromeda Galaxy\)/);await search.fill('仙女座星系');assert.match(await page.locator('#deep-sky-results').innerText(),/M31/);await page.locator('#planner-language').selectOption('en');assert.match(await page.locator('#deep-sky-results').innerText(),/M31/);assert.equal(await search.inputValue(),'仙女座星系');await page.locator('#planner-language').selectOption('zh-Hant');
  assert.match(await constellation.locator('option[value=And]').textContent(),/仙女座/);await constellation.selectOption('And');await search.fill('仙女座');
  assert.match(await page.locator('#deep-sky-results').innerText(),/M31/);assert.match(await page.locator('#deep-sky-object-details').innerText(),/仙女座 \(And\)/);
  await page.locator('#planner-language').selectOption('en');assert.equal(await constellation.inputValue(),'And');assert.equal(await search.inputValue(),'仙女座');assert.match(await constellation.locator('option[value=And]').textContent(),/Andromeda/);assert.match(await page.locator('#deep-sky-results').innerText(),/M31/);
  await page.locator('#planner-language').selectOption('zh-Hant');assert.equal(await constellation.inputValue(),'And');await search.fill('');await constellation.selectOption('');
  const timeline=page.locator('.deep-sky-timeline');assert.match(await timeline.locator('.deep-sky-plot-key').innerText(),/高度角.*30° 參考線.*連續完全天文黑夜/s);
  assert.match(await page.locator('#deep-sky-object-details').innerText(),/所選時間的月球/);assert.match(await page.locator('.catalogue-coordinates').innerText(),/赤經.*赤緯/s);
  const peak=await timeline.locator('.deep-sky-plot-summary time').getAttribute('datetime'),observer=new A.Observer(place.latitude,place.longitude,0),sun=A.Equator(A.Body.Sun,new Date(peak),observer,true,true);
  assert(A.Horizon(new Date(peak),observer,sun.ra,sun.dec,'normal').altitude< -18);
  await page.locator('.deep-sky-comparison summary').tap();const comparison=page.locator('.deep-sky-comparison');
  await comparison.getByText('選填：當地地平線').tap();const horizon=comparison.locator('.deep-compare-horizon-inputs input').first();await horizon.fill('12');await comparison.getByRole('button',{name:'套用當地地平線'}).tap();assert.match(await comparison.innerText(),/已對此比較套用當地地平線/);
  const before=await page.locator('#observing-time').inputValue();const language=page.locator('#planner-language');await language.selectOption('en');assert.equal(await horizon.inputValue(),'12');assert.match(await comparison.innerText(),/Local horizon applied to this comparison/);await language.selectOption('zh-Hant');assert.equal(await horizon.inputValue(),'12');assert.equal(await page.locator('#observing-time').inputValue(),before);assert.match(await comparison.locator('caption').innerText(),/太陽低於 −18°/);const [calendarDownload]=await Promise.all([page.waitForEvent('download'),comparison.getByRole('button',{name:/下載 M31 從/}).first().tap()]);const calendar=await readFile(await calendarDownload.path(),'utf8');assert.match(calendar.replace(/\r\n[ \t]/g,''),/觀測 M31/);await comparison.getByText(/已準備 M31 行事曆時段/).waitFor();await language.selectOption('en');await comparison.getByText(/M31 calendar window prepared/).waitFor();await language.selectOption('zh-Hant');await comparison.getByText(/已準備 M31 行事曆時段/).waitFor();
  if(width===320)await timeline.screenshot({path:'/tmp/nightjar-zh-deep-sky.png'});
  await timeline.getByRole('button',{name:'使用此樣本時間',exact:true}).tap();await page.waitForFunction(expected=>JSON.parse(sessionStorage.getItem('nightjar-current-time-v1')||'null')===expected,peak);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated deep-sky planning, preserved settings and dark sample passed`);
 }
}finally{await browser.close()}
