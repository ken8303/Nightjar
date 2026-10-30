import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:5173/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
  await page.clock.install({time:new Date('2026-10-27T00:00Z')});
  await page.addInitScript(origin=>{if(location.origin!==origin)return;const place={name:'London',latitude:51.5,longitude:0,timezone:'UTC'};sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-10-27T00:00:00.000Z',place}));},base.origin);
  const start=Date.parse('2026-10-27T00:00Z');let calls=0,unconfigured=false;
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start/1000,start/1000+3600],cloud_cover:[20,20]}}}));
  await page.route('**/api/astronomy-forecast?*',route=>{calls++;if(unconfigured)return route.fulfill({status:503,json:{error:'Forecast provider not configured'}});return route.fulfill({json:{issuedAt:start-3*3600000,samples:[{time:start,seeing:1,transparency:8},{time:start+3*3600000,seeing:2,transparency:null},{time:start+12*3600000,seeing:3,transparency:3}]}})});
  await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});assert.match(await page.title(),/Nightjar/);
  const panel=page.locator('.astronomy-forecast'),button=panel.getByRole('button',{name:'Check astronomy forecast'});await button.waitFor();assert.equal(calls,0);assert((await button.boundingBox()).height>=44);await button.tap();
  await panel.getByText('Nearest dark forecast sample:',{exact:false}).waitFor();assert.equal(calls,1);assert.match(await panel.locator('dl').textContent(),/Seeing<0\.5″.*Transparency>1 mag\/air mass/);assert.equal(await panel.locator('.astronomy-forecast-sample').count(),2);
  await page.locator('#planner-language').selectOption('zh-Hant');assert.match(await panel.textContent(),/天文觀測預報/);assert.match(await panel.textContent(),/視寧度/);assert.equal(calls,1);
  if(width===390)await panel.screenshot({path:'/tmp/nightjar-mobile-astronomy.png'});
  await panel.locator('.astronomy-forecast-sample').nth(1).tap();await page.waitForFunction(()=>document.querySelector('#observing-time')?.value.includes('03:00'));assert.equal(calls,1);assert.match(await panel.locator('dl').textContent(),/0\.5–0\.75″/);
  unconfigured=true;await panel.getByRole('button',{name:'重新取得預報'}).tap();await panel.getByText('此預報尚未提供；資料來源的連線仍未驗證。').waitFor();assert.equal(await panel.locator('dl').count(),0);
  await page.locator('#observing-time').fill('2026-10-27T12:00');await page.getByRole('heading',{name:'目前不在完全天文黑夜'}).waitFor();assert.equal(await panel.count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: mobile astronomy forecast, dark samples, selection and language passed`);
 }
}finally{await browser.close()}
