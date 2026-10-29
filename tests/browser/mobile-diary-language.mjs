import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const place={name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'},time='2026-10-27T00:00:00.000Z';
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
  await page.clock.setFixedTime(new Date(time));await page.addInitScript(({origin,place,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place}));localStorage.setItem('nightjar-language-v1','zh-Hant');localStorage.setItem('nightjar-sky-view-v1','2d');localStorage.setItem('nightjar-deep-targets-v1',JSON.stringify(['M31']));},{origin:base.origin,place,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:Array.from({length:24},(_,i)=>Date.parse(time)/1000+i*3600),cloud_cover:Array(24).fill(20)}}}));
  await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.lang==='zh-Hant');await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'星空圖',exact:true}).tap();await page.getByRole('button',{name:'選擇已儲存的 M31',exact:true}).tap();
  const diary=page.locator('#observing-diary'),language=page.locator('#planner-language');await diary.getByRole('heading',{name:'記錄 M31 的觀測'}).waitFor();
  await diary.locator('form select').selectOption('not-seen');await diary.getByLabel('使用的器材').fill('雙筒望遠鏡');await diary.getByLabel('觀測筆記').fill('雲層遮擋');
  await language.selectOption('en');assert.equal(await diary.getByLabel('Observation notes').inputValue(),'雲層遮擋');assert.equal(await diary.locator('form select').inputValue(),'not-seen');await language.selectOption('zh-Hant');
  await diary.getByRole('button',{name:'儲存觀測紀錄',exact:true}).tap();await diary.getByText('觀測紀錄已儲存於此瀏覽器。').waitFor();assert.match(await diary.locator('#diary-entries').innerText(),/M31 · 未看到/);assert.match(await diary.locator('#diary-entries').innerText(),/雲層遮擋/);
  await diary.getByLabel('開始日期（UTC）').fill('2026-13-01');assert.match(await diary.getByRole('alert').textContent(),/有效日期/);await diary.getByLabel('開始日期（UTC）').fill('');
  await diary.getByLabel('依觀測結果篩選').selectOption('seen');assert.match(await diary.innerText(),/沒有符合篩選條件的觀測紀錄/);await diary.getByRole('button',{name:'清除日誌篩選條件'}).tap();assert.match(await diary.locator('#diary-entries').innerText(),/未看到/);
  await diary.locator('#diary-entries').getByRole('button',{name:/編輯 M31/}).tap();assert.equal(await diary.getByLabel('觀測筆記').inputValue(),'雲層遮擋');await diary.getByLabel('觀測筆記').fill('看見微弱光斑');await diary.getByRole('button',{name:'儲存日誌變更'}).tap();assert.match(await diary.locator('#diary-entries').innerText(),/看見微弱光斑/);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.lang==='zh-Hant');await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'星空圖',exact:true}).tap();await page.getByRole('button',{name:'選擇已儲存的 M31',exact:true}).tap();assert.match(await diary.locator('#diary-entries').innerText(),/看見微弱光斑/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: Traditional Chinese diary, draft, filters, edit and reload passed`);
 }
}finally{await browser.close()}
