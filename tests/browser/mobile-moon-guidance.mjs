import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date('2026-10-30T19:00Z'));await page.addInitScript(origin=>{if(location.origin!==origin)return;const place={name:'London',latitude:51.5,longitude:0,timezone:'UTC'};sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-10-30T19:00:00.000Z',place}));},base.origin);
  const start=Date.parse('2026-10-30T19:00Z')/1000;await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start,start+3600],cloud_cover:[20,20]}}}));
  await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});assert.match(await page.title(),/Nightjar/);
  const card=page.locator('.moon-card');await card.waitFor();assert.match(await card.textContent(),/73% illuminated · Below the horizon/);assert.match(await card.textContent(),/Moon is at or below your ideal horizon/);assert.doesNotMatch(await card.textContent(),/bright Moon above the horizon/);
  await page.locator('#observing-time').fill('2026-10-30T20:00');await page.waitForFunction(()=>document.querySelector('.moon-card')?.textContent.includes('bright Moon above the horizon'));
  assert.match(await card.textContent(),/72% illuminated · 2° above the horizon/);assert.equal(await page.locator('[data-night-content="tonight"]').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: bright Moon advice follows horizon crossing in full darkness`);
 }
}finally{await browser.close()}
