import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date('2026-10-27T00:00Z'));await page.addInitScript(origin=>{if(location.origin!==origin)return;const place={name:'London',latitude:51.5,longitude:0,timezone:'UTC'};sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-10-27T00:00:00.000Z',place}));},base.origin);
  const start=Date.parse('2026-10-27T00:00Z')/1000;let calls=0;await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start,start+3600],cloud_cover:[20,20]}}}));
  await page.route('**/api/cloud-models?*',route=>{calls++;return route.fulfill({json:{time:[start],gfs:[0],icon:[null],ecmwf:[70]}})});
  await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});assert.match(await page.title(),/Nightjar/);
  const panel=page.locator('.cloud-model-comparison'),compare=panel.getByRole('button',{name:'Compare cloud models',exact:true});await compare.waitFor();assert.equal(calls,0);assert((await compare.boundingBox()).height>=44);await compare.tap();
  const rows=panel.locator('dl>div');await rows.nth(2).waitFor();assert.equal(calls,1);assert.match(await rows.nth(0).textContent(),/ECMWF IFS 0\.25°70%/);assert.equal(await rows.nth(0).locator('.cloud-model-bar>span').evaluate(node=>node.style.width),'70%');
  assert.deepEqual(await panel.locator('.cloud-model-stamps time').evaluateAll(nodes=>nodes.map(node=>node.dateTime)),['2026-10-27T00:00:00.000Z','2026-10-27T00:00:00.000Z']);assert.match(await panel.locator('.cloud-model-stamps').textContent(),/Selected time:.*GMT\+0.*Retrieved:.*GMT\+0/);
  assert.match(await rows.nth(1).textContent(),/DWD ICON globalUnavailable/);assert.equal(await rows.nth(1).locator('.cloud-model-bar.unavailable').count(),1);assert.equal(await rows.nth(1).locator('.cloud-model-bar>span').count(),0);
  assert.match(await rows.nth(2).textContent(),/NOAA GFS global0%/);assert.equal(await rows.nth(2).locator('.cloud-model-bar>span').evaluate(node=>node.style.width),'0%');assert.match(await panel.textContent(),/Model run times are not shown/);
  if(width===390)await panel.screenshot({path:'/tmp/nightjar-mobile-cloud-models.png'});
  await page.locator('#observing-time').fill('2026-10-27T01:00');await page.waitForFunction(()=>document.querySelector('.cloud-model-comparison')?.textContent.includes('Compare cloud models'));assert.equal(await panel.locator('dl').count(),0);assert.equal(calls,1);
  await page.locator('#observing-time').fill('2026-10-27T12:00');await page.getByRole('heading',{name:'Outside full astronomical darkness'}).waitFor();assert.equal(await page.locator('.cloud-model-comparison').count(),0);assert.equal(calls,1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: on-demand three-model comparison, unavailable values, time change and daylight hiding passed`);
 }
}finally{await browser.close()}
