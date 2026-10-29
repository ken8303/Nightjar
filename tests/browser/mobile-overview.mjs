import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390,430]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date('2026-10-27T00:00Z'));
  await page.addInitScript(origin=>{if(location.origin!==origin)return;const place={name:'London',latitude:51.5,longitude:0,timezone:'UTC'};sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-10-27T00:00:00.000Z',place}));},base.origin);
  const start=Date.parse('2026-10-27T00:00Z')/1000;let fail=false;
  await page.route('**/api/weather?*',route=>fail?route.fulfill({status:503,json:{error:'Forecast unavailable'}}):route.fulfill({json:{hourly:{time:Array.from({length:24},(_,i)=>start+i*3600),cloud_cover:Array.from({length:24},(_,i)=>[20,30,45,10][i%4]),temperature_2m:Array(24).fill(10)}}}));
  await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});assert.match(await page.title(),/Nightjar/);
  const glance=page.getByRole('region',{name:'Observing overview at the selected time'}),outlook=page.locator('.tonight-outlook');
  await glance.waitFor();await page.locator('.hour').first().waitFor();
  assert.equal(await glance.locator('.mobile-night-glance-score strong').textContent(),`${await outlook.locator('.score-ring strong').textContent()} / 100`);
  assert.match(await glance.locator('.mobile-night-glance-moon').textContent(),/% lit · (above|below) horizon/);
  assert.match(await glance.locator('.mobile-night-glance-freshness').textContent(),/Forecast current/);
  assert((await glance.boundingBox()).y<844,'overview is visible in the first phone viewport');
  const hours=page.locator('.next-panel .hour');await hours.nth(1).tap();
  assert.equal(await page.locator('#observing-time').inputValue(),'2026-10-27T01:00');
  assert.equal(await glance.locator('.mobile-night-glance-score strong').textContent(),`${await outlook.locator('.score-ring strong').textContent()} / 100`);
  await outlook.getByRole('button',{name:/Plan best hour/}).tap();
  assert.equal(await page.locator('#observing-time').inputValue(),'2026-10-27T03:00');
  fail=true;await outlook.getByRole('button',{name:'Refresh weather',exact:true}).tap();
  await page.waitForFunction(()=>document.querySelector('.mobile-night-glance-freshness')?.textContent?.includes('Refresh failed'));
  assert.match(await glance.locator('.mobile-night-glance-freshness').textContent(),/previous forecast shown/);
  await page.locator('#observing-time').fill('2026-10-27T12:00');
  await page.getByRole('heading',{name:'Outside full astronomical darkness'}).waitFor();
  assert.equal(await glance.count(),0);assert.equal(await page.locator('[data-night-content="tonight"]').isVisible(),false);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('.mobile-night-glance-freshness')?.textContent==='Forecast unavailable');
  assert.equal(await glance.locator('.mobile-night-glance-score strong').textContent(),'—');
  assert.equal(await glance.locator('.mobile-night-glance-best strong').textContent(),'—');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('vite-error-overlay,nextjs-portal').count(),0);assert.deepEqual(errors,[]);
  await page.close();console.log(`${width}: overview, hour selection, failed refresh and daylight hiding passed`);
 }
}finally{await browser.close()}
