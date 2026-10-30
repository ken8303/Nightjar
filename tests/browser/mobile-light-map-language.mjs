import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {gzipSync} from 'node:zlib';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
  const time='2026-10-27T00:00:00.000Z',start=Date.parse(time)/1000;await page.clock.setFixedTime(new Date(time));
  await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;const place={name:'London',latitude:51.5,longitude:0,timezone:'UTC'};sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place}));localStorage.setItem('nightjar-language-v1','zh-Hant');localStorage.setItem('nightjar-places',JSON.stringify([place,{name:'Other site',latitude:52,longitude:1,timezone:'UTC'}]));},{origin:base.origin,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}}));
  let modelRequests=0;const tile=new Uint8Array(600*600+1);tile[0]=3;tile[1]=14;const compressed=gzipSync(tile);await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===base.origin)return route.fallback();if(url.hostname==='djlorenz.github.io'&&route.request().resourceType()!=='image'){modelRequests++;return modelRequests===1?route.fulfill({status:503,headers:{'Access-Control-Allow-Origin':'*'},body:'unavailable'}):route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/octet-stream'},body:compressed})}return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"/>'})});
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'觀測地點',exact:true}).tap();
  const reference=page.locator('.light-pollution-reference'),toggle=reference.getByRole('button',{name:'載入光害地圖'});await toggle.waitFor();assert.equal(modelRequests,0);await toggle.tap();const map=reference.locator('.light-pollution-map');await map.getByRole('region',{name:'London 附近的光害地圖'}).waitFor();await map.getByRole('button',{name:'放大',exact:true}).waitFor({state:'visible'});
  const saved=await page.evaluate(()=>localStorage.getItem('nightjar-places'));await map.getByRole('checkbox',{name:'顯示已儲存觀測地點'}).check();assert.match(await map.innerText(),/橙色圓點標示 1 個已儲存地點/);
  await map.getByRole('button',{name:'讀取模型亮度'}).tap();await map.getByText(/模型供應商暫時無法使用/).waitFor();assert.equal(modelRequests,1);assert.match(await map.innerText(),/資料缺漏不代表黑暗程度/);
  const language=page.locator('#planner-language');await language.selectOption('en');await map.getByText(/The model provider is unavailable/).waitFor();await language.selectOption('zh-Hant');await map.getByText(/模型供應商暫時無法使用/).waitFor();assert.equal(modelRequests,1);await map.getByRole('button',{name:'重試讀取亮度'}).tap();await map.getByText('模型總亮度').waitFor();assert.match(await map.locator('.light-pollution-values').innerText(),/17\.53.*7b/s);await language.selectOption('en');assert.match(await map.locator('.light-pollution-values').innerText(),/Total model brightness/);await language.selectOption('zh-Hant');assert.equal(modelRequests,2);assert.equal(await page.evaluate(()=>localStorage.getItem('nightjar-places')),saved);assert.equal(await page.locator('#observing-time').inputValue(),'2026-10-27T00:00');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated map, saved markers and brightness failure passed`);
 }
}finally{await browser.close()}
