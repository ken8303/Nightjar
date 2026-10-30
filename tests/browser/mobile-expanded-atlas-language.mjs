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
  await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place:{name:'London',latitude:51.5,longitude:0,timezone:'UTC'}}));localStorage.setItem('nightjar-language-v1','zh-Hant');localStorage.setItem('nightjar-sky-view-v1','2d');localStorage.setItem('nightjar-targets-v1',JSON.stringify(['Vega']));},{origin:base.origin,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}}));await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'星空圖',exact:true}).tap();await page.locator('#target-finder .saved-target-select').filter({hasText:'Vega'}).tap();
  await page.getByRole('button',{name:'展開二維星圖'}).tap();const dialog=page.locator('.expanded-2d-dialog');await dialog.getByRole('heading',{name:'London 上空的星圖'}).waitFor();assert.match(await dialog.locator('.expanded-atlas-selection').innerText(),/Vega/);assert.match(await dialog.locator('svg.sky-chart').getAttribute('aria-label'),/北方在上/);assert.match(await dialog.locator('[data-sky-name="Vega"]').getAttribute('aria-label'),/織女星/);assert.equal(await dialog.locator('[data-sky-name="Vega"] .sky-label').textContent(),'織女星');await dialog.getByRole('button',{name:'放大星圖'}).tap();assert.equal(await dialog.getByLabel('星圖縮放比例').innerText(),'150%');await dialog.getByRole('button',{name:'關閉展開的星圖'}).tap();
  await page.locator('#planner-language').selectOption('en');await page.getByRole('button',{name:'Expand 2D chart'}).tap();await dialog.getByRole('heading',{name:'Sky above London'}).waitFor();assert.match(await dialog.locator('.expanded-atlas-selection').innerText(),/Vega/);assert.equal(await dialog.getByLabel('Sky atlas zoom',{exact:true}).innerText(),'100%');await dialog.getByRole('button',{name:'Close expanded sky atlas'}).tap();
  assert.equal(await page.locator('#observing-time').inputValue(),'2026-10-27T00:00');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated expanded chart, zoom and target selection passed`);
 }
}finally{await browser.close()}
